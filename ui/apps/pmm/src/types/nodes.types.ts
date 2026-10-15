// Node from /v1/management/nodes API
export interface ManagedNode {
  nodeId: string;
  nodeName: string;
  region: string;
}

export interface ListManagedNodesResponse {
  nodes?: ManagedNode[];
}
