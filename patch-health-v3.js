/**
 * GoatWise Health Center Overhaul Patch v3
 * Uses regex to be whitespace-tolerant
 * Run: node patch-health-v3.js
 */
const fs = require('fs');
const path = require('path');
const fp = path.join(__dirname, 'src', 'app', 'dashboard', 'health', 'page.tsx');
let c = fs.readFileSync(fp, 'utf8');
let ok = true;

function r(pattern, replacement, label) {
  if (typeof pattern === 'string') {
    if (!c.includes(pattern)) { console.error(`❌ ${label}: not found`); ok = false; return; }
    c = c.replace(pattern, replacement);
  } else {
    if (!pattern.test(c)) { console.error(`❌ ${label}: regex not matched`); ok = false; return; }
    c = c.replace(pattern, replacement);
  }
  console.log(`✅ ${label}`);
}

// P1: useMemo
r(/import \{ useState \} from 'react'/, "import { useState, useMemo } from 'react'", 'P1: useMemo');

// P2: lucide icons - add after X,
r(/(\s+X,\s*\n)(\s*\} from 'lucide-react')/, '$1  Search,\n  ArrowUpDown,\n  ArrowUp,\n  ArrowDown,\n  Trash2,\n  Filter,\n$2', 'P2: icons');

// P3: dateRangeOptions before routeOptions
r('const routeOptions = [', `const dateRangeOptions = [\n  { value: '7', label: 'Last 7 days' },\n  { value: '30', label: 'Last 30 days' },\n  { value: '90', label: 'Last 90 days' },\n  { value: '365', label: 'Last year' },\n  { value: 'all', label: 'All time' },\n];\n\nconst routeOptions = [`, 'P3: dateRangeOptions');

// P4: SortableHeader before FAMACHA CARD
r('// FAMACHA CARD COMPONENT', `// SORTABLE TABLE HEADER
// ==========================================

type SortDirection = 'asc' | 'desc' | null;

function SortableHeader({ label, sortKey, currentSort, currentDirection, onSort }: {
  label: string; sortKey: string; currentSort: string | null; currentDirection: SortDirection; onSort: (key: string) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 select-none transition-colors" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (currentDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-primary-600" /> : <ArrowDown className="h-3 w-3 text-primary-600" />) : <ArrowUpDown className="h-3 w-3 text-gray-300" />}
      </div>
    </th>
  );
}

// ==========================================
// FAMACHA CARD COMPONENT`, 'P4: SortableHeader');

// P5: FamachaCard isSelected prop
r(/function FamachaCard\(\{ score, count, onClick \}: \{ score: number; count: number; onClick: \(\) => void \}\)/,
  'function FamachaCard({ score, count, onClick, isSelected }: { score: number; count: number; onClick: () => void; isSelected?: boolean })',
  'P5: isSelected prop');

// P6: FamachaCard styling
r('className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors w-full text-left"',
  "className={`flex items-center gap-3 p-3 rounded-lg border transition-colors w-full text-left ${isSelected ? 'ring-2 ring-primary-500 border-primary-300 bg-primary-50' : 'hover:bg-gray-50'}`}",
  'P6: selection styling');

// P7: New state variables after typeFilter
r(/const \[typeFilter, setTypeFilter\] = useState\('all'\);/,
  `const [typeFilter, setTypeFilter] = useState('all');
  const [animalFilter, setAnimalFilter] = useState('all');
  const [dateRange, setDateRange] = useState('90');
  const [searchQuery, setSearchQuery] = useState('');
  const [famachaFilter, setFamachaFilter] = useState<number | null>(null);
  const [recordSort, setRecordSort] = useState<string | null>(null);
  const [recordSortDir, setRecordSortDir] = useState<SortDirection>(null);
  const [inspectionSort, setInspectionSort] = useState<string | null>(null);
  const [inspectionSortDir, setInspectionSortDir] = useState<SortDirection>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showFollowUpResolve, setShowFollowUpResolve] = useState<any>(null);`,
  'P7: state');

// P8: dynamic dateRange
r(/useHealthRecords\(\{ type: typeFilter, days: 90 \}\)/, 
  "useHealthRecords({ type: typeFilter, days: dateRange === 'all' ? 9999 : parseInt(dateRange) })", 
  'P8: dateRange');

