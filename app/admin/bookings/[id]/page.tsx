import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ResendSesButton } from "@/components/ResendSesButton";
import { DeleteBookingButton } from "@/components/DeleteBookingButton";

function guestStatusIcon(status: string) {
  return status === "COMPLETE" ? "✓" : "○";
}

function sesStatusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-600",
    SENT: "bg-green-100 text-green-700",
    ERROR: "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await checkAdminAuth();
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { guests: { orderBy: { sortOrder: "asc" } } },
  });

  if (!booking) notFound();

  const baseUrl =
    process.env.NEXTAUTH_URL ?? `https://${process.env.VERCEL_URL}`;
  const checkinUrl = `${baseUrl}/checkin/${booking.token}`;
  const allComplete = booking.guests.every((g) => g.status === "COMPLETE");

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-800">
              {booking.airbnbRef}
            </h1>
            {process.env.SES_MOCK === "true" && (
              <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
                MOCK MODE
              </span>
            )}
          </div>
          <DeleteBookingButton bookingId={booking.id} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Booking info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Booking details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Check-in</span>
              <p className="font-medium">
                {new Date(booking.checkinDate).toLocaleDateString("en-GB")}{" "}
                {booking.checkinTime}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Check-out</span>
              <p className="font-medium">
                {new Date(booking.checkoutDate).toLocaleDateString("en-GB")}{" "}
                {booking.checkoutTime}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Guests</span>
              <p className="font-medium">{booking.numGuests}</p>
            </div>
            <div>
              <span className="text-gray-500">Payment</span>
              <p className="font-medium">{booking.paymentType}</p>
            </div>
          </div>
        </div>

        {/* Check-in link */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-3">
            Guest check-in link
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Send this link to your guests. One link registers all guests.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={checkinUrl}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600"
            />
            <CopyLinkButton url={checkinUrl} />
          </div>
        </div>

        {/* Guests */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">
              Guests ({booking.guests.filter((g) => g.status === "COMPLETE").length}/
              {booking.guests.length} registered)
            </h2>
            {allComplete && (
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                All complete
              </span>
            )}
          </div>

          {booking.guests.length === 0 ? (
            <p className="text-sm text-gray-500">
              No guests yet — they will appear here once the check-in link is opened.
            </p>
          ) : (
            <div className="space-y-3">
              {booking.guests.map((guest, i) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between border border-gray-100 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg font-bold ${
                        guest.status === "COMPLETE"
                          ? "text-blue-600"
                          : "text-orange-400"
                      }`}
                    >
                      {guestStatusIcon(guest.status)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {guest.firstName && guest.surname1
                          ? `${guest.surname1} ${guest.firstName}`
                          : `Guest ${i + 1}`}
                      </p>
                      {guest.email && (
                        <p className="text-xs text-gray-500">{guest.email}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sesStatusBadge(guest.sesStatus)}`}
                  >
                    SES: {guest.sesStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SES Submission */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-3">
            SES.Hospedaje submission
          </h2>
          {booking.sesSubmittedAt ? (
            <p className="text-sm text-green-700">
              ✓ Submitted on{" "}
              {new Date(booking.sesSubmittedAt).toLocaleString("en-GB")}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-3">
              Not yet submitted. Complete all guest registrations first.
            </p>
          )}
          <ResendSesButton
            bookingId={booking.id}
            disabled={!allComplete}
            label={booking.sesSubmittedAt ? "Re-send to SES" : "Send to SES"}
          />
          {booking.sesResponse && (
            <details className="mt-3">
              <summary className="text-xs text-gray-400 cursor-pointer">
                View SES response
              </summary>
              <pre className="mt-2 text-xs bg-gray-50 border rounded p-2 overflow-auto max-h-40 text-gray-600">
                {booking.sesResponse}
              </pre>
            </details>
          )}
        </div>

        {/* PDFs */}
        {allComplete && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-700 mb-4">Documents</h2>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/pdf/admission-sheet/${booking.token}`}
                target="_blank"
                className="bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-100 transition"
              >
                📄 Admission Sheet
              </a>
              {booking.guests.map((guest, i) => (
                <a
                  key={guest.id}
                  href={`/api/pdf/parte-policia/${booking.token}/${guest.id}`}
                  target="_blank"
                  className="bg-gray-50 text-gray-700 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-100 transition"
                >
                  📋 Parte policía — Guest {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
