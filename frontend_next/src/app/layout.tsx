import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IMS | AI-Powered Recruitment Platform",
  description: "Next-gen interview management system powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--color-background)] text-[var(--color-text-main)] overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-primary)] opacity-[0.03] blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-secondary)] opacity-[0.03] blur-[120px] rounded-full pointer-events-none z-0" />

        <div className="relative z-10 w-full h-screen overflow-y-auto">
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#141416",
              color: "#f8f9fa",
              border: "1px solid #27272a",
              borderRadius: "12px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#141416" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#141416" },
            },
            loading: {
              iconTheme: { primary: "#5e6ad2", secondary: "#141416" },
            },
          }}
        />
      </body>
    </html>
  );
}
