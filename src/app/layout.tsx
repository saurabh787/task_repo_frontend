import type { Metadata } from "next";
import { Space_Grotesk, Newsreader } from "next/font/google";
import "./globals.css";
import ToasterProvider from "../components/ToasterProvider";
import ThemeInitializer from "../components/ThemeInitializer";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans"
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "Task Manager",
  description: "Minimal task manager with auth and CRUD"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${newsreader.variable} font-sans`}>
        <ToasterProvider />
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
