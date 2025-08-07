import { searchArticles } from '../nyt';

// Mock axios
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('NYT API - Cancel Tests', () => {
  const mockAxios = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cancels previous request when new request is made', async () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    // Mock axios to return promises that never resolve initially
    mockAxios.get.mockImplementation(() => new Promise(() => {}));

    // Start first request
    const request1 = searchArticles('query1', controller1.signal);
    
    // Start second request (should cancel first)
    const request2 = searchArticles('query2', controller2.signal);

    // Mock successful response for second request
    mockAxios.get.mockResolvedValueOnce({
      data: {
        response: {
          docs: [
            {
              _id: 'test-id-2',
              web_url: 'https://example.com/2',
              snippet: 'Test snippet 2',
              headline: { main: 'Test Headline 2' },
              pub_date: '2023-01-02T00:00:00Z',
              multimedia: null,
              keywords: [],
            },
          ],
        },
      },
    });

    // First request should be aborted
    await expect(request1).rejects.toThrow();
    
    // Second request should complete
    const result = await request2;
    expect(result).toHaveLength(1);
  });

  test('handles cancellation with multiple requests', async () => {
    const controllers = Array.from({ length: 3 }, () => new AbortController());
    
    // Mock axios to return promises that never resolve
    mockAxios.get.mockImplementation(() => new Promise(() => {}));
    
    const requests = controllers.map((controller, index) => 
      searchArticles(`query${index}`, controller.signal)
    );

    // Cancel all requests
    controllers.forEach(controller => controller.abort());

    // All requests should be rejected
    await Promise.all(requests.map(request => 
      expect(request).rejects.toThrow()
    ));
  });

  test('completes request when no cancellation occurs', async () => {
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
