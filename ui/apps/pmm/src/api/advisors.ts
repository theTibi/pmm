import {
  Advisor,
  CheckResultSummary,
  ListAdvisorsResponse,
  ListFailedServicesResponse,
} from 'types/advisors.types';
import { api } from './api';

export const listAdvisors = async (): Promise<Advisor[]> => {
  const res = await api.get<ListAdvisorsResponse>('/advisors');
  return res.data.advisors;
};

export const listFailedServices = async (): Promise<CheckResultSummary[]> => {
  const res = await api.get<ListFailedServicesResponse>(
    '/advisors/failedServices'
  );
  return res.data.result ?? [];
};
