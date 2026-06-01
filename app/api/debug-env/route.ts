import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SES_USUARIO: process.env.SES_USUARIO || "(not set)",
    SES_PASSWORD: process.env.SES_PASSWORD ? "***" : "(not set)",
    SES_ESTABLECIMIENTO: process.env.SES_ESTABLECIMIENTO || "(not set)",
    SES_ARRENDADOR: process.env.SES_ARRENDADOR || "(not set)",
    SES_ENDPOINT: process.env.SES_ENDPOINT || "(not set)",
    SES_MOCK: process.env.SES_MOCK || "(not set)",
    NODE_ENV: process.env.NODE_ENV,
  });
}
