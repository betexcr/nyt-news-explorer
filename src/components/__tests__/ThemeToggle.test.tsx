import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('../../utils/theme', () => {
  const actual = jest.requireActual('../../utils/theme');
  return { ...actual };
});

import * as theme from '../../utils/theme';
import ThemeToggle from '../ThemeToggle';

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  jest.spyOn(theme, 'initTheme').mockImplementation(() => 'light');
  jest.spyOn(theme, 'setTheme').mockImplementation((t: any) => {
    document.documentElement.setAttribute('data-theme', t);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('toggles theme and sets data-theme', () => {
  render(<ThemeToggle />);
  const btn = screen.getByRole('button', { name: /toggle color theme/i });

  fireEvent.click(btn);
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

  fireEvent.click(btn);
  expect(document.documentElement.getAttribute('data-theme')).toBe('light');
});
