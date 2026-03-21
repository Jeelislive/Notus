import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
        pending: 'bg-zinc-800/60 text-zinc-500 border border-zinc-800',
        recording: 'bg-red-500/10 text-red-400 border border-red-500/20',
        processing: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
