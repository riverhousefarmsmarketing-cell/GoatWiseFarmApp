'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  Heart,
  Baby,
  Milk,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Folder,
  Shield,
  BookOpen,
  Pill,
  Droplets,
  HelpCircle,
  Sparkles,
  Leaf,
  FlaskConical,
  Warehouse,
MapPin,
  Calendar,
  BarChart3,
  Download,
  Upload,
  Scale,
  Award,
  Package,
  Wrench,
  Sun,
  Megaphone,
  ClipboardList,
  UserPlus,
  ShieldCheck,
  History,
  ArrowLeftRight,
  ListChecks,
  Wheat,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useFarm, ROLE_LABELS } from '@/hooks/useFarm';
import { getSupabaseClient } from '@/lib/supabase';

// Global Search imports
import { GlobalSearchDialog, SearchTrigger, useGlobalSearch } from '@/components/GlobalSearch';

// PRIMARY NAVIGATION - 6 core items only
const primaryNavigation = [
  { 
    name: 'Today', 
    href: '/dashboard', 
    icon: Sun,
    description: 'Dashboard overview'
  },
  { 
    name: 'Herd', 
    href: '/dashboard/herd', 
    icon: Users,
    description: 'Animals & groups',
    subItems: [
      { name: 'All Animals', href: '/dashboard/herd' },
      { name: 'Herd Management', href: '/dashboard/herd-management' },
 { name: 'Groups', href: '/dashboard/groups' },
      { name: 'Grazing', href: '/dashboard/grazing' },
      { name: 'Guardians', href: '/dashboard/guardians' },
    ]
  },
  { 
    name: 'Health', 
    href: '/dashboard/health', 
    icon: Heart,
    description: 'Health records & treatments',
    subItems: [
      { name: 'Health Center', href: '/dashboard/health' },
    ]
  },
  { 
    name: 'Production', 
    href: '/dashboard/milk', 
    icon: Milk,
    description: 'Milk & weight tracking',
    subItems: [
      { name: 'Milk Production', href: '/dashboard/milk' },
      { name: 'Weight Tracking', href: '/dashboard/weight' },
    ]
  },
  { 
    name: 'Breeding', 
    href: '/dashboard/breeding', 
    icon: Calendar,
    description: 'Breeding & kidding',
    subItems: [
      { name: 'Breeding Records', href: '/dashboard/breeding' },
      { name: 'Kidding', href: '/dashboard/kidding' },
    ]
  },
  { 
    name: 'Money', 
    href: '/dashboard/finances', 
    icon: DollarSign,
    description: 'Income & expenses'
  },
];

// FARM - shared with everyone on the farm
const farmNavigation = [
  { name: 'Farm Updates', href: '/dashboard/updates', icon: Megaphone },
  { name: 'Assignments', href: '/dashboard/assignments', icon: ClipboardList },
  { name: 'Chores', href: '/dashboard/chores', icon: ListChecks },
  { name: 'Care Plans', href: '/dashboard/care-plans', icon: Wheat },
  { name: 'Minerals', href: '/dashboard/minerals', icon: Sparkles },
  { name: 'Approvals', href: '/dashboard/approvals', icon: ShieldCheck },
  { name: 'Change History', href: '/dashboard/history', icon: History },
  { name: 'Team', href: '/dashboard/team', icon: UserPlus },
];

// UTILITIES - Secondary features in collapsible drawer
const utilitiesNavigation = [
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Certificates', href: '/dashboard/certificates', icon: Award },
  { name: 'Import', href: '/dashboard/import', icon: Upload },
  { name: 'Export', href: '/dashboard/export', icon: Download },
  { name: 'Feed & Inventory', href: '/dashboard/feed', icon: Package },
];

