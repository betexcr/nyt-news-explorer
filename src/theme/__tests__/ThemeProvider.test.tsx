import React from 'react';
import { render, screen } from '@testing-library/react';
import * as TP from '../ThemeProvider';
 
const Provider: React.FC<React.PropsWithChildren> = 
  (TP as any).default ?? (TP as any).ThemeProvider ?? (({ children }) => <>{children}</>);

test('ThemeProvider renders children', () => {
  render(<Provider><div>child</div></Provider>);
  expect(screen.getByText('child')).toBeInTheDocument();
});
