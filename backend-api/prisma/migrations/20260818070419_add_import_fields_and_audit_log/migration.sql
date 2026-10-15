/*
  Warnings:

  - You are about to drop the column `duration` on the `appointment` table. All the data in the column will be lost.
  - You are about to drop the column `revenue` on the `appointment` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `inventory` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[salonId,sourceSystem,externalId]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[salonId,sourceSystem,externalId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[salonId,sourceSystem,externalId]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productId` to the `Inventory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `appointment` DROP FOREIGN KEY `Appointment_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `appointment` DROP FOREIGN KEY `Appointment_salonId_fkey`;

-- DropForeignKey
ALTER TABLE `appointment` DROP FOREIGN KEY `Appointment_staffId_fkey`;

-- DropForeignKey
ALTER TABLE `customer` DROP FOREIGN KEY `Customer_salonId_fkey`;

-- DropForeignKey
ALTER TABLE `inventory` DROP FOREIGN KEY `Inventory_salonId_fkey`;

-- DropForeignKey
ALTER TABLE `staff` DROP FOREIGN KEY `Staff_salonId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_salonId_fkey`;

-- AlterTable (safe: IF EXISTS guards prevent failure if columns already removed)
ALTER TABLE `appointment`
    ADD COLUMN IF NOT EXISTS `externalId` VARCHAR(191) NULL,
    ADD COLUMN IF NOT EXISTS `sourceSystem` VARCHAR(191) NULL,
    MODIFY `staffId` VARCHAR(191) NULL;
ALTER TABLE `appointment` DROP COLUMN IF EXISTS `duration`;
ALTER TABLE `appointment` DROP COLUMN IF EXISTS `revenue`;

-- AlterTable
ALTER TABLE `customer` ADD COLUMN `externalId` VARCHAR(191) NULL,
    ADD COLUMN `sourceSystem` VARCHAR(191) NULL;

-- AlterTable (safe: IF EXISTS guards prevent failure if column already removed)
ALTER TABLE `inventory` ADD COLUMN IF NOT EXISTS `productId` VARCHAR(191) NOT NULL DEFAULT '';
ALTER TABLE `inventory` DROP COLUMN IF EXISTS `name`;

-- AlterTable
ALTER TABLE `staff` ADD COLUMN `externalId` VARCHAR(191) NULL,
    ADD COLUMN `sourceSystem` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Service` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `duration` INTEGER NOT NULL DEFAULT 60,
    `salonId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Service_salonId_idx`(`salonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppointmentService` (
    `id` VARCHAR(191) NOT NULL,
    `appointmentId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `priceAtBooking` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AppointmentService_appointmentId_idx`(`appointmentId`),
    INDEX `AppointmentService_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `method` VARCHAR(191) NOT NULL DEFAULT 'CARD',
    `sourceSystem` VARCHAR(191) NULL,
    `externalId` VARCHAR(191) NULL,
    `appointmentId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `salonId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_salonId_paymentDate_idx`(`salonId`, `paymentDate`),
    INDEX `Payment_salonId_status_idx`(`salonId`, `status`),
    INDEX `Payment_appointmentId_idx`(`appointmentId`),
    INDEX `Payment_customerId_idx`(`customerId`),
    UNIQUE INDEX `Payment_salonId_sourceSystem_externalId_key`(`salonId`, `sourceSystem`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `category` VARCHAR(191) NULL,
    `salonId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_salonId_idx`(`salonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportLog` (
    `id` VARCHAR(191) NOT NULL,
    `salonId` VARCHAR(191) NOT NULL,
    `sourceSystem` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `staffCount` INTEGER NOT NULL DEFAULT 0,
    `serviceCount` INTEGER NOT NULL DEFAULT 0,
    `customerCount` INTEGER NOT NULL DEFAULT 0,
    `appointmentCount` INTEGER NOT NULL DEFAULT 0,
    `paymentCount` INTEGER NOT NULL DEFAULT 0,
    `skippedCount` INTEGER NOT NULL DEFAULT 0,
    `warnings` TEXT NULL,
    `revenueTotal` DOUBLE NOT NULL DEFAULT 0,
    `dateRangeStart` DATETIME(3) NULL,
    `dateRangeEnd` DATETIME(3) NULL,
    `importedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImportLog_salonId_idx`(`salonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Appointment_salonId_date_idx` ON `Appointment`(`salonId`, `date`);

-- CreateIndex
CREATE INDEX `Appointment_salonId_status_idx` ON `Appointment`(`salonId`, `status`);

-- CreateIndex
CREATE UNIQUE INDEX `Appointment_salonId_sourceSystem_externalId_key` ON `Appointment`(`salonId`, `sourceSystem`, `externalId`);

-- CreateIndex
CREATE INDEX `Customer_salonId_lastVisit_idx` ON `Customer`(`salonId`, `lastVisit`);

-- CreateIndex
CREATE UNIQUE INDEX `Customer_salonId_sourceSystem_externalId_key` ON `Customer`(`salonId`, `sourceSystem`, `externalId`);

-- CreateIndex
CREATE UNIQUE INDEX `Inventory_productId_key` ON `Inventory`(`productId`);

-- CreateIndex
CREATE UNIQUE INDEX `Staff_salonId_sourceSystem_externalId_key` ON `Staff`(`salonId`, `sourceSystem`, `externalId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppointmentService` ADD CONSTRAINT `AppointmentService_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppointmentService` ADD CONSTRAINT `AppointmentService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportLog` ADD CONSTRAINT `ImportLog_salonId_fkey` FOREIGN KEY (`salonId`) REFERENCES `Salon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `appointment` RENAME INDEX `Appointment_customerId_fkey` TO `Appointment_customerId_idx`;

-- RenameIndex
ALTER TABLE `appointment` RENAME INDEX `Appointment_staffId_fkey` TO `Appointment_staffId_idx`;

-- RenameIndex
ALTER TABLE `customer` RENAME INDEX `Customer_salonId_fkey` TO `Customer_salonId_idx`;

-- RenameIndex
ALTER TABLE `inventory` RENAME INDEX `Inventory_salonId_fkey` TO `Inventory_salonId_idx`;

-- RenameIndex
ALTER TABLE `staff` RENAME INDEX `Staff_salonId_fkey` TO `Staff_salonId_idx`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `User_salonId_fkey` TO `User_salonId_idx`;
