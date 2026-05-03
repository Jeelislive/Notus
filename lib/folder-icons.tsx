import {
  Users, Sun, ClipboardList, Phone, UsersRound,
  Target, CheckCircle, Folder, Briefcase, Star,
  Zap, Lightbulb, Rocket, Mic, Handshake, TrendingUp,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  folder: Folder,
  users: Users,
  phone: Phone,
  clipboard: ClipboardList,
  target: Target,
  briefcase: Briefcase,
  check: CheckCircle,
  sun: Sun,
  star: Star,
  zap: Zap,
  lightbulb: Lightbulb,
  rocket: Rocket,
  usersround: UsersRound,
  mic: Mic,
  handshake: Handshake,
  trending: TrendingUp,
}

// Backwards-compat for folders created before icon IDs (stored as emojis)
const EMOJI_FALLBACK: Record<string, LucideIcon> = {
  '📁': Folder, '📂': Folder, '🗂️': Folder,
  '📋': ClipboardList, '📌': Target, '🎯': Target,
  '💼': Briefcase, '🏢': Briefcase,
  '⭐': Star, '🔥': Zap, '💡': Lightbulb, '🚀': Rocket,
  '👥': UsersRound, '👤': Users,
  '📞': Phone, '✅': CheckCircle, '☀️': Sun,
  '🎤': Mic, '🤝': Handshake, '📈': TrendingUp,
}

export function getFolderIcon(iconId: string | null | undefined): LucideIcon {
  if (!iconId) return Folder
  return ICON_MAP[iconId] ?? EMOJI_FALLBACK[iconId] ?? Folder
}
