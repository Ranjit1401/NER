export interface PointCoordinates {
  latitude: number;
  longitude: number;
}

export interface LineCoordinates {
  points: PointCoordinates[];
}

export interface PolygonCoordinates {
  exterior: PointCoordinates[];
}

export interface DisasterEvent {
  id: string;
  title: string;
  disaster_type: 'FLOOD' | 'LANDSLIDE' | 'GLOF' | 'EARTHQUAKE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affected_state: string;
  location: PointCoordinates;
  impact_zone?: PolygonCoordinates | null;
  status: 'ACTIVE' | 'CONTAINED' | 'RESOLVED';
  metadata?: Record<string, unknown>;
  reported_at: string;
}

export interface RoadSegment {
  id: string;
  highway_code: string;
  segment_name: string;
  start_district: string;
  end_district: string;
  geometry: LineCoordinates;
  current_status: 'CLEAR' | 'CAUTION' | 'BLOCKED' | 'IMPASSABLE';
  weight_limit_tons?: number | null;
  elevation_m?: number | null;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  hub_id: string;
  item_category: string;
  item_name: string;
  quantity: number;
  unit: string;
  last_updated: string;
}

export interface LogisticsHub {
  id: string;
  name: string;
  hub_type: 'DEPOT' | 'RELIEF_CAMP' | 'AIRFIELD' | 'HELIPAD';
  district: string;
  state: string;
  location: PointCoordinates;
  capacity_sqm?: number | null;
  contact_person?: string | null;
  status: 'OPERATIONAL' | 'FULL' | 'DAMAGED';
  inventory_items?: InventoryItem[];
}

export interface DispatchOrder {
  id: string;
  order_code: string;
  origin_hub_id?: string | null;
  destination_hub_id?: string | null;
  recommended_route_id?: string | null;
  allocated_items: Record<string, number>;
  ai_recommendation_id?: string | null;
  status: 'PROPOSED' | 'PENDING_APPROVAL' | 'APPROVED' | 'ASSIGNED' | 'ACCEPTED' | 'EN_ROUTE' | 'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'CANCELLED' | 'FAILED';
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

export interface AIAuditLog {
  id: string;
  agent_name: string;
  prompt_summary: string;
  recommendation: string;
  confidence_score: number;
  evidence_data: Record<string, unknown>;
  model_used: string;
  execution_time_ms: number;
  created_at: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  database: {
    connected: boolean;
    postgis_available: boolean;
    postgis_version?: string;
    error?: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    });

    // Read the response body exactly once as text
    const responseText = await res.text();

    if (!res.ok) {
      let detailMsg = res.statusText;
      if (responseText) {
        try {
          const errJson = JSON.parse(responseText);
          if (errJson.detail) {
            detailMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
          } else {
            detailMsg = responseText;
          }
        } catch {
          detailMsg = responseText;
        }
      }
      throw new Error(`API ${res.status}: ${detailMsg}`);
    }

    if (!responseText) {
      return {} as T;
    }

    return JSON.parse(responseText) as T;
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Unable to reach dispatch service.');
  }
}

export interface OrchestratedQueryResponse {
  query: string;
  execution_plan: string[];
  agent_results: Array<{
    agent_name: string;
    agent_type: string;
    status: string;
    summary: string;
    findings: Array<{ category: string; fact: string; is_database_result: boolean }>;
    recommendations: Array<{ action: string; reasoning: string; requires_human_approval: boolean }>;
    evidence: Array<{ source_type: string; source_name: string; data_summary: string }>;
    confidence_score: number;
    warnings: string[];
    execution_time_ms: number;
  }>;
  final_summary: string;
  recommendations: Array<{ action: string; reasoning: string; requires_human_approval: boolean }>;
  evidence: Array<{ source_type: string; source_name: string; data_summary: string }>;
  warnings: string[];
  total_execution_time_ms: number;
  audit_log_id?: string | null;
}

export interface FieldReportItem {
  id: string;
  client_generated_id: string;
  report_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  location: PointCoordinates;
  reported_by: string;
  observed_at: string;
  created_at: string;
}

export interface DriverEmergencyItem {
  client_generated_id: string;
  event_type: string;
  dispatch_id: string;
  driver_id: string;
  truck_id: string;
  sos_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED';
}

export interface SystemAlertItem {
  id: string;
  client_generated_id?: string | null;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  source: string;
  related_entity_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'DISMISSED';
  created_at: string;
  dismissed_at?: string | null;
  dismissed_by?: string | null;
}

export interface SyncResult {
  client_generated_id: string;
  status: 'SYNCED' | 'CONFLICT' | 'FAILED';
  server_id?: string | null;
  message: string;
  conflict_details?: Record<string, unknown> | null;
}

