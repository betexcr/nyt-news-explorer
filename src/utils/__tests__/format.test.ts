import { formatDate } from '../format';
test('formats ISO date', () => {
  const out = formatDate('2024-01-02T00:00:00Z');
  expect(out).toBeTruthy();
});
test('empty or invalid returns empty string', () => {
  expect(formatDate('')).toBe('');
  expect(formatDate('no')).toBe('');
});
