import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  useApplyTemplate,
  useExtractBranding,
  usePage,
  usePublish,
  useRestoreVersion,
  useSaveDraft,
  useUpdateBranding,
  useUploadLogo,
  useVersions,
} from './api'
import { useEvent } from '../events/api'
import { useAgenda } from '../agenda/api'
import { useContests, useQuizzes } from '../engagement/api'
import { DropZone, EditorFrame, RenderBlock, type BlockContext } from './EventBlocks'
import { useDragAutoScroll } from './useDragAutoScroll'
import { ALL_BLOCK_TYPES, BLOCK_SCHEMAS, CATEGORY_META, blockIcon, blockLabel, blockSchema, type BlockCategory } from './blockSchema'
import { Button, Card, Field, Input, Select } from '../../components/ui'
import { ColorPicker } from '../../components/ColorPicker'
import { Icon } from '../../components/Icon'
import { FONT_OPTIONS, fontOptionByStack, ensureGoogleFont } from './fonts'
import type { BrandingDto, PageBlock, PageDto } from '../../types/api'

const TEMPLATES = ['gala', 'konferencja', 'integracja', 'premiera', 'blank']

type Device = 'desktop' | 'tablet' | 'mobile'

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

export function PageBuilderTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: page, isLoading } = usePage(eventId)
  if (isLoading || !page) return <p className="text-slate-500">{t('common.loading')}</p>
  return <Editor key={eventId} eventId={eventId} page={page} />
}

/** Generic undo/redo history wrapper for any value. */
function useHistoryState<T>(initial: T) {
  const [stack, setStack] = useState<{ past: T[]; present: T; future: T[] }>(() => ({
    past: [],
    present: initial,
    future: [],
  }))

  const set = useCallback((next: T | ((prev: T) => T), opts?: { skipHistory?: boolean }) => {
    setStack((cur) => {
      const value = typeof next === 'function' ? (next as (p: T) => T)(cur.present) : next
      if (opts?.skipHistory) return { ...cur, present: value }
      return { past: [...cur.past, cur.present], present: value, future: [] }
    })
  }, [])

  const undo = useCallback(() => {
    setStack((cur) => {
      if (cur.past.length === 0) return cur
      const prev = cur.past[cur.past.length - 1]
      return { past: cur.past.slice(0, -1), present: prev, future: [cur.present, ...cur.future] }
    })
  }, [])

  const redo = useCallback(() => {
    setStack((cur) => {
      if (cur.future.length === 0) return cur
      const [next, ...rest] = cur.future
      return { past: [...cur.past, cur.present], present: next, future: rest }
    })
  }, [])

  const reset = useCallback((next: T) => {
    setStack({ past: [], present: next, future: [] })
  }, [])

  return {
    value: stack.present,
    set,
    undo,
    redo,
    reset,
    canUndo: stack.past.length > 0,
    canRedo: stack.future.length > 0,
  }
}

