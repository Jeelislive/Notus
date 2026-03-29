'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, Settings, LogOut, Users, FileText, Search, Puzzle, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth-client'
import { ThemeSwitcher } from '@/components/theme-switcher'

const EXPANDED_W = 256
const COLLAPSED_W = 56

// Drawer curve (iOS-like punch) for opening; strong ease-out for closing
const DRAWER  = 'cubic-bezier(0.32, 0.72, 0, 1)'
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
const EXPAND_MS  = 320
const COLLAPSE_MS = 180

interface SidebarNavProps {
  user: { email: string; name: string }
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [hovered, setHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Set initial CSS variable to match the already-correct isMobile state
    document.documentElement.style.setProperty('--sidebar-width', isMobile ? '0px' : `${COLLAPSED_W}px`)

    function updateLayout() {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      document.documentElement.style.setProperty('--sidebar-width', mobile ? '0px' : `${COLLAPSED_W}px`)
      if (!mobile) setMobileOpen(false)
    }
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        router.push('/dashboard/search')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  function handleMouseEnter() {
    if (isMobile) return
    hoverTimer.current = setTimeout(() => {
      setHovered(true)
      document.documentElement.style.setProperty('--sidebar-width', `${EXPANDED_W}px`)
    }, 150)
  }

  function handleMouseLeave() {
    if (isMobile) return
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setHovered(false)
    document.documentElement.style.setProperty('--sidebar-width', `${COLLAPSED_W}px`)
  }

  async function handleSignOut() {
    await signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })
  }

  const navItems = [
    { href: '/dashboard',                  label: 'Meetings',     icon: LayoutDashboard },
    { href: '/dashboard/notes',            label: 'Notes',        icon: FileText },
    { href: '/dashboard/search',           label: 'Search',       icon: Search },
    { href: '/dashboard/teams',            label: 'Teams',        icon: Users },
    { href: '/dashboard/integrations',     label: 'Integrations', icon: Puzzle },
    { href: '/dashboard/settings',         label: 'Settings',     icon: Settings },
  ]

  // On mobile the drawer is always "expanded" (full width); collapse only applies on desktop
  const isCollapsed = isMobile ? false : !hovered

  const t = (props: string, delay = 0) =>
    isCollapsed
      ? `${props.split(',').map(p => `${p.trim()} ${COLLAPSE_MS}ms ${EASE_OUT}`).join(', ')}`
      : `${props.split(',').map(p => `${p.trim()} ${EXPAND_MS}ms ${DRAWER}${delay ? ` ${delay}ms` : ''}`).join(', ')}`

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        width: `${EXPANDED_W}px`,
        transform: mobileOpen ? 'translateX(0)' : `translateX(-${EXPANDED_W}px)`,
        boxShadow: mobileOpen ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
        transition: `transform ${mobileOpen ? EXPAND_MS : COLLAPSE_MS}ms ${mobileOpen ? DRAWER : EASE_OUT}, box-shadow 200ms ease`,
      }
    : {
        width: isCollapsed ? `${COLLAPSED_W}px` : `${EXPANDED_W}px`,
        boxShadow: isCollapsed ? 'none' : '4px 0 24px rgba(0,0,0,0.09)',
        transition: isCollapsed
          ? `width ${COLLAPSE_MS}ms ${EASE_OUT}, box-shadow ${COLLAPSE_MS}ms ${EASE_OUT}`
          : `width ${EXPAND_MS}ms ${DRAWER}, box-shadow ${EXPAND_MS}ms ${DRAWER}`,
      }

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-background border border-border shadow-sm"
          aria-label="Open menu"
        >
          <Menu className="size-[18px]" />
        </button>
      )}

      {/* Mobile backdrop */}
      {isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          style={{
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? 'auto' : 'none',
            transition: 'opacity 200ms ease',
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className="fixed left-0 top-0 h-full bg-background flex flex-col z-50 overflow-hidden"
        style={sidebarStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* ── Logo ── */}
        <div
          className="flex items-center shrink-0"
          style={{
            padding: isCollapsed ? '18px 10px' : '18px 20px',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            transition: t('padding'),
          }}
        >
          <div className="flex items-center" style={{ gap: isCollapsed ? 0 : '12px' }}>
            <div className="size-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#6366f1' }}>
              <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0"    y="5"   width="2.5" height="4"  rx="1.25" fill="white" fillOpacity="0.5"/>
                <rect x="3.5"  y="2"   width="2.5" height="10" rx="1.25" fill="white"/>
                <rect x="7"    y="3.5" width="2.5" height="7"  rx="1.25" fill="white" fillOpacity="0.75"/>
                <rect x="10.5" y="0"   width="2.5" height="14" rx="1.25" fill="white"/>
                <rect x="14"   y="4.5" width="2.5" height="5"  rx="1.25" fill="white" fillOpacity="0.5"/>
              </svg>
            </div>
            {/* Text slides in — overflow-hidden is on the text wrapper only, not the icon */}
            <div style={{ overflow: 'hidden', width: isCollapsed ? 0 : 'auto', transition: t('width') }}>
              <span
                className="font-bold text-foreground text-[17px] tracking-tight whitespace-nowrap block"
                style={{
                  opacity:   isCollapsed ? 0 : 1,
                  transform: isCollapsed ? 'translateX(-6px)' : 'translateX(0)',
                  transition: t('opacity, transform'),
                }}
              >
                Notus
              </span>
            </div>
          </div>
          <div
            style={{
              opacity:      isCollapsed ? 0 : 1,
              width:        isCollapsed ? 0 : 'auto',
              overflow:     'hidden',
              pointerEvents: isCollapsed ? 'none' : 'auto',
              transition:   t('opacity, width'),
            }}
          >
            {isMobile ? (
              <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Close menu"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <ThemeSwitcher />
            )}
          </div>
        </div>

        {/* ── Nav items — labels stagger in on expand, all exit together ── */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map((item, index) => {
            const Icon   = item.icon
            const active = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
            const stagger = isCollapsed ? 0 : index * 25

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                onClick={() => isMobile && setMobileOpen(false)}
                className={cn(
                  'flex items-center rounded-xl text-[15px] active:scale-[0.97] overflow-hidden',
                  isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-primary/10 text-indigo-500 dark:text-indigo-400 font-semibold'
                    : 'text-muted-foreground font-medium hover:text-foreground hover:bg-muted/50'
                )}
                style={{
                  transition: `transform 100ms ${EASE_OUT}, background-color 150ms ease, color 150ms ease`,
                }}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span
                  className="whitespace-nowrap"
                  style={{
                    opacity:   isCollapsed ? 0 : 1,
                    transform: isCollapsed ? 'translateX(-6px)' : 'translateX(0)',
                    maxWidth:  isCollapsed ? 0 : 200,
                    overflow:  'hidden',
                    transition: isCollapsed
                      ? `opacity ${COLLAPSE_MS}ms ${EASE_OUT}, transform ${COLLAPSE_MS}ms ${EASE_OUT}, max-width ${COLLAPSE_MS}ms ${EASE_OUT}`
                      : `opacity ${EXPAND_MS}ms ${DRAWER} ${stagger}ms, transform ${EXPAND_MS}ms ${DRAWER} ${stagger}ms, max-width ${EXPAND_MS}ms ${DRAWER} ${stagger}ms`,
                  }}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* ── Search bar — slides down + fades in after nav items ── */}
        <div
          className="px-4 pb-3"
          style={{
            opacity:       isCollapsed ? 0 : 1,
            transform:     isCollapsed ? 'translateY(-4px)' : 'translateY(0)',
            maxHeight:     isCollapsed ? 0 : 60,
            overflow:      'hidden',
            pointerEvents: isCollapsed ? 'none' : 'auto',
            transition: isCollapsed
              ? `opacity ${COLLAPSE_MS}ms ${EASE_OUT}, transform ${COLLAPSE_MS}ms ${EASE_OUT}, max-height ${COLLAPSE_MS}ms ${EASE_OUT}`
              : `opacity ${EXPAND_MS}ms ${DRAWER} ${navItems.length * 25}ms, transform ${EXPAND_MS}ms ${DRAWER} ${navItems.length * 25}ms, max-height ${EXPAND_MS}ms ${DRAWER}`,
          }}
        >
          <button
            onClick={() => { router.push('/dashboard/search'); if (isMobile) setMobileOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.97]"
            style={{ transition: `transform 100ms ${EASE_OUT}, background-color 120ms ease, color 120ms ease` }}
          >
            <Search className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="inline-flex items-center font-mono text-[11px] text-muted-foreground/60 bg-muted/60 px-1.5 py-0.5 rounded-md">⌘K</kbd>
          </button>
        </div>

        {/* ── User section ── */}
        <div className="px-2 py-3">
          <div
            className={cn(
              'flex items-center rounded-xl hover:bg-muted/50 group cursor-default',
              isCollapsed ? 'justify-center px-1 py-2' : 'gap-3 px-3 py-2.5'
            )}
            style={{ transition: 'background-color 120ms ease' }}
          >
            <div
              className="size-8 rounded-full bg-primary/15 border border-indigo-500/20 flex items-center justify-center shrink-0"
              title={isCollapsed ? (user.name || user.email) : undefined}
            >
              <span className="text-[13px] font-bold text-indigo-500 dark:text-indigo-400">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
            </div>

            <div
              className="flex-1 min-w-0 overflow-hidden"
              style={{
                opacity:   isCollapsed ? 0 : 1,
                transform: isCollapsed ? 'translateX(-6px)' : 'translateX(0)',
                maxWidth:  isCollapsed ? 0 : 200,
                transition: isCollapsed
                  ? `opacity ${COLLAPSE_MS}ms ${EASE_OUT}, transform ${COLLAPSE_MS}ms ${EASE_OUT}, max-width ${COLLAPSE_MS}ms ${EASE_OUT}`
                  : `opacity ${EXPAND_MS}ms ${DRAWER} ${(navItems.length + 1) * 25}ms, transform ${EXPAND_MS}ms ${DRAWER} ${(navItems.length + 1) * 25}ms, max-width ${EXPAND_MS}ms ${DRAWER} ${(navItems.length + 1) * 25}ms`,
              }}
            >
              <p className="text-[14px] font-semibold text-foreground truncate leading-snug">{user.name || 'Account'}</p>
              <p className="text-[12px] text-muted-foreground/70 truncate leading-snug">{user.email}</p>
            </div>

            <button
              onClick={handleSignOut}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.85] opacity-0 group-hover:opacity-100"
              style={{ transition: `transform 100ms ${EASE_OUT}, opacity 150ms ease, background-color 120ms ease` }}
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
