import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recommendation Engine Sandbox | Real Rails",
  description: "Inspect ranking signals, feedback loops, and content distribution. Distribution & Demand Rail.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
