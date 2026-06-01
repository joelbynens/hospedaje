#!/usr/bin/env node
/**
 * Standalone SES.Hospedaje diagnostic script.
 *
 * Usage:
 *   node scripts/test-ses.mjs [rh|pv|both]   (default: both)
 *
 * Options (override via env):
 *   SES_ENDPOINT   — defaults to pre-prod (pre-ses.mir.es)
 *   SES_MOCK=true  — skips network, just prints the generated XML + envelope
 *
 * The script loads .env.local automatically (via dotenv), so no manual export needed.
 * Prints every stage: inner XML → base64 length → raw SOAP envelope → HTTP status → response body.
 */

import https from "https";
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

// ─── Load .env.local ─────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  let text;
  try { text = readFileSync(filePath, "utf-8"); } catch { return; }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

// ─── JSZip (CommonJS interop) ─────────────────────────────────────────────────

const require = createRequire(import.meta.url);
const JSZip = require("jszip");

// ─── Config ───────────────────────────────────────────────────────────────────

// Default to the pre-production endpoint unless overridden
const PRE_PROD_ENDPOINT =
  "https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion";
const PROD_ENDPOINT =
  "https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion";

const endpoint = process.env.SES_ENDPOINT ?? PRE_PROD_ENDPOINT;
const usuario  = process.env.SES_USUARIO ?? "";
const password = process.env.SES_PASSWORD ?? "";
const establecimiento = process.env.SES_ESTABLECIMIENTO ?? "";
const arrendador = process.env.SES_ARRENDADOR ?? "";
// .trim() guards against trailing newlines from `echo "true"` or Vercel CLI copy-paste
const mockMode = process.env.SES_MOCK?.trim() === "true";

const mode = process.argv[2] ?? "both"; // rh | pv | both

// ─── Diagnostic flags ─────────────────────────────────────────────────────────
// --text-xml     : use text/xml + SOAPAction header instead of application/soap+xml
//                  (MIR returns 404 for text/xml, useful to confirm routing)
// --soap11       : use SOAP 1.1 envelope namespace (schemas.xmlsoap.org) instead of SOAP 1.2
// --no-zip       : put raw XML in <solicitud> instead of ZIP+Base64
//                  Tests whether the ZIP encoding is rejected by the server
// --empty-body   : send an empty SOAP body — if still 500, it's pre-SOAP (auth/routing)
//                  If different response, then the body content matters
const forceTextXml  = process.argv.includes("--text-xml");
const noZip         = process.argv.includes("--no-zip");
const emptyBody     = process.argv.includes("--empty-body");

// ─── Fake booking for testing ─────────────────────────────────────────────────
// Dates are set 14 days in the future so the SES server doesn't reject them as
// historical. Using hardcoded past dates was a subtle test failure cause.

const now = new Date();
const checkinDate  = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);  // +14 days
const checkoutDate = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000);  // +16 days

// Generate unique booking reference to avoid duplicate batch errors
const uniqueRef = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const fakeBooking = {
  airbnbRef:    uniqueRef,
  createdAt:    now,
  checkinDate,
  checkoutDate,
  checkinTime:  "16:00",
  checkoutTime: "11:00",
  numGuests:    1,
  paymentType:  "PLATF",
  guests: [
    {
      firstName:       "Test",
      surname1:        "Viajero",
      surname2:        null,
      docType:         "PAS",
      docNumber:       "AB123456",
      soporteDocumento: null,
      birthDate:       new Date("1985-06-15"),
      nationality:     "BEL",
      residenceCountry:"BEL",
      sex:             "H",
      city:            "Brussels",
      postalCode:      "1000",
      address:         "Rue de la Loi 1",
      phone:           "+32498000000",
      email:           "test@example.com",
      parentesco:      null,
      status:          "COMPLETE",
    },
  ],
};

// ─── Helpers (mirrors lib/ses.ts exactly) ────────────────────────────────────

