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

  const { success, response } = await submitToSes({
    ...booking,
    guests: completeGuests,
  });

  // Update booking with SES response
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      sesSubmittedAt: new Date(),
      sesResponse: response,
    },
  });

  // Update each guest's SES status
  await prisma.guest.updateMany({
    where: { bookingId, status: "COMPLETE" },
    data: { sesStatus: success ? "SENT" : "ERROR", sesResponse: response },
  });

  if (success) {
    return NextResponse.json({ message: "Successfully submitted to SES.Hospedaje" });
  } else {
    return NextResponse.json(
      { message: `SES returned an error. Response saved. Check booking details.` },
      { status: 502 }
    );
  }
}
