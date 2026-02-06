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
} from 'lucide-react';

// Import from centralized data
import {
  getDisplayableEssentialOils,
  searchEssentialOils,
  getEssentialOilsByBadge,
  getHotOils,
  getEOBadgeInfo,
  EO_PRINCIPLES,
  ESSENTIAL_OIL_DISCLAIMER,
  type EssentialOilEntry,
  type EOUseBadge,
} from '@/data/resources';

const useBadgeOrder: EOUseBadge[] = ['external-only', 'external-aromatic', 'internal-experienced'];

export default function EssentialOilsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<EOUseBadge | 'All'>('All');
  const [expandedOil, setExpandedOil] = useState<number | null>(null);
  const [showPrinciples, setShowPrinciples] = useState(true);

  const allOils = getDisplayableEssentialOils();

  const filteredOils = (() => {
    let result = allOils;

    if (searchTerm) {
      result = searchEssentialOils(searchTerm);
    }

    if (badgeFilter !== 'All') {
      result = result.filter((eo) => eo.useBadge === badgeFilter);
    }

    return result;
  })();

  // Group oils by badge for display
  const oilsByBadge = useBadgeOrder.map((badge) => ({
    badge,
    oils: filteredOils.filter((eo) => eo.useBadge === badge),
    info: getEOBadgeInfo(badge),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Essential Oils Reference</h1>
        <p className="text-gray-500">Safety-first guide to essential oil use with goats</p>
      </div>

      {/* Critical Safety Disclaimer */}
      <Card className="bg-red-50 border-red-300 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-red-800">Critical Safety Information</h3>
            <p className="text-sm text-red-700 mt-1">{ESSENTIAL_OIL_DISCLAIMER}</p>
            <ul className="mt-2 text-sm text-red-700 space-y-1">
              <li>• Essential oils are highly concentrated — more is NOT better</li>
              <li>• Always dilute in a carrier oil before any application</li>
              <li>• Individual animals respond differently</li>
              <li>• Stop immediately if you see any adverse reaction</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Principles Section */}
      {showPrinciples && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              {EO_PRINCIPLES.title}
            </h3>
            <button
              onClick={() => setShowPrinciples(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Hide
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">{EO_PRINCIPLES.intro}</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {EO_PRINCIPLES.principles.map((principle, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 border">
                <h4 className="font-medium text-gray-800 text-sm">{principle.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{principle.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Safety Badge Legend */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Safety Classification</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {useBadgeOrder.map((badge) => {
            const info = getEOBadgeInfo(badge);
            return (
              <div
                key={badge}
                className={`p-3 rounded-lg border-2 ${
                  badgeFilter === badge ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{info.emoji}</span>
                  <Badge className={info.color}>{info.label}</Badge>
                </div>
                <p className="text-xs text-gray-600">
                  {badge === 'external-only' &&
                    'Safe for diluted topical use. Never ingest.'}
                  {badge === 'external-aromatic' &&
                    'Diluted topical or aromatic diffusion. Never ingest.'}
                  {badge === 'internal-experienced' &&
                    'Internal use only by experienced handlers with proper knowledge.'}
                </p>
                <button
                  onClick={() => setBadgeFilter(badgeFilter === badge ? 'All' : badge)}
                  className="mt-2 text-xs text-primary-600 hover:underline"
                >
                  {badgeFilter === badge ? 'Show all' : `Filter to ${info.label}`}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Search */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search essential oils..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {badgeFilter !== 'All' && (
            <button
              onClick={() => setBadgeFilter('All')}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear filter
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Showing {filteredOils.length} of {allOils.length} oils
        </p>
      </Card>

      {/* Hot Oils Warning */}
      {(badgeFilter === 'All' || badgeFilter === 'internal-experienced') && (
        <Card className="bg-orange-50 border-orange-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-800">"Hot" Oils Require Extra Caution</h4>
              <p className="text-sm text-orange-700 mt-1">
                Some oils (Oregano, Clove, Cinnamon, Thyme) are considered "hot" — they can cause
                significant skin irritation and require heavy dilution. These are marked below.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Oils by Category */}
      {oilsByBadge.map(({ badge, oils, info }) => {
        if (oils.length === 0) return null;

        return (
          <div key={badge} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{info.emoji}</span>
              <h2 className="text-lg font-semibold text-gray-900">{info.label}</h2>
              <Badge className="bg-gray-100 text-gray-600">{oils.length}</Badge>
            </div>

            <div className="space-y-3">
              {oils.map((oil) => (
                <EssentialOilCard
                  key={oil.id}
                  oil={oil}
                  expanded={expandedOil === oil.id}
                  onToggle={() =>
                    setExpandedOil(expandedOil === oil.id ? null : oil.id)
                  }
                />
              ))}
            </div>
          </div>
        );
      })}

      {filteredOils.length === 0 && (
        <Card className="p-8 text-center">
          <Droplets className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No essential oils found matching your search.</p>
        </Card>
      )}

      {/* Footer Note */}
      <Card className="bg-gray-50 border-gray-200 p-4">
        <p className="text-sm text-gray-600 text-center">
          Essential oils are not a replacement for veterinary care. Always consult a veterinarian
          for serious health conditions. Individual animal responses vary — start slowly and
          observe carefully.
        </p>
      </Card>
    </div>
  );
}

// Essential Oil Card Component
function EssentialOilCard({
  oil,
  expanded,
  onToggle,
}: {
  oil: EssentialOilEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const badgeInfo = getEOBadgeInfo(oil.useBadge);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Droplets className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{oil.name}</h3>
              {oil.heatSensitive && (
                <Badge className="bg-orange-100 text-orange-700 text-xs">🔥 Hot Oil</Badge>
              )}
            </div>
            {oil.scientificName && (
              <p className="text-xs text-gray-400 italic">{oil.scientificName}</p>
            )}
            <p className="text-sm text-gray-500 mt-0.5">
              {oil.commonAssociations.slice(0, 3).join(' • ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{badgeInfo.emoji}</span>
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
          {/* Safety Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${badgeInfo.color}`}>
            <span>{badgeInfo.emoji}</span>
            <span className="font-medium text-sm">{badgeInfo.label}</span>
          </div>

          {/* Hot Oil Warning */}
          {oil.heatSensitive && (
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
              <p className="text-sm text-orange-800 font-medium">
                🔥 This is a "hot" oil that can cause significant irritation. Heavy dilution is
                required for any use.
              </p>
            </div>
          )}

          {/* Context */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Context</h4>
            <p className="text-sm text-gray-600">{oil.context}</p>
          </div>

          {/* Common Associations */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Commonly Associated With</h4>
            <div className="flex flex-wrap gap-1">
              {oil.commonAssociations.map((assoc, i) => (
                <Badge key={i} className="bg-purple-50 text-purple-700">
                  {assoc}
                </Badge>
              ))}
            </div>
          </div>

          {/* Cautions */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Cautions
            </h4>
            <ul className="space-y-1">
              {oil.cautions.map((caution, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  {caution}
                </li>
              ))}
            </ul>
          </div>

          {/* Dilution Required Note */}
          {oil.dilutionRequired && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <strong>Dilution required:</strong> Always dilute in a carrier oil before any
                topical application.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
