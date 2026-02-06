'use client';

import { useState } from 'react';
import { Card, Badge } from '@/components/ui';
import { XCircle, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, HelpCircle, Info } from 'lucide-react';

const mythsAndConfusions = [
  {
    id: 1,
    type: 'myth',
    title: 'Alfalfa Causes Urinary Calculi (UC) in Wethers',
    myth: 'Feeding alfalfa to wethers causes urinary calculi (bladder stones).',
    reality:
      'Alfalfa does not inherently cause UC. UC risk rises when the overall diet is imbalanced—especially when phosphorus-heavy feeds push the calcium-to-phosphorus (Ca:P) ratio too low.',
    details: {
      actualCauses: [
        'Ca:P ratio below ~2:1 (diet imbalance)',
        'High-concentrate / high-grain feeding patterns (often higher phosphorus)',
        'Limited water intake or inconsistent access',
        'Mineral-program gaps that affect urinary pH and mineral balance (veterinary-guided)',
      ],
      betterApproach: [
        'Think “diet system,” not “single feed.” Evaluate the full ration (hay + concentrates + minerals).',
        'Aim for an appropriate Ca:P balance and steady water availability, especially for males.',
        'If UC is a concern, use a veterinary-guided prevention plan rather than one-off fixes.',
      ],
      prevention:
        'UC prevention is largely management: consistent clean water, a balanced Ca:P ratio, and avoiding concentrate-heavy rations for wethers and bucks unless there is a clear nutritional need.',
    },
  },
  {
    id: 2,
    type: 'myth',
    title: 'Early Castration Automatically Causes Urinary Calculi (UC)',
    myth: 'Castrating a buckling early automatically causes urinary calculi later.',
    reality:
      'Early castration may increase susceptibility by limiting urethral development, but UC formation is usually driven more by diet composition, hydration, and mineral balance than by castration timing alone.',
    details: {
      actualCauses: [
        'Concentrate-heavy diets (higher phosphorus) without adequate long-stem forage',
        'Inadequate water intake or limited access (especially in cold weather)',
        'Mineral imbalance (including Ca:P imbalance) and inconsistent mineral program',
        'Rapid growth / high-energy feeding patterns in pet and show contexts',
      ],
      betterApproach: [
        'Treat UC as a multi-factor risk: diet + water + minerals first, with castration timing as one contributing variable.',
        'Humane timing varies by region and rule-set; many welfare codes allow the least invasive methods only in very young animals (e.g., first week) and require analgesia/anaesthesia as age increases.',
        'Follow local regulations and a veterinarian’s guidance on pain management and timing for your management goals.',
      ],
      tips:
        'If UC risk is a priority, focus on forage-forward diets, steady water access, and a balanced mineral program—then decide castration timing based on welfare standards, handling capacity, and veterinary guidance.',
    },
  },
  {
    id: 3,
    type: 'myth',
    title: 'Goats Will Eat Anything',
    myth: 'Goats will eat anything and everything, including tin cans.',
    reality:
      'Goats are selective browsers. They explore with their mouths, but they prefer leaves, weeds, brush, and bark—and often refuse contaminated or stale feed.',
    details: {
      actualBehavior: [
        'They investigate objects by mouthing, but do not reliably consume non-food items',
        'They often reject feed that is dirty, damp, moldy, or trampled',
        'They prefer browse and variety over short pasture grass',
        'They do best with clean feeders and consistent access to forage',
      ],
      betterApproach: [
        'Assume “selective browser,” not “garbage disposal.”',
        'Use feeders and clean water sources that reduce contamination and waste.',
        'If a goat is chewing non-food items, evaluate minerals, boredom, and access to forage.',
      ],
      tips:
        'Provide clean hay in feeders (not on the ground) and a consistent mineral program. Variety and browse typically improve intake and reduce nuisance chewing.',
    },
  },
  {
    id: 4,
    type: 'myth',
    title: 'All Goats Need Grain',
    myth: 'All goats need grain as part of their daily diet.',
    reality:
      'Many goats thrive without grain. Concentrates can be useful in specific life stages, but overuse increases risk of obesity, digestive upset, and urinary issues in males.',
    details: {
      whoNeedsGrain: [
        'Some lactating does (especially heavy milkers)',
        'Some late-pregnancy does (depending on body condition and forage quality)',
        'Some growing kids (when forage quality alone cannot meet needs)',
        'Underweight animals under veterinary/nutrition guidance',
        'Some bucks during intense breeding season (case-by-case)',
      ],
      betterApproach: [
        'Start with forage quality and quantity, then add concentrates only when there is a clear nutritional gap.',
        'For males, treat grain as a risk lever: the more concentrate-heavy the ration, the more carefully minerals and water must be managed.',
        'If you’re feeding grain “because goats need it,” re-check the goal (weight gain, lactation support, growth, show finish) and the tradeoffs.',
      ],
      tips:
        'Maintenance adults often do well on quality hay/browse plus loose minerals. Wethers and bucks are commonly safer on forage-forward rations unless there is a specific reason to add concentrates.',
    },
  },
  {
    id: 5,
    type: 'myth',
    title: 'Deworming on a Schedule is Best',
    myth: 'You should deworm all goats on a regular schedule (monthly, quarterly, etc.).',
    reality:
      'Routine blanket deworming accelerates parasite resistance. It removes susceptible worms and leaves the most resistant survivors to reproduce.',
    details: {
      betterApproach: [
        'Use targeted selective treatment (TST): treat individuals based on validated indicators and risk.',
        'Combine observation tools (e.g., FAMACHA for anemia) with body condition and herd history.',
        'Use fecal egg counts when available to confirm burden and guide decisions.',
        'Preserve refugia (some untreated parasites) to slow resistance over time.',
      ],
      tips:
        'If parasites are a recurring issue, evaluate pasture pressure, stocking density, nutrition, and the accuracy of your deworming strategy (product selection, dosing accuracy, and follow-up checks) with veterinary support.',
    },
  },
  {
    id: 6,
    type: 'myth',
    title: 'Baking Soda Prevents Bloat',
    myth: 'Free-choice baking soda prevents bloat and should always be available.',
    reality:
      'Baking soda can be useful in select situations, but constant free-choice access can mask diet problems and disrupt normal rumen function in some goats.',
    details: {
      concerns: [
        'Rumen pH regulation is part of normal digestion',
        'Persistent “baking soda seeking” often signals a ration imbalance',
        'Over-reliance can delay addressing forage quality, concentrate load, or sudden feed changes',
      ],
      betterApproach: [
        'Prioritize a stable, forage-forward ration and avoid abrupt feed changes.',
        'Treat baking soda as a tool—not a substitute for ration design.',
        'If bloat is recurring, reassess feed type, feeding transitions, and access to long-stem fiber.',
      ],
      tips:
        'Most bloat prevention comes from management: gradual feed changes, adequate long-stem forage, and avoiding sudden access to rich feeds.',
    },
  },
  {
    id: 7,
    type: 'myth',
    title: 'Apple Cider Vinegar Cures Everything',
    myth: 'ACV cures parasites, prevents illness, improves milk production, and more.',
    reality:
      'Evidence for most ACV claims is limited. It may affect palatability for some goats, but it is not a substitute for diagnosis, prevention programs, or veterinary-guided escalation.',
    details: {
      concerns: [
        'Antiparasitic and “cure-all” claims are not supported by good evidence',
        'Using ACV as a primary strategy can delay effective prevention or escalation',
        'Any additive can have downsides depending on concentration and individual tolerance',
      ],
      betterApproach: [
        'Use ACV (if at all) as a minor husbandry preference—not as parasite control or disease prevention.',
        'When illness risk is high, rely on evidence-based prevention (vaccination, biosecurity, nutrition, sanitation) and timely veterinary input.',
        'If a goat is unwell, prioritize assessment and escalation over “trying things.”',
      ],
      tips:
        'If you want to use ACV, keep expectations modest and track outcomes. If the goal is parasite control or infection prevention, use validated monitoring and veterinary-guided plans.',
    },
  },
  {
    id: 8,
    type: 'myth',
    title: "Goats Don't Need Shelter",
    myth: 'Goats are hardy animals that can live outdoors without shelter.',
    reality:
      'Goats tolerate cold better than wet. Wind-driven rain, damp bedding, and drafts increase stress and respiratory risk—especially for kids and thin animals.',
    details: {
      requirements: [
        'At minimum, a three-sided shelter from rain, wind, and direct sun',
        'Dry bedding with a way to stay off wet ground',
        'Ventilation without direct drafts on resting goats',
        'Extra protection for kids and newly shorn/short-coated animals',
      ],
      betterApproach: [
        'Design shelter around dryness and wind protection first.',
        'Treat bedding management as “part of shelter,” not an afterthought.',
        'If pneumonia risk is recurring, review ventilation and stocking density.',
      ],
      tips:
        'A dry, draft-managed shelter supports immune function and reduces weather-related stress. Wet + wind is a common trigger for trouble.',
    },
  },
  {
    id: 9,
    type: 'myth',
    title: 'Vaccines Cause Caseous Lymphadenitis (CL)',
    myth: 'CDT vaccines cause CL abscesses.',
    reality:
      'CL is caused by the bacterium Corynebacterium pseudotuberculosis, not by CDT vaccination. Injection-site reactions can occur, and poor technique can introduce environmental bacteria.',
    details: {
      clarification: [
        'CL spreads through pus from abscesses and contaminated environments',
        'Sterile vaccine-site lumps can happen and are not the same as CL',
        'CL abscesses often have thick, “cheesy” pus and follow predictable locations',
        'Reducing needle re-use and improving technique lowers injection-related problems',
      ],
      betterApproach: [
        'Separate “disease cause” from “injection reaction.” They can look similar but have different implications.',
        'Use clean technique (needle hygiene, correct site, calm handling) to reduce local reactions.',
        'If abscess patterns recur, treat it as a herd-level biosecurity question and escalate appropriately.',
      ],
      prevention:
        'Good injection hygiene and thoughtful herd biosecurity reduce confusion and help you distinguish sterile reactions from infectious abscesses.',
    },
  },
  {
    id: 10,
    type: 'confusion',
    title: 'Contracted Tendons vs. White Muscle Disease',
    description: "Both can affect a kid's ability to stand and walk, which can lead to the wrong next step.",
    comparison: {
      condition1: {
        name: 'Contracted Tendons',
        cause: 'Positional in utero, nutritional status of the dam, genetics',
        symptoms: 'Knuckling over; legs bent forward; walking on knees',
        when: 'Often present at birth or shortly after',
        affected: 'Tendons/joints (often front limbs)',
        management: 'Often addressed with supportive positioning and veterinary-guided plans; severity varies',
      },
      condition2: {
        name: 'White Muscle Disease',
        cause: 'Selenium/Vitamin E deficiency (regional and diet-dependent)',
        symptoms: 'Weakness, stiffness, tremors; difficulty rising; may worsen',
        when: 'Can develop days to weeks after birth',
        affected: 'Skeletal and sometimes cardiac muscle',
        management: 'Veterinary-guided deficiency correction and supportive care; urgency depends on severity',
      },
    },
    keyPoint:
      'The look-alike trap: contracted tendons are a limb/joint presentation, while white muscle disease is systemic muscle weakness. When in doubt, escalate early—especially if weakness is worsening.',
  },
  {
    id: 11,
    type: 'confusion',
    title: 'Copper Deficiency vs. Copper Toxicity',
    description: 'Some signs overlap, but the implications (and next steps) are very different.',
    comparison: {
      condition1: {
        name: 'Copper Deficiency',
        cause: 'Low copper intake or absorption blocked by iron/sulfur/molybdenum',
        symptoms: 'Faded coat, “fish tail,” hair loss, poor growth, anemia, weak kids',
        frequency: 'Common in goats (varies by region and management)',
        management: 'Best confirmed with testing and ration review before correcting',
      },
      condition2: {
        name: 'Copper Toxicity',
        cause: 'Excess intake (often from overcorrection or sheep/goat mix-ups)',
        symptoms: 'Dark urine, jaundice, lethargy; may progress rapidly',
        frequency: 'Less common in goats than in sheep; still possible with excessive exposure',
        management: 'Urgent veterinary evaluation; treat as a true emergency risk',
      },
    },
    keyPoint:
      'Copper problems are a testing problem first. Guessing can push you from deficiency into toxicity (or miss an entirely different cause).',
  },
  {
    id: 12,
    type: 'confusion',
    title: 'Bloat vs. Full Rumen',
    description: "A round left side doesn't always mean bloat—context matters.",
    comparison: {
      condition1: {
        name: 'Normal Full Rumen',
        appearance: 'Left side slightly rounded after eating',
        behavior: 'Eating/ruminating normally; comfortable',
        sound: 'Normal resonance when tapped',
        action: 'Observe—this is a normal finding after a good meal.',
      },
      condition2: {
        name: 'Bloat',
        appearance: 'Left side very distended and tight (drum-like)',
        behavior: 'Distress; not eating; discomfort; may have breathing difficulty',
        sound: 'Hollow/ping sound may be present',
        action: 'Urgent escalation—true bloat can become life-threatening quickly.',
      },
    },
    keyPoint: 'A full rumen is normal. True bloat is about tight distension plus distress. If you see distress, escalate immediately.',
  },
  {
    id: 13,
    type: 'confusion',
    title: 'Room Temperature Milk vs. Warm Milk for Kids',
    description: 'Temperature gets debated, but the bigger risks are usually elsewhere.',
    comparison: {
      condition1: {
        name: 'Room Temperature Milk',
        claim: 'Prevents bloat; more “natural”',
        reality: 'Many kids can adapt to room-temperature milk',
        consideration: 'Sudden temperature changes can upset digestion in some kids',
      },
      condition2: {
        name: 'Warm Milk',
        claim: "Better digestion; closer to dam's milk",
        reality: 'Body-temp milk is often better tolerated in very young or stressed kids',
        consideration: 'More effort, but can improve consistency in early life',
      },
    },
    keyPoint:
      'The biggest drivers are consistency (mixing accuracy), hygiene, feeding volumes, and gradual changes. Temperature matters less than abrupt changes and overall feeding management.',
  },
  {
    id: 14,
    type: 'myth',
    title: 'Goat Milk Tastes “Goaty”',
    myth: 'Goat milk has an inherently strong, “goaty” taste.',
    reality:
      'Fresh, well-handled goat milk is often mild. Strong flavors are more commonly tied to buck odor exposure, slow cooling, feed flavors, or milk age.',
    details: {
      actualCauses: [
        'Bucks housed near milking does (odor transfer)',
        'Slow cooling or poor handling after milking',
        'Does eating strongly flavored plants',
        'Older milk',
        'Individual differences by doe and breed',
      ],
      betterApproach: [
        'Treat flavor as a handling and environment variable first.',
        'Separate bucks from milking areas when possible and prioritize fast cooling.',
        'If flavor is persistent, evaluate feed and handling steps systematically.',
      ],
      tips:
        'Fast chilling and clean equipment make the biggest difference. If you’re troubleshooting flavor, change one variable at a time so you can see what helps.',
    },
  },
  {
    id: 15,
    type: 'myth',
    title: 'Goats and Sheep Can Share Everything',
    myth: 'Goats and sheep are similar enough to share all resources and care.',
    reality:
      'They overlap, but there are critical differences—especially around copper needs—making shared mineral programs risky.',
    details: {
      criticalDifferences: [
        'Goats generally require more copper; sheep are more sensitive to excess copper',
        'Sheep minerals may be inadequate for goats; goat minerals may be unsafe for sheep',
        'Parasite susceptibility and management can differ',
        'Nutrient needs and production goals differ',
      ],
      betterApproach: [
        'If you keep mixed species, treat minerals as separate systems.',
        'Avoid “one mineral for everyone” unless it is specifically designed for mixed herds and vetted for copper levels.',
        'When problems show up (coat, growth, anemia), review minerals as a first-line herd system check.',
      ],
      tips:
        'Mixed herds can work well with clear separation of minerals and thoughtful feeding management. Minerals are a common source of preventable mistakes.',
    },
  },
];

