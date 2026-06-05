import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeletePhoto, useGallery, useUploadPhoto } from './api'
import { Thumb } from './Thumb'
import { Card } from '../../components/ui'
import { FileButton } from '../../components/FileButton'
import { Icon } from '../../components/Icon'

export function GalleryTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: photos, isLoading } = useGallery(eventId)
  const upload = useUploadPhoto(eventId)
  const del = useDeletePhoto(eventId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

  async function onPick(files: File[]) {
    setUploadProgress({ current: 0, total: files.length })
    for (let i = 0; i < files.length; i++) {
      await upload.mutateAsync(files[i])
      setUploadProgress({ current: i + 1, total: files.length })
    }
    setUploadProgress(null)
  }

  const list = photos ?? []
  const selected = list.find((p) => p.id === selectedId) ?? null

  async function handleDelete(id: string) {
    if (!window.confirm(t('gallery.deleteConfirm'))) return
    await del.mutateAsync(id)
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-1.5">
          <Icon name="image" className="h-3.5 w-3.5 text-indigo-200" />
          <span className="text-sm font-semibold text-white">{t('gallery.title')}</span>
          <span className="rounded-full bg-slate-800/80 px-1.5 text-[10px] text-slate-400">{list.length}</span>
        </div>
        {uploadProgress && (
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-400/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-200 ring-1 ring-inset ring-indigo-400/30">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            {t('gallery.uploading')} {uploadProgress.current}/{uploadProgress.total}
          </span>
        )}
        <div className="ml-auto">
          <FileButton accept="image/*" multiple onSelect={onPick} icon="image" disabled={upload.isPending}>
            {upload.isPending ? '…' : '+ ' + t('gallery.upload')}
          </FileButton>
        </div>
      </div>

      {/* BODY */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl border border-slate-800/70 bg-slate-900/40" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
            <Icon name="image" className="h-6 w-6 text-indigo-200" />
          </div>
          <p className="mt-4 text-sm font-semibold text-white">{t('gallery.empty')}</p>
          <p className="mt-1 max-w-sm text-xs text-slate-400">{t('gallery.emptyHint')}</p>
          <div className="mt-4">
            <FileButton accept="image/*" multiple onSelect={onPick} icon="image">
              + {t('gallery.upload')}
            </FileButton>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Grid */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {list.map((p) => {
              const active = selectedId === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(active ? null : p.id)}
                  className={`group relative aspect-square overflow-hidden rounded-xl border transition ${
                    active
                      ? 'border-indigo-400/60 ring-2 ring-indigo-500/40'
                      : 'border-slate-800/70 hover:border-indigo-400/40'
                  }`}
                >
                  <Thumb path={`/api/events/${eventId}/gallery/${p.id}/file`} alt={p.fileName} />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div className="pointer-events-none absolute bottom-1 left-1 right-1 truncate text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                    {p.fileName}
                  </div>
                  {active && (
                    <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg">
                      <Icon name="check" className="h-3 w-3" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Side panel — detail */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            {selected ? (
              <Card>
                <div className="aspect-square overflow-hidden rounded-xl border border-slate-800/70">
                  <Thumb path={`/api/events/${eventId}/gallery/${selected.id}/file`} alt={selected.fileName} />
                </div>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {t('gallery.fileName')}
                    </p>
                    <p className="truncate text-sm text-white">{selected.fileName}</p>
                  </div>
                </div>
                <div className="mt-3 border-t border-slate-800/80 pt-3">
                  <button
                    onClick={() => handleDelete(selected.id)}
                    disabled={del.isPending}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    ✕ {t('gallery.delete')}
                  </button>
                </div>
              </Card>
            ) : (
              <Card className="flex flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-inset ring-indigo-400/30">
                  <Icon name="image" className="h-5 w-5 text-indigo-200" />
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {list.length} {t('gallery.photos')}
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
