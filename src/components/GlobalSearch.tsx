'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  Users,
  Heart,
  Milk,
  Baby,
  DollarSign,
  BookOpen,
  Shield,
  Loader2,
  Command,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type SearchResultType = 
  | 'animal' 
  | 'health' 
  | 'milk' 
  | 'breeding' 
  | 'transaction' 
  | 'guardian'
  | 'resource';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  icon: typeof Users;
  iconColor: string;
}

// ============================================
// ICON & COLOR MAPPINGS
// ============================================

const TYPE_CONFIG: Record<SearchResultType, { icon: typeof Users; color: string; label: string }> = {
  animal: { icon: Users, color: 'text-primary-600', label: 'Animal' },
  health: { icon: Heart, color: 'text-red-500', label: 'Health Record' },
  milk: { icon: Milk, color: 'text-green-500', label: 'Milk Record' },
  breeding: { icon: Baby, color: 'text-purple-500', label: 'Breeding' },
  transaction: { icon: DollarSign, color: 'text-amber-500', label: 'Transaction' },
  guardian: { icon: Shield, color: 'text-blue-500', label: 'Guardian' },
  resource: { icon: BookOpen, color: 'text-teal-500', label: 'Resource' },
};

// ============================================
// SEARCH DIALOG COMPONENT
// ============================================

