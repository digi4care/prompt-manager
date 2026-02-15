import { writable } from 'svelte/store';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

interface ToastStore {
  toasts: Toast[];
}

function createToastStore() {
  const { subscribe, update } = writable<ToastStore>({ toasts: [] });

  function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  function removeToast(id: string) {
    update((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  }

  return {
    subscribe,
    add: (toast: Omit<Toast, 'id'>) => {
      const id = generateId();
      const newToast: Toast = {
        id,
        duration: 5000,
        ...toast,
      };

      update((state) => ({
        toasts: [...state.toasts, newToast],
      }));

      // Auto-remove after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    remove: (id: string) => {
      removeToast(id);
    },
    dismiss: () => {
      update(() => ({ toasts: [] }));
    },
  };
}

export const toasts = createToastStore();

export function toast(options: Omit<Toast, 'id'>) {
  return toasts.add(options);
}

export function dismissAll() {
  return toasts.dismiss();
}
