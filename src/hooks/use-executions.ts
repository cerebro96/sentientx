import useSWR from 'swr'
import { fetchExecutions, type Execution } from '@/lib/data-fetching'
import { toast } from 'sonner'

export function useExecutions() {
  const { data, error, isLoading, mutate } = useSWR<Execution[]>(
    'executions',
    async () => {
      try {
        return await fetchExecutions()
      } catch (err: any) {
        console.error('Error in useExecutions hook:', err)
        toast.error(`Error fetching executions: ${err.message || JSON.stringify(err)}`)
        throw err
      }
    },
    {
      refreshInterval: 0, // Disable automatic refresh
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onError: (err) => {
        console.error('SWR error in useExecutions:', err)
      }
    }
  )

  return {
    executions: data || [],
    isLoading,
    isError: error,
    refresh: mutate
  }
} 