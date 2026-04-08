import { prisma } from "@/lib/prisma";
import { AdmissionSheetPDF } from "@/components/pdf/AdmissionSheetPDF";
import React from "react";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const booking = await prisma.booking.findUnique({
    where: { token },
    include: { guests: { orderBy: { sortOrder: "asc" } } },
  });

  if (!booking) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  const pdfRenderer = await import("@react-pdf/renderer");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(AdmissionSheetPDF as any, { booking }) as any;
  const buffer: Buffer = await pdfRenderer.renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="admission-sheet-${booking.airbnbRef}.pdf"`,
    },
  });
}
