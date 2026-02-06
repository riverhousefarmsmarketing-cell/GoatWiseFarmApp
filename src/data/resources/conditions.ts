/**
 * GoatWise Resources - Health Conditions Data
 * /src/data/resources/conditions.ts
 *
 * Field Manual format with:
 * - Symptom-first navigation
 * - Standardized template
 * - NO dosing numbers
 * - Cross-links to resources
 */

import {
  ConditionCategory,
  Severity,
  SymptomTag,
  ResourceLink,
  SEVERITY_COLORS,
  CONDITION_CATEGORY_COLORS,
  SYMPTOM_TAG_LABELS,
} from './types';

// Re-export for convenience
export { SEVERITY_COLORS, CONDITION_CATEGORY_COLORS, SYMPTOM_TAG_LABELS };

// ============ CONDITION TYPES ============

export interface SupportPathway {
  type: 'herbal' | 'mineral' | 'conventional' | 'essential-oil';
  tools: string[]; // Names only, NO dosing
  context: string; // "commonly used for..." phrasing
  resourceLinks: ResourceLink[];
}

export interface ConditionEntry {
  id: number;
  name: string;
  aliases?: string[]; // Alternative names for search
  category: ConditionCategory;
  severity: Severity;

  // One-line summary (why it matters)
  summary: string;

  // Symptom-first navigation tags
  symptomTags: SymptomTag[];

  // What you might notice (5-8 bullets max)
  signs: string[];

  // Immediate checks (safe, non-controversial)
  immediateChecks: string[];

  // When to escalate (explicit red flags)
  escalationTriggers: string[];

  // Support pathways (NO DOSING NUMBERS)
  supportPathways: SupportPathway[];

  // Common mistakes (harm reduction)
  commonMistakes: string[];

  // Cross-links
  relatedConditions?: number[];
  relatedMyths?: number[];

  // How it's commonly identified (replaces "Diagnosis")
  identification?: string;

  // Emergency flag
  isEmergency?: boolean;
}

// ============ CONDITIONS DATA ============

