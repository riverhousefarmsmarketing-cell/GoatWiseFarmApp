'use client';

import { useState, useMemo } from 'react';
import { Card, Badge, Input } from '@/components/ui';
import { Pill, Search, AlertTriangle, Info, ShieldAlert, XCircle } from 'lucide-react';

type EvidenceLevel = 'High' | 'Moderate' | 'Limited';
type RiskLevel = 'Low' | 'Moderate' | 'High';
type OversightLevel = 'OTC' | 'Veterinary Guidance' | 'Prescription / Vet-Directed';

interface Medication {
  id: number;
  name: string;
  category: string;
  drugClass: string;
  commonContexts: string[]; // problem domains, not diagnoses
  overview: string;
  misconceptions: string[];
  misuseRisks: string[];
  oversight: OversightLevel;
  evidence: EvidenceLevel;
  risk: RiskLevel;
  notes: string[];
  whenToEscalate: string;
}

const medications: Medication[] = [
  {
    id: 1,
    name: 'Ivermectin',
    category: 'Antiparasitic',
    drugClass: 'Macrocyclic lactone',
    commonContexts: [
      'Internal parasite control programs',
      'External parasite management',
      'Resistance discussions in small ruminants',
    ],
    overview:
      'A widely known antiparasitic used across species. Effectiveness depends on parasite species, resistance patterns, and management system.',
    misconceptions: [
      '“It works for all worms”',
      '“If it worked before, it will always work again”',
      '“Pour-on products are interchangeable across species”',
    ],
    misuseRisks: [
      'Widespread resistance due to overuse and under-dosing',
      'Using inappropriate formulations',
      'Treating without confirming need',
    ],
    oversight: 'Veterinary Guidance',
    evidence: 'High',
    risk: 'Moderate',
    notes: [
      'Parasite control is a system involving monitoring, pasture management, and targeted treatment.',
      'GoatWise routes parasite decisions through FAMACHA, fecals, and condition trends.',
    ],
    whenToEscalate:
      'Escalate when anemia indicators worsen, weight loss progresses, kids fail to thrive, or multiple animals decline.',
  },
  {
    id: 2,
    name: 'Fenbendazole',
    category: 'Antiparasitic',
    drugClass: 'Benzimidazole',
    commonContexts: [
      'Parasite rotation discussions',
      'Tapeworm conversations',
      'Herd-level resistance concerns',
    ],
    overview:
      'A benzimidazole-class antiparasitic with a long history of use. Effectiveness varies widely due to resistance.',
    misconceptions: [
      '“One dose clears parasites”',
      '“Higher doses fix resistance”',
    ],
    misuseRisks: [
      'False reassurance leading to delayed effective treatment',
      'Unnecessary repeated use',
    ],
    oversight: 'Veterinary Guidance',
    evidence: 'Moderate',
    risk: 'Moderate',
    notes: [
      'Often discussed in the context of resistance and limited efficacy.',
      'Use should be based on evidence of susceptibility.',
    ],
    whenToEscalate:
      'Escalate if clinical signs of parasitism persist despite management changes.',
  },
  {
    id: 3,
    name: 'Albendazole',
    category: 'Antiparasitic',
    drugClass: 'Benzimidazole',
    commonContexts: [
      'Broad-spectrum parasite discussions',
      'Liver fluke conversations (region dependent)',
    ],
    overview:
      'A broad-spectrum antiparasitic with specific safety considerations.',
    misconceptions: [
      '“Safe at any life stage”',
    ],
    misuseRisks: [
      'Pregnancy loss or birth defects if misused',
      'Assuming broad spectrum equals appropriate',
    ],
    oversight: 'Veterinary Guidance',
    evidence: 'High',
    risk: 'High',
    notes: [
      'Safety profile depends on timing and context.',
      'Not all parasites present the same risk.',
    ],
    whenToEscalate:
      'Escalate parasite concerns during pregnancy to veterinary review.',
  },
  {
    id: 4,
    name: 'Penicillin (Penicillin G)',
    category: 'Antibiotic',
    drugClass: 'Beta-lactam',
    commonContexts: [
      'Bacterial infection discussions',
      'Wound management conversations',
    ],
    overview:
      'A long-standing antibiotic used in specific bacterial infections. Effectiveness depends on organism and susceptibility.',
    misconceptions: [
      '“Antibiotics fix any infection”',
      '“Stopping early is fine if the goat looks better”',
    ],
    misuseRisks: [
      'Antibiotic resistance',
      'Masking serious disease',
      'Allergic reactions',
    ],
    oversight: 'Prescription / Vet-Directed',
    evidence: 'High',
    risk: 'High',
    notes: [
      'Antibiotics should follow diagnosis or strong suspicion of bacterial disease.',
      'Viral and parasitic conditions do not respond to antibiotics.',
    ],
    whenToEscalate:
      'Escalate for rapidly worsening infection, systemic illness, or lack of response.',
  },
  {
    id: 5,
    name: 'Oxytetracycline',
    category: 'Antibiotic',
    drugClass: 'Tetracycline',
    commonContexts: [
      'Respiratory disease discussions',
      'Eye and wound infection conversations',
    ],
    overview:
      'A broad-spectrum antibiotic used in specific bacterial contexts.',
    misconceptions: [
      '“Broad-spectrum means always appropriate”',
    ],
    misuseRisks: [
      'Injection site damage',
      'Resistance development',
    ],
    oversight: 'Prescription / Vet-Directed',
    evidence: 'High',
    risk: 'High',
    notes: [
      'Choice of antibiotic should reflect likely organism and disease severity.',
    ],
    whenToEscalate:
      'Escalate if fever, respiratory distress, or systemic signs are present.',
  },
  {
    id: 6,
    name: 'NSAIDs (e.g., Flunixin)',
    category: 'Pain & Inflammation',
    drugClass: 'Non-steroidal anti-inflammatory',
    commonContexts: [
      'Pain management discussions',
      'Fever reduction conversations',
    ],
    overview:
      'Medications used to reduce pain, inflammation, and fever. Useful but can mask disease severity.',
    misconceptions: [
      '“Pain relief alone solves the problem”',
    ],
    misuseRisks: [
      'Masking worsening illness',
      'Organ stress if misused',
    ],
    oversight: 'Prescription / Vet-Directed',
    evidence: 'High',
    risk: 'High',
    notes: [
      'Pain control should accompany diagnosis, not replace it.',
    ],
    whenToEscalate:
      'Escalate if pain or fever persists or the goat declines.',
  },
  {
    id: 7,
    name: 'Vaccines (CDT)',
    category: 'Preventive',
    drugClass: 'Inactivated vaccine',
    commonContexts: [
      'Preventive health planning',
      'Herd-level disease prevention',
    ],
    overview:
      'Vaccines support prevention of specific diseases and reduce severity, but do not treat active disease.',
    misconceptions: [
      '“Vaccines cause the disease”',
      '“One dose equals lifetime protection”',
    ],
    misuseRisks: [
      'Skipping boosters',
      'Improper storage or handling',
    ],
    oversight: 'Veterinary Guidance',
    evidence: 'High',
    risk: 'Moderate',
    notes: [
      'Vaccination programs are part of herd-level prevention.',
    ],
    whenToEscalate:
      'Escalate if adverse reactions occur or disease is suspected despite vaccination.',
  },
];