function esc(v) {
  return (v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

function formatDateTime(date, time) {
  const d = new Date(date);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${time}:00`;
}

function mapDocType(t) {
  return ({ NIF: "NIF", NIE: "NIE", PAS: "PAS", OTRO: "OTRO" })[t] ?? "OTRO";
}

async function zipAndEncode(xml) {
  if (noZip) {
    // --no-zip: send raw Base64(XML) without ZIP wrapper
    return Buffer.from(xml, "utf-8").toString("base64");
  }
  const zip = new JSZip();
  zip.file("solicitud.xml", xml);
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return buf.toString("base64");
}

function buildDireccionXml(guest) {
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

function buildPvPersonaXml(guest) {
  const needsSoporte = guest.docType === "NIF" || guest.docType === "NIE";
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

function buildPvInnerXml(booking) {
  const personas = booking.guests
    .filter(g => g.status === "COMPLETE")
    .map(buildPvPersonaXml)
    .join("\n");
  // Per spec section 3.1.1.1 (page 16) + Annex I (page 70): Use PREFIXED namespace (xmlns:alt=)
  // NOT default namespace (xmlns=), so children don't inherit the namespace.
  // XSD expects <solicitud> with NO namespace.
  return `<?xml version="1.0" encoding="UTF-8"?>
<alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaParteHospedaje">
  <solicitud>
    <codigoEstablecimiento>${esc(establecimiento)}</codigoEstablecimiento>
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

function buildRhPersonaXml(guest, rol) {
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

function buildRhInnerXml(booking) {
  const completeGuests = booking.guests.filter(g => g.status === "COMPLETE");
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
        <codigo>${esc(establecimiento)}</codigo>
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

// Per MIR spec (v3.1.3, Annex I), we use SOAP 1.1 namespace + application/soap+xml.
// The wrapper is <com:comunicacionRequest>, not <ns2:peticion>.
const forceSoap11ns = process.argv.includes("--soap11");  // For diagnostic override only

function buildSoapEnvelope(tipoComunicacion, solicitudBase64, soap12ns = false) {
  // Default is now SOAP 1.1 (soap12ns = false means use SOAP 1.1 namespace)
  const envNs = soap12ns
    ? "http://www.w3.org/2003/05/soap-envelope"
    : "http://schemas.xmlsoap.org/soap/envelope/";

  if (emptyBody) {
    // --empty-body: send a minimal valid SOAP envelope with empty body.
    // If the server STILL returns 500, the issue is pre-SOAP (auth interceptor, routing).
    // If the response changes, the body content is triggering the error.
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="${envNs}" xmlns:com="http://www.soap.servicios.hospedajes.mir.es/comunicacion">
  <soapenv:Body/>
</soapenv:Envelope>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="${envNs}" xmlns:com="http://www.soap.servicios.hospedajes.mir.es/comunicacion">
  <soapenv:Body>
    <com:comunicacionRequest>
      <peticion>
        <cabecera>
          <codigoArrendador>${esc(arrendador)}</codigoArrendador>
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

const sesHttpsAgent = new https.Agent({ rejectUnauthorized: false });

function callSes(envelope, label) {
  return new Promise((resolve) => {
    const token = Buffer.from(`${usuario}:${password}`).toString("base64");
    const url = new URL(endpoint);
    const body = Buffer.from(envelope, "utf-8");

    // MIR server requires text/xml (SOAP 1.1 quirk — ignores application/soap+xml)
    // Default is text/xml; use --text-xml flag to override to application/soap+xml for testing
    const contentType = forceTextXml
      ? "text/xml; charset=utf-8"
      : "text/xml; charset=utf-8";

    console.log(`\n${"─".repeat(70)}`);
    console.log(`📤  Sending ${label} to: ${endpoint}`);
    console.log(`    Content-Type: ${contentType}`);
    console.log(`    Content-Length: ${body.byteLength} bytes`);

    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": contentType,
          Authorization: `Basic ${token}`,
          "Content-Length": body.byteLength,
        },
        agent: sesHttpsAgent,
        timeout: 30_000,
      },
      (res) => {
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          const isOk = res.statusCode === 200 && !text.includes("<codigo>10");
          console.log(`📥  HTTP ${res.statusCode} — ${isOk ? "✅ SUCCESS" : "❌ FAILURE"}`);
          console.log(`\n--- Response headers ---`);
          for (const [k, v] of Object.entries(res.headers)) {
            console.log(`    ${k}: ${v}`);
          }
          console.log(`--- Response body ---`);
          console.log(text || "(empty)");
          console.log(`--- End response ---`);
          resolve({ success: isOk, response: text, status: res.statusCode });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      console.log("❌  Request timed out after 30s");
      resolve({ success: false, response: "timeout", status: 0 });
    });
    req.on("error", (err) => {
      console.log(`❌  Network error: ${err.message}`);
      resolve({ success: false, response: err.message, status: 0 });
    });
    req.write(body);
    req.end();
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║           SES.Hospedaje Diagnostic Script                           ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  const flags = [
    forceTextXml  && "--text-xml",
    forceSoap11ns && "--soap11",
    noZip         && "--no-zip",
    emptyBody     && "--empty-body",
  ].filter(Boolean).join(" ") || "(none)";

  console.log(`\nEndpoint     : ${endpoint}`);
  console.log(`Usuario      : ${usuario || "(not set)"}`);
  console.log(`Password     : ${password ? "***" : "(not set)"}`);
  console.log(`Establecimiento: ${establecimiento || "(not set)"}`);
  console.log(`Arrendador   : ${arrendador || "(not set)"}`);
  console.log(`Mode         : ${mode}   Flags: ${flags}   SES_MOCK=${mockMode}`);

  if (!usuario || !password) {
    console.error("\n⛔  SES_USUARIO and/or SES_PASSWORD not set. Aborting.");
    process.exit(1);
  }

  const runRh = mode === "rh" || mode === "both";
  const runPv = mode === "pv" || mode === "both";

  if (runRh) {
    const innerXml = buildRhInnerXml(fakeBooking);
    console.log("\n─── RH Inner XML ────────────────────────────────────────────────────────");
    console.log(innerXml);

    const base64 = await zipAndEncode(innerXml);
    console.log(`\n─── ZIP+Base64 length: ${base64.length} chars ───────────────────────────────`);

    const envelope = buildSoapEnvelope("RH", base64, forceSoap11ns);
    console.log("\n─── SOAP Envelope (RH) ──────────────────────────────────────────────────");
    // Print envelope with base64 truncated so it's readable
    console.log(envelope.replace(/<solicitud>[^<]{40}[^<]*<\/solicitud>/, `<solicitud>[BASE64 ${base64.length} chars]</solicitud>`));

    if (mockMode) {
      console.log("\n⚠️  SES_MOCK=true — skipping network call. Set SES_MOCK=false to actually send.");
    } else {
      const result = await callSes(envelope, "RH");
      if (!result.success && (mode === "both")) {
        console.log("\n⛔  RH failed — skipping PV.");
        return;
      }
    }
  }

  if (runPv) {
    const innerXml = buildPvInnerXml(fakeBooking);
    console.log("\n─── PV Inner XML ────────────────────────────────────────────────────────");
    console.log(innerXml);

    const base64 = await zipAndEncode(innerXml);
    console.log(`\n─── ZIP+Base64 length: ${base64.length} chars ───────────────────────────────`);

    const envelope = buildSoapEnvelope("PV", base64, forceSoap11ns);
    console.log("\n─── SOAP Envelope (PV) ──────────────────────────────────────────────────");
    console.log(envelope.replace(/<solicitud>[^<]{40}[^<]*<\/solicitud>/, `<solicitud>[BASE64 ${base64.length} chars]</solicitud>`));

    if (mockMode) {
      console.log("\n⚠️  SES_MOCK=true — skipping network call. Set SES_MOCK=false to actually send.");
    } else {
      await callSes(envelope, "PV");
    }
  }

  console.log("\n─── Done ────────────────────────────────────────────────────────────────\n");
  if (!mockMode) {
    const isPreprod = endpoint.includes("pre-ses");
    if (isPreprod) {
      console.log("ℹ️  Pre-prod endpoint is often unreliable (upstream app may be down → 502).");
    } else {
      console.log("ℹ️  Tip: if you see HTTP 500 on every authenticated POST, this is a server-side");
      console.log("    issue on the MIR infrastructure, not a problem with your request.");
      console.log("    HTTP 401 = wrong credentials. HTTP 404 = wrong Content-Type (text/xml doesn't route).");
      console.log("    HTTP 200 with <codigo>0 in body = genuine success.");
    }
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
