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
  booking: Booking;
  guest: Guest;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 32,
    color: "#111",
  },
  title: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  subtitle: { fontSize: 9, color: "#555", marginBottom: 12 },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 3,
  },
  row: { flexDirection: "row", marginBottom: 4, flexWrap: "wrap", gap: 8 },
  field: { flex: 1, minWidth: "40%" },
  label: { fontSize: 8, color: "#777" },
  value: { fontSize: 10, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 2 },
  legalText: { fontSize: 8, color: "#555", marginTop: 12, lineHeight: 1.4 },
  sigSection: { marginTop: 16 },
  sigLabel: { fontSize: 9, color: "#555", marginBottom: 4 },
  sigBox: {
    border: 1,
    borderColor: "#aaa",
    height: 60,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  sigImg: { width: 160, height: 55 },
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
  return sex === "H" ? "MASCULINO" : sex === "M" ? "FEMENINO" : sex ?? "—";
}

function docTypeLabel(dt: string | null): string {
  const map: Record<string, string> = {
    PAS: "Passport",
    NIF: "NIF",
    NIE: "NIE",
    OTRO: "Letter or ID document",
  };
  return map[dt ?? ""] ?? dt ?? "—";
}

export function PartePoliciaPDF({ booking, guest }: Props) {
  const accomName =
    process.env.ACCOMMODATION_NAME ?? "City of Arts Valencia Flats by Rent Me";
  const accomCity = process.env.ACCOMMODATION_CITY ?? "Valencia";
  const accomProvince = process.env.ACCOMMODATION_PROVINCE ?? "Valencia";
  const accomNIF = process.env.ACCOMMODATION_NIF ?? "Z0035609X";
  const today = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Hoja-registro</Text>
        <Text style={styles.subtitle}>(Rellenar con mayúsculas)</Text>

        {/* Establishment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del establecimiento</Text>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>CIF / NIF:</Text>
              <Text style={styles.value}>{accomNIF}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Parte nº:</Text>
              <Text style={styles.value}>—</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Nombre del establecimiento:</Text>
              <Text style={styles.value}>{accomName}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Municipio:</Text>
              <Text style={styles.value}>{accomCity}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Provincia:</Text>
              <Text style={styles.value}>{accomProvince}</Text>
            </View>
          </View>
        </View>

        {/* Guest data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del viajero</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Núm de documento de identidad:</Text>
              <Text style={styles.value}>{guest.docNumber ?? "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Tipo de documento:</Text>
              <Text style={styles.value}>{docTypeLabel(guest.docType)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Fecha expedición del documento:</Text>
              <Text style={styles.value}>{fmt(new Date())}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Fecha de entrada:</Text>
              <Text style={styles.value}>{fmt(booking.checkinDate)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Primer apellido:</Text>
              <Text style={styles.value}>
                {(guest.surname1 ?? "—").toUpperCase()}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Segundo apellido:</Text>
              <Text style={styles.value}>
                {(guest.surname2 ?? "").toUpperCase() || "—"}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Nombre:</Text>
              <Text style={styles.value}>
                {(guest.firstName ?? "—").toUpperCase()}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Sexo:</Text>
              <Text style={styles.value}>{sexLabel(guest.sex)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Fecha de nacimiento:</Text>
              <Text style={styles.value}>{fmt(guest.birthDate)}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>País de nacionalidad:</Text>
              <Text style={styles.value}>
                {countryName(guest.nationality ?? "").toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Legal text */}
        <Text style={styles.legalText}>
          La recogida y tratamiento se hará de acuerdo con la Ley Orgánica
          15/1999, de 13 de diciembre, de Protección de Datos de Carácter
          Personal y al amparo de lo dispuesto en el artículo 12.1 de la Ley
          Orgánica 1/1992, de 21 de febrero, sobre Protección de la Seguridad
          Ciudadana.
        </Text>

        <Text style={{ fontSize: 9, marginTop: 10, color: "#555" }}>
          En {accomCity}, {today}
        </Text>

        {/* Signature */}
        <View style={styles.sigSection}>
          <Text style={styles.sigLabel}>Firma del viajero</Text>
          <View style={styles.sigBox}>
            {guest.signatureBase64 ? (
              <Image src={guest.signatureBase64} style={styles.sigImg} />
            ) : (
              <Text style={{ fontSize: 8, color: "#aaa" }}>FIRMA</Text>
            )}
          </View>
        </View>

        <Text
          style={{ fontSize: 8, color: "#aaa", marginTop: 20, textAlign: "center" }}
          render={({ pageNumber, totalPages }) =>
            `-- ${pageNumber} of ${totalPages} --`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
