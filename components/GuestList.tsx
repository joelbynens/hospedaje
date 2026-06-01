"use client";

import { useRouter } from "next/navigation";
import type { Guest } from "@prisma/client";
import { EditGuestButton } from "@/components/EditGuestButton";

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

export function GuestList({ guests }: { guests: Guest[] }) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      {guests.map((guest, i) => (
        <div
          key={guest.id}
          className="flex items-center justify-between border border-gray-100 rounded-lg p-3"
        >
          <div className="flex items-center gap-3">
            <span
              className={`text-lg font-bold ${
                guest.status === "COMPLETE" ? "text-blue-600" : "text-orange-400"
              }`}
            >
              {guestStatusIcon(guest.status)}
            </span>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-gray-800">
                  {guest.firstName && guest.surname1
                    ? `${guest.firstName} ${guest.surname1}`
                    : guest.firstName || guest.surname1 || `Guest ${i + 1}`}
                </p>
                <EditGuestButton
                  guest={guest}
                  onSaved={() => router.refresh()}
                />
              </div>
              {guest.parentesco && (
                <p className="text-xs text-gray-400">Parentesco: {guest.parentesco}</p>
              )}
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
  );
}
