import { useEffect, useMemo, useState } from 'react'
import { ACTS, DAYS, STAGE_ORDER } from './data/lineup.js'
import { buildDayPlan, formatDuration, toHHMM, MINOR_CLASH } from './lib/plan.js'
import './App.css'

const STORAGE_KEY = 'selectors10-picks'

function loadPicks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function TimelineAct({ item, isFlipped, onFlip, onRemove }) {
  const { act, clashesWith } = item
  const hasClash = clashesWith.length > 0
  const severity = hasClash
    ? clashesWith.some((c) => c.duration > MINOR_CLASH)
      ? 'major'
      : 'minor'
    : null

  const front = (
    <>
      <span className="tl-time">
        {act.start}–{act.end}
        {hasClash && (
          <span className={`tl-warn ${severity}`} aria-hidden="true">
            ⚠
          </span>
        )}
      </span>
      <span className="tl-body">
        <span className="tl-name">{act.name}</span>
        <span className="tl-stage">{act.stage}</span>
        {act.detail && <span className="tl-detail">{act.detail}</span>}
      </span>
      <button
        className="tl-remove"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        aria-label={`Remove ${act.name}`}
        title="Remove from plan"
      >
        ×
      </button>
    </>
  )

  if (!hasClash) {
    return <li className={`timeline-act kind-${act.kind}`}>{front}</li>
  }

  return (
    <li
      className={`timeline-act flip-card kind-${act.kind} clash-${severity} ${
        isFlipped ? 'flipped' : ''
      }`}
    >
      <div
        className="flip-inner"
        role="button"
        tabIndex={0}
        aria-expanded={isFlipped}
        aria-label={`${act.name} overlaps ${clashesWith.length} of your picks — press to see details`}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onFlip()
          }
        }}
      >
        <div className="flip-face flip-front">{front}</div>
        <div className="flip-face flip-back">
          <span className="tl-time">
            {act.start}–{act.end}
          </span>
          <span className="tl-body">
            <span className="back-title">{act.name} overlaps</span>
            {clashesWith.map((clash) => (
              <span
                key={clash.name}
                className={`tl-clash ${clash.duration > MINOR_CLASH ? '' : 'minor'}`}
              >
                {clash.name} — {formatDuration(clash.duration)} ({toHHMM(clash.start)}–
                {toHHMM(clash.end)})
              </span>
            ))}
            <span className="back-hint">tap to flip back</span>
          </span>
        </div>
      </div>
    </li>
  )
}

export default function App() {
  const [dayId, setDayId] = useState(DAYS[0].id)
  const [picks, setPicks] = useState(loadPicks)
  const [flipped, setFlipped] = useState(() => new Set())

  const toggleFlip = (id) => {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...picks]))
  }, [picks])

  const togglePick = (id) => {
    setPicks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const day = DAYS.find((d) => d.id === dayId)
  const dayActs = useMemo(() => ACTS.filter((a) => a.day === dayId), [dayId])
  const selectedDayActs = dayActs.filter((a) => picks.has(a.id))
  const plan = buildDayPlan(selectedDayActs)

  const stages = STAGE_ORDER.filter((stage) => dayActs.some((a) => a.stage === stage))
  const pickCountFor = (id) => ACTS.filter((a) => a.day === id && picks.has(a.id)).length

  return (
    <div className="app">
      <header className="header">
        <h1>
          <span className="logo">Selectors 10</span>
          <span className="dates">20–24 August 2026</span>
        </h1>
        <p className="tagline">
          Pick your acts, get a day plan. Times are read off the poster — double-check set times in
          the official app on the day.
        </p>
      </header>

      <nav className="day-tabs">
        {DAYS.map((d) => {
          const count = pickCountFor(d.id)
          return (
            <button
              key={d.id}
              className={`day-tab ${d.id === dayId ? 'active' : ''}`}
              onClick={() => setDayId(d.id)}
            >
              <span className="day-name">{d.label}</span>
              <span className="day-date">{d.date}</span>
              {count > 0 && <span className="day-count">{count}</span>}
            </button>
          )
        })}
      </nav>

      <main className="layout">
        <section className="lineup">
          {stages.map((stage) => (
            <div key={stage} className="stage-block">
              <h2 className="stage-name">{stage}</h2>
              <div className="acts">
                {dayActs
                  .filter((a) => a.stage === stage)
                  .map((act) => (
                    <button
                      key={act.id}
                      className={`act kind-${act.kind} ${picks.has(act.id) ? 'picked' : ''}`}
                      onClick={() => togglePick(act.id)}
                      aria-pressed={picks.has(act.id)}
                    >
                      <span className="act-time">
                        {act.start}–{act.end}
                      </span>
                      <span className="act-name">{act.name}</span>
                      {act.detail && <span className="act-detail">{act.detail}</span>}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </section>

        <aside className="plan">
          <h2 className="plan-title">
            Your {day.label} <span className="plan-date">{day.date}</span>
          </h2>

          {!plan ? (
            <p className="plan-empty">
              Nothing picked yet — tap acts on the left to build your day.
            </p>
          ) : (
            <>
              <div className="plan-summary">
                <div className="summary-item">
                  <span className="summary-label">Arrive by</span>
                  <span className="summary-value">{plan.arrive}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Finish</span>
                  <span className="summary-value">{plan.finish}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Acts</span>
                  <span className="summary-value">{selectedDayActs.length}</span>
                </div>
              </div>

              <ol className="timeline">
                {plan.items.map((item, i) =>
                  item.type === 'gap' ? (
                    <li key={`gap-${i}`} className="timeline-gap">
                      <span className="gap-label">
                        Free time — {formatDuration(item.duration)}
                      </span>
                    </li>
                  ) : (
                    <TimelineAct
                      key={item.act.id}
                      item={item}
                      isFlipped={flipped.has(item.act.id)}
                      onFlip={() => toggleFlip(item.act.id)}
                      onRemove={() => togglePick(item.act.id)}
                    />
                  )
                )}
              </ol>
            </>
          )}
        </aside>
      </main>
    </div>
  )
}
