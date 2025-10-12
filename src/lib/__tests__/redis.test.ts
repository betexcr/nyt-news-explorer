// Mock Redis client before importing
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));

import { stableHash, ckey } from '../redis';

describe('Redis Utilities', () => {
  describe('stableHash', () => {
    it('should hash strings consistently', () => {
      const input = 'test string';
      const hash1 = stableHash(input);
      const hash2 = stableHash(input);
      expect(hash1).toBe(hash2);
    });

    it('should hash objects consistently regardless of key order', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };
      
      expect(stableHash(obj1)).toBe(stableHash(obj2));
    });

    it('should handle arrays consistently', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      
      expect(stableHash(arr1)).toBe(stableHash(arr2));
    });

    it('should handle nested objects consistently', () => {
      const obj1 = { 
        user: { id: 1, name: 'John' }, 
        query: { q: 'test', page: 0 } 
      };
      const obj2 = { 
        query: { page: 0, q: 'test' }, 
        user: { name: 'John', id: 1 } 
      };
      
      expect(stableHash(obj1)).toBe(stableHash(obj2));
    });

    it('should handle null and undefined', () => {
      expect(stableHash(null)).toBe('null');
      expect(stableHash(undefined)).toBe('null');
    });

    it('should normalize strings', () => {
      expect(stableHash('  Test String  ')).toBe('test string');
      expect(stableHash('Test String')).toBe('test string');
    });

    it('should handle dates consistently', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const hash1 = stableHash(date);
      const hash2 = stableHash(date);
      expect(hash1).toBe(hash2);
    });
  });

  describe('ckey', () => {
    beforeEach(() => {
      // Mock BUILD_ID for consistent testing
      process.env.BUILD_ID = 'test-build-123';
    });

    afterEach(() => {
      // Clean up environment variable
      delete process.env.BUILD_ID;
    });

    it('should create cache key with BUILD_ID prefix', () => {
      const key = ckey(['api', 'v1', 'articles', 'search']);
      expect(key).toBe('BUILD_test-build-123:api:v1:articles:search');
    });

    it('should handle empty parts array', () => {
      const key = ckey([]);
      expect(key).toBe('BUILD_test-build-123:');
    });

    it('should filter out empty parts', () => {
      const key = ckey(['api', '', 'v1', 'search']);
      expect(key).toBe('BUILD_test-build-123:api:v1:search');
    });

    it('should normalize parts', () => {
      const key = ckey(['API', 'V1', 'Articles', 'Search']);
      expect(key).toBe('BUILD_test-build-123:api:v1:articles:search');
    });

    it('should escape colons in parts', () => {
      const key = ckey(['api', 'v1:beta', 'search']);
      expect(key).toBe('BUILD_test-build-123:api:v1\\:beta:search');
    });

    it('should trim whitespace from parts', () => {
      const key = ckey(['  api  ', ' v1 ', ' search ']);
      expect(key).toBe('BUILD_test-build-123:api:v1:search');
    });
  });
});
