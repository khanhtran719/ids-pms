export type {
  LivenessHealth as LivenessStatus,
  SystemHealth as HealthStatus,
} from '@project-ql/api-contracts';

export interface DatabaseConnectionState {
  readyState: number;
}
