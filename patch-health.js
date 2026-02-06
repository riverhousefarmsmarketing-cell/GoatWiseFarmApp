/**
 * GoatWise Health Center Overhaul Patch Script
 * Run: node patch-health.js
 * 
 * Adds: sortable tables, search, animal filter, date range filter,
 * clickable FAMACHA cards, clickable alert cards, follow-up resolve modal,
 * delete records, and result counts.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'health', 'page.tsx');

let content = fs.readFileSync(filePath, 'utf8');

function replace(oldStr, newStr, label) {
  if (!content.includes(oldStr)) {
    console.error(`❌ PATCH FAILED: Could not find text for "${label}"`);
    console.error(`   Looking for: ${oldStr.substring(0, 80)}...`);
    return false;
  }
  content = content.replace(oldStr, newStr);
  console.log(`✅ ${label}`);
  return true;
}

let allOk = true;

// ============================================
// PATCH 1: Add useMemo import
// ============================================
allOk = replace(
  `import { useState } from 'react';`,
  `import { useState, useMemo } from 'react';`,
  'Patch 1: Add useMemo import'
) && allOk;

// ============================================
// PATCH 2: Add new lucide icons
// ============================================
allOk = replace(
  `  Camera,
  X,
} from 'lucide-react';`,
  `  Camera,
  X,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Filter,
} from 'lucide-react';`,
  'Patch 2: Add new lucide icons'
) && allOk;

// ============================================
// PATCH 3: Add dateRangeOptions after healthTypeOptions
// ============================================
allOk = replace(
  `const routeOptions = [`,
  `const dateRangeOptions = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

const routeOptions = [`,
  'Patch 3: Add dateRangeOptions'
) && allOk;

// ============================================
// PATCH 4: Add SortableHeader component before FamachaCard
// ============================================
allOk = replace(
  `// ==========================================
// FAMACHA CARD COMPONENT
// ==========================================`,
  `// ==========================================
// SORTABLE TABLE HEADER
// ==========================================

type SortDirection = 'asc' | 'desc' | null;

function SortableHeader({ 
  label, 
  sortKey, 
  currentSort, 
  currentDirection, 
  onSort 
}: { 
  label: string; 
  sortKey: string; 
  currentSort: string | null; 
  currentDirection: SortDirection; 
  onSort: (key: string) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <th 
      className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 select-none transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-primary-600" />
          ) : (
            <ArrowDown className="h-3 w-3 text-primary-600" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-gray-300" />
        )}
      </div>
    </th>
  );
}

// ==========================================
// FAMACHA CARD COMPONENT
// ==========================================`,
  'Patch 4: Add SortableHeader component'
) && allOk;

// ============================================
// PATCH 5: Add isSelected prop to FamachaCard
// ============================================
allOk = replace(
  `function FamachaCard({ score, count, onClick }: { score: number; count: number; onClick: () => void }) {`,
  `function FamachaCard({ score, count, onClick, isSelected }: { score: number; count: number; onClick: () => void; isSelected?: boolean }) {`,
  'Patch 5: Add isSelected to FamachaCard'
) && allOk;

// ============================================
// PATCH 6: Add selection styling to FamachaCard button
// ============================================
allOk = replace(
  `      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors w-full text-left"`,
  `      className={\`flex items-center gap-3 p-3 rounded-lg border transition-colors w-full text-left \${
        isSelected 
          ? 'ring-2 ring-primary-500 border-primary-300 bg-primary-50' 
          : 'hover:bg-gray-50'
      }\`}`,
  'Patch 6: Add selection styling to FamachaCard'
) && allOk;

// ============================================
// PATCH 7: Add new state variables after typeFilter
// ============================================
allOk = replace(
  `  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);`,
  `  const [typeFilter, setTypeFilter] = useState('all');
  const [animalFilter, setAnimalFilter] = useState('all');
  const [dateRange, setDateRange] = useState('90');
  const [searchQuery, setSearchQuery] = useState('');
  const [famachaFilter, setFamachaFilter] = useState<number | null>(null);
  
  // Sorting state
  const [recordSort, setRecordSort] = useState<string | null>(null);
  const [recordSortDir, setRecordSortDir] = useState<SortDirection>(null);
  const [inspectionSort, setInspectionSort] = useState<string | null>(null);
  const [inspectionSortDir, setInspectionSortDir] = useState<SortDirection>(null);
  
  // Delete/resolve state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showFollowUpResolve, setShowFollowUpResolve] = useState<any>(null);
  
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);`,
  'Patch 7: Add new state variables'
) && allOk;

// ============================================
// PATCH 8: Update useHealthRecords to use dateRange
// ============================================
allOk = replace(
  `const { data: healthRecords, isLoading: recordsLoading } = useHealthRecords({ type: typeFilter, days: 90 });`,
  `const { data: healthRecords, isLoading: recordsLoading } = useHealthRecords({ type: typeFilter, days: dateRange === 'all' ? 9999 : parseInt(dateRange) });`,
  'Patch 8: Dynamic dateRange for useHealthRecords'
) && allOk;

// ============================================
// PATCH 9: Add sort handlers + filtered data after animalsNeedingAttention
// ============================================
allOk = replace(
  `  // Upload photos helper`,
  `  // Sort handlers
  const handleRecordSort = (key: string) => {
    if (recordSort === key) {
      setRecordSortDir(recordSortDir === 'asc' ? 'desc' : recordSortDir === 'desc' ? null : 'asc');
      if (recordSortDir === 'desc') setRecordSort(null);
    } else {
      setRecordSort(key);
      setRecordSortDir('asc');
    }
  };

  const handleInspectionSort = (key: string) => {
    if (inspectionSort === key) {
      setInspectionSortDir(inspectionSortDir === 'asc' ? 'desc' : inspectionSortDir === 'desc' ? null : 'asc');
      if (inspectionSortDir === 'desc') setInspectionSort(null);
    } else {
      setInspectionSort(key);
      setInspectionSortDir('asc');
    }
  };

  // FAMACHA card click handler
  const handleFamachaClick = (score: number) => {
    if (famachaFilter === score) {
      setFamachaFilter(null);
    } else {
      setFamachaFilter(score);
      setActiveTab('inspections');
    }
  };

  // Alert card click handlers
  const handleAlertClick = (type: string) => {
    if (type === 'followups') {
      setActiveTab('overview');
    } else if (type === 'withdrawals') {
      setActiveTab('overview');
    } else if (type === 'deworming') {
      setFamachaFilter(4);
      setActiveTab('inspections');
    }
  };

  // Delete record handler
  const handleDeleteRecord = async (id: string) => {
    try {
      await supabase.from('health_records').delete().eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['health-records'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups-due'] });
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Animal options for filter dropdown
  const animalOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'All Animals' }];
    if (animals) {
      animals.forEach((a: any) => opts.push({ value: a.id, label: a.name }));
    }
    return opts;
  }, [animals]);

  // Filtered + sorted records
  const filteredRecords = useMemo(() => {
    let records = healthRecords || [];
    
    // Animal filter
    if (animalFilter !== 'all') {
      records = records.filter((r: any) => r.animal_id === animalFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      records = records.filter((r: any) => 
        (r.animals?.name || '').toLowerCase().includes(q) ||
        (r.treatment || '').toLowerCase().includes(q) ||
        (r.medication || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q) ||
        (r.type || '').toLowerCase().includes(q)
      );
    }
    
    // Sort
    if (recordSort && recordSortDir) {
      records = [...records].sort((a: any, b: any) => {
        let aVal, bVal;
        switch (recordSort) {
          case 'date': aVal = a.date || ''; bVal = b.date || ''; break;
          case 'animal': aVal = a.animals?.name || ''; bVal = b.animals?.name || ''; break;
          case 'type': aVal = a.type || ''; bVal = b.type || ''; break;
          case 'cost': aVal = a.cost || 0; bVal = b.cost || 0; break;
          default: return 0;
        }
        if (typeof aVal === 'number') return recordSortDir === 'asc' ? aVal - bVal : bVal - aVal;
        return recordSortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
      });
    }
    
    return records;
  }, [healthRecords, animalFilter, searchQuery, recordSort, recordSortDir]);

  // Filtered + sorted inspections
  const filteredInspections = useMemo(() => {
    let inspections = latestInspections || [];
    
    // FAMACHA filter
    if (famachaFilter !== null) {
      if (famachaFilter === 4) {
        inspections = inspections.filter((i: any) => i.famacha && i.famacha >= 4);
      } else {
        inspections = inspections.filter((i: any) => i.famacha === famachaFilter);
      }
    }
    
    // Sort
    if (inspectionSort && inspectionSortDir) {
      inspections = [...inspections].sort((a: any, b: any) => {
        let aVal, bVal;
        switch (inspectionSort) {
          case 'date': aVal = a.date || ''; bVal = b.date || ''; break;
          case 'animal': aVal = a.animals?.name || ''; bVal = b.animals?.name || ''; break;
          case 'famacha': aVal = a.famacha || 0; bVal = b.famacha || 0; break;
          case 'bcs': aVal = a.body_condition_score || 0; bVal = b.body_condition_score || 0; break;
          case 'weight': aVal = a.weight || 0; bVal = b.weight || 0; break;
          case 'temp': aVal = a.temperature || 0; bVal = b.temperature || 0; break;
          default: return 0;
        }
        if (typeof aVal === 'number') return inspectionSortDir === 'asc' ? aVal - bVal : bVal - aVal;
        return inspectionSortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
      });
    }
    
    return inspections;
  }, [latestInspections, famachaFilter, inspectionSort, inspectionSortDir]);

  // Upload photos helper`,
  'Patch 9: Add sort handlers, filter logic, memoized data'
) && allOk;

// ============================================
// PATCH 10: Make alert cards clickable
// ============================================
allOk = replace(
  `          {/* Follow-ups Due */}
          {(followUps?.length || 0) > 0 && (
            <Card className="border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">Follow-ups Due</h3>
                  <p className="text-2xl font-bold text-amber-900">{followUps?.length}</p>
                  <p className="text-sm text-amber-700">Need attention today</p>
                </div>
              </div>
            </Card>
          )}

          {/* Active Withdrawals */}
          {(withdrawals?.length || 0) > 0 && (
            <Card className="border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">Active Withdrawals</h3>
                  <p className="text-2xl font-bold text-red-900">{withdrawals?.length}</p>
                  <p className="text-sm text-red-700">Do not use milk/meat</p>
                </div>
              </div>
            </Card>
          )}

          {/* Animals Needing Attention */}
          {animalsNeedingAttention.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800">Need Deworming</h3>
                  <p className="text-2xl font-bold text-orange-900">{animalsNeedingAttention.length}</p>
                  <p className="text-sm text-orange-700">FAMACHA score 4-5</p>
                </div>
              </div>
            </Card>
          )}`,
  `          {/* Follow-ups Due */}
          {(followUps?.length || 0) > 0 && (
            <button onClick={() => handleAlertClick('followups')} className="text-left w-full">
              <Card className="border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800">Follow-ups Due</h3>
                    <p className="text-2xl font-bold text-amber-900">{followUps?.length}</p>
                    <p className="text-sm text-amber-700">Click to review →</p>
                  </div>
                </div>
              </Card>
            </button>
          )}

          {/* Active Withdrawals */}
          {(withdrawals?.length || 0) > 0 && (
            <button onClick={() => handleAlertClick('withdrawals')} className="text-left w-full">
              <Card className="border-red-200 bg-red-50 p-4 hover:bg-red-100 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800">Active Withdrawals</h3>
                    <p className="text-2xl font-bold text-red-900">{withdrawals?.length}</p>
                    <p className="text-sm text-red-700">Click to review →</p>
                  </div>
                </div>
              </Card>
            </button>
          )}

          {/* Animals Needing Attention */}
          {animalsNeedingAttention.length > 0 && (
            <button onClick={() => handleAlertClick('deworming')} className="text-left w-full">
              <Card className="border-orange-200 bg-orange-50 p-4 hover:bg-orange-100 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Activity className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-800">Need Deworming</h3>
                    <p className="text-2xl font-bold text-orange-900">{animalsNeedingAttention.length}</p>
                    <p className="text-sm text-orange-700">Click to filter inspections →</p>
                  </div>
                </div>
              </Card>
            </button>
          )}`,
  'Patch 10: Make alert cards clickable'
) && allOk;

// ============================================
// PATCH 11: Add isSelected + handler to FAMACHA cards + helper text
// ============================================
allOk = replace(
  `              <p className="text-sm text-gray-500 mt-1">Based on latest inspections</p>
            </div>
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <FamachaCard
                  key={score}
                  score={score}
                  count={famachaDistribution[score] || 0}
                  onClick={() => {}}
                />
              ))}
            </div>`,
  `              <p className="text-sm text-gray-500 mt-1">Based on latest inspections</p>
              <p className="text-xs text-gray-400 mt-0.5">Click a score to filter inspections</p>
            </div>
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <FamachaCard
                  key={score}
                  score={score}
                  count={famachaDistribution[score] || 0}
                  onClick={() => handleFamachaClick(score)}
                  isSelected={famachaFilter === score}
                />
              ))}
            </div>`,
  'Patch 11: Wire up FAMACHA card clicks'
) && allOk;

// ============================================
// PATCH 12: Replace records tab filters with enhanced version
// ============================================
allOk = replace(
  `      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card padding="sm">
            <div className="flex gap-3">
              <Select
                options={healthTypeOptions}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-48"
              />
            </div>
          </Card>`,
  `      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card padding="sm">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <Select
                options={animalOptions}
                value={animalFilter}
                onChange={(e) => setAnimalFilter(e.target.value)}
                className="w-44"
              />
              <Select
                options={healthTypeOptions}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-40"
              />
              <Select
                options={dateRangeOptions}
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-40"
              />
              {(searchQuery || animalFilter !== 'all' || typeFilter !== 'all' || dateRange !== '90') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setAnimalFilter('all');
                    setTypeFilter('all');
                    setDateRange('90');
                  }}
                >
                  <X className="h-3 w-3 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          </Card>`,
  'Patch 12: Enhanced records tab filters'
) && allOk;

