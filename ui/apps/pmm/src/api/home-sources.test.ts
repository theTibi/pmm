import { api, grafanaApi } from './api';
import { listManagedNodes } from './nodes';
import { listBackupArtifacts } from './backups';
import { listFailedServices } from './advisors';
import { getActiveAlerts } from './alerting';

const NODE = { nodeId: 'n1', nodeName: 'db-1', region: 'eu-west-1' };

describe('home data sources', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists management nodes', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValue({ data: { nodes: [NODE] } });

    expect(await listManagedNodes()).toEqual([NODE]);
    expect(get).toHaveBeenCalledWith('/management/nodes');
  });

  it('returns [] when nodes are missing', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: {} });

    expect(await listManagedNodes()).toEqual([]);
  });

  it('lists backup artifacts', async () => {
    const artifact = { artifactId: 'a1', status: 'BACKUP_STATUS_ERROR' };
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValue({ data: { artifacts: [artifact] } });

    expect(await listBackupArtifacts()).toEqual([artifact]);
    expect(get).toHaveBeenCalledWith('/backups/artifacts');
  });

  it('lists services with failed advisor checks', async () => {
    const summary = { serviceId: 's1', criticalCount: 1 };
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValue({ data: { result: [summary] } });

    expect(await listFailedServices()).toEqual([summary]);
    expect(get).toHaveBeenCalledWith('/advisors/failedServices');
  });

  it('lists active, unsilenced alerts', async () => {
    const get = vi.spyOn(grafanaApi, 'get').mockResolvedValue({ data: [] });

    await getActiveAlerts();

    expect(get).toHaveBeenCalledWith('/alertmanager/grafana/api/v2/alerts', {
      params: {
        active: true,
        silenced: false,
        inhibited: false,
        unprocessed: false,
      },
    });
  });
});
