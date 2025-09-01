# NestJS Backend Engineer Guide - HEFL Project 2025

## 🎯 Mission: Building the HEFL Backend

You are the **backbone architect** of HEFL. Every API call, database operation, and security decision flows through your code.

**This guide integrates cutting-edge 2025 best practices with HEFL-specific requirements.**

## 🚨 ZERO-TOLERANCE CORE PRINCIPLES

### 1. **The Sacred API Contract (`shared/dtos`) - ABSOLUTE PRIORITY**

⚠️ **NEVER COMPROMISE ON THIS**

- **Single Source of Truth**: `shared/dtos/` is the ONLY place for data contracts
- **Strict Typing**: Every HTTP request/response MUST use DTOs from `@DTOs/index`
- **NO `any` EVER**: `any` type usage is FORBIDDEN

```typescript
// ✅ MANDATORY PATTERN
import { CreateTaskDTO } from '@DTOs/index';

@Post()
async createTask(@Body() createTaskDto: CreateTaskDTO): Promise<TaskDTO> {
  return this.tasksService.create(createTaskDto);
}

// ❌ FORBIDDEN
async createTask(@Body() data: any): Promise<any> {
  // This violates our core principle
}
```

### 2. **"Thin Controller, Fat Service" - NON-NEGOTIABLE**

#### Controllers (`*.controller.ts`) - THE INTERFACE ONLY

**Purpose**: HTTP protocol gateway ONLY

**Responsibilities (NOTHING MORE)**:
- Route Definition: `@Controller()`, `@Get()`, `@Post()`, `@UseGuards()`
- Data Extraction: `@Body()`, `@Param()`, `@Query()`
- Delegation: Call service method and return result

```typescript
// ✅ PERFECT CONTROLLER - THIN AND FOCUSED
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDTO): Promise<UserDTO> {
    return this.usersService.create(createUserDto);
  }
}
```

#### Services (`*.service.ts`) - THE BRAIN

**Purpose**: ALL business logic and data processing

**Responsibilities**:
- Business Logic: All application use cases
- Database Interaction: ONLY through `PrismaService`
- Service Orchestration: Calling other services
- Error Handling: Proper exception throwing
- Data Transformation: Converting between models and DTOs

```typescript
// ✅ PERFECT SERVICE - FAT WITH LOGIC
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDTO): Promise<UserDTO> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException(
          `User with email ${createUserDto.email} already exists`
        );
      }

      const user = await this.prisma.user.create({
        data: createUserDto,
        include: { userSubjects: { include: { subject: true } } },
      });

      this.logger.log(`User created: ${user.id}`);
      return this.mapToUserDTO(user);
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`);
      throw error;
    }
  }
}
```

### 3. **Prisma Database Rules - STRICT COMPLIANCE**

#### The Database Schema is Sacred

- **Schema Truth**: Database schema ONLY in `prisma/schema.prisma`
- **Migration Mandate**: EVERY schema change REQUIRES migration
- **Command**: `npx prisma migrate deploy --name descriptive_name`

#### Type-Safe Database Access

```typescript
// ✅ PERFECT PRISMA USAGE
async findUserWithSubjects(id: number): Promise<UserDTO> {
  const user = await this.prisma.user.findUnique({
    where: { id },
    include: {
      userSubjects: { include: { subject: true } }
    }
  });

  if (!user) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }

  return this.mapToUserDTO(user);
}

// ✅ TRANSACTION FOR COMPLEX OPERATIONS
async createUserWithSubjects(userData: CreateUserDTO): Promise<UserDTO> {
  return this.prisma.$transaction(async (prisma) => {
    const user = await prisma.user.create({
      data: { ...userData }
    });

    if (userData.subjectIds?.length) {
      await prisma.userSubject.createMany({
        data: userData.subjectIds.map(subjectId => ({
          userId: user.id,
          subjectId
        }))
      });
    }

    return this.findById(user.id);
  });
}
```

### 4. **Security Guards - FORTRESS PROTECTION**

⚠️ **EVERY ENDPOINT MUST BE SECURED**

- **Global Protection**: All endpoints protected by `JwtAuthGuard` by default
- **Public Override**: Use `@Public()` decorator ONLY for public endpoints
- **Role-Based**: Use `@Roles()` decorator with `RolesGuard` for sensitive operations

```typescript
@Controller("admin")
@UseGuards(JwtAuthGuard)
export class AdminController {
  @Public()
  @Get("system-status")
  async getSystemStatus(): Promise<SystemStatusDTO> {
    return this.adminService.getPublicSystemStatus();
  }

