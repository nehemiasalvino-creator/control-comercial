import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control Comercial",
  description: "Control de movimientos mayoristas, estaciones propias y vencimientos documentales",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
