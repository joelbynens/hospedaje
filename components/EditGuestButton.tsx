"use client";

import { useState } from "react";
import type { Guest } from "@prisma/client";

const PARENTESCO_OPTIONS = [
  { value: "", label: "— none —" },
  { value: "PM", label: "Father or mother / Padre o madre" },
  { value: "HJ", label: "Son or daughter / Hijo/a" },
  { value: "AB", label: "Grandparent / Abuelo/a" },
  { value: "HR", label: "Brother or sister / Hermano/a" },
  { value: "TI", label: "Uncle or aunt / Tío/a" },
  { value: "CY", label: "Spouse / Cónyuge" },
  { value: "TU", label: "Tutor / Tutor/a" },
  { value: "NI", label: "Grandchild / Nieto/a" },
  { value: "OT", label: "Other / Otro" },
];

const SEX_OPTIONS = [
  { value: "H", label: "Male / Hombre" },
  { value: "M", label: "Female / Mujer" },
  { value: "O", label: "Other / Otro" },
];

const DOC_TYPES = [
  { value: "PAS", label: "Passport" },
  { value: "NIF", label: "NIF (Spanish ID)" },
  { value: "NIE", label: "NIE (Foreign resident ID)" },
  { value: "OTRO", label: "Other" },
];

export function EditGuestButton({ guest, onSaved }: { guest: Guest; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName:        guest.firstName        ?? "",
    surname1:         guest.surname1         ?? "",
    surname2:         guest.surname2         ?? "",
    parentesco:       guest.parentesco       ?? "",
    docType:          guest.docType          ?? "PAS",
    docNumber:        guest.docNumber        ?? "",
    sex:              guest.sex              ?? "",
    birthDate:        guest.birthDate ? new Date(guest.birthDate).toISOString().split("T")[0] : "",
    nationality:      guest.nationality      ?? "",
    residenceCountry: guest.residenceCountry ?? "",
    phone:            guest.phone            ?? "",
    email:            guest.email            ?? "",
    address:          guest.address          ?? "",
    city:             guest.city             ?? "",
    postalCode:       guest.postalCode       ?? "",
  });

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/guests/${guest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOpen(false);
      onSaved();
    } else {
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  }

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:underline ml-2"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                Edit guest — {guest.firstName} {guest.surname1}
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-4 space-y-3">
              {field("First name", "firstName")}
              {field("Last name", "surname1")}
              {field("Second last name (optional)", "surname2")}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Document type</label>
                <select
                  value={form.docType}
                  onChange={(e) => setForm({ ...form, docType: e.target.value as "PAS" | "NIF" | "NIE" | "OTRO" })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DOC_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {field("Document number", "docNumber")}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Sex</label>
                <select
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value as "H" | "M" | "O" })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select…</option>
                  {SEX_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {field("Birth date", "birthDate", "date")}
              {field("Nationality (ISO 3)", "nationality")}
              {field("Residence country (ISO 3)", "residenceCountry")}
              {field("Address", "address")}
              {field("City", "city")}
              {field("Postal code", "postalCode")}
              {field("Phone", "phone", "tel")}
              {field("Email", "email", "email")}

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Relationship to minor (parentesco)
                </label>
                <select
                  value={form.parentesco}
                  onChange={(e) => setForm({ ...form, parentesco: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PARENTESCO_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
