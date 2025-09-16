import { describe, it, expect } from 'vitest';

describe('Confirm Dialog - Simple', () => {
  it('should be importable', () => {
    // This is a simple test to verify the component can be imported
    expect(() => {
      require('../../components/ui/confirm-dialog');
    }).not.toThrow();
  });
});
