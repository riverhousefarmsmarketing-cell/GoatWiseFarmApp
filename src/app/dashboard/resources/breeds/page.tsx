'use client';

import { useState } from 'react';
import { Card, Badge } from '@/components/ui';
import { Search, ChevronDown, ChevronUp, Milk, Scale, Mountain, Heart } from 'lucide-react';

// Comprehensive breed data - 14 breeds
const breeds = [
  {
    id: 1,
    name: 'Nigerian Dwarf',
    origin: 'West Africa',
    size: 'Miniature',
    primaryUse: 'Dairy',
    weight: { does: '50-75 lbs', bucks: '60-80 lbs' },
    height: '17-21 inches',
    milkProduction: '1-2 quarts/day',
    butterfat: '6-10%',
    temperament: 'Friendly, playful, excellent pets',
    colors: 'Any color or pattern',
    description: `Nigerian Dwarf goats are a miniature dairy breed known for their exceptionally high butterfat content - the highest of any dairy breed. Despite their small size, they are prolific milkers relative to their body weight and can breed year-round, unlike most goats that are seasonal breeders.

They make excellent pets and are ideal for small farms or suburban homesteads due to their compact size and friendly personalities. Does can be bred as young as 7-8 months (though waiting until 1 year is recommended) and typically have 2-4 kids per pregnancy.

Their milk is naturally homogenized due to the small fat globules, making it easier to digest and excellent for cheese-making. Many people who are sensitive to cow's milk can tolerate Nigerian Dwarf milk well.`,
    pros: ['High butterfat milk', 'Year-round breeding', 'Small size - easier to handle', 'Great personalities', 'Good for small properties'],
    cons: ['Small teats can be hard to milk', 'Lower total milk volume', 'Can be escape artists', 'Higher price point'],
    healthNotes: 'Generally hardy. Watch for hypocalcemia in heavy milkers. Prone to obesity if overfed.',
  },
  {
    id: 2,
    name: 'Nubian',
    origin: 'England (African/Indian crosses)',
    size: 'Large',
    primaryUse: 'Dairy/Meat',
    weight: { does: '130-175 lbs', bucks: '175-250 lbs' },
    height: '30-35 inches',
    milkProduction: '1-2 gallons/day',
    butterfat: '4-5%',
    temperament: 'Vocal, affectionate, can be stubborn',
    colors: 'Any color, often spotted',
    description: `Nubians are one of the most popular dairy breeds, known for their distinctive long, pendulous ears and Roman nose. They originated in England from crosses between British goats and lop-eared goats from Africa and India.

They produce milk with high butterfat content (second only to Nigerian Dwarfs among common dairy breeds), making their milk excellent for cheese and soap. Nubians are dual-purpose animals - their larger size makes them suitable for meat production as well.

Nubians are known for being LOUD. They are very vocal and will call out when they want attention, food, or are separated from their herd. This can be a problem in suburban areas. However, they are also extremely affectionate and bond strongly with their owners.`,
    pros: ['High butterfat milk', 'Dual purpose (milk and meat)', 'Heat tolerant', 'Affectionate personalities', 'Can breed year-round in some cases'],
    cons: ['VERY vocal/loud', 'Can be stubborn', 'Need more feed than smaller breeds', 'Not cold hardy'],
    healthNotes: 'Pendulous ears prone to frostbite in cold climates. Watch for mastitis. May need extra feed in winter.',
  },
  {
    id: 3,
    name: 'Alpine',
    origin: 'French Alps',
    size: 'Large',
    primaryUse: 'Dairy',
    weight: { does: '125-150 lbs', bucks: '170-220 lbs' },
    height: '30+ inches',
    milkProduction: '1-2 gallons/day',
    butterfat: '3.5-4%',
    temperament: 'Alert, curious, independent',
    colors: 'Various patterns with specific names (Cou Blanc, Sundgau, etc.)',
    description: `French Alpines are excellent dairy goats known for their high milk production and adaptability. They originated in the French Alps and are well-suited to various climates and management systems.

Alpines are known for their distinctive color patterns, each with traditional French names: Cou Blanc (white front quarters), Cou Noir (black front quarters), Sundgau (black with white markings), and many others.

They are hardy, adaptable goats that do well in both hot and cold climates. Alpines are known for being curious and independent - they're smart goats that can figure out latches and escape routes. They're generally good-natured but can be dominant in mixed herds.`,
    pros: ['High milk production', 'Adaptable to various climates', 'Hardy and healthy', 'Long lactation periods', 'Good feed conversion'],
    cons: ['Can be dominant/bossy', 'Independent (harder to train)', 'Need sturdy fencing', 'Lower butterfat than Nubians'],
    healthNotes: 'Generally very hardy. Some lines prone to G6S (genetic disease). Good longevity.',
  },
  {
    id: 4,
    name: 'LaMancha',
    origin: 'United States (Oregon)',
    size: 'Medium-Large',
    primaryUse: 'Dairy',
    weight: { does: '130-160 lbs', bucks: '160-200 lbs' },
    height: '28-30 inches',
    milkProduction: '1-2 gallons/day',
    butterfat: '4%',
    temperament: 'Calm, friendly, easy to handle',
    colors: 'Any color',
    description: `LaManchas are the only dairy breed developed in the United States, created in Oregon in the 1930s. Their most distinctive feature is their very small ears - either "gopher ears" (up to 1 inch, no cartilage) or "elf ears" (up to 2 inches, some cartilage).

Despite what some people think, LaManchas hear perfectly well - their ear canals are normal, just the external ear flap is reduced. This unique feature makes them easy to identify and gives them an almost alien appearance that people either love or find strange.

LaManchas are known for their excellent temperament - they're calm, friendly, and easy to handle. They make excellent first goats for beginners. They're also known for being persistent milkers who maintain production well throughout their lactation.`,
    pros: ['Excellent temperament', 'Great for beginners', 'Persistent milkers', 'Adaptable', 'Quiet compared to Nubians'],
    cons: ['Ears prone to frostbite (no protection)', 'Some people find appearance off-putting', 'Can be hard to find quality stock'],
    healthNotes: 'Ears need protection in extreme cold. Otherwise very hardy breed.',
  },
  {
    id: 5,
    name: 'Saanen',
    origin: 'Switzerland',
    size: 'Large',
    primaryUse: 'Dairy',
    weight: { does: '135-160 lbs', bucks: '180-220 lbs' },
    height: '30-35 inches',
    milkProduction: '1.5-3 gallons/day',
    butterfat: '3-4%',
    temperament: 'Calm, gentle, easy to manage',
    colors: 'White or cream only',
    description: `Saanens are the largest of the dairy breeds and the highest milk producers in terms of volume. They originated in the Saanen Valley of Switzerland and are often called the "Holsteins of the goat world."

They must be white or cream colored - any other color means they're technically Sables (same breed but different color). Their light coloring makes them sensitive to direct sunlight, and they can get sunburned.

Saanens are calm, gentle goats that are easy to handle and manage. They're popular in commercial dairy operations due to their high milk production and docile temperament. However, they're not as heat-tolerant as other breeds and do best in cooler climates.`,
    pros: ['Highest milk volume', 'Calm temperament', 'Easy to handle', 'Good for commercial dairies', 'Consistent production'],
    cons: ['Sensitive to sunlight/sunburn', 'Not heat tolerant', 'Lower butterfat', 'Need shade', 'Large size requires more feed'],
    healthNotes: 'Prone to sunburn - need shade. Watch for mastitis in heavy producers. May need zinc supplementation.',
  },
  {
    id: 6,
    name: 'Toggenburg',
    origin: 'Switzerland',
    size: 'Medium-Large',
    primaryUse: 'Dairy',
    weight: { does: '120-140 lbs', bucks: '150-180 lbs' },
    height: '26-30 inches',
    milkProduction: '1-1.5 gallons/day',
    butterfat: '3-4%',
    temperament: 'Alert, inquisitive, can be independent',
    colors: 'Brown with white Swiss markings',
    description: `Toggenburgs are considered the oldest known dairy breed, originating from the Toggenburg Valley in Switzerland. They have a distinctive color pattern - varying shades of brown with white Swiss markings on the face, ears, legs, and tail.

They are smaller than Saanens and Alpines but are excellent, persistent milkers. Toggenburgs are known for their longevity and can continue producing well into their teens. They're also known for having milk with a stronger flavor that some people describe as "goaty" - though this varies by individual and management.

Toggenburgs are alert, intelligent goats that do best in cooler climates. They have a reputation for being a bit more independent and less cuddly than some other breeds, though this varies significantly by individual.`,
    pros: ['Excellent longevity', 'Persistent milkers', 'Cold hardy', 'Lower feed requirements than larger breeds', 'Historic breed'],
    cons: ['Milk can have stronger flavor', 'Not heat tolerant', 'Can be independent/aloof', 'Strict color requirements for registration'],
    healthNotes: 'Very hardy in cold climates. Not suited for hot, humid environments. Good longevity.',
  },
  {
    id: 7,
    name: 'Oberhasli',
    origin: 'Switzerland',
    size: 'Medium',
    primaryUse: 'Dairy',
    weight: { does: '120-140 lbs', bucks: '150-180 lbs' },
    height: '28-30 inches',
    milkProduction: '1-1.5 gallons/day',
    butterfat: '3.5-4%',
    temperament: 'Sweet, gentle, people-oriented',
    colors: 'Chamoisee (bay) with black markings',
    description: `Oberhaslis are a Swiss breed known for their beautiful chamoisee coloring - a rich bay (reddish-brown) with black markings on the face, dorsal stripe, belly, and legs. They were previously called Swiss Alpines in the US.

They are medium-sized dairy goats that produce sweet-tasting milk. Oberhaslis are known for their calm, gentle personalities - they're very people-oriented and make excellent pets as well as dairy animals. They tend to be quieter than many other breeds.

Oberhaslis are relatively rare in the US compared to other Swiss breeds, but they have a devoted following among those who appreciate their temperament and appearance.`,
    pros: ['Sweet temperament', 'Sweet-tasting milk', 'Beautiful coloring', 'Quiet', 'Good size for handling'],
    cons: ['Relatively rare/hard to find', 'Lower milk production than larger breeds', 'Strict color requirements', 'Not heat tolerant'],
    healthNotes: 'Hardy in cool climates. Watch for overheating in summer. Generally healthy breed.',
  },
  {
    id: 8,
    name: 'Boer',
    origin: 'South Africa',
    size: 'Large',
    primaryUse: 'Meat',
    weight: { does: '200-250 lbs', bucks: '250-350 lbs' },
    height: '28-34 inches',
    milkProduction: 'Enough for kids (not dairy breed)',
    butterfat: 'N/A',
    temperament: 'Docile, calm, good mothers',
    colors: 'White body with red/brown head (traditional)',
    description: `Boers are the premier meat goat breed, developed in South Africa specifically for meat production. The name "Boer" is Dutch/Afrikaans for "farmer." They have a distinctive appearance with a white body and red/brown head.

Boers are fast-growing and have excellent muscle development, reaching market weight quickly. They're known for their docile temperament, making them easy to handle despite their large size. Does are excellent mothers with good milk production for raising kids.

Boers have transformed the meat goat industry worldwide and are now the standard against which other meat breeds are measured. They can be crossed with dairy breeds to produce kids with better meat characteristics.`,
    pros: ['Fast growth rate', 'Excellent meat quality', 'Docile temperament', 'Good mothers', 'Heat tolerant'],
    cons: ['Prone to parasites', 'Need more feed', 'Not dual-purpose (low milk for dairy)', 'Can be lazy foragers'],
    healthNotes: 'More susceptible to parasites than other breeds - need good parasite management. Watch for foot problems.',
  },
  {
    id: 9,
    name: 'Kiko',
    origin: 'New Zealand',
    size: 'Large',
    primaryUse: 'Meat',
    weight: { does: '100-180 lbs', bucks: '200-300 lbs' },
    height: '26-34 inches',
    milkProduction: 'Enough for kids',
    butterfat: 'N/A',
    temperament: 'Hardy, independent, good foragers',
    colors: 'Usually white, any color acceptable',
    description: `Kikos were developed in New Zealand in the 1980s by crossing feral goats with dairy breeds, then selecting for hardiness, parasite resistance, and meat production. The name "Kiko" is Maori for "meat."

Kikos are known for their exceptional hardiness and parasite resistance - they require much less intervention than Boers. They're aggressive foragers that do well on rough pasture and brush. Does are excellent mothers that rarely need assistance kidding.

Kikos grow slightly slower than Boers but require less input, making them more profitable in many situations. They're becoming increasingly popular, especially with farmers who prefer a more hands-off approach.`,
    pros: ['Parasite resistant', 'Hardy - low maintenance', 'Excellent foragers', 'Good mothers', 'Low kidding problems'],
    cons: ['Slower growth than Boers', 'Can be more wild/flighty', 'Less muscular than Boers', 'Harder to find breeding stock'],
    healthNotes: 'Very hardy with excellent parasite resistance. One of the healthiest meat breeds.',
  },
  {
    id: 10,
    name: 'Spanish (Brush Goat)',
    origin: 'Spain via Mexico',
    size: 'Medium',
    primaryUse: 'Meat/Brush clearing',
    weight: { does: '80-130 lbs', bucks: '150-200 lbs' },
    height: '24-30 inches',
    milkProduction: 'Enough for kids',
    butterfat: 'N/A',
    temperament: 'Hardy, independent, excellent foragers',
    colors: 'Any color',
    description: `Spanish goats (also called Brush goats or Scrub goats) descended from goats brought by Spanish explorers and have adapted to harsh conditions over centuries of natural selection in the American Southwest.

They are extremely hardy, parasite-resistant goats that thrive on brush and rough forage. They're often used for vegetation management and brush clearing. Spanish goats are excellent mothers that rarely need assistance and raise their kids with minimal intervention.

While not as fast-growing as Boers, Spanish goats are making a comeback as farmers recognize their hardiness and low-maintenance qualities. Purebred Spanish goats are now considered a heritage breed worth preserving.`,
    pros: ['Extremely hardy', 'Parasite resistant', 'Excellent foragers', 'Low maintenance', 'Great mothers', 'Thrive on poor forage'],
    cons: ['Smaller than Boers', 'Slower growth', 'Can be wild/hard to handle', 'Less meaty carcass'],
    healthNotes: 'One of the hardiest breeds. Excellent parasite resistance. Rarely need intervention.',
  },
  {
    id: 11,
    name: 'Pygmy',
    origin: 'West/Central Africa',
    size: 'Miniature',
    primaryUse: 'Pet/Companion',
    weight: { does: '40-70 lbs', bucks: '60-85 lbs' },
    height: '16-23 inches',
    milkProduction: '1-2 quarts/day (can be milked)',
    butterfat: '5-7%',
    temperament: 'Friendly, playful, social',
    colors: 'Caramel, agouti, black, or grey/brown agouti',
    description: `Pygmy goats are a miniature breed kept primarily as pets and companion animals. They originated in West Africa and were brought to the US in the 1950s for zoos and research. They're now one of the most popular pet goat breeds.

Unlike Nigerian Dwarfs (which are miniature dairy goats), Pygmies have a stockier, cobby build bred for meat in their homeland. However, does can be milked and produce surprisingly rich milk with high butterfat content.

Pygmies are friendly, playful goats that do well with children and make excellent 4-H projects. They're social animals that need companionship and do poorly alone. They're intelligent and can be trained to walk on leashes, do tricks, and more.`,
    pros: ['Great pets', 'Good with children', 'Small size', 'Friendly personalities', 'Hardy', 'Can be milked'],
    cons: ['Prone to obesity', 'Not true dairy animals', 'Can be escape artists', 'Need companionship'],
    healthNotes: 'Prone to obesity - limit grain. Watch for pregnancy toxemia in does. Generally hardy.',
  },
  {
    id: 12,
    name: 'Angora',
    origin: 'Turkey (Ankara region)',
    size: 'Medium',
    primaryUse: 'Fiber (Mohair)',
    weight: { does: '80-100 lbs', bucks: '150-200 lbs' },
    height: '24-30 inches',
    milkProduction: 'Low - enough for kids only',
    butterfat: 'N/A',
    temperament: 'Gentle, calm, quiet',
    colors: 'White (colored Angoras exist but white preferred for dying)',
    description: `Angora goats produce mohair, a lustrous, strong fiber used in high-end textiles. A single goat produces 8-16 pounds of mohair per year, sheared twice annually. Mohair is valued for its luster, durability, and dyeability.

Angoras are gentle, quiet goats with calm temperaments. They're delicate compared to other breeds and require more care - their long fleece makes them vulnerable to rain and cold. They need shelter and cannot tolerate wet conditions.

The fiber industry has made Angoras valuable, but they require more intensive management than other goats. Shearing, proper nutrition for fiber growth, and protection from weather are essential. They're not recommended for beginners or wet climates.`,
    pros: ['Valuable mohair production', 'Gentle temperament', 'Quiet', 'Beautiful fiber', 'Good for handspinners'],
    cons: ['Delicate - need shelter', 'High nutrition needs for fiber', 'Must be sheared', 'Not hardy', 'Prone to parasites'],
    healthNotes: 'Vulnerable to cold/wet - need shelter. High protein needs for fiber growth. Susceptible to parasites.',
  },
  {
    id: 13,
    name: 'Myotonic (Fainting Goat)',
    origin: 'United States (Tennessee)',
    size: 'Small-Medium',
    primaryUse: 'Meat/Pet',
    weight: { does: '60-130 lbs', bucks: '80-175 lbs' },
    height: '17-25 inches',
    milkProduction: 'Low',
    butterfat: 'N/A',
    temperament: 'Calm, docile, easy to contain',
    colors: 'Any color',
    description: `Myotonic goats, also called Tennessee Fainting Goats or Wooden Leg goats, have a genetic condition called myotonia congenita that causes their muscles to stiffen when startled. This makes them fall over or "faint" - though they remain conscious.

Despite this quirk, Myotonics are actually excellent meat goats. Their condition means they have a higher muscle-to-bone ratio and develop more muscle mass. They're also easy to contain since they can't jump fences when startled.

Myotonics are calm, docile goats that are easy to handle. The fainting doesn't hurt them, and many goats learn to brace themselves or lean against something when startled. They make interesting pets and good, easy-to-manage meat goats.`,
    pros: ['Easy to contain (can\'t jump when startled)', 'Good meat qualities', 'Calm temperament', 'Hardy', 'Unique/interesting', 'Good mothers'],
    cons: ['Myotonia can be alarming to watch', 'Not fast-growing', 'Can be hard to find quality stock', 'Controversial ethics'],
    healthNotes: 'Myotonia doesn\'t cause pain. Generally hardy breed. Need predator protection since they can\'t flee.',
  },
  {
    id: 14,
    name: 'Mini Breeds (Mini Nubians, Mini Manchas, etc.)',
    origin: 'United States',
    size: 'Miniature',
    primaryUse: 'Dairy',
    weight: { does: '60-100 lbs', bucks: '80-120 lbs' },
    height: '22-28 inches',
    milkProduction: '1-3 quarts/day',
    butterfat: 'Varies (4-8%)',
    temperament: 'Varies by breed cross',
    colors: 'Varies by breed',
    description: `Mini dairy goats are crosses between Nigerian Dwarf goats and standard dairy breeds (Nubian, LaMancha, Alpine, etc.). They combine the small size of Nigerians with the dairy characteristics and appearance of the standard breed.

Mini Nubians, for example, have the long ears and Roman nose of Nubians but in a smaller package. Mini Manchas have the tiny ears of LaManchas. These crosses are bred back to either parent breed over generations to create consistent "miniature" versions.

Mini dairy breeds are registered through organizations like MDGA (Miniature Dairy Goat Association) or TMGR (The Miniature Goat Registry). They're popular with small-farm owners who want dairy goats but prefer a smaller, easier-to-handle animal.`,
    pros: ['Smaller than standard breeds', 'Good milk production for size', 'Combine traits of both breeds', 'Easier to handle', 'Good for small properties'],
    cons: ['Multi-generational breeding to stabilize', 'Variable traits in early generations', 'Smaller registration pool', 'May not breed true'],
    healthNotes: 'Health depends on parent breeds. Generally hardy. Watch for traits from both parent breeds.',
  },
];

