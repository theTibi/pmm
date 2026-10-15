import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { listBackupArtifacts } from 'api/backups';
import { BackupArtifact } from 'types/backups.types';

export const useBackupArtifacts = (
  options?: Partial<UseQueryOptions<BackupArtifact[]>>
) =>
  useQuery({
    queryKey: ['backups:artifacts'],
    queryFn: () => listBackupArtifacts(),
    ...options,
  });
