import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, http, NetworkError } from './http';

afterEach(() => {
  vi.unstubAllGlobals();
});

const stubFetch = (impl: (url: string, init?: RequestInit) => Promise<Response>) =>
  vi.stubGlobal('fetch', vi.fn(impl));

describe('http', () => {
  it('prefixes /api and resolves with data, status and headers', async () => {
    stubFetch(async () => Response.json({ ok: true }, { headers: { ETag: '"3"' } }));
    const result = await http<{ data: unknown; status: number; headers: Headers }>('/patients');
    expect(fetch).toHaveBeenCalledWith('/api/patients', expect.anything());
    expect(result.data).toEqual({ ok: true });
    expect(result.status).toBe(200);
    expect(result.headers.get('ETag')).toBe('"3"');
  });

  it('returns undefined data for a 204', async () => {
    stubFetch(async () => new Response(null, { status: 204 }));
    const result = await http<{ data: unknown }>('/patients/1', { method: 'DELETE' });
    expect(result.data).toBeUndefined();
  });

  it('passes the abort signal through', async () => {
    stubFetch(async () => Response.json({}));
    const controller = new AbortController();
    await http('/patients', { signal: controller.signal });
    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(init?.signal).toBe(controller.signal);
  });

  it('parses problem+json into an ApiError with field errors', async () => {
    stubFetch(async () =>
      Response.json(
        {
          title: 'Unprocessable Content',
          status: 422,
          detail: 'The request is invalid.',
          errors: [
            { field: 'address.city', message: 'Required', type: 'missing' },
            { field: 'address.city', message: 'Second', type: 'x' },
            { field: 'phone', message: 'Bad phone', type: 'value_error' },
          ],
        },
        { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    );
    const error = await http('/patients', { method: 'POST' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(422);
    expect(apiError.problem.title).toBe('Unprocessable Content');
    expect(apiError.fieldErrors).toEqual({ 'address.city': 'Required', phone: 'Bad phone' });
    expect(apiError.message).toBe('The request is invalid.');
  });

  it('still produces an ApiError when the error body is not JSON', async () => {
    stubFetch(async () => new Response('<html>bad gateway</html>', { status: 502 }));
    const error = await http('/patients').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
  });

  it('turns fetch rejections into NetworkError', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(http('/patients')).rejects.toBeInstanceOf(NetworkError);
  });

  it('rethrows aborts untouched', async () => {
    const controller = new AbortController();
    stubFetch(async () => {
      controller.abort();
      throw new DOMException('Aborted', 'AbortError');
    });
    const error = await http('/patients', { signal: controller.signal }).catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(NetworkError);
    expect((error as DOMException).name).toBe('AbortError');
  });
});
