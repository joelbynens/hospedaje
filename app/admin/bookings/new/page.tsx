"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PAYMENT_TYPES = [
  { value: "PLATF", label: "Platform (Airbnb)" },
  { value: "TARJT", label: "Credit/Debit card" },
  { value: "EFECT", label: "Cash" },
  { value: "TRANS", label: "Bank transfer" },
  { value: "MOVIL", label: "Mobile payment" },
  { value: "OTRO", label: "Other" },
];

export default function NewBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      airbnbRef: form.get("airbnbRef"),
      checkinDate: form.get("checkinDate"),
      checkoutDate: form.get("checkoutDate"),
      checkinTime: form.get("checkinTime"),
      checkoutTime: form.get("checkoutTime"),
      numGuests: parseInt(form.get("numGuests") as string),
      paymentType: form.get("paymentType"),
    };

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const booking = await res.json();
      router.push(`/admin/bookings/${booking.id}`);
    } else {
      const err = await res.json();
      setError(err.error ?? "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/admin"
            className="text-gray-400 hover:text-gray-600 transition"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-800">New booking</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Airbnb reference *
              </label>
              <input
                name="airbnbRef"
                type="text"
                required
                placeholder="e.g. MALV_53325"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in date *
                </label>
                <input
                  name="checkinDate"
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in time *
                </label>
                <input
                  name="checkinTime"
                  type="time"
                  defaultValue="16:00"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out date *
                </label>
                <input
                  name="checkoutDate"
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out time *
                </label>
                <input
                  name="checkoutTime"
                  type="time"
                  defaultValue="11:00"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of guests *
                </label>
                <input
                  name="numGuests"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={2}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment type *
                </label>
                <select
                  name="paymentType"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAYMENT_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? "Creating…" : "Create booking & generate check-in link"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
