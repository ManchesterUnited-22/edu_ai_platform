ALTER TABLE "User"
  ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaSecret" TEXT,
  ADD COLUMN "mfaPendingSecret" TEXT,
  ADD COLUMN "mfaRecoveryCodes" JSONB,
  ADD COLUMN "mfaEnrolledAt" TIMESTAMP(3);
