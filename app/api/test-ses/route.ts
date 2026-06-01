import { NextResponse } from "next/server";
import { submitToSes } from "@/lib/ses";
import type { Booking, Guest } from "@prisma/client";

/**
 * Test SES.Hospedaje integration with generated test data.
 *
 * POST /api/test-ses
 *
 * Returns:
 * {
 *   status: "success" | "error",
 *   rhSuccess: boolean,
 *   rhResponse: string,
 *   pvSuccess: boolean,
 *   pvResponse: string,
 *   rhLote?: string,
 *   pvLote?: string,
 *   error?: string
 * }
 */
export async function POST() {
  try {
    // Generate unique booking reference
    const uniqueRef = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Create test booking with current date for checkin 14-16 days from now
    const now = new Date();
    const checkinDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const checkoutDate = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000);

    // Test guest data - all required fields per SES spec
    const testGuest: Guest = {
      id: "test-guest-001",
      bookingId: "test-booking-001",
      firstName: "Test",
      surname1: "Viajero",
      surname2: null,
      docType: "PAS",
      docNumber: "AB123456",
      soporteDocumento: null,
      birthDate: new Date("1985-06-15"),
      nationality: "BEL",
      residenceCountry: "BEL",
      sex: "H",
      city: "Brussels",
      postalCode: "1000",
      address: "Rue de la Loi 1",
      phone: "+32498000000",
      email: "test@example.com",
      parentesco: null,
      status: "COMPLETE",
      sesStatus: null,
      sesResponse: null,
      createdAt: now,
      updatedAt: now,
    };

    // Test booking data
    const testBooking: Booking & { guests: Guest[] } = {
      id: "test-booking-001",
      airbnbRef: uniqueRef,
      createdAt: now,
      checkinDate,
      checkoutDate,
      checkinTime: "16:00",
      checkoutTime: "11:00",
      numGuests: 1,
      paymentType: "PLATF",
      notes: null,
      sesRhSubmittedAt: null,
      sesRhStatus: null,
      sesRhResponse: null,
      sesSubmittedAt: null,
      sesResponse: null,
      updatedAt: now,
      guests: [testGuest],
    };

    console.log(`[SES Test] Submitting test booking: ${uniqueRef}`);

    // Submit to SES
    const result = await submitToSes(testBooking);

    // Extract lote numbers and status codes from responses
    const extractLote = (xml: string): { lote?: string; code?: string } => {
      try {
        const loteMatch = xml.match(/<lote>([^<]+)<\/lote>/);
        const codeMatch = xml.match(/<codigo>(\d+)<\/codigo>/);
        return {
          lote: loteMatch?.[1],
          code: codeMatch?.[1],
        };
      } catch (e) {
        return {};
      }
    };

    const rhData = extractLote(result.rhResponse);
    const pvData = extractLote(result.pvResponse);
    const rhLote = rhData.lote;
    const pvLote = pvData.lote;

    const success = result.rhSuccess && result.pvSuccess;

    console.log(`[SES Test] Result: ${success ? "SUCCESS" : "FAILURE"}`);
    console.log(`[SES Test] RH: ${result.rhSuccess ? "✅" : "❌"} ${rhLote ? `(${rhLote})` : ""}`);
    console.log(`[SES Test] PV: ${result.pvSuccess ? "✅" : "❌"} ${pvLote ? `(${pvLote})` : ""}`);

    return NextResponse.json(
      {
        status: success ? "success" : "error",
        bookingRef: uniqueRef,
        rh: {
          success: result.rhSuccess,
          lote: rhLote,
          code: rhData.code,
          response: result.rhResponse,
        },
        pv: {
          success: result.pvSuccess,
          lote: pvLote,
          code: pvData.code,
          response: result.pvResponse,
        },
        message: success
          ? "✅ Both RH and PV submitted successfully!"
          : "❌ One or both submissions failed. Check responses for details.",
      },
      { status: success ? 200 : 502 }
    );
  } catch (error) {
    console.error("[SES Test] Error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
