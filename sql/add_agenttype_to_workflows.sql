-- Add agenttype column to workflows table
-- This script adds the agent_type column as mandatory field

-- Add the column with enum constraint
ALTER TABLE workflows 
ADD COLUMN agent_type VARCHAR(50) NOT NULL DEFAULT 'single_agent'
CHECK (agent_type IN ('single_agent', 'multi_agent', 'prebuild_agents'));

-- Update the check constraint name for better management
-- ALTER TABLE workflows 
-- ADD CONSTRAINT workflows_agent_type_check 
-- CHECK (agent_type IN ('single_agent', 'multi_agent', 'prebuild_agents'));

-- Create an index for better query performance
CREATE INDEX idx_workflows_agent_type ON workflows(agent_type);

-- Add a comment for documentation
COMMENT ON COLUMN workflows.agent_type IS 'Type of agent: single_agent, multi_agent, or prebuild_agents'; 