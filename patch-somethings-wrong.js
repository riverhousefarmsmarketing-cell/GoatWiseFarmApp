/**
 * GoatWise "Something's Wrong" Flow Patch
 * Adds symptom-first triage flow to Health page
 * Run: node patch-somethings-wrong.js
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

// ============================================
// P1: Add imports for conditions data
// ============================================
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

// ============================================
// P2: Add lucide icons for the flow
// ============================================
r("Filter,\n} from 'lucide-react';",
  `Filter,
  HelpCircle,
  BookOpen,
  ChevronLeft,
  FileText,
} from 'lucide-react';`,
  'P2: new icons');

// ============================================
// P3: Add symptom tiles data after HEALTH_PHOTO_CATEGORIES
// ============================================
r("// ==========================================\n// OPTIONS",
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

// ==========================================
// OPTIONS`,
  'P3: symptom tiles data');

// ============================================
// P4: Add state for "Something's Wrong" modal
// ============================================
r("const [showFollowUpResolve, setShowFollowUpResolve] = useState<any>(null);",
  `const [showFollowUpResolve, setShowFollowUpResolve] = useState<any>(null);
  const [showSomethingsWrong, setShowSomethingsWrong] = useState(false);
  const [swStep, setSwStep] = useState<'symptoms' | 'results'>('symptoms');
  const [swSelectedSymptoms, setSwSelectedSymptoms] = useState<SymptomTag[]>([]);
  const [swMatchedConditions, setSwMatchedConditions] = useState<ConditionEntry[]>([]);
  const [swExpandedCondition, setSwExpandedCondition] = useState<number | null>(null);
  const [swAnimalId, setSwAnimalId] = useState('');`,
  'P4: something wrong state');

// ============================================
// P5: Add handler functions after handleDeleteRecord
// ============================================
r("const animalOptions = useMemo(",
  `// "Something's Wrong" handlers
  const handleSwOpen = () => {
    setShowSomethingsWrong(true);
    setSwStep('symptoms');
    setSwSelectedSymptoms([]);
    setSwMatchedConditions([]);
    setSwExpandedCondition(null);
    setSwAnimalId('');
  };
  const handleSwToggleSymptom = (tag: SymptomTag) => {
    setSwSelectedSymptoms(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const handleSwFindMatches = () => {
    const matchMap = new Map<number, ConditionEntry>();
    swSelectedSymptoms.forEach(tag => {
      getConditionsBySymptomTag(tag).forEach(cond => matchMap.set(cond.id, cond));
    });
    // Sort: emergency first, then by number of matching tags
    const matches = Array.from(matchMap.values()).sort((a, b) => {
      const sevOrder: Record<string, number> = { emergency: 0, serious: 1, moderate: 2, common: 3 };
      const aDiff = (sevOrder[a.severity] ?? 9);
      const bDiff = (sevOrder[b.severity] ?? 9);
      if (aDiff !== bDiff) return aDiff - bDiff;
      const aTagCount = a.symptomTags.filter(t => swSelectedSymptoms.includes(t)).length;
      const bTagCount = b.symptomTags.filter(t => swSelectedSymptoms.includes(t)).length;
      return bTagCount - aTagCount;
    });
    setSwMatchedConditions(matches);
    setSwStep('results');
  };
  const handleSwCreateRecord = (type: 'observation' | 'illness', conditionName?: string) => {
    setShowSomethingsWrong(false);
    setNewRecord(prev => ({
      ...prev,
      animal_id: swAnimalId,
      type: type,
      notes: conditionName ? \`Suspected: \${conditionName}. Symptoms: \${swSelectedSymptoms.map(s => SYMPTOM_TAG_LABELS[s]).join(', ')}\` : \`Symptoms noted: \${swSelectedSymptoms.map(s => SYMPTOM_TAG_LABELS[s]).join(', ')}\`,
      date: new Date().toISOString().split('T')[0],
    }));
    setShowAddRecordModal(true);
  };

  const animalOptions = useMemo(`,
  'P5: something wrong handlers');

// ============================================
// P6: Add "Something doesn't look right" button in header
// ============================================
r('<div className="flex gap-2">\n          <Button\n            variant="secondary"\n            leftIcon={<ClipboardCheck className="h-4 w-4" />}\n            onClick={() => setShowInspectionModal(true)}\n          >',
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
            leftIcon={<ClipboardCheck className="h-4 w-4" />}
            onClick={() => setShowInspectionModal(true)}
          >`,
  'P6: header button');

// ============================================
// P7: Add the "Something's Wrong" modal before Add Health Record Modal
// ============================================
r('{/* Add Health Record Modal */}\n      <Modal',
  `{/* "Something's Wrong" Triage Flow */}
      <Modal
        open={showSomethingsWrong}
        onClose={() => setShowSomethingsWrong(false)}
        title={swStep === 'symptoms' ? "What are you seeing?" : \`\${swMatchedConditions.length} possible match\${swMatchedConditions.length !== 1 ? 'es' : ''}\`}
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
              <Button variant="ghost" leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={() => setSwStep('symptoms')}>
                Back to symptoms
              </Button>
              <Button variant="ghost" onClick={() => handleSwCreateRecord('observation')}>
                Log as Observation
              </Button>
            </>
          )
        }
      >
        <div className="max-h-[65vh] overflow-y-auto">
          {swStep === 'symptoms' && (
            <div className="space-y-4">
              {/* Animal selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Which animal? (optional)</label>
                <Select
                  options={animalOptions}
                  value={swAnimalId}
                  onChange={(e) => setSwAnimalId(e.target.value)}
                />
              </div>
              {/* Symptom tiles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What symptoms are you seeing? Select all that apply:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {symptomTiles.map((tile) => {
                    const isSelected = swSelectedSymptoms.includes(tile.tag);
                    return (
                      <button
                        key={tile.tag}
                        onClick={() => handleSwToggleSymptom(tile.tag)}
                        className={\`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all \${
                          isSelected
                            ? 'ring-2 ring-primary-500 border-primary-300 bg-primary-50 font-medium'
                            : tile.color
                        }\`}
                      >
                        <span className="text-lg">{tile.icon}</span>
                        <span>{tile.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {swSelectedSymptoms.length > 0 && (
                <p className="text-sm text-primary-600 font-medium">
                  {swSelectedSymptoms.length} symptom{swSelectedSymptoms.length !== 1 ? 's' : ''} selected — click &quot;Find Matches&quot; to see possible conditions
                </p>
              )}
            </div>
          )}

          {swStep === 'results' && (
            <div className="space-y-3">
              {/* Selected symptoms summary */}
              <div className="flex flex-wrap gap-1 mb-2">
                {swSelectedSymptoms.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    {SYMPTOM_TAG_LABELS[tag]}
                  </span>
                ))}
              </div>

              {swMatchedConditions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No matching conditions found for these symptoms.</p>
                  <p className="text-sm mt-1">Try selecting different symptoms, or log an Observation record.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 italic">
                    This is an educational reference only — not a diagnosis. Always consult a veterinarian for medical decisions.
                  </p>
                  {swMatchedConditions.map((cond) => {
                    const isExpanded = swExpandedCondition === cond.id;
                    const matchingTags = cond.symptomTags.filter(t => swSelectedSymptoms.includes(t));
                    return (
                      <div key={cond.id} className={\`border rounded-lg overflow-hidden \${
                        cond.severity === 'emergency' ? 'border-red-300' : 'border-gray-200'
                      }\`}>
                        <button
                          onClick={() => setSwExpandedCondition(isExpanded ? null : cond.id)}
                          className={\`w-full text-left p-3 flex items-center justify-between hover:bg-gray-50 \${
                            cond.severity === 'emergency' ? 'bg-red-50' : ''
                          }\`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">{cond.name}</span>
                              <span className={\`text-xs px-2 py-0.5 rounded-full border \${severityBadgeColors[cond.severity] || 'bg-gray-100 text-gray-600'}\`}>
                                {cond.severity}
                              </span>
                              <span className="text-xs text-gray-400">
                                {matchingTags.length}/{swSelectedSymptoms.length} symptoms match
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{cond.summary}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />}
                        </button>
                        {isExpanded && (
                          <div className="border-t p-3 bg-gray-50 space-y-3">
                            {/* Signs */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">What you might notice</h4>
                              <ul className="text-sm text-gray-600 space-y-0.5">
                                {cond.signs.slice(0, 5).map((sign, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-gray-400 mt-0.5">•</span>
                                    <span>{sign}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {/* Immediate checks */}
                            {cond.immediateChecks?.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">Check right now</h4>
                                <ul className="text-sm text-gray-600 space-y-0.5">
                                  {cond.immediateChecks.slice(0, 4).map((check, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-primary-500 mt-0.5">→</span>
                                      <span>{check}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {/* Escalation */}
                            {cond.escalationTriggers?.length > 0 && (
                              <div className="bg-red-50 rounded p-2">
                                <h4 className="text-xs font-semibold text-red-700 uppercase mb-1">Call a vet if...</h4>
                                <ul className="text-sm text-red-700 space-y-0.5">
                                  {cond.escalationTriggers.slice(0, 3).map((trigger, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                      <span>{trigger}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" onClick={() => handleSwCreateRecord('illness', cond.name)}>
                                <FileText className="h-3 w-3 mr-1" /> Log as Illness Record
                              </Button>
                              <a
                                href={\`/dashboard/resources/conditions#condition-\${cond.id}\`}
                                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 px-3 py-1.5"
                              >
                                <BookOpen className="h-3 w-3" /> Full details →
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

      {/* Add Health Record Modal */}
      <Modal`,
  'P7: Something Wrong modal');

// Also need ChevronUp and ChevronDown - check if they exist
if (!c.includes("ChevronDown,")) {
  r("ChevronLeft,\n  FileText,",
    "ChevronLeft,\n  ChevronDown,\n  ChevronUp,\n  FileText,",
    'P7b: add ChevronDown/Up icons');
} else {
  console.log('✅ P7b: ChevronDown/Up already imported');
}

// ============================================
// WRITE
// ============================================
if (ok) {
  fs.writeFileSync(fp, c, 'utf8');
  console.log(`\n🎉 All patches applied! ${c.split('\n').length} lines`);
  console.log('Run: git add -A && git commit -m "Add Something Wrong triage flow" && git push');
} else {
  console.log('\n⚠️ Some failed. File NOT written.');
}
