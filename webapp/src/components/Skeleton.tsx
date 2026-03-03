'use client';

import clsx from 'clsx';

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'rounded skeleton-shimmer',
        className,
      )}
    />
  );
}

/** Skeleton that matches a project card in the dashboard grid */
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between">
        <Pulse className="h-5 w-40" />
        <Pulse className="h-5 w-16 rounded-full" />
      </div>
      <Pulse className="h-4 w-28" />
      <div className="flex gap-3">
        <Pulse className="h-3 w-20" />
        <Pulse className="h-3 w-24" />
        <Pulse className="h-3 w-16" />
      </div>
      <Pulse className="h-3 w-28" />
      <div className="border-t border-slate-100 pt-2 flex justify-end">
        <Pulse className="h-4 w-4" />
      </div>
    </div>
  );
}

/** Skeleton that matches KPI cards row */
export function SkeletonKPI() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Pulse className="h-5 w-5 rounded" />
        <Pulse className="h-4 w-24" />
      </div>
      <Pulse className="h-8 w-32" />
      <Pulse className="h-3 w-20" />
    </div>
  );
}

/** Generic page skeleton with header-like area */
export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-7 w-48" />
          <Pulse className="h-4 w-28" />
        </div>
        <Pulse className="h-10 w-36 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>
      <Pulse className="h-64 w-full rounded-xl" />
    </div>
  );
}
