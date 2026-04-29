import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#097fe8] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.9]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[#005bab]',
        destructive: 'bg-red-600 text-white hover:bg-red-500',
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
        secondary: 'bg-muted text-foreground hover:bg-muted/80',
        ghost: 'text-foreground hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded px-3 text-xs',
        lg: 'h-12 rounded px-8 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={{ transition: 'transform 120ms cubic-bezier(0.23,1,0.32,1), background-color 150ms ease-out, border-color 150ms ease-out, opacity 150ms ease-out', ...props.style }}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