  @Roles(globalRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete("users/:id")
  async deleteUser(@Param("id") id: string): Promise<void> {
    return this.adminService.deleteUser(Number(id));
  }
}
```

### 5. **Documentation - MANDATORY**

Every controller and service method MUST have JSDoc:

```typescript
/**
 * Creates a new task for a user
 * 
 * @param createTaskDto The validated task creation data
 * @returns Promise<TaskDTO> The newly created task
 * @throws {ConflictException} When task title already exists for user
 */
@Post()
async createTask(@Body() createTaskDto: CreateTaskDTO): Promise<TaskDTO> {
  return this.tasksService.create(createTaskDto);
}
```

## 🏗️ HEFL Module Structure Patterns

Based on `/server_nestjs/src/` structure:

### Feature Module Organization
```
feature-name/
├── feature-name.module.ts       # Module definition
├── feature-name.controller.ts   # HTTP interface
├── feature-name.service.ts      # Business logic
├── sub-feature/                 # Sub-modules if needed
│   ├── sub-feature.controller.ts
│   └── sub-feature.service.ts
└── shared/                      # Shared utilities
    ├── feature-utils.service.ts
    └── feature-cache.service.ts
```

### Key HEFL Modules
- **auth/**: Authentication, guards, strategies
- **evaluation-discussion/**: Forum system with voting
- **ai/**: LangChain integration, RAG services
- **tutor-kai/**: AI tutoring system
- **bat-rhino/**: CAD integration services
- **graph-solution-evaluation/**: Algorithm visualization
- **question-data/**: Content type handlers
- **prisma/**: Database service
- **notification/**: Real-time Socket.io

## 🔧 Common Patterns

### Error Handling Pattern
```typescript
async findUser(id: number): Promise<UserDTO> {
  try {
    const user = await this.prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return this.mapToUserDTO(user);
  } catch (error) {
    this.logger.error(`Error finding user ${id}:`, error);
    
    if (error instanceof HttpException) {
      throw error;
    }
    
    throw new InternalServerErrorException('Failed to retrieve user');
  }
}
```

### Authentication Pattern
```typescript
@Get('profile')
async getCurrentUserProfile(@Req() req): Promise<UserProfileDTO> {
  const userId = req.user.id; // From JWT payload
  const userRole = req.user.role;
  
  return this.usersService.getProfileWithRole(userId, userRole);
}
```

### Real-time Notification Pattern
```typescript
@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway
  ) {}

  async createContent(userId: number, contentData: CreateContentDTO): Promise<ContentDTO> {
    const content = await this.prisma.contentNode.create({
      data: { ...contentData, userId },
      include: { user: true, concept: true },
    });

    // Emit real-time notification
    this.notificationGateway.notifyContentCreated(content);

    return this.mapToContentDTO(content);
  }
}
```

## 🔐 HEFL-Specific Requirements

### AI Services Pattern
- Use RAG (Retrieval Augmented Generation) pattern
- Validate all AI responses for educational appropriateness
- Implement rate limiting for AI service calls
- Handle LLM service failures gracefully

### CAD Integration Pattern
- Validate file paths to prevent traversal attacks
- Generate secure .bat scripts with time-limited access
- Log all CAD access for security audit
- Clean up temporary files automatically

### Code Execution Pattern
- Sanitize all user input before Judge0 submission
- Enforce resource limits (time, memory)
- Block dangerous system calls and network access
- Generate educational AI feedback for results

### Algorithm Visualization Pattern
- Validate graph input size to prevent DoS
- Generate step-by-step execution traces
- Track user progress and learning analytics
- Optimize for educational value over performance

## ✅ CRITICAL SUCCESS CHECKLIST

### Before ANY Code Submission
- [ ] **All methods documented** with JSDoc
- [ ] **DTOs used** for all request/response typing
- [ ] **No `any` types** anywhere in the code
- [ ] **Business logic in services** not controllers
- [ ] **Database changes** have migration files
- [ ] **Endpoints secured** with appropriate guards
- [ ] **Error handling** with proper exceptions
- [ ] **Logging implemented** for debugging
- [ ] **Type safety** with Prisma generated types

### Essential Commands
```bash
# Backend Development
cd server_nestjs
npm run lint              # Run linter
npm test                  # Run unit tests

