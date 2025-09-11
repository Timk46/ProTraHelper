# Rhino Integration Security Documentation

## 🔒 Sicherheitskritische Aspekte - Plan B Implementation

### 1. Authentifizierung & Autorisierung

#### 1.1 JWT-Token Validierung
- **Mandatory**: Alle Rhino-Endpoints erfordern gültiges JWT-Token
- **Implementierung**: `@UseGuards(JwtAuthGuard)` auf Controller-Ebene
- **Token-Lebensdauer**: 2 Stunden (Access Token), 30 Tage (Refresh Token)
- **Revocation**: Tokens können server-seitig invalidiert werden

#### 1.2 Rollen-basierte Zugriffskontrolle
```typescript
@UseGuards(RolesGuard)
@Roles(Role.STUDENT, Role.LECTURER, Role.ADMIN)
```
- **STUDENT**: Kann Rhino fokussieren während aktiver Übungen
- **LECTURER**: Kann Rhino fokussieren + Admin-Funktionen
- **ADMIN**: Vollzugriff + Monitoring-Dashboard

#### 1.3 Session-Validierung
- **Exercise-Context**: Rhino nur während aktiver CAD-Übungen verfügbar
- **Time-Based**: Sessions verfallen nach 2 Stunden Inaktivität
- **Content-Binding**: Nur bei Inhalten mit `contentType: 'RHINO_TASK'`

### 2. Input-Validierung & Sanitization

#### 2.1 Window Handle Validation
```typescript
export class FocusWindowDTO {
  @IsInt()
  @Min(0)
  @Max(9999999)
  windowHandle: number;
  
  @IsEnum(['rhino', 'grasshopper'])
  @IsOptional()
  applicationFilter?: string;
}
```

#### 2.2 Anti-Injection Maßnahmen
- **No String Concatenation**: Alle Parameter werden als Integer geparst
- **Whitelist-Approach**: Nur erlaubte Application-Namen
- **Base64-Encoding**: PowerShell-Scripts werden Base64-kodiert übertragen

#### 2.3 Parameter-Sanitization
- Window Handles werden mit `parseInt()` validiert
- Ungültige Werte führen zu `BadRequestException`
- Keine Benutzer-Eingaben in Shell-Commands

### 3. Rate Limiting & DoS-Schutz

#### 3.1 User-basierte Limits
```typescript
@Throttle(5, 60) // Max 5 Calls pro Minute pro User
```

#### 3.2 IP-basierte Limits
```typescript
@Throttle(20, 60) // Max 20 Calls pro Minute pro IP
```

#### 3.3 Anomalie-Erkennung
- **Threshold**: Alert bei >10 Actions in 5 Minuten
- **Progressive Blocking**: Temporäre Sperrung bei Anomalien
- **Admin-Notification**: Real-time Alerts via WebSocket

### 4. Audit & Monitoring

#### 4.1 Vollständiges Logging
```typescript
interface RhinoAuditLog {
  userId: number;
  action: 'FOCUS' | 'LAUNCH' | 'CLOSE';
  windowHandle?: string;
  success: boolean;
  errorMessage?: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  exerciseId?: number;
  timestamp: Date;
}
```

#### 4.2 Real-time Monitoring
- **Metrics**: Calls/Minute, Erfolgsrate, Latenz
- **Dashboards**: Admin-Interface für Live-Monitoring
- **Alerts**: E-Mail + WebSocket bei kritischen Ereignissen

#### 4.3 Compliance-Reporting
- **DSGVO-konform**: Anonymisierte Logs nach 90 Tagen
- **Retention-Policy**: Detaillierte Logs 30 Tage, Statistiken 1 Jahr
- **Export-Funktionen**: CSV/JSON-Export für Auditoren

### 5. Netzwerk-Sicherheit

#### 5.1 IP-Whitelist (Uni-Netzwerk)
```typescript
const ALLOWED_IP_RANGES = [
  '141.99.0.0/16',    // Uni Siegen Hauptnetz
  '192.168.0.0/16',   // Interne Netze
  '10.0.0.0/8'        // VPN-Zugang
];
```

#### 5.2 HTTPS-Enforcement
- **TLS 1.3**: Moderne Verschlüsselung
- **HSTS**: HTTP Strict Transport Security
- **Certificate Pinning**: Schutz vor MITM-Attacken

#### 5.3 CORS-Policy
```typescript
@EnableCors({
  origin: ['https://hefl.uni-siegen.de', 'https://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST']
})
```

