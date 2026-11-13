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
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-300';
  let dotColor = 'bg-slate-400';

  switch (status) {
    // Investigation States
    case 'COMPLETED':
      colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      dotColor = 'bg-emerald-600';
      break;
    case 'PROCESSING':
    case 'RUNNING':
      colorStyles = 'bg-sky-50 text-sky-800 border-sky-300 animate-pulse';
      dotColor = 'bg-sky-600';
      break;
    case 'PARTIAL':
      colorStyles = 'bg-amber-50 text-amber-800 border-amber-300';
      dotColor = 'bg-amber-600';
      break;
    case 'QUEUED':
    case 'PENDING':
      colorStyles = 'bg-indigo-50 text-indigo-800 border-indigo-300';
      dotColor = 'bg-indigo-500';
      break;
    case 'FAILED':
      colorStyles = 'bg-rose-50 text-rose-800 border-rose-300';
      dotColor = 'bg-rose-600';
      break;
    case 'UNAVAILABLE':
      colorStyles = 'bg-slate-100 text-slate-500 border-slate-300';
      dotColor = 'bg-slate-400';
      break;
    case 'NOT_APPLICABLE':
      colorStyles = 'bg-slate-50 text-slate-400 border-slate-200 border-dashed';
      dotColor = 'bg-slate-300';
      break;

    // Claim Verdicts
    case 'VERIFIED':
      colorStyles = 'bg-teal-50 text-teal-800 border-teal-300 font-semibold';
      dotColor = 'bg-teal-600';
      break;
    case 'CONTRADICTED':
      colorStyles = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
      dotColor = 'bg-rose-600';
      break;
    case 'MISLEADING':
      colorStyles = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      dotColor = 'bg-amber-600';
      break;
    case 'UNVERIFIED':
      colorStyles = 'bg-purple-50 text-purple-800 border-purple-300';
      dotColor = 'bg-purple-600';
      break;
  }

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs sm:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${colorStyles} ${sizeStyles} font-medium select-none shadow-xs`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
}
