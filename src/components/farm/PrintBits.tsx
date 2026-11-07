'use client';

import Link from 'next/link';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

/** Screen-only toolbar above a printable sheet. */
export function PrintToolbar({ back, children }: { back: string; children?: React.ReactNode }) {
  return (
    <div className="no-print sticky top-0 z-10 bg-[#FAFAF9] border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
      <Link href={back} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <div className="flex flex-wrap items-center gap-2 flex-1">{children}</div>
      <Button leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
    </div>
  );
}

export function Box({ checked = false }: { checked?: boolean }) {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 border-2 border-black rounded-sm align-middle text-[11px] leading-none font-bold" aria-hidden>
      {checked ? '✓' : ''}
    </span>
  );
}

export function SheetHeader({ farm, title, subtitle }: { farm?: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between border-b-2 border-black pb-2 mb-4">
      <div>
        <p className="text-xs uppercase tracking-wider">{farm ?? 'GoatWise'}</p>
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm">{subtitle}</p>}
      </div>
      <p className="text-xs text-right">Printed {new Date().toLocaleDateString()}</p>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold uppercase tracking-wide mt-5 mb-1.5 border-b border-black">{children}</h2>;
}
