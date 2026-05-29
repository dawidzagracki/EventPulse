import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  contestRanking,
  quizRanking,
  useAddQuestion,
  useContests,
  useCreateContest,
  useCreateQuiz,
  useQuizzes,
} from './api'
import { Button, Card, Field, Input } from '../../components/ui'
import type { RankingEntry } from '../../types/api'

export function EngagementTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: contests } = useContests(eventId)
  const { data: quizzes } = useQuizzes(eventId)
  const createContest = useCreateContest(eventId)
  const createQuiz = useCreateQuiz(eventId)
  const addQuestion = useAddQuestion(eventId)

  const [contestName, setContestName] = useState('')
  const [contestMode, setContestMode] = useState(0)
  const [quizTitle, setQuizTitle] = useState('')
  const [ranking, setRanking] = useState<{ title: string; rows: RankingEntry[] } | null>(null)

  // Add-question form state, keyed by quiz id.
  const [qText, setQText] = useState('')
  const [qOptions, setQOptions] = useState('')
  const [qCorrect, setQCorrect] = useState(0)
  const [qQuizId, setQQuizId] = useState('')

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-3 font-semibold">{t('engagement.contests')}</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await createContest.mutateAsync({ name: contestName, mode: contestMode })
            setContestName('')
          }}
          className="mb-3 flex flex-wrap items-end gap-2"
        >
          <Field label={t('engagement.name')}>
            <Input value={contestName} onChange={(e) => setContestName(e.target.value)} required />
          </Field>
          <select
            value={contestMode}
            onChange={(e) => setContestMode(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={0}>{t('engagement.points')}</option>
            <option value={1}>{t('engagement.time')}</option>
          </select>
          <Button type="submit">{t('common.create')}</Button>
        </form>
        <ul className="space-y-1 text-sm">
          {(contests ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between">
              <span>{c.name}</span>
              <Button
                variant="ghost"
                onClick={async () => setRanking({ title: c.name, rows: await contestRanking(eventId, c.id) })}
              >
                {t('engagement.ranking')}
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">{t('engagement.quizzes')}</h3>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await createQuiz.mutateAsync({ title: quizTitle })
            setQuizTitle('')
          }}
          className="mb-3 flex items-end gap-2"
        >
          <Field label={t('engagement.quizTitle')}>
            <Input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} required />
          </Field>
          <Button type="submit">{t('common.create')}</Button>
        </form>
        <ul className="space-y-1 text-sm">
          {(quizzes ?? []).map((q) => (
            <li key={q.id} className="flex items-center justify-between">
              <span>{q.title}</span>
              <span className="flex gap-1">
                <Button variant="ghost" onClick={() => setQQuizId(q.id)}>
                  {t('engagement.addQuestion')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => setRanking({ title: q.title, rows: await quizRanking(eventId, q.id) })}
                >
                  {t('engagement.ranking')}
                </Button>
              </span>
            </li>
          ))}
        </ul>

        {qQuizId && (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await addQuestion.mutateAsync({
                quizId: qQuizId,
                text: qText,
                options: qOptions.split('|').map((o) => o.trim()).filter(Boolean),
                correctIndex: qCorrect,
              })
              setQText('')
              setQOptions('')
              setQCorrect(0)
            }}
            className="mt-3 space-y-2 border-t border-slate-100 pt-3"
          >
            <Field label={t('engagement.question')}>
              <Input value={qText} onChange={(e) => setQText(e.target.value)} required />
            </Field>
            <Field label={t('engagement.optionsHint')}>
              <Input value={qOptions} onChange={(e) => setQOptions(e.target.value)} placeholder="A | B | C" required />
            </Field>
            <Field label={t('engagement.correctIndex')}>
              <Input type="number" min={0} value={qCorrect} onChange={(e) => setQCorrect(Number(e.target.value))} />
            </Field>
            <Button type="submit">{t('common.save')}</Button>
          </form>
        )}
      </Card>

      {ranking && (
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-semibold">
            {t('engagement.ranking')}: {ranking.title}
          </h3>
          <ol className="space-y-1 text-sm">
            {ranking.rows.map((r) => (
              <li key={r.rank} className="flex justify-between">
                <span>
                  {r.rank}. {r.name}
                </span>
                <span className="font-medium">{r.score}</span>
              </li>
            ))}
            {ranking.rows.length === 0 && <li className="text-slate-500">—</li>}
          </ol>
        </Card>
      )}
    </div>
  )
}
