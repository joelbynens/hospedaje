/**
 * Resend only the PV (Parte de Viajeros) for a booking.
 * Usage: node scripts/resend-pv.mjs <bookingId>
 */
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import https from "https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const JSZip = require("jszip");

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

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const bookingId = process.argv[2];
if (!bookingId) {
  console.error("Usage: node scripts/resend-pv.mjs <bookingId>");
  process.exit(1);
}

const usuario      = process.env.SES_USUARIO.trim();
const password     = process.env.SES_PASSWORD.trim();
const establecimiento = process.env.SES_ESTABLECIMIENTO.trim();
const arrendador   = process.env.SES_ARRENDADOR.trim();
const token        = Buffer.from(`${usuario}:${password}`).toString("base64");
const agent        = new https.Agent({ rejectUnauthorized: false });

function esc(v) {
  return (v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
function formatDate(d) { return d ? new Date(d).toISOString().split("T")[0] : ""; }
function formatDateTime(d, t) {
  const dt = new Date(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,"0")}-${String(dt.getUTCDate()).padStart(2,"0")}T${t}:00`;
}

const booking = await prisma.booking.findUnique({
  where: { id: bookingId },
  include: { guests: { where: { status: "COMPLETE" } } },
});

if (!booking) { console.error("Booking not found"); process.exit(1); }

console.log(`Booking: ${booking.airbnbRef}`);
console.log(`Guests: ${booking.guests.map(g => `${g.firstName} ${g.surname1} (parentesco: ${g.parentesco ?? "null"})`).join(", ")}`);

const personas = booking.guests.map(g => `    <persona>
      <rol>VI</rol>
      <nombre>${esc(g.firstName)}</nombre>
      <apellido1>${esc(g.surname1)}</apellido1>
      ${g.surname2 ? `<apellido2>${esc(g.surname2)}</apellido2>` : ""}
      <tipoDocumento>${g.docType}</tipoDocumento>
      <numeroDocumento>${esc(g.docNumber)}</numeroDocumento>
      ${(g.docType === "NIF" || g.docType === "NIE") && g.soporteDocumento ? `<soporteDocumento>${esc(g.soporteDocumento)}</soporteDocumento>` : ""}
      <fechaNacimiento>${formatDate(g.birthDate)}</fechaNacimiento>
      ${g.nationality ? `<nacionalidad>${esc(g.nationality)}</nacionalidad>` : ""}
      ${g.sex ? `<sexo>${esc(g.sex)}</sexo>` : ""}
      <direccion>
        <direccion>${esc(g.address)}</direccion>
        ${g.nationality !== "ESP" && g.residenceCountry !== "ESP" ? `<nombreMunicipio>${esc(g.city)}</nombreMunicipio>` : `<codigoMunicipio>00000</codigoMunicipio>`}
        <codigoPostal>${esc(g.postalCode)}</codigoPostal>
        <pais>${esc(g.residenceCountry ?? "ESP")}</pais>
      </direccion>
      ${g.phone ? `<telefono>${esc(g.phone)}</telefono>` : ""}
      ${g.email ? `<correo>${esc(g.email)}</correo>` : ""}
      ${g.parentesco ? `<parentesco>${esc(g.parentesco)}</parentesco>` : ""}
    </persona>`).join("\n");

const innerXml = `<?xml version="1.0" encoding="UTF-8"?>
<alt:peticion xmlns:alt="http://www.neg.hospedajes.mir.es/altaParteHospedaje">
  <solicitud>
    <codigoEstablecimiento>${establecimiento}</codigoEstablecimiento>
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

console.log("\n--- Inner XML ---");
console.log(innerXml);

const zip = new JSZip();
zip.file("solicitud.xml", innerXml);
const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
const base64 = buf.toString("base64");

const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="http://www.soap.servicios.hospedajes.mir.es/comunicacion">
  <soapenv:Body>
    <com:comunicacionRequest>
      <peticion>
        <cabecera>
          <codigoArrendador>${arrendador}</codigoArrendador>
          <aplicacion>CasaElHippo</aplicacion>
          <tipoOperacion>A</tipoOperacion>
          <tipoComunicacion>PV</tipoComunicacion>
        </cabecera>
        <solicitud>${base64}</solicitud>
      </peticion>
    </com:comunicacionRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

const body = Buffer.from(envelope, "utf-8");

const req = https.request({
  hostname: "hospedajes.ses.mir.es",
  path: "/hospedajes-web/ws/v1/comunicacion",
  method: "POST",
  headers: {
    "Content-Type": "text/xml; charset=utf-8",
    "Authorization": `Basic ${token}`,
    "Content-Length": body.byteLength,
  },
  agent,
}, (res) => {
  let d = "";
  res.on("data", c => d += c);
  res.on("end", () => {
    console.log(`\nHTTP ${res.statusCode}`);
    console.log(d);
    prisma.$disconnect();
  });
});

req.on("error", (err) => console.error("Error:", err.message));
req.write(body);
req.end();
