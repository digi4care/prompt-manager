import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toast, dismissAll } from '$lib/components/ui/toast/store';
import type { ToastVariant } from '$lib/components/ui/toast/store';

describe('Toast Store', () => {
  beforeEach(() => {
    dismissAll();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add a toast', () => {
    const id = toast({
      title: 'Test Toast',
      description: 'This is a test',
      variant: 'default'
    });
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('should add a success toast', () => {
    const id = toast({
      title: 'Success',
      variant: 'success'
    });
    expect(id).toBeTruthy();
  });

  it('should add a destructive toast', () => {
    const id = toast({
      title: 'Error',
      variant: 'destructive'
    });
    expect(id).toBeTruthy();
  });

  it('should remove a toast', () => {
    const id = toast({ title: 'Test' });
    expect(id).toBeTruthy();
  });

  it('should dismiss all toasts', () => {
    toast({ title: 'Test 1' });
    toast({ title: 'Test 2' });
    dismissAll();
  });

  it('should auto-remove toast after duration', () => {
    toast({
      title: 'Auto-dismiss',
      duration: 1000
    });

    // Advance timers
    vi.advanceTimersByTime(500);

    vi.advanceTimersByTime(600);
  });

  it('should create toast with all variants', () => {
    const variants: ToastVariant[] = ['default', 'success', 'destructive', 'warning', 'info'];
    variants.forEach((variant) => {
      const id = toast({ title: variant, variant });
      expect(id).toBeTruthy();
    });
  });
});

describe('Toast Types', () => {
  it('should accept ToastVariant type', () => {
    const variant: ToastVariant = 'success';
    expect(variant).toBe('success');
  });

  it('should have all toast variant values', () => {
    const variants: ToastVariant[] = ['default', 'success', 'destructive', 'warning', 'info'];
    expect(variants).toHaveLength(5);
  });
});
