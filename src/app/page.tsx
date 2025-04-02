'use client';

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorkflowTabs } from "@/components/workflow-tabs";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <WorkflowTabs />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