// ============================================
// PATCH 13: Replace records table headers with sortable headers
// ============================================
allOk = replace(
  `              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Animal</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Treatment</th>
                      <th className="px-4 py-3 font-medium">Cost</th>
                      <th className="px-4 py-3 font-medium">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {healthRecords.map((record: any) => (
                      <tr key={record.id} className="hover:bg-gray-50">`,
  `              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <SortableHeader label="Date" sortKey="date" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <SortableHeader label="Animal" sortKey="animal" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <SortableHeader label="Type" sortKey="type" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <th className="px-4 py-3 font-medium">Treatment</th>
                      <SortableHeader label="Cost" sortKey="cost" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <th className="px-4 py-3 font-medium">Follow-up</th>
                      <th className="px-4 py-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRecords.map((record: any) => (
                      <tr key={record.id} className="group hover:bg-gray-50">`,
  'Patch 13: Sortable record table headers + use filteredRecords'
) && allOk;

// ============================================
// PATCH 14: Add delete button column + result count to records table
// ============================================
allOk = replace(
  `                        <td className="px-4 py-3">
                          {record.follow_up_date ? (
                            record.follow_up_completed ? (
                              <Badge variant="success">Complete</Badge>
                            ) : (
                              <Badge variant="warning">{formatDate(record.follow_up_date)}</Badge>
                            )
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>`,
  `                        <td className="px-4 py-3">
                          {record.follow_up_date ? (
                            record.follow_up_completed ? (
                              <Badge variant="success">Complete</Badge>
                            ) : (
                              <button onClick={() => setShowFollowUpResolve(record)}>
                                <Badge variant="warning" className="cursor-pointer hover:bg-amber-200">{formatDate(record.follow_up_date)}</Badge>
                              </button>
                            )
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-1">
                          <button
                            onClick={() => setShowDeleteConfirm(record.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                            title="Delete record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
                  Showing {filteredRecords.length} record(s)
                </div>
              </div>`,
  'Patch 14: Add delete button + result count'
) && allOk;

