"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import type { Booking, Guest } from "@prisma/client";

type Accom = {
  name: string;
  address: string;
  city: string;
  phone: string;
  nif: string;
  owner: string;
};

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

function fmt(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2 text-sm py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium">{value || "—"}</span>
    </div>
  );
}

function AdmissionSheetPreview({
  booking,
  guest,
  accom,
}: {
  booking: Booking & { guests: Guest[] };
  guest: Guest;
  accom: Accom;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-sm">
      <div className="bg-gray-800 text-white px-4 py-2 text-xs font-bold tracking-widest uppercase">
        Admission Sheet — Entry Form
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Accommodation</p>
          <Row label="Name" value={accom.name} />
          <Row label="Address" value={`${accom.address}, ${accom.city}`} />
          <Row label="Phone" value={accom.phone} />
          <Row label="NIF" value={accom.nif} />
          <Row label="Owner" value={accom.owner} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Booking</p>
          <Row label="Reference" value={booking.airbnbRef} />
          <Row label="Check-in" value={fmt(booking.checkinDate)} />
          <Row label="Check-out" value={fmt(booking.checkoutDate)} />
          <Row label="Total guests" value={String(booking.numGuests)} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Your data</p>
          <Row label="Full name" value={`${guest.firstName ?? ""} ${guest.surname1 ?? ""} ${guest.surname2 ?? ""}`.trim()} />
          <Row label="Document type" value={guest.docType ?? undefined} />
          <Row label="Document number" value={guest.docNumber ?? undefined} />
          <Row label="Date of birth" value={fmt(guest.birthDate)} />
          <Row label="Nationality" value={guest.nationality ?? undefined} />
          <Row label="Sex" value={guest.sex === "H" ? "Male" : guest.sex === "M" ? "Female" : guest.sex ?? undefined} />
          <Row label="Address" value={guest.address ?? undefined} />
          <Row label="City" value={guest.city ?? undefined} />
          <Row label="Postal code" value={guest.postalCode ?? undefined} />
          <Row label="Email" value={guest.email ?? undefined} />
          <Row label="Phone" value={guest.phone ?? undefined} />
        </div>
        <p className="text-xs text-gray-400 italic">
          I declare that the above information is correct and authorise its use for Spanish tourist registration (SES.Hospedaje) as required by law.
        </p>
      </div>
    </div>
  );
}

function PartePoliciaPReview({
  booking,
  guest,
  accom,
}: {
  booking: Booking & { guests: Guest[] };
  guest: Guest;
  accom: Accom;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-sm">
      <div className="bg-blue-800 text-white px-4 py-2 text-xs font-bold tracking-widest uppercase">
        Parte de Viajeros / Hoja de registro
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Establecimiento</p>
          <Row label="Nombre" value={accom.name} />
          <Row label="Dirección" value={`${accom.address}, ${accom.city}`} />
          <Row label="NIF" value={accom.nif} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Datos del viajero</p>
          <Row label="Apellido 1" value={guest.surname1 ?? undefined} />
          <Row label="Apellido 2" value={guest.surname2 ?? undefined} />
          <Row label="Nombre" value={guest.firstName ?? undefined} />
          <Row label="Tipo documento" value={guest.docType ?? undefined} />
          <Row label="Núm. documento" value={guest.docNumber ?? undefined} />
          <Row label="Fecha nacimiento" value={fmt(guest.birthDate)} />
          <Row label="Nacionalidad" value={guest.nationality ?? undefined} />
          <Row label="Sexo" value={guest.sex === "H" ? "Hombre" : guest.sex === "M" ? "Mujer" : guest.sex ?? undefined} />
          <Row label="Dirección" value={guest.address ?? undefined} />
          <Row label="Municipio" value={guest.city ?? undefined} />
          <Row label="C.P." value={guest.postalCode ?? undefined} />
          <Row label="País residencia" value={guest.residenceCountry ?? undefined} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Contrato</p>
          <Row label="Referencia" value={booking.airbnbRef} />
          <Row label="Entrada" value={fmt(booking.checkinDate)} />
          <Row label="Salida" value={fmt(booking.checkoutDate)} />
        </div>
        <p className="text-xs text-gray-400 italic">
          Parte de viajeros conforme al Real Decreto 933/2021, de 26 de octubre, por el que se establecen las obligaciones de registro documental e información de las personas físicas o jurídicas que ejercen actividades de hospedaje.
        </p>
      </div>
    </div>
  );
}

export function SignatureStep({
  token,
  guestId,
  bookingToken,
  guestName,
  booking,
  guest,
  accom,
}: {
  token: string;
  guestId: string;
  bookingToken: string;
  guestName: string;
  booking: Booking & { guests: Guest[] };
  guest: Guest;
  accom: Accom;
}) {
  const router = useRouter();
  const sigRef = useRef<SignatureCanvas>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDoc, setActiveDoc] = useState<"entry" | "parte" | null>(null);

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
              onClick={() => router.push(`/checkin/${token}/guest/${guestId}`)}
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
            <p className="text-sm text-gray-500 text-center -mt-4">
              Hello <strong>{guestName}</strong>, please review your registration documents before signing.
            </p>

            {/* Document tabs */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              <button
                onClick={() => setActiveDoc(activeDoc === "entry" ? null : "entry")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                  activeDoc === "entry"
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                📋 Entry form
              </button>
              <div className="w-px bg-gray-200" />
              <button
                onClick={() => setActiveDoc(activeDoc === "parte" ? null : "parte")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                  activeDoc === "parte"
                    ? "bg-blue-800 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                📄 Parte policía
              </button>
            </div>

            {activeDoc === "entry" && (
              <AdmissionSheetPreview booking={booking} guest={guest} accom={accom} />
            )}
            {activeDoc === "parte" && (
              <PartePoliciaPReview booking={booking} guest={guest} accom={accom} />
            )}

            {/* PDF download links */}
            <div className="text-center space-x-4 text-xs text-gray-400">
              <a
                href={`/api/pdf/admission-sheet/${bookingToken}`}
                target="_blank"
                className="underline hover:text-gray-600"
              >
                Download Entry form PDF
              </a>
              <a
                href={`/api/pdf/parte-policia/${bookingToken}/${guestId}`}
                target="_blank"
                className="underline hover:text-gray-600"
              >
                Download Parte policía PDF
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
              By signing, you authorise the use of your data for the lease contract and the Spanish traveller registration (RD 933/2021).
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
