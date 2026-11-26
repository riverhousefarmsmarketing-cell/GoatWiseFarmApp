'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

// App-wide toast + confirm primitive. Replaces the browser's blocking
// window.alert() / window.confirm():
//   - toast.success/error/info(message)  -> a dismissible, auto-expiring toast
//   - toast.confirm(message | options)   -> a styled modal, returns Promise<boolean>
//
// Mounted once in <Providers>, so useToast() works on any client page or hook.

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

export interface ConfirmOptions {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  /** Styles the confirm button as a destructive (red) action. */
  destructive?: boolean;
}

export interface PromptOptions {
  message: string;
  title?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /** Resolves true if the user confirms, false if they cancel/dismiss. */
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  /** Resolves the entered text, or null if the user cancels/dismisses. */
  prompt: (options: PromptOptions | string) => Promise<string | null>;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { bar: string; icon: ReactNode; role: 'status' | 'alert' }
> = {
  success: {
    bar: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />,
    role: 'status',
  },
  error: {
    bar: 'border-red-200 bg-red-50 text-red-900',
    icon: <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />,
    role: 'alert',
  },
  info: {
    bar: 'border-sky-200 bg-sky-50 text-sky-900',
    icon: <Info className="h-5 w-5 flex-shrink-0 text-sky-600" />,
    role: 'status',
  },
};

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface PromptState extends PromptOptions {
  resolve: (value: string | null) => void;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const idRef = useRef(0);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, variant, message }]);
      // Errors linger a little longer since they usually need reading/acting on.
      const ttl = variant === 'error' ? 6500 : 4000;
      setTimeout(() => dismiss(id), ttl);
    },
    [dismiss]
  );

  const success = useCallback((m: string) => push('success', m), [push]);
  const error = useCallback((m: string) => push('error', m), [push]);
  const info = useCallback((m: string) => push('info', m), [push]);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const resolveConfirm = useCallback(
    (value: boolean) => {
      setConfirmState((prev) => {
        prev?.resolve(value);
        return null;
      });
    },
    []
  );

  const prompt = useCallback((options: PromptOptions | string): Promise<string | null> => {
    const opts = typeof options === 'string' ? { message: options } : options;
    setPromptValue(opts.defaultValue ?? '');
    return new Promise<string | null>((resolve) => {
      setPromptState({ ...opts, resolve });
    });
  }, []);

  const resolvePrompt = useCallback(
    (value: string | null) => {
      setPromptState((prev) => {
        prev?.resolve(value);
        return null;
      });
    },
    []
  );

  // Focus the confirm button and wire Escape -> cancel while the dialog is open.
  useEffect(() => {
    if (!confirmState) return;
    confirmButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolveConfirm(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmState, resolveConfirm]);

  // Focus the input and wire Escape -> cancel while the prompt is open.
  useEffect(() => {
    if (!promptState) return;
    promptInputRef.current?.focus();
    promptInputRef.current?.select();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolvePrompt(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [promptState, resolvePrompt]);

  const api: ToastApi = { success, error, info, confirm, prompt };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast stack */}
      <div
        className="pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4"
        style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        {toasts.map((t) => {
          const v = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              role={v.role}
              aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
              className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${v.bar}`}
            >
              {v.icon}
              <p className="min-w-0 flex-1 whitespace-pre-line text-sm font-medium">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="flex-shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={confirmState.title || 'Confirm'}
          onClick={() => resolveConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              {confirmState.destructive && (
                <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" />
              )}
              <div className="min-w-0">
                {confirmState.title && (
                  <h2 className="text-base font-semibold text-gray-900">{confirmState.title}</h2>
                )}
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                  {confirmState.message}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => resolveConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {confirmState.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                ref={confirmButtonRef}
                onClick={() => resolveConfirm(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  confirmState.destructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmState.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt dialog */}
      {promptState && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={promptState.title || 'Enter a value'}
          onClick={() => resolvePrompt(null)}
        >
          <form
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              resolvePrompt(promptValue);
            }}
          >
            {promptState.title && (
              <h2 className="text-base font-semibold text-gray-900">{promptState.title}</h2>
            )}
            <label className="mt-1 block whitespace-pre-line text-sm text-gray-600">
              {promptState.message}
            </label>
            <input
              ref={promptInputRef}
              type="text"
              value={promptValue}
              placeholder={promptState.placeholder}
              onChange={(e) => setPromptValue(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => resolvePrompt(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {promptState.cancelText || 'Cancel'}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {promptState.confirmText || 'OK'}
              </button>
            </div>
          </form>
        </div>
      )}
    </ToastContext.Provider>
  );
}
