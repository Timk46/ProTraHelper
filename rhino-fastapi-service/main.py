"""
Modern Rhino FastAPI Service
Hochleistungs-API für Rhino-Integration mit TypeScript/Angular Frontend
Basiert auf Rhino.Inside für minimale Latenz

Architektur: Rhino.Inside + FastAPI + WebSocket Support
Sicherheit: API-Key Authentication + Command Whitelisting
Performance: Async/Await + Connection Pooling
"""

import os
import sys
import asyncio
import json
import time
import hashlib
from typing import List, Optional, Dict, Any, Set
from datetime import datetime, timedelta
from pathlib import Path
from contextlib import asynccontextmanager
from enum import Enum

import uvicorn
import structlog
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, BackgroundTasks, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Structured Logging Setup
structlog.configure(
    processors=[
        structlog.dev.ConsoleRenderer(colors=True)
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO level
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger()

# Rhino.Inside Integration
RHINO_AVAILABLE = False
try:
    import rhinoinside
    rhinoinside.load()
    import Rhino
    import System
    RHINO_AVAILABLE = True
    logger.info("Rhino.Inside loaded successfully", version=str(Rhino.RhinoApp.Version))
except ImportError as e:
    logger.warning("Rhino.Inside not available - running in mock mode", error=str(e))
except Exception as e:
    logger.error("Failed to load Rhino.Inside", error=str(e))

# Configuration
class Settings:
    API_KEY: str = os.getenv("RHINO_API_KEY", "dev-key-rhino-2025")
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:4200,http://localhost:8080").split(",")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    MAX_CONCURRENT_COMMANDS: int = int(os.getenv("MAX_CONCURRENT_COMMANDS", "5"))
    COMMAND_TIMEOUT: int = int(os.getenv("COMMAND_TIMEOUT", "30"))
    RHINO_FILES_BASE_PATH: str = os.getenv("RHINO_FILES_BASE_PATH", "C:\\Dev\\hefl\\files")

settings = Settings()

# Pydantic Models
class CommandType(str, Enum):
    GRASSHOPPER_LOAD = "grasshopper_load"
    RHINO_SCRIPT = "rhino_script"
    GEOMETRY_OPERATION = "geometry_operation"
    CUSTOM_COMMAND = "custom_command"

class RhinoCommandRequest(BaseModel):
    command: str = Field(..., min_length=1, max_length=1000, description="Rhino command string")
    command_type: CommandType = Field(default=CommandType.RHINO_SCRIPT)
    file_path: Optional[str] = Field(None, description="Path to file if applicable")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    async_execution: bool = Field(default=False, description="Execute command asynchronously")
    timeout: Optional[int] = Field(default=30, ge=1, le=300)

    @validator('command')
    def validate_command(cls, v):
        # Basic security validation
        dangerous_keywords = ['format', 'delete', 'remove', 'exit', 'quit', 'shutdown']
        lower_command = v.lower()
        for keyword in dangerous_keywords:
            if keyword in lower_command:
                raise ValueError(f"Command contains dangerous keyword: {keyword}")
        return v

class RhinoCommandResponse(BaseModel):
    success: bool
    message: str
    execution_id: Optional[str] = None
    result_data: Optional[Dict[str, Any]] = None
    execution_time_ms: Optional[float] = None
    command_type: CommandType
    timestamp: datetime = Field(default_factory=datetime.now)

class GrasshopperLoadRequest(BaseModel):
    file_path: str = Field(..., description="Path to Grasshopper file")
    show_viewport: bool = Field(default=True)
    batch_mode: bool = Field(default=True)

class SystemStatus(BaseModel):
    status: str
    rhino_available: bool
    rhino_version: Optional[str] = None
    active_commands: int
    uptime_seconds: float
    api_version: str = "1.0.0"

# Global State Management
class ServiceState:
    def __init__(self):
        self.active_commands: Set[str] = set()
        self.start_time = time.time()
        self.command_history: List[Dict] = []
        self.websocket_connections: Set[WebSocket] = set()

service_state = ServiceState()

# Security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """Verify API key authentication"""
    if api_key != settings.API_KEY:
        logger.warning("Invalid API key attempt", provided_key=api_key[:10] + "...")
        raise HTTPException(
            status_code=403,
            detail="Invalid API key"
        )
    return api_key

# Command Validation & Security
class CommandValidator:
    """Secure command validation with whitelisting approach"""
    
    ALLOWED_COMMANDS = {
        "_-Grasshopper", "_Circle", "_Line", "_Point", "_Sphere", "_Box",
        "_MaxViewport", "_ZoomExtents", "_Enter", "_Escape"
    }
    
    GRASSHOPPER_PARAMS = {
        "B", "D", "W", "L", "H", "O"  # Batch, Display, Window, Load, Hide, Open
    }
    
    @classmethod
    def validate_command(cls, command: str, command_type: CommandType) -> bool:
        """Validate if command is safe to execute"""
        if command_type == CommandType.GRASSHOPPER_LOAD:
            return cls._validate_grasshopper_command(command)
        elif command_type == CommandType.RHINO_SCRIPT:
            return cls._validate_rhino_script(command)
        return False
    
    @classmethod
    def _validate_grasshopper_command(cls, command: str) -> bool:
        """Validate Grasshopper-specific commands"""
        # Must start with _-Grasshopper
        if not command.strip().startswith("_-Grasshopper"):
            return False
        
        # Check for valid parameters
        parts = command.split()
        for part in parts[1:]:  # Skip _-Grasshopper
            if part not in cls.GRASSHOPPER_PARAMS and not (part.startswith('"') or part.startswith("_")):
                if not Path(part.strip('"')).suffix.lower() in ['.gh', '.ghx']:
                    return False
        return True
    
    @classmethod
    def _validate_rhino_script(cls, command: str) -> bool:
        """Validate general Rhino script commands"""
        parts = command.split()
        if not parts:
            return False
        
        main_command = parts[0]
        return main_command in cls.ALLOWED_COMMANDS

# Rhino Service Layer
class RhinoService:
    """High-performance Rhino command execution service"""
    
    def __init__(self):
        self.is_rhino_ready = RHINO_AVAILABLE
        
    async def execute_command(self, request: RhinoCommandRequest) -> RhinoCommandResponse:
        """Execute Rhino command with full validation and error handling"""
        start_time = time.time()
        execution_id = hashlib.md5(f"{request.command}{time.time()}".encode()).hexdigest()[:8]
        
        logger.info("Executing Rhino command", 
                   execution_id=execution_id, 
                   command_type=request.command_type,
                   command_preview=request.command[:50] + "..." if len(request.command) > 50 else request.command)
        
        # Validate command
        if not CommandValidator.validate_command(request.command, request.command_type):
            raise HTTPException(
                status_code=400,
                detail=f"Command not allowed or invalid: {request.command}"
            )
        
        # Check concurrent command limit
        if len(service_state.active_commands) >= settings.MAX_CONCURRENT_COMMANDS:
            raise HTTPException(
                status_code=429,
                detail="Too many concurrent commands. Please try again later."
            )
        
        service_state.active_commands.add(execution_id)
        
        try:
            if request.async_execution:
                # For long-running commands, execute in background
                return await self._execute_async_command(request, execution_id)
            else:
                # Execute synchronously
                return await self._execute_sync_command(request, execution_id, start_time)
        
        finally:
            service_state.active_commands.discard(execution_id)
    
    async def _execute_sync_command(self, request: RhinoCommandRequest, execution_id: str, start_time: float) -> RhinoCommandResponse:
        """Execute command synchronously"""
        try:
            if not self.is_rhino_ready:
                # Mock execution for development
                await asyncio.sleep(0.1)  # Simulate execution time
                success = True
                message = f"Mock execution of: {request.command}"
            else:
                # Real Rhino execution
                success = Rhino.RhinoApp.RunScript(request.command, False)
                message = "Command executed successfully" if success else "Command execution failed"
            
            execution_time = (time.time() - start_time) * 1000
            
            # Log command execution
            service_state.command_history.append({
                "execution_id": execution_id,
                "command": request.command,
                "success": success,
                "execution_time_ms": execution_time,
                "timestamp": datetime.now().isoformat()
            })
            
            # Notify WebSocket clients
            await self._notify_websocket_clients({
                "type": "command_completed",
                "execution_id": execution_id,
                "success": success,
                "command_type": request.command_type
            })
            
            return RhinoCommandResponse(
                success=success,
                message=message,
                execution_id=execution_id,
                execution_time_ms=execution_time,
                command_type=request.command_type
            )
            
        except Exception as e:
            logger.error("Command execution failed", execution_id=execution_id, error=str(e))
            return RhinoCommandResponse(
                success=False,
                message=f"Execution error: {str(e)}",
                execution_id=execution_id,
                execution_time_ms=(time.time() - start_time) * 1000,
                command_type=request.command_type
            )
    
    async def _execute_async_command(self, request: RhinoCommandRequest, execution_id: str) -> RhinoCommandResponse:
        """Execute command asynchronously"""
        # For async commands, we return immediately and notify via WebSocket when complete
        asyncio.create_task(self._background_command_execution(request, execution_id))
        
        return RhinoCommandResponse(
            success=True,
            message="Command queued for asynchronous execution",
            execution_id=execution_id,
            command_type=request.command_type
        )
    
    async def _background_command_execution(self, request: RhinoCommandRequest, execution_id: str):
        """Execute command in background"""
        start_time = time.time()
        try:
            if not self.is_rhino_ready:
                await asyncio.sleep(2)  # Simulate long operation
                success = True
                message = f"Mock async execution of: {request.command}"
            else:
                success = Rhino.RhinoApp.RunScript(request.command, False)
                message = "Async command completed" if success else "Async command failed"
            
            execution_time = (time.time() - start_time) * 1000
            
            # Notify WebSocket clients of completion
            await self._notify_websocket_clients({
                "type": "async_command_completed",
                "execution_id": execution_id,
                "success": success,
                "message": message,
                "execution_time_ms": execution_time,
                "command_type": request.command_type
            })
            
        except Exception as e:
            logger.error("Async command execution failed", execution_id=execution_id, error=str(e))
            await self._notify_websocket_clients({
                "type": "async_command_failed",
                "execution_id": execution_id,
                "error": str(e),
                "command_type": request.command_type
            })
    
    async def load_grasshopper_file(self, request: GrasshopperLoadRequest) -> RhinoCommandResponse:
        """Specialized method for loading Grasshopper files"""
        # Build the exact command sequence
        command_parts = ["_-Grasshopper"]
        
        if request.batch_mode:
            command_parts.extend(["B", "D", "W", "L"])
        
        command_parts.extend(["W", "H", "D", "O"])
        command_parts.append(f'"{request.file_path}"')
        command_parts.extend(["W", "H"])
        
        if request.show_viewport:
            command_parts.append("_MaxViewport")
        
        command_parts.append("_Enter")
        
        command = " ".join(command_parts)
        
        # Execute via standard command interface
        rhino_request = RhinoCommandRequest(
            command=command,
            command_type=CommandType.GRASSHOPPER_LOAD,
            file_path=request.file_path
        )
        
        return await self.execute_command(rhino_request)
    
    async def _notify_websocket_clients(self, data: Dict[str, Any]):
        """Send notification to all connected WebSocket clients"""
        if not service_state.websocket_connections:
            return
        
        message = json.dumps(data)
        disconnected = set()
        
        for websocket in service_state.websocket_connections:
            try:
                await websocket.send_text(message)
            except Exception:
                disconnected.add(websocket)
        
        # Remove disconnected clients
        service_state.websocket_connections -= disconnected

# Initialize service
rhino_service = RhinoService()

# FastAPI Application Setup
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    logger.info("Starting Modern Rhino FastAPI Service")
    logger.info("Rhino availability", available=RHINO_AVAILABLE)
    yield
    logger.info("Shutting down Modern Rhino FastAPI Service")

app = FastAPI(
    title="Modern Rhino API Service",
    description="High-performance Rhino.Inside API with TypeScript integration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoints
@app.get("/", response_model=SystemStatus)
async def root():
    """System status endpoint"""
    return SystemStatus(
        status="running",
        rhino_available=RHINO_AVAILABLE,
        rhino_version=str(Rhino.RhinoApp.Version) if RHINO_AVAILABLE else None,
        active_commands=len(service_state.active_commands),
        uptime_seconds=time.time() - service_state.start_time
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/rhino/execute", response_model=RhinoCommandResponse)
async def execute_command(
    request: RhinoCommandRequest,
    api_key: str = Depends(verify_api_key)
) -> RhinoCommandResponse:
    """Execute a Rhino command with full validation and security"""
    return await rhino_service.execute_command(request)

@app.post("/api/rhino/grasshopper/load", response_model=RhinoCommandResponse)
async def load_grasshopper_file(
    request: GrasshopperLoadRequest,
    api_key: str = Depends(verify_api_key)
) -> RhinoCommandResponse:
    """Load a Grasshopper file with optimized command sequence"""
    return await rhino_service.load_grasshopper_file(request)

@app.get("/api/rhino/commands/history")
async def get_command_history(
    limit: int = 10,
    api_key: str = Depends(verify_api_key)
):
    """Get recent command execution history"""
    return {
        "history": service_state.command_history[-limit:],
        "total_commands": len(service_state.command_history)
    }

@app.get("/api/rhino/status", response_model=SystemStatus)
async def get_system_status(api_key: str = Depends(verify_api_key)):
    """Get detailed system status"""
    return SystemStatus(
        status="running",
        rhino_available=RHINO_AVAILABLE,
        rhino_version=str(Rhino.RhinoApp.Version) if RHINO_AVAILABLE else None,
        active_commands=len(service_state.active_commands),
        uptime_seconds=time.time() - service_state.start_time
    )

# WebSocket Support for Real-time Updates
@app.websocket("/ws/rhino")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time command updates"""
    await websocket.accept()
    service_state.websocket_connections.add(websocket)
    
    logger.info("WebSocket client connected", total_connections=len(service_state.websocket_connections))
    
    try:
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": "Connected to Rhino API WebSocket",
            "rhino_available": RHINO_AVAILABLE
        }))
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for client messages (ping/pong, etc.)
                message = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                data = json.loads(message)
                
                if data.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
            except asyncio.TimeoutError:
                # Send keep-alive ping
                await websocket.send_text(json.dumps({"type": "ping"}))
                
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error("WebSocket error", error=str(e))
    finally:
        service_state.websocket_connections.discard(websocket)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    )
