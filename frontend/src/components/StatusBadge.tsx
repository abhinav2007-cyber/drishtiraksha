import {
  InvestigationState,
  ModuleStatusEnum,
  ClaimVerdict,
} from '@/lib/types';

interface BadgeProps {
  status: InvestigationState | ModuleStatusEnum | ClaimVerdict | string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: BadgeProps) {
  let colorStyles = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';

  switch (status) {
    // Investigation States
    case 'COMPLETED':
      colorStyles = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      dotColor = 'bg-emerald-400';
      break;
    case 'PROCESSING':
    case 'RUNNING':
      colorStyles = 'bg-sky-950/80 text-sky-300 border-sky-800 animate-pulse';
      dotColor = 'bg-sky-400';
      break;
    case 'PARTIAL':
      colorStyles = 'bg-amber-950/80 text-amber-300 border-amber-800';
      dotColor = 'bg-amber-400';
      break;
    case 'QUEUED':
    case 'PENDING':
      colorStyles = 'bg-indigo-950/80 text-indigo-300 border-indigo-800';
      dotColor = 'bg-indigo-400';
      break;
    case 'FAILED':
      colorStyles = 'bg-rose-950/80 text-rose-300 border-rose-800';
      dotColor = 'bg-rose-400';
      break;
    case 'UNAVAILABLE':
      colorStyles = 'bg-zinc-800 text-zinc-400 border-zinc-700';
      dotColor = 'bg-zinc-500';
      break;
    case 'NOT_APPLICABLE':
      colorStyles = 'bg-slate-900 text-slate-500 border-slate-800 border-dashed';
      dotColor = 'bg-slate-600';
      break;

    // Claim Verdicts
    case 'VERIFIED':
      colorStyles = 'bg-teal-950/80 text-teal-300 border-teal-800 font-semibold';
      dotColor = 'bg-teal-400';
      break;
    case 'CONTRADICTED':
      colorStyles = 'bg-rose-950/90 text-rose-300 border-rose-800 font-semibold';
      dotColor = 'bg-rose-400';
      break;
    case 'MISLEADING':
      colorStyles = 'bg-amber-950/80 text-amber-300 border-amber-800 font-semibold';
      dotColor = 'bg-amber-400';
      break;
    case 'UNVERIFIED':
      colorStyles = 'bg-purple-950/70 text-purple-300 border-purple-800';
      dotColor = 'bg-purple-400';
      break;
  }

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs sm:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${colorStyles} ${sizeStyles} tracking-wide font-medium select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
}