export const conditions: ConditionEntry[] = [
  // ============ PARASITIC CONDITIONS ============
  {
    id: 1,
    name: 'Barber Pole Worm',
    aliases: ['Haemonchus contortus', 'Haemonchus', 'Wire worm', 'Stomach worm'],
    category: 'Parasitic',
    severity: 'Critical',
    summary: 'Blood-sucking stomach parasite that can kill quickly, often without obvious symptoms until severe.',
    symptomTags: ['pale-eyelids-anemia', 'off-feed-lethargy', 'weight-loss', 'sudden-death', 'swelling'],
    signs: [
      'Pale or white eyelids (FAMACHA 4-5)',
      'Bottle jaw (swelling under chin)',
      'Weakness or lethargy',
      'Poor body condition despite adequate feed',
      'Rough, dull coat',
      'Sudden death in severe cases',
    ],
    immediateChecks: [
      'Check FAMACHA score (eyelid color)',
      'Check for bottle jaw (press under chin)',
      'Assess body condition score',
      'Check hydration (skin tent test)',
      'Note recent weather (warm + wet = high risk)',
    ],
    escalationTriggers: [
      'FAMACHA score 4-5 (pink-white or white)',
      'Bottle jaw present',
      'Collapse or inability to stand',
      'Kids, pregnant does, or compromised animals',
      'Multiple animals affected rapidly',
      'No improvement within 48-72 hours of intervention',
    ],
    supportPathways: [
      {
        type: 'herbal',
        tools: ['Garlic', 'Wormwood', 'Black Walnut'],
        context:
          'Commonly used as supportive or preventive by experienced owners. Not recommended as sole treatment for clinical infections. May complement integrated parasite management.',
        resourceLinks: [
          { type: 'herb', id: 1, label: 'Garlic' },
          { type: 'herb', id: 2, label: 'Wormwood' },
          { type: 'herb', id: 3, label: 'Black Walnut' },
        ],
      },
      {
        type: 'mineral',
        tools: ['Copper (COWP bolus)'],
        context:
          'Copper boluses are commonly used alongside other parasite management. May help reduce worm burden, particularly in copper-deficient areas. Breed sensitivity varies.',
        resourceLinks: [{ type: 'mineral', id: 1, label: 'Copper (Cu)' }],
      },
      {
        type: 'conventional',
        tools: ['Ivermectin', 'Moxidectin', 'Levamisole', 'Albendazole'],
        context:
          'Weight-based dosing required. Resistance varies significantly by farm and region. Recheck FAMACHA 10-14 days post-treatment. Rotating drug classes is commonly practiced.',
        resourceLinks: [
          { type: 'medication', id: 1, label: 'Ivermectin' },
          { type: 'medication', id: 2, label: 'Moxidectin' },
        ],
      },
    ],
    commonMistakes: [
      'Treating by calendar schedule instead of by FAMACHA',
      'Underdosing (goats typically need higher doses than sheep)',
      'Using only one dewormer class repeatedly',
      'Not rechecking FAMACHA 10-14 days post-treatment',
      'Ignoring subclinical infections building in the herd',
      'Assuming all dewormers work on your farm',
    ],
    identification:
      'FAMACHA scoring is the primary field method. Fecal egg counts (FEC) can confirm but may lag behind clinical signs. Necropsy reveals characteristic red-and-white striped "barber pole" worms in the abomasum.',
    relatedMyths: [5], // "Deworm on a schedule"
    isEmergency: true,
  },

  {
    id: 2,
    name: 'Coccidiosis',
    aliases: ['Coccidia', 'Cocci'],
    category: 'Parasitic',
    severity: 'Serious',
    summary: 'Protozoan infection causing intestinal damage, primarily affecting kids and stressed animals.',
    symptomTags: ['diarrhea-scours', 'off-feed-lethargy', 'weight-loss'],
    signs: [
      'Watery or bloody diarrhea',
      'Straining to defecate',
      'Poor growth in kids',
      'Rough coat',
      'Lethargy and weakness',
      'Dehydration',
    ],
    immediateChecks: [
      'Assess hydration status (skin tent test)',
      'Check temperature',
      'Note stool consistency and color',
      'Review recent stressors (weaning, weather, transport)',
      'Check other animals in group',
    ],
    escalationTriggers: [
      'Blood in stool',
      'Severe dehydration',
      'Young kids (< 3 months)',
      'Multiple animals affected',
      'Fever present',
      'Straining with little output',
    ],
    supportPathways: [
      {
        type: 'herbal',
        tools: ['Oregano', 'Slippery Elm', 'Garlic'],
        context:
          'Some farms include oregano in prevention programs. Slippery elm commonly used for digestive soothing during recovery. Not replacements for clinical treatment.',
        resourceLinks: [
          { type: 'herb', id: 5, label: 'Oregano' },
          { type: 'herb', id: 8, label: 'Slippery Elm' },
        ],
      },
      {
        type: 'conventional',
        tools: ['Corid (Amprolium)', 'Sulfa drugs', 'Toltrazuril'],
        context:
          'Treatment protocols vary. Prevention programs are commonly used in high-risk periods. Verify withdrawal times for milk/meat.',
        resourceLinks: [{ type: 'medication', id: 3, label: 'Corid' }],
      },
    ],
    commonMistakes: [
      'Assuming all diarrhea is coccidia',
      'Not addressing dehydration first',
      'Stopping treatment too early',
      'Not cleaning environment during outbreak',
      'Missing prevention window in kids',
    ],
    identification:
      'Fecal float showing high oocyst counts. Clinical signs in appropriate age group (usually kids). Note that some coccidia presence is normal — clinical disease matters more than presence alone.',
    relatedConditions: [4], // Scours
  },

  // ============ DIGESTIVE CONDITIONS ============
  {
    id: 3,
    name: 'Pneumonia',
    aliases: ['Respiratory infection', 'Lung infection'],
    category: 'Respiratory',
    severity: 'Serious',
    summary: 'Lung infection that can progress rapidly, especially in kids and during weather stress.',
    symptomTags: ['coughing-nasal', 'fever', 'off-feed-lethargy'],
    signs: [
      'Coughing (dry or wet)',
      'Nasal discharge (clear to thick/colored)',
      'Rapid or labored breathing',
      'Fever (>104°F)',
      'Off feed',
      'Standing apart from herd',
      'Extended head and neck',
    ],
    immediateChecks: [
      'Take temperature',
      'Listen to breathing (rattling, wheezing)',
      'Note nasal discharge color/consistency',
      'Check respiratory rate',
      'Review recent weather/stress events',
    ],
    escalationTriggers: [
      'Temperature >104.5°F',
      'Blue/gray gums or tongue',
      'Severe breathing difficulty',
      'Open-mouth breathing',
      'Kids under 2 months',
      'No improvement within 24-48 hours',
    ],
    supportPathways: [
      {
        type: 'herbal',
        tools: ['Thyme', 'Mullein', 'Eucalyptus (aromatic)', 'Elderberry'],
        context:
          'Commonly used for respiratory support alongside other treatment. Eucalyptus used aromatically only. Not replacements for antibiotic treatment when indicated.',
        resourceLinks: [
          { type: 'herb', id: 6, label: 'Thyme' },
          { type: 'herb', id: 31, label: 'Mullein' },
          { type: 'herb', id: 32, label: 'Elderberry' },
        ],
      },
      {
        type: 'essential-oil',
        tools: ['Eucalyptus (aromatic)', 'Peppermint (aromatic)'],
        context:
          'Used aromatically by some experienced owners for respiratory support. External/aromatic use only. Not a replacement for veterinary care.',
        resourceLinks: [
          { type: 'essential-oil', id: 14, label: 'Eucalyptus' },
          { type: 'essential-oil', id: 13, label: 'Peppermint' },
        ],
      },
      {
        type: 'conventional',
        tools: ['Antibiotics (various)', 'Anti-inflammatories'],
        context:
          'Bacterial pneumonia typically requires antibiotic treatment. Veterinary guidance recommended for selection. Monitor withdrawal times.',
        resourceLinks: [{ type: 'medication', id: 4, label: 'Antibiotics' }],
      },
    ],
    commonMistakes: [
      'Waiting too long to take temperature',
      'Assuming cough will resolve on its own',
      'Not isolating sick animals',
      'Stopping antibiotics too early',
      'Poor ventilation during recovery',
    ],
    identification:
      'Temperature check is essential. Auscultation may reveal lung sounds. Clinical signs during stress periods (weather changes, transport, weaning) are suggestive.',
  },

  {
    id: 4,
    name: 'Scours (Diarrhea)',
    aliases: ['Diarrhea', 'Loose stool', 'Runs'],
    category: 'Digestive',
    severity: 'Serious',
    summary: 'Loose or watery stool with many possible causes — hydration is the immediate priority.',
    symptomTags: ['diarrhea-scours', 'off-feed-lethargy'],
    signs: [
      'Watery or loose stool',
      'Staining around tail/hind legs',
      'Straining',
      'Dehydration signs',
      'Reduced appetite',
      'Lethargy',
    ],
    immediateChecks: [
      'Assess hydration (skin tent, gum moisture)',
      'Check temperature',
      'Note stool color (yellow, brown, bloody, mucus)',
      'Review recent diet changes',
      'Check other animals in group',
    ],
    escalationTriggers: [
      'Blood or mucus in stool',
      'Severe dehydration',
      'Kids under 2 weeks',
      'Fever >104°F',
      'Multiple animals affected',
      'No improvement in 24 hours',
    ],
    supportPathways: [
      {
        type: 'herbal',
        tools: ['Slippery Elm', 'Marshmallow Root', 'Ginger', 'Chamomile'],
        context:
          'Demulcent herbs commonly used for digestive soothing. Ginger for nausea. Hydration support is always the first priority.',
        resourceLinks: [
          { type: 'herb', id: 8, label: 'Slippery Elm' },
          { type: 'herb', id: 9, label: 'Marshmallow Root' },
          { type: 'herb', id: 13, label: 'Ginger' },
        ],
      },
      {
        type: 'conventional',
        tools: ['Electrolytes', 'Probiotics', 'Kaolin-Pectin'],
        context:
          'Electrolyte replacement is critical. Address underlying cause (coccidia, bacterial, dietary). Specific treatment depends on cause.',
        resourceLinks: [{ type: 'medication', id: 5, label: 'Electrolytes' }],
      },
    ],
    commonMistakes: [
      'Not addressing dehydration immediately',
      'Assuming cause without investigation',
      'Stopping milk in young kids (they need calories)',
      'Using anti-diarrheal medications without addressing cause',
      'Not separating from herd if infectious',
    ],
    identification:
      'Stool appearance and context guide cause. Fecal testing for parasites. Age of animal matters (kid scours vs adult). Recent events (diet change, stress) are relevant.',
    relatedConditions: [2], // Coccidiosis
  },

  {
    id: 5,
    name: 'Bloat',
    aliases: ['Ruminal tympany', 'Frothy bloat', 'Free gas bloat'],
    category: 'Digestive',
    severity: 'Critical',
    summary: 'Gas accumulation in rumen that can be fatal within hours if not relieved.',
    symptomTags: ['bloat', 'off-feed-lethargy'],
    signs: [
      'Distended left side (behind ribs)',
      'Discomfort (kicking at belly, getting up/down)',
      'Difficulty breathing',
      'Not eating or ruminating',
      'Tight "drum-like" abdomen',
      'Grinding teeth',
    ],
    immediateChecks: [
      'View from behind — left side bulging?',
      'Tap left side — drum-like sound?',
      'Is animal still moving/alert?',
      'Check recent feed access (grain, lush pasture)',
      'Note severity (mild distension vs severe)',
    ],
    escalationTriggers: [
      'Severe distension',
      'Difficulty breathing',
      'Animal down and unable to rise',
      'Blue gums',
      'No response to initial interventions',
      'Kids or compromised animals',
    ],
    supportPathways: [
      {
        type: 'herbal',
        tools: ['Fennel', 'Peppermint', 'Ginger'],
        context:
          'Carminative herbs commonly used for mild bloat support and prevention. Walking the animal can help. Severe bloat is an emergency.',
        resourceLinks: [
          { type: 'herb', id: 14, label: 'Fennel' },
          { type: 'herb', id: 35, label: 'Peppermint' },
          { type: 'herb', id: 13, label: 'Ginger' },
        ],
      },
      {
        type: 'conventional',
        tools: ['Bloat treatment oil', 'Simethicone', 'Vegetable oil', 'Stomach tube'],
        context:
          'Frothy bloat needs surfactant (bloat oil). Free gas bloat may need tubing. Severe cases may require trocar. Know the difference.',
        resourceLinks: [{ type: 'medication', id: 6, label: 'Bloat treatment' }],
      },
    ],
    commonMistakes: [
      'Waiting to see if it resolves',
      'Not knowing difference between frothy and free gas bloat',
      'Not preventing access to problem feed',
      'Forcing animal to lie down (makes it worse)',
      'Not having bloat supplies on hand',
    ],
    identification:
      'Visual distension on left side. Tapping produces drum-like sound. History of recent feed access. Differentiate from other causes of abdominal distension.',
    isEmergency: true,
  },

  // ============ METABOLIC CONDITIONS ============
  {
    id: 6,
    name: 'Ketosis / Pregnancy Toxemia',
    aliases: ['Pregnancy toxemia', 'Twin kid disease', 'Lambing sickness'],
    category: 'Metabolic',
    severity: 'Critical',
    summary: 'Metabolic crisis in late pregnancy when energy demand exceeds intake, especially with multiples.',
    symptomTags: ['off-feed-lethargy', 'neurological'],
    signs: [
      'Off feed in late pregnancy',
      'Sweet/fruity breath (ketones)',
      'Lethargy and weakness',
      'Teeth grinding',
      'Neurological signs (circling, star-gazing)',
      'Down and unable to rise',
    ],
    immediateChecks: [
      'Confirm pregnancy stage (last 4-6 weeks)',
      'Smell breath for ketones (sweet/fruity)',
      'Check body condition (often thin or overly fat)',
      'Test urine with ketone strips if available',
      'How many kids expected (multiples = higher risk)',
    ],
    escalationTriggers: [
      'Neurological signs',
      'Unable to stand',
      'Not responding to energy supplementation',
      'Very close to due date',
      'Severe weakness',
    ],
    supportPathways: [
      {
        type: 'mineral',
        tools: ['Propylene glycol', 'Molasses', 'Calcium (if concurrent hypocalcemia)'],
        context:
          'Energy supplementation is critical. Propylene glycol commonly used for rapid energy. May need concurrent calcium support. Prevention through nutrition is key.',
        resourceLinks: [{ type: 'mineral', id: 4, label: 'Calcium' }],
      },
      {
        type: 'conventional',
        tools: ['Propylene glycol', 'IV glucose', 'C-section (if non-responsive)'],
        context:
          'Aggressive treatment often needed. May require veterinary intervention including possible early delivery. Prognosis depends on stage when caught.',
        resourceLinks: [{ type: 'medication', id: 7, label: 'Propylene glycol' }],
      },
    ],
    commonMistakes: [
      'Not monitoring does in late pregnancy',
      'Inadequate nutrition for does carrying multiples',
      'Confusing early signs with normal pregnancy behavior',
      'Waiting too long to intervene',
      'Not knowing due dates',
    ],
    identification:
      'Clinical signs in late pregnancy. Ketone detection in urine or breath. Often associated with does carrying multiple kids, very thin or overly fat does, or sudden feed changes.',
    relatedConditions: [8], // Hypocalcemia
    isEmergency: true,
  },

  {
    id: 7,
    name: 'Enterotoxemia',
    aliases: ['Overeating disease', 'Pulpy kidney', 'Clostridial disease'],
    category: 'Bacterial',
    severity: 'Critical',
    summary: 'Rapid-onset clostridial disease, often from sudden diet changes or grain overload.',
    symptomTags: ['sudden-death', 'neurological', 'off-feed-lethargy', 'diarrhea-scours'],
    signs: [
      'Sudden death (often first sign)',
      'Neurological signs (convulsions, paddling)',
      'Profuse watery diarrhea',
      'Severe abdominal pain',
      'Bloating',
      'High fever followed by subnormal temperature',
    ],
    immediateChecks: [
      'Review recent diet changes',
      'Check vaccine status (CD&T)',
      'Note if other animals affected',
      'Assess for shock',
      'Recent access to grain or rich feed?',
    ],
    escalationTriggers: [
      'Any neurological signs',
      'Rapid progression',
      'Severe pain',
      'Shock signs (cold extremities, weak pulse)',
      'Unvaccinated animals',
    ],
    supportPathways: [
      {
        type: 'conventional',
        tools: ['CD&T antitoxin', 'Antibiotics', 'Pain management', 'IV fluids'],
        context:
          'Treatment often unsuccessful due to rapid progression. Antitoxin may help if caught very early. Prevention through vaccination is critical.',
        resourceLinks: [{ type: 'medication', id: 8, label: 'CD&T' }],
      },
    ],
    commonMistakes: [
      'Not vaccinating (prevention is key)',
      'Sudden diet changes',
      'Allowing access to grain storage',
      'Not boosting vaccinations appropriately',
      'Thinking young kids are protected without vaccination',
    ],
    identification:
      'Often diagnosed after death. History of sudden diet change or grain access. Rapid progression. Necropsy findings are characteristic.',
    isEmergency: true,
  },

  {
    id: 8,
    name: 'Hypocalcemia (Milk Fever)',
    aliases: ['Milk fever', 'Parturient paresis', 'Calcium deficiency'],
    category: 'Metabolic',
    severity: 'Critical',
    summary: 'Calcium depletion around kidding or early lactation, especially in heavy milkers.',
    symptomTags: ['off-feed-lethargy', 'post-kidding', 'neurological'],
    signs: [
      'Weakness, especially hind end',
      'Difficulty standing or walking',
      'Cold ears',
      'Muscle tremors',
      'Constipation',
      'Down and unable to rise',
    ],
    immediateChecks: [
      'When did she kid? (common within 24-48 hours)',
      'High producer?',
      'Feel ears (often cold)',
      'Check muscle tone',
      'Check for other post-kidding issues',
    ],
    escalationTriggers: [
      'Unable to stand',
      'Severe weakness',
      'Cold extremities',
      'Not responding to calcium',
      'Concurrent ketosis signs',
    ],
    supportPathways: [
      {
        type: 'mineral',
        tools: ['Calcium gluconate', 'CMPK', 'Oral calcium gels'],
        context:
          'Calcium supplementation is essential. Subcutaneous or IV calcium commonly used. Oral calcium as follow-up. Prevention through proper dry period nutrition.',
        resourceLinks: [{ type: 'mineral', id: 4, label: 'Calcium' }],
      },
      {
        type: 'conventional',
        tools: ['Injectable calcium', 'IV calcium gluconate', 'Supportive care'],
        context:
          'Subcutaneous calcium commonly used in field. IV may be needed for severe cases (veterinary administration). Monitor for relapse.',
        resourceLinks: [{ type: 'medication', id: 9, label: 'Calcium products' }],
      },
    ],
    commonMistakes: [
      'Supplementing too much calcium before kidding (can worsen)',
      'Not recognizing early signs',
      'Not having calcium products on hand',
      'Giving IV calcium too fast (dangerous)',
      'Not monitoring high producers around kidding',
    ],
    identification:
      'Clinical signs around kidding/early lactation. Response to calcium treatment confirms. Common in high producers and older does.',
    relatedConditions: [6], // Ketosis
    isEmergency: true,
  },

  {
    id: 9,
    name: 'Urinary Calculi',
    aliases: ['Stones', 'Water belly', 'UC', 'Urolithiasis'],
    category: 'Urinary',
    severity: 'Critical',
    summary: 'Urinary stones blocking urine flow in males — a life-threatening emergency.',
    symptomTags: ['urinary', 'off-feed-lethargy'],
    signs: [
      'Straining to urinate with little/no output',
      'Crying or vocalizing when trying to urinate',
      'Distended belly',
      'Kicking at belly',
      'Dribbling small amounts',
      'Pizzle (urethral process) may show crystals',
    ],
    immediateChecks: [
      'Is animal urinating normally?',
      'Check pizzle for crystals',
      'Feel belly for distension',
      'What is the diet (high grain?)',
      'Intact male, wether, or buck?',
    ],
    escalationTriggers: [
      'No urine output',
      'Distended abdomen',
      'Severe pain',
      'Duration >12 hours',
      'Rupture signs (temporary relief then worse)',
    ],
    supportPathways: [
      {
        type: 'mineral',
        tools: ['Ammonium chloride', 'Proper Ca:P ratio'],
        context:
          'Prevention through proper mineral balance is essential. Ammonium chloride commonly used preventively in high-risk diets. Ca:P ratio matters (2:1 minimum).',
        resourceLinks: [
          { type: 'mineral', id: 4, label: 'Calcium' },
          { type: 'mineral', id: 5, label: 'Phosphorus' },
        ],
      },
      {
        type: 'conventional',
        tools: ['Surgery', 'Urethral process amputation', 'Tube cystostomy'],
        context:
          'Often requires surgical intervention. Pizzle amputation may provide temporary relief. Long-term prognosis depends on stone location and damage.',
        resourceLinks: [{ type: 'medication', id: 10, label: 'Urinary treatments' }],
      },
    ],
    commonMistakes: [
      'High-grain diets without proper mineral balance',
      'Not providing adequate water access',
      'Castrating too young (urethral development)',
      'Waiting to see if it resolves (it wont)',
      'Not recognizing early signs',
    ],
    identification:
      'Male animal straining to urinate. Check pizzle for crystals. Distended bladder on palpation. Diet history (high grain, improper minerals).',
    relatedMyths: [1], // "Alfalfa causes UC"
    isEmergency: true,
  },

  // ============ NUTRITIONAL CONDITIONS ============
  {
    id: 10,
    name: 'White Muscle Disease',
    aliases: ['Nutritional muscular dystrophy', 'Selenium deficiency', 'Stiff lamb disease'],
    category: 'Nutritional',
    severity: 'Serious',
    summary: 'Selenium/Vitamin E deficiency causing muscle weakness, especially in kids.',
    symptomTags: ['off-feed-lethargy', 'limping'],
    signs: [
      'Weakness in kids (stiff gait)',
      'Difficulty standing or nursing',
      'Arched back',
      'Rapid breathing (heart muscle affected)',
      'Sudden death in severe cases',
      'Failure to thrive',
    ],
    immediateChecks: [
      'Is this a selenium-deficient area?',
      'What is dam getting for minerals?',
      'Age of kid (common in first weeks)',
      'Check for other affected kids',
      'Recent stressors (cold, transport)?',
    ],
    escalationTriggers: [
      'Difficulty breathing (heart involvement)',
      'Unable to stand or nurse',
      'Multiple kids affected',
      'Rapid progression',
    ],
    supportPathways: [
      {
        type: 'mineral',
        tools: ['Selenium', 'Vitamin E', 'BoSe (prescription)'],
        context:
          'Selenium/Vitamin E supplementation is the primary approach. Prevention through adequate dam nutrition. Injectable products commonly used for treatment.',
        resourceLinks: [
          { type: 'mineral', id: 2, label: 'Selenium' },
          { type: 'mineral', id: 19, label: 'Vitamin E' },
        ],
      },
      {
        type: 'conventional',
        tools: ['BoSe injection', 'Vitamin E injection', 'Supportive care'],
        context:
          'Injectable selenium (BoSe) is prescription. Early treatment improves outcomes. Muscle damage may be permanent if severe.',
        resourceLinks: [{ type: 'medication', id: 11, label: 'BoSe' }],
      },
    ],
    commonMistakes: [
      'Not knowing if area is selenium deficient',
      'Not supplementing pregnant does',
      'Waiting too long to treat affected kids',
      'Over-supplementing (selenium toxicity is possible)',
      'Not checking all kids from same dam',
    ],
    identification:
      'Clinical signs in kids, especially in known deficient areas. Blood selenium levels can confirm. Response to treatment supports diagnosis.',
    relatedConditions: [11], // Grass tetany
  },

  {
    id: 11,
    name: 'Grass Tetany (Hypomagnesemia)',
    aliases: ['Grass staggers', 'Magnesium deficiency', 'Hypomagnesemic tetany'],
    category: 'Nutritional',
    severity: 'Critical',
    summary: 'Magnesium deficiency causing neurological signs, especially on lush spring pasture.',
    symptomTags: ['neurological', 'off-feed-lethargy'],
    signs: [
      'Muscle tremors',
      'Staggering or uncoordinated gait',
      'Excitability or nervousness',
      'Ear twitching',
      'Convulsions',
      'Sudden collapse',
    ],
    immediateChecks: [
      'Recent change to lush pasture?',
      'Spring grazing situation?',
      'High-producing/lactating doe?',
      'Recent stress event?',
      'What minerals are available?',
    ],
    escalationTriggers: [
      'Convulsions',
      'Down and unable to rise',
      'Rapid progression',
      'Lactating heavy milker',
      'No improvement with treatment',
    ],
    supportPathways: [
      {
        type: 'mineral',
        tools: ['Magnesium', 'Calcium (often concurrent)'],
        context:
          'Magnesium supplementation is critical. Often occurs with low calcium. Prevention through mineral management during high-risk periods.',
        resourceLinks: [{ type: 'mineral', id: 6, label: 'Magnesium' }],
      },
      {
        type: 'conventional',
        tools: ['Injectable magnesium', 'CMPK', 'Magnesium oxide (prevention)'],
        context:
          'Emergency treatment may require injectable magnesium. Prevention through high-magnesium minerals during spring grazing. Manage pasture access.',
        resourceLinks: [{ type: 'medication', id: 12, label: 'Magnesium products' }],
      },
    ],
    commonMistakes: [
      'Sudden turnout to lush spring pasture',
      'Not providing magnesium supplementation in spring',
      'Not recognizing early signs',
      'Confusing with other neurological conditions',
      'Not managing high-potassium pasture risk',
    ],
    identification:
      'Clinical signs during high-risk period (spring, lush pasture). Response to magnesium treatment. Blood magnesium levels if available.',
    relatedConditions: [12], // Polio
    isEmergency: true,
  },

  {
    id: 12,
    name: 'Polioencephalomalacia (Goat Polio)',
    aliases: ['Goat polio', 'PEM', 'Cerebrocortical necrosis', 'Thiamine deficiency'],
    category: 'Neurological',
    severity: 'Critical',
    summary: 'Thiamine deficiency causing brain damage and neurological signs — time-critical emergency.',
    symptomTags: ['neurological', 'off-feed-lethargy'],
    signs: [
      'Star-gazing (head pressed back)',
      'Blindness',
      'Circling or aimless walking',
      'Muscle tremors',
      'Convulsions',
      'Down with paddling',
    ],
    immediateChecks: [
      'Recent diet change (especially high grain)?',
      'Access to high-sulfur water?',
      'Recent coccidiosis treatment (amprolium)?',
      'How long have signs been present?',
      'Progression speed?',
    ],
    escalationTriggers: [
      'Any neurological signs (this is already an emergency)',
      'Convulsions',
      'Down and unable to rise',
      'Blindness',
      'Signs present >24 hours',
    ],
    supportPathways: [
      {
        type: 'mineral',
        tools: ['Thiamine (Vitamin B1)'],
        context:
          'High-dose thiamine injection is the primary treatment. Must be given early for best outcome. Brain damage may be permanent if delayed.',
        resourceLinks: [{ type: 'mineral', id: 20, label: 'B Vitamins' }],
      },
      {
        type: 'conventional',
        tools: ['Thiamine injection', 'Dexamethasone (reduce brain swelling)', 'Supportive care'],
        context:
          'Thiamine injection is critical and time-sensitive. Higher doses commonly used in goats. Response within 24-48 hours supports diagnosis.',
        resourceLinks: [{ type: 'medication', id: 13, label: 'Thiamine' }],
      },
    ],
    commonMistakes: [
      'Waiting to see if signs resolve',
      'Not having thiamine on hand',
      'Underdosing thiamine',
      'High-sulfur water without awareness',
      'Confusing with listeriosis or other neuro conditions',
    ],
    identification:
      'Clinical neurological signs with dietary or environmental triggers. Response to thiamine treatment (often rapid if caught early). Fluorescence of brain tissue under UV at necropsy.',
    relatedMyths: [6], // Copper toxicity confusion
    isEmergency: true,
  },
];