# Database Management
npm run seed              # Reset DB and seed data
npx prisma migrate deploy # Run migrations
npx prisma studio         # Open Prisma GUI

# Documentation
npm run compodoc          # Generate docs (port 8002)
```

## 📝 Quick Reference

### Module Generation
```bash
nest g module feature-name
nest g controller feature-name
nest g service feature-name
```

### Common Imports
```typescript
import { Injectable, Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDTO, TaskDTO } from '@DTOs/index';
```

### Typical Service Constructor
```typescript
@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(private readonly prisma: PrismaService) {}
}
```

## 🏛️ ADVANCED NESTJS ARCHITECTURE PATTERNS (2025)

### Clean Architecture Implementation

#### Domain-Driven Design (DDD) Structure
```
src/
├── domain/                     # Business rules & entities
│   ├── entities/              # Core business objects
│   ├── value-objects/         # Immutable domain objects
│   ├── repositories/          # Domain repository interfaces
│   └── services/              # Domain services
├── application/               # Use cases & orchestration
│   ├── use-cases/            # Business use cases
│   ├── dto/                  # Application DTOs
│   └── ports/                # Interface adapters
├── infrastructure/            # External concerns
│   ├── database/             # Prisma implementations
│   ├── external-services/    # Third-party integrations
│   └── messaging/            # Event handling
└── presentation/             # Controllers & HTTP layer
    ├── controllers/
    ├── middlewares/
    └── guards/
```

#### CQRS Pattern Implementation
```typescript
// ✅ COMMAND PATTERN - Write Operations
@Injectable()
export class CreateUserCommandHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateUserCommand): Promise<UserDTO> {
    const user = new User(command.userData);
    await this.userRepository.save(user);
    
    // Publish domain event
    this.eventBus.publish(new UserCreatedEvent(user.id, user.email));
    
    return user.toDTO();
  }
}

// ✅ QUERY PATTERN - Read Operations
@Injectable()
export class GetUserQueryHandler implements IQueryHandler<GetUserQuery> {
  constructor(private readonly userReadModel: UserReadModelRepository) {}

  async execute(query: GetUserQuery): Promise<UserDTO> {
    return this.userReadModel.findById(query.userId);
  }
}
```

#### Repository Pattern with Dependency Inversion
```typescript
// ✅ DOMAIN LAYER - Repository Interface
export interface IUserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
}

// ✅ INFRASTRUCTURE LAYER - Prisma Implementation
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id.value },
      create: user.toPersistence(),
      update: user.toPersistence()
    });
  }

  async findById(id: UserId): Promise<User | null> {
    const userData = await this.prisma.user.findUnique({
      where: { id: id.value }
    });
    return userData ? User.fromPersistence(userData) : null;
  }
}
```

### Event-Driven Architecture

#### Domain Events Implementation
```typescript
// ✅ DOMAIN EVENT
export class UserCreatedEvent implements IDomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly occurredOn: Date = new Date()
  ) {}
}

// ✅ EVENT HANDLER
@Injectable()
@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    // Send welcome email
    await this.notificationService.sendWelcomeEmail(event.email);
    
    // Log user creation
    await this.auditService.logUserCreation(event.userId);
  }
}
```

#### Microservices Communication Pattern
```typescript
// ✅ SERVICE-TO-SERVICE COMMUNICATION
@Injectable()
export class UserService {
  constructor(
    @Inject('NOTIFICATION_SERVICE') 
    private readonly notificationClient: ClientProxy,
    @Inject('AUDIT_SERVICE') 
    private readonly auditClient: ClientProxy
  ) {}