// P9: handlers + filtered data before "Upload photos helper"
r('// Upload photos helper', `// Sort handlers
  const handleRecordSort = (key: string) => {
    if (recordSort === key) { setRecordSortDir(recordSortDir === 'asc' ? 'desc' : recordSortDir === 'desc' ? null : 'asc'); if (recordSortDir === 'desc') setRecordSort(null); }
    else { setRecordSort(key); setRecordSortDir('asc'); }
  };
  const handleInspectionSort = (key: string) => {
    if (inspectionSort === key) { setInspectionSortDir(inspectionSortDir === 'asc' ? 'desc' : inspectionSortDir === 'desc' ? null : 'asc'); if (inspectionSortDir === 'desc') setInspectionSort(null); }
    else { setInspectionSort(key); setInspectionSortDir('asc'); }
  };
  const handleFamachaClick = (score: number) => { if (famachaFilter === score) setFamachaFilter(null); else { setFamachaFilter(score); setActiveTab('inspections'); } };
  const handleAlertClick = (type: string) => { if (type === 'followups' || type === 'withdrawals') setActiveTab('overview'); else if (type === 'deworming') { setFamachaFilter(4); setActiveTab('inspections'); } };
  const handleDeleteRecord = async (id: string) => { try { await supabase.from('health_records').delete().eq('id', id); queryClient.invalidateQueries({ queryKey: ['health-records'] }); queryClient.invalidateQueries({ queryKey: ['follow-ups-due'] }); setShowDeleteConfirm(null); } catch(e) { console.error(e); } };
  const animalOptions = useMemo(() => { const o = [{ value: 'all', label: 'All Animals' }]; if (animals) animals.forEach((a: any) => o.push({ value: a.id, label: a.name })); return o; }, [animals]);
  const filteredRecords = useMemo(() => {
    let recs = healthRecords || [];
    if (animalFilter !== 'all') recs = recs.filter((r: any) => r.animal_id === animalFilter);
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); recs = recs.filter((r: any) => (r.animals?.name||'').toLowerCase().includes(q)||(r.treatment||'').toLowerCase().includes(q)||(r.medication||'').toLowerCase().includes(q)||(r.notes||'').toLowerCase().includes(q)||(r.type||'').toLowerCase().includes(q)); }
    if (recordSort && recordSortDir) { recs = [...recs].sort((a: any, b: any) => { let aV:any, bV:any; switch(recordSort) { case 'date': aV=a.date||''; bV=b.date||''; break; case 'animal': aV=a.animals?.name||''; bV=b.animals?.name||''; break; case 'type': aV=a.type||''; bV=b.type||''; break; case 'cost': aV=a.cost||0; bV=b.cost||0; break; default: return 0; } if (typeof aV==='number') return recordSortDir==='asc'?aV-bV:bV-aV; return recordSortDir==='asc'?String(aV).localeCompare(String(bV)):String(bV).localeCompare(String(aV)); }); }
    return recs;
  }, [healthRecords, animalFilter, searchQuery, recordSort, recordSortDir]);
  const filteredInspections = useMemo(() => {
    let ins = latestInspections || [];
    if (famachaFilter !== null) { if (famachaFilter === 4) ins = ins.filter((i: any) => i.famacha && i.famacha >= 4); else ins = ins.filter((i: any) => i.famacha === famachaFilter); }
    if (inspectionSort && inspectionSortDir) { ins = [...ins].sort((a: any, b: any) => { let aV:any, bV:any; switch(inspectionSort) { case 'date': aV=a.date||''; bV=b.date||''; break; case 'animal': aV=a.animals?.name||''; bV=b.animals?.name||''; break; case 'famacha': aV=a.famacha||0; bV=b.famacha||0; break; case 'bcs': aV=a.body_condition_score||0; bV=b.body_condition_score||0; break; case 'weight': aV=a.weight||0; bV=b.weight||0; break; case 'temp': aV=a.temperature||0; bV=b.temperature||0; break; default: return 0; } if (typeof aV==='number') return inspectionSortDir==='asc'?aV-bV:bV-aV; return inspectionSortDir==='asc'?String(aV).localeCompare(String(bV)):String(bV).localeCompare(String(aV)); }); }
    return ins;
  }, [latestInspections, famachaFilter, inspectionSort, inspectionSortDir]);

  // Upload photos helper`, 'P9: handlers');

