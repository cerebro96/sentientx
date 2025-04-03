'use client';

import { useState } from 'react';
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorkflowTabs } from "@/components/workflow-tabs";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { WorkflowFormData } from '@/components/workflow/WorkflowDialog';

export default function Home() {
  const [isEditorActive, setIsEditorActive] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | undefined>(undefined);
  const [newWorkflowData, setNewWorkflowData] = useState<WorkflowFormData | null>(null);

  const handleCreateWorkflow = (formData: WorkflowFormData) => {
    setCurrentWorkflowId(undefined); // New workflow
    setNewWorkflowData(formData);
    setIsEditorActive(true);
  };

  const handleEditWorkflow = (workflowId: string) => {
    setCurrentWorkflowId(workflowId);
    setNewWorkflowData(null);
    setIsEditorActive(true);
  };

  return (
    <ProtectedRoute>
      {isEditorActive ? (
        <div className="h-screen w-full">
          <WorkflowCanvas 
            isActive={true} 
            onClose={() => setIsEditorActive(false)} 
            workflowId={currentWorkflowId}
            newWorkflowData={newWorkflowData}
          />
        </div>
      ) : (
        <DashboardLayout>
          <div className="h-full">
            <WorkflowTabs 
              onEditorStateChange={setIsEditorActive} 
              onCreateWorkflow={handleCreateWorkflow}
              onEditWorkflow={handleEditWorkflow}
            />
    </div>
        </DashboardLayout>
      )}
    </ProtectedRoute>
  );
}
