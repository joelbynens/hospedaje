import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitToSes } from "@/lib/ses";

async function sendEmail(subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Hospedajes <onboarding@resend.dev>",
      to: ["joel.bynens@gmail.com"],
      subject,
      html,
    }),
  });
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Retry bookings with failed/pending SES status that have complete guests
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      sesRhStatus: { in: ["ERROR", "PENDING"] },
      createdAt: { gte: sevenDaysAgo },
      guests: { some: { status: "COMPLETE" } },
    },
    include: {
      guests: { where: { status: "COMPLETE" } },
    },
  });

  if (bookings.length === 0) {
    return NextResponse.json({ message: "Niets te herindienen." });
  }

  const results = [];

  for (const booking of bookings) {
    const { rhSuccess, rhResponse, pvSuccess, pvResponse } =
      await submitToSes({ ...booking, guests: booking.guests });

    const now = new Date();

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        sesRhSubmittedAt: now,
        sesRhResponse: rhResponse,
        sesRhStatus: rhSuccess ? "SENT" : "ERROR",
        ...(pvResponse && { sesResponse: pvResponse }),
        ...(pvSuccess && { sesSubmittedAt: now }),
      },
    });

    await prisma.guest.updateMany({
      where: { bookingId: booking.id, status: "COMPLETE" },
      data: {
        sesStatus: pvSuccess ? "SENT" : "ERROR",
        sesResponse: pvResponse,
      },
    });

    const success = rhSuccess && pvSuccess;
    results.push({ bookingId: booking.id, airbnbRef: booking.airbnbRef, success });

    if (success) {
      await sendEmail(
        `✓ SES ingediend — ${booking.airbnbRef}`,
        `<p>Boeking <strong>${booking.airbnbRef}</strong> is succesvol ingediend bij SES.Hospedaje.</p>
         <p>RH en PV zijn beide geaccepteerd door de MIR-server.</p>
         <p><a href="https://hospedaje-six.vercel.app/admin/bookings/${booking.id}">Bekijk boeking →</a></p>`
      );
    }
  }

  return NextResponse.json({ results });
}
