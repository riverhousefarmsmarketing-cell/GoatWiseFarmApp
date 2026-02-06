'use client';

import { useMemo, useState } from 'react';
import { Card, Badge } from '@/components/ui';
import { Search, AlertTriangle, ChevronDown, ChevronUp, Info, CheckCircle, XCircle, ShieldAlert, FlaskConical } from 'lucide-react';

type EvidenceLevel = 'High' | 'Moderate' | 'Limited' | 'Not Supported';
type RiskLevel = 'Low' | 'Moderate' | 'High';
type IntendedRole = 'Supportive' | 'Corrective (Vet-guided)' | 'Emergency (Vet-level)' | 'Controversial / Often Misused';

type Supplement = {
  id: number;
  name: string;
  category: string;
  intendedRole: IntendedRole;
  evidence: EvidenceLevel;
  risk: RiskLevel;
  overview: string;
  commonContexts: string[]; // high-level scenarios, not instructions
  whatItIs: string;
  misuseRisks: string[];
  notes: string[]; // field-manual framing
  whenToEscalate: string; // escalation threshold language
  controversy?: string | null;
  warnings?: string | null;
  conditionLinks?: string[]; // references to GoatWise Conditions (labels only)
};

const supplements: Supplement[] = [
  {
    id: 1,
    name: 'Copper Bolus (Copper Oxide Wire Particles)',
    category: 'Mineral',
    intendedRole: 'Corrective (Vet-guided)',
    evidence: 'Moderate',
    risk: 'High',
    overview:
      'A concentrated copper source used in goats when copper status is truly low and the mineral program cannot correct it fast enough.',
    whatItIs:
      'Copper oxide wire particles in a capsule designed to release copper over time.',
    commonContexts: [
      'Suspected or confirmed copper deficiency (region and ration dependent)',
      'Coat changes, poor growth, or reproductive performance concerns where copper is one variable',
      'Herds with known antagonists (iron, sulfur, molybdenum) that impair copper absorption',
    ],
    misuseRisks: [
      'Toxicity from overcorrection or stacking multiple copper sources',
      'Species mix-ups (sheep are more sensitive to copper excess)',
      'Masking a broader mineral-program problem',
    ],
    notes: [
      'Treat copper as a testing-and-ration question first, not a “one supplement fixes everything” question.',
      'Copper problems often reflect the full mineral system (antagonists, mineral form, intake consistency).',
    ],
    whenToEscalate:
      'Escalate if deficiency signs persist despite a consistent mineral program, if multiple goats are affected, or if toxicity is a concern (jaundice, dark urine, sudden weakness).',
    warnings:
      'High-risk supplement: use veterinary guidance and ration review. Do not assume copper deficiency without evidence.',
    controversy: null,
    conditionLinks: ['Coat Changes', 'Poor Growth', 'Anemia (Differentials)', 'Mineral Program Review'],
  },
  {
    id: 2,
    name: 'Selenium Support (Regional Deficiency Context)',
    category: 'Mineral/Vitamin',
    intendedRole: 'Corrective (Vet-guided)',
    evidence: 'High',
    risk: 'High',
    overview:
      'Selenium status is highly regional. In deficient areas, correcting true deficiency can be critical—misuse can be dangerous.',
    whatItIs:
      'Selenium + Vitamin E support may be delivered through multiple forms; injectable products exist but typically require veterinary involvement.',
    commonContexts: [
      'Known selenium-deficient regions',
      'Weak kids / muscle weakness concerns where deficiency is plausible',
      'Periparturient support planning under veterinary guidance',
    ],
    misuseRisks: [
      'Narrow safety margin: toxicity risk if overcorrected',
      'Assuming deficiency without confirming regional status or ration inputs',
      'Confusing supportive supplementation with treatment of unrelated weakness',
    ],
    notes: [
      'Selenium is a “location + ration” variable. The same plan is not appropriate everywhere.',
      'If neurologic signs, collapse, or rapidly worsening weakness is present, treat as an escalation situation.',
    ],
    whenToEscalate:
      'Escalate early for weak kids, progressive weakness, or suspected deficiency in high-risk regions—especially if multiple animals are affected.',
    warnings:
      'High-risk area-dependent supplement. Work with a veterinarian to determine need and safe correction strategy.',
    controversy: null,
    conditionLinks: ['Weak Newborn', 'Muscle Weakness', 'Kidding Support', 'Mineral Program Review'],
  },
  {
    id: 3,
    name: 'Probiotics',
    category: 'Digestive',
    intendedRole: 'Supportive',
    evidence: 'Limited',
    risk: 'Low',
    overview:
      'Often used as supportive care during stress or after digestive disruption. Generally low-risk, but not a substitute for diagnosis.',
    whatItIs:
      'Live microbial cultures intended to support gut function; quality and survivability vary by product.',
    commonContexts: [
      'After appetite disruption, transport, or stress events',
      'During recovery periods where intake has been inconsistent',
      'After antibiotic courses (supportive context)',
    ],
    misuseRisks: [
      'Using probiotics in place of identifying the true cause (coccidia, parasites, diet transition, infection)',
      'Assuming they “fix” rumen dysfunction without addressing feed management',
    ],
    notes: [
      'Supportive tools are best paired with a clear “why is this goat off?” assessment.',
      'If symptoms worsen or dehydration develops, escalation is the priority.',
    ],
    whenToEscalate:
      'Escalate if diarrhea is severe or persistent, the goat is off feed, dehydrated, weak, or showing pain.',
    controversy:
      'Debate exists about how well oral probiotics establish in adult ruminants; benefits may be situational and product-dependent.',
    warnings: 'Low-risk supportive tool; avoid letting it delay evaluation of the underlying cause.',
    conditionLinks: ['Diarrhea', 'Off Feed', 'Post-Antibiotic Support', 'Diet Transitions'],
  },
  {
    id: 4,
    name: 'Energy Drench Products',
    category: 'Energy/Vitamin',
    intendedRole: 'Supportive',
    evidence: 'Limited',
    risk: 'Moderate',
    overview:
      'Used as short-term energy support in select situations. Helpful as a bridge, not a solution.',
    whatItIs:
      'Commercial energy/vitamin drenches vary widely; many rely on simple carbohydrate sources.',
    commonContexts: [
      'Short-term appetite dips where the underlying cause is being addressed',
      'Postpartum fatigue contexts (supportive, alongside assessment)',
      'Recovery support where intake is improving but not yet normal',
    ],
    misuseRisks: [
      'Masking worsening metabolic problems by focusing on “boosts”',
      'Replacing adequate forage intake and ration correction with repeated “quick fixes”',
    ],
    notes: [
      'If you need repeated “boosts,” the system (ration, illness, hydration) needs evaluation.',
      'Use the Conditions system to identify why the goat is low-energy rather than chasing symptoms.',
    ],
    whenToEscalate:
      'Escalate if the goat is not eating, is weak, shows neurologic signs, has abnormal breathing, or declines over hours.',
    controversy:
      'Some experienced keepers view many drenches as expensive symptom support. Value depends on context and what else is being done.',
    warnings: 'Supportive only. If a goat is deteriorating, escalation beats supplementation.',
    conditionLinks: ['Off Feed', 'Post-Kidding Support', 'Weakness', 'Metabolic Concerns'],
  },
  {
    id: 5,
    name: 'Iron “Blood Builder” Products (Off-Label Use)',
    category: 'Supportive',
    intendedRole: 'Controversial / Often Misused',
    evidence: 'Limited',
    risk: 'Moderate',
    overview:
      'Sometimes used as short-term support in true iron-deficiency scenarios, but most goat anemia is not iron-deficiency. Misuse can worsen mineral balance.',
    whatItIs:
      'Iron + vitamin products marketed for other species are sometimes used in goats; appropriateness depends on the cause of anemia.',
    commonContexts: [
      'Anemia workups where iron status is one variable (not assumed)',
      'Recovery contexts after confirmed blood loss (case-by-case)',
    ],
    misuseRisks: [
      'Treating parasite-driven anemia with iron instead of addressing parasite burden',
      'Interfering with copper absorption and mineral balance',
      'Delayed escalation when anemia is severe',
    ],
    notes: [
      'Anemia is a differential diagnosis problem first. “Support” depends on the cause.',
      'If anemia is significant, prioritize escalation and confirming the driver (parasites, nutrition, bleeding, chronic disease).',
    ],
    whenToEscalate:
      'Escalate urgently for very pale membranes, weakness, collapse, rapid breathing, or suspected heavy parasite burden.',
    controversy:
      'Iron supplementation is debated because many cases are parasite-driven and iron can interfere with copper status. Use only with a clear rationale.',
    warnings:
      'Do not let “blood builders” delay parasite assessment, fecal evaluation, or veterinary escalation when anemia is significant.',
    conditionLinks: ['Anemia (FAMACHA)', 'Parasites', 'Weakness', 'Mineral Program Review'],
  },
  {
    id: 6,
    name: 'Propylene Glycol',
    category: 'Energy',
    intendedRole: 'Emergency (Vet-level)',
    evidence: 'High',
    risk: 'Moderate',
    overview:
      'A high-impact metabolic support tool used in pregnancy toxemia/ketosis contexts. Useful, but should trigger condition-level evaluation.',
    whatItIs:
      'A glucose precursor that can support energy balance in specific metabolic states.',
    commonContexts: [
      'Metabolic risk windows in late pregnancy (especially poor intake)',
      'Suspected ketosis/pregnancy toxemia contexts (requires condition-level assessment)',
    ],
    misuseRisks: [
      'Using it repeatedly without addressing the underlying cause of poor intake',
      'Delaying escalation when a doe is declining',
    ],
    notes: [
      'In GoatWise, this belongs to a metabolic escalation pathway, not a general supplement routine.',
      'If a pregnant doe is off feed or deteriorating, treat it as time-sensitive.',
    ],
    whenToEscalate:
      'Escalate immediately if a late-pregnant doe is off feed, weak, neurologic, or declining—this is not a “wait and see” scenario.',
    controversy: null,
    warnings:
      'Emergency-adjacent tool. Use under veterinary guidance as part of a metabolic plan, not as a standalone fix.',
    conditionLinks: ['Pregnancy Toxemia / Ketosis', 'Off Feed', 'Late Pregnancy Monitoring'],
  },
  {
    id: 7,
    name: 'Apple Cider Vinegar (ACV)',
    category: 'General Tonic',
    intendedRole: 'Controversial / Often Misused',
    evidence: 'Not Supported',
    risk: 'Low',
    overview:
      'Often promoted as a cure-all. Any benefits are likely minor and context-dependent; it should not replace validated prevention or escalation.',
    whatItIs:
      'A vinegar product sometimes used as a water additive or tonic; claims often exceed evidence.',
    commonContexts: [
      'Keeper preference as a minor husbandry additive',
      'Palatability experiments (some goats drink more, some less)',
    ],
    misuseRisks: [
      'Replacing parasite monitoring and effective control with “natural tonic” thinking',
      'Delaying escalation for serious conditions',
    ],
    notes: [
      'If the goal is parasite control or illness prevention, rely on monitoring, biosecurity, nutrition, and evidence-based plans.',
      'Track outcomes if you use it; avoid attributing improvements without evidence.',
    ],
    whenToEscalate:
      'Escalate based on the goat’s condition (off feed, weakness, anemia, dehydration, fever), not based on whether ACV was tried.',
    controversy:
      'Strong beliefs exist on both sides. Evidence for major health claims is limited; do not treat it as medicine.',
    warnings: 'Low-risk in modest husbandry contexts, high-risk when it delays diagnosis or escalation.',
    conditionLinks: ['Parasites', 'Off Feed', 'Diarrhea', 'Fever'],
  },
  {
    id: 8,
    name: 'Baking Soda',
    category: 'Digestive',
    intendedRole: 'Supportive',
    evidence: 'Limited',
    risk: 'Moderate',
    overview:
      'Can be relevant in specific digestive contexts, but habitual reliance can obscure ration design problems.',
    whatItIs:
      'Sodium bicarbonate used to buffer acidity; effects depend on diet and intake patterns.',
    commonContexts: [
      'Diet transitions where rumen stability is being monitored',
      'Post-upset supportive context (alongside ration review)',
    ],
    misuseRisks: [
      'Masking concentrate-heavy feeding problems',
      'Overconsumption indicating diet imbalance',
      'Assuming it prevents all bloat without addressing forage and transitions',
    ],
    notes: [
      'If goats seek it constantly, treat that as a signal to review the ration and transitions.',
      'True bloat is an escalation situation; do not rely on home tools when distress is present.',
    ],
    whenToEscalate:
      'Escalate immediately if you see tight distension with distress, pain, or breathing difficulty.',
    controversy:
      'Some keepers offer it free-choice routinely; others avoid routine access to prevent masking diet issues. Context matters.',
    warnings: 'Supportive tool only. Recurrent bloat signals a management/system problem.',
    conditionLinks: ['Bloat', 'Diet Transitions', 'Rumen Upset'],
  },
  {
    id: 9,
    name: 'Urinary Acidifiers (UC Prevention Context)',
    category: 'Urinary',
    intendedRole: 'Corrective (Vet-guided)',
    evidence: 'Moderate',
    risk: 'High',
    overview:
      'Urinary calculi risk is largely a diet-and-water problem. Acidifiers can be part of a veterinary-guided prevention strategy in high-risk systems.',
    whatItIs:
      'Products used to influence urinary pH; effectiveness depends on stone type and the overall feeding system.',
    commonContexts: [
      'High-risk male management systems (concentrate-heavy rations)',
      'History of UC in the herd or facility',
    ],
    misuseRisks: [
      'Using acidifiers as a substitute for ration correction',
      'Overcorrection creating metabolic imbalance',
      'Assuming one product covers all stone types',
    ],
    notes: [
      'UC prevention starts with forage-forward diets, steady water access, and mineral balance.',
      'Treat “urinary issues” as time-sensitive when obstruction is suspected.',
    ],
    whenToEscalate:
      'Escalate urgently if a male strains, dribbles, vocalizes, shows belly pain, or stops producing urine.',
    controversy: null,
    warnings:
      'High-risk category. Work with veterinary guidance and prioritize ration design before add-ons.',
    conditionLinks: ['Urinary Calculi (UC)', 'Male Feeding Systems', 'Water Intake / Hydration'],
  },
  {
    id: 10,
    name: 'Periparturient Mineral Support (Oral)',
    category: 'Mineral',
    intendedRole: 'Supportive',
    evidence: 'Limited',
    risk: 'Moderate',
    overview:
      'Oral mineral/electrolyte products may support mild periparturient needs, but severe cases require veterinary escalation.',
    whatItIs:
      'Oral calcium/electrolyte blends marketed for postpartum support.',
    commonContexts: [
      'Mild postpartum support in does that are eating and stable',
      'Herd planning alongside forage/ration quality',
    ],
    misuseRisks: [
      'Delaying escalation for true hypocalcemia (down doe)',
      'Assuming a product replaces ration planning and monitoring',
    ],
    notes: [
      'Down or collapsing does are not a supplement situation—treat as urgent escalation.',
      'Use the Conditions system to distinguish normal postpartum fatigue from metabolic trouble.',
    ],
    whenToEscalate:
      'Escalate immediately for a down doe, severe weakness, tremors, cold ears, inability to rise, or rapid decline.',
    controversy: null,
    warnings: 'Supportive only for stable animals. Severe hypocalcemia requires veterinary-level care.',
    conditionLinks: ['Milk Fever / Hypocalcemia', 'Post-Kidding Monitoring'],
  },
  {
    id: 11,
    name: 'Calcium (Injectable Context)',
    category: 'Emergency',
    intendedRole: 'Emergency (Vet-level)',
    evidence: 'High',
    risk: 'High',
    overview:
      'Injectable calcium can be life-saving in true hypocalcemia, but administration and monitoring are medical decisions.',
    whatItIs:
      'Injectable calcium products used in veterinary management of hypocalcemia.',
    commonContexts: [
      'Down doe or severe hypocalcemia suspicion (urgent)',
      'Periparturient metabolic collapse scenarios',
    ],
    misuseRisks: [
      'Improper administration and monitoring',
      'Delaying veterinary involvement',
    ],
    notes: [
      'This item is listed for preparedness awareness, not for self-directed protocols.',
      'In GoatWise, “down doe” should immediately point to escalation thresholds.',
    ],
    whenToEscalate:
      'Immediate escalation if a doe is down, collapsing, or severely weak postpartum.',
    controversy: null,
    warnings: 'Veterinary-level tool. Do not treat this as routine supplementation.',
    conditionLinks: ['Milk Fever / Hypocalcemia', 'Down Doe (Emergency)'],
  },
  {
    id: 12,
    name: 'Vitamin B Complex (Supportive Context)',
    category: 'Vitamin',
    intendedRole: 'Supportive',
    evidence: 'Limited',
    risk: 'Low',
    overview:
      'Often used as supportive care during stress or illness. Useful for appetite support in some contexts, but not condition-specific therapy by itself.',
    whatItIs:
      'A mix of B vitamins; concentrations vary by product.',
    commonContexts: [
      'Stress events with reduced intake',
      'General supportive care while underlying cause is assessed',
    ],
    misuseRisks: [
      'Assuming it replaces condition-specific escalation for neurologic disease',
      'Delaying evaluation of why the goat is off feed',
    ],
    notes: [
      'If neurologic signs are present, treat as an escalation scenario rather than a “support supplement” scenario.',
    ],
    whenToEscalate:
      'Escalate if the goat is worsening, dehydrated, neurologic, or not eating for >12–24 hours (sooner for kids).',
    controversy: null,
    warnings: 'Supportive tool. Use it alongside assessment, not instead of it.',
    conditionLinks: ['Off Feed', 'Neurologic Signs', 'Illness Support'],
  },
  {
    id: 13,
    name: 'Thiamine (Vitamin B1) Awareness',
    category: 'Emergency',
    intendedRole: 'Emergency (Vet-level)',
    evidence: 'High',
    risk: 'Moderate',
    overview:
      'Thiamine is a high-impact tool in specific neurologic conditions (e.g., polioencephalomalacia). Timing matters, so recognition and escalation are key.',
    whatItIs:
      'Concentrated thiamine used in veterinary management of certain neurologic presentations.',
    commonContexts: [
      'Neurologic signs where polioencephalomalacia is a differential',
      'Diet disruption or rumen upset preceding neurologic changes',
    ],
    misuseRisks: [
      'Assuming all neurologic disease is “polio” and delaying proper diagnosis',
      'Using low-concentration products and thinking the problem is addressed',
    ],
    notes: [
      'This is a “recognize and escalate” item: neuro signs deserve fast action.',
      'GoatWise should route users to the Neurologic Signs condition pathway and escalation limits.',
    ],
    whenToEscalate:
      'Escalate immediately for seizures, star-gazing, blindness, head pressing, circling, or rapid neurologic decline.',
    controversy: null,
    warnings: 'Emergency-adjacent tool. Use under veterinary guidance as part of a neurologic assessment pathway.',
    conditionLinks: ['Neurologic Signs', 'Goat Polio (PEM) Differential', 'Listeriosis Differential'],
  },
  {
    id: 14,
    name: 'Epinephrine (Anaphylaxis Preparedness)',
    category: 'Emergency',
    intendedRole: 'Emergency (Vet-level)',
    evidence: 'High',
    risk: 'High',
    overview:
      'Epinephrine is the standard emergency response tool for anaphylaxis. This listing is for preparedness context, not self-directed protocols.',
    whatItIs:
      'A medication used in emergency management of severe allergic reactions.',
    commonContexts: [
      'Post-injection collapse or severe allergic reaction concern',
      'Emergency kit planning (veterinarian guidance)',
    ],
    misuseRisks: [
      'Improper use without diagnosis',
      'Delaying emergency care when the animal is unstable',
    ],
    notes: [
      'If a goat collapses or has sudden breathing difficulty after an injection, treat it as an emergency.',
      'Preparedness is good; protocols should be vet-guided.',
    ],
    whenToEscalate:
      'Immediate emergency escalation for collapse, severe facial swelling, blue gums, or breathing distress.',
    controversy: null,
    warnings: 'Veterinary-level emergency medication. Keep and use only under veterinary guidance.',
    conditionLinks: ['Anaphylaxis / Severe Reaction', 'Post-Injection Collapse'],
  },
  {
    id: 15,
    name: 'Activated Charcoal',
    category: 'Emergency',
    intendedRole: 'Emergency (Vet-level)',
    evidence: 'Moderate',
    risk: 'Moderate',
    overview:
      'A broad adsorption tool sometimes used in toxin exposures. Effectiveness depends on timing and toxin type.',
    whatItIs:
      'A highly porous material that can bind some toxins in the gastrointestinal tract.',
    commonContexts: [
      'Suspected toxin ingestion (time-sensitive)',
      'Emergency kit preparedness (vet-guided)',
    ],
    misuseRisks: [
      'Using it too late or for toxins where it is not effective',
      'Delaying veterinary input for serious exposures',
      'Aspiration risk if administration is improper',
    ],
    notes: [
      'Toxin exposures are time-sensitive. Identification of the plant/chemical matters.',
      'In GoatWise, this should cross-link to Poisoning pathways and escalation thresholds.',
    ],
    whenToEscalate:
      'Immediate escalation for suspected poisoning, especially with neurologic signs, collapse, severe diarrhea, or respiratory distress.',
    controversy: null,
    warnings: 'Emergency-context tool. Seek veterinary guidance; do not delay escalation.',
    conditionLinks: ['Poisoning / Toxin Exposure', 'Neurologic Signs', 'Severe Diarrhea'],
  },
  {
    id: 16,
    name: 'Anti-diarrheal Symptom Support (Kaolin/Pectin or Bismuth)',
    category: 'Digestive',
    intendedRole: 'Supportive',
    evidence: 'Limited',
    risk: 'Moderate',
    overview:
      'Some products can reduce stool liquidity and soothe the gut, but they do not address the cause of diarrhea.',
    whatItIs:
      'Symptom-support products (formulations vary; many legacy products have changed).',
    commonContexts: [
      'Mild diarrhea where the goat is bright, eating, and hydrated (supportive context)',
      'Short-term symptom support while cause is being evaluated',
    ],
    misuseRisks: [
      'Masking worsening dehydration',
      'Delaying identification of coccidia, parasites, diet change, or infection',
    ],
    notes: [
      'Diarrhea management is hydration + cause-finding first.',
      'Stool color changes can occur with some products; do not confuse it with blood without assessment.',
    ],
    whenToEscalate:
      'Escalate for kids, dehydration, weakness, fever, blood in stool, severe volume, or diarrhea lasting >24–48 hours.',
    controversy:
      'Some brand formulas have changed over time; do not assume the active ingredients match older advice.',
    warnings: 'Supportive only. If dehydration develops, escalation is the priority.',
    conditionLinks: ['Diarrhea', 'Dehydration', 'Coccidia Differential', 'Parasites Differential'],
  },
  {
    id: 17,
    name: 'Electrolytes',
    category: 'Supportive',
    intendedRole: 'Supportive',
    evidence: 'High',
    risk: 'Low',
    overview:
      'Hydration support is one of the most consistently useful supportive tools in diarrhea, heat stress, and recovery contexts.',
    whatItIs:
      'Oral electrolyte solutions designed to support fluid and electrolyte replacement.',
    commonContexts: [
      'Mild dehydration risk during diarrhea (supportive, alongside cause-finding)',
      'Heat stress recovery',
      'Illness recovery when intake is reduced',
    ],
    misuseRisks: [
      'Assuming electrolytes replace veterinary fluids in severe dehydration',
      'Using high-sugar mixes as the primary intake for prolonged periods',
    ],
    notes: [
      'Electrolytes help support hydration; they do not treat the underlying trigger.',
      'Severe dehydration requires escalation (subcutaneous or IV fluids under veterinary care).',
    ],
    whenToEscalate:
      'Escalate for severe dehydration, weakness, inability to stand, refusal to drink, or kids with fast decline.',
    controversy: null,
    warnings: 'Supportive tool. Severe cases need veterinary-level fluids and diagnosis.',
    conditionLinks: ['Dehydration', 'Diarrhea', 'Heat Stress', 'Illness Recovery'],
  },
  {
    id: 18,
    name: 'Ivermectin Pour-On Products (Cattle Formulations)',
    category: 'Controversial',
    intendedRole: 'Controversial / Often Misused',
    evidence: 'Not Supported',
    risk: 'High',
    overview:
      'Topical pour-on products formulated for cattle are commonly misapplied in goats. Goat skin and absorption differ, and formulations may not be appropriate.',
    whatItIs:
      'Cattle-targeted topical antiparasitic formulations; not designed or validated for goats.',
    commonContexts: [
      'Common “barn advice” item; often used for convenience rather than evidence',
    ],
    misuseRisks: [
      'Unreliable absorption and poor parasite control outcomes',
      'Potential formulation risks depending on product ingredients',
      'Accelerating resistance through sub-therapeutic exposure patterns',
    ],
    notes: [
      'In GoatWise, parasite control should route through monitoring and evidence-based escalation, not convenience products.',
    ],
    whenToEscalate:
      'Escalate based on parasite burden indicators (anemia, weight loss, poor coat, bottle jaw) and use validated monitoring (e.g., fecals, FAMACHA where appropriate).',
    controversy:
      'Some users report perceived benefits; however, goat-specific validation is lacking and absorption is unreliable.',
    warnings:
      'High-risk misuse category. Prioritize evidence-based parasite monitoring and veterinary-guided plans.',
    conditionLinks: ['Parasites', 'Anemia (FAMACHA)', 'Bottle Jaw', 'Weight Loss'],
  },
  {
    id: 19,
    name: 'Herbal “Dewormers”',
    category: 'Controversial',
    intendedRole: 'Controversial / Often Misused',
    evidence: 'Not Supported',
    risk: 'High',
    overview:
      'Herbal blends are widely marketed for parasites, but evidence for treating established infections is weak. The main risk is delayed effective escalation.',
    whatItIs:
      'Commercial or homemade herbal blends marketed as parasite control.',
    commonContexts: [
      'Keeper preference for herbal support within a broader management plan',
      'Low-pressure systems where monitoring is consistent and escalation is not delayed',
    ],
    misuseRisks: [
      'False reassurance leading to delayed treatment when parasite burden is clinically significant',
      'Undermining targeted selective treatment strategies',
    ],
    notes: [
      'Parasite control is a monitoring-and-management system: pasture, stocking, nutrition, and targeted treatment when indicated.',
      'If goats are anemic or declining, the priority is escalation, not “natural options.”',
    ],
    whenToEscalate:
      'Escalate if anemia indicators worsen, kids fail to thrive, bottle jaw appears, or fecals indicate high burden.',
    controversy:
      'Some herbs may have mild activity or nutritional value, but they are not reliable as primary treatment for established infections.',
    warnings: 'High-risk category because it can delay effective care. Use only if it does not replace monitoring and escalation.',
    conditionLinks: ['Parasites', 'Anemia (FAMACHA)', 'Bottle Jaw', 'Diarrhea'],
  },
];

