import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useApplyTemplate,
  usePage,
  usePublish,
  useRestoreVersion,
  useSaveDraft,
  useUpdateBranding,
  useVersions,
} from './api'
import { useEvent } from '../events/api'
import { DropZone, EditorFrame, RenderBlock, type BlockContext } from './EventBlocks'
import { ALL_BLOCK_TYPES, blockIcon, blockLabel } from './blockMeta'
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui'
import type { BrandingDto, PageBlock, PageDto } from '../../types/api'

const TEMPLATES = ['gala', 'konferencja', 'integracja', 'premiera', 'blank']

// Non-text fields edited via the side panel (URLs, addresses, spacer height, etc.)
const SETTINGS_FIELDS: Record<string, { key: string; label: string }[]> = {
  hero: [
    { key: 'ctaUrl', label: 'Link przycisku' },
    { key: 'bgImageUrl', label: 'URL obrazu w tle' },
  ],
  map: [{ key: 'address', label: 'Adres (Google Maps)' }],
  video: [{ key: 'youtubeUrl', label: 'Link YouTube' }],
  cta: [{ key: 'buttonUrl', label: 'Link przycisku' }],
}

export function PageBuilderTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: page, isLoading } = usePage(eventId)
  if (isLoading || !page) return <p className="text-slate-500">{t('common.loading')}</p>
  return <Editor key={eventId} eventId={eventId} page={page} />
}

