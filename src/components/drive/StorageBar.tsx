"use client";

import { HardDrive, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/plans';

interface StorageBarProps {
  usedGb: number;
  totalGb: number;
  driveUsedGb?: number;
  galleryUsedGb?: number;
  planName?: string;
  compact?: boolean;
}

export function StorageBar({
  usedGb,
  totalGb,
  driveUsedGb = 0,
  galleryUsedGb = 0,
  planName = 'Starter',
  compact = false,
}: StorageBarProps) {
  const percentage = totalGb > 0 ? Math.min((usedGb / totalGb) * 100, 100) : 0;
  const remaining = Math.max(totalGb - usedGb, 0);

  const getColor = () => {
    if (percentage >= 90) return 'from-red-500 to-red-400';
    if (percentage >= 75) return 'from-amber-500 to-amber-400';
    return 'from-primary to-primary/70';
  };

  const getTextColor = () => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-amber-500';
    return 'text-primary';
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-muted-foreground uppercase tracking-widest">Storage</span>
          <span className={getTextColor()}>
            {usedGb.toFixed(2)} / {totalGb} GB
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn('h-full bg-gradient-to-r transition-all duration-500', getColor())}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {planName} Plan
            </p>
            <p className="text-lg font-headline font-bold text-white">
              Hafash Drive
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn('text-2xl font-headline font-bold', getTextColor())}>
            {percentage.toFixed(1)}%
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Used
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn('h-full bg-gradient-to-r transition-all duration-500', getColor())}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-white/60">
            {usedGb.toFixed(2)} GB used
          </span>
          <span className={getTextColor()}>
            {remaining.toFixed(2)} GB available
          </span>
        </div>
      </div>

      {(driveUsedGb > 0 || galleryUsedGb > 0) && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Drive Files
            </p>
            <p className="text-sm font-bold text-white">
              {driveUsedGb.toFixed(2)} GB
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Galleries
            </p>
            <p className="text-sm font-bold text-white">
              {galleryUsedGb.toFixed(2)} GB
            </p>
          </div>
        </div>
      )}

      {percentage >= 90 && (
        <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <TrendingUp className="w-4 h-4" />
          Storage almost full. Upgrade your plan.
        </div>
      )}
    </div>
  );
}