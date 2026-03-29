/**
 * Structured logger for Vercel Function Logs.
 * All output goes to stdout/stderr — visible in Vercel → Project → Logs tab.
 *
 * Usage:
 *   import { log } from '@/lib/logger'
 *   const logger = log('jira')
 *   logger.info('Creating issues', { projectKey, count: issues.length })
 *   logger.error('Failed', { status: 400, body })
 */

type Level = 'info' | 'warn' | 'error'

function emit(level: Level, context: string, message: string, data?: Record<string, unknown>) {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    ctx: context,
    msg: message,
    ...data,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export function log(context: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => emit('info', context, message, data),
    warn: (message: string, data?: Record<string, unknown>) => emit('warn', context, message, data),
    error: (message: string, data?: Record<string, unknown>) => emit('error', context, message, data),
  }
}
