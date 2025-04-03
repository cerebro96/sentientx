import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { CredentialHeader } from "./credential-header";

interface CredentialLayoutProps {
  children: ReactNode;
}

export function CredentialLayout({ children }: CredentialLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <CredentialHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 