  async createUser(userData: CreateUserDTO): Promise<UserDTO> {
    const user = await this.userRepository.create(userData);
    
    // Emit events to other microservices
    this.notificationClient.emit('user.created', {
      userId: user.id,
      email: user.email
    });
    
    this.auditClient.emit('user.audit', {
      action: 'CREATE_USER',
      userId: user.id,
      timestamp: new Date()
    });
    
    return user;
  }
}
```

## 🔐 ADVANCED API SECURITY & STANDARDS (2025)

### Modern Authentication Strategies

#### Multi-Factor Authentication (MFA)
```typescript
// ✅ MFA SERVICE IMPLEMENTATION
@Injectable()
export class MFAService {
  constructor(
    private readonly totpService: TOTPService,
    private readonly smsService: SMSService,
    private readonly userService: UserService
  ) {}

  async enableMFA(userId: string, method: MFAMethod): Promise<MFAEnableDTO> {
    const user = await this.userService.findById(userId);
    
    switch (method) {
      case MFAMethod.TOTP:
        const secret = this.totpService.generateSecret();
        const qrCode = await this.totpService.generateQRCode(secret, user.email);
        
        await this.userService.updateMFASecret(userId, secret);
        
        return {
          method: MFAMethod.TOTP,
          secret,
          qrCode,
          backupCodes: this.generateBackupCodes()
        };
        
      case MFAMethod.SMS:
        const verificationCode = this.generateSMSCode();
        await this.smsService.sendVerificationCode(user.phone, verificationCode);
        
        return {
          method: MFAMethod.SMS,
          message: 'Verification code sent to your phone'
        };
    }
  }

  async verifyMFA(userId: string, code: string, method: MFAMethod): Promise<boolean> {
    const user = await this.userService.findById(userId);
    
    switch (method) {
      case MFAMethod.TOTP:
        return this.totpService.verify(code, user.mfaSecret);
      case MFAMethod.SMS:
        return this.verifySMSCode(userId, code);
      default:
        throw new BadRequestException('Invalid MFA method');
    }
  }
}
```

#### Advanced JWT Security
```typescript
// ✅ SECURE JWT IMPLEMENTATION WITH REFRESH TOKENS
@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_EXPIRY = '15m';
  private readonly JWT_REFRESH_EXPIRY = '7d';
  
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly rateLimitService: RateLimitService
  ) {}

  async login(credentials: LoginDTO, clientInfo: ClientInfoDTO): Promise<AuthResponseDTO> {
    // Rate limiting check
    await this.rateLimitService.checkLoginAttempts(credentials.email, clientInfo.ip);
    
    const user = await this.validateUser(credentials);
    
    // Generate token pair
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    // Store refresh token securely
    await this.refreshTokenService.store(refreshToken, user.id, {
      userAgent: clientInfo.userAgent,
      ipAddress: clientInfo.ip,
      expiresAt: new Date(Date.now() + ms(this.JWT_REFRESH_EXPIRY))
    });
    
    // Log successful login
    await this.auditService.logLogin(user.id, clientInfo);
    
    return {
      accessToken,
      refreshToken,
      user: user.toPublicDTO(),
      expiresIn: ms(this.JWT_ACCESS_EXPIRY)
    };
  }

  private generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.getPermissions(),
      iat: Math.floor(Date.now() / 1000),
      iss: 'hefl-api',
      aud: 'hefl-client'
    };
    
    return this.jwtService.sign(payload, {
      expiresIn: this.JWT_ACCESS_EXPIRY,
      algorithm: 'RS256' // Use asymmetric encryption for security
    });
  }
}
```

### Advanced Authorization Patterns

#### Permission-Based Access Control (PBAC)
```typescript
// ✅ GRANULAR PERMISSION SYSTEM
export enum Permission {
  // User permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  
  // Content permissions
  CONTENT_CREATE = 'content:create',
  CONTENT_PUBLISH = 'content:publish',
  CONTENT_MODERATE = 'content:moderate',
  
