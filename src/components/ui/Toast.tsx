import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  title?: string;
}

export interface ToastContextValue {
  toasts: Toast[];
  push: (message: string, options?: { tone?: ToastTone; title?: string; duration?: number }) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, options: { tone?: ToastTone; title?: string; duration?: number } = {}) => {
      const id = nextId++;
      const { tone = 'info', title, duration = 5000 } = options;
      setToasts((current) => [...current, { id, message, tone, title }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div className="af-toast-region" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`af-toast af-toast--${toast.tone}`} role="alert">
            <div className="af-toast__icon" aria-hidden="true">
              {toast.tone === 'success' && (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {toast.tone === 'error' && (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z" />
                  <path d="M10 7v4M10 13v.01" strokeLinecap="round" />
                </svg>
              )}
              {toast.tone === 'warning' && (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 3l7 14H3L10 3Z" />
                  <path d="M10 9v4M10 15v.01" strokeLinecap="round" />
                </svg>
              )}
              {toast.tone === 'info' && (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z" />
                  <path d="M10 7v4M10 13v.01" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div className="af-toast__content">
              {toast.title && <h4 className="af-toast__title">{toast.title}</h4>}
              <p className="af-toast__message">{toast.message}</p>
            </div>
            <button
              type="button"
              className="af-toast__close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M5 5l10 10M15 5l-10 10" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}