// P10: Alert cards - add hover + onClick + CTA text
r('Need attention today', 'Click to review →', 'P10a');
r('Do not use milk/meat', 'Click to review →', 'P10b');
r(/FAMACHA score 4-5/, 'Click to filter inspections →', 'P10c');
r(/border-amber-200 bg-amber-50 p-4">/, 'border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 cursor-pointer" onClick={() => handleAlertClick(\'followups\')}>', 'P10d');
r(/border-red-200 bg-red-50 p-4">/, 'border-red-200 bg-red-50 p-4 hover:bg-red-100 cursor-pointer" onClick={() => handleAlertClick(\'withdrawals\')}>', 'P10e');
r(/border-orange-200 bg-orange-50 p-4">/, 'border-orange-200 bg-orange-50 p-4 hover:bg-orange-100 cursor-pointer" onClick={() => handleAlertClick(\'deworming\')}>', 'P10f');

// P11: FAMACHA cards - helper text + clicks
r('Based on latest inspections</p>', 'Based on latest inspections</p>\n              <p className="text-xs text-gray-400 mt-0.5">Click a score to filter inspections</p>', 'P11a');
r('onClick={() => {}}', 'onClick={() => handleFamachaClick(score)}\n                  isSelected={famachaFilter === score}', 'P11b');

// P12: Enhanced records filters - use regex to match regardless of indent
r(/<Card padding="sm">\s*\n\s*<div className="flex gap-3">\s*\n\s*<Select\s*\n\s*options=\{healthTypeOptions\}\s*\n\s*value=\{typeFilter\}\s*\n\s*onChange=\{\(e\) => setTypeFilter\(e\.target\.value\)\}\s*\n\s*className="w-48"\s*\n\s*\/>\s*\n\s*<\/div>\s*\n\s*<\/Card>/,
  `<Card padding="sm">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Search records..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <Select options={animalOptions} value={animalFilter} onChange={(e) => setAnimalFilter(e.target.value)} className="w-44" />
              <Select options={healthTypeOptions} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-40" />
              <Select options={dateRangeOptions} value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-40" />
              {(searchQuery || animalFilter !== 'all' || typeFilter !== 'all' || dateRange !== '90') && (
                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setAnimalFilter('all'); setTypeFilter('all'); setDateRange('90'); }}>
                  <X className="h-3 w-3 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          </Card>`, 'P12: enhanced filters');

// P13: Sortable record headers - use regex
r(/<th className="px-4 py-3 font-medium">Date<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">Animal<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">Type<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">Treatment<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">Cost<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">Follow-up<\/th>/,
  `<SortableHeader label="Date" sortKey="date" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <SortableHeader label="Animal" sortKey="animal" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <SortableHeader label="Type" sortKey="type" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <th className="px-4 py-3 font-medium">Treatment</th>
                      <SortableHeader label="Cost" sortKey="cost" currentSort={recordSort} currentDirection={recordSortDir} onSort={handleRecordSort} />
                      <th className="px-4 py-3 font-medium">Follow-up</th>
                      <th className="px-4 py-3 font-medium w-10"></th>`, 'P13: sortable headers');

// P13b: use filteredRecords
r('{healthRecords.map((record: any) => (', '{filteredRecords.map((record: any) => (', 'P13b');
r(/(<tr key=\{record\.id\} className="hover:bg-gray-50">)/, '<tr key={record.id} className="group hover:bg-gray-50">', 'P13c: group class');

// P14: Add delete button after follow-up td
r(/<Badge variant="warning">\{formatDate\(record\.follow_up_date\)\}<\/Badge>/,
  '<button onClick={() => setShowFollowUpResolve(record)}><Badge variant="warning" className="cursor-pointer hover:bg-amber-200">{formatDate(record.follow_up_date)}</Badge></button>',
  'P14a: clickable followup');

// Add delete td - find the closing of the follow-up td and tr
r(/(<span className="text-gray-400">—<\/span>\s*\n\s*\)}\s*\n\s*<\/td>\s*\n)(\s*<\/tr>)/,
  `$1                        <td className="px-4 py-1">
                          <button onClick={() => setShowDeleteConfirm(record.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all" title="Delete record">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
$2`, 'P14b: delete button');

// P15: empty state uses filteredRecords
r('!healthRecords?.length', '!filteredRecords?.length', 'P15a');
r('title="No health records"', 'title={searchQuery || animalFilter !== \'all\' ? "No matching records" : "No health records"}', 'P15b');
r(/description="Start tracking your herd's health"/, `description={searchQuery || animalFilter !== 'all' ? "Try adjusting your filters" : "Start tracking your herd's health"}`, 'P15c');

// P16: FAMACHA filter banner before inspections card
r(/\{activeTab === 'inspections' && \(\s*\n\s*<div className="space-y-4">/,
  `{activeTab === 'inspections' && (
        <div className="space-y-4">
          {famachaFilter !== null && (
            <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-4 py-2">
              <p className="text-sm text-primary-700"><Filter className="h-4 w-4 inline mr-1" />Showing FAMACHA score {famachaFilter === 4 ? '4-5' : famachaFilter} only</p>
              <Button variant="ghost" size="sm" onClick={() => setFamachaFilter(null)}><X className="h-3 w-3 mr-1" /> Clear</Button>
            </div>
          )}`, 'P16: FAMACHA banner');

// P16b: use filteredInspections for empty check
r('!latestInspections?.length', '!filteredInspections?.length', 'P16b');

// P17: Sortable inspection headers
r(/<th className="px-4 py-3 font-medium">Date<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">Animal<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">FAMACHA<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">BCS<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">Weight<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">Temp<\/th>\s*\n\s*<th className="px-4 py-3 font-medium">Action<\/th>/,
  `<SortableHeader label="Date" sortKey="date" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="Animal" sortKey="animal" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="FAMACHA" sortKey="famacha" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="BCS" sortKey="bcs" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="Weight" sortKey="weight" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <SortableHeader label="Temp" sortKey="temp" currentSort={inspectionSort} currentDirection={inspectionSortDir} onSort={handleInspectionSort} />
                      <th className="px-4 py-3 font-medium">Action</th>`, 'P17: inspection headers');

// P17b: use filteredInspections.map
r('{latestInspections.map((insp: any) => {', '{filteredInspections.map((insp: any) => {', 'P17b');

// P18: Delete + resolve modals before Add Health Record Modal
r('{/* Add Health Record Modal */}', `{/* Delete Confirmation Modal */}
      <Modal open={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Delete Health Record" size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button><Button variant="danger" onClick={() => showDeleteConfirm && handleDeleteRecord(showDeleteConfirm)}>Delete</Button></>}>
        <p className="text-gray-600">Are you sure you want to delete this health record? This cannot be undone.</p>
      </Modal>

      {/* Follow-Up Resolve Modal */}
      <Modal open={!!showFollowUpResolve} onClose={() => setShowFollowUpResolve(null)} title="Resolve Follow-Up" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowFollowUpResolve(null)}>Cancel</Button>
          <Button variant="ghost" onClick={() => { if (showFollowUpResolve) { setShowFollowUpResolve(null); setNewRecord(prev => ({ ...prev, animal_id: showFollowUpResolve.animal_id })); setShowAddRecordModal(true); } }}>Add New Record</Button>
          <Button onClick={() => { if (showFollowUpResolve) { markComplete.mutate(showFollowUpResolve.id); setShowFollowUpResolve(null); } }} loading={markComplete.isPending}>Mark Complete</Button>
        </>}>
        {showFollowUpResolve && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-medium text-amber-800">{showFollowUpResolve.animals?.name || 'Unknown'} — {showFollowUpResolve.type?.replace('_', ' ')}</p>
              <p className="text-sm text-amber-700 mt-1">{showFollowUpResolve.treatment || showFollowUpResolve.medication || 'No details'}</p>
              <p className="text-xs text-amber-600 mt-1">Original: {formatDate(showFollowUpResolve.date)} • Due: {formatDate(showFollowUpResolve.follow_up_date)}</p>
            </div>
            <p className="text-sm text-gray-600">Mark this follow-up as complete, or add a new health record for this animal.</p>
          </div>
        )}
      </Modal>

      {/* Add Health Record Modal */}`, 'P18: modals');

// WRITE
if (ok) {
  fs.writeFileSync(fp, c, 'utf8');
  console.log(`\n🎉 All patches applied! ${c.split('\n').length} lines`);
  console.log('Run: git add -A && git commit -m "Health Center overhaul" && git push');
} else {
  console.log('\n⚠️ Some failed. File NOT written.');
}
