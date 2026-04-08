import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    airbnbRef,
    checkinDate,
    checkoutDate,
    checkinTime,
    checkoutTime,
    numGuests,
    paymentType,
  } = body;

  if (!airbnbRef || !checkinDate || !checkoutDate || !numGuests) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const existing = await prisma.booking.findUnique({ where: { airbnbRef } });
  if (existing) {
    return NextResponse.json(
      { error: "A booking with this reference already exists." },
      { status: 409 }
    );
  }

  const booking = await prisma.booking.create({
    data: {
      airbnbRef,
      checkinDate: new Date(checkinDate),
      checkoutDate: new Date(checkoutDate),
      checkinTime: checkinTime ?? "16:00",
      checkoutTime: checkoutTime ?? "11:00",
      numGuests: parseInt(numGuests),
      paymentType: paymentType ?? "PLATF",
      guests: {
        create: Array.from({ length: parseInt(numGuests) }, (_, i) => ({
          sortOrder: i,
        })),
      },
    },
  });

  return NextResponse.json(booking, { status: 201 });
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { guests: true },
  });

  return NextResponse.json(bookings);
}