// ============ HELPER FUNCTIONS ============

export function getConditionById(id: number): ConditionEntry | undefined {
  return conditions.find((c) => c.id === id);
}

export function getConditionsByCategory(category: ConditionCategory): ConditionEntry[] {
  return conditions.filter((c) => c.category === category);
}

export function getConditionsBySeverity(severity: Severity): ConditionEntry[] {
  return conditions.filter((c) => c.severity === severity);
}

export function getConditionsBySymptomTag(tag: SymptomTag): ConditionEntry[] {
  return conditions.filter((c) => c.symptomTags.includes(tag));
}

export function getEmergencyConditions(): ConditionEntry[] {
  return conditions.filter((c) => c.isEmergency);
}

export function searchConditions(query: string): ConditionEntry[] {
  const lowerQuery = query.toLowerCase();
  return conditions.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.aliases?.some((a) => a.toLowerCase().includes(lowerQuery)) ||
      c.summary.toLowerCase().includes(lowerQuery) ||
      c.signs.some((s) => s.toLowerCase().includes(lowerQuery))
  );
}

export function getConditionCategories(): ConditionCategory[] {
  return Array.from(new Set(conditions.map((c) => c.category)));
}

/**
 * Get conditions grouped by symptom tag for landing page
 */
export function getConditionsBySymptomTags(): Record<SymptomTag, ConditionEntry[]> {
  const result = {} as Record<SymptomTag, ConditionEntry[]>;
  const allTags = Object.keys(SYMPTOM_TAG_LABELS) as SymptomTag[];

  allTags.forEach((tag) => {
    result[tag] = conditions.filter((c) => c.symptomTags.includes(tag));
  });

  return result;
}
