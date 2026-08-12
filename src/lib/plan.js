// Plan-building logic. The festival day runs 12:00 → 06:00, so any time
// before 12:00 is treated as belonging to the small hours of the next
// calendar day (i.e. "01:00" sorts after "23:00").

const NOON = 12 * 60

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const mins = h * 60 + m
  return mins < NOON ? mins + 24 * 60 : mins
}

export function formatDuration(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`
  return `${h}h${String(m).padStart(2, '0')}`
}

const MIN_GAP = 30

// Given the selected acts for one day, returns:
// { arrive, finish, items } where items is a chronological list of
// { type: 'act', act, clashesWith: [names] } and { type: 'gap', start, end, duration }
export function buildDayPlan(selectedActs) {
  if (selectedActs.length === 0) return null

  const acts = [...selectedActs].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end)
  )

  const items = []
  let coveredUntil = null // minutes: latest end time seen so far

  for (const act of acts) {
    const start = toMinutes(act.start)
    const end = toMinutes(act.end)

    if (coveredUntil !== null && start - coveredUntil >= MIN_GAP) {
      items.push({
        type: 'gap',
        start: coveredUntil,
        end: start,
        duration: start - coveredUntil,
      })
    }

    const clashesWith = acts
      .filter((other) => other !== act && overlaps(act, other))
      .map((other) => other.name)

    items.push({ type: 'act', act, clashesWith })
    coveredUntil = coveredUntil === null ? end : Math.max(coveredUntil, end)
  }

  return {
    arrive: acts[0].start,
    finish: acts.reduce((latest, a) => (toMinutes(a.end) > toMinutes(latest) ? a.end : latest), acts[0].end),
    items,
  }
}

function overlaps(a, b) {
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end)
}
