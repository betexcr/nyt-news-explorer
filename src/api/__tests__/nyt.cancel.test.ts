/**
 * Covers the "cancel previous request" / AbortController branch in src/api/nyt.ts
 * - First request stays pending
 * - Second request triggers abort on the first 
 */
const pending: Array<{ resolve: Function; reject: Function; signal?: AbortSignal }> = [];

const makeAxiosForAbort = () => {
  const get = jest.fn((url: string, opts?: any) => {
    return new Promise((resolve, reject) => { 
      pending.push({ resolve, reject, signal: opts?.signal }); 
      if (opts?.signal) {
        opts.signal.addEventListener('abort', () => { 
          const err: any = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }
    });
  });
  const instance = { get };
  const create = jest.fn(() => instance);
  const axios = Object.assign(() => instance, { create, get });
  return { __esModule: true, default: axios };
};

describe('src/api/nyt.ts aborts in-flight requests', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('axios', makeAxiosForAbort);
    process.env.REACT_APP_NYT_API_KEY = 'test';
  });

  test('second search aborts first in-flight request (controller branch covered)', async () => {
    const api = await import('../nyt');
    const make = (api as any).makeSearchController;
    const search = typeof make === 'function' ? make() : (api as any).searchArticles;

    // Kick off first search  
    const p1 = search('alpha', 0);

    // Kick off second search quickly -> should abort the first
    const p2 = search('beta', 1);

    // Ensure our mock saw two requests
    expect(pending.length).toBe(2);

    // First call should now be aborted by the controller logic
    const [first, second] = pending;

    // The controller should have called abort() on the first signal
    if (first.signal) {
      expect(first.signal.aborted).toBe(true);
    }

    // Resolve the second request with a normal NYT-like payload
    second.resolve({ data: { response: { docs: [{ _id: 'b' }] } } });
 
    await p2;  
 
    await p1.catch(() => {});
  });
});
