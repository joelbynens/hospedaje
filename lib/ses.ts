import https from "https";
import fs from "fs";
import path from "path";
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
  // Build the date string manually to avoid any timezone conversion.
  // toISOString() outputs UTC; setHours() uses local time — combining them
  // corrupts the value when the server is not at UTC. Spec requires
  // AAAA-MM-DDThh:mm:ss with no timezone suffix.
  const d = new Date(date);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${time}:00`;
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
    </persona>`;
}

function buildPvInnerXml(booking: BookingWithGuests): string {
  const personas = booking.guests
    .filter((g) => g.status === "COMPLETE")
    .map(buildPvPersonaXml)
    .join("\n");

  // Per spec section 3.1.1.1 (page 16) + Annex I (page 70): Use PREFIXED namespace (xmlns:alt=)
  // NOT default namespace (xmlns=), so children don't inherit the namespace.
  // XSD expects <solicitud> with NO namespace.
  return `<?xml version="1.0" encoding="UTF-8"?>
<alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaParteHospedaje">
  <solicitud>
    <codigoEstablecimiento>${esc((process.env.SES_ESTABLECIMIENTO ?? "").trim())}</codigoEstablecimiento>
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
  </solicitud>
</alt:peticion>`;
}

// ─── RH — Reserva de Hospedaje inner XML ────────────────────────────────────

function buildRhPersonaXml(guest: Guest, rol: "TI" | "VI"): string {
  const needsSoporte = guest.docType === "NIF" || guest.docType === "NIE";
  return `    <persona>
      <rol>${rol}</rol>
      <nombre>${esc(guest.firstName)}</nombre>
      <apellido1>${esc(guest.surname1)}</apellido1>
      ${guest.surname2 ? `<apellido2>${esc(guest.surname2)}</apellido2>` : ""}
      ${guest.docType ? `<tipoDocumento>${mapDocType(guest.docType)}</tipoDocumento>` : ""}
      ${guest.docNumber ? `<numeroDocumento>${esc(guest.docNumber)}</numeroDocumento>` : ""}
      ${needsSoporte && guest.soporteDocumento ? `<soporteDocumento>${esc(guest.soporteDocumento)}</soporteDocumento>` : ""}
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

  // Per spec section 3.1.1.2 (page 20) + Annex I (page 70): Use PREFIXED namespace (xmlns:alt=)
  // NOT default namespace (xmlns=), so children don't inherit the namespace.
  // XSD expects <solicitud> with NO namespace.
  return `<?xml version="1.0" encoding="UTF-8"?>
<alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaReservaHospedaje">
  <solicitud>
    <comunicacion>
      <establecimiento>
        <codigo>${esc((process.env.SES_ESTABLECIMIENTO ?? "").trim())}</codigo>
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
  </solicitud>
</alt:peticion>`;
}

// ─── SOAP envelope ───────────────────────────────────────────────────────────
//
// From the official MIR spec (v3.1.3, Annex I):
// - Use SOAP 1.1 namespace: http://schemas.xmlsoap.org/soap/envelope/
// - The wrapper element inside <soapenv:Body> must be <com:comunicacionRequest>
//   (NOT <ns2:peticion> — that's an error we had before)
// - Inside <com:comunicacionRequest> goes <peticion> with <cabecera> and <solicitud>
// - Content-Type: application/soap+xml (SOAP 1.1 with this media type works on MIR servers)

function buildSoapEnvelope(
  tipoComunicacion: "PV" | "RH",
  solicitudBase64: string
): string {
  const codigoArrendador = (process.env.SES_ARRENDADOR ?? "").trim();
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="http://www.soap.servicios.hospedajes.mir.es/comunicacion">
  <soapenv:Body>
    <com:comunicacionRequest>
      <peticion>
        <cabecera>
          <codigoArrendador>${esc(codigoArrendador)}</codigoArrendador>
          <aplicacion>CasaElHippo</aplicacion>
          <tipoOperacion>A</tipoOperacion>
          <tipoComunicacion>${tipoComunicacion}</tipoComunicacion>
        </cabecera>
        <solicitud>${solicitudBase64}</solicitud>
      </peticion>
    </com:comunicacionRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// ─── HTTPS agent with FNMT certificate support ──────────────────────────────
//
// The Spanish Ministry of Interior SES servers use certificates issued by FNMT
// (Fábrica Nacional de Moneda y Timbre — the Spanish government CA), which is
// NOT in the standard Node.js CA bundle. Two options:
//
// Option A — Preferred: add the FNMT root cert to the agent's CA bundle.
//   1. Download from: https://www.sede.fnmt.gob.es/descargas/certificados-raiz-de-la-fnmt-rcm
//      File: AC_Raiz_FNMT-RCM_SHA256.cer  (DER format → convert to PEM first)
//      Convert: openssl x509 -inform DER -in AC_Raiz_FNMT-RCM_SHA256.cer -out certs/fnmt.pem
//   2. Place the PEM file at <project-root>/certs/fnmt.pem
//   3. Set FNMT_CERT_PATH=./certs/fnmt.pem in .env.local (optional override)
//
// Option B — Fallback: disable certificate validation (current behaviour if no cert file found).
//   This is scoped to this agent only and does NOT affect any other HTTPS calls.

function buildSesAgent(): https.Agent {
  const certPath =
    process.env.FNMT_CERT_PATH ??
    path.join(process.cwd(), "certs", "fnmt.pem");

  if (fs.existsSync(certPath)) {
    const ca = fs.readFileSync(certPath);
    return new https.Agent({ ca });
  }

  // Fall back to skipping validation (logs a warning so it's visible in Vercel logs)
  console.warn(
    "[SES] FNMT certificate not found at", certPath,
    "— falling back to rejectUnauthorized:false. " +
    "Add certs/fnmt.pem to enable proper TLS validation."
  );
  return new https.Agent({ rejectUnauthorized: false });
}

const sesHttpsAgent = buildSesAgent();

async function callSes(
  envelope: string
): Promise<{ success: boolean; response: string }> {
  // .trim() guards against trailing newlines from Vercel env var copy-paste
  const endpoint =
    (process.env.SES_ENDPOINT?.trim() ??
    "https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion").trim();
  const usuario = (process.env.SES_USUARIO ?? "").trim();
  const password = (process.env.SES_PASSWORD ?? "").trim();
  const token = Buffer.from(`${usuario}:${password}`).toString("base64");
  const url = new URL(endpoint);
  const body = Buffer.from(envelope, "utf-8");

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          Authorization: `Basic ${token}`,
          "Content-Length": body.byteLength,
        },
        agent: sesHttpsAgent,
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          const isOk = res.statusCode === 200 && !text.includes("<codigo>10");
          resolve({ success: isOk, response: text });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ success: false, response: "Network error: request timed out after 30s" });
    });
    req.on("error", (err) => {
      resolve({ success: false, response: `Network error: ${err.message}` });
    });
    req.write(body);
    req.end();
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function submitRh(
  booking: BookingWithGuests
): Promise<{ success: boolean; response: string }> {
  const innerXml = buildRhInnerXml(booking);
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
  // .trim() guards against invisible trailing newlines that sneak in via
  // `echo "true"` or Vercel CLI env-var copy-paste (the confirmed production bug).
  const isMock = process.env.SES_MOCK?.trim() === "true";

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
