CREATE TYPE "TeacherType" AS ENUM ('institution', 'independent', 'online');
CREATE TYPE "VerificationLevel" AS ENUM ('basic', 'verified', 'trusted');

ALTER TABLE "User"
  ADD COLUMN "teacherType" "TeacherType",
  ADD COLUMN "verificationLevel" "VerificationLevel" NOT NULL DEFAULT 'basic';
