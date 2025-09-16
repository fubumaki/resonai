import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Orb from '@/components/Orb';

describe('Orb', () => {
  it('renders with accessible label and gradient', () => {
    render(<Orb hueDeg={200} tiltDeg={10} size={80} ariaLabel="Resonance indicator" />);
    expect(screen.getByRole('img', { name: /resonance indicator/i })).toBeInTheDocument();
  });

  it('renders trend chips', () => {
    render(<Orb hueDeg={180} trends={[{ label: 'trend', value: '+3%' }]} />);
    expect(screen.getByText(/trend: \+3%/i)).toBeInTheDocument();
  });
});
