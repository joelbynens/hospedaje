import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ guestId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guestId } = await params;
  const body = await req.json();

  const guest = await prisma.guest.update({
    where: { id: guestId },
    data: {
      firstName:       body.firstName       ?? undefined,
      surname1:        body.surname1        ?? undefined,
      surname2:        body.surname2        || null,
      parentesco:      body.parentesco      || null,
      docType:         body.docType         ?? undefined,
      docNumber:       body.docNumber       ?? undefined,
      sex:             body.sex             ?? undefined,
      birthDate:       body.birthDate ? new Date(body.birthDate) : undefined,
      nationality:     body.nationality     ?? undefined,
      residenceCountry:body.residenceCountry ?? undefined,
      phone:           body.phone           || null,
      email:           body.email           || null,
      address:         body.address         ?? undefined,
      city:            body.city            ?? undefined,
      postalCode:      body.postalCode      ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, guest });
}
