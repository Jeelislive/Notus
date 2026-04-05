'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Crown, Shield, User, MoreHorizontal, UserPlus, Loader2, Trash2, LogOut } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { inviteMember, removeMember, changeMemberRole, leaveTeam, deleteTeam, renameTeam } from '@/app/actions/teams'
import { toast } from '@/hooks/use-toast'

interface Member {
  id: string
  userId: string
  role: 'admin' | 'member'
  joinedAt: Date
  name: string | null
  email: string | null
  avatarUrl: string | null
}

interface Team {
  id: string
  name: string
  slug: string
  ownerId: string
  role: 'admin' | 'member'
}

interface TeamDetailClientProps {
  team: Team
  members: Member[]
  currentUserId: string
}

export function TeamDetailClient({ team, members, currentUserId }: TeamDetailClientProps) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(team.name)
  const [renaming, setRenaming] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)

  const isOwner = team.ownerId === currentUserId
  const isAdmin = team.role === 'admin'

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviteError(null)
    setInviting(true)
    try {
      const res = await inviteMember(team.id, inviteEmail)
      if (res?.error) { setInviteError(res.error); return }
      toast('Member invited', { variant: 'success' })
      setInviteOpen(false)
      setInviteEmail('')
      router.refresh()
    } catch {
      setInviteError('Something went wrong')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(userId: string) {
    setRemoving(userId)
    try {
      await removeMember(team.id, userId)
      toast('Member removed', { variant: 'success' })
      router.refresh()
    } finally {
      setRemoving(null)
    }
  }

  async function handleChangeRole(userId: string, role: 'admin' | 'member') {
    setChangingRole(userId)
    try {
      await changeMemberRole(team.id, userId, role)
      toast('Role changed', { variant: 'success' })
      router.refresh()
    } finally {
      setChangingRole(null)
    }
  }

  async function handleRename() {
    setRenaming(true)
    try {
      await renameTeam(team.id, renameValue)
      toast('Team renamed', { variant: 'success' })
      setRenameOpen(false)
      router.refresh()
    } finally {
      setRenaming(false)
    }
  }

  async function handleLeave() {
    if (!confirm('Leave this team?')) return
    await leaveTeam(team.id)
    toast('Left team', { variant: 'success' })
  }

  async function handleDelete() {
    setDeleteOpen(false)
    await deleteTeam(team.id)
    toast('Team deleted', { variant: 'success' })
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back nav */}
      <Link
        href="/dashboard/teams"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-6"
        style={{ transition: 'color 150ms ease-out' }}
      >
        <ArrowLeft className="size-3.5" />
        All teams
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center shrink-0">
            <span className="text-[22px] font-bold text-indigo-500 dark:text-indigo-400 leading-none">
              {team.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">{team.name}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInviteOpen(true)}
              className="gap-1.5 active:scale-[0.97]"
              style={{ transition: 'transform 150ms ease-out' }}
            >
              <UserPlus className="size-3.5" />
              Invite
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                    Rename team
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {!isOwner && (
                <DropdownMenuItem onClick={handleLeave} className="text-amber-600 dark:text-amber-400 focus:text-amber-600">
                  <LogOut className="size-3.5" />
                  Leave team
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem destructive onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-3.5" />
                  Delete team
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Members */}
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Members</p>
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {members.map((member) => {
            const displayName = member.name || member.email || 'Unknown'
            const initial = displayName.charAt(0).toUpperCase()
            const isMe = member.userId === currentUserId
            const isMemberOwner = member.userId === team.ownerId

            return (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3 bg-card">
                {/* Avatar */}
                <div className="size-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-semibold text-muted-foreground">{initial}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[14px] font-medium text-foreground truncate">
                      {displayName}
                      {isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
                    </p>
                    {isMemberOwner && <Crown className="size-3 text-amber-500 shrink-0" />}
                  </div>
                  <p className="text-[12px] text-muted-foreground truncate">{member.email}</p>
                </div>

                {/* Role badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    member.role === 'admin'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {member.role === 'admin' ? <Shield className="size-2.5" /> : <User className="size-2.5" />}
                    {member.role === 'admin' ? 'Admin' : 'Member'}
                  </span>

                  {/* Actions: only admin can manage others, can't touch owner */}
                  {isAdmin && !isMemberOwner && !isMe && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                          style={{ transition: 'color 120ms ease-out, background-color 120ms ease-out' }}
                          disabled={removing === member.userId || changingRole === member.userId}
                        >
                          {(removing === member.userId || changingRole === member.userId)
                            ? <Loader2 className="size-3.5 animate-spin" />
                            : <MoreHorizontal className="size-3.5" />
                          }
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.role === 'member' ? (
                          <DropdownMenuItem onClick={() => handleChangeRole(member.userId, 'admin')}>
                            <Shield className="size-3.5" />
                            Make admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleChangeRole(member.userId, 'member')}>
                            <User className="size-3.5" />
                            Make member
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onClick={() => handleRemove(member.userId)}>
                          <Trash2 className="size-3.5" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground">Email address</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                placeholder="colleague@company.com"
                autoFocus
                disabled={inviting}
              />
              {inviteError && <p className="text-[12px] text-red-500">{inviteError}</p>}
              <p className="text-[11px] text-muted-foreground">They must already have a Notus account.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={inviting}>Cancel</Button>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gap-1.5">
                {inviting ? <><Loader2 className="size-3.5 animate-spin" />Inviting…</> : 'Send invite'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
              disabled={renaming}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenameOpen(false)} disabled={renaming}>Cancel</Button>
              <Button onClick={handleRename} disabled={renaming || !renameValue.trim()}>
                {renaming ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete team</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{team.name}</strong>? This cannot be undone. All team meetings will remain with their individual owners.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete team</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
