/*
  Warnings:

  - You are about to drop the column `emailVerificationCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerificationCodeExpiresAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `loginVerificationCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `loginVerificationCodeExpiresAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerificationCode",
DROP COLUMN "emailVerificationCodeExpiresAt",
DROP COLUMN "loginVerificationCode",
DROP COLUMN "loginVerificationCodeExpiresAt",
ADD COLUMN     "verificationCode" VARCHAR(6),
ADD COLUMN     "verificationCodeExpiresAt" TIMESTAMPTZ;