### 6. User Consent & Transparency

#### 6.1 Explicit Consent
```typescript
interface ConsentResult {
  confirmed: boolean;
  remember: boolean; // Für Session-Dauer
  timestamp: Date;
}
```

#### 6.2 Visual Warnings
- **Material Dialog**: Deutliche Warnung vor Desktop-Manipulation
- **Icon**: Warning-Symbol für kritische Aktionen
- **Text**: Klare Erklärung der Konsequenzen

#### 6.3 Consent-Tracking
- Alle Consent-Entscheidungen werden geloggt
- Widerruf jederzeit möglich
- Granulare Einstellungen pro Feature

### 7. Fehlerbehandlung & Security

#### 7.1 Graceful Degradation
```typescript
try {
  await this.rhinoService.focusWindow(handle);
} catch (error) {
  // Keine Systeminfos preisgeben
  this.logger.error('Rhino focus failed', { error, userId });
  throw new BadRequestException('Window focus operation failed');
}
```

#### 7.2 Sanitized Error Messages
- **Client**: Generische Fehlermeldungen
- **Server**: Detaillierte Logs für Debugging
- **Admin**: Vollständige Error-Details im Dashboard

#### 7.3 Fallback-Mechanismen
- Bei PowerShell-Fehlern: Fallback auf Native API
- Bei Native-API-Fehlern: Graceful Degradation
- Bei Netzwerk-Fehlern: Offline-Modus mit lokaler Speicherung

---

## ⚠️ Nicht implementierte Sicherheitsaspekte (für Plan A vorgesehen)

### Desktop-Agent-Features (Zukunft)
- [ ] **Code-Signierung**: Vertrauenswürdige Agent-Binaries
- [ ] **Process-Isolation**: Agent läuft in separater Sandbox
- [ ] **Local Whitelist**: Desktop-seitige Application-Kontrolle
- [ ] **Certificate-Pinning**: Hardware-basierte Authentifizierung
- [ ] **Secure Enclave**: Hardware-Security-Module

### Erweiterte Sicherheit (Optional)
- [ ] **2FA Integration**: TOTP für kritische Aktionen
- [ ] **Hardware-Token**: YubiKey-Support
- [ ] **Biometric Auth**: Windows Hello Integration
- [ ] **Zero-Trust**: Kontinuierliche Verifikation
- [ ] **Behavioral Analysis**: ML-basierte Anomalie-Erkennung

### Enterprise-Features (Langfristig)
- [ ] **SSO Integration**: SAML/OAuth2-Provider
- [ ] **Policy Management**: Zentrale Richtlinien-Verwaltung
- [ ] **Compliance Reporting**: GDPR/ISO27001-Reports
- [ ] **Forensic Logging**: Unveränderliche Audit-Trails

---

## 🔄 Migration von Plan B zu Plan A

### Phase 1: Vorbereitung (Monat 1-2)

#### 1.1 Desktop-Agent Entwicklung
```typescript
// Desktop-Agent Architektur
hefl-desktop-agent/
├── src/
│   ├── main.ts                 // Electron Main Process
│   ├── security/
│   │   ├── jwt-validator.ts    // Token-Validierung
│   │   ├── whitelist.ts        // App-Whitelist
│   │   └── sandbox.ts          // Process-Isolation
│   ├── api/
│   │   ├── websocket-server.ts // Local WebSocket
│   │   ├── rhino-controller.ts // Rhino-Integration
│   │   └── health-monitor.ts   // System-Monitoring
│   └── ui/
│       ├── tray-icon.ts        // System-Tray
│       ├── consent-dialog.ts   // Permissions-UI
│       └── settings-panel.ts   // Configuration
├── package.json
├── electron-builder.yml       // Build-Konfiguration
└── certificates/
    ├── code-signing.p12       // Code-Signierung
    └── root-ca.pem           // Certificate-Chain
```

#### 1.2 Backend-Erweiterungen
```typescript
// Neue Service-Layer für Agent-Management
@Injectable()
export class DesktopAgentService {
  async registerAgent(data: {
    agentId: string;
    userId: number;
    publicKey: string;
    version: string;
    systemInfo: SystemInfo;
  }): Promise<AgentRegistration> {
    // Agent-Registrierung mit PKI
  }
  
  async validateAgent(agentId: string, signature: string): Promise<boolean> {
    // Digitale Signatur-Prüfung
  }
  
  async revokeAgent(agentId: string, reason: string): Promise<void> {
    // Agent-Sperrung
  }
}
```

