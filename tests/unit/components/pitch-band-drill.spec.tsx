import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PitchBandDrill from '@/components/drills/PitchBandDrill';

describe('PitchBandDrill', () => {
  it('renders waiting state', () => {
    render(<PitchBandDrill targetHz={200} toleranceHz={10} currentHz={null} />);
    expect(screen.getByText(/waiting for pitch/i)).toBeInTheDocument();
  });

  it('announces in-band', () => {
    render(<PitchBandDrill targetHz={200} toleranceHz={10} currentHz={205} />);
    expect(screen.getByRole('status')).toHaveTextContent(/in band/i);
  });

  it('announces out-of-band', () => {
    render(<PitchBandDrill targetHz={200} toleranceHz={10} currentHz={225} />);
    expect(screen.getByRole('status')).toHaveTextContent(/out of band/i);
  });
});


