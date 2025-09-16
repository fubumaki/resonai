import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog, useConfirmDialog } from '../../components/ui/confirm-dialog';

// Mock the Button component
vi.mock('../../components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}));

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Dialog',
    description: 'Test description',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: vi.fn(),
    loading: false,
    modal: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with required props', () => {
    render(<ConfirmDialog {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders without description when not provided', () => {
    const { description, ...propsWithoutDescription } = defaultProps;
    render(<ConfirmDialog {...propsWithoutDescription} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);
    
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    
    await user.keyboard('{Escape}');
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking outside modal backdrop', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    
    const backdrop = document.querySelector('.confirm-dialog-backdrop');
    if (backdrop) {
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not render when open is false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows loading state on confirm button', () => {
    render(<ConfirmDialog {...defaultProps} loading={true} />);
    
    const confirmButton = screen.getByText('Loading...');
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
  });

  it('disables cancel button when loading', () => {
    render(<ConfirmDialog {...defaultProps} loading={true} />);
    
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();
  });

  it('applies correct variant to confirm button', () => {
    render(<ConfirmDialog {...defaultProps} confirmVariant="destructive" />);
    
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveAttribute('data-variant', 'destructive');
  });

  it('has proper ARIA attributes', () => {
    render(<ConfirmDialog {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-description');
  });

  it('does not have aria-describedby when no description', () => {
    const { description, ...propsWithoutDescription } = defaultProps;
    render(<ConfirmDialog {...propsWithoutDescription} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('aria-describedby');
  });

  it('traps focus within dialog', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    const confirmButton = screen.getByText('Confirm');
    const cancelButton = screen.getByText('Cancel');
    
    // Focus should start on first focusable element
    expect(document.activeElement).toBe(cancelButton);
    
    // Tab should cycle through buttons
    await user.tab();
    expect(document.activeElement).toBe(confirmButton);
    
    // Tab again should wrap to first button
    await user.tab();
    expect(document.activeElement).toBe(cancelButton);
    
    // Shift+Tab should go backwards
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirmButton);
  });

  it('restores focus to previous element when closed', async () => {
    const user = userEvent.setup();
    
    // Create a button to focus before opening dialog
    const { container } = render(
      <div>
        <button data-testid="before-dialog">Before Dialog</button>
        <ConfirmDialog {...defaultProps} />
      </div>
    );
    
    const beforeButton = screen.getByTestId('before-dialog');
    beforeButton.focus();
    
    // Open dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    
    // Close dialog
    await user.keyboard('{Escape}');
    
    // Focus should be restored
    await waitFor(() => {
      expect(document.activeElement).toBe(beforeButton);
    });
  });

  it('locks body scroll when modal is open', () => {
    render(<ConfirmDialog {...defaultProps} modal={true} />);
    
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('does not lock body scroll when modal is false', () => {
    render(<ConfirmDialog {...defaultProps} modal={false} />);
    
    expect(document.body.style.overflow).toBe('');
  });
});

describe('useConfirmDialog hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides confirm function that returns a promise', async () => {
    const TestComponent = () => {
      const { confirm, ConfirmDialog } = useConfirmDialog();
      
      const handleClick = async () => {
        const result = await confirm({
          title: 'Test',
          onConfirm: vi.fn()
        });
        expect(result).toBe(true);
      };
      
      return (
        <div>
          <button onClick={handleClick}>Open Dialog</button>
          {ConfirmDialog}
        </div>
      );
    };
    
    render(<TestComponent />);
    
    const button = screen.getByText('Open Dialog');
    await userEvent.click(button);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('resolves promise when user confirms', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    
    const TestComponent = () => {
      const { confirm, ConfirmDialog } = useConfirmDialog();
      
      const handleClick = async () => {
        const result = await confirm({
          title: 'Test',
          onConfirm
        });
        expect(result).toBe(true);
        expect(onConfirm).toHaveBeenCalled();
      };
      
      return (
        <div>
          <button onClick={handleClick}>Open Dialog</button>
          {ConfirmDialog}
        </div>
      );
    };
    
    render(<TestComponent />);
    
    const button = screen.getByText('Open Dialog');
    await user.click(button);
    
    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);
  });
});
