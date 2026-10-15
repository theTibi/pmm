import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getActiveAlerts, getAlertmanagerAlerts } from 'api/alerting';
import { AlertmanagerAlert } from 'types/alerting.types';

export const ALERTMANAGER_ALERTS_QUERY_KEY = ['alerting:alertmanagerAlerts'];

export const useAlertmanagerAlerts = (
  options?: Partial<UseQueryOptions<AlertmanagerAlert[]>>
) =>
  useQuery({
    queryKey: ALERTMANAGER_ALERTS_QUERY_KEY,
    queryFn: () => getAlertmanagerAlerts(),
    ...options,
  });

export const useActiveAlerts = (
  options?: Partial<UseQueryOptions<AlertmanagerAlert[]>>
) =>
  useQuery({
    queryKey: ['alerting:activeAlerts'],
    queryFn: () => getActiveAlerts(),
    ...options,
  });
