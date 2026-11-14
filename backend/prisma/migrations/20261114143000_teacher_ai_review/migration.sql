ALTER TYPE "SecurityEventType" ADD VALUE 'teacher_ai_review';

ALTER TABLE "User"
  ADD COLUMN "teacherBio" TEXT,
  ADD COLUMN "teacherSubjects" TEXT,
  ADD COLUMN "teacherExperienceYears" INTEGER;
