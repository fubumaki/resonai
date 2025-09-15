import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from '@/components/ProgressBar';

describe('ProgressBar Component', () => {
  const getMeterWidth = () => {
    const meterFill = document.querySelector('.meter-fill');
    return meterFill?.getAttribute('width') || '0';
  };

  it('renders progress bar with correct attributes', () => {
    render(<ProgressBar currentStep={3} totalSteps={10} />);
    
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByText('Step 3 of 10')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(getMeterWidth()).toBe('30');
  });

  it('handles zero progress', () => {
    render(<ProgressBar currentStep={0} totalSteps={5} />);
    
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
    expect(screen.getByText('Step 0 of 5')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(getMeterWidth()).toBe('0');
  });

  it('handles complete progress', () => {
    render(<ProgressBar currentStep={8} totalSteps={8} />);
    
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '8');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '8');
    expect(screen.getByText('Step 8 of 8')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(getMeterWidth()).toBe('100');
  });

  it('clamps negative steps to zero', () => {
    render(<ProgressBar currentStep={-5} totalSteps={10} />);
    
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByText('Step 0 of 10')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(getMeterWidth()).toBe('0');
  });

  it('clamps overflow steps to total', () => {
    render(<ProgressBar currentStep={15} totalSteps={10} />);
    
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '10');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByText('Step 10 of 10')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(getMeterWidth()).toBe('100');
  });

  it('handles invalid total with safe fallback', () => {
    render(<ProgressBar currentStep={5} totalSteps={0} />);
    
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '1');
    expect(screen.getByText('Step 1 of 1')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(getMeterWidth()).toBe('100');
  });

  it('applies custom className', () => {
    render(<ProgressBar currentStep={2} totalSteps={5} className="custom-class" />);
    
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('custom-class');
  });

  it('applies aria-describedby when provided', () => {
    render(<ProgressBar currentStep={3} totalSteps={7} ariaDescribedBy="progress-description" />);
    
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-describedby', 'progress-description');
  });

  it('renders SVG meter with correct dimensions', () => {
    render(<ProgressBar currentStep={4} totalSteps={8} />);
    
    const svg = document.querySelector('.meter-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 100 8');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    
    const background = document.querySelector('.meter-bg');
    expect(background).toHaveAttribute('width', '100');
    expect(background).toHaveAttribute('height', '8');
    
    const fill = document.querySelector('.meter-fill');
    expect(fill).toHaveAttribute('width', '50');
    expect(fill).toHaveAttribute('height', '8');
  });
});
