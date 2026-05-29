import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { Button, Card, Input } from '../../components/ui'

export function AiAssistantSection() {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setBusy(true)
    try {
      const res = await api.post<{ reply: string }>('/api/me/ai/chat', { message })
      setReply(res.data.reply)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('ai.title')}</h2>
      <form onSubmit={ask} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('ai.placeholder')}
          aria-label={t('ai.title')}
        />
        <Button type="submit" disabled={busy}>
          {busy ? t('common.loading') : t('ai.send')}
        </Button>
      </form>
      {reply && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{reply}</p>}
    </Card>
  )
}
