import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { ExecutionHeader } from "./execution-header";

interface ExecutionLayoutProps {
  children: ReactNode;
}

export function ExecutionLayout({ children }: ExecutionLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ExecutionHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 