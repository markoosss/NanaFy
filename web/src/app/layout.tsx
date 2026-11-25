import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NanaFy | Cuidados en familia",
  description:
    "Organiza y comparte los cuidados diarios de tu gata con toda la familia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
