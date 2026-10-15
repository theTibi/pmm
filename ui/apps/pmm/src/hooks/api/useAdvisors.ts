import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { listAdvisors, listFailedServices } from 'api/advisors';
import { Advisor, CheckResultSummary } from 'types/advisors.types';

export const useAdvisors = (options?: Partial<UseQueryOptions<Advisor[]>>) =>
  useQuery({
    queryKey: ['advisors'],
    queryFn: () => listAdvisors(),
    ...options,
  });

export const useFailedServices = (
  options?: Partial<UseQueryOptions<CheckResultSummary[]>>
) =>
  useQuery({
    queryKey: ['advisors:failedServices'],
    queryFn: () => listFailedServices(),
    ...options,
  });
