'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DecisionSignal, 
  DecisionSeverity, 
  SEVERITY_CONFIG,
  SYSTEM_ICONS,
} from '@/lib/decisionLayer/types';

// ============================================
// SINGLE SIGNAL CARD
// ============================================
interface DecisionSignalCardProps {
  signal: DecisionSignal;
  compact?: boolean;
  dismissable?: boolean;
  onDismiss?: (id: string) => void;
}

export function DecisionSignalCard({ 
  signal, 
  compact = false,
  dismissable = false,
  onDismiss,
}: DecisionSignalCardProps) {
  const config = SEVERITY_CONFIG[signal.severity];
  
  const SeverityIcon = {
    normal: CheckCircle,
    watching: Info,
    attention: AlertCircle,
    action: AlertTriangle,
  }[signal.severity];

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg border',
        config.color
      )}>
        <span className="text-lg">{config.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', config.textColor)}>
            {signal.animalName ? `${signal.animalName}: ` : ''}{signal.title}
          </p>
        </div>
        {signal.ctaHref && (
          <Link 
            href={signal.ctaHref}
            className={cn('text-xs font-medium hover:underline', config.textColor)}
          >
            View →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg border p-4',
      config.color
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', config.iconColor)}>
          <SeverityIcon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{SYSTEM_ICONS[signal.system]}</span>
            <h4 className={cn('font-semibold', config.textColor)}>
              {signal.title}
            </h4>
            {signal.animalName && (
              <span className={cn('text-sm', config.textColor)}>
                — {signal.animalName}
              </span>
            )}
          </div>
          
          {/* Primary text */}
          <p className={cn('text-sm', config.textColor)}>
            {signal.primaryText}
          </p>
          
          {/* Secondary text */}
          {signal.secondaryText && (
            <p className={cn('text-sm mt-1 opacity-80', config.textColor)}>
              {signal.secondaryText}
            </p>
          )}
          
          {/* Evidence */}
          {signal.evidence && (
            <p className={cn('text-xs mt-2 font-mono opacity-70', config.textColor)}>
              {signal.evidence}
            </p>
          )}
          
          {/* CTA */}
          {signal.cta && signal.ctaHref && (
            <Link 
              href={signal.ctaHref}
              className={cn(
                'inline-flex items-center gap-1 mt-3 text-sm font-medium hover:underline',
                config.textColor
              )}
            >
              {signal.cta}
            </Link>
          )}
          
          {/* Disclaimer for action severity */}
          {signal.severity === 'action' && (
            <p className={cn('text-xs mt-3 opacity-60 italic', config.textColor)}>
              {SEVERITY_CONFIG.action.disclaimer}
            </p>
          )}
        </div>
        
        {/* Dismiss button */}
        {dismissable && onDismiss && (
          <button
            onClick={() => onDismiss(signal.id)}
            className={cn('p-1 rounded hover:bg-white/50', config.textColor)}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// SIGNAL LIST (Multiple signals)
// ============================================
interface DecisionSignalListProps {
  signals: DecisionSignal[];
  title?: string;
  maxVisible?: number;
  compact?: boolean;
  showEmpty?: boolean;
  emptyMessage?: string;
}

export function DecisionSignalList({
  signals,
  title,
  maxVisible = 5,
  compact = false,
  showEmpty = false,
  emptyMessage = "Everything looks good!",
}: DecisionSignalListProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Sort by severity (action first, then attention, watching, normal)
  const sortedSignals = [...signals].sort((a, b) => {
    const order = { action: 0, attention: 1, watching: 2, normal: 3 };
    return order[a.severity] - order[b.severity];
  });
  
  const visibleSignals = expanded ? sortedSignals : sortedSignals.slice(0, maxVisible);
  const hasMore = sortedSignals.length > maxVisible;
  
  // Count by severity
  const counts = {
    action: signals.filter(s => s.severity === 'action').length,
    attention: signals.filter(s => s.severity === 'attention').length,
    watching: signals.filter(s => s.severity === 'watching').length,
    normal: signals.filter(s => s.severity === 'normal').length,
  };

  if (signals.length === 0 && !showEmpty) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-2">
            {counts.action > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                🔴 {counts.action}
              </span>
            )}
            {counts.attention > 0 && (
              <span className="flex items-center gap-1 text-xs text-orange-600">
                🟠 {counts.attention}
              </span>
            )}
            {counts.watching > 0 && (
              <span className="flex items-center gap-1 text-xs text-yellow-600">
                🟡 {counts.watching}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {signals.length === 0 && showEmpty && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
          <span className="text-lg">🟢</span>
          <p className="text-sm text-green-700">{emptyMessage}</p>
        </div>
      )}
      
      {/* Signal cards */}
      <div className="space-y-2">
        {visibleSignals.map((signal) => (
          <DecisionSignalCard 
            key={signal.id} 
            signal={signal} 
            compact={compact}
          />
        ))}
      </div>
      
      {/* Show more/less */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show {sortedSignals.length - maxVisible} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================
// SUMMARY BAR (For dashboard header)
// ============================================
interface DecisionSummaryBarProps {
  signals: DecisionSignal[];
  onClick?: () => void;
}

export function DecisionSummaryBar({ signals, onClick }: DecisionSummaryBarProps) {
  const actionCount = signals.filter(s => s.severity === 'action').length;
  const attentionCount = signals.filter(s => s.severity === 'attention').length;
  const watchingCount = signals.filter(s => s.severity === 'watching').length;
  
  // Determine overall status
  let overallSeverity: DecisionSeverity = 'normal';
  if (actionCount > 0) overallSeverity = 'action';
  else if (attentionCount > 0) overallSeverity = 'attention';
  else if (watchingCount > 0) overallSeverity = 'watching';
  
  const config = SEVERITY_CONFIG[overallSeverity];
  
  if (signals.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
        <span className="text-xl">🟢</span>
        <div>
          <p className="font-medium text-green-800">All Clear</p>
          <p className="text-sm text-green-700">{SEVERITY_CONFIG.normal.primaryText}</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-3 rounded-lg border text-left transition-colors hover:opacity-90',
        config.color
      )}
    >
      <span className="text-2xl">{config.emoji}</span>
      <div className="flex-1">
        <p className={cn('font-medium', config.textColor)}>
          {actionCount > 0 && `${actionCount} action needed`}
          {actionCount === 0 && attentionCount > 0 && `${attentionCount} need attention`}
          {actionCount === 0 && attentionCount === 0 && watchingCount > 0 && `${watchingCount} worth watching`}
        </p>
        <p className={cn('text-sm opacity-80', config.textColor)}>
          {config.primaryText}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {actionCount > 0 && <span className="text-sm">🔴 {actionCount}</span>}
        {attentionCount > 0 && <span className="text-sm">🟠 {attentionCount}</span>}
        {watchingCount > 0 && <span className="text-sm">🟡 {watchingCount}</span>}
        <ChevronDown className={cn('h-5 w-5', config.textColor)} />
      </div>
    </button>
  );
}

// ============================================
// ANIMAL STATUS BADGE (For animal cards/profiles)
// ============================================
interface AnimalStatusBadgeProps {
  signals: DecisionSignal[];
  animalId: string;
}

export function AnimalStatusBadge({ signals, animalId }: AnimalStatusBadgeProps) {
  const animalSignals = signals.filter(s => s.animalId === animalId);
  
  if (animalSignals.length === 0) {
    return <span className="text-lg" title="No issues">🟢</span>;
  }
  
  // Get highest severity
  const hasAction = animalSignals.some(s => s.severity === 'action');
  const hasAttention = animalSignals.some(s => s.severity === 'attention');
  const hasWatching = animalSignals.some(s => s.severity === 'watching');
  
  let emoji = '🟢';
  let title = 'Normal';
  
  if (hasAction) {
    emoji = '🔴';
    title = `${animalSignals.filter(s => s.severity === 'action').length} action needed`;
  } else if (hasAttention) {
    emoji = '🟠';
    title = `${animalSignals.filter(s => s.severity === 'attention').length} need attention`;
  } else if (hasWatching) {
    emoji = '🟡';
    title = `${animalSignals.filter(s => s.severity === 'watching').length} worth watching`;
  }
  
  return (
    <span className="text-lg cursor-help" title={title}>
      {emoji}
    </span>
  );
}
