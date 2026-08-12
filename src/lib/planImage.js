// Renders a day plan to a shareable PNG. The image is drawn from scratch on a
// canvas (not screenshotted from the DOM) so it stays crisp and poster-like.
import { formatDuration, toHHMM, MINOR_CLASH } from './plan.js'

const SCALE = 2
const W = 720
const PAD = 28
const CARD_PAD = 14
const STRIPE = 6
const ITEM_GAP = 10

const COLORS = {
  cream: '#f8e7c9',
  creamDeep: '#f3d9a8',
  card: '#fff8ea',
  ink: '#2b2118',
  coral: '#ef6a55',
  coralDeep: '#e5503a',
  amber: '#a86b0e',
  amberOutline: '#cf8a1d',
  clashBg: '#fde7e2',
  minorBg: '#fbf0d8',
  stripes: { stage: '#e88f2e', boat: '#5fb8de', barberellas: '#e5503a' },
}

const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif'
const FONTS = {
  logo: `italic 900 34px ${SANS}`,
  dayTitle: `900 22px ${SANS}`,
  label: `700 11px ${SANS}`,
  value: `900 22px ${SANS}`,
  time: `800 15px ${SANS}`,
  name: `800 19px ${SANS}`,
  stage: `700 12px ${SANS}`,
  detail: `400 14px ${SANS}`,
  clash: `700 14px ${SANS}`,
  gap: `700 14px ${SANS}`,
  footer: `600 12px ${SANS}`,
}

function wrap(ctx, text, font, maxWidth) {
  ctx.font = font
  const words = String(text).split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
}

// Pre-computes wrapped lines and height for one timeline item.
function layoutItem(ctx, item, contentW) {
  if (item.type === 'gap') {
    return { type: 'gap', height: 40, item }
  }
  const textW = contentW - STRIPE - CARD_PAD * 2
  const act = item.act
  const nameLines = wrap(ctx, act.name, FONTS.name, textW)
  const detailLines = act.detail ? wrap(ctx, act.detail, FONTS.detail, textW) : []
  const clashLines = item.clashesWith.flatMap((clash) => {
    const text = `⚠ ${clash.name} — ${formatDuration(clash.duration)} overlap (${toHHMM(
      clash.start
    )}–${toHHMM(clash.end)})`
    return wrap(ctx, text, FONTS.clash, textW).map((line) => ({
      line,
      minor: clash.duration <= MINOR_CLASH,
    }))
  })
  const height =
    CARD_PAD * 2 +
    20 + // time line
    nameLines.length * 24 +
    18 + // stage line
    detailLines.length * 19 +
    clashLines.length * 19
  return { type: 'act', height, item, nameLines, detailLines, clashLines }
}

