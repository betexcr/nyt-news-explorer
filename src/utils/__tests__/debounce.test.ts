import { debounce } from '../debounce';
jest.useFakeTimers();
test('debounce delays invocation', () => {
  const fn = jest.fn();
  const d = debounce(fn, 200);
  d(); d();
  expect(fn).not.toBeCalled();
  jest.advanceTimersByTime(199);
  expect(fn).not.toBeCalled();
  jest.advanceTimersByTime(1);
  expect(fn).toBeCalledTimes(1);
});