  // Admin permissions
  SYSTEM_ADMIN = 'system:admin',
  USER_MANAGEMENT = 'user:manage'
}

@Injectable()
export class PermissionService {
  async checkPermission(userId: string, permission: Permission, resourceId?: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    
    // Check direct user permissions
    if (user.permissions.includes(permission)) {
      return true;
    }
    
    // Check role-based permissions
    const rolePermissions = await this.getRolePermissions(user.roles);
    if (rolePermissions.includes(permission)) {
      return true;
    }
    
    // Check resource-specific permissions
    if (resourceId) {
      return this.checkResourcePermission(userId, permission, resourceId);
    }
    
    return false;
  }
}

// ✅ PERMISSION GUARD
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<Permission[]>(
      PERMISSIONS_KEY,
      context.getHandler()
    );
    
    if (!requiredPermissions) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;
    
    return Promise.all(
      requiredPermissions.map(permission =>
        this.permissionService.checkPermission(user.id, permission, resourceId)
      )
    ).then(results => results.every(result => result));
  }
}
```

### API Rate Limiting & Security

#### Advanced Rate Limiting Strategy
```typescript
// ✅ MULTI-TIER RATE LIMITING
@Injectable()
export class RateLimitService {
  constructor(private readonly redis: Redis) {}

  async checkRateLimit(
    identifier: string,
    limitType: RateLimitType,
    customLimit?: RateLimit
  ): Promise<RateLimitResult> {
    const limit = customLimit || this.getDefaultLimit(limitType);
    const key = `rate_limit:${limitType}:${identifier}`;
    
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, limit.windowSeconds);
    }
    
    const ttl = await this.redis.ttl(key);
    
    if (current > limit.maxRequests) {
      throw new TooManyRequestsException({
        message: 'Rate limit exceeded',
        retryAfter: ttl,
        limit: limit.maxRequests,
        current
      });
    }
    
    return {
      allowed: true,
      limit: limit.maxRequests,
      remaining: Math.max(0, limit.maxRequests - current),
      resetTime: new Date(Date.now() + ttl * 1000)
    };
  }

  private getDefaultLimit(type: RateLimitType): RateLimit {
    const limits = {
      [RateLimitType.LOGIN]: { maxRequests: 5, windowSeconds: 900 }, // 5 per 15min
      [RateLimitType.API_GENERAL]: { maxRequests: 1000, windowSeconds: 3600 }, // 1000 per hour
      [RateLimitType.API_SENSITIVE]: { maxRequests: 10, windowSeconds: 60 }, // 10 per minute
      [RateLimitType.FILE_UPLOAD]: { maxRequests: 5, windowSeconds: 300 } // 5 per 5min
    };
    
    return limits[type];
  }
}
```

### OpenAPI 3.2 Standards Implementation

#### Contract-First API Design
```typescript
// ✅ OPENAPI SPECIFICATION WITH FULL VALIDATION
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new user',
    description: 'Creates a new user account with comprehensive validation'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully created',
    type: UserDTO,
    examples: {
      success: {
        value: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          firstname: 'John',
          lastname: 'Doe',
          role: 'student',
          createdAt: '2025-01-01T00:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'User with email already exists' 
  })
  @RequirePermissions(Permission.USER_WRITE)
  async createUser(
    @Body() @ApiBody({
      description: 'User creation data',
      type: CreateUserDTO,
      examples: {
        student: {
          summary: 'Student user creation',
          value: {
            email: 'student@university.edu',
            firstname: 'Jane',
            lastname: 'Smith',
            password: 'SecurePassword123!',
            role: 'student'
          }
        }
      }
    }) createUserDto: CreateUserDTO
  ): Promise<UserDTO> {
    return this.usersService.create(createUserDto);
  }
}
```

## ⚡ PERFORMANCE OPTIMIZATION & SCALING (2025)

### Advanced Caching Strategies

#### Multi-Layer Caching Implementation
```typescript
// ✅ REDIS + IN-MEMORY HYBRID CACHING
@Injectable()
export class CacheService {
  private readonly localCache = new Map<string, CacheItem>();
  private readonly LOCAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly redis: Redis
  ) {}

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    // L1: Check local memory cache first (fastest)
    const localItem = this.localCache.get(key);
    if (localItem && !this.isExpired(localItem)) {
      return localItem.value as T;
    }

    // L2: Check Redis cache (fast, distributed)
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      const value = JSON.parse(redisValue);
      
      // Populate local cache
      this.setLocal(key, value, options?.localTTL || this.LOCAL_CACHE_TTL);
      
      return value as T;
    }

    return null;
  }

  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || 3600; // 1 hour default
    
    // Set in Redis (distributed)
    await this.redis.setex(key, ttl, JSON.stringify(value));
    
    // Set in local memory (fastest access)
    this.setLocal(key, value, options?.localTTL || this.LOCAL_CACHE_TTL);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Invalidate Redis keys
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    // Invalidate local cache
    for (const [key] of this.localCache) {
      if (this.matchesPattern(key, pattern)) {
        this.localCache.delete(key);
      }
    }
  }
}

