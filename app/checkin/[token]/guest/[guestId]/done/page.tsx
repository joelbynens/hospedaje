import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

function StepIndicator() {
  const steps = [
    { n: 1, label: "Enter your\ndata" },
    { n: 2, label: "Sign the\ncontract" },
    { n: 3, label: "Checkin\ncompleted" },
  ];
  return (
    <div className="flex items-start justify-between px-4 py-6 bg-gray-50 border-b">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 text-gray-600">
              ✓
            </div>
            <p className="text-xs text-gray-500 text-center mt-1 whitespace-pre-line leading-tight">
              {step.label}
            </p>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-px bg-gray-300 mx-2 mt-[-16px]" />
          )}
        </div>
      ))}
    </div>
  );
}

export default async function DonePage({
  params,
}: {
  params: Promise<{ token: string; guestId: string }>;
}) {
  const { token, guestId } = await params;

  const booking = await prisma.booking.findUnique({ where: { token } });
  if (!booking) notFound();

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, bookingId: booking.id },
  });
  if (!guest) notFound();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-lg mx-auto">
        <div className="bg-white min-h-screen">
          <StepIndicator />

          <div className="px-4 py-12 flex flex-col items-center text-center space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Guest successfully registered
            </h2>

            <div className="w-28 h-28 rounded-full border-4 border-blue-600 flex items-center justify-center">
              <span className="text-blue-600 text-5xl">✓</span>
            </div>

            <Link
              href={`/checkin/${token}`}
              className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-bold hover:bg-blue-700 transition uppercase tracking-wide text-center"
            >
              RETURN AND CONTINUE WITH REGISTRATION
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
