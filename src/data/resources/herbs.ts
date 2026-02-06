/**
 * GoatWise Resources - Herbs & Natural Remedies Data
 * /src/data/resources/herbs.ts
 *
 * Refactored from herbs.tsx with "commonly used for" language
 * per Field Manual guidelines
 */

import { HerbCategory, Effectiveness, ResourceLink, HERB_DISCLAIMER } from './types';

// ============ HERB TYPES ============

export interface HerbEntry {
  id: number;
  name: string;
  scientificName: string;
  category: HerbCategory;

  // Refactored language: "commonly used for" instead of prescriptive
  commonlyUsedFor: string[];

  // Field context (replaces description)
  context: string;

  // Reference only - with framing
  typicalApplication: string;

  // Cautions (always present)
  cautions: string[];

  // Effectiveness (with disclaimer context)
  effectiveness: Effectiveness;

  // Cross-links
  relatedConditions?: number[];
  relatedMinerals?: number[];

  // Safety flags
  pregnancyWarning?: boolean;
  topicalOnly?: boolean;
}

// Re-export disclaimer
export { HERB_DISCLAIMER };

// ============ HERBS DATA ============

export const herbs: HerbEntry[] = [
  {
    id: 1,
    name: 'Garlic',
    scientificName: 'Allium sativum',
    category: 'Immune Support',
    commonlyUsedFor: [
      'General immune support',
      'Respiratory wellness',
      'Mild parasite deterrent (supportive)',
      'Mastitis prevention support',
    ],
    context:
      'Garlic is one of the most commonly used herbs in natural goat care. Experienced owners often include it as part of a broader wellness approach. Has antimicrobial and antiviral properties in research settings.',
    typicalApplication:
      'Fresh cloves: 1-2 cloves per adult goat daily, minced and mixed with feed. Dried powder: 1/2 to 1 teaspoon. Reference only — verify amounts externally.',
    cautions: [
      'May affect milk flavor if fed in large amounts close to milking',
      'Start with small amounts to assess tolerance',
      'Not a replacement for clinical parasite treatment',
    ],
    effectiveness: 'Moderate',
    relatedConditions: [1, 2], // Barber Pole, Coccidia (supportive only)
  },

  {
    id: 2,
    name: 'Wormwood',
    scientificName: 'Artemisia absinthium',
    category: 'Parasite Control',
    commonlyUsedFor: ['Traditional parasite support', 'Digestive support', 'Appetite stimulation'],
    context:
      'Wormwood has been used for centuries in traditional parasite management. Contains thujone which can be concerning in large amounts. Experienced owners may use it as part of an integrated approach.',
    typicalApplication:
      'Dried herb: small amounts mixed with feed for limited periods. Reference only — verify amounts and duration externally.',
    cautions: [
      'Do NOT use in pregnant animals — commonly associated with miscarriage risk',
      'Not for long-term or continuous use',
      'Can be toxic in large amounts',
      'Not a standalone treatment for clinical parasitism',
    ],
    effectiveness: 'Low-Moderate',
    pregnancyWarning: true,
    relatedConditions: [1],
  },

  {
    id: 3,
    name: 'Black Walnut',
    scientificName: 'Juglans nigra',
    category: 'Parasite Control',
    commonlyUsedFor: ['Traditional parasite support', 'Antifungal support'],
    context:
      'Black walnut hull has been traditionally used for parasite support. Contains juglone. Some experienced owners include it in integrated parasite programs.',
    typicalApplication:
      'Dried hull powder: small amounts for short periods only. Reference only — verify amounts externally. Not for long-term use.',
    cautions: [
      'Do NOT use in pregnant animals',
      'Can be toxic in large amounts',
      'Use hulls only, not leaves or bark',
      'Not a replacement for clinical treatment',
    ],
    effectiveness: 'Low-Moderate',
    pregnancyWarning: true,
    relatedConditions: [1],
  },

  {
    id: 4,
    name: 'Pumpkin Seeds',
    scientificName: 'Cucurbita pepo',
    category: 'Parasite Control',
    commonlyUsedFor: ['Traditional tapeworm support', 'Nutritional supplement', 'Urinary wellness'],
    context:
      'Pumpkin seeds contain cucurbitin. Traditionally associated with tapeworm support more than other parasites. Often fed as a nutritional supplement.',
    typicalApplication:
      'Whole seeds: commonly offered as treats or mixed with feed. Can be fed fresh from pumpkins or dried.',
    cautions: [
      'Generally very safe',
      'Limited effectiveness against most common goat parasites (roundworms)',
      'Should not replace clinical parasite management',
    ],
    effectiveness: 'Low',
  },

  {
    id: 5,
    name: 'Oregano',
    scientificName: 'Origanum vulgare',
    category: 'Immune Support',
    commonlyUsedFor: ['Immune support', 'Respiratory wellness', 'Digestive support', 'Coccidiosis prevention support'],
    context:
      'Oregano and oregano oil have strong antimicrobial properties in research settings. Some farms include it as part of coccidiosis prevention programs.',
    typicalApplication:
      'Dried oregano: commonly mixed with feed. Oregano oil: must be diluted — reference essential oil guidelines.',
    cautions: [
      'Oregano oil is very potent — always dilute',
      'May affect milk flavor',
      'Not a replacement for clinical coccidiosis treatment',
    ],
    effectiveness: 'Moderate',
    relatedConditions: [2], // Coccidia
  },

  {
    id: 6,
    name: 'Thyme',
    scientificName: 'Thymus vulgaris',
    category: 'Respiratory',
    commonlyUsedFor: ['Respiratory support', 'Cough support', 'Digestive support'],
    context:
      'Thyme is commonly used for respiratory issues due to its expectorant properties. Contains thymol. Often combined with other respiratory herbs.',
    typicalApplication:
      'Dried thyme: commonly mixed with feed or steeped as tea. Thyme oil is potent — dilute if using.',
    cautions: ['Generally very safe', 'Thyme oil is potent — dilute if using topically'],
    effectiveness: 'Moderate-High',
    relatedConditions: [3], // Pneumonia
  },

  {
    id: 7,
    name: 'Echinacea',
    scientificName: 'Echinacea purpurea',
    category: 'Immune Support',
    commonlyUsedFor: ['Immune system support', 'Early illness support', 'Wound healing support'],
    context:
      'Echinacea is commonly used at the first sign of illness for immune support. Not typically used long-term or continuously.',
    typicalApplication:
      'Dried herb or tincture: commonly given for limited periods (7-10 days), then break. Reference specific amounts externally.',
    cautions: [
      'Not for continuous long-term use',
      'May lose effectiveness with constant use',
      'Best used at first signs of illness',
    ],
    effectiveness: 'Moderate',
  },

  {
    id: 8,
    name: 'Slippery Elm',
    scientificName: 'Ulmus rubra',
    category: 'Digestive',
    commonlyUsedFor: ['Digestive upset support', 'Diarrhea support', 'Soothing irritated tissues'],
    context:
      'Slippery elm bark is a demulcent — it coats and soothes irritated tissues. Commonly used for digestive upset and diarrhea support.',
    typicalApplication:
      'Powder mixed with water to make a paste. Commonly given by drench or mixed with feed. Can be given multiple times daily.',
    cautions: ['Very safe', 'May slow absorption of medications — give separately from other treatments'],
    effectiveness: 'High',
    relatedConditions: [4], // Scours/Diarrhea
  },

  {
    id: 9,
    name: 'Marshmallow Root',
    scientificName: 'Althaea officinalis',
    category: 'Digestive',
    commonlyUsedFor: ['Digestive support', 'Urinary support', 'Respiratory support', 'Soothing inflammation'],
    context:
      'Marshmallow root is another demulcent that soothes irritated tissues. Often used similarly to slippery elm.',
    typicalApplication: 'Dried root: commonly mixed with water or given as powder. Can be made into tea.',
    cautions: ['Very safe', 'May slow absorption of other medications'],
    effectiveness: 'Moderate-High',
  },

  {
    id: 10,
    name: 'Chamomile',
    scientificName: 'Matricaria chamomilla',
    category: 'Calming',
    commonlyUsedFor: ['Calming support', 'Digestive upset', 'Mild inflammation support'],
    context:
      'Chamomile is gentle and commonly used for stressed animals, digestive upset, and mild inflammation support.',
    typicalApplication:
      'Chamomile tea: offered as drench or added to water. Dried flowers: commonly mixed with feed.',
    cautions: ['Generally very safe', 'Related to ragweed — rare allergic reactions possible'],
    effectiveness: 'Moderate',
  },

  {
    id: 11,
    name: 'Lavender',
    scientificName: 'Lavandula angustifolia',
    category: 'Calming',
    commonlyUsedFor: ['Calming support', 'Insect deterrent', 'Minor wound care (topical)', 'Stress support'],
    context: 'Lavender has calming properties and can help deter some insects. Essential oil commonly used topically.',
    typicalApplication:
      'Dried lavender: offered as browse or mixed with feed. Essential oil: dilute heavily for topical use only.',
    cautions: [
      'Essential oil is toxic if ingested — external use only',
      'Always dilute essential oil',
      'Dried herb is safe',
    ],
    effectiveness: 'Low-Moderate',
    topicalOnly: true,
  },

  {
    id: 12,
    name: 'Valerian',
    scientificName: 'Valeriana officinalis',
    category: 'Calming',
    commonlyUsedFor: ['Stronger calming support', 'Anxiety support', 'Pain support'],
    context:
      'Valerian is a stronger sedative herb. Used sparingly by experienced owners for very stressed animals or those in discomfort.',
    typicalApplication: 'Dried root or tincture: used sparingly. Reference amounts externally.',
    cautions: [
      'Can cause excessive sedation',
      'Do not use with other sedatives',
      'Not for long-term use',
      'Use sparingly',
    ],
    effectiveness: 'Moderate-High',
  },

  {
    id: 13,
    name: 'Ginger',
    scientificName: 'Zingiber officinale',
    category: 'Digestive',
    commonlyUsedFor: ['Digestive support', 'Nausea support', 'Circulation support', 'Inflammation support'],
    context:
      'Ginger is warming and stimulating. Commonly used for digestive issues, nausea, and improving circulation.',
    typicalApplication:
      'Fresh ginger: grated into feed. Dried powder: commonly mixed with feed. Ginger tea can be given as drench.',
    cautions: ['Generally safe', 'May increase bleeding — avoid before surgery', 'Very warming'],
    effectiveness: 'Moderate-High',
  },

  {
    id: 14,
    name: 'Fennel',
    scientificName: 'Foeniculum vulgare',
    category: 'Digestive',
    commonlyUsedFor: ['Bloat support', 'Digestive support', 'Lactation support', 'Gas relief'],
    context:
      'Fennel is carminative — commonly used for gas and bloating support. Also traditionally used for lactation support.',
    typicalApplication:
      'Fennel seeds: commonly mixed with feed. Fennel tea: given as drench for bloat support. Fresh fennel can be offered as browse.',
    cautions: ['Generally safe', 'Essential oil should be diluted'],
    effectiveness: 'Moderate',
    relatedConditions: [5], // Bloat
  },

  {
    id: 15,
    name: 'Fenugreek',
    scientificName: 'Trigonella foenum-graecum',
    category: 'Lactation',
    commonlyUsedFor: ['Lactation support', 'Milk production support', 'Digestive support'],
    context:
      'Fenugreek is the most commonly used herb for lactation support. Often fed to does during lactation.',
    typicalApplication: 'Fenugreek seeds: commonly soaked or ground and mixed with feed for lactating does.',
    cautions: [
      'May cause maple syrup odor in milk and urine (not harmful)',
      'Some sources suggest avoiding in pregnancy (may stimulate uterus)',
    ],
    effectiveness: 'Moderate-High',
    pregnancyWarning: true,
  },

  {
    id: 16,
    name: 'Red Raspberry Leaf',
    scientificName: 'Rubus idaeus',
    category: 'Reproductive',
    commonlyUsedFor: ['Uterine toning', 'Pregnancy support', 'Kidding preparation', 'General tonic'],
    context:
      'Red raspberry leaf is commonly used for female reproductive support. Many farms include it in late pregnancy.',
    typicalApplication:
      'Dried leaves: commonly given daily, especially in last month of pregnancy. Can be made into tea.',
    cautions: [
      'Very safe',
      'Some sources recommend only in last trimester, others use throughout pregnancy',
    ],
    effectiveness: 'Moderate-High',
  },

  {
    id: 17,
    name: 'Nettle',
    scientificName: 'Urtica dioica',
    category: 'Nutritive',
    commonlyUsedFor: ['Mineral supplementation', 'Lactation support', 'Allergy support', 'General tonic'],
    context:
      'Nettle is highly nutritious, rich in minerals especially iron. Commonly used as a general tonic and for lactation support.',
    typicalApplication:
      'Dried nettle: commonly mixed with feed. Nettle tea is also effective. Fresh nettle must be wilted first (stings when fresh).',
    cautions: ['Fresh nettle stings — must be dried or wilted before feeding', 'Very safe when prepared properly'],
    effectiveness: 'Moderate-High',
  },

  {
    id: 18,
    name: 'Dandelion',
    scientificName: 'Taraxacum officinale',
    category: 'Nutritive',
    commonlyUsedFor: ['Liver support', 'Mild diuretic', 'Mineral source', 'Digestive support'],
    context:
      'Dandelion is a nutritious plant commonly offered as browse. Root supports liver function; leaves have mild diuretic properties.',
    typicalApplication:
      'Fresh dandelion: offered as browse (goats often enjoy it). Dried root or leaf: commonly mixed with feed.',
    cautions: [
      'Very safe',
      'Diuretic effect from leaves — ensure adequate water',
      'Avoid if using other diuretics',
    ],
    effectiveness: 'Moderate',
  },

  {
    id: 19,
    name: 'Comfrey',
    scientificName: 'Symphytum officinale',
    category: 'Wound Healing',
    commonlyUsedFor: ['Wound healing support (topical)', 'Bone healing support (topical)', 'Skin support'],
    context:
      'Comfrey is called "knitbone" for its traditional use in wound and bone healing support. Contains allantoin. Internal use is controversial.',
    typicalApplication:
      'Topical: commonly made into poultice for wounds and injuries. Internal use is debated due to pyrrolizidine alkaloids.',
    cautions: [
      'Contains pyrrolizidine alkaloids — liver concerns with long-term internal use',
      'External/topical use is generally considered safe',
      'Internal use is controversial and debated',
    ],
    effectiveness: 'High',
    topicalOnly: true,
  },

  {
    id: 20,
    name: 'Calendula',
    scientificName: 'Calendula officinalis',
    category: 'Wound Healing',
    commonlyUsedFor: ['Wound healing support', 'Skin support', 'Inflammation support', 'Antifungal support'],
    context:
      'Calendula is commonly used for skin issues and wound healing support. Has anti-inflammatory properties.',
    typicalApplication:
      'Topical: calendula salve or oil commonly applied to wounds. Tea can be used as wound wash. Dried flowers can be fed.',
    cautions: [
      'Very safe',
      'Promotes rapid healing — ensure wounds are clean first (avoid sealing in infection)',
    ],
    effectiveness: 'High',
  },

  {
    id: 21,
    name: 'Plantain',
    scientificName: 'Plantago major',
    category: 'Wound Healing',
    commonlyUsedFor: ['Wound support', 'Insect bite support', 'Drawing out infection', 'Digestive support'],
    context:
      'Plantain (the weed, not the banana) is commonly used for bites, stings, and drawing out splinters or infection. Very accessible.',
    typicalApplication:
      'Fresh leaves: crushed and applied directly to wounds/bites. Dried: made into poultice with water. Can also be fed.',
    cautions: ['Very safe', 'Common weed — easy to find and use'],
    effectiveness: 'Moderate-High',
  },

  {
    id: 22,
    name: 'Yarrow',
    scientificName: 'Achillea millefolium',
    category: 'Wound Healing',
    commonlyUsedFor: ['Bleeding support (styptic)', 'Wound support', 'Fever support', 'Digestive support'],
    context:
      'Yarrow is commonly used to help stop bleeding. Its Latin name comes from Achilles who reportedly used it on battlefield wounds.',
    typicalApplication:
      'Fresh or dried: commonly applied directly to bleeding wounds. Tea can be given internally for fever or digestive support.',
    cautions: ['Avoid in pregnancy', 'Related to ragweed — rare allergies possible', 'Very effective styptic'],
    effectiveness: 'High',
    pregnancyWarning: true,
  },

  {
    id: 23,
    name: 'Tea Tree',
    scientificName: 'Melaleuca alternifolia',
    category: 'Antimicrobial',
    commonlyUsedFor: ['Antifungal support (topical)', 'Antibacterial support (topical)', 'Wound care', 'Ringworm support'],
    context:
      'Tea tree oil has strong antifungal and antibacterial properties. Commonly used topically for ringworm, wounds, and skin infections.',
    typicalApplication:
      'TOPICAL ONLY: Essential oil must be diluted (1-2% in carrier oil). Apply to affected areas. Never give internally.',
    cautions: [
      'TOXIC IF INGESTED — external use only',
      'Always dilute — can cause skin irritation if used full strength',
      'Never give internally',
    ],
    effectiveness: 'High',
    topicalOnly: true,
  },

  {
    id: 24,
    name: 'Aloe Vera',
    scientificName: 'Aloe barbadensis',
    category: 'Wound Healing',
    commonlyUsedFor: ['Burn support', 'Wound support', 'Skin soothing', 'Digestive support (inner gel only)'],
    context:
      'Aloe vera gel is soothing for burns, wounds, and skin irritation. The inner gel can be used internally for digestive support.',
    typicalApplication:
      'Topical: fresh gel applied directly to wounds/burns. Internal: pure inner gel only (no latex) for digestive support.',
    cautions: ['The latex (yellow part) is a strong laxative — use only clear inner gel internally'],
    effectiveness: 'High',
  },

  {
    id: 25,
    name: 'Milk Thistle',
    scientificName: 'Silybum marianum',
    category: 'Liver Support',
    commonlyUsedFor: ['Liver support', 'Detoxification support', 'Post-treatment support', 'Toxin exposure support'],
    context:
      'Milk thistle is the most commonly used herb for liver support. Often given after deworming, antibiotics, or toxin exposure.',
    typicalApplication: 'Seeds: commonly ground and mixed with feed. Tincture or standardized extract can also be used.',
    cautions: ['Generally very safe', 'May interact with some medications processed by liver'],
    effectiveness: 'High',
  },

  {
    id: 26,
    name: 'Turmeric',
    scientificName: 'Curcuma longa',
    category: 'Anti-inflammatory',
    commonlyUsedFor: ['Inflammation support', 'Joint support', 'Antioxidant support', 'Digestive support'],
    context:
      'Turmeric contains curcumin, which has anti-inflammatory properties. Commonly used for joint and inflammation support.',
    typicalApplication:
      'Powder: commonly mixed with feed. Often combined with black pepper and fat for better absorption ("golden paste" is popular).',
    cautions: [
      'May affect blood clotting — avoid before surgery',
      'Can stain everything yellow',
      'Needs fat and pepper for absorption',
    ],
    effectiveness: 'Moderate-High',
  },

  {
    id: 27,
    name: 'Willow Bark',
    scientificName: 'Salix alba',
    category: 'Pain Relief',
    commonlyUsedFor: ['Pain support', 'Fever support', 'Inflammation support'],
    context:
      'Willow bark contains salicin, a natural precursor to aspirin. Commonly used for pain and fever support.',
    typicalApplication:
      'Dried bark: commonly steeped in hot water and given as drench. Fresh bark can be offered as browse.',
    cautions: [
      'Similar precautions to aspirin',
      'Avoid with bleeding disorders',
      'Do not use in young kids or pregnant does',
    ],
    effectiveness: 'Moderate',
    pregnancyWarning: true,
  },

  {
    id: 28,
    name: 'Cayenne',
    scientificName: 'Capsicum annuum',
    category: 'Circulatory',
    commonlyUsedFor: ['Bleeding support (styptic)', 'Circulation support', 'Shock support', 'Warming'],
    context:
      'Cayenne is a powerful circulatory stimulant. Commonly used to help stop bleeding quickly and support animals in shock.',
    typicalApplication:
      'Emergency bleeding: powder commonly applied directly to wound. Internal: small amounts in warm water as drench for shock support.',
    cautions: [
      'Very hot — can irritate sensitive tissues',
      'Start with small amounts internally',
      'Burns eyes — wash hands after handling',
    ],
    effectiveness: 'High',
  },

  {
    id: 29,
    name: 'Goldenseal',
    scientificName: 'Hydrastis canadensis',
    category: 'Antimicrobial',
    commonlyUsedFor: ['Antimicrobial support', 'Eye infection support', 'Digestive infection support', 'Wound wash'],
    context:
      'Goldenseal contains berberine and has antimicrobial properties. Expensive and overharvested — consider alternatives.',
    typicalApplication:
      'Tea: commonly used as eye wash or wound wash. Internal: small amounts for digestive support. Use sparingly.',
    cautions: [
      'Expensive and endangered — use alternatives when possible (Oregon grape root)',
      'Do not use in pregnancy',
      'Not for long-term use',
    ],
    effectiveness: 'High',
    pregnancyWarning: true,
  },

  {
    id: 30,
    name: 'Oregon Grape Root',
    scientificName: 'Mahonia aquifolium',
    category: 'Antimicrobial',
    commonlyUsedFor: ['Antimicrobial support', 'Digestive infection support', 'Skin support', 'Liver support'],
    context:
      'Oregon grape root contains berberine like goldenseal but is more sustainable. Good alternative for antimicrobial support.',
    typicalApplication: 'Dried root: commonly made into tea for washing wounds or internal use.',
    cautions: ['Avoid in pregnancy', 'Bitter — may need to mix with other herbs or sweetener'],
    effectiveness: 'Moderate-High',
    pregnancyWarning: true,
  },

  {
    id: 31,
    name: 'Mullein',
    scientificName: 'Verbascum thapsus',
    category: 'Respiratory',
    commonlyUsedFor: ['Respiratory support', 'Cough support', 'Lung health', 'Ear infection support (flower oil)'],
    context:
      'Mullein is commonly used for respiratory issues. The leaves support coughs; the flower oil is used for ear support.',
    typicalApplication:
      'Dried leaf tea: commonly given as drench for coughs. Mullein flower oil: warmed and used in ears. Dried leaves can be fed.',
    cautions: ['Strain tea well — tiny hairs can irritate throat', 'Generally very safe'],
    effectiveness: 'Moderate-High',
    relatedConditions: [3], // Pneumonia
  },

  {
    id: 32,
    name: 'Elderberry',
    scientificName: 'Sambucus nigra',
    category: 'Immune Support',
    commonlyUsedFor: ['Immune support', 'Antiviral support', 'Respiratory infection support', 'Fever support'],
    context:
      'Elderberry has antiviral properties and is commonly used at the first sign of respiratory illness for immune support.',
    typicalApplication:
      'Elderberry syrup: commonly given at first sign of illness. Dried berries: steeped into tea.',
    cautions: [
      'Only use ripe, cooked berries',
      'Raw elderberries, leaves, and stems are toxic',
      'Buy from reputable source',
    ],
    effectiveness: 'Moderate-High',
  },

  {
    id: 33,
    name: 'Licorice Root',
    scientificName: 'Glycyrrhiza glabra',
    category: 'Respiratory',
    commonlyUsedFor: ['Respiratory support', 'Adrenal support', 'Soothing support', 'Making other herbs palatable'],
    context:
      'Licorice root is soothing for respiratory issues and supports adrenal function. Also makes bitter herbs more palatable.',
    typicalApplication: 'Dried root: commonly combined with other respiratory herbs. Makes teas taste better.',
    cautions: [
      'Do not use long-term or in large amounts — can affect electrolyte balance',
      'Avoid with heart or kidney issues',
    ],
    effectiveness: 'Moderate',
  },

  {
    id: 34,
    name: 'Rosemary',
    scientificName: 'Rosmarinus officinalis',
    category: 'Circulatory',
    commonlyUsedFor: ['Circulation support', 'Antioxidant support', 'Digestive support', 'Insect deterrent'],
    context:
      'Rosemary is stimulating and improves circulation. Also has antioxidant properties and may help deter some insects.',
    typicalApplication:
      'Dried rosemary: commonly mixed with feed. Fresh rosemary can be offered as browse. Essential oil for topical use.',
    cautions: ['Avoid in pregnancy (may stimulate uterus)', 'Generally safe in culinary amounts'],
    effectiveness: 'Low-Moderate',
    pregnancyWarning: true,
  },

  {
    id: 35,
    name: 'Peppermint',
    scientificName: 'Mentha piperita',
    category: 'Digestive',
    commonlyUsedFor: ['Digestive support', 'Bloat support', 'Cooling', 'Nausea support'],
    context: 'Peppermint is cooling and commonly used for digestive issues, especially bloat and nausea. Very palatable.',
    typicalApplication:
      'Dried leaves: commonly mixed with feed. Peppermint tea can be given as drench. Fresh peppermint as browse (it spreads!).',
    cautions: [
      'Generally safe',
      'Essential oil is potent — dilute for any use',
      'May decrease milk supply in some animals',
    ],
    effectiveness: 'Moderate',
    relatedConditions: [5], // Bloat
  },

  {
    id: 36,
    name: 'Lemon Balm',
    scientificName: 'Melissa officinalis',
    category: 'Calming',
    commonlyUsedFor: ['Calming support', 'Antiviral support', 'Digestive support', 'Fever support'],
    context:
      'Lemon balm is gently calming and has antiviral properties. Pleasant lemony taste that goats often enjoy.',
    typicalApplication: 'Dried leaves: commonly mixed with feed. Fresh lemon balm as browse. Tea can be given as drench.',
    cautions: ['Very safe', 'May affect thyroid if used in very large amounts long-term'],
    effectiveness: 'Low-Moderate',
  },

  {
    id: 37,
    name: 'Sage',
    scientificName: 'Salvia officinalis',
    category: 'Antimicrobial',
    commonlyUsedFor: ['Antimicrobial support', 'Drying up milk', 'Sore throat support', 'Digestive support'],
    context:
      'Sage has antimicrobial properties and is traditionally used to help dry up milk supply when weaning.',
    typicalApplication: 'Dried sage: commonly mixed with feed. Sage tea for drying up milk production.',
    cautions: [
      'Do NOT use in pregnant or lactating does (unless intentionally drying off)',
      'Contains thujone — not for long-term use',
    ],
    effectiveness: 'Moderate-High',
    pregnancyWarning: true,
  },

  {
    id: 38,
    name: 'Blessed Thistle',
    scientificName: 'Cnicus benedictus',
    category: 'Lactation',
    commonlyUsedFor: ['Lactation support', 'Digestive support', 'Appetite stimulation'],
    context: 'Blessed thistle is commonly used for lactation support, often combined with fenugreek.',
    typicalApplication: 'Dried herb: commonly mixed with feed for lactating does. Often combined with fenugreek.',
    cautions: ['Avoid in pregnancy', 'Related to ragweed — rare allergies possible'],
    effectiveness: 'Moderate',
    pregnancyWarning: true,
  },

  {
    id: 39,
    name: "Goat's Rue",
    scientificName: 'Galega officinalis',
    category: 'Lactation',
    commonlyUsedFor: ['Lactation support', 'Blood sugar support'],
    context: "Goat's rue is named for its traditional use in supporting milk production in goats.",
    typicalApplication:
      'Dried herb: commonly started before kidding and continued through lactation. Start with small amounts.',
    cautions: [
      'Fresh plant is toxic — use only dried',
      'Do not use in pregnancy',
      'Start with small amounts',
    ],
    effectiveness: 'Moderate',
    pregnancyWarning: true,
  },

  {
    id: 40,
    name: 'Kelp',
    scientificName: 'Various seaweeds',
    category: 'Nutritive',
    commonlyUsedFor: ['Mineral supplementation', 'Iodine source', 'Thyroid support', 'Coat health'],
    context:
      'Kelp is a seaweed rich in trace minerals, especially iodine. Commonly used as a natural mineral supplement.',
    typicalApplication: 'Kelp meal: commonly offered free choice or added to mineral mix.',
    cautions: ['Very high in iodine — do not overfeed', 'Can cause iodine toxicity if given in excess'],
    effectiveness: 'High',
    relatedMinerals: [8], // Iodine
  },

  {
    id: 41,
    name: 'Spirulina',
    scientificName: 'Arthrospira platensis',
    category: 'Nutritive',
    commonlyUsedFor: ['Nutritional supplement', 'Immune support', 'Protein source', 'Antioxidant support'],
    context:
      'Spirulina is a nutrient-dense blue-green algae. Commonly used as a protein, vitamin, and mineral supplement.',
    typicalApplication: 'Powder: commonly mixed with feed.',
    cautions: ['Generally safe', 'Buy from reputable sources to avoid contamination', 'Can be expensive'],
    effectiveness: 'Moderate',
  },

  {
    id: 42,
    name: 'Apple Cider Vinegar',
    scientificName: 'N/A',
    category: 'General Tonic',
    commonlyUsedFor: ['General tonic', 'Mineral absorption support', 'Urinary health'],
    context:
      'ACV is popular in goat keeping though many claims are not scientifically supported. May help with mineral absorption.',
    typicalApplication:
      'Commonly added to water. Raw, unpasteurized ACV with "mother" is typically preferred.',
    cautions: [
      'Not a substitute for proper veterinary care',
      'Antiparasitic claims are not scientifically supported',
      'Many traditional claims lack research backing',
    ],
    effectiveness: 'Low',
  },

  {
    id: 43,
    name: 'Activated Charcoal',
    scientificName: 'N/A',
    category: 'Poisoning',
    commonlyUsedFor: ['Poisoning support', 'Toxin absorption', 'Diarrhea support (sometimes)'],
    context:
      'Activated charcoal absorbs toxins in the digestive tract. Important for poisoning emergencies when given promptly.',
    typicalApplication:
      'Emergency poisoning: mixed with water and given as drench. Give as soon as possible after ingestion. Reference amounts externally.',
    cautions: [
      'Not effective for all poisons',
      'Most effective within 1-2 hours of ingestion',
      'Follow up with vet care',
      'This is emergency support, not a replacement for veterinary care',
    ],
    effectiveness: 'High',
  },

  {
    id: 44,
    name: 'Psyllium Husk',
    scientificName: 'Plantago ovata',
    category: 'Digestive',
    commonlyUsedFor: ['Constipation support', 'Sand/dirt clearance', 'Diarrhea support', 'Fiber supplement'],
    context:
      'Psyllium is a soluble fiber that can help normalize stool — commonly used for both constipation and diarrhea support.',
    typicalApplication: 'Powder: mixed with water. Must be given with plenty of water.',
    cautions: ['MUST give with adequate water or can cause impaction', 'Start with small amounts'],
    effectiveness: 'Moderate',
  },

  {
    id: 45,
    name: 'Papaya (Papain)',
    scientificName: 'Carica papaya',
    category: 'Digestive',
    commonlyUsedFor: ['Digestive enzyme support', 'Protein digestion', 'Mild bloat support'],
    context:
      'Papaya contains papain, a digestive enzyme. Commonly used for digestive support. Antiparasitic claims are not well supported.',
    typicalApplication:
      'Fresh papaya: chunks as treats. Papaya enzyme tablets. Dried papaya leaves.',
    cautions: ['Antiparasitic claims are not scientifically supported', 'Generally safe as digestive aid'],
    effectiveness: 'Moderate',
  },

  {
    id: 46,
    name: 'Clove',
    scientificName: 'Syzygium aromaticum',
    category: 'Antimicrobial',
    commonlyUsedFor: ['Antimicrobial support', 'Pain support (topical)', 'Antioxidant support'],
    context:
      'Clove oil contains eugenol, which has antimicrobial and numbing properties. Essential oil use requires caution.',
    typicalApplication:
      'Dried cloves: small amounts in feed. Clove oil: DILUTE heavily for topical use only.',
    cautions: ['Clove oil is very potent — always dilute', 'Can be irritating to mucous membranes'],
    effectiveness: 'Low-Moderate',
  },

  {
    id: 47,
    name: 'Cinnamon',
    scientificName: 'Cinnamomum verum',
    category: 'Antimicrobial',
    commonlyUsedFor: ['Antimicrobial support', 'Blood sugar support', 'Antioxidant support', 'Warming'],
    context: 'Cinnamon has antimicrobial properties and is warming. May help support blood sugar balance.',
    typicalApplication: 'Powder: commonly mixed with feed. Often combined with other herbs.',
    cautions: ['Use Ceylon cinnamon (not cassia) for regular use — cassia contains more coumarin'],
    effectiveness: 'Low-Moderate',
  },

  {
    id: 48,
    name: 'Neem',
    scientificName: 'Azadirachta indica',
    category: 'Parasite Control',
    commonlyUsedFor: ['External parasite support', 'Insect deterrent', 'Skin support'],
    context:
      'Neem has insecticidal properties. Commonly used topically for external parasites and as insect deterrent.',
    typicalApplication:
      'Neem oil: diluted and applied topically for skin parasites. Test small area first. Primarily topical use.',
    cautions: [
      'Neem oil can be toxic internally — primarily topical use',
      'Test small area first',
      'Internal use claims have limited evidence',
    ],
    effectiveness: 'Moderate',
    topicalOnly: true,
  },

  {
    id: 49,
    name: 'Eucalyptus',
    scientificName: 'Eucalyptus globulus',
    category: 'Respiratory',
    commonlyUsedFor: ['Respiratory support', 'Decongestant', 'Insect deterrent'],
    context:
      'Eucalyptus is clearing and decongestant. Commonly used for respiratory support. Essential oil use requires caution.',
    typicalApplication:
      'Essential oil: diffuse or use very diluted topically. Dried leaves: small amounts only.',
    cautions: [
      'Essential oil is toxic if ingested — external/aromatic use only',
      'Very potent',
    ],
    effectiveness: 'Moderate',
    topicalOnly: true,
    relatedConditions: [3], // Pneumonia
  },

  {
    id: 50,
    name: 'Colloidal Silver',
    scientificName: 'N/A',
    category: 'Antimicrobial',
    commonlyUsedFor: ['Wound care (topical)', 'Eye support (topical)'],
    context:
      'Colloidal silver is controversial. Scientific evidence is limited. Can cause argyria (permanent blue-gray skin discoloration).',
    typicalApplication: 'Topical: commonly applied to wounds. Internal use is controversial and not recommended.',
    cautions: [
      'Can cause permanent skin discoloration (argyria)',
      'Limited scientific evidence',
      'Not FDA approved for internal use',
      'Internal use not recommended',
    ],
    effectiveness: 'Debated/Unknown',
  },
];

// ============ HELPER FUNCTIONS ============

export function getHerbById(id: number): HerbEntry | undefined {
  return herbs.find((h) => h.id === id);
}

export function getHerbsByCategory(category: HerbCategory): HerbEntry[] {
  return herbs.filter((h) => h.category === category);
}

export function getHerbsWithPregnancyWarning(): HerbEntry[] {
  return herbs.filter((h) => h.pregnancyWarning);
}

export function getTopicalOnlyHerbs(): HerbEntry[] {
  return herbs.filter((h) => h.topicalOnly);
}

export function searchHerbs(query: string): HerbEntry[] {
  const lowerQuery = query.toLowerCase();
  return herbs.filter(
    (h) =>
      h.name.toLowerCase().includes(lowerQuery) ||
      h.scientificName.toLowerCase().includes(lowerQuery) ||
      h.commonlyUsedFor.some((u) => u.toLowerCase().includes(lowerQuery)) ||
      h.context.toLowerCase().includes(lowerQuery)
  );
}

export function getHerbCategories(): HerbCategory[] {
  return Array.from(new Set(herbs.map((h) => h.category)));
}
