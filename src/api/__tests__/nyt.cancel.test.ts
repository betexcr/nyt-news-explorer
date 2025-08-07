import { searchArticles } from '../nyt';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NYT API - Cancel Tests', () => {
  beforeEach(() => {
    process.env.REACT_APP_NYT_API_KEY = 'test-api-key';
    jest.clearAllMocks();
  });

  test('handles empty query', async () => {
    const controller = new AbortController();
    
    mockedAxios.get.mockResolvedValue({
      data: {
        status: 'OK',
        copyright: 'Copyright',
        response: {
          docs: [],
          meta: { hits: 0, offset: 0, time: 0 }
        }
      }
    });

    const result = await searchArticles('', controller.signal);
    expect(result).toEqual([]);
  });

  test('aborts request when signal is aborted', async () => {
    const controller = new AbortController();
    
    // Mock axios to reject when aborted
    mockedAxios.get.mockImplementation((url, config) => {
      return new Promise((resolve, reject) => {
        // Check if already aborted
        if (config?.signal?.aborted) {
          const error = new Error('Request aborted');
          error.name = 'AbortError';
          reject(error);
          return;
        }
        
        // Simulate network delay and check for abort
        setTimeout(() => {
          if (config?.signal?.aborted) {
            const error = new Error('Request aborted');
            error.name = 'AbortError';
            reject(error);
          } else {
            resolve({
              data: {
                status: 'OK',
                copyright: 'Copyright',
                response: {
                  docs: [],
                  meta: { hits: 0, offset: 0, time: 0 }
                }
              }
            });
          }
        }, 10);
      });
    });

    // Start request
    const promise = searchArticles('test', controller.signal);
    
    // Abort immediately
    controller.abort();
    
    // Should be rejected
    await expect(promise).rejects.toThrow('Request aborted');
  });
});
