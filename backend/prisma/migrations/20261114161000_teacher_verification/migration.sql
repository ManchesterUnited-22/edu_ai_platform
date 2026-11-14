CREATE TYPE "VerificationStatus" AS ENUM ('draft', 'processing', 'admin_review', 'needs_more_information', 'approved', 'rejected');
CREATE TYPE "VerificationTrack" AS ENUM ('active_teacher', 'retired_teacher', 'teaching_student', 'new_graduate', 'language_teacher');
CREATE TYPE "VerificationDocumentKind" AS ENUM ('identity', 'teaching_credential', 'employment_proof', 'transcript', 'language_certificate', 'other');

CREATE TABLE "TeacherVerification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "track" "VerificationTrack" NOT NULL,
  "status" "VerificationStatus" NOT NULL DEFAULT 'draft',
  "aiScore" INTEGER,
  "aiLabel" TEXT,
  "aiReasons" JSONB,
  "aiSource" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewerId" TEXT,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherVerificationDocument" (
  "id" TEXT NOT NULL,
  "verificationId" TEXT NOT NULL,
  "kind" "VerificationDocumentKind" NOT NULL,
  "fileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherVerificationDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherVerification_userId_createdAt_idx" ON "TeacherVerification"("userId", "createdAt");
CREATE INDEX "TeacherVerification_status_createdAt_idx" ON "TeacherVerification"("status", "createdAt");
CREATE INDEX "TeacherVerificationDocument_verificationId_kind_idx" ON "TeacherVerificationDocument"("verificationId", "kind");

ALTER TABLE "TeacherVerification"
  ADD CONSTRAINT "TeacherVerification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TeacherVerification_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TeacherVerificationDocument"
  ADD CONSTRAINT "TeacherVerificationDocument_verificationId_fkey"
  FOREIGN KEY ("verificationId") REFERENCES "TeacherVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
