'use client';

import { useState } from 'react';
import { Card, Badge } from '@/components/ui';
import {
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Phone,
  Leaf,
  Pill,
  Droplets,
  Link as LinkIcon,
} from 'lucide-react';

// Import from centralized data
import {
  conditions,
  searchConditions,
  getConditionsBySymptomTag,
  getEmergencyConditions,
  SEVERITY_COLORS,
  CONDITION_CATEGORY_COLORS,
  SYMPTOM_TAG_LABELS,
  type ConditionEntry,
  type SymptomTag,
} from '@/data/resources';

// Symptom tiles for "Start Here" navigation
const symptomTiles: { tag: SymptomTag; icon: string; color: string }[] = [
  { tag: 'pale-eyelids-anemia', icon: '👁️', color: 'bg-red-50 border-red-200 hover:bg-red-100' },
  { tag: 'off-feed-lethargy', icon: '😴', color: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
  { tag: 'diarrhea-scours', icon: '💩', color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' },
  { tag: 'bloat', icon: '🎈', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
  { tag: 'coughing-nasal', icon: '🤧', color: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100' },
  { tag: 'limping', icon: '🦶', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { tag: 'neurological', icon: '🧠', color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
  { tag: 'post-kidding', icon: '🍼', color: 'bg-pink-50 border-pink-200 hover:bg-pink-100' },
];

const categories = ['All', 'Parasitic', 'Bacterial', 'Digestive', 'Metabolic', 'Nutritional', 'Respiratory', 'Neurological', 'Urinary'];

// Support pathway icons
const pathwayIcons = {
  herbal: Leaf,
  mineral: Droplets,
  conventional: Pill,
  'essential-oil': Droplets,
};

const pathwayColors = {
  herbal: 'bg-green-50 border-green-200',
  mineral: 'bg-blue-50 border-blue-200',
  conventional: 'bg-purple-50 border-purple-200',
  'essential-oil': 'bg-amber-50 border-amber-200',
};

const pathwayTitles = {
  herbal: 'Herbal Support',
  mineral: 'Mineral Support',
  conventional: 'Conventional Options',
  'essential-oil': 'Essential Oil Support',
};

export default function ConditionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomTag | null>(null);
  const [expandedCondition, setExpandedCondition] = useState<number | null>(null);
  const [showSymptomNav, setShowSymptomNav] = useState(true);

  // Filter conditions
  const filteredConditions = (() => {
    let result = conditions;

    // Filter by symptom tag if selected
    if (selectedSymptom) {
      result = getConditionsBySymptomTag(selectedSymptom);
    }

    // Filter by search term
    if (searchTerm) {
      result = searchConditions(searchTerm);
    }

    // Filter by category
    if (categoryFilter !== 'All') {
      result = result.filter((c) => c.category === categoryFilter);
    }

    return result;
  })();

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All');
    setSelectedSymptom(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Health Conditions</h1>
        <p className="text-gray-500">Field guide to common goat health issues</p>
      </div>

      {/* Veterinary Disclaimer */}
      <Card className="bg-amber-50 border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-800">Veterinary Disclaimer</h3>
            <p className="text-sm text-amber-700 mt-1">
              This information is for educational reference only and does not replace professional veterinary care.
              Always consult a veterinarian for diagnosis and treatment. When in doubt, call your vet.
            </p>
          </div>
        </div>
      </Card>

      {/* Emergency Quick Access */}
      <Card className="bg-red-50 border-red-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800">Emergency?</h3>
              <p className="text-sm text-red-700">
                {getEmergencyConditions().length} critical conditions require immediate action
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setCategoryFilter('All');
              setSelectedSymptom(null);
              setSearchTerm('');
              // Show only emergencies by filtering
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            View Emergencies
          </button>
        </div>
      </Card>

      {/* Symptom-First Navigation */}
      {showSymptomNav && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">🔍 Start Here: What are you seeing?</h3>
            <button
              onClick={() => setShowSymptomNav(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Hide
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {symptomTiles.map(({ tag, icon, color }) => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedSymptom(selectedSymptom === tag ? null : tag);
                  setCategoryFilter('All');
                  setSearchTerm('');
                }}
                className={`p-3 rounded-lg border-2 transition-all text-left ${color} ${
                  selectedSymptom === tag ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                }`}
              >
                <span className="text-2xl">{icon}</span>
                <p className="text-sm font-medium mt-1 text-gray-800">
                  {SYMPTOM_TAG_LABELS[tag]}
                </p>
                <p className="text-xs text-gray-500">
                  {getConditionsBySymptomTag(tag).length} conditions
                </p>
              </button>
            ))}
          </div>
          {selectedSymptom && (
            <div className="mt-3 flex items-center gap-2">
              <Badge className="bg-primary-100 text-primary-700">
                Showing: {SYMPTOM_TAG_LABELS[selectedSymptom]}
              </Badge>
              <button
                onClick={() => setSelectedSymptom(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Search and Filter */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conditions, symptoms..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedSymptom(null);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        {(searchTerm || categoryFilter !== 'All' || selectedSymptom) && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {filteredConditions.length} results
            </span>
            <button onClick={clearFilters} className="text-sm text-primary-600 hover:underline">
              Clear all filters
            </button>
          </div>
        )}
      </Card>

      {/* Conditions List */}
      <div className="space-y-4">
        {filteredConditions.length === 0 ? (
          <Card className="p-8 text-center">
            <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No conditions found matching your criteria.</p>
            <button onClick={clearFilters} className="mt-2 text-primary-600 hover:underline">
              Clear filters
            </button>
          </Card>
        ) : (
          filteredConditions.map((condition) => (
            <ConditionCard
              key={condition.id}
              condition={condition}
              expanded={expandedCondition === condition.id}
              onToggle={() =>
                setExpandedCondition(expandedCondition === condition.id ? null : condition.id)
              }
            />
          ))
        )}
      </div>

      {/* Footer Disclaimer */}
      <Card className="bg-gray-50 border-gray-200 p-4">
        <p className="text-sm text-gray-600 text-center">
          This information is provided as educational reference only. Always consult a licensed
          veterinarian for diagnosis and treatment of your animals.
        </p>
      </Card>
    </div>
  );
}

// Condition Card Component
function ConditionCard({
  condition,
  expanded,
  onToggle,
}: {
  condition: ConditionEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card
      className={`overflow-hidden ${condition.isEmergency ? 'ring-2 ring-red-300' : ''}`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              condition.isEmergency ? 'bg-red-100' : 'bg-gray-100'
            }`}
          >
            {condition.isEmergency ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <Stethoscope className="h-5 w-5 text-gray-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{condition.name}</h3>
              {condition.isEmergency && (
                <Badge className="bg-red-600 text-white text-xs">EMERGENCY</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{condition.summary}</p>
            <div className="flex gap-2 mt-1">
              <Badge className={CONDITION_CATEGORY_COLORS[condition.category]}>
                {condition.category}
              </Badge>
              <Badge className={SEVERITY_COLORS[condition.severity]}>{condition.severity}</Badge>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t px-4 py-4 bg-gray-50 space-y-4">
          {/* Summary */}
          <p className="text-gray-700">{condition.summary}</p>

          {/* What You Might Notice */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">What You Might Notice</h4>
            <div className="flex flex-wrap gap-1">
              {condition.signs.map((sign, i) => (
                <Badge key={i} className="bg-blue-50 text-blue-700">
                  {sign}
                </Badge>
              ))}
            </div>
          </div>

          {/* Immediate Checks */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">✓ Immediate Checks</h4>
            <ul className="space-y-1">
              {condition.immediateChecks.map((check, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  {check}
                </li>
              ))}
            </ul>
          </div>

          {/* How It's Commonly Identified */}
          {condition.identification && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">How It&apos;s Commonly Identified</h4>
              <p className="text-sm text-gray-600">{condition.identification}</p>
            </div>
          )}

          {/* Escalation Triggers - GET HELP NOW */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Get Help Now If...
            </h4>
            <ul className="space-y-1">
              {condition.escalationTriggers.map((trigger, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">⚠</span>
                  {trigger}
                </li>
              ))}
            </ul>
          </div>

          {/* Support Pathways */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Support Pathways</h4>
            <div className="space-y-3">
              {condition.supportPathways.map((pathway, i) => {
                const Icon = pathwayIcons[pathway.type];
                return (
                  <div
                    key={i}
                    className={`border rounded-lg p-4 ${pathwayColors[pathway.type]}`}
                  >
                    <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {pathwayTitles[pathway.type]}
                    </h5>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {pathway.tools.map((tool, j) => (
                        <Badge key={j} className="bg-white/70 text-gray-700 text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">{pathway.context}</p>
                    {pathway.resourceLinks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pathway.resourceLinks.map((link, j) => (
                          <a
                            key={j}
                            href={`/dashboard/resources/${link.type}s#${link.id}`}
                            className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                          >
                            <LinkIcon className="h-3 w-3" />
                            {link.label || `View ${link.type}`}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Common Mistakes */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">⚠ Common Mistakes to Avoid</h4>
            <ul className="space-y-1">
              {condition.commonMistakes.map((mistake, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">✗</span>
                  {mistake}
                </li>
              ))}
            </ul>
          </div>

          {/* Related Links */}
          {(condition.relatedConditions || condition.relatedMyths) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {condition.relatedConditions?.map((id) => (
                <a
                  key={id}
                  href={`#condition-${id}`}
                  className="text-sm text-primary-600 hover:underline"
                >
                  Related condition →
                </a>
              ))}
              {condition.relatedMyths?.map((id) => (
                <a
                  key={id}
                  href={`/dashboard/resources/myths#myth-${id}`}
                  className="text-sm text-primary-600 hover:underline"
                >
                  Related myth →
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
