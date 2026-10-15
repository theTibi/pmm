import { PMM_NEW_NAV_GRAFANA_PATH } from 'lib/constants';
import { AttentionKind, FleetDimension } from 'types/home.types';

export const MAX_ATTENTION_ROWS = 10;

export const HOME_REFRESH_MS = 60_000;

export const DEFAULT_FLEET_BY: FleetDimension = 'technology';

export const ALERTING_LIST_URL = `${PMM_NEW_NAV_GRAFANA_PATH}/alerting/list`;
export const INVENTORY_SERVICES_URL = `${PMM_NEW_NAV_GRAFANA_PATH}/inventory/services`;
export const ADD_INSTANCE_URL = `${PMM_NEW_NAV_GRAFANA_PATH}/add-instance`;

export const ATTENTION_LINKS: Record<AttentionKind, string> = {
  alert: ALERTING_LIST_URL,
  'not-reporting': INVENTORY_SERVICES_URL,
  backup: `${PMM_NEW_NAV_GRAFANA_PATH}/backup/inventory`,
  advisor: `${PMM_NEW_NAV_GRAFANA_PATH}/advisors/insights`,
};

export const FLEET_BY_STORAGE_KEY = 'pmm.home.fleetBy';
