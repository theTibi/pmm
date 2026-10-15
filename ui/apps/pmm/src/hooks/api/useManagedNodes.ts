import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { listManagedNodes } from 'api/nodes';
import { ManagedNode } from 'types/nodes.types';

export const useManagedNodes = (
  options?: Partial<UseQueryOptions<ManagedNode[]>>
) =>
  useQuery({
    queryKey: ['nodes:managed'],
    queryFn: () => listManagedNodes(),
    ...options,
  });
