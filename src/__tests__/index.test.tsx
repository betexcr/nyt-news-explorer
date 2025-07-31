import { jest } from '@jest/globals';

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div><div id="app"></div>';
  jest.resetModules();
});

test('bootstraps without crashing', () => {
  jest.isolateModules(() => {
    expect(() => require('../index')).not.toThrow();
  });
});