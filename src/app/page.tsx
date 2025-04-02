import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorkflowTabs } from "@/components/workflow-tabs";

export default function Home() {
  return (
    <DashboardLayout>
      <WorkflowTabs />
    </DashboardLayout>
  );
}
