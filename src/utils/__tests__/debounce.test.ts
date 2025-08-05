import { debounce } from '../debounce';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('debounce delays invocation', () => {
  const fn = jest.fn();
  const d = debounce(fn, 200);
  d(); d();
  expect(fn).not.toHaveBeenCalled();
  jest.advanceTimersByTime(199);
  expect(fn).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledTimes(1);
});

test('debounce only calls once for multiple rapid calls', () => {
  const fn = jest.fn();
  const d = debounce(fn, 100);
  
  d();
  d();
  d();
  
  expect(fn).not.toHaveBeenCalled();
  
  jest.advanceTimersByTime(100);
  expect(fn).toHaveBeenCalledTimes(1);
});

test('debounce resets timer on new calls', () => {
  const fn = jest.fn();
  const d = debounce(fn, 100);
  
  d();
  jest.advanceTimersByTime(50);
  d(); // This should reset the timer
  jest.advanceTimersByTime(50);
  expect(fn).not.toHaveBeenCalled();
  jest.advanceTimersByTime(50);
  expect(fn).toHaveBeenCalledTimes(1);
});
