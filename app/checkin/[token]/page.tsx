import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CheckinOverviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const booking = await prisma.booking.findUnique({
    where: { token },
    include: { guests: { orderBy: { sortOrder: "asc" } } },
  });

  if (!booking) notFound();

  const allComplete = booking.guests.every((g) => g.status === "COMPLETE");
  const completeCount = booking.guests.filter(
    (g) => g.status === "COMPLETE"
  ).length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header banner */}
      <div className="bg-gray-600 text-white px-6 py-8 text-center">
        <h1 className="text-2xl font-bold">
          Online check-in for your reservation {booking.airbnbRef}
        </h1>
        <p className="text-gray-300 text-sm mt-1">Accommodation</p>
        <p className="text-white font-medium mt-0.5">
          {process.env.ACCOMMODATION_NAME ??
            "City of Arts Valencia Flats by Rent Me"}
        </p>
        <div className="flex justify-center gap-12 mt-6 text-sm">
          <div>
            <p className="text-gray-400">Check-in</p>
            <p className="text-xl font-bold">
              {new Date(booking.checkinDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).replace(/\//g, "-")}
            </p>
            <p className="text-gray-300">{booking.checkinTime}</p>
          </div>
          <div>
            <p className="text-gray-400">Check-out</p>
            <p className="text-xl font-bold">
              {new Date(booking.checkoutDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).replace(/\//g, "-")}
            </p>
            <p className="text-gray-300">{booking.checkoutTime}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Status banner */}
        {allComplete ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-green-600 text-xl">✓</span>
            <div>
              <p className="font-semibold text-green-800">
                Check-in process completed!
              </p>
              <p className="text-green-700 text-sm">
                All ready for your check-in
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-amber-500 text-xl">⚠</span>
            <div>
              <p className="font-semibold text-amber-800">
                Incomplete check-in process
              </p>
              <p className="text-amber-700 text-sm">
                There {booking.numGuests - completeCount === 1 ? "is" : "are"}{" "}
                {booking.numGuests - completeCount} guest
                {booking.numGuests - completeCount !== 1 ? "s" : ""} to
                register
              </p>
            </div>
          </div>
        )}

        {/* Guests */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500">Guests</p>
          <p className="font-bold text-gray-800 mb-4">
            The reservation consists of {booking.numGuests} guests
          </p>

          <div className="space-y-3">
            {booking.guests.map((guest, i) => (
              <Link
                key={guest.id}
                href={`/checkin/${token}/guest/${guest.id}`}
                className="flex items-center justify-between border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      guest.status === "COMPLETE"
                        ? "bg-blue-600"
                        : "bg-orange-400"
                    }`}
                  >
                    {guest.status === "COMPLETE" ? "✓" : "!"}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">
                      {guest.firstName && guest.surname1
                        ? `${guest.surname1} ${guest.firstName}`
                        : `Guest ${i + 1}`}
                    </p>
                    <p className="text-xs text-gray-500">Adult</p>
                  </div>
                </div>
                <span className="text-gray-400">›</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
