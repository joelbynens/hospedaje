import https from "https";
import JSZip from "jszip";
import type { Booking, Guest } from "@prisma/client";

type BookingWithGuests = Booking & { guests: Guest[] };

export type SesResult = {
  rhSuccess: boolean;
  rhResponse: string;
  pvSuccess: boolean;
  pvResponse: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

function formatDateTime(date: Date, time: string): string {
  const d = new Date(date);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  // Format as AAAA-MM-DDThh:mm:ss (no timezone suffix per spec example)
  return d.toISOString().replace(/\.\d{3}Z$/, "");
}

function mapDocType(docType: string | null): string {
  const map: Record<string, string> = { NIF: "NIF", NIE: "NIE", PAS: "PAS", OTRO: "OTRO" };
  return map[docType ?? ""] ?? "OTRO";
}

async function zipAndEncode(xml: string): Promise<string> {
  // SES spec requires the inner XML to be in a PKZIP archive, Base64-encoded
  const zip = new JSZip();
  zip.file("solicitud.xml", xml);
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return buf.toString("base64");
}

// ─── Common address block ────────────────────────────────────────────────────

function buildDireccionXml(guest: Guest): string {
  const isForeign = guest.nationality !== "ESP" && guest.residenceCountry !== "ESP";
  const municipio = isForeign
    ? `<nombreMunicipio>${esc(guest.city)}</nombreMunicipio>`
    : `<codigoMunicipio>00000</codigoMunicipio>`;
  return `<direccion>
        <direccion>${esc(guest.address)}</direccion>
        ${municipio}
        <codigoPostal>${esc(guest.postalCode)}</codigoPostal>
        <pais>${esc(guest.residenceCountry ?? "BEL")}</pais>
      </direccion>`;
}

// ─── PV — Parte de Viajeros inner XML ───────────────────────────────────────

function buildPvPersonaXml(guest: Guest): string {
  const needsSoporte =
    guest.docType === "NIF" || guest.docType === "NIE";

  return `    <persona>
      <rol>VI</rol>
      <nombre>${esc(guest.firstName)}</nombre>
      <apellido1>${esc(guest.surname1)}</apellido1>
      ${guest.surname2 ? `<apellido2>${esc(guest.surname2)}</apellido2>` : ""}
      <tipoDocumento>${mapDocType(guest.docType)}</tipoDocumento>
      <numeroDocumento>${esc(guest.docNumber)}</numeroDocumento>
      ${needsSoporte && guest.soporteDocumento ? `<soporteDocumento>${esc(guest.soporteDocumento)}</soporteDocumento>` : ""}
      <fechaNacimiento>${formatDate(guest.birthDate)}</fechaNacimiento>
      ${guest.nationality ? `<nacionalidad>${esc(guest.nationality)}</nacionalidad>` : ""}
      ${guest.sex ? `<sexo>${esc(guest.sex)}</sexo>` : ""}
      ${buildDireccionXml(guest)}
      ${guest.phone ? `<telefono>${esc(guest.phone)}</telefono>` : ""}
      ${guest.email ? `<correo>${esc(guest.email)}</correo>` : ""}
      ${guest.parentesco ? `<parentesco>${esc(guest.parentesco)}</parentesco>` : ""}
    </persona>`;
}

function buildPvInnerXml(booking: BookingWithGuests): string {
  const personas = booking.guests
    .filter((g) => g.status === "COMPLETE")
    .map(buildPvPersonaXml)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<solicitud>
  <codigoEstablecimiento>${esc(process.env.SES_ESTABLECIMIENTO)}</codigoEstablecimiento>
  <comunicacion>
    <contrato>
      <referencia>${esc(booking.airbnbRef)}</referencia>
      <fechaContrato>${formatDate(booking.createdAt)}</fechaContrato>
      <fechaEntrada>${formatDateTime(booking.checkinDate, booking.checkinTime)}</fechaEntrada>
      <fechaSalida>${formatDateTime(booking.checkoutDate, booking.checkoutTime)}</fechaSalida>
      <numPersonas>${booking.numGuests}</numPersonas>
      <numHabitaciones>1</numHabitaciones>
      <internet>false</internet>
      <pago>
        <tipoPago>${esc(booking.paymentType)}</tipoPago>
      </pago>
    </contrato>
${personas}
  </comunicacion>
</solicitud>`;
}

// ─── RH — Reserva de Hospedaje inner XML ────────────────────────────────────

function buildRhPersonaXml(guest: Guest, rol: "TI" | "VI"): string {
  return `    <persona>
      <rol>${rol}</rol>
      <nombre>${esc(guest.firstName)}</nombre>
      <apellido1>${esc(guest.surname1)}</apellido1>
      ${guest.surname2 ? `<apellido2>${esc(guest.surname2)}</apellido2>` : ""}
      ${guest.docType ? `<tipoDocumento>${mapDocType(guest.docType)}</tipoDocumento>` : ""}
      ${guest.docNumber ? `<numeroDocumento>${esc(guest.docNumber)}</numeroDocumento>` : ""}
      ${guest.birthDate ? `<fechaNacimiento>${formatDate(guest.birthDate)}</fechaNacimiento>` : ""}
      ${guest.nationality ? `<nacionalidad>${esc(guest.nationality)}</nacionalidad>` : ""}
      ${guest.sex ? `<sexo>${esc(guest.sex)}</sexo>` : ""}
      ${guest.address ? buildDireccionXml(guest) : ""}
      ${guest.phone ? `<telefono>${esc(guest.phone)}</telefono>` : ""}
      ${guest.email ? `<correo>${esc(guest.email)}</correo>` : ""}
    </persona>`;
}

function buildRhInnerXml(booking: BookingWithGuests): string {
  const completeGuests = booking.guests.filter((g) => g.status === "COMPLETE");
  // First guest is the contract holder (TI), rest are guests (VI)
  const personas = completeGuests
    .map((g, i) => buildRhPersonaXml(g, i === 0 ? "TI" : "VI"))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<solicitud>
  <comunicacion>
    <establecimiento>
      <codigo>${esc(process.env.SES_ESTABLECIMIENTO)}</codigo>
    </establecimiento>
    <contrato>
      <referencia>${esc(booking.airbnbRef)}</referencia>
      <fechaContrato>${formatDate(booking.createdAt)}</fechaContrato>
      <fechaEntrada>${formatDateTime(booking.checkinDate, booking.checkinTime)}</fechaEntrada>
      <fechaSalida>${formatDateTime(booking.checkoutDate, booking.checkoutTime)}</fechaSalida>
      <numPersonas>${booking.numGuests}</numPersonas>
      <numHabitaciones>1</numHabitaciones>
      <internet>false</internet>
      <pago>
        <tipoPago>${esc(booking.paymentType)}</tipoPago>
      </pago>
    </contrato>
${personas}
  </comunicacion>
</solicitud>`;
}

// ─── SOAP envelope ───────────────────────────────────────────────────────────

function buildSoapEnvelope(
  tipoComunicacion: "PV" | "RH",
  solicitudBase64: string
): string {
  const arrendador = process.env.SES_ARRENDADOR ?? "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="http://hospedajes.mir.es/hospedajes/ws/comunicaciones/v1">
  <soapenv:Body>
    <ns2:peticion>
      <cabecera>
        <arrendador>${esc(arrendador)}</arrendador>
        <aplicacion>CasaElHippo</aplicacion>
        <tipoOperacion>A</tipoOperacion>
        <tipoComunicacion>${tipoComunicacion}</tipoComunicacion>
      </cabecera>
      <solicitud>${solicitudBase64}</solicitud>
    </ns2:peticion>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// ─── HTTP call ───────────────────────────────────────────────────────────────

// The Spanish Ministry of Interior SES servers (both pre-prod and prod) use
// certificates issued by FNMT (Spanish government CA) which is not in the
// standard Node.js CA bundle. We scope rejectUnauthorized:false only to this
// agent so it does not affect any other HTTPS calls in the application.
const sesHttpsAgent = new https.Agent({ rejectUnauthorized: false });

async function callSes(
  envelope: string
): Promise<{ success: boolean; response: string }> {
  const endpoint =
    process.env.SES_ENDPOINT ??
    "https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion";
  const usuario = process.env.SES_USUARIO ?? "";
  const password = process.env.SES_PASSWORD ?? "";
  const token = Buffer.from(`${usuario}:${password}`).toString("base64");

  // #region agent log
  fetch('http://127.0.0.1:7568/ingest/d46db812-6367-4853-8d06-242fe9bdaf04',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6c62ba'},body:JSON.stringify({sessionId:'6c62ba',location:'ses.ts:callSes-start',message:'SES request about to be sent',data:{endpoint,usuario,compressMode:process.env.SES_COMPRESS??"zip",nsPrefix:process.env.SES_NS_PREFIX??"false",envelopeLength:envelope.length,envelopeHead:envelope.slice(0,600),envelopeTail:envelope.slice(-200)},timestamp:Date.now(),hypothesisId:'H-I,H-J'})}).catch(()=>{});
  // #endregion

  return new Promise((resolve) => {
    const url = new URL(endpoint);
    const bodyBuffer = Buffer.from(envelope, "utf-8");

    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          Authorization: `Basic ${token}`,
          SOAPAction: "",
          "Content-Length": bodyBuffer.byteLength,
        },
        agent: sesHttpsAgent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const responseText = Buffer.concat(chunks).toString("utf-8");
          // A response code of 0 in the body means OK (async submission accepted)
          const isOk =
            res.statusCode === 200 && !responseText.includes("<codigo>10");

          // #region agent log
          fetch('http://127.0.0.1:7568/ingest/d46db812-6367-4853-8d06-242fe9bdaf04',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6c62ba'},body:JSON.stringify({sessionId:'6c62ba',location:'ses.ts:callSes-response',message:'SES raw response received',data:{httpStatus:res.statusCode,isOk,responsePreview:responseText.slice(0,800)},timestamp:Date.now(),hypothesisId:'H-A,H-B,H-C,H-D'})}).catch(()=>{});
          // #endregion

          resolve({ success: isOk, response: responseText });
        });
      }
    );

    req.on("error", (err) => {
      // #region agent log
      fetch('http://127.0.0.1:7568/ingest/d46db812-6367-4853-8d06-242fe9bdaf04',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6c62ba'},body:JSON.stringify({sessionId:'6c62ba',location:'ses.ts:callSes-error',message:'https.request error event',data:{error:err.message,code:(err as NodeJS.ErrnoException).code},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
      // #endregion
      resolve({ success: false, response: `Network error: ${err.message}` });
    });

    req.write(bodyBuffer);
    req.end();
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function submitRh(
  booking: BookingWithGuests
): Promise<{ success: boolean; response: string }> {
  const innerXml = buildRhInnerXml(booking);

  // #region agent log
  fetch('http://127.0.0.1:7568/ingest/d46db812-6367-4853-8d06-242fe9bdaf04',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6c62ba'},body:JSON.stringify({sessionId:'6c62ba',location:'ses.ts:submitRh-innerXml',message:'RH inner XML before ZIP encoding',data:{innerXml},timestamp:Date.now(),hypothesisId:'H-F,H-G'})}).catch(()=>{});
  // #endregion

  const base64 = await zipAndEncode(innerXml);
  const envelope = buildSoapEnvelope("RH", base64);
  return callSes(envelope);
}

export async function submitPv(
  booking: BookingWithGuests
): Promise<{ success: boolean; response: string }> {
  const innerXml = buildPvInnerXml(booking);
  const base64 = await zipAndEncode(innerXml);
  const envelope = buildSoapEnvelope("PV", base64);
  return callSes(envelope);
}

export async function submitToSes(booking: BookingWithGuests): Promise<SesResult> {
  const isMock = process.env.SES_MOCK === "true";

  if (isMock) {
    const ts = new Date().toISOString();
    return {
      rhSuccess: true,
      rhResponse: `[MOCK] RH submission simulated at ${ts}. No real data sent.`,
      pvSuccess: true,
      pvResponse: `[MOCK] PV submission simulated at ${ts}. No real data sent.`,
    };
  }

  const rhResult = await submitRh(booking);
  if (!rhResult.success) {
    return {
      rhSuccess: false,
      rhResponse: rhResult.response,
      pvSuccess: false,
      pvResponse: "Skipped — RH failed.",
    };
  }

  const pvResult = await submitPv(booking);
  return {
    rhSuccess: true,
    rhResponse: rhResult.response,
    pvSuccess: pvResult.success,
    pvResponse: pvResult.response,
  };
}
