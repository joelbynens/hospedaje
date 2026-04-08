import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { GuestDataForm } from "@/components/GuestDataForm";

export default async function GuestDataPage({
  params,
}: {
  params: Promise<{ token: string; guestId: string }>;
}) {
  const { token, guestId } = await params;

  const booking = await prisma.booking.findUnique({ where: { token } });
  if (!booking) notFound();

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, bookingId: booking.id },
  });
  if (!guest) notFound();

  return (
    <GuestDataForm
      token={token}
      guest={JSON.parse(JSON.stringify(guest))}
      bookingRef={booking.airbnbRef}
    />
  );
}
