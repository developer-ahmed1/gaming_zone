import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8b5cf6",
};

export const metadata = {
  title: "Mirpurkhas Gaming Zone",
  description: "Booking management system for Mirpurkhas Gaming Zone - PS5 & Steering Wheel",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={outfit.variable} style={{ fontFamily: "var(--font-outfit), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