// ✅ CACHING DECORATOR
export function Cacheable(options: CacheDecoratorOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = this.cacheService || this.cache;
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

      // Try to get from cache
      let result = await cacheService.get(cacheKey);
      
      if (result === null) {
        // Cache miss - execute method
        result = await method.apply(this, args);
        
        // Store in cache
        await cacheService.set(cacheKey, result, {
          ttl: options.ttl || 3600,
          tags: options.tags
        });
      }
      
      return result;
    };
  };
}
```

#### Database Query Optimization
```typescript
// ✅ PRISMA OPTIMIZATION PATTERNS
@Injectable()
export class OptimizedUserService {
  constructor(private readonly prisma: PrismaService) {}

  // Optimized pagination with cursor-based approach
  @Cacheable({ ttl: 300, keyGenerator: (limit, cursor, filter) => 
    `users:paginated:${limit}:${cursor}:${JSON.stringify(filter)}`
  })
  async findUsersOptimized(params: FindUsersParams): Promise<PaginatedUsersDTO> {
    const { limit = 20, cursor, filter } = params;
    
    const users = await this.prisma.user.findMany({
      take: limit + 1, // Get one extra to check if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      where: this.buildWhereClause(filter),
      select: {
        // Only select needed fields to reduce data transfer
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        role: true,
        lastLoginAt: true,
        _count: {
          select: {
            contentNodes: true,
            submissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const hasNextPage = users.length > limit;
    const items = hasNextPage ? users.slice(0, -1) : users;
    
    return {
      items: items.map(user => this.mapToUserSummaryDTO(user)),
      hasNextPage,
      nextCursor: hasNextPage ? items[items.length - 1].id : null,
      totalCount: await this.getCachedUserCount(filter)
    };
  }

  // Optimized single user query with strategic includes
  async findUserWithDetails(id: string): Promise<UserDetailDTO> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        userSubjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        // Only include recent activities
        submissions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
            score: true,
            contentNode: {
              select: { title: true }
            }
          }
        }
      }
    }).then(user => this.mapToUserDetailDTO(user));
  }

  // Batch operations for efficiency
  async updateMultipleUsers(updates: BatchUserUpdateDTO[]): Promise<void> {
    await this.prisma.$transaction(
      updates.map(update => 
        this.prisma.user.update({
          where: { id: update.id },
          data: update.data
        })
      )
    );

    // Invalidate affected cache entries
    const cacheKeys = updates.map(update => `user:${update.id}:*`);
    await Promise.all(
      cacheKeys.map(pattern => this.cacheService.invalidatePattern(pattern))
    );
  }
}
```

### Monitoring & Performance Tracking

#### APM Integration
```typescript
// ✅ APPLICATION PERFORMANCE MONITORING
@Injectable()
export class PerformanceService {
  constructor(
    private readonly prometheus: PrometheusService,
    private readonly logger: Logger
  ) {}

