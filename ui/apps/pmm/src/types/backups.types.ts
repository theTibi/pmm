export enum BackupStatus {
  Success = 'BACKUP_STATUS_SUCCESS',
  Error = 'BACKUP_STATUS_ERROR',
}

// Artifact from /v1/backups/artifacts API
export interface BackupArtifact {
  artifactId: string;
  serviceId: string;
  serviceName: string;
  locationName: string;
  status: string;
  createdAt: string;
}

export interface ListArtifactsResponse {
  artifacts?: BackupArtifact[];
}
