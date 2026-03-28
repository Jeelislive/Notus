'use client'

import { useEffect, useState, useRef } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number // ms per character
  className?: string
}

export function TypewriterText({ text, speed = 12, className }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('')
  const prevTextRef = useRef('')

  useEffect(() => {
    // If new text starts with what we've already shown, just extend — don't restart
    const prev = prevTextRef.current
    if (text.startsWith(prev)) {
      // Animate only the new suffix
      const suffix = text.slice(prev.length)
      if (!suffix) return
      let i = 0
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, prev.length + i))
        prevTextRef.current = text.slice(0, prev.length + i)
        if (i >= suffix.length) clearInterval(interval)
      }, speed)
      return () => clearInterval(interval)
    } else {
      // Text changed completely — restart
      prevTextRef.current = ''
      setDisplayed('')
      let i = 0
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        prevTextRef.current = text.slice(0, i)
        if (i >= text.length) clearInterval(interval)
      }, speed)
      return () => clearInterval(interval)
    }
  }, [text, speed])

  return <span className={className}>{displayed}</span>
}
