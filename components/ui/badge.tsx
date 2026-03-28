import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold leading-none',
  {
    variants: {
      variant: {
        default:     'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
        pending:     'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
        recording:   'bg-red-500 text-white',
        processing:  'bg-amber-500 text-white',
        completed:   'bg-emerald-500 text-white',
        failed:      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
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
