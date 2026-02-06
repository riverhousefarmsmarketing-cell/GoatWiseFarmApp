'use client';

import { useState } from 'react';
import { Card } from '@/components/ui';
import {
  ChevronDown,
  ChevronUp,
  Wheat,
  Droplets,
  Home,
  CheckSquare,
  Activity,
  Scissors,
  Baby,
  Users,
  AlertTriangle,
} from 'lucide-react';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  content: React.ReactNode;
}

/**
 * CARE GUIDE SCOPE
 * ----------------
 * This guide defines baseline husbandry principles and common management considerations.
 * It does NOT provide feeding formulas, dosing schedules, or medical treatment instructions.
 * For symptoms, production changes, or health concerns, use the GoatWise Conditions system
 * for structured assessment and clear escalation thresholds.
 */

const sections: Section[] = [
  {
    id: 'feed',
    icon: <Wheat className="h-6 w-6" />,
    title: 'Feed & Nutrition',
    subtitle: 'Principles for forage, browse, and concentrates',
    color: 'amber',
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Core Feeding Principles</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Goats are forage-first animals; long-stem fiber supports rumen health</li>
            <li>• Energy needs rise during growth, late pregnancy, and lactation</li>
            <li>• Over-reliance on concentrates increases metabolic and urinary risk</li>
            <li>• Sudden diet changes are a common trigger for digestive problems</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Hay & Forage</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Quality matters more than type: clean, dry, mold-free forage</li>
            <li>• Grass hays often suit maintenance animals well</li>
            <li>• Legume hays can support higher-demand stages but change mineral balance</li>
            <li>• Consistent access to forage supports rumination and gut stability</li>
          </ul>
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Elevated feeding reduces fecal contamination and parasite exposure.
              </span>
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Browse & Pasture</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Goats prefer browse (leaves, shrubs, weeds) over short grass</li>
            <li>• Plant nutrient content varies by species, season, and intake</li>
            <li>• Rotational grazing reduces overgrazing and parasite pressure</li>
            <li>• Always identify and exclude known toxic plants</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Grain & Treats</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Grain is optional, not required for all goats</li>
            <li>• Use concentrates to fill specific nutritional gaps, not by default</li>
            <li>• For males, concentrate-heavy systems increase urinary risk</li>
            <li>• Treats should never replace forage intake</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'water',
    icon: <Droplets className="h-6 w-6" />,
    title: 'Water & Minerals',
    subtitle: 'Hydration and mineral program fundamentals',
    color: 'blue',
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Water Access</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Clean, fresh water should be continuously available</li>
            <li>• Intake drops when water is dirty, frozen, or hard to access</li>
            <li>• Hydration strongly affects digestion, milk production, and urinary health</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Mineral Programs</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Use loose minerals formulated for goats</li>
            <li>• Mineral needs vary by region, forage, and antagonists</li>
            <li>• Consistent access matters more than sporadic correction</li>
            <li>• Treat mineral issues as a system, not a single-product problem</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'shelter',
    icon: <Home className="h-6 w-6" />,
    title: 'Shelter & Housing',
    subtitle: 'Dryness, airflow, and protection',
    color: 'green',
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Shelter Priorities</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Protection from rain, wind, and direct sun</li>
            <li>• Dry bedding and ground contact prevention</li>
            <li>• Ventilation without direct drafts</li>
            <li>• Separation options for kidding or isolation</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Weather Considerations</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Wet + wind increases hypothermia risk</li>
            <li>• Heat stress risk rises without shade and airflow</li>
            <li>• Humidity with poor ventilation increases respiratory risk</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'daily',
    icon: <CheckSquare className="h-6 w-6" />,
    title: 'Daily Observation',
    subtitle: 'What to notice during routine care',
    color: 'teal',
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Daily Checks</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Appetite and water intake</li>
            <li>• Normal movement and posture</li>
            <li>• Social behavior and alertness</li>
            <li>• Manure consistency</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Why Observation Matters</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Early changes are easier to address than late crises</li>
            <li>• Patterns matter more than single data points</li>
            <li>• Decline over hours to days signals escalation</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'health',
    icon: <Activity className="h-6 w-6" />,
    title: 'Body Condition & Health Signals',
    subtitle: 'Trend monitoring, not diagnosis',
    color: 'red',
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Body Condition</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Evaluate condition by feel, not appearance alone</li>
            <li>• Watch for gradual loss or gain over time</li>
            <li>• Sudden change signals a system problem</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Red Flags</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Persistent off-feed behavior</li>
            <li>• Weakness, collapse, or neurologic signs</li>
            <li>• Straining, pain, or respiratory distress</li>
            <li>• Rapid decline or multiple goats affected</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'herd',
    icon: <Users className="h-6 w-6" />,
    title: 'Herd Management',
    subtitle: 'Social structure and risk control',
    color: 'indigo',
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Social Needs</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Goats are social and should not be kept alone</li>
            <li>• Hierarchies are normal; monitor excessive bullying</li>
            <li>• Separate intact bucks as needed for safety and management</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Biosecurity Basics</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Quarantine new arrivals before herd integration</li>
            <li>• Observe closely during transitions</li>
            <li>• Treat herd-wide changes as system alerts</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'hooves',
    icon: <Scissors className="h-6 w-6" />,
    title: 'Hoof Care',
    subtitle: 'Why it matters and when to act',
    color: 'orange',
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Hoof Health Principles</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Overgrowth and imbalance lead to pain and lameness</li>
            <li>• Wet, dirty conditions increase rot risk</li>
            <li>• Terrain affects natural wear patterns</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Escalation Signals</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Persistent lameness</li>
            <li>• Heat, swelling, or foul odor</li>
            <li>• Sudden inability to bear weight</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'kids',
    icon: <Baby className="h-6 w-6" />,
    title: 'Kid Care',
    subtitle: 'Early priorities and risk awareness',
    color: 'pink',
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Early Priorities</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Rapid access to colostrum is critical</li>
            <li>• Warmth and dryness prevent early losses</li>
            <li>• Observe nursing, energy, and posture closely</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">When to Escalate</h4>
          <ul className="space-y-2 text-gray-600">
            <li>• Weakness or inability to stand</li>
            <li>• Failure to nurse</li>
            <li>• Diarrhea, bloating, or rapid decline</li>
          </ul>
        </div>
      </div>
    ),
  },
];

