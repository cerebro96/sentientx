import { supabase } from '@/lib/supabase';
import { createWorkflow } from '@/lib/workflows';
import { SAMPLE_WORKFLOWS } from '@/data/sample-workflows';

// Prevent concurrent execution
const creationInProgress = new Set<string>();

// Very fast check - single query
export async function shouldCreateSamples(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('user_sample_status')
      .select('samples_created')
      .eq('user_id', userId)
      .single();
    
    return !data?.samples_created;
  } catch (error) {
    // If no record exists, should create samples
    return true;
  }
}

// Mark as created - single insert/update
export async function markSamplesCreated(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_sample_status')
    .upsert({
      user_id: userId,
      samples_created: true
    });
    
  if (error) {
    console.error('Error marking samples as created:', error);
  }
}

// Create samples from file data - very fast
export async function createSampleWorkflows(userId: string): Promise<void> {
  try {
    console.log(`Creating ${SAMPLE_WORKFLOWS.length} sample workflows for user: ${userId}`);
    
    // Create all workflows in parallel for speed
    const creationPromises = SAMPLE_WORKFLOWS.map(async (sampleData) => {
      try {
        // Check if this sample already exists to prevent duplicates
        const { data: existingWorkflow } = await supabase
          .from('workflows')
          .select('id')
          .eq('name', sampleData.name)
          .single();
        
        if (!existingWorkflow) {
          await createWorkflow(sampleData);
          console.log(`✓ Created: ${sampleData.name}`);
        } else {
          console.log(`⏭ Skipped (exists): ${sampleData.name}`);
        }
      } catch (error) {
        console.error(`✗ Failed to create: ${sampleData.name}`, error);
      }
    });
    
    // Wait for all to complete
    await Promise.all(creationPromises);
    
    // Mark as completed
    await markSamplesCreated(userId);
    
    console.log('✓ All sample workflows processed successfully');
    
  } catch (error) {
    console.error('Error in createSampleWorkflows:', error);
    throw error;
  }
}

// Main function - call this on first signup
export async function initializeSamplesForUser(userId: string): Promise<void> {
  // Prevent concurrent execution for same user
  if (creationInProgress.has(userId)) {
    console.log(`Sample creation already in progress for user: ${userId}`);
    return;
  }
  
  try {
    creationInProgress.add(userId);
    
    const shouldCreate = await shouldCreateSamples(userId);
    
    if (shouldCreate) {
      await createSampleWorkflows(userId);
    }
  } finally {
    creationInProgress.delete(userId);
  }
} 