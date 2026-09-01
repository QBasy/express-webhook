export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  webhookTTL: number;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface Room {
  roomId: string;
  userId: string;
  webhookTTL: number;
  createdAt: string;
  lastActivityAt: string;
}

export interface WebhookMetadata {
  method: string;
  url: string;
  headers: Record<string, string | string[]>;
  query: Record<string, string | string[]>;
  host: string;
  ip: string;
  userAgent?: string;
  contentType?: string;
  contentLength?: number;
}

export interface Webhook {
  receiptId: string;
  roomId: string;
  body: unknown;
  metadata: WebhookMetadata;
  timestamp: string;
  createdAt: string;
  expiresAt: string;
}

export interface FakeErrorStatus {
  enabled: boolean;
  statusCode: number | null;
}

export interface ForwardingStatus {
  enabled: boolean;
  url: string | null;
}

export interface ApiErrorPayload {
  error?: string;
  message?: string;
}