#### 1.3 Database Schema Updates
```sql
-- Agent-Management Tables
CREATE TABLE desktop_agents (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INT REFERENCES users(id),
  public_key TEXT NOT NULL,
  version VARCHAR(50),
  last_seen TIMESTAMP DEFAULT NOW(),
  status ENUM('active', 'revoked', 'expired') DEFAULT 'active',
  system_info JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agent_permissions (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) REFERENCES desktop_agents(agent_id),
  permission VARCHAR(100) NOT NULL,
  granted_by INT REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(agent_id, permission)
);

CREATE TABLE agent_sessions (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) REFERENCES desktop_agents(agent_id),
  session_token VARCHAR(255) UNIQUE,
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  status ENUM('active', 'expired', 'terminated') DEFAULT 'active'
);

-- Indexes for Performance
CREATE INDEX idx_agents_user_status ON desktop_agents(user_id, status);
CREATE INDEX idx_sessions_agent_active ON agent_sessions(agent_id, status);
CREATE INDEX idx_permissions_agent ON agent_permissions(agent_id);
```

### Phase 2: Pilot-Test (Monat 2-3)

#### 2.1 A/B Testing Framework
```typescript
@Injectable()
export class RhinoIntegrationStrategy {
  async determineStrategy(userId: number): Promise<'direct' | 'agent'> {
    // Feature-Flag basierte Entscheidung
    const user = await this.userService.findById(userId);
    
    if (await this.featureFlagService.isEnabled('desktop-agent', user)) {
      const agentStatus = await this.agentService.getAgentStatus(userId);
      return agentStatus.isOnline ? 'agent' : 'direct';
    }
    
    return 'direct'; // Fallback auf Plan B
  }
}
```

#### 2.2 Performance-Metriken
```typescript
interface MigrationMetrics {
  // Latenz-Vergleich
  directFocusLatency: number[];
  agentFocusLatency: number[];
  
  // Erfolgsraten
  directSuccessRate: number;
  agentSuccessRate: number;
  
  // User-Feedback
  userSatisfactionDirect: number;
  userSatisfactionAgent: number;
  
  // Technische Metriken
  agentUptime: number;
  connectionErrors: number;
  securityIncidents: number;
}
```

### Phase 3: Schrittweiser Rollout (Monat 3-4)

#### 3.1 Progressive Deployment
```typescript
// Rollout-Strategie
const ROLLOUT_PLAN = {
  week1: { targetGroup: 'PC_POOLS', percentage: 10 },
  week2: { targetGroup: 'PC_POOLS', percentage: 50 },
  week3: { targetGroup: 'STUDENTS_HOME', percentage: 25 },
  week4: { targetGroup: 'ALL_USERS', percentage: 100 }
};
```

#### 3.2 Canary-Deployment
```typescript
@Injectable()
export class CanaryDeploymentService {
  async evaluateCanaryHealth(): Promise<CanaryStatus> {
    const metrics = await this.metricsService.getLastHour();
    
    return {
      healthy: metrics.errorRate < 0.01 && metrics.latency < 100,
      metrics,
      recommendation: this.shouldProceed(metrics) ? 'PROCEED' : 'ROLLBACK'
    };
  }
}
```

### Phase 4: Vollständige Migration (Monat 4-6)

#### 4.1 Agent-Enforcement
```typescript
// Schrittweise Durchsetzung
@Injectable()
export class AgentEnforcementService {
  async enforceAgentUsage(userId: number): Promise<EnforcementResult> {
    const user = await this.userService.findById(userId);
    const enforcement = this.getEnforcementLevel(user.role);
    
    switch (enforcement) {
      case 'REQUIRED':
        if (!await this.hasActiveAgent(userId)) {
          throw new ForbiddenException('Desktop Agent required');
        }
        break;
      case 'RECOMMENDED':
        // Soft-Nudging zur Agent-Installation
        break;
      case 'OPTIONAL':
        // Plan B als Fallback verfügbar
        break;
    }
  }
}
```

### Phase 5: Legacy-Cleanup (Monat 6+)

#### 5.1 Plan B Deprecation
```typescript
// Deprecation-Warnings
@Controller('api/rhino-direct')
@Deprecated('Use Desktop Agent API instead')
export class LegacyRhinoController {
  @Post('focus-window')
  @ApiOperation({ 
    deprecated: true,
    description: 'Legacy endpoint. Use Agent API instead.' 
  })
  async legacyFocusWindow() {
    this.logger.warn('Legacy API usage detected');
    // Implementation mit Deprecation-Warning
  }
}
```

