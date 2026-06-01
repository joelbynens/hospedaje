import https from "https";
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

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

const loteId = process.argv[2];
if (!loteId) {
  console.error("Usage: node scripts/query-lote.mjs <lote-id>");
  process.exit(1);
}

const usuario  = process.env.SES_USUARIO.trim();
const password = process.env.SES_PASSWORD.trim();
const arrendador = process.env.SES_ARRENDADOR.trim();
const token    = Buffer.from(`${usuario}:${password}`).toString("base64");
const agent    = new https.Agent({ rejectUnauthorized: false });

// Inner XML per Annex II
const innerXml = `<?xml version="1.0" encoding="UTF-8"?>
<con:lotes xmlns:con="http://www.neg.hospedajes.mir.es/consultarComunicacion">
  <con:lote>${loteId}</con:lote>
</con:lotes>`;

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
          <tipoOperacion>C</tipoOperacion>
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
    console.log(`HTTP ${res.statusCode}`);
    console.log(d);
  });
});

req.on("error", (err) => console.error("Error:", err.message));
req.write(body);
req.end();
