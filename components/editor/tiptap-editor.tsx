'use client'

import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, Loader2, ChevronDown, Undo2, Redo2 } from 'lucide-react'

// ── Custom FontSize extension ──────────────────────────────────────────────
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => {
            // Read from computed style (works for both inline style and class-based)
            const fromStyle = el.style.fontSize
            if (fromStyle) return fromStyle
            // Fallback: parse from style attribute string
            const raw = el.getAttribute('style') ?? ''
            const match = raw.match(/font-size:\s*([^;]+)/)
            return match ? match[1].trim() : null
          },
          renderHTML: (attrs) => {
            if (!attrs.fontSize) return {}
            return { style: `font-size: ${attrs.fontSize}` }
          },
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: { chain: () => ReturnType<ReturnType<typeof useEditor>['chain']> }) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: { chain: () => ReturnType<ReturnType<typeof useEditor>['chain']> }) =>
        chain().setMark('textStyle', { fontSize: null }).run(),
    } as Record<string, unknown>
  },
})

// ── Types ──────────────────────────────────────────────────────────────────
interface TiptapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
}

interface SelectionBubble {
  text: string
  from: number
  to: number
  x: number
  y: number
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px']
const COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Gray', value: '#71717a' },
]

// ── Component ──────────────────────────────────────────────────────────────
export function TiptapEditor({ content, onChange, placeholder, editable = true }: TiptapEditorProps) {
  const isUpdatingFromProp = useRef(false)
  const [bubble, setBubble] = useState<SelectionBubble | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  const [askPrompt, setAskPrompt] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const askOpenRef = useRef(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [colorOpen, setColorOpen] = useState(false)
  const [sizeOpen, setSizeOpen] = useState(false)

  useEffect(() => { askOpenRef.current = askOpen }, [askOpen])

  // Close bubble on outside click
  useEffect(() => {
    if (!bubble) return
    function handleMouseDown(e: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setBubble(null); setAskOpen(false); setAskPrompt('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [bubble])

  async function handleAsk(editorInstance: ReturnType<typeof useEditor>) {
    if (!bubble || !askPrompt.trim() || !editorInstance) return
    setAskLoading(true)
    try {
      const res = await fetch('/api/ai/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedText: bubble.text, prompt: askPrompt }),
      })
      const json = await res.json()
      if (json.result) {
        editorInstance.chain().focus().insertContentAt({ from: bubble.from, to: bubble.to }, json.result).run()
      }
      setBubble(null); setAskOpen(false); setAskPrompt('')
    } catch { /* ignore */ } finally {
      setAskLoading(false)
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Start writing your notes…',
        emptyEditorClass: 'is-editor-empty',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      TextStyle,
      Color,
      FontSize,
    ],
    content,
    editable,
    onUpdate({ editor }) {
      if (!isUpdatingFromProp.current) onChange(editor.getHTML())
    },
    onSelectionUpdate({ editor }) {
      const { from, to } = editor.state.selection
      if (from === to) {
        if (!askOpenRef.current) setBubble(null)
        return
      }
      const text = editor.state.doc.textBetween(from, to, ' ')
      if (!text.trim()) { if (!askOpenRef.current) setBubble(null); return }
      try {
        const domSel = window.getSelection()
        if (!domSel?.rangeCount) return
        const rect = domSel.getRangeAt(0).getBoundingClientRect()
        if (!rect.width && !rect.height) return
        setBubble({ text, from, to, x: rect.left + rect.width / 2, y: rect.top })
        if (!askOpenRef.current) setAskOpen(false)
      } catch { /* ignore */ }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content focus:outline-none min-h-full text-foreground leading-relaxed',
        style: 'font-size: 15px',
      },
    },
    immediatelyRender: false,
  })

  // Sync external content changes
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== content) {
      isUpdatingFromProp.current = true
      editor.commands.setContent(content, { emitUpdate: false })
      isUpdatingFromProp.current = false
    }
  }, [content, editor])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editable, editor])

  // Current font size in selection
  const currentSize = editor?.getAttributes('textStyle').fontSize ?? '15px'

  return (
    <div className="tiptap-wrapper h-full flex flex-col">
      {editor && editable && (
        <div className="flex items-center gap-1.5 px-5 py-4 border-b border-border flex-wrap shrink-0 bg-muted/30">

          {/* Undo / Redo */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo (⌘Z)" disabled={!editor.can().undo()}>
            <Undo2 className="size-[18px]" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo (⌘⇧Z)" disabled={!editor.can().redo()}>
            <Redo2 className="size-[18px]" />
          </ToolbarButton>

          <Divider />

          {/* Text format */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <strong className="text-[18px]">B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <em className="text-[18px]">I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <s className="text-[18px]">S</s>
          </ToolbarButton>

          <Divider />

          {/* Headings */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">H1</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">H3</ToolbarButton>

          <Divider />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            <span className="text-base leading-none">•―</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">1.</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Task List">
            <span className="text-base leading-none">☐</span>
          </ToolbarButton>

          <Divider />

          {/* Quote + Code */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
            <span className="text-base leading-none">&quot;</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">
            {'</>'}
          </ToolbarButton>

          <Divider />

          {/* Font size picker */}
          <div className="relative">
            <button
              type="button"
              title="Font size"
              onClick={() => { setSizeOpen((v) => !v); setColorOpen(false) }}
              className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl text-[15px] font-semibold text-foreground/60 hover:text-foreground hover:bg-muted active:scale-[0.93]"
              style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out, color 120ms ease-out', fontFamily: 'ui-monospace, monospace' }}
            >
              {currentSize.replace('px', '')}
              <ChevronDown className="size-3" />
            </button>
            {sizeOpen && (
              <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-xl shadow-lg py-1 z-50 animate-dropdown min-w-[72px]">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      editor.chain().focus().setMark('textStyle', { fontSize: size }).run()
                      setSizeOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-muted/60 ${currentSize === size ? 'text-indigo-500 font-semibold' : 'text-foreground/70'}`}
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    {size.replace('px', '')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Color picker */}
          <div className="relative">
            <button
              type="button"
              title="Text color"
              onClick={() => { setColorOpen((v) => !v); setSizeOpen(false) }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[16px] font-semibold text-foreground/60 hover:text-foreground hover:bg-muted active:scale-[0.93]"
              style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out, color 120ms ease-out' }}
            >
              <span className="font-bold text-[15px]" style={{ color: editor.getAttributes('textStyle').color || 'currentColor' }}>A</span>
              <div
                className="w-3 h-1 rounded-full"
                style={{ background: editor.getAttributes('textStyle').color || 'currentColor' }}
              />
              <ChevronDown className="size-3" />
            </button>
            {colorOpen && (
              <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-xl shadow-lg p-2 z-50 animate-dropdown grid grid-cols-5 gap-1.5 w-[136px]">
                {COLORS.map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    title={label}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      if (!value) {
                        editor.chain().focus().unsetColor().run()
                      } else {
                        editor.chain().focus().setColor(value).run()
                      }
                      setColorOpen(false)
                    }}
                    className="size-6 rounded-lg border border-border/60 hover:scale-110 active:scale-95 flex items-center justify-center"
                    style={{
                      background: value || 'var(--foreground)',
                      transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      <div className="p-5 overflow-y-auto flex-1 min-h-0" onClick={() => { setColorOpen(false); setSizeOpen(false) }}>
        <EditorContent editor={editor} />
      </div>

      {/* Floating selection AI bubble */}
      {bubble && editable && (
        <div
          ref={bubbleRef}
          style={{
            position: 'fixed',
            left: `${Math.max(140, Math.min(bubble.x, typeof window !== 'undefined' ? window.innerWidth - 140 : 800))}px`,
            top: `${bubble.y}px`,
            transform: 'translateX(-50%) translateY(calc(-100% - 10px))',
            zIndex: 9999,
          }}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault()
          }}
        >
          {!askOpen ? (
            <button
              onClick={() => setAskOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-[12px] font-semibold shadow-lg shadow-indigo-500/40 hover:bg-indigo-500 active:scale-[0.95]"
              style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out' }}
            >
              <Sparkles className="size-3" />
              Ask Notus
            </button>
          ) : (
            <div
              className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-2xl bg-background border border-indigo-500/40 shadow-xl shadow-black/15 w-[300px]"
              style={{ animation: 'bubbleExpand 150ms cubic-bezier(0.23,1,0.32,1) both' }}
            >
              <Sparkles className="size-3.5 text-indigo-500 shrink-0" />
              <input
                autoFocus
                value={askPrompt}
                onChange={(e) => setAskPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) editor && handleAsk(editor)
                  if (e.key === 'Escape') { setAskOpen(false); setAskPrompt(''); setBubble(null) }
                }}
                placeholder="e.g. make this red, increase font size…"
                disabled={askLoading}
                className="flex-1 text-[13px] bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-w-0"
              />
              <button
                onClick={() => editor && handleAsk(editor)}
                disabled={askLoading || !askPrompt.trim()}
                className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10 disabled:text-muted-foreground/40 active:scale-[0.85] shrink-0"
                style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out' }}
              >
                {askLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────
function ToolbarButton({ onClick, active, title, children, disabled }: {
  onClick: () => void; active: boolean; title: string; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`px-3.5 py-2.5 rounded-xl text-[16px] font-mono font-semibold active:scale-[0.93] disabled:opacity-25 disabled:pointer-events-none ${
        active
          ? 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400'
          : 'text-foreground/60 hover:text-foreground hover:bg-muted'
      }`}
      style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out, color 120ms ease-out' }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-7 bg-border mx-1.5" />
}
