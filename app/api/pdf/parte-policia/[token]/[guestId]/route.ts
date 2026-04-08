import { prisma } from "@/lib/prisma";
import { PartePoliciaPDF } from "@/components/pdf/PartePoliciaPDF";
import React from "react";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; guestId: string }> }
) {
  const { token, guestId } = await params;

  const booking = await prisma.booking.findUnique({ where: { token } });
  if (!booking) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, bookingId: booking.id },
  });
  if (!guest) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  const pdfRenderer = await import("@react-pdf/renderer");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(PartePoliciaPDF as any, { booking, guest }) as any;
  const buffer: Buffer = await pdfRenderer.renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="parte-policia-${guest.surname1 ?? "guest"}.pdf"`,
    },
  });
}