export async function savePlanImage({ day, plan, actCount }) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const contentW = W - PAD * 2

  const blocks = plan.items.map((item) => layoutItem(ctx, item, contentW))
  const headerH = 96
  const summaryH = 64
  const itemsH =
    blocks.reduce((sum, b) => sum + b.height, 0) + Math.max(0, blocks.length - 1) * ITEM_GAP
  const footerH = 40
  const H = PAD + headerH + summaryH + 16 + itemsH + footerH

  canvas.width = W * SCALE
  canvas.height = H * SCALE
  ctx.scale(SCALE, SCALE)
  ctx.textBaseline = 'alphabetic'

  // ground
  ctx.fillStyle = COLORS.cream
  ctx.fillRect(0, 0, W, H)

  // header
  ctx.fillStyle = COLORS.coralDeep
  ctx.font = FONTS.logo
  ctx.fillText('SELECTORS 10', PAD, PAD + 30)
  ctx.fillStyle = COLORS.ink
  ctx.font = FONTS.dayTitle
  ctx.fillText(`YOUR ${day.label.toUpperCase()} — ${day.date.toUpperCase()} 2026`, PAD, PAD + 66)

  // summary chips
  let y = PAD + headerH
  const chips = [
    ['ARRIVE BY', plan.arrive],
    ['FINISH', plan.finish],
    ['ACTS', String(actCount)],
  ]
  const chipW = (contentW - 2 * 10) / 3
  chips.forEach(([label, value], i) => {
    const x = PAD + i * (chipW + 10)
    ctx.fillStyle = COLORS.creamDeep
    roundRect(ctx, x, y, chipW, summaryH - 10, 8)
    ctx.fill()
    ctx.fillStyle = COLORS.ink
    ctx.font = FONTS.label
    ctx.globalAlpha = 0.65
    ctx.fillText(label, x + 14, y + 21)
    ctx.globalAlpha = 1
    ctx.font = FONTS.value
    ctx.fillText(value, x + 14, y + 45)
  })

  // timeline items
  y += summaryH + 16
  for (const block of blocks) {
    if (block.type === 'gap') {
      ctx.strokeStyle = 'rgba(43, 33, 24, 0.35)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 5])
      roundRect(ctx, PAD, y, contentW, block.height, 8)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = COLORS.ink
      ctx.globalAlpha = 0.65
      ctx.font = FONTS.gap
      const text = `FREE TIME — ${formatDuration(block.item.duration).toUpperCase()}`
      const tw = ctx.measureText(text).width
      ctx.fillText(text, PAD + (contentW - tw) / 2, y + 25)
      ctx.globalAlpha = 1
    } else {
      const act = block.item.act
      const hasClash = block.clashLines.length > 0
      const major = block.clashLines.some((c) => !c.minor)

      ctx.fillStyle = hasClash ? (major ? COLORS.clashBg : COLORS.minorBg) : COLORS.card
      roundRect(ctx, PAD, y, contentW, block.height, 8)
      ctx.fill()
      if (hasClash) {
        ctx.strokeStyle = major ? COLORS.coralDeep : COLORS.amberOutline
        ctx.lineWidth = 2
        ctx.setLineDash([6, 5])
        roundRect(ctx, PAD + 1, y + 1, contentW - 2, block.height - 2, 7)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // kind stripe with rounded left edge
      ctx.save()
      roundRect(ctx, PAD, y, contentW, block.height, 8)
      ctx.clip()
      ctx.fillStyle = COLORS.stripes[act.kind] || COLORS.stripes.stage
      ctx.fillRect(PAD, y, STRIPE, block.height)
      ctx.restore()

      const tx = PAD + STRIPE + CARD_PAD
      let ty = y + CARD_PAD + 14
      ctx.fillStyle = COLORS.ink
      ctx.font = FONTS.time
      ctx.fillText(`${act.start}–${act.end}`, tx, ty)
      ty += 6
      ctx.font = FONTS.name
      for (const line of block.nameLines) {
        ty += 24
        ctx.fillText(line, tx, ty)
      }
      ty += 18
      ctx.font = FONTS.stage
      ctx.globalAlpha = 0.65
      ctx.fillText(act.stage.toUpperCase(), tx, ty)
      ctx.globalAlpha = 1
      ctx.font = FONTS.detail
      for (const line of block.detailLines) {
        ty += 19
        ctx.globalAlpha = 0.8
        ctx.fillText(line, tx, ty)
        ctx.globalAlpha = 1
      }
      ctx.font = FONTS.clash
      for (const clash of block.clashLines) {
        ty += 19
        ctx.fillStyle = clash.minor ? COLORS.amber : COLORS.coralDeep
        ctx.fillText(clash.line, tx, ty)
      }
    }
    y += block.height + ITEM_GAP
  }

  // footer
  ctx.fillStyle = COLORS.ink
  ctx.globalAlpha = 0.5
  ctx.font = FONTS.footer
  ctx.fillText('SELECTORS 10 — 20–24 AUGUST 2026', PAD, H - 18)
  ctx.globalAlpha = 1

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  const filename = `selectors10-${day.label.toLowerCase()}.png`

  // Inside the claude.ai artifact viewer, saves must go through the viewer's
  // confirmation prompt — direct downloads and the share sheet are sandboxed away.
  if (window.claude?.downloads?.save) {
    try {
      await window.claude.downloads.save({ filename, data: blob })
    } catch {
      // declined or unavailable; nothing else can save a file in this sandbox
    }
    return
  }

  // On phones, the share sheet lets people save straight to their photos.
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Selectors 10 — ${day.label}` })
      return
    } catch (err) {
      if (err.name === 'AbortError') return // user closed the share sheet
      // anything else: fall through to a plain download
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
