import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitToSes } from "@/lib/ses";
import { isAdminAuthenticated } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { guests: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const completeGuests = booking.guests.filter((g) => g.status === "COMPLETE");
  if (completeGuests.length === 0) {
    return NextResponse.json(
      { error: "No completed guests to submit" },
      { status: 400 }
    );
  }

  const { rhSuccess, rhResponse, pvSuccess, pvResponse } = await submitToSes({
    ...booking,
    guests: completeGuests,
  });

  const now = new Date();

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      sesRhSubmittedAt: now,
      sesRhResponse: rhResponse,
      sesRhStatus: rhSuccess ? "SENT" : "ERROR",
      ...(pvSuccess
        ? { sesSubmittedAt: now, sesResponse: pvResponse }
        : { sesResponse: pvResponse }),
    },
  });

  // Update per-guest PV status
  await prisma.guest.updateMany({
    where: { bookingId, status: "COMPLETE" },
    data: {
      sesStatus: pvSuccess ? "SENT" : "ERROR",
      sesResponse: pvResponse,
    },
  });

  if (!rhSuccess) {
    return NextResponse.json(
      { message: "RH (Reserva de Hospedaje) failed. Check booking details for the error response." },
      { status: 502 }
    );
  }

  if (!pvSuccess) {
    return NextResponse.json(
      { message: "RH succeeded but PV (Parte de Viajeros) failed. Check booking details for the error response." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    message: "Successfully submitted both RH and PV to SES.Hospedaje.",
  });
}
