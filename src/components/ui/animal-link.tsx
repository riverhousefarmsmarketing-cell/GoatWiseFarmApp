'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Avatar component for animal initials
function AnimalAvatar({ 
  name, 
  size = 'sm',
  className 
}: { 
  name: string; 
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const initial = name.charAt(0).toUpperCase();
  
  const sizeClasses = {
    xs: 'w-5 h-5 text-xs',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm'
  };
  
  return (
    <span 
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-medium flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {initial}
    </span>
  );
}

// Props for AnimalLink component
interface AnimalLinkProps {
  /** Animal ID for the link */
  animalId: string;
  /** Animal name to display */
  name: string;
  /** Show avatar with initial (default: false) */
  showAvatar?: boolean;
  /** Avatar size when shown */
  avatarSize?: 'xs' | 'sm' | 'md';
  /** Visual variant */
  variant?: 'default' | 'subtle' | 'bold';
  /** Additional text after the name (e.g., breed, category) */
  suffix?: string;
  /** Disable the link (shows plain text) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler (optional, link still works) */
  onClick?: (e: React.MouseEvent) => void;
}

export function AnimalLink({
  animalId,
  name,
  showAvatar = false,
  avatarSize = 'sm',
  variant = 'default',
  suffix,
  disabled = false,
  className,
  onClick
}: AnimalLinkProps) {
  const variantClasses = {
    default: 'text-emerald-600 hover:text-emerald-700 hover:underline',
    subtle: 'text-gray-700 hover:text-emerald-600 hover:underline',
    bold: 'text-emerald-700 font-semibold hover:text-emerald-800 hover:underline'
  };

  // If disabled, render plain text
  if (disabled) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        {showAvatar && <AnimalAvatar name={name} size={avatarSize} />}
        <span className="text-gray-700">{name}</span>
        {suffix && <span className="text-gray-500 text-sm">({suffix})</span>}
      </span>
    );
  }

  return (
    <Link 
      href={`/dashboard/herd/${animalId}`}
      className={cn(
        'inline-flex items-center gap-2 transition-colors',
        variantClasses[variant],
        className
      )}
      onClick={onClick}
    >
      {showAvatar && <AnimalAvatar name={name} size={avatarSize} />}
      <span>{name}</span>
      {suffix && <span className="text-gray-500 text-sm font-normal">({suffix})</span>}
    </Link>
  );
}

// Guardian-specific link component
interface GuardianLinkProps {
  guardianId: string;
  name: string;
  showAvatar?: boolean;
  avatarSize?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'subtle' | 'bold';
  suffix?: string;
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function GuardianLink({
  guardianId,
  name,
  showAvatar = false,
  avatarSize = 'sm',
  variant = 'default',
  suffix,
  disabled = false,
  className,
  onClick
}: GuardianLinkProps) {
  const variantClasses = {
    default: 'text-blue-600 hover:text-blue-700 hover:underline',
    subtle: 'text-gray-700 hover:text-blue-600 hover:underline',
    bold: 'text-blue-700 font-semibold hover:text-blue-800 hover:underline'
  };

  if (disabled) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        {showAvatar && (
          <span className={cn(
            'inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-medium',
            avatarSize === 'xs' ? 'w-5 h-5 text-xs' : avatarSize === 'md' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs'
          )}>
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="text-gray-700">{name}</span>
        {suffix && <span className="text-gray-500 text-sm">({suffix})</span>}
      </span>
    );
  }

  return (
    <Link 
      href={`/dashboard/guardians/${guardianId}`}
      className={cn(
        'inline-flex items-center gap-2 transition-colors',
        variantClasses[variant],
        className
      )}
      onClick={onClick}
    >
      {showAvatar && (
        <span className={cn(
          'inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-medium',
          avatarSize === 'xs' ? 'w-5 h-5 text-xs' : avatarSize === 'md' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs'
        )}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span>{name}</span>
      {suffix && <span className="text-gray-500 text-sm font-normal">({suffix})</span>}
    </Link>
  );
}

// Export the avatar for standalone use
export { AnimalAvatar };
