"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";
import type { Guest } from "@prisma/client";

const DOC_TYPES = [
  { value: "PAS", label: "Passport" },
  { value: "NIF", label: "NIF (Spanish ID)" },
  { value: "NIE", label: "NIE (Foreign resident ID)" },
  { value: "OTRO", label: "Identity document / other" },
];

const SEX_OPTIONS = [
  { value: "H", label: "Male" },
  { value: "M", label: "Female" },
  { value: "O", label: "Other" },
];

function StepIndicator({ current }: { current: number }) {
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
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                current === step.n
                  ? "bg-blue-600 text-white"
                  : current > step.n
                    ? "bg-gray-200 text-gray-600"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {current > step.n ? "✓" : step.n}
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

export function GuestDataForm({
  token,
  guest,
  bookingRef,
}: {
  token: string;
  guest: Guest;
  bookingRef: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = {
      guestId: guest.id,
      docType: form.get("docType"),
      docNumber: form.get("docNumber"),
      firstName: form.get("firstName"),
      surname1: form.get("surname1"),
      surname2: form.get("surname2") || null,
      sex: form.get("sex"),
      birthDate: form.get("birthDate"),
      nationality: form.get("nationality"),
      residenceCountry: form.get("residenceCountry"),
      city: form.get("city"),
      postalCode: form.get("postalCode"),
      address: form.get("address"),
      email: form.get("email"),
      phone: form.get("phone") || null,
    };

    const res = await fetch(`/api/checkin/${token}/guests`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push(`/checkin/${token}/guest/${guest.id}/sign`);
    } else {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const field = (
    label: string,
    name: string,
    opts: React.InputHTMLAttributes<HTMLInputElement> & { required?: boolean }
  ) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {label} {opts.required !== false && <span className="text-gray-400">(Required)</span>}
      </label>
      <input
        name={name}
        defaultValue={(guest[name as keyof Guest] as string | undefined) ?? ""}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...opts}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-lg mx-auto">
        <div className="bg-white">
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <button
              onClick={() => router.push(`/checkin/${token}`)}
              className="text-blue-600 text-sm font-medium flex items-center gap-1"
            >
              ← BACK
            </button>
          </div>

          <StepIndicator current={1} />

          <div className="px-4 py-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <button className="w-full flex items-center justify-between text-sm text-gray-600">
                <span>Enter the data manually</span>
                <span>∧</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Document */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Document type <span className="text-gray-400">(Required)</span>
                </label>
                <select
                  name="docType"
                  defaultValue={guest.docType ?? "PAS"}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DOC_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {field("Document number", "docNumber", {
                required: true,
                placeholder: "e.g. AB123456",
              })}

              {field("Guest name", "firstName", {
                required: true,
                placeholder: "First name",
              })}
              {field("Guest first surname", "surname1", {
                required: true,
                placeholder: "First surname",
              })}
              {field("Guest second surname", "surname2", {
                required: false,
                placeholder: "Second surname (optional)",
              })}

              {/* Sex */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Guest sex <span className="text-gray-400">(Required)</span>
                </label>
                <select
                  name="sex"
                  defaultValue={guest.sex ?? ""}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select…</option>
                  {SEX_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {field("Notification email", "email", {
                type: "email",
                required: true,
                placeholder: "guest@email.com",
              })}
              {field("Phone (optional)", "phone", {
                type: "tel",
                required: false,
                placeholder: "+32...",
              })}

              {/* Residence country */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Guest residence country <span className="text-gray-400">(Required)</span>
                </label>
                <select
                  name="residenceCountry"
                  defaultValue={guest.residenceCountry ?? "BEL"}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nationality */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Nationality <span className="text-gray-400">(Required)</span>
                </label>
                <select
                  name="nationality"
                  defaultValue={guest.nationality ?? "BEL"}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {field("City", "city", { required: true, placeholder: "City" })}
              {field("Postal code", "postalCode", {
                required: true,
                placeholder: "Postal code",
              })}
              {field("Address", "address", {
                required: true,
                placeholder: "Street and number",
              })}

              {/* Birth date */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Guest born date <span className="text-gray-400">(Required)</span>
                </label>
                <input
                  name="birthDate"
                  type="date"
                  required
                  defaultValue={
                    guest.birthDate
                      ? new Date(guest.birthDate).toISOString().split("T")[0]
                      : ""
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition uppercase tracking-wide"
              >
                {loading ? "Saving…" : "CONTINUE →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
