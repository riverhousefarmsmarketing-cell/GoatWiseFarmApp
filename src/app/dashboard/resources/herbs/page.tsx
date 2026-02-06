'use client';

import { useState } from 'react';
import { Card, Badge } from '@/components/ui';
import {
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Leaf,
  Info,
  AlertCircle,
} from 'lucide-react';

// Import from centralized data
import {
  herbs,
  searchHerbs,
  getHerbsByCategory,
  getHerbsWithPregnancyWarning,
  getTopicalOnlyHerbs,
  getHerbCategories,
  HERB_DISCLAIMER,
  HERB_CATEGORY_COLORS,
  EFFECTIVENESS_COLORS,
  type HerbEntry,
  type HerbCategory,
} from '@/data/resources';

export default function HerbsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<HerbCategory | 'All'>('All');
  const [expandedHerb, setExpandedHerb] = useState<number | null>(1);
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);

  const categories = ['All', ...getHerbCategories()] as const;

  const filteredHerbs = (() => {
    let result = herbs;

    if (searchTerm) {
      result = searchHerbs(searchTerm);
    }

    if (categoryFilter !== 'All') {
      result = result.filter((h) => h.category === categoryFilter);
    }

    if (showWarningsOnly) {
      result = result.filter((h) => h.pregnancyWarning || h.topicalOnly);
    }

    return result;
  })();

  const pregnancyWarningCount = getHerbsWithPregnancyWarning().length;
  const topicalOnlyCount = getTopicalOnlyHerbs().length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Herbs & Natural Remedies</h1>
        <p className="text-gray-500">Reference guide for herbs commonly used with goats</p>
      </div>

      {/* Disclaimer */}
      <Card className="bg-amber-50 border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-800">Important Disclaimer</h3>
            <p className="text-sm text-amber-700 mt-1">{HERB_DISCLAIMER}</p>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary-600">{herbs.length}</p>
          <p className="text-sm text-gray-500">Total Herbs</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{getHerbCategories().length}</p>
          <p className="text-sm text-gray-500">Categories</p>
        </Card>
        <Card
          className="p-3 text-center cursor-pointer hover:bg-red-50 transition-colors"
          onClick={() => setShowWarningsOnly(!showWarningsOnly)}
        >
          <p className="text-2xl font-bold text-red-600">{pregnancyWarningCount}</p>
          <p className="text-sm text-gray-500">Pregnancy Warnings</p>
        </Card>
        <Card
          className="p-3 text-center cursor-pointer hover:bg-blue-50 transition-colors"
          onClick={() => setShowWarningsOnly(!showWarningsOnly)}
        >
          <p className="text-2xl font-bold text-blue-600">{topicalOnlyCount}</p>
          <p className="text-sm text-gray-500">Topical Only</p>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card padding="sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search herbs, uses, scientific names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as HerbCategory | 'All')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWarningsOnly}
                  onChange={(e) => setShowWarningsOnly(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">Show herbs with warnings only</span>
              </label>
            </div>
            <p className="text-sm text-gray-500">{filteredHerbs.length} herbs</p>
          </div>
        </div>
      </Card>

      {/* Category Quick Links */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat as HerbCategory | 'All')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === cat
                ? 'bg-primary-600 text-white'
                : cat === 'All'
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : `${HERB_CATEGORY_COLORS[cat as HerbCategory] || 'bg-gray-100'} hover:opacity-80`
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Herbs List */}
      <div className="space-y-3">
        {filteredHerbs.length === 0 ? (
          <Card className="p-8 text-center">
            <Leaf className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No herbs found matching your search.</p>
          </Card>
        ) : (
          filteredHerbs.map((herb) => (
            <HerbCard
              key={herb.id}
              herb={herb}
              expanded={expandedHerb === herb.id}
              onToggle={() => setExpandedHerb(expandedHerb === herb.id ? null : herb.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <Card className="bg-gray-50 border-gray-200 p-4">
        <p className="text-sm text-gray-600 text-center">
          This information is for educational reference only. Always research thoroughly and
          consult with a veterinarian before administering any herbal treatment.
        </p>
      </Card>
    </div>
  );
}

// Herb Card Component
function HerbCard({
  herb,
  expanded,
  onToggle,
}: {
  herb: HerbEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Leaf className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{herb.name}</h3>
              {herb.pregnancyWarning && (
                <Badge className="bg-red-100 text-red-700 text-xs">⚠ Pregnancy</Badge>
              )}
              {herb.topicalOnly && (
                <Badge className="bg-blue-100 text-blue-700 text-xs">Topical Only</Badge>
              )}
            </div>
            <p className="text-xs text-gray-400 italic">{herb.scientificName}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {herb.commonlyUsedFor.slice(0, 3).join(' • ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={HERB_CATEGORY_COLORS[herb.category] || 'bg-gray-100'}>
            {herb.category}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t px-4 py-4 bg-gray-50 space-y-4">
          {/* Warnings */}
          {(herb.pregnancyWarning || herb.topicalOnly) && (
            <div className="flex flex-wrap gap-2">
              {herb.pregnancyWarning && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Avoid in pregnant animals
                </div>
              )}
              {herb.topicalOnly && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm">
                  <Info className="h-4 w-4" />
                  External/topical use only
                </div>
              )}
            </div>
          )}

          {/* Context */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Context</h4>
            <p className="text-sm text-gray-600">{herb.context}</p>
          </div>

          {/* Commonly Used For */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Commonly Used For</h4>
            <div className="flex flex-wrap gap-1">
              {herb.commonlyUsedFor.map((use, i) => (
                <Badge key={i} className="bg-green-50 text-green-700">
                  {use}
                </Badge>
              ))}
            </div>
          </div>

          {/* Typical Application */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-gray-400" />
              Typical Application
            </h4>
            <p className="text-sm text-gray-600">{herb.typicalApplication}</p>
            <p className="text-xs text-gray-400 mt-2 italic">
              Reference only — verify amounts and methods externally
            </p>
          </div>

          {/* Effectiveness */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Effectiveness:</span>
            <Badge className={EFFECTIVENESS_COLORS[herb.effectiveness] || 'bg-gray-100'}>
              {herb.effectiveness}
            </Badge>
            <span className="text-xs text-gray-400">
              (based on traditional use and limited research)
            </span>
          </div>

          {/* Cautions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Cautions
            </h4>
            <ul className="space-y-1">
              {herb.cautions.map((caution, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {caution}
                </li>
              ))}
            </ul>
          </div>

          {/* Related Links */}
          {(herb.relatedConditions || herb.relatedMinerals) && (
            <div className="pt-2 border-t">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Related Resources</h4>
              <div className="flex flex-wrap gap-2">
                {herb.relatedConditions?.map((id) => (
                  <a
                    key={id}
                    href={`/dashboard/resources/conditions#condition-${id}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Related condition →
                  </a>
                ))}
                {herb.relatedMinerals?.map((id) => (
                  <a
                    key={id}
                    href={`/dashboard/resources/minerals#mineral-${id}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Related mineral →
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