  // Custom metrics collection
  private readonly httpRequestDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
  });

  private readonly databaseQueryDuration = new prometheus.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1]
  });

  trackHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration
    );
  }

  trackDatabaseQuery(operation: string, table: string, duration: number): void {
    this.databaseQueryDuration.observe(
      { operation, table },
      duration
    );
  }
}

// ✅ PERFORMANCE INTERCEPTOR
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private readonly performanceService: PerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = (Date.now() - startTime) / 1000;
        
        this.performanceService.trackHttpRequest(
          request.method,
          request.route?.path || request.url,
          response.statusCode,
          duration
        );
      })
    );
  }
}
```

## 🧪 COMPREHENSIVE TESTING STRATEGIES (2025)

### Advanced Unit Testing Patterns

#### Test-Driven Development with NestJS
```typescript
// ✅ COMPREHENSIVE SERVICE TESTING
describe('UserService', () => {
  let service: UserService;
  let mockPrisma: DeepMockProxy<PrismaService>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>()
        },
        {
          provide: CacheService,
          useValue: createMock<CacheService>()
        },
        {
          provide: EventBus,
          useValue: createMock<EventBus>()
        }
      ]
    }).compile();

    service = module.get<UserService>(UserService);
    mockPrisma = module.get(PrismaService);
    mockCacheService = module.get(CacheService);
    mockEventBus = module.get(EventBus);
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDTO = {
      email: 'test@example.com',
      firstname: 'John',
      lastname: 'Doe',
      password: 'securePassword123!',
      role: 'student'
    };

    it('should create user successfully with all side effects', async () => {
      // Arrange
      const expectedUser = {
        id: 'user-123',
        ...createUserDto,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue(expectedUser);
      mockCacheService.invalidatePattern.mockResolvedValue();
      mockEventBus.publish.mockResolvedValue();

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: expectedUser.id,
        email: expectedUser.email,
        firstname: expectedUser.firstname,
        lastname: expectedUser.lastname
      }));

      // Verify all interactions
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email }
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining(createUserDto),
        include: expect.any(Object)
      });
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('users:*');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(UserCreatedEvent)
      );
    });

    it('should throw ConflictException when user already exists', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: createUserDto.email
      } as any);

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException(`User with email ${createUserDto.email} already exists`)
      );

      // Verify no creation attempt was made
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });
});
```

### Integration Testing Best Practices

#### End-to-End API Testing
```typescript
// ✅ COMPREHENSIVE INTEGRATION TESTS
describe('Users API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
    .overrideProvider(PrismaService)
    .useValue(createTestPrismaService()) // Use test database
    .compile();

    app = moduleFixture.createNestApplication();
    
    // Apply all middleware and pipes as in production
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }));
    app.useGlobalFilters(new HttpExceptionFilter());
    
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    authService = app.get<AuthService>(AuthService);
    
    // Setup test data
    await setupTestDatabase(prisma);
    testUser = await createTestUser(prisma);
    authToken = await authService.generateAccessToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await app.close();
  });

  describe('POST /users', () => {
    const createUserDto = {
      email: 'newuser@example.com',
      firstname: 'New',
      lastname: 'User',
      password: 'SecurePassword123!',
      role: 'student'
    };

    it('should create user with valid data and authentication', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createUserDto)
        .expect(201)
        .expect((response) => {
          expect(response.body).toMatchObject({
            email: createUserDto.email,
            firstname: createUserDto.firstname,
            lastname: createUserDto.lastname,
            role: createUserDto.role
          });
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('createdAt');
          expect(response.body).not.toHaveProperty('password');
        });
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(401);
    });

    it('should validate email format', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...createUserDto, email: 'invalid-email' })
        .expect(400)
        .expect((response) => {
          expect(response.body.message).toContain('email must be an email');
        });
    });

    it('should enforce password complexity', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...createUserDto, password: 'weak' })
        .expect(400)
        .expect((response) => {
          expect(response.body.message).toContain('password is too weak');
        });
    });

    it('should prevent duplicate email registration', async () => {
      // First creation
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createUserDto)
        .expect(201);

      // Duplicate attempt
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createUserDto)
        .expect(409)
        .expect((response) => {
          expect(response.body.message).toContain('already exists');
        });
    });
  });

  describe('GET /users', () => {
    beforeEach(async () => {
      await createMultipleTestUsers(prisma, 25); // Test pagination
    });

    it('should return paginated users with default parameters', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveProperty('items');
          expect(response.body).toHaveProperty('hasNextPage');
          expect(response.body).toHaveProperty('nextCursor');
          expect(response.body.items).toHaveLength(20); // Default limit
        });
    });

    it('should respect custom pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/users?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.items).toHaveLength(10);
        });
    });

    it('should filter by role', () => {
      return request(app.getHttpServer())
        .get('/users?role=student')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((response) => {
          response.body.items.forEach(user => {
            expect(user.role).toBe('student');
          });
        });
    });
  });
});
```

### Test Utilities and Helpers

#### Mock Factory Patterns
```typescript
// ✅ MOCK FACTORIES FOR CONSISTENT TESTING
export class MockFactory {
  static createUser(overrides: Partial<User> = {}): User {
    return {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createCreateUserDTO(overrides: Partial<CreateUserDTO> = {}): CreateUserDTO {
    return {
      email: faker.internet.email(),
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      password: 'SecurePassword123!',
      role: 'student',
      ...overrides
    };
  }

  static createPrismaUser(overrides: any = {}): any {
    return {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      passwordHash: faker.datatype.string(),
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
      userSubjects: [],
      ...overrides
    };
  }
}

// ✅ TEST DATABASE UTILITIES
export class TestDatabaseUtils {
  static async setupCleanDatabase(prisma: PrismaService): Promise<void> {
    // Clean all tables in correct order (respecting foreign key constraints)
    await prisma.submission.deleteMany();
    await prisma.contentNode.deleteMany();
    await prisma.userSubject.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.user.deleteMany();
  }

  static async seedTestData(prisma: PrismaService): Promise<TestDataSeed> {
    const subjects = await this.createTestSubjects(prisma);
    const users = await this.createTestUsers(prisma, subjects);
    const content = await this.createTestContent(prisma, users, subjects);

    return { subjects, users, content };
  }

  private static async createTestUsers(
    prisma: PrismaService, 
    subjects: Subject[]
  ): Promise<User[]> {
    const users = [];
    
    // Create admin user
    const admin = await prisma.user.create({
      data: MockFactory.createPrismaUser({
        email: 'admin@test.com',
        role: 'admin'
      })
    });
    users.push(admin);

    // Create teacher users
    for (let i = 0; i < 3; i++) {
      const teacher = await prisma.user.create({
        data: MockFactory.createPrismaUser({
          role: 'teacher',
          userSubjects: {
            create: [{ subjectId: subjects[i % subjects.length].id }]
          }
        }),
        include: { userSubjects: true }
      });
      users.push(teacher);
    }

    // Create student users
    for (let i = 0; i < 20; i++) {
      const student = await prisma.user.create({
        data: MockFactory.createPrismaUser({
          role: 'student',
          userSubjects: {
            create: subjects.slice(0, 2).map(subject => ({ subjectId: subject.id }))
          }
        }),
        include: { userSubjects: true }
      });
      users.push(student);
    }

    return users;
  }
}
```

---

**Remember**: You are the guardian of data integrity and business logic. Every line impacts the entire HEFL ecosystem. Excellence is mandatory, not optional.

---

## 📚 Additional Resources

### Essential NestJS Documentation
- [NestJS Official Documentation](https://docs.nestjs.com/)
- [Clean Architecture with NestJS](https://github.com/wesleey/nest-clean-architecture)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)

### Security & Performance
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

### Monitoring & Observability
- [OpenTelemetry for Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [Prometheus with NestJS](https://docs.nestjs.com/recipes/prometheus)

**Stay updated with 2025 best practices and continuously evolve your implementation.**