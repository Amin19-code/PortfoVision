import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PortfoVision - Portfolio Performance Analyzer",
  description: "Analyze and compare your stock portfolio performance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
