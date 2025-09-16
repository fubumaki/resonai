import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PracticeHUD from '../../../components/PracticeHUD';
import { PracticeMetrics, TargetRanges } from '../../../hooks/usePracticeMetrics';

describe('PracticeHUD', () => {
  const mockMetrics: PracticeMetrics = {
    pitch: 300,
    brightness: 0.6,
    confidence: 0.8,
    inRangePercentage: 75,
  };

  const mockTargetRanges: TargetRanges = {
    pitchMin: 200,
    pitchMax: 400,
    brightnessMin: 0.3,
    brightnessMax: 0.7,
  };

  it('renders all metrics when visible', () => {
    render(
      <PracticeHUD 
        metrics={mockMetrics}
        targetRanges={mockTargetRanges}
        isVisible={true}
      />
    );

    expect(screen.getByText('Pitch')).toBeInTheDocument();
    expect(screen.getByText('300 Hz')).toBeInTheDocument();
    expect(screen.getByText('Brightness')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('In Range')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    const { container } = render(
      <PracticeHUD 
        metrics={mockMetrics}
        isVisible={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows correct status for in-range pitch', () => {
    render(
      <PracticeHUD 
        metrics={{ ...mockMetrics, pitch: 300 }}
        targetRanges={mockTargetRanges}
        isVisible={true}
      />
    );

    expect(screen.getByText('In range')).toBeInTheDocument();
  });

  it('shows correct status for low pitch', () => {
    render(
      <PracticeHUD 
        metrics={{ ...mockMetrics, pitch: 150 }}
        targetRanges={mockTargetRanges}
        isVisible={true}
      />
    );

    expect(screen.getByText('Too low')).toBeInTheDocument();
  });

  it('shows correct status for high pitch', () => {
    render(
      <PracticeHUD 
        metrics={{ ...mockMetrics, pitch: 450 }}
        targetRanges={mockTargetRanges}
        isVisible={true}
      />
    );

    expect(screen.getByText('Too high')).toBeInTheDocument();
  });

  it('shows no signal when pitch is null', () => {
    render(
      <PracticeHUD 
        metrics={{ ...mockMetrics, pitch: null }}
        targetRanges={mockTargetRanges}
        isVisible={true}
      />
    );

    expect(screen.getByText('-- Hz')).toBeInTheDocument();
    expect(screen.getByText('No signal')).toBeInTheDocument();
  });

  it('shows target ranges in footer', () => {
    render(
      <PracticeHUD 
        metrics={mockMetrics}
        targetRanges={mockTargetRanges}
        isVisible={true}
      />
    );

    expect(screen.getByText('Target: 200-400 Hz, 30-70% brightness')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <PracticeHUD 
        metrics={mockMetrics}
        isVisible={true}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has proper ARIA attributes', () => {
    render(
      <PracticeHUD 
        metrics={mockMetrics}
        isVisible={true}
      />
    );

    const hud = screen.getByRole('status');
    expect(hud).toHaveAttribute('aria-live', 'polite');
    expect(hud).toHaveAttribute('aria-label', 'Practice metrics');
  });

  it('has proper ARIA labels for metrics', () => {
    render(
      <PracticeHUD 
        metrics={mockMetrics}
        isVisible={true}
      />
    );

    expect(screen.getByLabelText('Current pitch: 300 Hz')).toBeInTheDocument();
    expect(screen.getByLabelText('Current brightness: 60%')).toBeInTheDocument();
    expect(screen.getByLabelText('Analysis confidence: 80%')).toBeInTheDocument();
    expect(screen.getByLabelText('Time in range: 75%')).toBeInTheDocument();
  });

  it('uses default target ranges when not provided', () => {
    render(
      <PracticeHUD 
        metrics={mockMetrics}
        isVisible={true}
      />
    );

    expect(screen.getByText('Target: 200-400 Hz, 30-70% brightness')).toBeInTheDocument();
  });

  it('formats metrics correctly', () => {
    const testMetrics: PracticeMetrics = {
      pitch: 123.456,
      brightness: 0.789,
      confidence: 0.123,
      inRangePercentage: 45.678,
    };

    render(
      <PracticeHUD 
        metrics={testMetrics}
        isVisible={true}
      />
    );

    expect(screen.getByText('123 Hz')).toBeInTheDocument();
    expect(screen.getByText('79%')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('46%')).toBeInTheDocument();
  });
});
