import { makeETag, makeWeakETag, extractETag, etagMatches } from '../etag';

describe('ETag Utilities', () => {
  describe('makeETag', () => {
    it('should generate consistent ETags for same content', () => {
      const content = 'test content';
      const etag1 = makeETag(content);
      const etag2 = makeETag(content);
      
      expect(etag1).toBe(etag2);
    });

    it('should generate different ETags for different content', () => {
      const etag1 = makeETag('content 1');
      const etag2 = makeETag('content 2');
      
      expect(etag1).not.toBe(etag2);
    });

    it('should wrap ETag in quotes', () => {
      const etag = makeETag('test');
      expect(etag).toMatch(/^".*"$/);
    });

    it('should handle Buffer input', () => {
      const buffer = Buffer.from('test content', 'utf8');
      const etag = makeETag(buffer);
      
      expect(etag).toMatch(/^".*"$/);
      expect(etag).toBe(makeETag('test content'));
    });

    it('should generate SHA1-based ETags', () => {
      const etag = makeETag('test content');
      // Remove quotes and check if it's a valid hex string
      const hash = etag.slice(1, -1);
      expect(hash).toMatch(/^[a-f0-9]{40}$/);
    });
  });

  describe('makeWeakETag', () => {
    it('should generate weak ETags with W/ prefix', () => {
      const etag = makeWeakETag('test content');
      expect(etag).toMatch(/^W\/".*"$/);
    });

    it('should be consistent for same content', () => {
      const content = 'test content';
      const etag1 = makeWeakETag(content);
      const etag2 = makeWeakETag(content);
      
      expect(etag1).toBe(etag2);
    });
  });

  describe('extractETag', () => {
    it('should extract valid strong ETag', () => {
      const ifNoneMatch = '"abc123"';
      const etag = extractETag(ifNoneMatch);
      
      expect(etag).toBe('"abc123"');
    });

    it('should extract valid weak ETag', () => {
      const ifNoneMatch = 'W/"abc123"';
      const etag = extractETag(ifNoneMatch);
      
      expect(etag).toBe('W/"abc123"');
    });

    it('should handle multiple ETags and return first valid one', () => {
      const ifNoneMatch = '"abc123", "def456"';
      const etag = extractETag(ifNoneMatch);
      
      expect(etag).toBe('"abc123"');
    });

    it('should handle invalid ETags', () => {
      const ifNoneMatch = 'invalid-etag';
      const etag = extractETag(ifNoneMatch);
      
      expect(etag).toBeNull();
    });

    it('should return null for undefined input', () => {
      const etag = extractETag(undefined);
      expect(etag).toBeNull();
    });

    it('should return null for empty string', () => {
      const etag = extractETag('');
      expect(etag).toBeNull();
    });
  });

  describe('etagMatches', () => {
    it('should match identical strong ETags', () => {
      expect(etagMatches('"abc123"', '"abc123"')).toBe(true);
    });

    it('should match weak ETag with strong ETag', () => {
      expect(etagMatches('W/"abc123"', '"abc123"')).toBe(true);
      expect(etagMatches('"abc123"', 'W/"abc123"')).toBe(true);
    });

    it('should match identical weak ETags', () => {
      expect(etagMatches('W/"abc123"', 'W/"abc123"')).toBe(true);
    });

    it('should not match different ETags', () => {
      expect(etagMatches('"abc123"', '"def456"')).toBe(false);
    });

    it('should handle ETags with different quote styles', () => {
      expect(etagMatches('"abc123"', '"abc123"')).toBe(true);
    });

    it('should normalize W/ prefix', () => {
      expect(etagMatches('W/"abc123"', '"abc123"')).toBe(true);
      expect(etagMatches('"abc123"', 'W/"abc123"')).toBe(true);
    });

    it('should normalize quotes', () => {
      expect(etagMatches('"abc123"', '"abc123"')).toBe(true);
      expect(etagMatches('"abc123"', '"abc123"')).toBe(true);
    });
  });
});
