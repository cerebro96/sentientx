import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Suspense } from 'react'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SentientX",
  description: "AI Workflow Automation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
          themes={["light", "dark", "system", "red", "rose"]}
        >
          <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-background">
              <div className="flex flex-col items-center justify-center">
                <svg 
                  className="animate-pulse-slow w-24 h-24 text-primary"
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="animate-dash"
                  />
                  <path 
                    d="M7.5 12H16.5" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="animate-dash delay-100"
                  />
                  <path 
                    d="M10.5 7.5L7.5 12L10.5 16.5" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="animate-dash delay-200"
                  />
                </svg>
                <h1 className="mt-4 text-2xl font-bold text-primary">SentientX</h1>
                <p className="text-sm text-muted-foreground mt-2">AI Workflow Automation Platform</p>
              </div>
            </div>
          }>
            <main className="min-h-screen bg-background antialiased">
              {children}
            </main>
          </Suspense>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
