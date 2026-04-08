import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate token — never expose other bookings
  const booking = await prisma.booking.findUnique({ where: { token } });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { guestId, ...data } = body;

  if (!guestId) {
    return NextResponse.json({ error: "Missing guestId" }, { status: 400 });
  }

  // Verify this guest belongs to this booking
  const guest = await prisma.guest.findFirst({
    where: { id: guestId, bookingId: booking.id },
  });
  if (!guest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.guest.update({
    where: { id: guestId },
    data: {
      docType: data.docType,
      docNumber: data.docNumber,
      firstName: data.firstName,
      surname1: data.surname1,
      surname2: data.surname2 ?? null,
      sex: data.sex,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      nationality: data.nationality,
      residenceCountry: data.residenceCountry,
      city: data.city,
      postalCode: data.postalCode,
      address: data.address,
      email: data.email,
      phone: data.phone ?? null,
    },
  });

  return NextResponse.json(updated);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const booking = await prisma.booking.findUnique({ where: { token } });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { guestId, signatureBase64 } = await req.json();

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, bookingId: booking.id },
  });
  if (!guest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.guest.update({
    where: { id: guestId },
    data: {
      signatureBase64,
      status: "COMPLETE",
      completedAt: new Date(),
    },
  });

  // Update booking status
  const allGuests = await prisma.guest.findMany({
    where: { bookingId: booking.id },
  });
  const complete = allGuests.filter((g) => g.status === "COMPLETE").length;
  const bookingStatus =
    complete === 0
      ? "PENDING"
      : complete === allGuests.length
        ? "COMPLETE"
        : "PARTIAL";

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: bookingStatus },
  });

  return NextResponse.json(updated);
}
