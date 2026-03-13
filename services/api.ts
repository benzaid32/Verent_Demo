import type {
  CreateListingRequest,
  CreateRentalRequest,
  DashboardPayload,
  FleetAnalysisResponse,
  LoginRequest,
  QuoteResponse,
  RentalActionRequest,
  RentalVerificationRequest,
  SettingsUpdateRequest,
  UpdateListingRequest,
  StakeRequest,
  WithdrawRequest
} from '../shared/contracts';

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }

  return '';
}

const API_BASE_URL = resolveApiBaseUrl();
const SESSION_KEY = 'verent.session.token';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getStoredToken() {
  return window.localStorage.getItem(SESSION_KEY);
}

export function storeToken(token: string | null) {
  if (!token) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, token);
}

async function request<T>(path: string, options: RequestInit = {}, token = getStoredToken()): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_BASE_URL for this deployment.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(errorBody.message || `Request failed: ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

export async function login(payload: LoginRequest) {
  return request<{ accessToken: string; expiresAt: string; profile: DashboardPayload['profile'] }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, null);
}

export function clearSessionToken() {
  storeToken(null);
}

export async function bootstrap() {
  return request<DashboardPayload>('/bootstrap');
}

export async function createListingApi(payload: CreateListingRequest) {
  return request<DashboardPayload['listings'][number]>('/listings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateListingApi(listingId: string, payload: UpdateListingRequest) {
  return request<DashboardPayload['listings'][number]>(`/listings/${listingId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function getQuote(listingId: string, days: number) {
  return request<QuoteResponse>('/rentals/quote', {
    method: 'POST',
    body: JSON.stringify({ listingId, days })
  });
}

export async function createRentalApi(payload: CreateRentalRequest) {
  return request<{ rental: DashboardPayload['rentingRentals'][number]; quote: QuoteResponse }>('/rentals', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function acceptRentalApi(rentalId: string, payload: RentalActionRequest) {
  return request<DashboardPayload['rentingRentals'][number]>(`/rentals/${rentalId}/accept`, {
    method: 'POST'
    ,
    body: JSON.stringify(payload)
  });
}

export async function confirmPickupApi(rentalId: string, payload: RentalVerificationRequest) {
  return request<DashboardPayload['rentingRentals'][number]>(`/rentals/${rentalId}/pickup`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function completeRentalApi(rentalId: string, payload: RentalVerificationRequest) {
  return request<DashboardPayload['rentingRentals'][number]>(`/rentals/${rentalId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function withdrawApi(payload: WithdrawRequest) {
  return request<{ wallet: DashboardPayload['wallet']; transactionHash: string; explorerUrl: string }>('/wallet/withdraw', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function stakeApi(payload: StakeRequest) {
  return request<{ wallet: DashboardPayload['wallet']; profile: DashboardPayload['profile']; transactionHash: string; explorerUrl: string }>('/staking', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function sendMessageApi(conversationId: string, text: string) {
  return request<DashboardPayload['conversations'][number]>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });
}

export async function openConversationApi(listingId: string) {
  return request<DashboardPayload['conversations'][number]>('/conversations/open', {
    method: 'POST',
    body: JSON.stringify({ listingId })
  });
}

export async function markNotificationsReadApi() {
  return request<DashboardPayload['notifications']>('/notifications/mark-read', {
    method: 'POST'
  });
}

export async function updateSettingsApi(payload: SettingsUpdateRequest) {
  return request<DashboardPayload['profile']>('/settings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function analyzeFleetApi() {
  return request<FleetAnalysisResponse>('/ai/fleet-analysis');
}
