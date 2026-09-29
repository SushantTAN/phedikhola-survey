-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'OTHER');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT,
    "assignedWardId" TEXT,
    "citizenEntryCount" INTEGER NOT NULL DEFAULT 0,
    "serviceEntryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citizen" (
    "id" TEXT NOT NULL,
    "clientUuid" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "approximateAge" INTEGER,
    "gender" "Gender" NOT NULL,
    "phone" TEXT,
    "casteGroupCode" TEXT,
    "casteOther" TEXT,
    "maritalStatusCode" TEXT,
    "occupationCode" TEXT,
    "occupationOther" TEXT,
    "livingStatusCode" TEXT,
    "householdForeignEmployment" BOOLEAN,
    "profilePhotoUrl" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Citizen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CitizenCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenCategoryAssignment" (
    "citizenId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "CitizenCategoryAssignment_pkey" PRIMARY KEY ("citizenId","categoryId")
);

-- CreateTable
CREATE TABLE "CitizenWardAssignment" (
    "citizenId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,

    CONSTRAINT "CitizenWardAssignment_pkey" PRIMARY KEY ("citizenId","wardId")
);

-- CreateTable
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT NOT NULL,
    "locationNameEn" TEXT,
    "locationNameNe" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCondition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineUnit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MedicineUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "strength" TEXT,
    "dosageForm" TEXT,
    "description" TEXT,
    "defaultUnitId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenServiceRecord" (
    "id" TEXT NOT NULL,
    "clientUuid" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "createdById" TEXT,
    "serviceType" TEXT NOT NULL DEFAULT 'SENIOR_CITIZEN_HEALTH',
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "nepaliYear" INTEGER,
    "nepaliMonth" TEXT,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "pulseRate" INTEGER,
    "temperatureF" DECIMAL(5,2),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "altitude" DECIMAL(8,2),
    "accuracy" DECIMAL(8,2),
    "notes" TEXT,
    "otherHealthProblem" TEXT,
    "visitPhotoUrl" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CitizenServiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceHealthCondition" (
    "serviceId" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,

    CONSTRAINT "ServiceHealthCondition_pkey" PRIMARY KEY ("serviceId","conditionId")
);

-- CreateTable
CREATE TABLE "ServiceMedicine" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "medicineId" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "otherMedicineName" TEXT,

    CONSTRAINT "ServiceMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "status" "SyncStatus" NOT NULL,
    "pushedCount" INTEGER NOT NULL DEFAULT 0,
    "pulledCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppVersion" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ANDROID',
    "latestVersion" TEXT NOT NULL,
    "minimumVersion" TEXT NOT NULL,
    "updateMessageEn" TEXT,
    "updateMessageNe" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_employeeCode_key" ON "StaffProfile"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Citizen_clientUuid_key" ON "Citizen"("clientUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Citizen_publicId_key" ON "Citizen"("publicId");

-- CreateIndex
CREATE INDEX "Citizen_fullName_idx" ON "Citizen"("fullName");

-- CreateIndex
CREATE INDEX "Citizen_phone_idx" ON "Citizen"("phone");

-- CreateIndex
CREATE INDEX "Citizen_status_updatedAt_idx" ON "Citizen"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenCategory_code_key" ON "CitizenCategory"("code");

-- CreateIndex
CREATE INDEX "CitizenWardAssignment_wardId_idx" ON "CitizenWardAssignment"("wardId");

-- CreateIndex
CREATE UNIQUE INDEX "Ward_code_key" ON "Ward"("code");

-- CreateIndex
CREATE UNIQUE INDEX "HealthCondition_code_key" ON "HealthCondition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineUnit_code_key" ON "MedicineUnit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_code_key" ON "Medicine"("code");

-- CreateIndex
CREATE INDEX "Medicine_name_idx" ON "Medicine"("name");

-- CreateIndex
CREATE INDEX "Medicine_active_idx" ON "Medicine"("active");

-- CreateIndex
CREATE UNIQUE INDEX "CitizenServiceRecord_clientUuid_key" ON "CitizenServiceRecord"("clientUuid");

-- CreateIndex
CREATE INDEX "CitizenServiceRecord_citizenId_serviceDate_idx" ON "CitizenServiceRecord"("citizenId", "serviceDate");

-- CreateIndex
CREATE INDEX "CitizenServiceRecord_wardId_serviceDate_idx" ON "CitizenServiceRecord"("wardId", "serviceDate");

-- CreateIndex
CREATE INDEX "CitizenServiceRecord_updatedAt_idx" ON "CitizenServiceRecord"("updatedAt");

-- CreateIndex
CREATE INDEX "ServiceMedicine_serviceId_idx" ON "ServiceMedicine"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceMedicine_medicineId_idx" ON "ServiceMedicine"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetOtp_email_expiresAt_idx" ON "PasswordResetOtp"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "SyncLog_userId_createdAt_idx" ON "SyncLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_assignedWardId_fkey" FOREIGN KEY ("assignedWardId") REFERENCES "Ward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenCategoryAssignment" ADD CONSTRAINT "CitizenCategoryAssignment_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenCategoryAssignment" ADD CONSTRAINT "CitizenCategoryAssignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CitizenCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenWardAssignment" ADD CONSTRAINT "CitizenWardAssignment_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenWardAssignment" ADD CONSTRAINT "CitizenWardAssignment_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_defaultUnitId_fkey" FOREIGN KEY ("defaultUnitId") REFERENCES "MedicineUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenServiceRecord" ADD CONSTRAINT "CitizenServiceRecord_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenServiceRecord" ADD CONSTRAINT "CitizenServiceRecord_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenServiceRecord" ADD CONSTRAINT "CitizenServiceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceHealthCondition" ADD CONSTRAINT "ServiceHealthCondition_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CitizenServiceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceHealthCondition" ADD CONSTRAINT "ServiceHealthCondition_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "HealthCondition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMedicine" ADD CONSTRAINT "ServiceMedicine_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "CitizenServiceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMedicine" ADD CONSTRAINT "ServiceMedicine_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
