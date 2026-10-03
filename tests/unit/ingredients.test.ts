import { describe, expect, it } from 'vitest'
import { formatAmount, parseIngredient, scaleIngredient } from '../../src/lib/ingredients'

const scale = (line: string, factor: number) => scaleIngredient(parseIngredient(line), factor)

describe('parseIngredient', () => {
  it.each([
    ['2 cups flour', 2, null, 'cups flour'],
    ['1 1/2 cups flour, sifted', 1.5, null, 'cups flour, sifted'],
    ['1/2 tsp salt', 0.5, null, 'tsp salt'],
    ['½ cup sugar', 0.5, null, 'cup sugar'],
    ['1½ cups milk', 1.5, null, 'cups milk'],
    ['0.75 lb butter', 0.75, null, 'lb butter'],
    ['2-3 cloves garlic', 2, 3, 'cloves garlic'],
    ['2 to 3 tbsp oil', 2, 3, 'tbsp oil'],
    ['200g chocolate', 200, null, 'g chocolate'],
    ['6 apples, peeled', 6, null, 'apples, peeled'],
  ])('%s', (line, amount, amountMax, rest) => {
    expect(parseIngredient(line)).toEqual({ kind: 'item', amount, amountMax, rest })
  })

  it('leaves lines without a leading amount alone', () => {
    expect(parseIngredient('Salt and pepper to taste')).toEqual({
      kind: 'item',
      amount: null,
      amountMax: null,
      rest: 'Salt and pepper to taste',
    })
  })

  it('treats lines ending in a colon as section headers', () => {
    expect(parseIngredient('For the sauce:')).toEqual({ kind: 'section', text: 'For the sauce' })
  })
})

describe('formatAmount', () => {
  it.each([
    [1, '1'],
    [0.5, '½'],
    [1.5, '1½'],
    [0.25, '¼'],
    [1 / 3, '⅓'],
    [2 / 3, '⅔'],
    [2.75, '2¾'],
    [0.95, '1'],
    [12.4, '12½'],
    [250, '250'],
    [0.04, '0.04'],
  ])('%d → %s', (n, expected) => {
    expect(formatAmount(n)).toBe(expected)
  })
})

describe('scaleIngredient', () => {
  it('doubles', () => {
    expect(scale('1 1/2 cups flour', 2)).toBe('3 cups flour')
  })
  it('halves', () => {
    expect(scale('3/4 cup sugar', 0.5)).toBe('⅜ cup sugar')
  })
  it('scales ranges', () => {
    expect(scale('2-3 cloves garlic', 2)).toBe('4–6 cloves garlic')
  })
  it('keeps lines without amounts', () => {
    expect(scale('Salt to taste', 3)).toBe('Salt to taste')
  })
  it('is a no-op at factor 1 for nicely written amounts', () => {
    expect(scale('1 1/2 cups flour', 1)).toBe('1½ cups flour')
  })
})