// ============================================
// PATCH 15: Update empty state for records (filter-aware)
// ============================================
allOk = replace(
  `            ) : !healthRecords?.length ? (
              <EmptyState
                icon={<Heart className="h-12 w-12" />}
                title="No health records"
                description="Start tracking your herd's health"
                action={<Button onClick={() => setShowAddRecordModal(true)}>Add Record</Button>}
              />
            ) : (`,
  `            ) : !filteredRecords?.length ? (
              <EmptyState
                icon={<Heart className="h-12 w-12" />}
                title={searchQuery || animalFilter !== 'all' ? "No matching records" : "No health records"}
                description={searchQuery || animalFilter !== 'all' ? "Try adjusting your filters" : "Start tracking your herd's health"}
                action={searchQuery || animalFilter !== 'all' 
                  ? <Button variant="ghost" onClick={() => { setSearchQuery(''); setAnimalFilter('all'); setTypeFilter('all'); }}>Clear Filters</Button>
                  : <Button onClick={() => setShowAddRecordModal(true)}>Add Record</Button>
                }
              />
            ) : (`,
  'Patch 15: Filter-aware empty state'
) && allOk;

// ============================================
// PATCH 16: Add FAMACHA filter banner + sortable headers to inspections tab
// ============================================
allOk = replace(
  `      {activeTab === 'inspections' && (
        <div className="space-y-4">
          <Card padding="none">
            {!latestInspections?.length ? (`,
  `      {activeTab === 'inspections' && (
        <div className="space-y-4">
          {/* FAMACHA Filter Banner */}
          {famachaFilter !== null && (
            <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-4 py-2">
              <p className="text-sm text-primary-700">
                <Filter className="h-4 w-4 inline mr-1" />
                Showing FAMACHA score {famachaFilter === 4 ? '4-5' : famachaFilter} only
              </p>
              <Button variant="ghost" size="sm" onClick={() => setFamachaFilter(null)}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            </div>
          )}
          <Card padding="none">
            {!filteredInspections?.length ? (`,
  'Patch 16: FAMACHA filter banner + use filteredInspections'
) && allOk;

