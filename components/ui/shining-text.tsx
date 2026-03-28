'use client'

import { motion } from 'motion/react'

export function ShiningText({ text, className }: { text: string; className?: string }) {
  return (
    <motion.span
      className={`bg-[linear-gradient(110deg,#6b7280,35%,#f9fafb,50%,#6b7280,75%,#6b7280)] dark:bg-[linear-gradient(110deg,#6b7280,35%,#fff,50%,#6b7280,75%,#6b7280)] bg-[length:200%_100%] bg-clip-text text-transparent font-medium ${className ?? ''}`}
      initial={{ backgroundPosition: '200% 0' }}
      animate={{ backgroundPosition: '-200% 0' }}
      transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
    >
      {text}
    </motion.span>
  )
}
