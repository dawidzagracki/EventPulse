import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { exchangeToken } from './api'
import { useAuthStore } from '../../stores/authStore'
import { Card } from '../../components/ui'

export function ParticipantTokenPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const setParticipant = useAuthStore((s) => s.setParticipant)
  const [error, setError] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    exchangeToken(token)
      .then((result) => {
        setParticipant(result, token)
        if (result.language) void i18n.changeLanguage(result.language)
        navigate('/me', { replace: true })
      })
      .catch(() => setError(true))
  }, [token, navigate, setParticipant, i18n])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-sm text-center">
        {error ? <p className="text-red-600">{t('participant.invalidLink')}</p> : <p>{t('common.loading')}</p>}
      </Card>
    </div>
  )
}