// RESOURCES - Knowledge base
const resourcesNavigation = [
  { name: 'Care Guide', href: '/dashboard/care-guide', icon: BookOpen },
  { name: 'Breeds', href: '/dashboard/resources/breeds', icon: Users },
  { name: 'Health Conditions', href: '/dashboard/resources/conditions', icon: Heart },
  { name: 'Medications', href: '/dashboard/resources/medications', icon: Pill },
  { name: 'Minerals & Vitamins', href: '/dashboard/resources/minerals', icon: Sparkles },
  { name: 'Herbs & Remedies', href: '/dashboard/resources/herbs', icon: Leaf },
  { name: 'Supplements', href: '/dashboard/resources/supplements', icon: FlaskConical },
  { name: 'Essential Oils', href: '/dashboard/resources/essential-oils', icon: Droplets },
  { name: 'Myths Debunked', href: '/dashboard/resources/myths', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { farm, farms, role, isManager, switchFarm } = useFarm();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Pending deletion requests: owners/managers see how many need a decision.
  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ['deletion_requests', 'pending_count', farm?.farm_id],
    queryFn: async () => {
      const { count } = await (getSupabaseClient() as any)
        .from('deletion_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count ?? 0;
    },
    enabled: !!farm && isManager,
    refetchInterval: 60_000,
  });
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(
    pathname.includes('/resources') || pathname.includes('/care-guide')
  );

  // Global search state
  const { isOpen: searchOpen, open: openSearch, close: closeSearch } = useGlobalSearch();

  const isResourcesActive = pathname.includes('/resources') || pathname.includes('/care-guide');
  const isUtilitiesActive = utilitiesNavigation.some(item => pathname.startsWith(item.href));
  const isAnimalDetailPage = pathname.startsWith('/dashboard/herd/') && pathname !== '/dashboard/herd';

  // Check if a primary nav item or its subitems are active
  const isPrimaryItemActive = (item: typeof primaryNavigation[0]) => {
    if (pathname === item.href) return true;
    if (item.href === '/dashboard/herd' && isAnimalDetailPage) return true;
    if (item.subItems?.some(sub => pathname === sub.href || pathname.startsWith(sub.href + '/'))) return true;
    if (item.href !== '/dashboard' && pathname.startsWith(item.href)) return true;
    return false;
  };

  // Toggle submenu expansion
  const toggleExpanded = (name: string) => {
    setExpandedItem(expandedItem === name ? null : name);
  };

  return (
    <>
      {/* Global Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onClose={closeSearch} />

      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#031812] transform transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
            <div className="w-10 h-10 bg-[#105040] rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🐐</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white font-display">GoatWise</h1>
              <p className="text-xs text-[#E8E0D8]/60">by RiverHouse Farms</p>
            </div>
          </div>

          {/* Current farm + switcher */}
          {farm && (
            <div className="px-6 py-3 border-b border-white/10">
              <p className="text-sm font-medium text-white truncate" title={farm.name}>{farm.name}</p>
              <p className="text-xs text-[#E8E0D8]/60">{role ? ROLE_LABELS[role] : ''}</p>
              {farms.length > 1 && (
                <label className="mt-2 flex items-center gap-2 text-xs text-[#E8E0D8]/80">
                  <ArrowLeftRight className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="sr-only">Switch farm</span>
                  <select
                    value={farm.farm_id}
                    onChange={(e) => switchFarm(e.target.value).catch((err) => alert(err.message))}
                    className="flex-1 min-w-0 bg-white/10 text-white rounded px-2 py-1 text-xs"
                  >
                    {farms.map((f) => (
                      <option key={f.farm_id} value={f.farm_id} className="text-gray-900">
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {/* Search */}
          <div className="px-3 pt-4 pb-2">
            <SearchTrigger onClick={openSearch} />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {/* PRIMARY NAVIGATION */}
            {primaryNavigation.map((item) => {
              const isActive = isPrimaryItemActive(item);
              const isExpanded = expandedItem === item.name;
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <div key={item.name}>
                  {hasSubItems ? (
                    // Item with submenu
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#105040] text-white'
                          : 'text-[#E8E0D8] hover:bg-white/10'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    // Simple link
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#105040] text-white'
                          : 'text-[#E8E0D8] hover:bg-white/10'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )}

                  {/* Submenu items */}
                  {hasSubItems && isExpanded && (
                    <div className="mt-1 ml-4 pl-4 border-l border-white/15 space-y-1">
                      {item.subItems!.map((subItem) => {
                        const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                              isSubActive
                                ? 'bg-[#105040] text-white font-medium'
                                : 'text-[#E8E0D8]/80 hover:bg-white/10 hover:text-[#E8E0D8]'
                            )}
                          >
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="my-3 border-t border-white/10" />

            {/* FARM */}
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#E8E0D8]/50">Farm</p>
            {farmNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const badge = item.href === '/dashboard/approvals' && pendingApprovals > 0 ? pendingApprovals : null;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'bg-[#105040] text-white' : 'text-[#E8E0D8] hover:bg-white/10'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{item.name}</span>
                  {badge !== null && (
                    <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#7E2858] text-white text-xs flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="my-3 border-t border-white/10" />

            {/* UTILITIES DRAWER */}
            <div>
              <button
                onClick={() => setUtilitiesOpen(!utilitiesOpen)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isUtilitiesActive
                    ? 'bg-[#105040] text-white'
                    : 'text-[#E8E0D8] hover:bg-white/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5" />
                  Tools
                </div>
                {utilitiesOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {utilitiesOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-white/15 space-y-1">
                  {utilitiesNavigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                          isActive
                            ? 'bg-[#105040] text-white font-medium'
                            : 'text-[#E8E0D8]/80 hover:bg-white/10 hover:text-[#E8E0D8]'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RESOURCES */}
            <div>
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isResourcesActive
                    ? 'bg-[#105040] text-white'
                    : 'text-[#E8E0D8] hover:bg-white/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5" />
                  Resources
                </div>
                {resourcesOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {resourcesOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-white/15 space-y-1">
                  {resourcesNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                          isActive
                            ? 'bg-[#105040] text-white font-medium'
                            : 'text-[#E8E0D8]/80 hover:bg-white/10 hover:text-[#E8E0D8]'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-white/10 px-3 py-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-[#105040] rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <div className="mt-2 space-y-1">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#E8E0D8] hover:bg-white/10"
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#E8E0D8] hover:bg-white/10"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#FAFAF9]">
      <Sidebar />
      <main className="flex-1 lg:pl-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
