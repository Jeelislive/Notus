'use client'

import { useEditor, EditorContent, Extension, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, Loader2, Bold, Heading1, Heading2, Heading3, List, ListOrdered, Type, RemoveFormatting } from 'lucide-react'

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

// ── Smart Enter: heading → bullet list ────────────────────────────────────
const SmartEnter = Extension.create({
  name: 'smartEnter',
  priority: 200,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor
        const { $from, empty } = state.selection
        const node = $from.node()
        if (
          !empty ||
          node.type.name !== 'heading' ||
          node.textContent.length === 0 ||
          $from.parentOffset !== node.content.size
        ) return false
        return (this.editor as Editor).chain()
          .splitBlock({ keepMarks: false })
          .toggleBulletList()
          .run()
      },
    }
  },
})

// ── Types ──────────────────────────────────────────────────────────────────
interface TiptapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
  highlights?: { word: string; color: string }[] | null
  onHighlightsApplied?: () => void
}

interface SelectionBubble {
  text: string
  from: number
  to: number
  x: number
  y: number
}

// ── Component ──────────────────────────────────────────────────────────────
export function TiptapEditor({ content, onChange, placeholder, editable = true, highlights, onHighlightsApplied }: TiptapEditorProps) {
  const isUpdatingFromProp = useRef(false)
  const [bubble, setBubble] = useState<SelectionBubble | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  const [askPrompt, setAskPrompt] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const askOpenRef = useRef(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  useEffect(() => { askOpenRef.current = askOpen }, [askOpen])

  useEffect(() => {
    function onMouseUp() {
      const ed = editorRef.current
      if (!ed) return
      const { from, to } = ed.state.selection
      if (from === to) return
      const text = ed.state.doc.textBetween(from, to, ' ')
      if (!text.trim()) return
      try {
        const domSel = window.getSelection()
        if (!domSel?.rangeCount) return
        const range = domSel.getRangeAt(0)
        const rects = range.getClientRects()
        let rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect()
        for (let i = 1; i < rects.length; i++) {
          if (rects[i].bottom > rect.bottom) rect = rects[i]
        }
        if (!rect.width && !rect.height) return
        setBubble({ text, from, to, x: rect.right, y: rect.bottom })
      } catch { /* ignore */ }
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [])

  // Close bubble on outside click
  useEffect(() => {
    if (!bubble) return
    function handleMouseDown(e: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setBubble(null); setAskOpen(false); setAskPrompt('');
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
      Highlight.configure({ multicolor: true }),
      FontSize,
      SmartEnter,
    ],
    content,
    editable,
    onUpdate({ editor }) {
      if (!isUpdatingFromProp.current) onChange(editor.getHTML())
    },
    onSelectionUpdate({ editor }) {
      const { from, to } = editor.state.selection
      if (from === to && !askOpenRef.current) setBubble(null)
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content focus:outline-none min-h-full text-foreground leading-relaxed',
      },
    },
    immediatelyRender: false,
  })

  // Keep editorRef in sync
  useEffect(() => { editorRef.current = editor }, [editor])

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

  // Apply auto-highlights (e.g. after AI notes generation)
  useEffect(() => {
    if (!editor || !highlights?.length) return
    const { doc } = editor.state
    const toApply: { from: number; to: number; color: string }[] = []
    for (const { word, color } of highlights) {
      doc.descendants((node, pos) => {
        if (!node.isText || !node.text) return
        let idx = node.text.indexOf(word)
        while (idx !== -1) {
          toApply.push({ from: pos + idx, to: pos + idx + word.length, color })
          idx = node.text.indexOf(word, idx + word.length)
        }
      })
    }
    if (!toApply.length) { onHighlightsApplied?.(); return }
    const chain = editor.chain()
    for (const { from, to, color } of toApply) {
      chain
        .setTextSelection({ from, to })
        .setHighlight({ color: color === 'red' ? '#fca5a5' : '#93c5fd' })
    }
    chain.setTextSelection(1).run()
    onHighlightsApplied?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights])

  const toolbarItems = editor ? [
    { label: 'P',    icon: <Type className="size-5" />,        title: 'Paragraph',  active: editor.isActive('paragraph'),           action: () => editor.chain().focus().setParagraph().run() },
    { label: 'H1',   icon: <Heading1 className="size-5" />,    title: 'Heading 1',  active: editor.isActive('heading', { level: 1 }), action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'H2',   icon: <Heading2 className="size-5" />,    title: 'Heading 2',  active: editor.isActive('heading', { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'H3',   icon: <Heading3 className="size-5" />,    title: 'Heading 3',  active: editor.isActive('heading', { level: 3 }), action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    null,
    { label: 'B',    icon: <Bold className="size-5" />,        title: 'Bold',       active: editor.isActive('bold'),                action: () => editor.chain().focus().toggleBold().run() },
    null,
    { label: '•',    icon: <List className="size-5" />,        title: 'Bullet list',active: editor.isActive('bulletList'),          action: () => editor.chain().focus().toggleBulletList().run() },
    { label: '1.',   icon: <ListOrdered className="size-5" />, title: 'Numbered',   active: editor.isActive('orderedList'),         action: () => editor.chain().focus().toggleOrderedList().run() },
  ] : []

  return (
    <div className="tiptap-wrapper h-full flex flex-col">
      {/* Formatting toolbar */}
      {editable && editor && (
        <div className="flex items-center gap-0.5 px-6 py-1.5 border-b border-border shrink-0">
          {toolbarItems.map((item, i) =>
            item === null ? (
              <div key={i} className="w-px h-4 bg-border mx-1" />
            ) : (
              <button
                key={item.title}
                onClick={item.action}
                title={item.title}
                className={`flex items-center justify-center p-2.5 rounded-md text-[13px] font-medium transition-colors ${
                  item.active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.icon}
              </button>
            )
          )}
          <div className="w-px h-4 bg-border mx-1" />
          <button
            title="Remove all highlights"
            onClick={() => {
              editor.chain().focus().selectAll().unsetHighlight().run()
            }}
            className="flex items-center justify-center p-2.5 rounded-md text-[13px] font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <RemoveFormatting className="size-5" />
          </button>
        </div>
      )}
      <div className="p-6 overflow-y-auto flex-1 min-h-0 pb-20">
        <EditorContent editor={editor} />
      </div>

      {/* Floating selection AI bubble */}
      {bubble && editable && (
        <div
          ref={bubbleRef}
          style={{
            position: 'fixed',
            left: `${Math.max(140, Math.min(bubble.x, typeof window !== 'undefined' ? window.innerWidth - 140 : 800))}px`,
            top: `${bubble.y + 8}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault()
          }}
        >
          {!askOpen ? (
            <button
              onClick={() => setAskOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0075de] text-white text-[12px] font-semibold hover:bg-[#005bab] active:scale-[0.95]"
              style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out' }}
            >
              <Sparkles className="size-3" />
              Ask Notus
            </button>
          ) : (
            <div className="flex flex-col rounded-2xl bg-background border border-[#0075de]/40 shadow-xl shadow-black/15 w-[300px] overflow-hidden"
              style={{ animation: 'bubbleExpand 150ms cubic-bezier(0.23,1,0.32,1) both' }}
            >
              <div className="flex items-center gap-2 pl-3 pr-2 py-2">
                <Sparkles className="size-3.5 text-[#0075de] shrink-0" />
                <input
                  autoFocus
                  value={askPrompt}
                  onChange={(e) => setAskPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { editor && handleAsk(editor) }
                    if (e.key === 'Escape') { setAskOpen(false); setAskPrompt(''); setBubble(null) }
                  }}
                  placeholder="Ask Notus anything…"
                  disabled={askLoading}
                  className="flex-1 text-[13px] bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-w-0"
                />
                <button
                  onClick={() => editor && handleAsk(editor)}
                  disabled={askLoading || !askPrompt.trim()}
                  className="p-1.5 rounded-lg text-[#0075de] hover:bg-[#0075de]/10 disabled:text-muted-foreground/40 active:scale-[0.85] shrink-0"
                  style={{ transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1), background-color 120ms ease-out' }}
                >
                  {askLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

