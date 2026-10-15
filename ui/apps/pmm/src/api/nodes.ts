import { ListManagedNodesResponse, ManagedNode } from 'types/nodes.types';
import { api } from './api';

export const listManagedNodes = async (): Promise<ManagedNode[]> => {
  const res = await api.get<ListManagedNodesResponse>('/management/nodes', {
    disableNotifications: true,
  });
  return res.data.nodes ?? [];
};
