import { useState, useEffect } from 'react'

export type ToastVariant = 'default' | 'success' | 'destructive'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

type Listener = (toasts: ToastItem[]) => void

let toasts: ToastItem[] = []
const listeners: Set<Listener> = new Set()

function notify() {
  listeners.forEach((l) => l([...toasts]))
}

export function toast(title: string, opts?: { description?: string; variant?: ToastVariant }) {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { id, title, description: opts?.description, variant: opts?.variant ?? 'default' }]
  notify()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  }, 4000)
}

export function useToastStore() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    listeners.add(setItems)
    return () => { listeners.delete(setItems) }
  }, [])

  function dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  }

  return { items, dismiss }
}
