export interface PortalStatus {
  email_verification: boolean;
  password_login_enabled: boolean;
  password_register_enabled: boolean;
  register_enabled: boolean;
  turnstile_check: boolean;
  turnstile_site_key: string;
}

export interface PortalUser {
  id: number;
  username: string;
  display_name: string;
  role: number;
  status: number;
  group: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface LoginResult extends Partial<PortalUser> {
  require_2fa?: boolean;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  verificationCode: string;
  invitationCode?: string;
  turnstileToken?: string;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  const rawBody = await response.text();
  let payload: ApiEnvelope<T>;
  try {
    payload = JSON.parse(rawBody) as ApiEnvelope<T>;
  } catch {
    throw new Error(`服务暂不可用，请稍后重试 (${response.status})`);
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || `请求失败 (${response.status})`);
  }
  return payload.data as T;
}

function withTurnstile(path: string, token?: string): string {
  if (!token) return path;
  return `${path}?turnstile=${encodeURIComponent(token)}`;
}

export function loadPortalStatus(): Promise<PortalStatus> {
  return apiRequest<PortalStatus>('/api/status');
}

export function sendVerificationCode(email: string, turnstileToken?: string): Promise<void> {
  const query = new URLSearchParams({ email });
  if (turnstileToken) query.set('turnstile', turnstileToken);
  return apiRequest<void>(`/api/verification?${query.toString()}`);
}

export function register(input: RegisterInput): Promise<void> {
  return apiRequest<void>(withTurnstile('/api/user/register', input.turnstileToken), {
    method: 'POST',
    body: JSON.stringify({
      username: input.username,
      email: input.email,
      password: input.password,
      verification_code: input.verificationCode,
      aff_code: input.invitationCode || '',
    }),
  });
}

export function login(username: string, password: string, turnstileToken?: string): Promise<LoginResult> {
  return apiRequest<LoginResult>(withTurnstile('/api/user/login', turnstileToken), {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function verifyTwoFactor(code: string): Promise<PortalUser> {
  return apiRequest<PortalUser>('/api/user/login/2fa', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function finishPortalLogin(user: PortalUser): void {
  localStorage.setItem('uid', String(user.id));
  localStorage.setItem('user', JSON.stringify(user));
  window.location.assign('/dashboard');
}
