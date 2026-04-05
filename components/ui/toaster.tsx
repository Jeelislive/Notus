'use client'

import * as RadixToast from '@radix-ui/react-toast'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useToastStore } from '@/hooks/use-toast'

export function Toaster() {
  const { items, dismiss } = useToastStore()

  return (
    <RadixToast.Provider swipeDirection="right">
      {items.map((t) => (
        <RadixToast.Root
          key={t.id}
          open
          onOpenChange={(open) => { if (!open) dismiss(t.id) }}
          className={`
            group pointer-events-auto relative flex items-start gap-3
            w-full max-w-sm rounded-xl border p-4 shadow-lg
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0
            data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-4
            transition-all duration-200
            ${t.variant === 'destructive'
              ? 'bg-red-50 border-red-200 dark:bg-red-950/60 dark:border-red-800'
              : t.variant === 'success'
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800'
              : 'bg-background border-border'}
          `}
        >
          <div className="shrink-0 mt-0.5">
            {t.variant === 'destructive' ? (
              <AlertCircle className="size-4 text-red-500" />
            ) : t.variant === 'success' ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : (
              <Info className="size-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <RadixToast.Title
              className={`text-[13px] font-semibold leading-snug ${
                t.variant === 'destructive'
                  ? 'text-red-700 dark:text-red-300'
                  : t.variant === 'success'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-foreground'
              }`}
            >
              {t.title}
            </RadixToast.Title>
            {t.description && (
              <RadixToast.Description className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                {t.description}
              </RadixToast.Description>
            )}
          </div>

          <RadixToast.Close
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded-md p-0.5 text-muted-foreground/60 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="size-3.5" />
          </RadixToast.Close>
        </RadixToast.Root>
      ))}

      <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm outline-none" />
    </RadixToast.Provider>
  )
}