const categoryColors: Record<string, string> = {
  Antiparasitic: 'bg-green-100 text-green-700',
  Antibiotic: 'bg-red-100 text-red-700',
  Preventive: 'bg-blue-100 text-blue-700',
  'Pain & Inflammation': 'bg-amber-100 text-amber-700',
};

const evidenceColors: Record<EvidenceLevel, string> = {
  High: 'bg-green-100 text-green-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  Limited: 'bg-gray-100 text-gray-700',
};

const riskColors: Record<RiskLevel, string> = {
  Low: 'bg-green-100 text-green-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  High: 'bg-red-100 text-red-700',
};

export default function MedicationsPage() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return medications.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.overview.toLowerCase().includes(q) ||
        m.commonContexts.some((c) => c.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Common Medications (Orientation)</h1>
        <p className="text-gray-500">
          A calm reference explaining what categories of medications are commonly used for, where confusion arises,
          and when veterinary involvement is essential.
        </p>
      </div>

      <Card className="bg-amber-50 border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Scope & Safety</h3>
            <p className="text-sm text-amber-700 mt-1">
              This page does not provide dosing, routes of administration, or treatment protocols.
              It is designed to reduce misinformation and highlight when assessment and escalation matter.
              Use the GoatWise Conditions system for symptoms, decisions, and next steps.
            </p>
          </div>
        </div>
      </Card>

      <Input
        placeholder="Search medications or categories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-4">
        {filtered.map((m) => {
          const isOpen = expanded === m.id;
          return (
            <Card key={m.id} className="overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : m.id)}
                className="w-full p-4 text-left flex justify-between items-start hover:bg-gray-50"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={categoryColors[m.category] || 'bg-gray-100 text-gray-700'}>
                      {m.category}
                    </Badge>
                    <Badge className={evidenceColors[m.evidence]}>Evidence: {m.evidence}</Badge>
                    <Badge className={riskColors[m.risk]}>Risk: {m.risk}</Badge>
                    <Badge className="bg-slate-100 text-slate-700">{m.oversight}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900">{m.name}</h3>
                  <p className="text-sm text-gray-600">{m.overview}</p>
                </div>
                <Pill className="h-5 w-5 text-gray-400" />
              </button>

              {isOpen && (
                <div className="border-t bg-gray-50 p-4 space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Common contexts</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {m.commonContexts.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Common misconceptions</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {m.misconceptions.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Misuse risks</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {m.misuseRisks.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <h4 className="font-medium text-amber-800 mb-1 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4" /> When to escalate
                    </h4>
                    <p className="text-sm text-amber-700">{m.whenToEscalate}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Notes</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {m.notes.map((n, i) => (
                        <li key={i}>• {n}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="bg-gray-100 border-gray-300 p-6">
        <h3 className="font-semibold text-gray-800 mb-2">Use and Scope</h3>
        <p className="text-sm text-gray-600">
          Medications are powerful tools that require context. If a goat is declining, in pain, obstructed,
          or showing neurologic signs, escalation beats experimentation. Use GoatWise Conditions for assessment
          and consult a licensed veterinarian for medication decisions.
        </p>
      </Card>
    </div>
  );
}
