import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guest Check-in | City of Arts Valencia Flats",
  description: "Online check-in for your reservation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100">{children}</body>
    </html>
  );
}
