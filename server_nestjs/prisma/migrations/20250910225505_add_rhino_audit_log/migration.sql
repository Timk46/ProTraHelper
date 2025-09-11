-- CreateTable
CREATE TABLE "rhino_audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userEmail" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "parameters" TEXT,
    "result" TEXT NOT NULL,
    "errorMessage" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseTime" INTEGER,
    "securityRiskLevel" TEXT NOT NULL DEFAULT 'low',
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousReason" TEXT,

    CONSTRAINT "rhino_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rhino_audit_logs_userId_timestamp_idx" ON "rhino_audit_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "rhino_audit_logs_operation_timestamp_idx" ON "rhino_audit_logs"("operation", "timestamp");

-- CreateIndex
CREATE INDEX "rhino_audit_logs_suspicious_timestamp_idx" ON "rhino_audit_logs"("suspicious", "timestamp");

-- CreateIndex
CREATE INDEX "rhino_audit_logs_result_timestamp_idx" ON "rhino_audit_logs"("result", "timestamp");