const categoryColors: Record<string, string> = {
  Mineral: 'bg-purple-100 text-purple-700',
  'Mineral/Vitamin': 'bg-indigo-100 text-indigo-700',
  Vitamin: 'bg-blue-100 text-blue-700',
  Digestive: 'bg-green-100 text-green-700',
  Energy: 'bg-amber-100 text-amber-700',
  'Energy/Vitamin': 'bg-orange-100 text-orange-700',
  Urinary: 'bg-cyan-100 text-cyan-700',
  Emergency: 'bg-red-100 text-red-700',
  Supportive: 'bg-sky-100 text-sky-700',
  Controversial: 'bg-gray-100 text-gray-700',
};

const evidenceColors: Record<EvidenceLevel, string> = {
  High: 'bg-green-100 text-green-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  Limited: 'bg-amber-100 text-amber-700',
  'Not Supported': 'bg-red-100 text-red-700',
};

const riskColors: Record<RiskLevel, string> = {
  Low: 'bg-green-100 text-green-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  High: 'bg-red-100 text-red-700',
};

const roleIcon = (role: IntendedRole) => {
  if (role === 'Emergency (Vet-level)') return <ShieldAlert className="h-5 w-5 text-red-600" />;
  if (role === 'Corrective (Vet-guided)') return <FlaskConical className="h-5 w-5 text-indigo-600" />;
  if (role === 'Controversial / Often Misused') return <XCircle className="h-5 w-5 text-gray-600" />;
  return <CheckCircle className="h-5 w-5 text-green-600" />;
};