const sizeColors: Record<string, string> = {
  'Miniature': 'bg-purple-100 text-purple-700',
  'Small-Medium': 'bg-blue-100 text-blue-700',
  'Medium': 'bg-green-100 text-green-700',
  'Medium-Large': 'bg-yellow-100 text-yellow-700',
  'Large': 'bg-orange-100 text-orange-700',
};

const useColors: Record<string, string> = {
  'Dairy': 'bg-blue-100 text-blue-700',
  'Dairy/Meat': 'bg-teal-100 text-teal-700',
  'Meat': 'bg-red-100 text-red-700',
  'Meat/Brush clearing': 'bg-amber-100 text-amber-700',
  'Meat/Pet': 'bg-pink-100 text-pink-700',
  'Pet/Companion': 'bg-purple-100 text-purple-700',
  'Fiber (Mohair)': 'bg-indigo-100 text-indigo-700',
};

export default function BreedsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState('All');
  const [useFilter, setUseFilter] = useState('All');
  const [expandedBreed, setExpandedBreed] = useState<number | null>(1);

  const sizes = ['All', 'Miniature', 'Small-Medium', 'Medium', 'Medium-Large', 'Large'];
  const uses = ['All', 'Dairy', 'Meat', 'Pet/Companion', 'Fiber (Mohair)'];

  const filteredBreeds = breeds.filter(breed => {
    const matchesSearch = 
      breed.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      breed.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      breed.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSize = sizeFilter === 'All' || breed.size === sizeFilter;
    const matchesUse = useFilter === 'All' || breed.primaryUse.includes(useFilter.replace('/Companion', ''));
    return matchesSearch && matchesSize && matchesUse;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Goat Breeds Guide</h1>
        <p className="text-gray-500">Learn about 14 popular goat breeds and their characteristics</p>
      </div>

      {/* Search and Filters */}
      <Card padding="sm">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search breeds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Size:</span>
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSizeFilter(size)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    sizeFilter === size
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Use:</span>
              {uses.map((use) => (
                <button
                  key={use}
                  onClick={() => setUseFilter(use)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    useFilter === use
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {use}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Breeds List */}
      <div className="space-y-4">
        {filteredBreeds.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No breeds found matching your search.</p>
          </Card>
        ) : (
          filteredBreeds.map((breed) => (
            <Card key={breed.id} className="overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedBreed(expandedBreed === breed.id ? null : breed.id)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center text-2xl">
                    🐐
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{breed.name}</h3>
                    <p className="text-sm text-gray-500">{breed.origin}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={sizeColors[breed.size] || 'bg-gray-100 text-gray-700'}>
                    {breed.size}
                  </Badge>
                  <Badge className={useColors[breed.primaryUse] || 'bg-gray-100 text-gray-700'}>
                    {breed.primaryUse}
                  </Badge>
                  {expandedBreed === breed.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedBreed === breed.id && (
                <div className="border-t px-4 py-4 bg-gray-50">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Scale className="h-4 w-4" />
                        Weight
                      </div>
                      <p className="text-sm font-medium">Does: {breed.weight.does}</p>
                      <p className="text-sm font-medium">Bucks: {breed.weight.bucks}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Mountain className="h-4 w-4" />
                        Height
                      </div>
                      <p className="text-sm font-medium">{breed.height}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Milk className="h-4 w-4" />
                        Milk Production
                      </div>
                      <p className="text-sm font-medium">{breed.milkProduction}</p>
                      {breed.butterfat !== 'N/A' && (
                        <p className="text-xs text-gray-500">{breed.butterfat} butterfat</p>
                      )}
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Heart className="h-4 w-4" />
                        Temperament
                      </div>
                      <p className="text-sm font-medium">{breed.temperament}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">About This Breed</h4>
                    <div className="text-sm text-gray-600 space-y-3">
                      {breed.description.split('\n\n').map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Colors</h4>
                    <p className="text-sm text-gray-600">{breed.colors}</p>
                  </div>

                  {/* Pros and Cons */}
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2">✓ Pros</h4>
                      <ul className="space-y-1">
                        {breed.pros.map((pro, i) => (
                          <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-800 mb-2">✗ Cons</h4>
                      <ul className="space-y-1">
                        {breed.cons.map((con, i) => (
                          <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Health Notes */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Health Notes</h4>
                    <p className="text-sm text-blue-700">{breed.healthNotes}</p>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
