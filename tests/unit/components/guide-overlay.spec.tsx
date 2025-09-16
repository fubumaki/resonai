import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GuideOverlay from '@/components/GuideOverlay';

describe('GuideOverlay', () => {
  beforeEach(() => {
    // Mock speechSynthesis in JSDOM
    (global as any).speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
    };
  });

  it('renders button and toggles panel', () => {
    render(<GuideOverlay text="Try speaking at a steady pitch" />);
    const toggle = screen.getByRole('button', { name: /guide voice/i });
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByRole('region', { name: /guide voice controls/i })).toBeInTheDocument();
  });
});


