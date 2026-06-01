import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SignatureStep } from "@/components/SignatureStep";
import type { Booking, Guest } from "@prisma/client";

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string; guestId: string }>;
}) {
  const { token, guestId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { token },
    include: { guests: { orderBy: { sortOrder: "asc" } } },
  });
  if (!booking) notFound();

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, bookingId: booking.id },
  });
  if (!guest) notFound();

  const accom = {
    name: process.env.ACCOMMODATION_NAME ?? "Casa El Hippo",
    address: process.env.ACCOMMODATION_ADDRESS ?? "",
    city: process.env.ACCOMMODATION_CITY ?? "",
    phone: process.env.ACCOMMODATION_PHONE ?? "",
    nif: process.env.ACCOMMODATION_NIF ?? "",
    owner: process.env.ACCOMMODATION_OWNER ?? "",
  };

  return (
    <SignatureStep
      token={token}
      guestId={guestId}
      bookingToken={token}
      guestName={
        guest.firstName && guest.surname1
          ? `${guest.surname1} ${guest.firstName}`
          : "Guest"
      }
      booking={booking as Booking & { guests: Guest[] }}
      guest={guest as Guest}
      accom={accom}
    />
  );
}
