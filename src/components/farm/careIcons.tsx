import { Wheat, Droplets, StickyNote } from 'lucide-react';
import type { CareKind } from '@/lib/chores';

export const KIND_ICON: Record<CareKind, JSX.Element> = {
  feeding: <Wheat className="h-4 w-4 text-[#8A5A1E]" />,
  watering: <Droplets className="h-4 w-4 text-[#1D5E8C]" />,
  instruction: <StickyNote className="h-4 w-4 text-[#5E1840]" />,
};
