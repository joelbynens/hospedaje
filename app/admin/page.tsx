import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PARTIAL: "bg-blue-100 text-blue-800",
    COMPLETE: "bg-green-100 text-green-800",
  };
  return map[status] ?? "bg-gray-100 text-gray-800";
}

export default async function AdminPage() {
  await checkAdminAuth();

  let bookings: Awaited<ReturnType<typeof prisma.booking.findMany<{ include: { guests: { select: { status: true } } } }>>> = [];
  let dbError: string | null = null;

  try {
    bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        guests: { select: { status: true } },
      },
    });
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database connection failed";
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            Hospedaje Admin
          </h1>
          <p className="text-sm text-gray-500">
            {process.env.ACCOMMODATION_NAME ?? "Casa El Hippo"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            + New booking
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {dbError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-5">
            <p className="font-semibold text-red-800 mb-1">⚠ Database connection error</p>
            <p className="text-sm text-red-700 mb-3">
              The app cannot reach the database. Make sure the Supabase migration has been run
              and that <code className="bg-red-100 px-1 rounded">DATABASE_URL</code> is set in
              Vercel environment variables.
            </p>
            <details>
              <summary className="text-xs text-red-500 cursor-pointer">Technical details</summary>
              <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">{dbError}</pre>
            </details>
          </div>
        )}
        {!dbError && bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No bookings yet.</p>
            <Link
              href="/admin/bookings/new"
              className="mt-4 inline-block bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Create your first booking
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const done = booking.guests.filter(
                (g) => g.status === "COMPLETE"
              ).length;
              const total = booking.guests.length;

              return (
                <Link
                  key={booking.id}
                  href={`/admin/bookings/${booking.id}`}
                  className="block bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800 text-lg">
                          {booking.airbnbRef}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge(booking.status)}`}
                        >
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(booking.checkinDate).toLocaleDateString(
                          "en-GB"
                        )}{" "}
                        →{" "}
                        {new Date(booking.checkoutDate).toLocaleDateString(
                          "en-GB"
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">
                        {done}/{total} guests registered
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {booking.numGuests} guest
                        {booking.numGuests !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
