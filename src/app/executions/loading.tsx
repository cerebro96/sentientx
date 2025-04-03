'use client';

import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-9 w-32 bg-muted animate-pulse rounded" />
      </div>

      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {[30, 150, 100, 120, 100, 100, 120, 50].map((width, i) => (
                  <th key={i} className="h-10 px-4">
                    <div className={`h-4 bg-muted animate-pulse rounded w-${width}`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row} className="border-b">
                  {[30, 150, 100, 120, 100, 100, 120, 50].map((width, i) => (
                    <td key={i} className="p-4">
                      <div className={`h-4 bg-muted animate-pulse rounded w-${width}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 