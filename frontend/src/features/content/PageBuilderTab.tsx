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
import { RenderBlock, type BlockContext } from './EventBlocks'
import { ALL_BLOCK_TYPES, blockIcon, blockLabel } from './blockMeta'
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui'
import type { BrandingDto, PageBlock, PageDto } from '../../types/api'

const TEMPLATES = ['gala', 'konferencja', 'integracja', 'premiera', 'blank']

const FIELDS: Record<string, { key: string; label: string; multiline?: boolean; placeholder?: string }[]> = {
  hero: [
    { key: 'subtitle', label: 'Nadtytuł (mały tekst nad nazwą)' },
    { key: 'title', label: 'Tytuł główny' },
    { key: 'dateLabel', label: 'Data / etykieta' },
    { key: 'location', label: 'Miejsce' },
    { key: 'ctaLabel', label: 'Tekst przycisku' },
    { key: 'ctaUrl', label: 'Link przycisku' },
    { key: 'bgImageUrl', label: 'URL obrazu w tle (opcjonalnie)' },
  ],
  description: [
    { key: 'title', label: 'Tytuł sekcji' },
    { key: 'body', label: 'Treść', multiline: true },
  ],
  agenda: [{ key: 'title', label: 'Tytuł sekcji' }],
  gallery: [{ key: 'title', label: 'Tytuł sekcji' }],
  countdown: [{ key: 'title', label: 'Tytuł nad licznikiem' }],
  map: [
    { key: 'title', label: 'Tytuł sekcji' },
    { key: 'address', label: 'Adres (Google Maps)' },
  ],
  video: [
    { key: 'title', label: 'Tytuł sekcji' },
    { key: 'youtubeUrl', label: 'Link YouTube' },
  ],
  cta: [
    { key: 'title', label: 'Nagłówek' },
    { key: 'body', label: 'Opis', multiline: true },
    { key: 'buttonLabel', label: 'Tekst przycisku' },
    { key: 'buttonUrl', label: 'Link przycisku' },
  ],
  sponsors: [{ key: 'title', label: 'Tytuł sekcji' }],
  faq: [{ key: 'title', label: 'Tytuł sekcji' }],
  team: [{ key: 'title', label: 'Tytuł sekcji' }],
  spacer: [],
}

