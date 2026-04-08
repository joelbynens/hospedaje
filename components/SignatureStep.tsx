"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";

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

export function SignatureStep({
  token,
  guestId,
  bookingToken,
  guestName,
}: {
  token: string;
  guestId: string;
  bookingToken: string;
  guestName: string;
}) {
  const router = useRouter();
  const sigRef = useRef<SignatureCanvas>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleClear() {
    sigRef.current?.clear();
  }

  async function handleSubmit() {
    if (sigRef.current?.isEmpty()) {
      setError("Please sign in the box before continuing.");
      return;
    }

    setLoading(true);
    setError("");

    const signatureBase64 = sigRef.current!.toDataURL("image/png");

    const res = await fetch(`/api/checkin/${token}/guests`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, signatureBase64 }),
    });

    if (res.ok) {
      router.push(`/checkin/${bookingToken}/guest/${guestId}/done`);
    } else {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-lg mx-auto">
        <div className="bg-white">
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <button
              onClick={() =>
                router.push(`/checkin/${token}/guest/${guestId}`)
              }
              className="text-blue-600 text-sm font-medium flex items-center gap-1"
            >
              ← BACK
            </button>
          </div>

          <StepIndicator current={2} />

          <div className="px-4 py-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 text-center">
              Check the documents to sign
            </h2>

            {/* Document previews */}
            <div className="bg-gray-100 rounded-xl p-4 space-y-3">
              <a
                href={`/api/pdf/admission-sheet/${bookingToken}`}
                target="_blank"
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition"
              >
                <span className="text-2xl">📋</span>
                <span>Entry form</span>
              </a>
              <a
                href={`/api/pdf/parte-policia/${bookingToken}/${guestId}`}
                target="_blank"
                className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 transition"
              >
                <span className="text-2xl">📄</span>
                <span>Parte policía</span>
              </a>
            </div>

            {/* Signature */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 text-center mb-3">
                Enter your signature in the box
              </h3>
              <div className="border-2 border-gray-200 rounded-xl bg-white relative">
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute top-2 right-3 text-xs text-gray-400 hover:text-gray-600 z-10"
                >
                  Delete
                </button>
                <SignatureCanvas
                  ref={sigRef}
                  penColor="black"
                  canvasProps={{
                    width: 400,
                    height: 200,
                    className: "w-full rounded-xl",
                  }}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              At the end you authorize to put your signature on the lease
              contract and in the travelers part
            </p>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition uppercase tracking-wide"
            >
              {loading ? "Sending…" : "SIGN AND SEND"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
