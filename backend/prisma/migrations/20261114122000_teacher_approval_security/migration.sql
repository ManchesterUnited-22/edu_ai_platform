CREATE TYPE "AccountStatus" AS ENUM ('pending', 'active', 'rejected', 'suspended');
CREATE TYPE "SecurityEventType" AS ENUM ('failed_teacher_login', 'teacher_role_misuse', 'pending_teacher_access');

ALTER TYPE "Role" ADD VALUE 'admin';

ALTER TABLE "User" ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'active';

CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "type" "SecurityEventType" NOT NULL,
    "targetUserId" TEXT,
    "actorUserId" TEXT,
    "emailHint" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskReasons" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityEvent_type_createdAt_idx" ON "SecurityEvent"("type", "createdAt");
CREATE INDEX "SecurityEvent_targetUserId_createdAt_idx" ON "SecurityEvent"("targetUserId", "createdAt");

ALTER TABLE "SecurityEvent"
  ADD CONSTRAINT "SecurityEvent_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SecurityEvent"
  ADD CONSTRAINT "SecurityEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