export function PageBuilderTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: page, isLoading } = usePage(eventId)

  if (isLoading || !page) {
    return <p className="text-slate-500">{t('common.loading')}</p>
  }

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
  const [showPalette, setShowPalette] = useState(false)
  const [showBranding, setShowBranding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const selected = blocks.find((b) => b.id === selectedId) ?? null
  const visibleBlocks = useMemo(() => blocks.filter((b) => b.visible !== false), [blocks])

  function patchBlock(id: string, fn: (b: PageBlock) => PageBlock) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? fn(b) : b)))
  }

  function addBlock(type: string) {
    const id = crypto.randomUUID()
    setBlocks((prev) => [
      ...prev,
      {
        id,
        type,
        order: prev.length,
        visible: true,
        settings: type === 'spacer' ? { height: 32 } : {},
        content: { pl: {}, en: {} },
        styles: {},
      },
    ])
    setSelectedId(id)
    setShowPalette(false)
  }

  function setText(id: string, key: string, value: string) {
    patchBlock(id, (b) => ({
      ...b,
      content: { ...b.content, [lang]: { ...(b.content[lang] ?? {}), [key]: value } },
    }))
  }

  function reorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    setBlocks((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
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
    const result = await publish.mutateAsync()
    setMessage(t('page.published', { version: result.publishedVersion }))
  }

  async function handleTemplate(key: string) {
    const result = await applyTemplate.mutateAsync(key)
    setBlocks(result.content.blocks ?? [])
    setBranding(result.branding)
    setSelectedId(result.content.blocks?.[0]?.id ?? null)
    setMessage(null)
  }

  async function handleRestore(version: number) {
    const result = await restore.mutateAsync(version)
    setBlocks(result.content.blocks ?? [])
    setBranding(result.branding)
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

      {/* MAIN: block list + selected fields + live preview */}
      <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">{t('page.blocks')}</h3>
              <Button variant="subtle" onClick={() => setShowPalette((v) => !v)}>
                + {t('page.addBlock')}
              </Button>
            </div>

            {showPalette && (
              <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                {ALL_BLOCK_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="flex flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-3 text-xs text-slate-200 transition hover:border-indigo-400/40 hover:bg-slate-800"
                  >
                    <span className="text-xl">{blockIcon(type)}</span>
                    <span className="text-center leading-tight">{blockLabel(type, lang)}</span>
                  </button>
                ))}
              </div>
            )}

            <ul className="space-y-1.5">
              {blocks.map((block, i) => {
                const isSel = selectedId === block.id
                const isDragOver = dragOverId === block.id
                return (
                  <li
                    key={block.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(i))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverId(block.id)
                    }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOverId(null)
                      const from = Number(e.dataTransfer.getData('text/plain'))
                      if (!Number.isNaN(from)) reorder(from, i)
                    }}
                    onClick={() => setSelectedId(block.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                      isSel
                        ? 'border-indigo-400/50 bg-indigo-500/10'
                        : isDragOver
                          ? 'border-indigo-400/60 bg-indigo-500/5'
                          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900'
                    } ${block.visible === false ? 'opacity-50' : ''}`}
                  >
                    <span className="cursor-grab select-none text-slate-500" title="Przeciągnij" aria-hidden>
                      ⋮⋮
                    </span>
                    <span className="text-lg" aria-hidden>
                      {blockIcon(block.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{blockLabel(block.type, lang)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {block.content?.[lang]?.title ?? block.content?.pl?.title ?? '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        patchBlock(block.id, (b) => ({ ...b, visible: b.visible === false ? true : false }))
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      aria-label={t('page.toggleVisible')}
                    >
                      {block.visible === false ? '🚫' : '👁'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteBlock(block.id)
                      }}
                      className="rounded p-1 text-rose-400 hover:bg-rose-500/10"
                      aria-label={t('agenda.delete')}
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
              {blocks.length === 0 && (
                <li className="rounded-lg border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
                  {t('page.noBlocks')}
                </li>
              )}
            </ul>
          </Card>

          {selected && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">{blockIcon(selected.type)}</span>
                <h3 className="text-base font-semibold text-white">{blockLabel(selected.type, lang)}</h3>
                <span className="ml-auto text-xs text-slate-500">{lang.toUpperCase()}</span>
              </div>
              <div className="space-y-3">
                {selected.type === 'spacer' ? (
                  <Field label="Wysokość (px)">
                    <Input
                      type="number"
                      min={4}
                      max={400}
                      value={Number((selected.settings as { height?: number })?.height ?? 32)}
                      onChange={(e) =>
                        patchBlock(selected.id, (b) => ({
                          ...b,
                          settings: { ...b.settings, height: Number(e.target.value) },
                        }))
                      }
                    />
                  </Field>
                ) : (
                  (FIELDS[selected.type] ?? []).map((field) => {
                    const value = selected.content?.[lang]?.[field.key] ?? ''
                    return (
                      <Field key={field.key} label={field.label}>
                        {field.multiline ? (
                          <textarea
                            value={value}
                            placeholder={field.placeholder}
                            onChange={(e) => setText(selected.id, field.key, e.target.value)}
                            className="w-full rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20"
                            rows={4}
                          />
                        ) : (
                          <Input
                            value={value}
                            placeholder={field.placeholder}
                            onChange={(e) => setText(selected.id, field.key, e.target.value)}
                          />
                        )}
                      </Field>
                    )
                  })
                )}
              </div>
            </Card>
          )}

          {versions && versions.length > 0 && (
            <Card>
              <h3 className="mb-3 text-base font-semibold text-white">{t('page.versions')}</h3>
              <ul className="space-y-1 text-sm">
                {versions.map((v) => (
                  <li key={v.version} className="flex items-center justify-between">
                    <span className="text-slate-300">
                      v{v.version} · <span className="text-slate-500">{new Date(v.publishedAt).toLocaleString()}</span>
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

        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <h3 className="text-sm font-semibold text-slate-300">{t('page.preview')}</h3>
            <span className="text-xs text-slate-500">{lang.toUpperCase()}</span>
          </div>
          <div
            className="space-y-5 rounded-2xl bg-slate-950/60 p-4"
            style={{ fontFamily: branding.fontFamily }}
          >
            {visibleBlocks.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">{t('page.noBlocks')}</p>
            ) : (
              visibleBlocks.map((b) => <RenderBlock key={b.id} block={b} ctx={ctx} />)
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