function Editor({ eventId, page }: { eventId: string; page: PageDto }) {
  const { t, i18n } = useTranslation()
  // Auto-scroll the window when dragging near top/bottom edges.
  useDragAutoScroll()
  const save = useSaveDraft(eventId)
  const applyTemplate = useApplyTemplate(eventId)
  const updateBranding = useUpdateBranding(eventId)
  const publish = usePublish(eventId)
  const restore = useRestoreVersion(eventId)
  const { data: versions } = useVersions(eventId)
  const { data: event } = useEvent(eventId)
  const { data: contests } = useContests(eventId)
  const { data: quizzes } = useQuizzes(eventId)
  // Live agenda so the Agenda block previews real items (the public page reads
  // the same data — general items only, i.e. without a per-group name).
  const { data: agenda } = useAgenda(eventId)

  const blocksHistory = useHistoryState<PageBlock[]>(page.content.blocks ?? [])
  const blocks = blocksHistory.value
  const [branding, setBranding] = useState<BrandingDto>(page.branding)
  // Load the chosen web font so the desktop canvas renders in it (the device
  // iframe and public page load it into their own documents).
  useEffect(() => {
    ensureGoogleFont(document, branding.fontFamily)
  }, [branding.fontFamily])
  const [lang, setLang] = useState<'pl' | 'en'>('pl')
  const [device, setDevice] = useState<Device>('desktop')
  // On small laptops the 3 fixed columns force horizontal scroll — let the left
  // panel collapse to a thin rail (desktop only; on mobile the columns stack).
  const [leftOpen, setLeftOpen] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null)
  const [tab, setTab] = useState<'content' | 'style' | 'advanced'>('content')
  const [showBranding, setShowBranding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const selected = blocks.find((b) => b.id === selectedId) ?? null
  const schema = selected ? blockSchema(selected.type) : undefined

  // Auto-clear ephemeral status messages.
  useEffect(() => {
    if (!message) return
    const id = window.setTimeout(() => setMessage(null), 3000)
    return () => window.clearTimeout(id)
  }, [message])

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Delete / Ctrl+D.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const inEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (inEditable) return
        e.preventDefault()
        blocksHistory.undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        if (inEditable) return
        e.preventDefault()
        blocksHistory.redo()
        return
      }
      if (selectedId && !inEditable && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        deleteBlock(selectedId)
        return
      }
      if (selectedId && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && !inEditable) {
        e.preventDefault()
        duplicateBlock(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  function markDirty<T>(value: T): T {
    setDirty(true)
    return value
  }

  function patchBlock(id: string, fn: (b: PageBlock) => PageBlock, skipHistory = false) {
    blocksHistory.set((prev) => markDirty(prev.map((b) => (b.id === id ? fn(b) : b))), { skipHistory })
  }

  function setText(blockId: string, key: string, value: string) {
    // Inline contentEditable fires onBlur once per edit; coalesce into history.
    patchBlock(blockId, (b) => ({
      ...b,
      content: { ...b.content, [lang]: { ...(b.content[lang] ?? {}), [key]: value } },
    }))
  }

  function setStyle(blockId: string, key: string, value: unknown) {
    patchBlock(blockId, (b) => ({ ...b, styles: { ...(b.styles ?? {}), [key]: value } }))
  }

  function setSetting(blockId: string, key: string, value: unknown) {
    patchBlock(blockId, (b) => ({ ...b, settings: { ...(b.settings ?? {}), [key]: value } }))
  }

  function newBlock(type: string): PageBlock {
    return {
      id: crypto.randomUUID(),
      type,
      order: 0,
      visible: true,
      settings: type === 'spacer' ? { height: 48 } : {},
      content: { pl: {}, en: {} },
      styles: {},
    }
  }

  function appendBlock(type: string) {
    const b = newBlock(type)
    blocksHistory.set((prev) => markDirty([...prev, b]))
    setSelectedId(b.id)
  }

  function insertBlockAt(type: string, index: number) {
    const b = newBlock(type)
    blocksHistory.set((prev) => {
      const next = [...prev]
      next.splice(index, 0, b)
      return markDirty(next)
    })
    setSelectedId(b.id)
  }

  function reorder(from: number, to: number) {
    if (from === to) return
    blocksHistory.set((prev) => {
      const next = [...prev]
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      return markDirty(next)
    })
  }

  function moveBlock(id: string, dir: -1 | 1) {
    blocksHistory.set((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return markDirty(next)
    })
  }

  function deleteBlock(id: string) {
    blocksHistory.set((prev) => markDirty(prev.filter((b) => b.id !== id)))
    if (selectedId === id) setSelectedId(null)
  }

  function duplicateBlock(id: string) {
    blocksHistory.set((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      if (i < 0) return prev
      const src = prev[i]
      const copy: PageBlock = {
        ...src,
        id: crypto.randomUUID(),
        content: {
          pl: { ...(src.content?.pl ?? {}) },
          en: { ...(src.content?.en ?? {}) },
        },
        settings: { ...(src.settings ?? {}) },
        styles: { ...(src.styles ?? {}) },
      }
      const next = [...prev]
      next.splice(i + 1, 0, copy)
      setSelectedId(copy.id)
      return markDirty(next)
    })
  }

  function reindexed() {
    return { blocks: blocks.map((b, i) => ({ ...b, order: i })) }
  }

  async function handleSave() {
    await save.mutateAsync(reindexed())
    setDirty(false)
    setMessage(t('page.saved'))
  }

  async function handlePublish() {
    if (!window.confirm(t('page.confirmPublish'))) return
    await save.mutateAsync(reindexed())
    const r = await publish.mutateAsync()
    setDirty(false)
    setMessage(t('page.published', { version: r.publishedVersion }))
  }

  async function handleTemplate(key: string) {
    const r = await applyTemplate.mutateAsync(key)
    blocksHistory.reset(r.content.blocks ?? [])
    setBranding(r.branding)
    setSelectedId(r.content.blocks?.[0]?.id ?? null)
    setDirty(false)
  }

  async function handleRestore(version: number) {
    if (!window.confirm(t('page.confirmRestore', { version }))) return
    const r = await restore.mutateAsync(version)
    blocksHistory.reset(r.content.blocks ?? [])
    setBranding(r.branding)
    setMessage(t('page.restored', { version }))
    setDirty(false)
  }

  async function handleBranding() {
    await updateBranding.mutateAsync(branding)
    setMessage(t('page.saved'))
  }

  const ctx: BlockContext = useMemo(
    () => ({
      eventId,
      branding,
      lang,
      agenda: (agenda ?? []).filter((a) => !a.groupName),
      galleryUrls: [],
      contests: (contests ?? []).map((c) => ({ id: c.id, name: c.name, mode: c.mode })),
      quizzes: (quizzes ?? []).map((q) => ({ id: q.id, title: q.title })),
      startsAt: event?.startsAt,
      edit: { onTextChange: setText },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventId, branding, lang, event?.startsAt, contests, quizzes, agenda],
  )

  return (
    <div className="flex flex-col gap-3">
      {/* TOP TOOLBAR */}
      <Card className="!p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status pill */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
              page.hasPublished
                ? 'bg-sky-400/15 text-sky-300 ring-sky-400/30'
                : 'bg-amber-400/15 text-amber-300 ring-amber-400/30'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {page.hasPublished
              ? t('page.publishedVersion', { version: page.publishedVersion })
              : t('page.notPublished')}
          </span>
          {dirty && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 ring-1 ring-inset ring-rose-400/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
              {t('page.unsaved')}
            </span>
          )}
          {message && <span className="text-xs text-emerald-300">{message}</span>}

          <span className="mx-2 hidden h-5 w-px bg-slate-700/60 sm:block" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={blocksHistory.undo}
            disabled={!blocksHistory.canUndo}
            title={t('page.undo')}
            className="rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-slate-300 transition hover:border-indigo-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 5V2L5 9l7 7v-3c3.31 0 6 2.69 6 6h2c0-4.42-3.58-8-8-8z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={blocksHistory.redo}
            disabled={!blocksHistory.canRedo}
            title={t('page.redo')}
            className="rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-slate-300 transition hover:border-indigo-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 5V2l7 7-7 7v-3c-3.31 0-6 2.69-6 6H4c0-4.42 3.58-8 8-8z" />
            </svg>
          </button>

          <span className="mx-2 hidden h-5 w-px bg-slate-700/60 sm:block" />

          {/* Device toggle */}
          <div className="flex items-center gap-0.5 rounded-md border border-slate-800 bg-slate-950/60 p-0.5">
            {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                title={t(`page.device${d.charAt(0).toUpperCase()}${d.slice(1)}`)}
                className={`rounded px-2 py-1 text-xs transition ${
                  device === d
                    ? 'bg-gradient-to-r from-indigo-500/30 to-violet-500/30 text-white ring-1 ring-inset ring-indigo-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d === 'desktop' ? '🖥' : d === 'tablet' ? '🟦' : '📱'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLeftOpen((v) => !v)}
            title={leftOpen ? t('page.collapsePanel') : t('page.expandPanel')}
            className="hidden items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 lg:inline-flex"
          >
            {leftOpen ? '⟨⟩' : '☰'} {t('page.panels')}
          </button>

          <label
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2 py-1"
            title={t('page.contentLangHint')}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-200">🌐 {t('page.contentLang')}</span>
            <Select value={lang} onChange={(e) => setLang(e.target.value as 'pl' | 'en')} className="!w-16 !py-1 !text-xs">
              <option value="pl">PL</option>
              <option value="en">EN</option>
            </Select>
          </label>

          <Select
            value=""
            onChange={(e) => {
              if (e.target.value) void handleTemplate(e.target.value)
              e.currentTarget.value = ''
            }}
            className="!w-36 !py-1.5 !text-xs"
          >
            <option value="">{t('page.template')}…</option>
            {TEMPLATES.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>

          <Button variant="ghost" onClick={() => setShowBranding((v) => !v)}>
            🎨 {t('page.branding')}
          </Button>
          <Button variant="subtle" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? '…' : t('page.saveDraft')}
          </Button>
          <Button onClick={handlePublish} disabled={publish.isPending || save.isPending}>
            ⚡ {t('page.publish')}
          </Button>
          {page.hasPublished && (
            <a
              href={`/public/events/${eventId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              <Icon name="externalLink" className="h-3.5 w-3.5" />
              {t('page.openPublic')}
            </a>
          )}
        </div>

        {showBranding && (
          <BrandingEditor
            eventId={eventId}
            branding={branding}
            onChange={setBranding}
            onSave={handleBranding}
            saving={updateBranding.isPending}
          />
        )}
      </Card>

      {/* MAIN 3-COLUMN LAYOUT: Layers + Canvas + Properties */}
      <div
        className={`grid items-start gap-3 ${
          leftOpen ? 'lg:grid-cols-[288px_1fr_320px]' : 'lg:grid-cols-[52px_1fr_320px]'
        }`}
      >
        {/* ─── LEFT: Layers + Palette + Versions (collapsible on desktop) ─── */}
        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {/* Collapsed rail — desktop only; click to expand */}
          {!leftOpen && (
            <button
              type="button"
              onClick={() => setLeftOpen(true)}
              title={t('page.expandPanel')}
              aria-label={t('page.expandPanel')}
              className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-300 transition hover:bg-slate-800 lg:flex"
            >
              ☰
            </button>
          )}
          {/* Full panel — always on mobile; on desktop only when open */}
          <div className={`flex flex-col gap-3 ${!leftOpen ? 'lg:hidden' : ''}`}>
            <div className="hidden justify-end lg:flex">
              <button
                type="button"
                onClick={() => setLeftOpen(false)}
                title={t('page.collapsePanel')}
                aria-label={t('page.collapsePanel')}
                className="rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
              >
                «
              </button>
            </div>
            <LayersPanel
              blocks={blocks}
              lang={lang}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={moveBlock}
              onDuplicate={duplicateBlock}
              onDelete={deleteBlock}
              onToggleVisible={(id) =>
                patchBlock(id, (b) => ({ ...b, visible: b.visible === false }))
              }
            />
            <PalettePanel lang={lang} onAdd={appendBlock} />
          {versions && versions.length > 0 && (
            <Card>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('page.versions')}</h3>
              <ul className="space-y-1 text-xs">
                {versions.slice(0, 6).map((v) => (
                  <li key={v.version} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-slate-800/40">
                    <span className="text-slate-300">
                      v{v.version}
                      <span className="ml-2 text-[10px] text-slate-500">
                        {new Date(v.publishedAt).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}
                      </span>
                    </span>
                    <button
                      onClick={() => handleRestore(v.version)}
                      className="text-[10px] uppercase tracking-wider text-indigo-300 hover:text-indigo-100"
                    >
                      ↶ {t('page.restore')}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          </div>
        </div>

        {/* ─── CENTER: Canvas — grows with content, the page itself scrolls ─── */}
        {/* min-w-0 lets this 1fr track shrink instead of forcing the whole grid wider (horizontal scroll). */}
        <div className="flex min-w-0 flex-col overflow-x-hidden rounded-2xl border border-slate-800/60 bg-slate-950/50 p-3">
          <div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-lg bg-slate-950/80 px-2 py-1 backdrop-blur">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              💡 {t('page.selectBlockHint')}
            </p>
            <span className="text-[11px] text-slate-500">
              {DEVICE_WIDTH[device]} · {lang.toUpperCase()}
            </span>
          </div>
          <div>
            {device !== 'desktop' ? (
              // Accurate device preview: an iframe whose width IS the device width, so
              // the page's responsive breakpoints evaluate exactly as on a real phone/tablet.
              // (Read-only — editing/drag-drop stays in the desktop canvas.)
              <DevicePreviewFrame width={DEVICE_WIDTH[device]} fontFamily={branding.fontFamily}>
                <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
                  {blocks.filter((b) => b.visible !== false).map((b) => (
                    <RenderBlock key={b.id} block={b} ctx={ctx} />
                  ))}
                </div>
              </DevicePreviewFrame>
            ) : (
              <div
                className="mx-auto space-y-3 rounded-2xl bg-[#fbfbfd] p-6 text-slate-900 shadow-2xl shadow-black/30 transition-all"
                style={{ fontFamily: branding.fontFamily, maxWidth: DEVICE_WIDTH[device], width: '100%' }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelectedId(null)
                }}
              >
                {blocks.length === 0 ? (
                  <DropFirst onInsertNew={(type) => insertBlockAt(type, 0)} />
                ) : (
                  <>
                    <DropZone index={0} onReorder={reorder} onInsertNew={insertBlockAt} />
                    {blocks.map((b, i) => (
                      <div key={b.id}>
                        <EditorFrame
                          block={b}
                          index={i}
                          totalBlocks={blocks.length}
                          selected={selectedId === b.id}
                          onSelect={() => setSelectedId(b.id)}
                          onMove={(dir) => moveBlock(b.id, dir)}
                          onDelete={() => deleteBlock(b.id)}
                          onToggleVisible={() =>
                            patchBlock(b.id, (block) => ({ ...block, visible: block.visible === false }))
                          }
                        >
                          {b.visible === false ? (
                            <div className="rounded-3xl bg-slate-100 p-8 text-center text-slate-400">
                              {blockLabel(b.type, lang)} — {t('page.hidden')}
                            </div>
                          ) : (
                            <RenderBlock block={b} ctx={ctx} />
                          )}
                        </EditorFrame>
                        <DropZone index={i + 1} onReorder={reorder} onInsertNew={insertBlockAt} />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Properties — sticky so it stays visible while canvas scrolls ─── */}
        <div className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {selected && schema ? (
            <PropertyPanel
              block={selected}
              schema={schema}
              lang={lang}
              tab={tab}
              onTabChange={setTab}
              branding={branding}
              onTextChange={setText}
              onStyleChange={setStyle}
              onSettingChange={setSetting}
              onDuplicate={() => duplicateBlock(selected.id)}
              onDelete={() => deleteBlock(selected.id)}
              onToggleVisible={() =>
                patchBlock(selected.id, (b) => ({ ...b, visible: b.visible === false }))
              }
            />
          ) : (
            <Card className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
                <Icon name="sparkles" className="h-6 w-6 text-indigo-200" />
              </div>
              <p className="mt-4 text-sm font-semibold text-white">{t('page.selectBlock')}</p>
              <p className="mt-1 max-w-[220px] text-xs text-slate-400">{t('page.selectBlockHint')}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ===================== LayersPanel =====================
function LayersPanel({
  blocks,
  lang,
  selectedId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onToggleVisible,
}: {
  blocks: PageBlock[]
  lang: 'pl' | 'en'
  selectedId: string | null
  onSelect: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onToggleVisible: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <Card className="!p-2">
      <h3 className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {t('page.layers')} · {blocks.length}
      </h3>
      {blocks.length === 0 ? (
        <p className="px-2 py-3 text-xs text-slate-500">{t('page.noBlocks')}</p>
      ) : (
        <ul className="space-y-0.5">
          {blocks.map((b, i) => (
            <li key={b.id}>
              <div
                className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition cursor-pointer ${
                  selectedId === b.id
                    ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-white ring-1 ring-inset ring-indigo-400/40'
                    : 'text-slate-300 hover:bg-slate-800/60'
                } ${b.visible === false ? 'opacity-50' : ''}`}
                onClick={() => onSelect(b.id)}
              >
                <span className="text-base leading-none">{blockIcon(b.type)}</span>
                <span className="truncate flex-1">{blockLabel(b.type, lang)}</span>
                {(() => {
                  const settings = (b.settings ?? {}) as Record<string, unknown>
                  const defaultInNav = b.type !== 'hero' && b.type !== 'spacer'
                  const inNav = settings.navShow === undefined ? defaultInNav : settings.navShow === true
                  return inNav ? (
                    <span
                      title="W menu na górze strony"
                      className="shrink-0 text-[10px] leading-none text-indigo-300"
                    >
                      🧭
                    </span>
                  ) : null
                })()}
                <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onMove(b.id, -1)
                    }}
                    disabled={i === 0}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-700/60 hover:text-white disabled:opacity-30"
                    title={t('page.moveUp')}
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onMove(b.id, 1)
                    }}
                    disabled={i === blocks.length - 1}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-700/60 hover:text-white disabled:opacity-30"
                    title={t('page.moveDown')}
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleVisible(b.id)
                    }}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-700/60 hover:text-white"
                    title={t('page.toggleVisible')}
                  >
                    {b.visible === false ? '🚫' : '👁'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicate(b.id)
                    }}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-700/60 hover:text-white"
                    title={t('page.duplicate')}
                  >
                    ⎘
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(b.id)
                    }}
                    className="rounded p-0.5 text-rose-400 hover:bg-rose-500/20"
                    title={t('page.delete')}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ===================== BrandingEditor =====================
// Parses the branding.backgroundColor string to detect whether it's a solid
// color, a 2-stop gradient, or a CSS image URL — so we can drive the right
// editor controls and serialize back into the same string.
/**
 * Renders children inside an iframe whose width equals the chosen device width.
 * Because the iframe has its own viewport, the page's responsive (sm:/md:/lg:)
 * breakpoints evaluate against the device width — so the preview matches a real
 * phone/tablet instead of cramming desktop layout into a narrow div.
 */
function DevicePreviewFrame({ width, fontFamily, children }: { width: string; fontFamily?: string | null; children: React.ReactNode }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const doc = ref.current?.contentDocument
    if (!doc) return
    doc.head.innerHTML = ''
    // Clone the app's stylesheets so Tailwind classes resolve inside the iframe.
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => doc.head.appendChild(n.cloneNode(true)))
    const meta = doc.createElement('meta')
    meta.setAttribute('name', 'viewport')
    meta.setAttribute('content', 'width=device-width, initial-scale=1')
    doc.head.appendChild(meta)
    doc.documentElement.style.background = '#fbfbfd'
    doc.body.style.margin = '0'
    doc.body.style.background = '#fbfbfd'
    doc.body.style.color = '#0f172a'
    if (fontFamily) doc.body.style.fontFamily = fontFamily
    ensureGoogleFont(doc, fontFamily)
    setBody(doc.body)
  }, [fontFamily])

  return (
    <iframe
      ref={ref}
      title="device-preview"
      className="mx-auto block rounded-2xl bg-white shadow-2xl shadow-black/30 ring-1 ring-slate-700/40"
      style={{ width, height: 'min(80vh, 900px)', border: 0, maxWidth: '100%' }}
    >
      {body && createPortal(children, body)}
    </iframe>
  )
}

function parseBackground(value: string | null): { mode: 'color' | 'gradient' | 'image'; color: string; gradientFrom: string; gradientTo: string; angle: number; imageUrl: string } {
  const v = (value ?? '').trim()
  if (!v) return { mode: 'color', color: '#fbfbfd', gradientFrom: '#fbfbfd', gradientTo: '#f1f5f9', angle: 135, imageUrl: '' }
  if (v.startsWith('url(')) {
    const m = v.match(/url\(['"]?([^'")]+)['"]?\)/)
    return { mode: 'image', color: '#fbfbfd', gradientFrom: '#fbfbfd', gradientTo: '#f1f5f9', angle: 135, imageUrl: m?.[1] ?? '' }
  }
  if (v.startsWith('linear-gradient(')) {
    const inner = v.slice(v.indexOf('(') + 1, v.lastIndexOf(')'))
    const parts = inner.split(',').map((p) => p.trim())
    let angle = 135
    let colors = parts
    if (parts[0]?.endsWith('deg')) {
      angle = parseFloat(parts[0])
      colors = parts.slice(1)
    }
    return {
      mode: 'gradient',
      color: colors[0] ?? '#fbfbfd',
      gradientFrom: colors[0] ?? '#fbfbfd',
      gradientTo: colors[1] ?? '#f1f5f9',
      angle,
      imageUrl: '',
    }
  }
  return { mode: 'color', color: v, gradientFrom: v, gradientTo: '#f1f5f9', angle: 135, imageUrl: '' }
}

function serializeBackground(mode: 'color' | 'gradient' | 'image', color: string, from: string, to: string, angle: number, url: string): string | null {
  if (mode === 'image') return url ? `url('${url}') center/cover` : null
  if (mode === 'gradient') return `linear-gradient(${angle}deg, ${from}, ${to})`
  return color || null
}

function BrandingEditor({
  eventId,
  branding,
  onChange,
  onSave,
  saving,
}: {
  eventId: string
  branding: BrandingDto
  onChange: (b: BrandingDto) => void
  onSave: () => Promise<void> | void
  saving: boolean
}) {
  const { t } = useTranslation()
  const uploadLogo = useUploadLogo(eventId)
  const [logoErr, setLogoErr] = useState<string | null>(null)

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setLogoErr(null)
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setLogoErr(t('page.logoBadType'))
      return
    }
    if (file.size > 5_000_000) {
      setLogoErr(t('page.logoTooBig'))
      return
    }
    try {
      const updated = await uploadLogo.mutateAsync(file)
      onChange({ ...branding, logoUrl: updated.branding.logoUrl })
    } catch {
      setLogoErr(t('page.logoUploadError'))
    }
  }
  const parsed = parseBackground(branding.backgroundColor)
  const [mode, setMode] = useState(parsed.mode)
  const [color, setColor] = useState(parsed.color)
  const [from, setFrom] = useState(parsed.gradientFrom)
  const [to, setTo] = useState(parsed.gradientTo)
  const [angle, setAngle] = useState(parsed.angle)
  const [imageUrl, setImageUrl] = useState(parsed.imageUrl)

  // Auto-branding from a website URL.
  const extract = useExtractBranding()
  const [brandUrl, setBrandUrl] = useState('')
  const [autoStatus, setAutoStatus] = useState<{ colors: boolean; logo: boolean } | null>(null)
  async function fetchBranding() {
    if (!brandUrl.trim()) return
    const s = await extract.mutateAsync(brandUrl.trim())
    onChange({
      ...branding,
      primaryColor: s.primaryColor ?? branding.primaryColor,
      secondaryColor: s.secondaryColor ?? branding.secondaryColor,
      accentColor: s.accentColor ?? branding.accentColor,
      logoUrl: s.logoUrl ?? branding.logoUrl,
      faviconUrl: s.faviconUrl ?? branding.faviconUrl,
    })
    // Tell the admin what actually came back — many sites declare no theme-color,
    // so colours often need to be set by hand even when the logo is found.
    setAutoStatus({ colors: !!s.primaryColor, logo: !!s.logoUrl })
  }

  function commitBg(nextMode = mode, nextColor = color, nextFrom = from, nextTo = to, nextAngle = angle, nextUrl = imageUrl) {
    onChange({
      ...branding,
      backgroundColor: serializeBackground(nextMode, nextColor, nextFrom, nextTo, nextAngle, nextUrl),
    })
  }

  const bgPreview = serializeBackground(mode, color, from, to, angle, imageUrl) ?? '#fbfbfd'

  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      {/* Auto-branding: pull colours + logo from a website URL */}
      <div className="mb-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
          ✨ {t('page.autoBranding')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[220px] flex-1"
            placeholder="https://twojafirma.pl"
            value={brandUrl}
            onChange={(e) => setBrandUrl(e.target.value)}
          />
          <Button variant="subtle" onClick={fetchBranding} disabled={extract.isPending || !brandUrl.trim()}>
            {extract.isPending ? '…' : t('page.autoBrandingFetch')}
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">{t('page.autoBrandingHint')}</p>
        {extract.isError && <p className="mt-1 text-[11px] text-rose-400">{t('page.autoBrandingError')}</p>}
        {!extract.isError && autoStatus && (
          <p className="mt-1 text-[11px] text-slate-400">
            {t('page.autoBrandingResult', {
              colors: autoStatus.colors ? '✓' : '✗',
              logo: autoStatus.logo ? '✓' : '✗',
            })}
          </p>
        )}
      </div>

      {/* Brand colors + logo + Save button in one tidy row */}
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_2fr_auto] items-end">
        <Field label={t('page.primaryColor')}>
          <ColorPicker
            value={branding.primaryColor}
            onChange={(v) => onChange({ ...branding, primaryColor: v })}
          />
        </Field>
        <Field label={t('page.accentColor')}>
          <ColorPicker
            value={branding.accentColor}
            onChange={(v) => onChange({ ...branding, accentColor: v })}
          />
        </Field>
        <Field label={t('page.logoUrl')}>
          <div className="flex items-center gap-2">
            <Input
              className="min-w-0 flex-1"
              placeholder="https://…"
              value={branding.logoUrl ?? ''}
              onChange={(e) => onChange({ ...branding, logoUrl: e.target.value || null })}
            />
            <label
              className={`shrink-0 cursor-pointer rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800 ${
                uploadLogo.isPending ? 'pointer-events-none opacity-60' : ''
              }`}
              title={t('page.logoUpload')}
            >
              {uploadLogo.isPending ? '…' : `⬆ ${t('page.logoUpload')}`}
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={onLogoFile} />
            </label>
          </div>
          {logoErr && <p className="mt-1 text-[11px] text-rose-400">{logoErr}</p>}
        </Field>
        <Button variant="subtle" onClick={onSave} disabled={saving}>
          {t('page.saveBranding')}
        </Button>
      </div>

      {/* Page font */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label={t('page.font')}>
          <Select
            value={fontOptionByStack(branding.fontFamily).id}
            onChange={(e) => {
              const opt = FONT_OPTIONS.find((f) => f.id === e.target.value) ?? FONT_OPTIONS[0]
              onChange({ ...branding, fontFamily: opt.id === 'system' ? '' : opt.stack })
            }}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Page background — big swatch + toggle + only the relevant controls */}
      <div className="mt-4 grid items-stretch gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-[160px_1fr]">
        {/* Big live preview */}
        <div className="flex flex-col">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Tło strony</p>
          <div
            className="relative flex-1 overflow-hidden rounded-lg ring-1 ring-inset ring-slate-700/60"
            style={{ background: bgPreview, minHeight: 120 }}
            aria-hidden
          >
            {/* Checkerboard so light/transparent backgrounds are still visible */}
            <div
              className="pointer-events-none absolute inset-0 -z-10 opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)',
                backgroundSize: '14px 14px',
                backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0',
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div>
          <div className="mb-3 flex flex-wrap gap-1 rounded-md border border-slate-800 bg-slate-950/60 p-1">
            {(
              [
                { k: 'color', label: 'Kolor', emoji: '🎨' },
                { k: 'gradient', label: 'Gradient', emoji: '🌈' },
                { k: 'image', label: 'Obraz', emoji: '🖼' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.k}
                type="button"
                onClick={() => {
                  setMode(opt.k)
                  commitBg(opt.k)
                }}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition ${
                  mode === opt.k
                    ? 'bg-gradient-to-r from-indigo-500/30 to-violet-500/30 text-white ring-1 ring-inset ring-indigo-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>

          {mode === 'color' && (
            <Field label="Kolor tła">
              <ColorPicker
                value={color}
                onChange={(v) => {
                  setColor(v)
                  commitBg('color', v)
                }}
              />
            </Field>
          )}

          {mode === 'gradient' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Od">
                  <ColorPicker
                    value={from}
                    onChange={(v) => {
                      setFrom(v)
                      commitBg('gradient', color, v)
                    }}
                  />
                </Field>
                <Field label="Do">
                  <ColorPicker
                    value={to}
                    onChange={(v) => {
                      setTo(v)
                      commitBg('gradient', color, from, v)
                    }}
                  />
                </Field>
              </div>
              <Field label={`Kąt: ${angle}°`}>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={5}
                  value={angle}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setAngle(v)
                    commitBg('gradient', color, from, to, v)
                  }}
                  className="w-full accent-indigo-500"
                />
              </Field>
              {/* Quick gradient presets */}
              <div className="mt-2 flex flex-wrap gap-1">
                {GRADIENT_PRESETS.map((p) => (
                  <button
                    key={p.from + p.to}
                    type="button"
                    onClick={() => {
                      setFrom(p.from)
                      setTo(p.to)
                      setAngle(p.angle)
                      commitBg('gradient', color, p.from, p.to, p.angle)
                    }}
                    title={p.label}
                    className="h-7 w-12 rounded-md ring-1 ring-inset ring-slate-700/60 transition hover:scale-110 hover:ring-indigo-400/60"
                    style={{ background: `linear-gradient(${p.angle}deg, ${p.from}, ${p.to})` }}
                    aria-label={p.label}
                  />
                ))}
              </div>
            </>
          )}

          {mode === 'image' && (
            <Field label="URL obrazu w tle">
              <Input
                placeholder="https://…"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value)
                  commitBg('image', color, from, to, angle, e.target.value)
                }}
              />
            </Field>
          )}
        </div>
      </div>
    </div>
  )
}

const GRADIENT_PRESETS: { label: string; from: string; to: string; angle: number }[] = [
  { label: 'Świt', from: '#fbcfe8', to: '#a78bfa', angle: 135 },
  { label: 'Ocean', from: '#bae6fd', to: '#6366f1', angle: 135 },
  { label: 'Las', from: '#bbf7d0', to: '#0d9488', angle: 135 },
  { label: 'Pustynia', from: '#fde68a', to: '#f97316', angle: 135 },
  { label: 'Noc', from: '#1e293b', to: '#4c1d95', angle: 135 },
  { label: 'Róż', from: '#fce7f3', to: '#f472b6', angle: 135 },
  { label: 'Miętowy', from: '#d1fae5', to: '#6ee7b7', angle: 135 },
  { label: 'Mgła', from: '#f1f5f9', to: '#cbd5e1', angle: 135 },
]

// ===================== PalettePanel =====================
function PalettePanel({ lang, onAdd }: { lang: 'pl' | 'en'; onAdd: (type: string) => void }) {
  const { t } = useTranslation()
  // Group block types by category for a more readable palette.
  const grouped = useMemo(() => {
    const groups: Record<string, string[]> = {}
    for (const type of ALL_BLOCK_TYPES) {
      const cat = (BLOCK_SCHEMAS[type]?.category as string | undefined) ?? 'content'
      ;(groups[cat] = groups[cat] ?? []).push(type)
    }
    // Stable order matching CATEGORY_META keys.
    const order: BlockCategory[] = ['hero', 'content', 'media', 'data', 'cta', 'layout']
    return order.filter((k) => groups[k]?.length).map((k) => ({ key: k, types: groups[k] }))
  }, [])

  return (
    <Card className="!p-2">
      <h3 className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {t('page.addBlock')}
      </h3>
      <div className="space-y-2.5">
        {grouped.map(({ key, types }) => {
          const meta = CATEGORY_META[key]
          return (
            <div key={key}>
              <div className="mb-1 flex items-center gap-1.5 px-1">
                <span className="text-[10px]">{meta.icon}</span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {lang === 'en' ? meta.titleEn : meta.titlePl}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {types.map((type) => (
                  <button
                    key={type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/x-block-type', type)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    onClick={() => onAdd(type)}
                    className="group flex min-h-[68px] cursor-grab flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/60 px-1.5 py-2.5 text-[11px] leading-tight text-slate-300 transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-slate-900 hover:text-white"
                    title={blockLabel(type, lang)}
                  >
                    <span className="text-xl leading-none">{blockIcon(type)}</span>
                    <span className="text-center">{blockLabel(type, lang)}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ===================== PropertyPanel =====================
import type { BlockSchema, RepeaterDef } from './blockSchema'

function PropertyPanel({
  block,
  schema,
  lang,
  tab,
  onTabChange,
  branding,
  onTextChange,
  onStyleChange,
  onSettingChange,
  onDuplicate,
  onDelete,
  onToggleVisible,
}: {
  block: PageBlock
  schema: BlockSchema
  lang: 'pl' | 'en'
  tab: 'content' | 'style' | 'advanced'
  onTabChange: (t: 'content' | 'style' | 'advanced') => void
  branding: BrandingDto
  onTextChange: (id: string, k: string, v: string) => void
  onStyleChange: (id: string, k: string, v: unknown) => void
  onSettingChange: (id: string, k: string, v: unknown) => void
  onDuplicate: () => void
  onDelete: () => void
  onToggleVisible: () => void
}) {
  const { t } = useTranslation()
  const styles = (block.styles ?? {}) as Record<string, unknown>

  return (
    <Card className="!p-0">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 px-3 py-2.5">
        <span className="text-lg">{schema.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{lang === 'en' ? schema.titleEn : schema.titlePl}</p>
          <p className="text-[10px] text-slate-500">{block.id.slice(0, 8)}</p>
        </div>
        <button
          onClick={onToggleVisible}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title={t('page.toggleVisible')}
        >
          {block.visible === false ? '🚫' : '👁'}
        </button>
        <button
          onClick={onDuplicate}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title={t('page.duplicate')}
        >
          ⎘
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-rose-400 hover:bg-rose-500/20"
          title={t('page.delete')}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-slate-800/80 bg-slate-950/40 p-1">
        {(['content', 'style', 'advanced'] as const).map((k) => (
          <button
            key={k}
            onClick={() => onTabChange(k)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              tab === k
                ? 'bg-gradient-to-r from-indigo-500/30 to-violet-500/30 text-white ring-1 ring-inset ring-indigo-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t(`page.tab${k.charAt(0).toUpperCase()}${k.slice(1)}`)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-3 p-3">
        {tab === 'content' && (
          <ContentTab block={block} schema={schema} lang={lang} onText={onTextChange} onSetting={onSettingChange} />
        )}
        {tab === 'style' && (
          <StyleTab block={block} schema={schema} styles={styles} branding={branding} onStyle={onStyleChange} />
        )}
        {tab === 'advanced' && (
          <AdvancedTab
            block={block}
            styles={styles}
            blockId={block.id}
            onStyle={onStyleChange}
            onSetting={onSettingChange}
          />
        )}
      </div>
    </Card>
  )
}

function ContentTab({
  block,
  schema,
  lang,
  onText,
  onSetting,
}: {
  block: PageBlock
  schema: BlockSchema
  lang: 'pl' | 'en'
  onText: (id: string, k: string, v: string) => void
  onSetting: (id: string, k: string, v: unknown) => void
}) {
  return (
    <div className="space-y-3">
      {schema.contentFields.map((f) => {
        const value = (block.content?.[lang]?.[f.key] ?? '') as string
        return (
          <Field key={f.key} label={f.label}>
            {f.kind === 'longtext' ? (
              <textarea
                value={value}
                placeholder={f.placeholder}
                onChange={(e) => onText(block.id, f.key, e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-2.5 py-1.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
              />
            ) : (
              <Input
                value={value}
                placeholder={f.placeholder}
                onChange={(e) => onText(block.id, f.key, e.target.value)}
              />
            )}
          </Field>
        )
      })}

      {(schema.settingsFields ?? []).map((f) => (
        <Field key={f.key} label={f.label}>
          <Input
            type={f.kind === 'number' ? 'number' : 'text'}
            min={f.min}
            max={f.max}
            step={f.step}
            value={Number(((block.settings ?? {}) as Record<string, unknown>)[f.key] ?? f.min ?? 0)}
            onChange={(e) => onSetting(block.id, f.key, f.kind === 'number' ? Number(e.target.value) : e.target.value)}
          />
        </Field>
      ))}

      {(schema.settingsRepeaters ?? []).map((rep) => (
        <RepeaterEditor
          key={rep.key}
          block={block}
          def={rep}
          onChange={(items) => onSetting(block.id, rep.key, items)}
        />
      ))}
    </div>
  )
}

// ===================== RepeaterEditor =====================
function RepeaterEditor({
  block,
  def,
  onChange,
}: {
  block: PageBlock
  def: RepeaterDef
  onChange: (items: Record<string, string>[]) => void
}) {
  const items = useMemo(() => {
    const raw = ((block.settings ?? {}) as Record<string, unknown>)[def.key]
    return Array.isArray(raw) ? (raw as Record<string, string>[]) : []
  }, [block.settings, def.key])

  const [openIndex, setOpenIndex] = useState<number | null>(items.length === 0 ? null : 0)
  const { t } = useTranslation()

  function update(idx: number, key: string, value: string) {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it))
    onChange(next)
  }
  function add() {
    const empty: Record<string, string> = {}
    def.itemFields.forEach((f) => (empty[f.key] = ''))
    const next = [...items, empty]
    onChange(next)
    setOpenIndex(next.length - 1)
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
    setOpenIndex(null)
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{def.label}</span>
        <span className="text-[10px] text-slate-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-1 pb-2 text-xs text-slate-500">{def.emptyHint}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, idx) => {
            const open = openIndex === idx
            const head = item[def.itemFields[0]?.key] || `${def.label} #${idx + 1}`
            return (
              <li key={idx} className="rounded-md border border-slate-800 bg-slate-900/60">
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : idx)}
                    className="flex-1 truncate text-left text-xs text-slate-200 hover:text-white"
                  >
                    <span className="mr-1 text-slate-500">{open ? '▾' : '▸'}</span>
                    {head || `#${idx + 1}`}
                  </button>
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                    title={t('page.moveUp')}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === items.length - 1}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                    title={t('page.moveDown')}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => remove(idx)}
                    className="rounded p-0.5 text-rose-400 hover:bg-rose-500/20"
                    title={t('page.removeItem')}
                  >
                    ✕
                  </button>
                </div>
                {open && (
                  <div className="space-y-2 border-t border-slate-800/80 p-2">
                    {def.itemFields.map((f) => (
                      <Field key={f.key} label={f.label}>
                        {f.kind === 'longtext' ? (
                          <textarea
                            value={item[f.key] ?? ''}
                            onChange={(e) => update(idx, f.key, e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-slate-700/60 bg-slate-950/60 px-2.5 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        ) : (
                          <Input value={item[f.key] ?? ''} onChange={(e) => update(idx, f.key, e.target.value)} />
                        )}
                      </Field>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={add}
        className="mt-2 w-full rounded-md border border-dashed border-slate-700 px-2 py-1.5 text-xs text-slate-300 transition hover:border-indigo-400/60 hover:bg-indigo-500/10 hover:text-white"
      >
        + {def.addLabel}
      </button>
    </div>
  )
}

// ===================== StyleTab =====================
// Text fields that expose per-text typography presets (size + bold/italic), per block type.
const TEXT_FIELDS: Record<string, { key: string; label: string }[]> = {
  hero: [{ key: 'subtitle', label: 'Nadtytuł' }, { key: 'title', label: 'Tytuł' }, { key: 'ctaLabel', label: 'Przycisk' }],
  description: [{ key: 'eyebrow', label: 'Nadtytuł' }, { key: 'title', label: 'Tytuł' }, { key: 'body', label: 'Treść' }],
  stats: [{ key: 'title', label: 'Tytuł' }],
  features: [{ key: 'eyebrow', label: 'Nadtytuł' }, { key: 'title', label: 'Tytuł' }],
  testimonial: [{ key: 'quote', label: 'Cytat' }, { key: 'author', label: 'Autor' }],
  split: [{ key: 'eyebrow', label: 'Nadtytuł' }, { key: 'title', label: 'Tytuł' }, { key: 'body', label: 'Treść' }],
  agenda: [{ key: 'title', label: 'Tytuł' }],
  map: [{ key: 'title', label: 'Tytuł' }],
  gallery: [{ key: 'title', label: 'Tytuł' }],
  countdown: [{ key: 'title', label: 'Tytuł' }],
  faq: [{ key: 'title', label: 'Tytuł' }],
  team: [{ key: 'title', label: 'Tytuł' }],
  video: [{ key: 'title', label: 'Tytuł' }],
  sponsors: [{ key: 'title', label: 'Tytuł' }],
  cta: [{ key: 'title', label: 'Tytuł' }, { key: 'body', label: 'Treść' }, { key: 'buttonLabel', label: 'Przycisk' }],
  contests: [{ key: 'title', label: 'Tytuł' }],
  quizzes: [{ key: 'title', label: 'Tytuł' }],
}

function TypographyField({
  block,
  styles,
  field,
  onStyle,
}: {
  block: PageBlock
  styles: Record<string, unknown>
  field: { key: string; label: string }
  onStyle: (id: string, k: string, v: unknown) => void
}) {
  const size = (styles[`${field.key}Size`] as string) ?? 'm'
  const bold = !!styles[`${field.key}Bold`]
  const italic = !!styles[`${field.key}Italic`]
  const chip = (active: boolean) =>
    `rounded px-2 py-0.5 text-[11px] transition ${
      active ? 'bg-indigo-500/30 text-white ring-1 ring-inset ring-indigo-400/40' : 'text-slate-400 hover:text-white'
    }`
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
      <p className="mb-1 text-[11px] text-slate-300">{field.label}</p>
      <div className="flex flex-wrap items-center gap-1">
        <div className="flex gap-0.5 rounded-md border border-slate-700/60 bg-slate-950/60 p-0.5">
          {(['s', 'm', 'l', 'xl'] as const).map((s) => (
            <button key={s} type="button" onClick={() => onStyle(block.id, `${field.key}Size`, s)} className={chip(size === s)}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onStyle(block.id, `${field.key}Bold`, !bold)} className={`${chip(bold)} font-bold`}>
          B
        </button>
        <button type="button" onClick={() => onStyle(block.id, `${field.key}Italic`, !italic)} className={`${chip(italic)} italic`}>
          I
        </button>
      </div>
    </div>
  )
}

function StyleTab({
  block,
  schema,
  styles,
  branding,
  onStyle,
}: {
  block: PageBlock
  schema: BlockSchema
  styles: Record<string, unknown>
  branding: BrandingDto
  onStyle: (id: string, k: string, v: unknown) => void
}) {
  const { t } = useTranslation()
  const bgType = (styles.bgType as string) ?? 'default'
  const opts = schema.styleOptions

  return (
    <div className="space-y-3">
      {opts.background && (
        <div className="space-y-2">
          <Field label={t('page.bgType')}>
            <Select
              value={bgType}
              onChange={(e) => {
                const v = e.target.value
                onStyle(block.id, 'bgType', v)
                // Seed both gradient stops (or the solid colour) so a freshly-picked
                // gradient always has From+To persisted — not just the one the user tweaks.
                if (v === 'gradient') {
                  if (typeof styles.bgGradientFrom !== 'string')
                    onStyle(block.id, 'bgGradientFrom', (styles.bgColor as string) || '#ffffff')
                  if (typeof styles.bgGradientTo !== 'string')
                    onStyle(block.id, 'bgGradientTo', branding.primaryColor)
                } else if (v === 'color') {
                  if (typeof styles.bgColor !== 'string')
                    onStyle(block.id, 'bgColor', (styles.bgGradientFrom as string) || branding.primaryColor)
                }
              }}
            >
              <option value="default">{t('page.bgNone')}</option>
              <option value="color">{t('page.bgColor')}</option>
              <option value="gradient">{t('page.bgGradient')}</option>
            </Select>
          </Field>
          {bgType === 'color' && (
            <Field label={t('page.bgColor')}>
              <ColorPicker
                value={(styles.bgColor as string) ?? '#ffffff'}
                onChange={(v) => onStyle(block.id, 'bgColor', v)}
              />
            </Field>
          )}
          {bgType === 'gradient' && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Od">
                <ColorPicker
                  compact
                  value={(styles.bgGradientFrom as string) ?? branding.primaryColor}
                  onChange={(v) => onStyle(block.id, 'bgGradientFrom', v)}
                />
              </Field>
              <Field label="Do">
                <ColorPicker
                  compact
                  value={(styles.bgGradientTo as string) ?? branding.accentColor}
                  onChange={(v) => onStyle(block.id, 'bgGradientTo', v)}
                />
              </Field>
              <Field label="Kąt (°)">
                <Input
                  type="number"
                  min={0}
                  max={360}
                  step={5}
                  value={Number(styles.bgGradientAngle ?? 135)}
                  onChange={(e) => onStyle(block.id, 'bgGradientAngle', Number(e.target.value))}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {opts.padding && (
        <Field label={`${t('page.padding')} (${Number(styles.padding ?? 56)}px)`}>
          <input
            type="range"
            min={0}
            max={160}
            step={4}
            value={Number(styles.padding ?? 56)}
            onChange={(e) => onStyle(block.id, 'padding', Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </Field>
      )}

      {opts.borderRadius && (
        <Field label={`${t('page.borderRadius')} (${Number(styles.borderRadius ?? 24)}px)`}>
          <input
            type="range"
            min={0}
            max={48}
            step={2}
            value={Number(styles.borderRadius ?? 24)}
            onChange={(e) => onStyle(block.id, 'borderRadius', Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </Field>
      )}

      {opts.textAlign && (
        <Field label={t('page.textAlign')}>
          <div className="flex gap-1 rounded-md border border-slate-700/60 bg-slate-950/60 p-0.5">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                onClick={() => onStyle(block.id, 'textAlign', a)}
                className={`flex-1 rounded px-2 py-1 text-xs transition ${
                  (styles.textAlign ?? 'center') === a
                    ? 'bg-indigo-500/30 text-white ring-1 ring-inset ring-indigo-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {a === 'left' ? '⟸' : a === 'center' ? '↔' : '⟹'}
              </button>
            ))}
          </div>
        </Field>
      )}

      {opts.titleColor && (
        <Field label={t('page.titleColor')}>
          <ColorPicker
            value={(styles.titleColor as string) ?? '#0f172a'}
            onChange={(v) => onStyle(block.id, 'titleColor', v)}
          />
        </Field>
      )}

      {opts.textColor && (
        <Field label={t('page.textColor')}>
          <ColorPicker
            value={(styles.textColor as string) ?? '#475569'}
            onChange={(v) => onStyle(block.id, 'textColor', v)}
          />
        </Field>
      )}

      {opts.accentOverride && (
        <Field label={t('page.accentOverride')}>
          <ColorPicker
            value={(styles.accentColor as string) ?? branding.primaryColor}
            onChange={(v) => onStyle(block.id, 'accentColor', v)}
          />
        </Field>
      )}

      {(TEXT_FIELDS[block.type] ?? []).length > 0 && (
        <div className="space-y-2 border-t border-slate-800 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{t('page.typography')}</p>
          {(TEXT_FIELDS[block.type] ?? []).map((f) => (
            <TypographyField key={f.key} block={block} styles={styles} field={f} onStyle={onStyle} />
          ))}
        </div>
      )}

      {Object.keys(opts).length === 0 && (TEXT_FIELDS[block.type] ?? []).length === 0 && (
        <p className="py-6 text-center text-xs text-slate-500">Brak opcji stylu dla tego bloku.</p>
      )}
    </div>
  )
}

// ===================== AdvancedTab =====================
function AdvancedTab({
  block,
  styles,
  blockId,
  onStyle,
  onSetting,
}: {
  block: PageBlock
  styles: Record<string, unknown>
  blockId: string
  onStyle: (id: string, k: string, v: unknown) => void
  onSetting: (id: string, k: string, v: unknown) => void
}) {
  const { t } = useTranslation()
  const anim = (styles.animation as string) ?? 'none'
  const settings = (block.settings ?? {}) as Record<string, unknown>
  // Default: include in nav for sectional blocks (not hero, not spacer).
  const defaultInNav = block.type !== 'hero' && block.type !== 'spacer'
  const inNav = settings.navShow === undefined ? defaultInNav : settings.navShow === true
  const navLabel = (settings.navLabel as string) ?? ''

  return (
    <div className="space-y-3">
      {/* Navigation menu controls */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
          Menu nawigacji
        </p>
        <button
          type="button"
          onClick={() => onSetting(blockId, 'navShow', !inNav)}
          className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${
            inNav ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-slate-800/70 bg-slate-900/40 hover:border-indigo-400/30'
          }`}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
              inNav ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-950/60 text-slate-400'
            }`}
          >
            🧭
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Pokaż w menu na górze strony</p>
            <p className="text-[11px] text-slate-400">
              {inNav ? 'Pojawi się jako klikalny link w pasku nawigacji' : 'Ukryty z menu'}
            </p>
          </div>
          <span
            className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition ${
              inNav ? 'bg-indigo-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white transition ${
                inNav ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>
        {inNav && (
          <div className="mt-2">
            <Field label="Etykieta w menu (opcjonalnie)">
              <Input
                value={navLabel}
                onChange={(e) => onSetting(blockId, 'navLabel', e.target.value)}
                placeholder="domyślnie: tytuł bloku"
              />
            </Field>
          </div>
        )}
      </div>

      <Field label={t('page.animation')}>
        <Select value={anim} onChange={(e) => onStyle(blockId, 'animation', e.target.value)}>
          <option value="none">{t('page.animNone')}</option>
          <option value="fadeIn">{t('page.animFadeIn')}</option>
          <option value="slideUp">{t('page.animSlideUp')}</option>
          <option value="zoomIn">{t('page.animZoomIn')}</option>
        </Select>
      </Field>
      <Field label={t('page.customClass')}>
        <Input
          value={(styles.customClass as string) ?? ''}
          placeholder="my-custom-class"
          onChange={(e) => onStyle(blockId, 'customClass', e.target.value)}
        />
      </Field>
      <p className="text-[11px] text-slate-500">
        Tip: skrót klawiszowy <kbd className="rounded bg-slate-800 px-1 py-0.5 text-[10px]">Ctrl+D</kbd> duplikuje
        zaznaczony blok, <kbd className="rounded bg-slate-800 px-1 py-0.5 text-[10px]">Delete</kbd> kasuje,{' '}
        <kbd className="rounded bg-slate-800 px-1 py-0.5 text-[10px]">Ctrl+Z</kbd> cofa.
      </p>
    </div>
  )
}

// ===================== DropFirst (initial empty state) =====================
function DropFirst({ onInsertNew }: { onInsertNew: (type: string) => void }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setActive(true)
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setActive(false)
        const ty = e.dataTransfer.getData('text/x-block-type')
        if (ty) onInsertNew(ty)
      }}
      className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-16 text-center transition ${
        active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-slate-50 text-slate-500'
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30">
        <Icon name="sparkles" className="h-6 w-6 text-indigo-500" />
      </div>
      <p className="mt-4 text-base font-semibold">{t('page.noBlocks')}</p>
      <p className="mt-1 max-w-sm text-sm">Przeciągnij blok z palety po lewej albo kliknij, żeby dodać pierwszy.</p>
    </div>
  )
}
