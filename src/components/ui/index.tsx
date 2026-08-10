'use client';

import React, { forwardRef, useEffect, useRef, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle } from 'lucide-react';

// ==========================================
// BUTTON
// ==========================================

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, leftIcon, rightIcon, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-[#105040] text-white hover:bg-[#0A3228] focus:ring-[#105040]',
      secondary: 'bg-[#F4E4EE] text-[#5E1840] hover:bg-[#5E1840] hover:text-white focus:ring-[#5E1840]',
      danger: 'bg-[#9B1C1C] text-white hover:bg-red-800 focus:ring-[#9B1C1C]',
      ghost: 'text-[#384E42] hover:bg-[#B8DCC8]/30 focus:ring-[#105040]',
      outline: 'border border-[#DDD8D4] text-[#384E42] hover:bg-[#FAFAF9] focus:ring-[#105040]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ==========================================
// INPUT
// ==========================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#384E42]">
            {label}
            {props.required && <span className="text-[#9B1C1C] ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[#105040] focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            error ? 'border-[#9B1C1C]' : 'border-[#DDD8D4]',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-[#9B1C1C]">{error}</p>}
        {hint && !error && <p className="text-sm text-[#6A7E70]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ==========================================
// SELECT
// ==========================================

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[#384E42]">
            {label}
            {props.required && <span className="text-[#9B1C1C] ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[#105040] focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            error ? 'border-[#9B1C1C]' : 'border-[#DDD8D4]',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-[#9B1C1C]">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ==========================================
// CARD
// ==========================================

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, padding = 'md', ...props }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div 
      className={cn('bg-white rounded-xl shadow-sm border border-[#DDD8D4]', paddings[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ==========================================
// STAT CARD
// ==========================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#6A7E70]">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-[#081810]">{value}</p>
          {subtitle && <p className="text-sm text-[#6A7E70]">{subtitle}</p>}
          {trend && (
            <p className={cn('text-sm mt-1', trend.value >= 0 ? 'text-[#105040]' : 'text-[#9B1C1C]')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-[#B8DCC8]/30 rounded-lg text-[#105040]">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ==========================================
// BADGE
// ==========================================

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

// ==========================================
// EMPTY STATE
// ==========================================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-[#6A7E70] mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-[#081810]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[#6A7E70] max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ==========================================
// ERROR STATE
// ==========================================

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/**
 * Shown when a data fetch fails, so a failed load is never mistaken for an
 * empty data set. Pass onRetry (e.g. a react-query refetch) to offer a retry.
 */
export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-red-500 mb-4">
        <AlertTriangle className="h-12 w-12" />
      </div>
      <h3 className="text-lg font-medium text-[#081810]">{title || 'Couldn’t load this data'}</h3>
      <p className="mt-1 text-sm text-[#6A7E70] max-w-sm">
        {description || 'Something went wrong loading this page. Check your connection and try again.'}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// LOADING
// ==========================================

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-6 w-6 animate-spin text-[#105040]', className)} />;
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner className="h-8 w-8" />
    </div>
  );
}

// ==========================================
// MODAL
// ==========================================

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, size = 'md', children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape and move focus into the dialog when it opens, so keyboard
  // and screen-reader users aren't stranded. (Effect runs unconditionally;
  // guarded by `open` so the early return below stays legal.)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  // Map to real Tailwind classes. Previously non-'sm' sizes emitted the raw
  // string "md"/"lg" (not a class), so md/lg modals had no max-width and
  // stretched full-width on desktop.
  const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
       <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`relative bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-hidden focus:outline-none ${sizeClass}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD8D4]">
            <h2 className="text-lg font-semibold text-[#081810]">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-[#6A7E70] hover:text-[#384E42]"
            >
              ✕
            </button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-[#DDD8D4] bg-[#FAFAF9] flex justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export { AnimalLink, GuardianLink, AnimalAvatar } from './animal-link';