// ============================================
// PATCH 17: Replace inspection table headers with sortable
// ============================================
allOk = replace(
  `              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Animal</th>
                      <th className="px-4 py-3 font-medium">FAMACHA</th>
                      <th className="px-4 py-3 font-medium">BCS</th>
                      <th className="px-4 py-3 font-medium">Weight</th>
                      <th className="px-4 py-3 font-medium">Temp</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {latestInspections.map((insp: any) => {`,
  `              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm text-gray-500">
                    <tr>
                      <SortableHeader label="Date" sortKey="date" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="Animal" sortKey="animal" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="FAMACHA" sortKey="famacha" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="BCS" sortKey="bcs" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="Weight" sortKey="weight" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="Temp" sortKey="temp" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredInspections.map((insp: any) => {`,
  'Patch 17: Sortable inspection headers + use filteredInspections'
) && allOk;

// ============================================
// PATCH 18: Add result count to inspections table
// ============================================
allOk = replace(
  `                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Add Health Record Modal */}`,
  `                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
                  Showing {filteredInspections.length} inspection(s)
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Health Record"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => showDeleteConfirm && handleDeleteRecord(showDeleteConfirm)}>Delete</Button>
          </>
        }
      >
        <p className="text-gray-600">Are you sure you want to delete this health record? This action cannot be undone.</p>
      </Modal>

      {/* Follow-Up Resolve Modal */}
      <Modal
        open={!!showFollowUpResolve}
        onClose={() => setShowFollowUpResolve(null)}
        title="Resolve Follow-Up"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowFollowUpResolve(null)}>Cancel</Button>
            <Button 
              variant="ghost"
              onClick={() => {
                if (showFollowUpResolve) {
                  setShowFollowUpResolve(null);
                  setNewRecord(prev => ({ ...prev, animal_id: showFollowUpResolve.animal_id }));
                  setShowAddRecordModal(true);
                }
              }}
            >
              Add New Record
            </Button>
            <Button 
              onClick={() => {
                if (showFollowUpResolve) {
                  markComplete.mutate(showFollowUpResolve.id);
                  setShowFollowUpResolve(null);
                }
              }}
              loading={markComplete.isPending}
            >
              Mark Complete
            </Button>
          </>
        }
      >
        {showFollowUpResolve && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-medium text-amber-800">
                {showFollowUpResolve.animals?.name || 'Unknown'} — {showFollowUpResolve.type?.replace('_', ' ')}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {showFollowUpResolve.treatment || showFollowUpResolve.medication || 'No details'}
                {showFollowUpResolve.dosage && \` (\${showFollowUpResolve.dosage} \${showFollowUpResolve.dosage_unit})\`}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Original date: {formatDate(showFollowUpResolve.date)} • Follow-up due: {formatDate(showFollowUpResolve.follow_up_date)}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              You can mark this follow-up as complete, or add a new health record for this animal.
            </p>
          </div>
        )}
      </Modal>

      {/* Add Health Record Modal */}`,
  'Patch 18: Add delete + follow-up resolve modals, inspection count'
) && allOk;

// ============================================
// WRITE FILE
// ============================================
if (allOk) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('\n🎉 All patches applied successfully!');
  console.log(`📄 File written: ${filePath}`);
  console.log(`📏 New size: ${content.length} characters`);
  console.log('\nNext steps:');
  console.log('  git add -A');
  console.log('  git commit -m "Health Center overhaul: sorting, filtering, search, FAMACHA drill-down, follow-up resolve"');
  console.log('  git push');
} else {
  console.log('\n⚠️ Some patches failed. File was NOT modified.');
  console.log('The file structure may have changed from what was expected.');
}
