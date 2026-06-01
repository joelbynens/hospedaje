import https from "https";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

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

const usuario  = process.env.SES_USUARIO.trim();
const password = process.env.SES_PASSWORD.trim();
const token    = Buffer.from(`${usuario}:${password}`).toString("base64");

const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="http://www.soap.servicios.hospedajes.mir.es/comunicacion">
  <soapenv:Body>
    <com:catalogoRequest>
      <peticion>
        <catalogo>TIPO_PARENTESCO</catalogo>
      </peticion>
    </com:catalogoRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

const body = Buffer.from(envelope, "utf-8");
const agent = new https.Agent({ rejectUnauthorized: false });

const req = https.request({
  hostname: "hospedajes.ses.mir.es",
  path: "/hospedajes-web/ws/v1/catalogo",
  method: "POST",
  headers: {
    "Content-Type": "text/xml; charset=utf-8",
    "Authorization": `Basic ${token}`,
    "Content-Length": body.byteLength,
  },
  agent,
}, (res) => {
  let data = "";
  res.on("data", c => data += c);
  res.on("end", () => {
    console.log(`HTTP ${res.statusCode}`);
    console.log(data);
  });
});

req.on("error", (err) => console.error("Error:", err.message));
req.write(body);
req.end();
