-- Create agentfactory table
CREATE TABLE IF NOT EXISTS public.agentfactory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_name TEXT NOT NULL,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    execution_id VARCHAR(255) NOT NULL REFERENCES public.executions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agentfactory_workflow_id ON public.agentfactory(workflow_id);
CREATE INDEX IF NOT EXISTS idx_agentfactory_execution_id ON public.agentfactory(execution_id);
CREATE INDEX IF NOT EXISTS idx_agentfactory_agent_name ON public.agentfactory(agent_name);
CREATE INDEX IF NOT EXISTS idx_agentfactory_status ON public.agentfactory(status);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.agentfactory ENABLE ROW LEVEL SECURITY;

-- Create policy for select
CREATE POLICY "Allow read access to authenticated users" ON public.agentfactory
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy for insert
CREATE POLICY "Allow insert access to authenticated users" ON public.agentfactory
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create policy for update
CREATE POLICY "Allow update access to authenticated users" ON public.agentfactory
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policy for delete (soft delete)
CREATE POLICY "Allow delete access to authenticated users" ON public.agentfactory
    FOR DELETE
    TO authenticated
    USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_agentfactory_updated_at
    BEFORE UPDATE ON public.agentfactory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public.agentfactory IS 'Stores agent factory allocations for multi-agent workflows';

-- Add comments to columns
COMMENT ON COLUMN public.agentfactory.id IS 'The unique identifier for the agent factory record';
COMMENT ON COLUMN public.agentfactory.agent_name IS 'The allocated agent name used in the agent factory';
COMMENT ON COLUMN public.agentfactory.workflow_id IS 'Reference to the workflow this agent is part of';
COMMENT ON COLUMN public.agentfactory.execution_id IS 'Reference to the execution instance';
COMMENT ON COLUMN public.agentfactory.status IS 'Current status of the agent (active/deleted)';
COMMENT ON COLUMN public.agentfactory.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.agentfactory.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN public.agentfactory.deleted_at IS 'Timestamp when the record was soft deleted'; 