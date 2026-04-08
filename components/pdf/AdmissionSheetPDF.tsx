import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Booking, Guest } from "@prisma/client";
import { countryName } from "@/lib/countries";

type Props = {
  booking: Booking & { guests: Guest[] };
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 32,
    color: "#111",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  row: { flexDirection: "row", gap: 8, marginBottom: 4 },
  label: { color: "#555", fontSize: 9 },
  value: { fontSize: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#ddd", marginVertical: 8 },
  guestBox: {
    border: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  guestTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  cell: { width: "48%" },
  sigBox: {
    marginTop: 8,
    border: 1,
    borderColor: "#aaa",
    borderRadius: 4,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  sigImg: { width: 150, height: 45 },
});

function fmt(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-");
}

function sexLabel(sex: string | null): string {
  return sex === "H" ? "Male" : sex === "M" ? "Female" : sex ?? "—";
}

function docTypeLabel(dt: string | null): string {
  const map: Record<string, string> = {
    PAS: "Passport",
    NIF: "NIF",
    NIE: "NIE",
    OTRO: "Identity document",
  };
  return map[dt ?? ""] ?? dt ?? "—";
}

export function AdmissionSheetPDF({ booking }: Props) {
  const accomName =
    process.env.ACCOMMODATION_NAME ?? "Casa El Hippo";
  const accomAddress = process.env.ACCOMMODATION_ADDRESS ?? "Avenida de Francia, 79";
  const accomPhone = process.env.ACCOMMODATION_PHONE ?? "+34851960468";
  const owner = process.env.ACCOMMODATION_OWNER ?? "Joel Bynens";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>ADMISSION SHEET</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Accommodation: </Text>
          <Text style={styles.value}>{accomName}</Text>
          <Text style={styles.label}> Location: </Text>
          <Text style={styles.value}>{accomAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone number: </Text>
          <Text style={styles.value}>{accomPhone}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Arrival: </Text>
          <Text style={styles.value}>{fmt(booking.checkinDate)}</Text>
          <Text style={styles.label}> Departure: </Text>
          <Text style={styles.value}>{fmt(booking.checkoutDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reservation owner: </Text>
          <Text style={styles.value}>{owner}</Text>
          <Text style={styles.label}> Identifier: </Text>
          <Text style={styles.value}>{booking.airbnbRef}</Text>
        </View>

        <View style={styles.divider} />

        <Text
          style={{
            fontFamily: "Helvetica-Bold",
            fontSize: 11,
            marginBottom: 8,
          }}
        >
          GUEST DATA
        </Text>

        {booking.guests.map((guest) => (
          <View key={guest.id} style={styles.guestBox}>
            <Text style={styles.guestTitle}>
              {guest.surname1 && guest.firstName
                ? `${guest.surname1} ${guest.firstName}`.toUpperCase()
                : "—"}
            </Text>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{guest.email ?? "—"}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.label}>Mobile phone</Text>
                <Text style={styles.value}>{guest.phone ?? "—"}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.label}>Type document</Text>
                <Text style={styles.value}>{docTypeLabel(guest.docType)}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.label}>ID Card No.</Text>
                <Text style={styles.value}>{guest.docNumber ?? "—"}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.value}>{guest.address ?? "—"}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.label}>Birth date</Text>
                <Text style={styles.value}>{fmt(guest.birthDate)}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.label}>Sex</Text>
                <Text style={styles.value}>{sexLabel(guest.sex)}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.label}>Nationality</Text>
                <Text style={styles.value}>
                  {countryName(guest.nationality ?? "")}
                </Text>
              </View>
            </View>
            <View style={styles.sigBox}>
              {guest.signatureBase64 ? (
                <Image src={guest.signatureBase64} style={styles.sigImg} />
              ) : (
                <Text style={{ fontSize: 8, color: "#aaa" }}>
                  GUEST SIGNATURE
                </Text>
              )}
            </View>
          </View>
        ))}

        <Text
          style={{ fontSize: 8, color: "#888", marginTop: 12 }}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
