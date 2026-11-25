import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verity — Evidence-first research",
  description:
    "Research questions, source-backed findings, and cited reports in one focused workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
