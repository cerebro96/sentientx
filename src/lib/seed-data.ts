import { supabase } from './supabase';
import { toast } from 'sonner';

// A function to seed the executions table with sample data
export async function seedExecutionsTable() {
  try {
    console.log('Seeding executions table...');
    
    // Check if table is empty
    const { count, error: countError } = await supabase
      .from('executions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error checking executions table:', countError);
      return;
    }
    
    if (count && count > 0) {
      console.log(`Executions table already has ${count} rows. Skipping seed.`);
      return;
    }
    
    // Sample data
    const sampleExecutions = [
      {
        id: 'exec-001',
        workflow_id: 'wf-001',
        workflow_name: 'Email Notification',
        status: 'success',
        started_at: new Date(Date.now() - 3600000).toISOString(),
        run_time: '5.2s',
        triggered_by: 'scheduler',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'exec-002',
        workflow_id: 'wf-002',
        workflow_name: 'Data Processing',
        status: 'failed',
        started_at: new Date(Date.now() - 7200000).toISOString(),
        run_time: '10.7s',
        triggered_by: 'api',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'exec-003',
        workflow_id: 'wf-001',
        workflow_name: 'Email Notification',
        status: 'running',
        started_at: new Date().toISOString(),
        run_time: '1.5s',
        triggered_by: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'exec-004',
        workflow_id: 'wf-003',
        workflow_name: 'Report Generation',
        status: 'pending',
        started_at: new Date(Date.now() - 300000).toISOString(),
        run_time: '0s',
        triggered_by: 'scheduler',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    // Insert sample data
    const { error } = await supabase.from('executions').insert(sampleExecutions);
    
    if (error) {
      console.error('Error seeding executions table:', error);
      toast.error(`Error seeding executions table: ${error.message}`);
      return;
    }
    
    console.log('Executions table seeded successfully');
    toast.success('Executions table seeded with sample data');
  } catch (error: any) {
    console.error('Error in seedExecutionsTable:', error);
    toast.error(`Error seeding executions table: ${error.message || JSON.stringify(error)}`);
  }
} 