"use client";

import { useState } from "react";

export function ResendSesButton({
  bookingId,
  disabled,
  label,
}: {
  bookingId: string;
  disabled: boolean;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setResult(null);
    const res = await fetch(`/api/ses/submit/${bookingId}`, {
      method: "POST",
    });
    const data = await res.json();
    setResult({
      success: res.ok,
      message: data.message ?? (res.ok ? "Sent successfully" : "Error sending"),
    });
    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={handleSubmit}
        disabled={disabled || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {loading ? "Sending…" : label}
      </button>
      {disabled && !loading && (
        <p className="text-xs text-gray-400 mt-1">
          All guests must complete registration first.
        </p>
      )}
      {result && (
        <p
          className={`text-sm mt-2 ${result.success ? "text-green-700" : "text-red-600"}`}
        >
          {result.success ? "✓" : "✗"} {result.message}
        </p>
      )}
    </div>
  );
}
