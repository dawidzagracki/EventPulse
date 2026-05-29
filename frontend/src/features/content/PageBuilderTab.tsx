import { useState } from 'react'
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
import { Button, Card, Field, Input } from '../../components/ui'
import type { BrandingDto, PageBlock, PageDto } from '../../types/api'

const BLOCK_TYPES = [
  'hero',
  'description',
  'agenda',
  'map',
  'gallery',
  'sponsors',
  'countdown',
  'faq',
  'team',
  'video',
  'cta',
  'spacer',
]

const TEMPLATES = ['gala', 'konferencja', 'integracja', 'premiera', 'blank']

const TEXTABLE = new Set(['hero', 'description', 'cta'])

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

  const [blocks, setBlocks] = useState<PageBlock[]>(page.content.blocks ?? [])
  const [branding, setBranding] = useState<BrandingDto>(page.branding)
  const [lang, setLang] = useState<'pl' | 'en'>('pl')
  const [message, setMessage] = useState<string | null>(null)

  function patchBlock(id: string, patch: (b: PageBlock) => PageBlock) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? patch(b) : b)))
  }

  function addBlock(type: string) {
    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        order: prev.length,
        visible: true,
        settings: {},
        content: { pl: {}, en: {} },
        styles: {},
      },
    ])
  }

  function move(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function setText(id: string, key: string, value: string) {
    patchBlock(id, (b) => ({ ...b, content: { ...b.content, [lang]: { ...b.content[lang], [key]: value } } }))
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

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-sm text-slate-500">
            {page.hasPublished ? t('page.publishedVersion', { version: page.publishedVersion }) : t('page.notPublished')}
          </span>
          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            {(['pl', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 text-xs uppercase ${lang === l ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={handleSave} disabled={save.isPending}>
            {t('page.saveDraft')}
          </Button>
          <Button onClick={handlePublish} disabled={publish.isPending || save.isPending}>
            {t('page.publish')}
          </Button>
        </div>
        {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">{t('page.template')}:</span>
          {TEMPLATES.map((key) => (
            <Button key={key} variant="ghost" onClick={() => handleTemplate(key)}>
              {key}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 font-semibold">{t('page.blocks')}</h3>
            <div className="mb-3 flex flex-wrap gap-1">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                >
                  + {type}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {blocks.map((block, i) => (
                <div key={block.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase">{block.type}</span>
                    <div className="ml-auto flex gap-1">
                      <button onClick={() => move(block.id, -1)} disabled={i === 0} className="px-1 disabled:opacity-30">
                        ↑
                      </button>
                      <button
                        onClick={() => move(block.id, 1)}
                        disabled={i === blocks.length - 1}
                        className="px-1 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => patchBlock(block.id, (b) => ({ ...b, visible: !b.visible }))}
                        className="px-1"
                        title={t('page.toggleVisible')}
                      >
                        {block.visible ? '👁' : '🚫'}
                      </button>
                      <button
                        onClick={() => setBlocks((prev) => prev.filter((b) => b.id !== block.id))}
                        className="px-1 text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <Input
                    placeholder={t('page.blockTitle')}
                    value={block.content[lang]?.title ?? ''}
                    onChange={(e) => setText(block.id, 'title', e.target.value)}
                  />
                  {TEXTABLE.has(block.type) && (
                    <Input
                      className="mt-2"
                      placeholder={t('page.blockText')}
                      value={block.content[lang]?.text ?? ''}
                      onChange={(e) => setText(block.id, 'text', e.target.value)}
                    />
                  )}
                </div>
              ))}
              {blocks.length === 0 && <p className="text-sm text-slate-500">{t('page.noBlocks')}</p>}
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 font-semibold">{t('page.branding')}</h3>
            <div className="grid grid-cols-2 gap-3">
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
              <div className="col-span-2">
                <Field label={t('page.logoUrl')}>
                  <Input
                    value={branding.logoUrl ?? ''}
                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value || null })}
                  />
                </Field>
              </div>
            </div>
            <Button className="mt-3" variant="ghost" onClick={handleBranding} disabled={updateBranding.isPending}>
              {t('page.saveBranding')}
            </Button>
          </Card>

          {versions && versions.length > 0 && (
            <Card>
              <h3 className="mb-3 font-semibold">{t('page.versions')}</h3>
              <ul className="space-y-1 text-sm">
                {versions.map((v) => (
                  <li key={v.version} className="flex items-center justify-between">
                    <span>
                      v{v.version} · {new Date(v.publishedAt).toLocaleString()}
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

        <Card>
          <h3 className="mb-3 font-semibold">{t('page.preview')}</h3>
          <div className="space-y-3" style={{ fontFamily: branding.fontFamily }}>
            {blocks
              .filter((b) => b.visible)
              .map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-slate-100 p-4"
                  style={{ borderLeft: `4px solid ${branding.primaryColor}` }}
                >
                  <p className="text-xs uppercase text-slate-400">{b.type}</p>
                  <p className="font-semibold">{b.content[lang]?.title || `(${b.type})`}</p>
                  {b.content[lang]?.text && <p className="text-sm text-slate-600">{b.content[lang].text}</p>}
                </div>
              ))}
            {blocks.filter((b) => b.visible).length === 0 && (
              <p className="text-sm text-slate-500">{t('page.noBlocks')}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
