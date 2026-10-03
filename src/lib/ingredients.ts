/**
 * Parses free-text ingredient lines like "1 1/2 cups flour, sifted" so the
 * servings scaler can adjust the amounts.
 */

export type IngredientLine =
  | { kind: 'section'; text: string }
  | { kind: 'item'; amount: number | null; amountMax: number | null; rest: string }

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
  '⅕': 1 / 5,
  '⅙': 1 / 6,
}
const UF = Object.keys(UNICODE_FRACTIONS).join('')

// One quantity: "1 1/2", "1/2", "1½", "½", "1.5", "2"
const NUM = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d*[${UF}]|\\d+(?:\\.\\d+)?|\\.\\d+)`
// Optional range: "2-3", "2 – 3", "2 to 3"
const LEADING = new RegExp(`^(${NUM})(?:\\s*(?:-|–|—|to)\\s*(${NUM}))?(?=\\s|$|[a-zA-Z])\\s*`)

function parseNumber(text: string): number {
  const t = text.trim()
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = t.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const uni = t.match(new RegExp(`^(\\d*)([${UF}])$`))
  if (uni) return Number(uni[1] || 0) + UNICODE_FRACTIONS[uni[2]]
  return Number(t)
}

export function parseIngredient(line: string): IngredientLine {
  const text = line.trim()
  if (text.endsWith(':')) return { kind: 'section', text: text.slice(0, -1).trim() }

  const m = text.match(LEADING)
  if (!m) return { kind: 'item', amount: null, amountMax: null, rest: text }
  const amount = parseNumber(m[1])
  const amountMax = m[2] ? parseNumber(m[2]) : null
  if (!Number.isFinite(amount) || amount === 0) {
    return { kind: 'item', amount: null, amountMax: null, rest: text }
  }
  return { kind: 'item', amount, amountMax, rest: text.slice(m[0].length) }
}

const NICE_FRACTIONS: [number, string][] = [
  [0, ''],
  [1 / 8, '⅛'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [7 / 8, '⅞'],
  [1, ''],
]

/** Formats a quantity the way a cook would write it: 1.5 → "1½", 0.333 → "⅓". */
export function formatAmount(n: number): string {
  if (n >= 20) return String(Math.round(n))
  if (n >= 10) return String(Math.round(n * 2) / 2).replace('.5', '½')

  let whole = Math.floor(n)
  const frac = n - whole
  let best = NICE_FRACTIONS[0]
  for (const candidate of NICE_FRACTIONS) {
    if (Math.abs(candidate[0] - frac) < Math.abs(best[0] - frac)) best = candidate
  }
  if (best[0] === 1) whole += 1
  if (whole === 0 && best[1] === '') {
    // Tiny amounts (e.g. a pinch scaled down): keep one sensible decimal.
    return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  }
  return `${whole || ''}${best[1]}` || '0'
}

/** The line's text with its amount multiplied by `factor`. */
export function scaleIngredient(parsed: IngredientLine, factor: number): string {
  if (parsed.kind === 'section') return parsed.text
  if (parsed.amount === null) return parsed.rest
  const amount = formatAmount(parsed.amount * factor)
  const max = parsed.amountMax !== null ? `–${formatAmount(parsed.amountMax * factor)}` : ''
  return `${amount}${max} ${parsed.rest}`.trim()
}
