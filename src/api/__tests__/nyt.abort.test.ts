import { searchArticles } from '../nyt';

// Mock axios
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('NYT API - Abort Signal Tests', () => {
  const mockAxios = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('aborts request when signal is triggered', async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    // Mock axios to return a promise that never resolves
    mockAxios.get.mockImplementation(() => new Promise(() => {}));

    // Start the request
    const requestPromise = searchArticles('test query', signal);

    // Abort the request
    controller.abort();

    // Wait for the request to be aborted
    await expect(requestPromise).rejects.toThrow();
  });

  test('handles multiple aborted requests', async () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    // Mock axios to return promises that never resolve
    mockAxios.get.mockImplementation(() => new Promise(() => {}));

    const request1 = searchArticles('query1', controller1.signal);
    const request2 = searchArticles('query2', controller2.signal);

    controller1.abort();
    controller2.abort();

    await expect(request1).rejects.toThrow();
    await expect(request2).rejects.toThrow();
  });

  test('completes request when not aborted', async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    // Mock successful response
    mockAxios.get.mockResolvedValueOnce({
      data: {
        response: {
          docs: [
            {
              _id: 'test-id',
              web_url: 'https://example.com',
              snippet: 'Test snippet',
              headline: { main: 'Test Headline' },
              pub_date: '2023-01-01T00:00:00Z',
              multimedia: null,
              keywords: [],
            },
          ],
        },
      },
    });

    const result = await searchArticles('test query', signal);

    expect(result).toHaveLength(1);
    expect(mockAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          q: 'test query',
        }),
        signal,
      })
    );
  });
});