#### 5.2 Data Migration
```sql
-- Migration der Audit-Logs
INSERT INTO agent_audit_logs (
  user_id, action, success, timestamp, 
  migration_source, legacy_id
)
SELECT 
  user_id, action, success, created_at,
  'LEGACY_RHINO_DIRECT', id
FROM rhino_audit_logs
WHERE created_at > NOW() - INTERVAL '1 year';
```

---

## 📊 Erfolgs-Metriken & KPIs

### Sicherheits-KPIs
- **Security Incidents**: 0 kritische Vorfälle
- **Authentication Bypass**: 0 erfolgreiche Umgehungen
- **Data Breaches**: 0 Datenschutzverletzungen
- **Anomaly Detection**: >95% Erkennungsrate

### Performance-KPIs
- **Focus Latency**: <100ms (Agent), <500ms (Direct)
- **Success Rate**: >99.5% für beide Modi
- **Uptime**: >99.9% Verfügbarkeit
- **Error Rate**: <0.1% aller Requests

### User Experience-KPIs
- **User Satisfaction**: >4.5/5 Sterne
- **Support Tickets**: <5 pro Woche
- **Adoption Rate**: >80% Agent-Nutzung nach 6 Monaten
- **Training Time**: <10 Minuten für neue Nutzer

### Compliance-KPIs
- **Audit Coverage**: 100% aller Aktionen geloggt
- **GDPR Compliance**: Vollständige Datenportabilität
- **Retention Policy**: Automatische Löschung nach Policy
- **Access Reviews**: Quartalsweise Berechtigungs-Reviews

---

## 🔧 Troubleshooting & Support

### Häufige Probleme

#### Desktop-Agent Issues
```typescript
// Automatisierte Diagnose
class AgentDiagnostics {
  async runDiagnostics(): Promise<DiagnosticReport> {
    return {
      agentVersion: await this.getAgentVersion(),
      connectionStatus: await this.testConnection(),
      permissions: await this.checkPermissions(),
      systemInfo: await this.getSystemInfo(),
      recommendations: this.generateRecommendations()
    };
  }
}
```

#### Fallback-Mechanismen
- **Agent Offline**: Automatischer Fallback auf Plan B
- **Permission Denied**: User-Anleitung zur Berechtigung
- **Network Issues**: Retry-Logic mit Exponential Backoff
- **Version Mismatch**: Automatisches Update-Angebot

### Support-Dokumentation
- **Admin-Handbuch**: Komplette Installations-Anleitung
- **User-Guide**: Schritt-für-Schritt Bedienung
- **Troubleshooting-Matrix**: Problem-Lösung-Zuordnung
- **FAQ**: Häufige Fragen und Antworten

---

## 📝 Rollback-Plan

### Kriterien für Rollback
1. **Sicherheits-Incident**: Sofortiger Rollback bei Security-Breach
2. **Performance-Degradation**: >10% Latenz-Erhöhung
3. **User-Beschwerden**: >10 Support-Tickets/Tag
4. **System-Instabilität**: Agent-Crashes oder System-Probleme

### Rollback-Prozedur
```typescript
// Emergency Rollback
@Injectable()
export class EmergencyRollbackService {
  async executeRollback(reason: string): Promise<void> {
    // 1. Feature-Flag deaktivieren
    await this.featureFlagService.disable('desktop-agent');
    
    // 2. Alle Agents benachrichtigen
    await this.agentService.broadcastShutdown();
    
    // 3. Traffic auf Plan B umleiten
    await this.loadBalancer.redirectToLegacy();
    
    // 4. Monitoring anpassen
    await this.monitoring.switchToLegacyMode();
    
    // 5. Team benachrichtigen
    await this.alertService.notifyRollback(reason);
  }
}
```

### Recovery-Strategie
1. **Problem-Analyse**: Root-Cause-Analysis
2. **Fix-Entwicklung**: Hotfix-Deployment
3. **Testing**: Erweiterte Tests vor Re-Deployment
4. **Gradual Re-Rollout**: Langsame Wiedereinführung

---

*Letzte Aktualisierung: $(date '+%Y-%m-%d')*
*Version: 1.0*
*Maintainer: HEFL Security Team*