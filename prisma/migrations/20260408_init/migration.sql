-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETE');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('PENDING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "SesStatus" AS ENUM ('PENDING', 'SENT', 'ERROR');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('EFECT', 'TARJT', 'PLATF', 'TRANS', 'MOVIL', 'TREG', 'OTRO');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('NIF', 'NIE', 'PAS', 'OTRO');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('H', 'M', 'O');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "airbnbRef" TEXT NOT NULL,
    "checkinDate" TIMESTAMP(3) NOT NULL,
    "checkoutDate" TIMESTAMP(3) NOT NULL,
    "checkinTime" TEXT NOT NULL DEFAULT '16:00',
    "checkoutTime" TEXT NOT NULL DEFAULT '11:00',
    "numGuests" INTEGER NOT NULL,
    "paymentType" "PaymentType" NOT NULL DEFAULT 'PLATF',
    "token" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "sesSubmittedAt" TIMESTAMP(3),
    "sesResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "docType" "DocType",
    "docNumber" TEXT,
    "firstName" TEXT,
    "surname1" TEXT,
    "surname2" TEXT,
    "sex" "Sex",
    "birthDate" TIMESTAMP(3),
    "nationality" TEXT,
    "residenceCountry" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "signatureBase64" TEXT,
    "status" "GuestStatus" NOT NULL DEFAULT 'PENDING',
    "sesStatus" "SesStatus" NOT NULL DEFAULT 'PENDING',
    "sesResponse" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_airbnbRef_key" ON "Booking"("airbnbRef");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_token_key" ON "Booking"("token");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

