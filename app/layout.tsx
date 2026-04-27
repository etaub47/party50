import AppGuard from "@/components/AppGuard";
import GlobalAlertListener from "@/components/GlobalAlertListener";
import ReckoningListener from "@/components/ReckoningListener";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import React from "react";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Corporate Espionage",
    description: "Secure terminal for active field agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <AppGuard>
                    <ReckoningListener />
                    <GlobalAlertListener />
                    {children}
                </AppGuard>
            </body>
        </html>
    );
}
