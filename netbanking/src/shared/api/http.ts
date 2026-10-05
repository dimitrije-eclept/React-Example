import { err, ok, type Result } from 'neverthrow';

export type HttpMethod = 'GET' | 'POST';

export type HttpRequest = {
  readonly method: HttpMethod;
  /** Path below the base URL, e.g. `/core/v2/acc/list`. */
  readonly path: string;
  readonly query?: Readonly<Record<string, string | number | undefined>>;
  /** Sent as JSON when present. */
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  /** Send the access token and handle 401 (default `true`). Off for login/OTP/refresh. */
  readonly authenticated?: boolean;
};

export type HttpResponse = {
  readonly status: number;
  readonly headers: Headers;
  /** Parsed JSON for JSON responses; `null` for empty bodies and anything else (HTML errors…). */
  readonly body: unknown;
  readonly correlationId: string;
};

/**
 * The request never got a (complete) response: offline, DNS, CORS, or no answer within the timeout.
 * For a write, the bank may still have processed it.
 */
export type NetworkFailure = {
  readonly kind: 'network';
  readonly timedOut: boolean;
  readonly cause: unknown;
};

export type Http = {
  readonly send: (request: HttpRequest) => Promise<Result<HttpResponse, NetworkFailure>>;
};

/** Supplied by app/: the HTTP client never knows where tokens come from. */
export type HttpAuth = {
  readonly getAccessToken: () => string | null;
  /** Gets a fresh access token; resolves `false` when the session can't be renewed. */
  readonly refresh: () => Promise<boolean>;
  /** Called when a request is still unauthorised after a refresh attempt. */
  readonly onUnauthorized: () => void;
};

export type HttpConfig = {
  /** Empty string means the page origin. */
  readonly baseUrl: string;
  readonly auth: HttpAuth;
  readonly fetch?: typeof fetch;
  /** Gives up on a request (including reading its body) after this long. Default 30 s. */
  readonly timeoutMs?: number;
};

export const DEFAULT_TIMEOUT_MS = 30_000;

function buildUrl(baseUrl: string, { path, query }: HttpRequest): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return `${baseUrl.replace(/\/$/, '')}${path}${search ? `?${search}` : ''}`;
}

async function readBody(response: Response): Promise<unknown> {
  const isJson = response.headers.get('Content-Type')?.includes('json') ?? false;
  if (!isJson) return null;
  const text = await response.text();
  if (text === '') return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Thin fetch wrapper: JSON in and out, a correlation id per request, the bearer token, and one
 * refresh-and-retry on 401. It never interprets status codes beyond that; adapters do.
 */
export function createHttp({
  baseUrl,
  auth,
  fetch: fetchImpl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: HttpConfig): Http {
  const attempt = async (
    request: HttpRequest,
    correlationId: string,
  ): Promise<Result<HttpResponse, NetworkFailure>> => {
    const headers = new Headers(request.headers);
    headers.set('Accept', 'application/json');
    headers.set('X-Correlation-Id', correlationId);
    if (request.body !== undefined) headers.set('Content-Type', 'application/json');
    const token = request.authenticated === false ? null : auth.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    // A hung connection must end: otherwise a payment button spins forever and the caller never
    // learns that the outcome is unknown.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Resolved per call, so wrappers installed later (MSW, monitoring) are honoured.
      const response = await (fetchImpl ?? globalThis.fetch)(buildUrl(baseUrl, request), {
        method: request.method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: controller.signal,
      });
      return ok({
        status: response.status,
        headers: response.headers,
        body: await readBody(response),
        correlationId,
      });
    } catch (cause) {
      return err({ kind: 'network', timedOut: controller.signal.aborted, cause });
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    async send(request) {
      const correlationId = crypto.randomUUID();
      const first = await attempt(request, correlationId);
      if (request.authenticated === false || first.isErr() || first.value.status !== 401) {
        return first;
      }
      if (await auth.refresh()) {
        const retried = await attempt(request, correlationId);
        if (retried.isErr() || retried.value.status !== 401) return retried;
      }
      auth.onUnauthorized();
      return first;
    },
  };
}
