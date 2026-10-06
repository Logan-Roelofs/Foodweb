import { formatAmount, parseIngredient } from './ingredients'

// Turns the ingredient lines of several recipes into one combined shopping
// list. Pure functions only; storage lives in shoppingStore.ts.

/** A recipe on the list, with the servings the shopper chose. */
export interface ListRecipe {
  id: string
  title: string
  /** Where "from" links point (a public recipe or a menu's copy). */
  href: string
  servings: number
  /** Servings the ingredient amounts are written for. */
  baseServings: number
  ingredients: string[]
}

export interface ListExtra {
  id: string
  text: string
}

export interface ShoppingItem {
  /** Stable key used to remember checked items. */
  key: string
  /** Display text, e.g. "3 cups + 2 tbsp flour". */
  text: string
  /** Titles of the recipes that need it (empty for extras). */
  from: string[]
}

// [canonical, singular, plural, ...other spellings]
const UNITS: string[][] = [
  ['cup', 'cup', 'cups', 'c'],
  ['tbsp', 'tbsp', 'tbsp', 'tablespoon', 'tablespoons', 'tbs', 'tbsps', 'T'],
  ['tsp', 'tsp', 'tsp', 'teaspoon', 'teaspoons', 'tsps', 't'],
  ['oz', 'oz', 'oz', 'ounce', 'ounces'],
  ['lb', 'lb', 'lb', 'lbs', 'pound', 'pounds'],
  ['g', 'g', 'g', 'gram', 'grams'],
  ['kg', 'kg', 'kg', 'kilogram', 'kilograms'],
  ['ml', 'ml', 'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
  ['l', 'l', 'l', 'liter', 'liters', 'litre', 'litres'],
  ['clove', 'clove', 'cloves'],
  ['can', 'can', 'cans'],
  ['jar', 'jar', 'jars'],
  ['package', 'package', 'packages', 'pkg', 'packet', 'packets'],
  ['stick', 'stick', 'sticks'],
  ['slice', 'slice', 'slices'],
  ['pinch', 'pinch', 'pinches'],
  ['bunch', 'bunch', 'bunches'],
  ['head', 'head', 'heads'],
  ['sprig', 'sprig', 'sprigs'],
  ['quart', 'quart', 'quarts', 'qt'],
  ['pint', 'pint', 'pints', 'pt'],
]

const UNIT_LOOKUP = new Map<string, string[]>()
for (const unit of UNITS) {
  for (const spelling of unit.slice(1)) {
    // "T" and "t" are case-sensitive (tablespoon vs teaspoon); the rest aren't.
    UNIT_LOOKUP.set(spelling.length === 1 && /[Tt]/.test(spelling) ? spelling : spelling.toLowerCase(), unit)
  }
}

function findUnit(word: string): string[] | undefined {
  const clean = word.replace(/\.$/, '')
  return UNIT_LOOKUP.get(clean) ?? UNIT_LOOKUP.get(clean.toLowerCase())
}

// Preparation words that don't change what you buy ("cold butter" is butter).
// Words that do (unsalted, whole, smoked…) are kept.
const PREP_WORDS = new Set([
  'cold', 'warm', 'hot', 'chilled', 'softened', 'melted', 'room-temperature', 'fresh', 'freshly',
  'large', 'medium', 'small', 'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded',
  'crushed', 'finely', 'roughly', 'thinly', 'packed', 'lightly', 'ripe', 'peeled', 'cubed',
])

/** "cups flour, sifted" → { unit: "cup", name: "flour" } */
export function splitUnitAndName(rest: string): { unit: string | null; name: string } {
  const [first = '', ...others] = rest.trim().split(/\s+/)
  const unit = findUnit(first)
  let name = unit ? others.join(' ') : rest.trim()
  name = name.replace(/^of\s+/i, '') // "1 cup of flour"
  name = name.split(',')[0].trim() // drop prep notes: ", sifted"
  const words = name.split(/\s+/)
  const kept = words.filter((w) => !PREP_WORDS.has(w.toLowerCase()))
  if (kept.length > 0) name = kept.join(' ')
  return { unit: unit ? unit[0] : null, name: name || rest.trim() }
}

/** Water from the tap isn't something to shop for. */
function isTapWater(name: string): boolean {
  return /^(ice |cold |hot |warm |boiling )?water$/i.test(name.trim())
}

/** Matching key for an ingredient name: lowercase, light singularizing. */
export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    // apples → apple, but not molasses, hummus, couscous, swiss.
    .map((w) => (w.length > 3 && /s$/.test(w) && !/(ss|us|is|sses)$/.test(w) ? w.slice(0, -1) : w))
    .join(' ')
}

function unitLabel(canonical: string, amount: number): string {
  const unit = UNITS.find((u) => u[0] === canonical)!
  return amount > 1 ? unit[2] : unit[1]
}

/** Combines every recipe's ingredients (scaled to the chosen servings) plus extras. */
export function buildShoppingItems(recipes: ListRecipe[], extras: ListExtra[] = []): ShoppingItem[] {
  interface Acc {
    key: string
    name: string
    /** Unit ("" for counts) → total amount, in first-seen order. */
    amounts: Map<string, number>
    plain: boolean
    from: Set<string>
  }
  const items = new Map<string, Acc>()

  for (const recipe of recipes) {
    const factor = recipe.servings / recipe.baseServings
    for (const line of recipe.ingredients) {
      const parsed = parseIngredient(line)
      if (parsed.kind === 'section') continue

      if (parsed.amount === null) {
        // "Salt and pepper to taste": list it once, as written.
        const key = `text:${nameKey(parsed.rest)}`
        const acc = items.get(key) ?? { key, name: parsed.rest, amounts: new Map(), plain: true, from: new Set() }
        acc.from.add(recipe.title)
        items.set(key, acc)
        continue
      }

      const { unit, name } = splitUnitAndName(parsed.rest)
      if (isTapWater(name)) continue
      const key = `item:${nameKey(name)}`
      const acc = items.get(key) ?? { key, name, amounts: new Map(), plain: false, from: new Set() }
      // For ranges ("2-3 cloves"), buy enough for the top of the range.
      const amount = (parsed.amountMax ?? parsed.amount) * factor
      acc.amounts.set(unit ?? '', (acc.amounts.get(unit ?? '') ?? 0) + amount)
      acc.from.add(recipe.title)
      items.set(key, acc)
    }
  }

  // Sorted alphabetically by ingredient name, not by the amounts in front.
  const named = [...items.values()].map((acc) => {
    if (acc.plain) return { name: acc.name, item: { key: acc.key, text: acc.name, from: [...acc.from] } }
    const parts = [...acc.amounts].map(([unit, amount]) =>
      unit ? `${formatAmount(amount)} ${unitLabel(unit, amount)}` : formatAmount(amount),
    )
    const text = `${parts.join(' + ')} ${acc.name}`
    return { name: acc.name, item: { key: acc.key, text, from: [...acc.from] } }
  })
  for (const extra of extras) {
    named.push({ name: extra.text, item: { key: `extra:${extra.id}`, text: extra.text, from: [] } })
  }
  return named
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .map((n) => n.item)
}

/** Plain text for copying or sharing: "☐ 3 cups flour" per line. */
export function listAsText(items: ShoppingItem[], checked: Set<string>): string {
  return items.map((i) => `${checked.has(i.key) ? '☑' : '☐'} ${i.text}`).join('\n')
}
