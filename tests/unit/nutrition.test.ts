import { describe, expect, it } from 'vitest'
import { formatGrams, hasMacros, scaleMacros } from '../../src/lib/nutrition'

describe('hasMacros', () => {
  it('is false for missing or empty macros', () => {
    expect(hasMacros(undefined)).toBe(false)
    expect(hasMacros(null)).toBe(false)
    expect(hasMacros({ protein: null, fat: null, carbs: null, fiber: null })).toBe(false)
  })
  it('is true when any macro is entered, including zero', () => {
    expect(hasMacros({ protein: null, fat: 0, carbs: null, fiber: null })).toBe(true)
  })
})

describe('formatGrams', () => {
  it.each([
    [0, '0 g'],
    [3.14, '3.1 g'],
    [9.96, '10 g'],
    [12.4, '12 g'],
    [215.6, '216 g'],
  ])('%d → %s', (grams, expected) => {
    expect(formatGrams(grams)).toBe(expected)
  })
})

describe('scaleMacros', () => {
  it('divides a whole recipe into servings and keeps blanks blank', () => {
    expect(scaleMacros({ protein: 80, fat: 40, carbs: null, fiber: 12 }, 1 / 4)).toEqual({
      protein: 20,
      fat: 10,
      carbs: null,
      fiber: 3,
    })
  })
})
