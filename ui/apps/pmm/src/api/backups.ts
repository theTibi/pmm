import { BackupArtifact, ListArtifactsResponse } from 'types/backups.types';
import { api } from './api';

export const listBackupArtifacts = async (): Promise<BackupArtifact[]> => {
  const res = await api.get<ListArtifactsResponse>('/backups/artifacts');
  return res.data.artifacts ?? [];
};
