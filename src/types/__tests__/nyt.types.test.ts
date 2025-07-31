import type { NytArticle } from '../nyt';

test('NytArticle type is importable', () => {
  const a: Partial<NytArticle> = {};
  expect(a).toBeDefined();
});
