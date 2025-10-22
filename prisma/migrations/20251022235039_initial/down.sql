-- DropForeignKey
ALTER TABLE "ProjectUser" DROP CONSTRAINT "ProjectUser_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectUser" DROP CONSTRAINT "ProjectUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "ShotLog" DROP CONSTRAINT "ShotLog_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ShotLog" DROP CONSTRAINT "ShotLog_userId_fkey";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "ProjectUser";

-- DropTable
DROP TABLE "ShotLog";

-- DropEnum
DROP TYPE "ProjectUserRole";

-- DropEnum
DROP TYPE "ShotMark";

-- DropEnum
DROP TYPE "ShotScore";