export const api = {
  // Health & System
  getHealth: (): Promise<HealthStatus> => fetchJson<HealthStatus>('/health'),
  getVersion: (): Promise<{ version: string; environment: string }> => fetchJson('/version'),

  // Offline Sync
  syncFieldReport: (report: {
    client_generated_id: string;
    report_type: string;
    severity: string;
    description: string;
    location: PointCoordinates;
    observed_at: string;
    reported_by?: string;
    version?: number;
  }): Promise<SyncResult> =>
    fetchJson<SyncResult>('/api/v1/sync/field-reports', {
      method: 'POST',
      body: JSON.stringify(report),
    }),

  getFieldReports: (): Promise<FieldReportItem[]> =>
    fetchJson<FieldReportItem[]>('/api/v1/sync/field-reports'),

  getEmergencies: (): Promise<DriverEmergencyItem[]> =>
    fetchJson<DriverEmergencyItem[]>('/api/v1/sync/emergencies'),

  acknowledgeEmergency: (clientGeneratedId: string): Promise<{ client_generated_id: string; acknowledged: boolean }> =>
    fetchJson<{ client_generated_id: string; acknowledged: boolean }>(`/api/v1/sync/emergencies/${clientGeneratedId}/acknowledge`, {
      method: 'POST',
    }),

  // Persistent System Alerts
  getAlerts: (): Promise<SystemAlertItem[]> =>
    fetchJson<SystemAlertItem[]>('/api/v1/alerts'),

  dismissAlert: (alertId: string): Promise<{ id: string; status: string }> =>
    fetchJson<{ id: string; status: string }>(`/api/v1/alerts/${alertId}/dismiss`, {
      method: 'POST',
    }),

  // AI Orchestrated Query
  queryIntelligence: (query: string): Promise<OrchestratedQueryResponse> =>
    fetchJson<OrchestratedQueryResponse>('/api/v1/ai/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  // Disasters
  getDisasters: (params?: { status?: string; state?: string }): Promise<DisasterEvent[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.state) query.append('state', params.state);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<DisasterEvent[]>(`/api/v1/disasters/${qs}`);
  },
  getDisasterById: (id: string): Promise<DisasterEvent> => fetchJson<DisasterEvent>(`/api/v1/disasters/${id}`),

  // Roads
  getRoads: (params?: { status?: string; highway_code?: string }): Promise<RoadSegment[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.highway_code) query.append('highway_code', params.highway_code);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<RoadSegment[]>(`/api/v1/roads/${qs}`);
  },
  getAffectedRoads: (): Promise<RoadSegment[]> => fetchJson<RoadSegment[]>('/api/v1/roads/affected-by-disasters'),

  // Logistics Hubs & Inventory
  getHubs: (params?: { state?: string; hub_type?: string }): Promise<LogisticsHub[]> => {
    const query = new URLSearchParams();
    if (params?.state) query.append('state', params.state);
    if (params?.hub_type) query.append('hub_type', params.hub_type);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<LogisticsHub[]>(`/api/v1/hubs/${qs}`);
  },
  getHubById: (id: string): Promise<LogisticsHub> => fetchJson<LogisticsHub>(`/api/v1/hubs/${id}`),
  getHubInventory: (hubId: string): Promise<InventoryItem[]> => fetchJson<InventoryItem[]>(`/api/v1/hubs/${hubId}/inventory`),

  // Dispatches
  getDispatches: (status?: string): Promise<DispatchOrder[]> => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetchJson<DispatchOrder[]>(`/api/v1/dispatches/${qs}`);
  },
  submitDispatch: (orderId: string): Promise<DispatchOrder> =>
    fetchJson<DispatchOrder>(`/api/v1/dispatches/${orderId}/submit`, {
      method: 'POST',
    }),
  approveDispatch: (orderId: string, userId: string): Promise<DispatchOrder> =>
    fetchJson<DispatchOrder>(`/api/v1/dispatches/${orderId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, user_role: 'COMMANDER' }),
    }),
  rejectDispatch: (orderId: string, userId: string, rejectionReason: string): Promise<DispatchOrder> =>
    fetchJson<DispatchOrder>(`/api/v1/dispatches/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, user_role: 'COMMANDER', rejection_reason: rejectionReason }),
    }),

  // Audit Logs
  getAuditLogs: (agentName?: string): Promise<AIAuditLog[]> => {
    const qs = agentName ? `?agent_name=${encodeURIComponent(agentName)}` : '';
    return fetchJson<AIAuditLog[]>(`/api/v1/audit-logs/${qs}`);
  },

  // Driver Telemetry
  getLatestDriverTelemetry: (): Promise<Array<{
    driver_id: string;
    truck_id: string;
    dispatch_id: string;
    latitude: number;
    longitude: number;
    speed_kmh: number;
    heading: number;
    trip_status: string;
    severity: string;
    recorded_at: string;
    connection_status: string;
  }>> => fetchJson('/api/v1/sync/driver-telemetry/latest'),
};