export default function MythsPage() {
  const [expandedItem, setExpandedItem] = useState<number | null>(1);
  const [filter, setFilter] = useState<'all' | 'myths' | 'confusions'>('all');

  const filteredItems = mythsAndConfusions.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'myths') return item.type === 'myth';
    if (filter === 'confusions') return item.type === 'confusion';
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Myths & Common Confusions</h1>
        <p className="text-gray-500">
          Clear up misconceptions that delay accurate assessment or appropriate escalation.
        </p>
      </div>

      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-full">
            <HelpCircle className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-purple-900 text-lg">How to Use This Tab</h2>
            <p className="text-purple-800 mt-1">
              This section helps you spot common misconceptions and look-alike situations. It does not provide treatment
              instructions. When a condition is suspected, use the Conditions system for field-manual guidance and clear
              escalation thresholds, and involve a licensed veterinarian as needed.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({mythsAndConfusions.length})
        </button>
        <button
          onClick={() => setFilter('myths')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'myths' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <span className="flex items-center gap-1"><XCircle className="h-4 w-4" /> Myths</span>
        </button>
        <button
          onClick={() => setFilter('confusions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'confusions' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <span className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Confusions</span>
        </button>
      </div>

      <div className="space-y-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <button
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'myth' ? 'bg-red-100' : 'bg-amber-100'}`}>
                  {item.type === 'myth' ? <XCircle className="h-6 w-6 text-red-600" /> : <AlertTriangle className="h-6 w-6 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={item.type === 'myth' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                      {item.type === 'myth' ? 'MYTH' : 'CONFUSION'}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg">{item.title}</h3>
                  {item.type === 'myth' && 'reality' in item && (
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-green-700 font-medium text-sm">{item.reality}</span>
                    </div>
                  )}
                  {item.type === 'confusion' && 'description' in item && (
                    <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                  )}
                </div>
                {expandedItem === item.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </div>
            </button>

            {expandedItem === item.id && (
              <div className="border-t bg-gray-50 p-4">
                {item.type === 'myth' && 'details' in item && (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2"><XCircle className="h-4 w-4" /> The Myth</h4>
                      <p className="text-red-700">{item.myth}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> The Reality</h4>
                      <p className="text-green-700">{item.reality}</p>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      {item.details?.actualCauses && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">What Actually Drives This:</h4>
                          <ul className="space-y-1">{item.details?.actualCauses.map((c: string, i: number) => <li key={i} className="text-sm text-gray-600">• {c}</li>)}</ul>
                        </div>
                      )}
                      {item.details?.actualBehavior && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">What’s Often True Instead:</h4>
                          <ul className="space-y-1">{item.details?.actualBehavior.map((b: string, i: number) => <li key={i} className="text-sm text-gray-600">• {b}</li>)}</ul>
                        </div>
                      )}
                      {item.details?.whoNeedsGrain && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">When Grain Can Make Sense:</h4>
                          <ul className="space-y-1">{item.details?.whoNeedsGrain.map((w: string, i: number) => <li key={i} className="text-sm text-gray-600">• {w}</li>)}</ul>
                        </div>
                      )}
                      {item.details?.betterApproach && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Field-Manual Framing:</h4>
                          <ul className="space-y-1">{item.details?.betterApproach.map((a: string, i: number) => <li key={i} className="text-sm text-gray-600">• {a}</li>)}</ul>
                        </div>
                      )}
                      {item.details?.concerns && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Common Failure Modes:</h4>
                          <ul className="space-y-1">{item.details?.concerns.map((c: string, i: number) => <li key={i} className="text-sm text-gray-600">• {c}</li>)}</ul>
                        </div>
                      )}
                      {item.details?.requirements && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Minimum Standard:</h4>
                          <ul className="space-y-1">{item.details?.requirements.map((r: string, i: number) => <li key={i} className="text-sm text-gray-600">• {r}</li>)}</ul>
                        </div>
                      )}
                      {item.details?.clarification && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Clarification:</h4>
                          <ul className="space-y-1">{item.details?.clarification.map((c: string, i: number) => <li key={i} className="text-sm text-gray-600">• {c}</li>)}</ul>
                        </div>
                      )}
                      {item.details?.criticalDifferences && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Critical Difference:</h4>
                          <ul className="space-y-1">{item.details?.criticalDifferences.map((d: string, i: number) => <li key={i} className="text-sm text-gray-600">• {d}</li>)}</ul>
                        </div>
                      )}
                      {(item.details?.tips || item.details?.prevention) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                          <h4 className="font-medium text-blue-800 mb-1 flex items-center gap-2"><Info className="h-4 w-4" /> {item.details?.prevention ? 'Bottom Line' : 'Notes'}</h4>
                          <p className="text-sm text-blue-700">{item.details?.tips || item.details?.prevention}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {item.type === 'confusion' && 'comparison' in item && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-3">{item.comparison?.condition1.name}</h4>
                        <div className="space-y-2 text-sm">
                          {Object.entries(item.comparison?.condition1 || {}).map(([key, value]) => {
                            if (key === 'name') return null;
                            return (
                              <div key={key}>
                                <span className="font-medium text-blue-800 capitalize">{key}: </span>
                                <span className="text-blue-700">{value as string}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 mb-3">{item.comparison?.condition2.name}</h4>
                        <div className="space-y-2 text-sm">
                          {Object.entries(item.comparison?.condition2 || {}).map(([key, value]) => {
                            if (key === 'name') return null;
                            return (
                              <div key={key}>
                                <span className="font-medium text-purple-800 capitalize">{key}: </span>
                                <span className="text-purple-700">{value as string}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    {'keyPoint' in item && item.keyPoint && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-medium text-amber-800 mb-1 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Key Distinction</h4>
                        <p className="text-amber-700">{item.keyPoint}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="bg-gray-100 border-gray-300 p-6">
        <h3 className="font-semibold text-gray-800 mb-2">Use and Scope</h3>
        <p className="text-sm text-gray-600">
          This tab is educational and designed to reduce misinterpretation and delayed escalation. It does not provide
          treatment instructions. For condition-specific guidance, use the GoatWise Conditions system and consult a
          licensed veterinarian for diagnosis and medical decision-making.
        </p>
      </Card>
    </div>
  );
}
