import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeletePhoto, useGallery, useUploadPhoto } from './api'
import { Thumb } from './Thumb'
import { Card } from '../../components/ui'

export function GalleryTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: photos, isLoading } = useGallery(eventId)
  const upload = useUploadPhoto(eventId)
  const del = useDeletePhoto(eventId)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    for (const f of files) {
      await upload.mutateAsync(f)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('gallery.title')}</h3>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} className="text-sm" />
        </div>
      </Card>

      {isLoading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : (photos ?? []).length === 0 ? (
        <Card>
          <p className="text-slate-500">{t('gallery.empty')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {(photos ?? []).map((p) => (
            <div key={p.id} className="space-y-1">
              <Thumb path={`/api/events/${eventId}/gallery/${p.id}/file`} alt={p.fileName} />
              <button
                onClick={() => del.mutate(p.id)}
                className="w-full text-xs text-red-600 hover:underline"
              >
                {t('agenda.delete')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
