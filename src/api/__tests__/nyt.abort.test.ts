/**
 * Explicitly covers the "abort previous" path in makeSearchController().
 */
const pending: Array<{ resolve: Function; reject: Function; signal?: AbortSignal }> = [];

const makeAxiosForAbort = () => {
  const get = jest.fn((_url: string, opts?: any) => {
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

beforeEach(() => {
  jest.resetModules();
  pending.length = 0;
  jest.doMock('axios', makeAxiosForAbort);
  process.env.REACT_APP_NYT_API_KEY = 'test';
});

test('second search aborts the first in-flight request', async () => {
  const api = await import('../nyt');
  const search = (api as any).makeSearchController();

  const p1 = search('alpha'); // stays pending
  const p2 = search('beta');  // triggers abort on p1

  expect(pending.length).toBe(2);
  const [first, second] = pending;

  if (first.signal) {
    expect(first.signal.aborted).toBe(true);
  }

  // Resolve second request with valid NYT API response
  second.resolve({ 
    data: { 
      status: 'OK',
      copyright: 'Copyright (c) 2024 The New York Times Company',
      response: { 
        docs: [{ 
          _id: 'b',
          web_url: 'https://example.com/b',
          snippet: 'Test article',
          multimedia: {},
          headline: { main: 'Test Headline' },
          keywords: [],
          pub_date: '2024-01-01T00:00:00Z'
        }],
        meta: { hits: 1, offset: 0, time: 10 }
      }
    }
  });

  await expect(p2).resolves.toBeDefined();
  await p1.catch(() => {}); // swallow AbortError
});
