# Selectors 10 Planner

A day planner for the Selectors 10 festival (20–24 August 2026). Pick the acts you
want to see and it builds a plan for each day: what time to arrive, when you'll
finish, where the free-time gaps are (30 minutes or longer), and which of your
picks clash.

The full lineup is included — all five stages (Beach Bar, Magnolia, Beach Main,
Voodoo, The Nest), the boat parties, and the Barberellas late-night slots.
Selections are saved in your browser, so your plan survives a refresh.

> **Note:** set times were transcribed from the lineup poster and are
> approximate. Double-check against the official app on the day. To correct a
> time, edit `src/data/lineup.js`.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

## How the plan works

- The festival day runs 12:00 → 06:00, so sets after midnight (e.g. 01:00) sort
  after evening sets rather than before them.
- **Arrive by** is the start of your earliest pick; **Finish** is the end of your
  latest one.
- Gaps of 30+ minutes between your picks show up as free time; shorter
  transitions are ignored.
- Overlapping picks are both kept in the plan and highlighted as a clash — you
  decide on the day.
