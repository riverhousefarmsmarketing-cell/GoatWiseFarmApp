/**
 * GoatWise "Something's Wrong" Flow Patch v2
 * Fixed string matching for Christine's actual file
 * Run: node patch-sw-v2.js
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

// P1: conditions imports (if not already added)
if (!c.includes("from '@/data/resources'")) {
  r("import { formatDate, getFamachaColor, getFamachaStatus } from '@/lib/utils';",
    `import { formatDate, getFamachaColor, getFamachaStatus } from '@/lib/utils';
import {
  conditions as allConditions,
  getConditionsBySymptomTag,
  searchConditions,
  SEVERITY_COLORS,
  SYMPTOM_TAG_LABELS,
  type ConditionEntry,
  type SymptomTag,
} from '@/data/resources';`,
    'P1: conditions imports');
} else { console.log('✅ P1: already done'); }

// P2: new icons (if not already added)
if (!c.includes('HelpCircle')) {
  r("Filter,\n} from 'lucide-react';",
    `Filter,
  HelpCircle,
  BookOpen,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';`,
    'P2: icons');
} else { console.log('✅ P2: already done'); }

// P3: symptom tiles - use regex to match the OPTIONS section header
r(/const healthTypeOptions = \[/,
  `// ==========================================
// SYMPTOM TILES for "Something's Wrong" flow
// ==========================================

const symptomTiles: { tag: SymptomTag; icon: string; label: string; color: string }[] = [
  { tag: 'pale-eyelids-anemia', icon: '👁️', label: 'Pale eyelids', color: 'bg-red-50 border-red-200 hover:bg-red-100' },
  { tag: 'off-feed-lethargy', icon: '😴', label: 'Off feed / Tired', color: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
  { tag: 'diarrhea-scours', icon: '💩', label: 'Diarrhea', color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' },
  { tag: 'bloat', icon: '🎈', label: 'Bloated belly', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
  { tag: 'coughing-nasal', icon: '🤧', label: 'Coughing / Runny nose', color: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100' },
  { tag: 'limping', icon: '🦶', label: 'Limping', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { tag: 'fever', icon: '🌡️', label: 'Feels hot / Fever', color: 'bg-orange-50 border-orange-200 hover:bg-orange-100' },
  { tag: 'skin-coat', icon: '🐐', label: 'Skin / Coat issues', color: 'bg-green-50 border-green-200 hover:bg-green-100' },
  { tag: 'post-kidding', icon: '🍼', label: 'Post-kidding issue', color: 'bg-pink-50 border-pink-200 hover:bg-pink-100' },
  { tag: 'weight-loss', icon: '📉', label: 'Losing weight', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
  { tag: 'swelling', icon: '🫧', label: 'Swelling', color: 'bg-teal-50 border-teal-200 hover:bg-teal-100' },
  { tag: 'neurological', icon: '🧠', label: 'Acting strange', color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
];

const severityBadgeColors: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800 border-red-300',
  serious: 'bg-orange-100 text-orange-800 border-orange-300',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  common: 'bg-green-100 text-green-800 border-green-300',
};

const healthTypeOptions = [`,
  'P3: symptom tiles');

// P4: state (if not already added)
if (!c.includes('showSomethingsWrong')) {
  r("const [showFollowUpResolve, setShowFollowUpResolve] = useState<any>(null);",
    `const [showFollowUpResolve, setShowFollowUpResolve] = useState<any>(null);
  const [showSomethingsWrong, setShowSomethingsWrong] = useState(false);
  const [swStep, setSwStep] = useState<'symptoms' | 'results'>('symptoms');
  const [swSelectedSymptoms, setSwSelectedSymptoms] = useState<SymptomTag[]>([]);
  const [swMatchedConditions, setSwMatchedConditions] = useState<ConditionEntry[]>([]);
  const [swExpandedCondition, setSwExpandedCondition] = useState<number | null>(null);
  const [swAnimalId, setSwAnimalId] = useState('');`,
    'P4: state');
} else { console.log('✅ P4: already done'); }

// P5: handlers (if not already added)
if (!c.includes('handleSwOpen')) {
  r("const animalOptions = useMemo(",
    `// "Something's Wrong" handlers
  const handleSwOpen = () => {
    setShowSomethingsWrong(true); setSwStep('symptoms'); setSwSelectedSymptoms([]); setSwMatchedConditions([]); setSwExpandedCondition(null); setSwAnimalId('');
  };
  const handleSwToggleSymptom = (tag: SymptomTag) => {
    setSwSelectedSymptoms(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const handleSwFindMatches = () => {
    const matchMap = new Map<number, ConditionEntry>();
    swSelectedSymptoms.forEach(tag => { getConditionsBySymptomTag(tag).forEach(cond => matchMap.set(cond.id, cond)); });
    const matches = Array.from(matchMap.values()).sort((a, b) => {
      const sev: Record<string, number> = { emergency: 0, serious: 1, moderate: 2, common: 3 };
      if ((sev[a.severity]??9) !== (sev[b.severity]??9)) return (sev[a.severity]??9) - (sev[b.severity]??9);
      return b.symptomTags.filter(t => swSelectedSymptoms.includes(t)).length - a.symptomTags.filter(t => swSelectedSymptoms.includes(t)).length;
    });
    setSwMatchedConditions(matches); setSwStep('results');
  };
  const handleSwCreateRecord = (type: string, conditionName?: string) => {
    setShowSomethingsWrong(false);
    const sympLabels = swSelectedSymptoms.map(s => SYMPTOM_TAG_LABELS[s]).join(', ');
    setNewRecord(prev => ({ ...prev, animal_id: swAnimalId, type: type as any, notes: conditionName ? 'Suspected: ' + conditionName + '. Symptoms: ' + sympLabels : 'Symptoms noted: ' + sympLabels, date: new Date().toISOString().split('T')[0] }));
    setShowAddRecordModal(true);
  };

  const animalOptions = useMemo(`,
    'P5: handlers');
} else { console.log('✅ P5: already done'); }

// P6: header button - use regex to match the flex gap-2 div before New Inspection
r(/(<div className="flex gap-2">\s*\n\s*<Button\s*\n\s*variant="secondary"\s*\n\s*leftIcon=\{<ClipboardCheck)/,
  `<div className="flex gap-2">
          <Button
            variant="ghost"
            leftIcon={<HelpCircle className="h-4 w-4" />}
            onClick={handleSwOpen}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            Something&apos;s wrong
          </Button>
          <Button
            variant="secondary"
            leftIcon={<ClipboardCheck`,
  'P6: header button');

// P7: modal - insert before Add Health Record Modal
r('{/* Add Health Record Modal */}',
  `{/* "Something's Wrong" Triage Flow */}
      <Modal
        open={showSomethingsWrong}
        onClose={() => setShowSomethingsWrong(false)}
        title={swStep === 'symptoms' ? "What are you seeing?" : swMatchedConditions.length + ' possible match' + (swMatchedConditions.length !== 1 ? 'es' : '')}
        size="lg"
        footer={
          swStep === 'symptoms' ? (
            <>
              <Button variant="ghost" onClick={() => setShowSomethingsWrong(false)}>Cancel</Button>
              <Button onClick={handleSwFindMatches} disabled={swSelectedSymptoms.length === 0}>
                Find Matches ({swSelectedSymptoms.length} selected)
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={() => setSwStep('symptoms')}>Back to symptoms</Button>
              <Button variant="ghost" onClick={() => handleSwCreateRecord('observation')}>Log as Observation</Button>
            </>
          )
        }
      >
        <div className="max-h-[65vh] overflow-y-auto">
          {swStep === 'symptoms' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Which animal? (optional)</label>
                <Select options={animalOptions} value={swAnimalId} onChange={(e) => setSwAnimalId(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What symptoms are you seeing? Select all that apply:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {symptomTiles.map((tile) => {
                    const isSel = swSelectedSymptoms.includes(tile.tag);
                    return (
                      <button key={tile.tag} onClick={() => handleSwToggleSymptom(tile.tag)}
                        className={'flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all ' + (isSel ? 'ring-2 ring-primary-500 border-primary-300 bg-primary-50 font-medium' : tile.color)}>
                        <span className="text-lg">{tile.icon}</span>
                        <span>{tile.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {swSelectedSymptoms.length > 0 && (
                <p className="text-sm text-primary-600 font-medium">{swSelectedSymptoms.length} symptom{swSelectedSymptoms.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          {swStep === 'results' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1 mb-2">
                {swSelectedSymptoms.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{SYMPTOM_TAG_LABELS[tag]}</span>
                ))}
              </div>

              {swMatchedConditions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No matching conditions found.</p>
                  <p className="text-sm mt-1">Try different symptoms, or log an Observation record.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 italic">Educational reference only — not a diagnosis. Always consult a veterinarian.</p>
                  {swMatchedConditions.map((cond) => {
                    const isExp = swExpandedCondition === cond.id;
                    const matchCount = cond.symptomTags.filter(t => swSelectedSymptoms.includes(t)).length;
                    return (
                      <div key={cond.id} className={'border rounded-lg overflow-hidden ' + (cond.severity === 'emergency' ? 'border-red-300' : 'border-gray-200')}>
                        <button onClick={() => setSwExpandedCondition(isExp ? null : cond.id)}
                          className={'w-full text-left p-3 flex items-center justify-between hover:bg-gray-50 ' + (cond.severity === 'emergency' ? 'bg-red-50' : '')}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">{cond.name}</span>
                              <span className={'text-xs px-2 py-0.5 rounded-full border ' + (severityBadgeColors[cond.severity] || 'bg-gray-100 text-gray-600')}>{cond.severity}</span>
                              <span className="text-xs text-gray-400">{matchCount}/{swSelectedSymptoms.length} symptoms match</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{cond.summary}</p>
                          </div>
                          {isExp ? <ChevronUp className="h-4 w-4 text-gray-400 ml-2" /> : <ChevronDown className="h-4 w-4 text-gray-400 ml-2" />}
                        </button>
                        {isExp && (
                          <div className="border-t p-3 bg-gray-50 space-y-3">
                            <div>
                              <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">What you might notice</h4>
                              <ul className="text-sm text-gray-600 space-y-0.5">
                                {cond.signs.slice(0, 5).map((sign, i) => (<li key={i} className="flex items-start gap-1.5"><span className="text-gray-400 mt-0.5">•</span><span>{sign}</span></li>))}
                              </ul>
                            </div>
                            {cond.immediateChecks && cond.immediateChecks.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">Check right now</h4>
                                <ul className="text-sm text-gray-600 space-y-0.5">
                                  {cond.immediateChecks.slice(0, 4).map((chk, i) => (<li key={i} className="flex items-start gap-1.5"><span className="text-primary-500 mt-0.5">→</span><span>{chk}</span></li>))}
                                </ul>
                              </div>
                            )}
                            {cond.escalationTriggers && cond.escalationTriggers.length > 0 && (
                              <div className="bg-red-50 rounded p-2">
                                <h4 className="text-xs font-semibold text-red-700 uppercase mb-1">Call a vet if...</h4>
                                <ul className="text-sm text-red-700 space-y-0.5">
                                  {cond.escalationTriggers.slice(0, 3).map((tr, i) => (<li key={i} className="flex items-start gap-1.5"><AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" /><span>{tr}</span></li>))}
                                </ul>
                              </div>
                            )}
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" onClick={() => handleSwCreateRecord('illness', cond.name)}>
                                <FileText className="h-3 w-3 mr-1" /> Log as Illness Record
                              </Button>
                              <a href={'/dashboard/resources/conditions#condition-' + cond.id} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 px-3 py-1.5">
                                <BookOpen className="h-3 w-3" /> Full details
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Health Record Modal */}`,
  'P7: modal');

// WRITE
if (ok) {
  fs.writeFileSync(fp, c, 'utf8');
  console.log('\\n🎉 All patches applied! ' + c.split('\\n').length + ' lines');
  console.log('Run: git add -A && git commit -m "Add Something Wrong triage flow" && git push');
} else {
  console.log('\\n⚠️ Some failed. File NOT written.');
}
