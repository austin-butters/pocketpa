-- AlterTable
ALTER TABLE "User" DROP COLUMN "verificationCode",
DROP COLUMN "verificationCodeExpiresAt",
ADD COLUMN     "emailVerificationCode" VARCHAR(6),
ADD COLUMN     "emailVerificationCodeExpiresAt" TIMESTAMPTZ(6),
ADD COLUMN     "loginVerificationCode" TEXT,
ADD COLUMN     "loginVerificationCodeExpiresAt" TIMESTAMPTZ(6);

