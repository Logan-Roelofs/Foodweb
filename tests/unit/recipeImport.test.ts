import { describe, expect, it } from 'vitest'
import { isAlreadyImported, parseImportFile } from '../../src/lib/recipeImport'

const file = (recipes: unknown[]) => JSON.stringify({ format: 'foodweb-recipes', version: 1, recipes })

const good = {
  title: 'Loaded Sweet Potato',
  servings: 2,
  ingredients: ['1 large sweet potato', '1 lb ground beef'],
  steps: ['Bake the potato.', 'Brown the beef.'],
  macros: { protein: 104, fat: 34, carbs: 110 },
  tags: ['High Protein', 'dinner', 'high protein'],
  category: 'Mains',
  sourceUrl: 'https://www.instagram.com/reel/abc/',
}

describe('parseImportFile', () => {
  it('turns a valid entry into a draft', () => {
    const { candidates, errors } = parseImportFile(file([good]))
    expect(errors).toEqual([])
    expect(candidates).toHaveLength(1)
    const [c] = candidates
    expect(c.input).toMatchObject({
      title: 'Loaded Sweet Potato',
      servings: 2,
      prepMinutes: 0,
      cookMinutes: 0,
      status: 'draft',
      featured: false,
      macros: { protein: 104, fat: 34, carbs: 110, fiber: null },
    })
    expect(c.tagNames).toEqual(['high protein', 'dinner'])
    expect(c.categoryName).toBe('Mains')
    expect(c.sourceUrl).toBe('https://www.instagram.com/reel/abc/')
  })

  it('skips entries without a title or ingredients, and reports why', () => {
    const { candidates, errors } = parseImportFile(file([good, { servings: 2 }, { title: 'Air' }]))
    expect(candidates).toHaveLength(1)
    expect(errors).toEqual(['Recipe 2: missing a title.', 'Recipe 3 ("Air"): no ingredients.'])
  })

  it('clamps numbers and lengths to what the database allows', () => {
    const [c] = parseImportFile(
      file([{ ...good, title: 'x'.repeat(200), servings: 500, prepMinutes: -5, macros: { protein: -1 } }]),
    ).candidates
    expect(c.input.title).toHaveLength(120)
    expect(c.input.servings).toBe(100)
    expect(c.input.prepMinutes).toBe(0)
    expect(c.input.macros).toBeNull()
  })

  it('drops non-https source links', () => {
    const [c] = parseImportFile(file([{ ...good, sourceUrl: 'javascript:alert(1)' }])).candidates
    expect(c.sourceUrl).toBeNull()
  })

  it('rejects files that are not Foodweb imports', () => {
    expect(() => parseImportFile('nope')).toThrow("isn't valid JSON")
    expect(() => parseImportFile('{"recipes": []}')).toThrow("doesn't look like")
  })
})

describe('isAlreadyImported', () => {
  const [c] = parseImportFile(file([good])).candidates

  it('matches on the source link in notes', () => {
    expect(isAlreadyImported(c, [{ title: 'Renamed', notes: 'From https://www.instagram.com/reel/abc/' }])).toBe(true)
  })
  it('matches on the same title', () => {
    expect(isAlreadyImported(c, [{ title: 'loaded sweet potato', notes: '' }])).toBe(true)
  })
  it('is false for new recipes', () => {
    expect(isAlreadyImported(c, [{ title: 'Other', notes: '' }])).toBe(false)
  })
})
