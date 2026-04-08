import type { Booking, Guest } from "@prisma/client";

type BookingWithGuests = Booking & { guests: Guest[] };

function formatDateTime(date: Date, time: string): string {
  const d = new Date(date);
  const [h, m] = time.split(":");
  d.setHours(parseInt(h), parseInt(m), 0, 0);
  return d.toISOString().replace("Z", "+02:00").replace(/\.\d{3}/, "");
}

function formatDate(date: Date): string {
  return new Date(date).toISOString().split("T")[0] + "+02:00";
}

function mapDocType(docType: string | null): string {
  const map: Record<string, string> = {
    NIF: "NIF",
    NIE: "NIE",
    PAS: "PAS",
    OTRO: "OTRO",
  };
  return map[docType ?? ""] ?? "OTRO";
}

function buildPersonaXml(guest: Guest): string {
  const isForeign =
    guest.nationality !== "ESP" && guest.residenceCountry !== "ESP";
  const municipioXml = isForeign
    ? `<nombreMunicipio>${guest.city ?? ""}</nombreMunicipio>`
    : `<codigoMunicipio>00000</codigoMunicipio>`;

  return `
      <persona>
        <rol>VI</rol>
        <nombre>${guest.firstName ?? ""}</nombre>
        <apellido1>${guest.surname1 ?? ""}</apellido1>
        ${guest.surname2 ? `<apellido2>${guest.surname2}</apellido2>` : ""}
        <tipoDocumento>${mapDocType(guest.docType)}</tipoDocumento>
        <numeroDocumento>${guest.docNumber ?? ""}</numeroDocumento>
        <fechaNacimiento>${guest.birthDate ? formatDate(guest.birthDate) : ""}</fechaNacimiento>
        <nacionalidad>${guest.nationality ?? "BEL"}</nacionalidad>
        <sexo>${guest.sex ?? "H"}</sexo>
        <direccion>
          <direccion>${guest.address ?? ""}</direccion>
          ${municipioXml}
          <codigoPostal>${guest.postalCode ?? ""}</codigoPostal>
          <pais>${guest.residenceCountry ?? "BEL"}</pais>
        </direccion>
        ${guest.phone ? `<telefono>${guest.phone}</telefono>` : ""}
        ${guest.email ? `<correo>${guest.email}</correo>` : ""}
      </persona>`;
}

export function buildSoapPayload(booking: BookingWithGuests): string {
  const personasXml = booking.guests
    .filter((g) => g.status === "COMPLETE")
    .map(buildPersonaXml)
    .join("");

  const solicitudXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://hospedajes.mir.es/hospedajes/ws/comunicaciones/v1">
  <soapenv:Body>
    <ns2:peticion>
      <codigoArrendador>${process.env.SES_ARRENDADOR}</codigoArrendador>
      <solicitud>
        <codigoEstablecimiento>${process.env.SES_ESTABLECIMIENTO}</codigoEstablecimiento>
        <comunicacion>
          <contrato>
            <referencia>${booking.airbnbRef}</referencia>
            <fechaContrato>${formatDate(booking.createdAt)}</fechaContrato>
            <fechaEntrada>${formatDateTime(booking.checkinDate, booking.checkinTime)}</fechaEntrada>
            <fechaSalida>${formatDateTime(booking.checkoutDate, booking.checkoutTime)}</fechaSalida>
            <numPersonas>${booking.numGuests}</numPersonas>
            <numHabitaciones>1</numHabitaciones>
            <internet>false</internet>
            <pago>
              <tipoPago>${booking.paymentType}</tipoPago>
            </pago>
          </contrato>
          ${personasXml}
        </comunicacion>
      </solicitud>
    </ns2:peticion>
  </soapenv:Body>
</soapenv:Envelope>`;

  return solicitudXml;
}

export async function submitToSes(
  booking: BookingWithGuests
): Promise<{ success: boolean; response: string }> {
  const endpoint =
    "https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion";
  const usuario = process.env.SES_USUARIO!;
  const password = process.env.SES_PASSWORD!;
  const token = Buffer.from(`${usuario}:${password}`).toString("base64");
  const payload = buildSoapPayload(booking);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        Authorization: `Basic ${token}`,
        SOAPAction: "",
      },
      body: payload,
    });

    const responseText = await res.text();
    return {
      success: res.ok || res.status === 200,
      response: responseText,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, response: `Network error: ${message}` };
  }
}
