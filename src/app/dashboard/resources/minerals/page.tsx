'use client';

import { useState } from 'react';
import { Card, Badge } from '@/components/ui';
import {
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Droplets,
  Info,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

// Import from centralized data
import {
  minerals,
  searchMinerals,
  getMineralsByCategory,
  getMineralsByImportance,
  MANAGEMENT_BOUNDARY,
  MINERAL_CATEGORY_COLORS,
  IMPORTANCE_COLORS,
  PREVALENCE_COLORS,
  type MineralEntry,
  type MineralCategory,
  type Importance,
} from '@/data/resources';

const categories: (MineralCategory | 'All')[] = ['All', 'Trace Mineral', 'Macro Mineral', 'Vitamin'];
const importanceLevels: Importance[] = ['Critical', 'High', 'Moderate', 'Low-Moderate', 'Low'];

export default function MineralsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MineralCategory | 'All'>('All');
  const [expandedMineral, setExpandedMineral] = useState<number | null>(1);

  const filteredMinerals = (() => {
    let result = minerals;

    if (searchTerm) {
      result = searchMinerals(searchTerm);
    }

    if (categoryFilter !== 'All') {
      result = getMineralsByCategory(categoryFilter);
      if (searchTerm) {
        result = result.filter((m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.primaryFunctions.some((f) => f.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
    }

    return result;
  })();

  const criticalCount = getMineralsByImportance('Critical').length;
  const highCount = getMineralsByImportance('High').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minerals & Vitamins</h1>
        <p className="text-gray-500">Comprehensive guide to goat mineral nutrition</p>
      </div>

      {/* Disclaimer */}
      <Card className="bg-blue-50 border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-800">Management Boundary</h3>
            <p className="text-sm text-blue-700 mt-1">{MANAGEMENT_BOUNDARY}</p>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary-600">{minerals.length}</p>
          <p className="text-sm text-gray-500">Total Entries</p>
        </Card>
        <Card className="p-3 text-center bg-red-50">
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
          <p className="text-sm text-gray-500">Critical</p>
        </Card>
        <Card className="p-3 text-center bg-orange-50">
          <p className="text-2xl font-bold text-orange-600">{highCount}</p>
          <p className="text-sm text-gray-500">High Importance</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {getMineralsByCategory('Trace Mineral').length}
          </p>
          <p className="text-sm text-gray-500">Trace Minerals</p>
        </Card>
      </div>

      {/* Search and Filter - FIXED: Changed padding="sm" to className="p-3" */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search minerals, functions, symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-primary-600 text-white'
                    : cat === 'All'
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : `${MINERAL_CATEGORY_COLORS[cat as MineralCategory]} hover:opacity-80`
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500">{filteredMinerals.length} results</p>
      </Card>

      {/* Importance Legend */}
      <Card className="p-4">
        <h3 className="font-medium text-gray-900 mb-3">Importance Levels</h3>
        <div className="flex flex-wrap gap-2">
          {importanceLevels.map((level) => (
            <div key={level} className="flex items-center gap-2">
              <Badge className={IMPORTANCE_COLORS[level]}>{level}</Badge>
              <span className="text-xs text-gray-500">
                ({getMineralsByImportance(level).length})
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Minerals List */}
      <div className="space-y-3">
        {filteredMinerals.length === 0 ? (
          <Card className="p-8 text-center">
            <Droplets className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No minerals found matching your search.</p>
          </Card>
        ) : (
          filteredMinerals.map((mineral) => (
            <MineralCard
              key={mineral.id}
              mineral={mineral}
              expanded={expandedMineral === mineral.id}
              onToggle={() =>
                setExpandedMineral(expandedMineral === mineral.id ? null : mineral.id)
              }
            />
          ))
        )}
      </div>

      {/* Footer */}
      <Card className="bg-gray-50 border-gray-200 p-4">
        <p className="text-sm text-gray-600 text-center">
          Mineral requirements vary by region, water source, and individual animal. Work with a
          livestock nutritionist or veterinarian to assess your specific situation.
        </p>
      </Card>
    </div>
  );
}

// Mineral Card Component
function MineralCard({
  mineral,
  expanded,
  onToggle,
}: {
  mineral: MineralEntry;
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
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              mineral.importance === 'Critical'
                ? 'bg-red-100'
                : mineral.importance === 'High'
                ? 'bg-orange-100'
                : 'bg-blue-100'
            }`}
          >
            <Droplets
              className={`h-5 w-5 ${
                mineral.importance === 'Critical'
                  ? 'text-red-600'
                  : mineral.importance === 'High'
                  ? 'text-orange-600'
                  : 'text-blue-600'
              }`}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{mineral.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {mineral.primaryFunctions.slice(0, 3).join(' • ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={MINERAL_CATEGORY_COLORS[mineral.category]}>{mineral.category}</Badge>
          <Badge className={IMPORTANCE_COLORS[mineral.importance]}>{mineral.importance}</Badge>
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
          {/* Primary Functions */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Primary Functions</h4>
            <div className="flex flex-wrap gap-1">
              {mineral.primaryFunctions.map((fn, i) => (
                <Badge key={i} className="bg-blue-50 text-blue-700">
                  {fn}
                </Badge>
              ))}
            </div>
          </div>

          {/* Deficiency & Toxicity Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Deficiency */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-amber-800">Deficiency Signs</h4>
                <Badge className={PREVALENCE_COLORS[mineral.deficiency.prevalence]}>
                  {mineral.deficiency.prevalence}
                </Badge>
              </div>
              <ul className="space-y-1">
                {mineral.deficiency.indicators.map((indicator, i) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {indicator}
                  </li>
                ))}
              </ul>
              {mineral.deficiency.notes && (
                <p className="text-xs text-amber-600 mt-2 italic">{mineral.deficiency.notes}</p>
              )}
            </div>

            {/* Toxicity */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-red-800">Toxicity Signs</h4>
                <Badge className={PREVALENCE_COLORS[mineral.toxicity.prevalence]}>
                  {mineral.toxicity.prevalence}
                </Badge>
              </div>
              <ul className="space-y-1">
                {mineral.toxicity.indicators.map((indicator, i) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    {indicator}
                  </li>
                ))}
              </ul>
              {mineral.toxicity.warning && (
                <div className="mt-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-medium">{mineral.toxicity.warning}</p>
                </div>
              )}
            </div>
          </div>

          {/* Interactions */}
          {mineral.interactions.antagonists.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Mineral Interactions (Antagonists)</h4>
              <div className="space-y-2">
                {mineral.interactions.antagonists.map((ant, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge className="bg-gray-100 text-gray-700">{ant.mineral}</Badge>
                    {ant.commonSource && (
                      <>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500">Common source: {ant.commonSource}</span>
                      </>
                    )}
                    {ant.note && (
                      <span className="text-xs text-gray-400 italic">({ant.note})</span>
                    )}
                  </div>
                ))}
              </div>
              {mineral.interactions.complementaryContext && (
                <p className="text-sm text-gray-600 mt-3 pt-3 border-t">
                  {mineral.interactions.complementaryContext}
                </p>
              )}
            </div>
          )}

          {/* Species Notes */}
          {mineral.speciesNotes && mineral.speciesNotes.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Species Notes
              </h4>
              <ul className="space-y-1">
                {mineral.speciesNotes.map((note, i) => (
                  <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Breed Sensitivity Warning */}
          {mineral.breedSensitivity && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Breed Sensitivity Warning
              </h4>
              <p className="text-sm text-red-700">{mineral.breedSensitivity.warning}</p>
              {mineral.breedSensitivity.breeds && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {mineral.breedSensitivity.breeds.map((breed, i) => (
                    <Badge key={i} className="bg-red-200 text-red-800 text-xs">
                      {breed}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Management Boundary */}
          <div className="bg-gray-100 border rounded-lg p-3">
            <p className="text-xs text-gray-600">{mineral.managementBoundary}</p>
          </div>

          {/* Related Conditions */}
          {mineral.relatedConditions && mineral.relatedConditions.length > 0 && (
            <div className="pt-2 border-t">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">Related Conditions</h4>
              <div className="flex flex-wrap gap-2">
                {mineral.relatedConditions.map((id) => (
                  <a
                    key={id}
                    href={`/dashboard/resources/conditions#condition-${id}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    View related condition →
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