interface GlobalSearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearchDialog({ open, onClose }: GlobalSearchDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Fetch all searchable data
  const { data: animals } = useQuery({
    queryKey: ['animals_search'],
    queryFn: async () => {
      const { data } = await supabase
        .from('animals')
        .select('id, name, breed, category, status')
        .eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user && open,
  });

  const { data: healthRecords } = useQuery({
    queryKey: ['health_search'],
    queryFn: async () => {
      const { data } = await supabase
        .from('health_records')
        .select('id, type, treatment, date, animal:animals(id, name)')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!user && open,
  });

  const { data: breedingRecords } = useQuery({
    queryKey: ['breeding_search'],
    queryFn: async () => {
      const { data } = await supabase
        .from('breeding_records')
        .select('id, status, date, due_date, doe:animals!breeding_records_doe_id_fkey(id, name), buck:animals!breeding_records_buck_id_fkey(id, name)')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!user && open,
  });

  const { data: guardians } = useQuery({
    queryKey: ['guardians_search'],
    queryFn: async () => {
      const { data } = await supabase
        .from('guardian_animals')
        .select('id, name, type, breed, status')
        .eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user && open,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions_search'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('id, type, category, description, amount, date')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!user && open,
  });

  // Resource pages (static)
  const resourcePages = [
    { id: 'care-guide', title: 'Care Guide', href: '/dashboard/care-guide' },
    { id: 'breeds', title: 'Breeds', href: '/dashboard/resources/breeds' },
    { id: 'conditions', title: 'Health Conditions', href: '/dashboard/resources/conditions' },
    { id: 'medications', title: 'Medications', href: '/dashboard/resources/medications' },
    { id: 'minerals', title: 'Minerals & Vitamins', href: '/dashboard/resources/minerals' },
    { id: 'herbs', title: 'Herbs & Remedies', href: '/dashboard/resources/herbs' },
    { id: 'essential-oils', title: 'Essential Oils', href: '/dashboard/resources/essential-oils' },
    { id: 'myths', title: 'Myths Debunked', href: '/dashboard/resources/myths' },
  ];

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search animals
    (animals || []).forEach((animal: any) => {
      if (
        animal.name?.toLowerCase().includes(lowerQuery) ||
        animal.breed?.toLowerCase().includes(lowerQuery) ||
        animal.category?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: `animal-${animal.id}`,
          type: 'animal',
          title: animal.name,
          subtitle: `${animal.breed || 'Unknown breed'} • ${animal.category?.replace('_', ' ')}`,
          href: `/dashboard/animals/${animal.id}`,
          icon: TYPE_CONFIG.animal.icon,
          iconColor: TYPE_CONFIG.animal.color,
        });
      }
    });

    // Search health records
    (healthRecords || []).forEach((record: any) => {
      if (
        record.type?.toLowerCase().includes(lowerQuery) ||
        record.treatment?.toLowerCase().includes(lowerQuery) ||
        record.animal?.name?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: `health-${record.id}`,
          type: 'health',
          title: `${record.type} - ${record.animal?.name || 'Unknown'}`,
          subtitle: record.treatment || record.date,
          href: `/dashboard/health`,
          icon: TYPE_CONFIG.health.icon,
          iconColor: TYPE_CONFIG.health.color,
        });
      }
    });

    // Search breeding records
    (breedingRecords || []).forEach((record: any) => {
      const doeName = record.doe?.name || 'Unknown';
      const buckName = record.buck?.name || 'Unknown';
      if (
        doeName.toLowerCase().includes(lowerQuery) ||
        buckName.toLowerCase().includes(lowerQuery) ||
        record.status?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: `breeding-${record.id}`,
          type: 'breeding',
          title: `${doeName} × ${buckName}`,
          subtitle: record.status?.replace('_', ' ') || 'Pending',
          href: `/dashboard/breeding`,
          icon: TYPE_CONFIG.breeding.icon,
          iconColor: TYPE_CONFIG.breeding.color,
        });
      }
    });

    // Search guardians
    (guardians || []).forEach((guardian: any) => {
      if (
        guardian.name?.toLowerCase().includes(lowerQuery) ||
        guardian.type?.toLowerCase().includes(lowerQuery) ||
        guardian.breed?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: `guardian-${guardian.id}`,
          type: 'guardian',
          title: guardian.name,
          subtitle: `${guardian.type || 'Guardian'} • ${guardian.breed || ''}`,
          href: `/dashboard/guardians`,
          icon: TYPE_CONFIG.guardian.icon,
          iconColor: TYPE_CONFIG.guardian.color,
        });
      }
    });

    // Search transactions
    (transactions || []).forEach((tx: any) => {
      if (
        tx.description?.toLowerCase().includes(lowerQuery) ||
        tx.category?.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: `transaction-${tx.id}`,
          type: 'transaction',
          title: tx.description || tx.category,
          subtitle: `$${tx.amount?.toFixed(2)} • ${tx.type}`,
          href: `/dashboard/finances`,
          icon: TYPE_CONFIG.transaction.icon,
          iconColor: TYPE_CONFIG.transaction.color,
        });
      }
    });

    // Search resources
    resourcePages.forEach((page) => {
      if (page.title.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          id: `resource-${page.id}`,
          type: 'resource',
          title: page.title,
          subtitle: 'Resource',
          href: page.href,
          icon: TYPE_CONFIG.resource.icon,
          iconColor: TYPE_CONFIG.resource.color,
        });
      }
    });

    setResults(searchResults.slice(0, 20)); // Limit to 20 results
    setSelectedIndex(0);
    setIsSearching(false);
  }, [query, animals, healthRecords, breedingRecords, guardians, transactions]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, router, onClose]);

  // Click result
  const handleResultClick = (result: SearchResult) => {
    router.push(result.href);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-x-4 top-20 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-50">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search animals, records, resources..."
              className="flex-1 outline-none text-gray-900 placeholder-gray-400"
            />
            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {query && results.length === 0 && !isSearching && (
              <div className="px-4 py-8 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                      index === selectedIndex ? 'bg-primary-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg bg-gray-100', result.iconColor)}>
                      <result.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 uppercase">
                      {TYPE_CONFIG[result.type].label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!query && (
              <div className="px-4 py-6 text-center text-gray-500">
                <p className="text-sm">Start typing to search...</p>
                <p className="text-xs mt-2 text-gray-400">
                  Search animals, health records, breeding, finances, and more
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">↵</kbd>
                select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">esc</kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// SEARCH TRIGGER BUTTON
// ============================================

interface SearchTriggerProps {
  onClick: () => void;
}

export function SearchTrigger({ onClick }: SearchTriggerProps) {
  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClick]);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-xs text-gray-400">
        <Command className="h-3 w-3" />K
      </kbd>
    </button>
  );
}

// ============================================
// HOOK FOR MANAGING SEARCH STATE
// ============================================

export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}
