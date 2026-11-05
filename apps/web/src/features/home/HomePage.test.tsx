import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';

test('home renders the app title', () => {
  render(<HomePage />);
  expect(screen.getByRole('heading', { level: 1, name: 'Patient Registry' })).toBeInTheDocument();
});
