import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SignatureStep } from "@/components/SignatureStep";

export default async function SignPage({
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
    <SignatureStep
      token={token}
      guestId={guestId}
      bookingToken={token}
      guestName={
        guest.firstName && guest.surname1
          ? `${guest.surname1} ${guest.firstName}`
          : "Guest"
      }
    />
  );
}
