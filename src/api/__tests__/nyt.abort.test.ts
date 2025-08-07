import { searchArticles } from '../nyt';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NYT API - Abort Signal Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variable for API key
    process.env.REACT_APP_NYT_API_KEY = 'test-api-key';
  });

  test('aborts request when signal is triggered', async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    // Mock axios to check for abort signal
    mockedAxios.get.mockImplementation((url, config) => {
      return new Promise((resolve, reject) => {
        // Check if signal is already aborted
        if (config?.signal?.aborted) {
          const error = new Error('Request aborted');
          error.name = 'AbortError';
          reject(error);
          return;
        }
        
        // Simulate a delay then check if aborted
        setTimeout(() => {
          if (config?.signal?.aborted) {
            const error = new Error('Request aborted');
            error.name = 'AbortError';
            reject(error);
          }
        }, 10);
      });
    });

    // Start the request
    const requestPromise = searchArticles('test query', signal);

    // Abort the request
    controller.abort();

    // Wait for the request to be aborted
    await expect(requestPromise).rejects.toThrow('Request aborted');
  });

  test('handles multiple aborted requests', async () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    // Mock axios to check for abort signal
    mockedAxios.get.mockImplementation((url, config) => {
      return new Promise((resolve, reject) => {
        // Check if signal is already aborted
        if (config?.signal?.aborted) {
          const error = new Error('Request aborted');
          error.name = 'AbortError';
          reject(error);
          return;
        }
        
        // Simulate a delay then check if aborted
        setTimeout(() => {
          if (config?.signal?.aborted) {
            const error = new Error('Request aborted');
            error.name = 'AbortError';
            reject(error);
          }
        }, 10);
      });
    });

    const request1 = searchArticles('query1', controller1.signal);
    const request2 = searchArticles('query2', controller2.signal);

    controller1.abort();
    controller2.abort();

    await expect(request1).rejects.toThrow('Request aborted');
    await expect(request2).rejects.toThrow('Request aborted');
  });

  test('completes request when not aborted', async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    // Mock successful response
    mockedAxios.get.mockResolvedValueOnce({
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
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          q: 'test query',
        }),
        signal,
      })
    );
  });

  test('returns empty array for empty query', async () => {
    const result = await searchArticles('', new AbortController().signal);
    expect(result).toEqual([]);
  });
});
