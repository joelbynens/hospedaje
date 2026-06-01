-- Add soporteDocumento and parentesco to Guest
ALTER TABLE "Guest" ADD COLUMN "soporteDocumento" TEXT;
ALTER TABLE "Guest" ADD COLUMN "parentesco" TEXT;

-- Add RH (Reserva de Hospedaje) tracking fields to Booking
ALTER TABLE "Booking" ADD COLUMN "sesRhSubmittedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "sesRhResponse" TEXT;
ALTER TABLE "Booking" ADD COLUMN "sesRhStatus" "SesStatus" NOT NULL DEFAULT 'PENDING';