const colorClasses: Record<string, { bg: string; border: string; icon: string; iconBg: string }> = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', iconBg: 'bg-amber-100' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', iconBg: 'bg-blue-100' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', iconBg: 'bg-green-100' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-600', iconBg: 'bg-teal-100' },
  red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', iconBg: 'bg-red-100' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', iconBg: 'bg-indigo-100' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', iconBg: 'bg-orange-100' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-600', iconBg: 'bg-pink-100' },
};

export default function CareGuidePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('feed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Goat Care Foundations</h1>
        <p className="text-gray-500">
          Baseline husbandry principles to support good management and early recognition of problems.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => {
          const colors = colorClasses[section.color];
          const isExpanded = expandedSection === section.id;

          return (
            <Card key={section.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg ${colors.iconBg} flex items-center justify-center ${colors.icon}`}>
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{section.title}</h3>
                    <p className="text-sm text-gray-500">{section.subtitle}</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>

              {isExpanded && (
                <div className={`border-t ${colors.border} ${colors.bg} p-6`}>
                  {section.content}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="bg-gray-100 border-gray-300 p-6">
        <h3 className="font-semibold text-gray-800 mb-2">Use and Scope</h3>
        <p className="text-sm text-gray-600">
          This guide supports observation and baseline management. It does not replace condition-specific assessment,
          ration formulation, or veterinary care. When a goat is declining or showing concerning signs, escalation
          is the priority—use the GoatWise Conditions system for next steps.
        </p>
      </Card>
    </div>
  );
}
