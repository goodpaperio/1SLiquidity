import { useQuery } from '@apollo/client'
import { GET_GLOBAL_STREAMS } from '../graphql/queries/streams'
import { GlobalStreamsResponse } from '../graphql/types/stream'

export function useGlobalStreams() {
  const { data, loading, error, refetch } = useQuery<GlobalStreamsResponse>(
    GET_GLOBAL_STREAMS,
    {
      // Refetch every 30 seconds to keep data fresh
      pollInterval: 30000,
    }
  )

  return {
    data: data?.globalStreams,
    isLoading: loading,
    error,
    refetch,
  }
}
