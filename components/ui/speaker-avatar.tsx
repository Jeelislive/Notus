'use client'

import Avatar from 'boring-avatars'

interface SpeakerAvatarProps {
  name: string
  size?: number
}

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#0ea5e9', '#ec4899', '#f59e0b']

export function SpeakerAvatar({ name, size = 28 }: SpeakerAvatarProps) {
  return (
    <Avatar
      size={size}
      name={name}
      variant="beam"
      colors={AVATAR_COLORS}
    />
  )
}