function Editor({ eventId, page }: { eventId: string; page: PageDto }) {
  const { t } = useTranslation()
  const save = useSaveDraft(eventId)
  const applyTemplate = useApplyTemplate(eventId)
  const updateBranding = useUpdateBranding(eventId)
  const publish = usePublish(eventId)
  const restore = useRestoreVersion(eventId)
  const { data: versions } = useVersions(eventId)
  const { data: event } = useEvent(eventId)

  const [blocks, setBlocks] = useState<PageBlock[]>(page.content.blocks ?? [])
  const [branding, setBranding] = useState<BrandingDto>(page.branding)
  const [lang, setLang] = useState<'pl' | 'en'>('pl')
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null)
  const [showBranding, setShowBranding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const selected = blocks.find((b) => b.id === selectedId) ?? null
  const visibleBlocks = useMemo(() => blocks.filter((b) => b.visible !== false), [blocks])

  function patchBlock(id: string, fn: (b: PageBlock) => PageBlock) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? fn(b) : b)))
  }

  function setText(blockId: string, key: string, value: string) {
    patchBlock(blockId, (b) => ({
      ...b,
      content: { ...b.content, [lang]: { ...(b.content[lang] ?? {}), [key]: value } },
    }))
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
    setBlocks((prev) => [...prev, b])
    setSelectedId(b.id)
  }

  function insertBlockAt(type: string, index: number) {
    const b = newBlock(type)
    setBlocks((prev) => {
      const next = [...prev]
      next.splice(index, 0, b)
      return next
    })
    setSelectedId(b.id)
  }

  function reorder(from: number, to: number) {
    if (from === to) return
    setBlocks((prev) => {
      const next = [...prev]
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      return next
    })
  }

  function moveSelected(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function reindexed() {
    return { blocks: blocks.map((b, i) => ({ ...b, order: i })) }
  }

  async function handleSave() {
    await save.mutateAsync(reindexed())
    setMessage(t('page.saved'))
  }

  async function handlePublish() {
    await save.mutateAsync(reindexed())
    const r = await publish.mutateAsync()
    setMessage(t('page.published', { version: r.publishedVersion }))
  }

  async function handleTemplate(key: string) {
    const r = await applyTemplate.mutateAsync(key)
    setBlocks(r.content.blocks ?? [])
    setBranding(r.branding)
    setSelectedId(r.content.blocks?.[0]?.id ?? null)
  }

  async function handleRestore(version: number) {
    const r = await restore.mutateAsync(version)
    setBlocks(r.content.blocks ?? [])
    setBranding(r.branding)
    setMessage(t('page.restored', { version }))
  }

  async function handleBranding() {
    await updateBranding.mutateAsync(branding)
    setMessage(t('page.saved'))
  }

  const ctx: BlockContext = {
    eventId,
    branding,
    lang,
    agenda: [],
    galleryUrls: [],
    startsAt: event?.startsAt,
    edit: { onTextChange: setText },
  }

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto flex items-center gap-2">
            <Badge tone={page.hasPublished ? 'success' : 'warning'}>
              {page.hasPublished
                ? t('page.publishedVersion', { version: page.publishedVersion })
                : t('page.notPublished')}
            </Badge>
            {message && <span className="text-sm text-emerald-300">{message}</span>}
          </div>

          <Select value={lang} onChange={(e) => setLang(e.target.value as 'pl' | 'en')} className="w-24">
            <option value="pl">PL</option>
            <option value="en">EN</option>
          </Select>

          <Select
            value=""
            onChange={(e) => {
              if (e.target.value) void handleTemplate(e.target.value)
              e.currentTarget.value = ''
            }}
            className="w-44"
          >
            <option value="">{t('page.template')}…</option>
            {TEMPLATES.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>

          <Button variant="subtle" onClick={() => setShowBranding((v) => !v)}>
            {t('page.branding')}
          </Button>
          <Button variant="subtle" onClick={handleSave} disabled={save.isPending}>
            {t('page.saveDraft')}
          </Button>
          <Button onClick={handlePublish} disabled={publish.isPending || save.isPending}>
            {t('page.publish')}
          </Button>
          {page.hasPublished && (
            <a
              href={`/public/events/${eventId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              {t('page.openPublic')}
            </a>
          )}
        </div>

        {showBranding && (
          <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-3">
            <Field label={t('page.primaryColor')}>
              <Input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
              />
            </Field>
            <Field label={t('page.accentColor')}>
              <Input
                type="color"
                value={branding.accentColor}
                onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
              />
            </Field>
            <Field label={t('page.logoUrl')}>
              <Input
                value={branding.logoUrl ?? ''}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value || null })}
              />
            </Field>
            <div className="sm:col-span-3">
              <Button variant="subtle" onClick={handleBranding} disabled={updateBranding.isPending}>
                {t('page.saveBranding')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* MAIN: palette + canvas */}
      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        {/* Palette */}
        <div className="space-y-4">
          <Card className="p-3">
            <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('page.addBlock')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {ALL_BLOCK_TYPES.map((type) => (
                <button
                  key={type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/x-block-type', type)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => appendBlock(type)}
                  className="flex cursor-grab flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-3 text-xs text-slate-200 transition hover:border-indigo-400/40 hover:bg-slate-900"
                  title="Przeciągnij na podgląd lub kliknij, żeby dodać na końcu"
                >
                  <span className="text-2xl">{blockIcon(type)}</span>
                  <span className="text-center leading-tight">{blockLabel(type, lang)}</span>
                </button>
              ))}
            </div>
          </Card>

          {selected && (SETTINGS_FIELDS[selected.type] ?? []).length > 0 && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
                <span className="text-xl">{blockIcon(selected.type)}</span>
                {blockLabel(selected.type, lang)}
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                Tekst edytujesz klikając w niego na podglądzie po prawej. Tutaj — linki i ustawienia.
              </p>
              <div className="space-y-3">
                {(SETTINGS_FIELDS[selected.type] ?? []).map((f) => (
                  <Field key={f.key} label={f.label}>
                    <Input
                      value={(selected.content?.[lang]?.[f.key] ?? '') as string}
                      onChange={(e) => setText(selected.id, f.key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </Card>
          )}

          {selected?.type === 'spacer' && (
            <Card>
              <Field label="Wysokość odstępu (px)">
                <Input
                  type="number"
                  min={4}
                  max={400}
                  value={Number((selected.settings as { height?: number })?.height ?? 48)}
                  onChange={(e) =>
                    patchBlock(selected.id, (b) => ({
                      ...b,
                      settings: { ...b.settings, height: Number(e.target.value) },
                    }))
                  }
                />
              </Field>
            </Card>
          )}

          {versions && versions.length > 0 && (
            <Card>
              <h3 className="mb-3 text-base font-semibold text-white">{t('page.versions')}</h3>
              <ul className="space-y-1 text-sm">
                {versions.map((v) => (
                  <li key={v.version} className="flex items-center justify-between">
                    <span className="text-slate-300">
                      v{v.version} ·{' '}
                      <span className="text-slate-500">{new Date(v.publishedAt).toLocaleString()}</span>
                    </span>
                    <Button variant="ghost" onClick={() => handleRestore(v.version)}>
                      {t('page.restore')}
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* CANVAS — light, marketing-grade preview with inline editing */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 p-3">
          <div className="mb-3 flex items-center justify-between px-2">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Klikaj tekst, by edytować · Przeciągaj bloki, by zmienić kolejność · Upuść z palety, by wstawić
            </p>
            <span className="text-xs text-slate-500">{lang.toUpperCase()}</span>
          </div>
          <div
            className="space-y-3 rounded-2xl bg-[#fbfbfd] p-6 text-slate-900 shadow-inner"
            style={{ fontFamily: branding.fontFamily }}
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
                      onMove={(dir) => moveSelected(b.id, dir)}
                      onDelete={() => deleteBlock(b.id)}
                      onToggleVisible={() =>
                        patchBlock(b.id, (block) => ({ ...block, visible: block.visible === false }))
                      }
                    >
                      {b.visible === false ? (
                        <div className="rounded-3xl bg-slate-100 p-8 text-center text-slate-400">
                          {blockLabel(b.type, lang)} — ukryty
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

            {/* Hidden blocks listed for awareness (visible items already rendered above) */}
            {visibleBlocks.length === 0 && blocks.length === 0 && (
              <p className="py-16 text-center text-slate-400">{t('page.noBlocks')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DropFirst({ onInsertNew }: { onInsertNew: (type: string) => void }) {
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
        const t = e.dataTransfer.getData('text/x-block-type')
        if (t) onInsertNew(t)
      }}
      className={`rounded-3xl border-2 border-dashed p-16 text-center transition ${
        active
          ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
          : 'border-slate-300 bg-slate-50 text-slate-400'
      }`}
    >
      Przeciągnij blok z palety albo kliknij blok po lewej, żeby zacząć
    </div>
  )
}