export default function SupplementsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [expandedSupplement, setExpandedSupplement] = useState<number | null>(1);

  const categories = useMemo(() => ['All', ...Array.from(new Set(supplements.map(s => s.category)))], []);

  const filteredSupplements = useMemo(() => {
    return supplements.filter((s) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.overview.toLowerCase().includes(q) ||
        s.whatItIs.toLowerCase().includes(q) ||
        s.commonContexts.some((c) => c.toLowerCase().includes(q)) ||
        s.misuseRisks.some((m) => m.toLowerCase().includes(q)) ||
        (s.controversy ? s.controversy.toLowerCase().includes(q) : false) ||
        (s.warnings ? s.warnings.toLowerCase().includes(q) : false);
      const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, categoryFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supplements & Support Tools</h1>
        <p className="text-gray-500">
          A field-manual reference for what these tools are, where they fit, and where misuse creates risk.
        </p>
      </div>

      <Card className="bg-amber-50 border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Scope & Safety</h3>
            <p className="text-sm text-amber-700 mt-1">
              This tab does <span className="font-semibold">not</span> provide dosing, schedules, or treatment protocols.
              It’s designed to reduce misuse and support better decisions about when to assess, when to monitor, and when to
              escalate. For condition-specific guidance, use the GoatWise <span className="font-semibold">Conditions</span> system and involve a licensed veterinarian when needed.
            </p>
          </div>
        </div>
      </Card>

      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search (e.g., copper, diarrhea, urinary)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="space-y-4">
        {filteredSupplements.map((s) => (
          <Card key={s.id} className="overflow-hidden">
            <button
              onClick={() => setExpandedSupplement(expandedSupplement === s.id ? null : s.id)}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
                  {roleIcon(s.intendedRole)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className={categoryColors[s.category] || 'bg-gray-100 text-gray-700'}>{s.category}</Badge>
                    <Badge className="bg-slate-100 text-slate-700">{s.intendedRole}</Badge>
                    <Badge className={evidenceColors[s.evidence]}>Evidence: {s.evidence}</Badge>
                    <Badge className={riskColors[s.risk]}>Risk: {s.risk}</Badge>
                  </div>

                  <h3 className="font-semibold text-gray-900 text-lg">{s.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{s.overview}</p>
                </div>

                {expandedSupplement === s.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>

            {expandedSupplement === s.id && (
              <div className="border-t bg-gray-50 p-4 space-y-4">
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" /> What it is
                  </h4>
                  <p className="text-sm text-gray-700">{s.whatItIs}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Common contexts</h4>
                    <ul className="space-y-1">
                      {s.commonContexts.map((c, i) => (
                        <li key={i} className="text-sm text-gray-600">• {c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Misuse risks</h4>
                    <ul className="space-y-1">
                      {s.misuseRisks.map((m, i) => (
                        <li key={i} className="text-sm text-gray-600">• {m}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Field-manual framing</h4>
                  <ul className="space-y-1">
                    {s.notes.map((n, i) => (
                      <li key={i} className="text-sm text-gray-600">• {n}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-800 mb-1 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> When to escalate
                  </h4>
                  <p className="text-sm text-amber-700">{s.whenToEscalate}</p>
                </div>

                {(s.controversy || s.warnings) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {s.controversy && (
                      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-1 flex items-center gap-2">
                          <FlaskConical className="h-4 w-4" /> Controversy / nuance
                        </h4>
                        <p className="text-sm text-gray-700">{s.controversy}</p>
                      </div>
                    )}
                    {s.warnings && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-800 mb-1 flex items-center gap-2">
                          <XCircle className="h-4 w-4" /> Caution
                        </h4>
                        <p className="text-sm text-red-700">{s.warnings}</p>
                      </div>
                    )}
                  </div>
                )}

                {s.conditionLinks && s.conditionLinks.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" /> Related GoatWise conditions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {s.conditionLinks.map((tag) => (
                        <span key={tag} className="text-xs bg-white border border-blue-200 text-blue-800 px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
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
          GoatWise presents supplements and support tools as part of a broader management system.
          If a goat is declining, dehydrated, in pain, obstructed, or showing neurologic signs, escalation beats supplementation.
          Use the Conditions system for structured assessment and clear escalation limits.
        </p>
      </Card>
    </div>
  );
}
