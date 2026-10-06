import { describe, expect, it } from 'vitest'
import {
  buildShoppingItems,
  listAsText,
  nameKey,
  splitUnitAndName,
  type ListRecipe,
} from '../../src/lib/shoppingList'

const recipe = (title: string, ingredients: string[], servings = 4, baseServings = 4): ListRecipe => ({
  id: title,
  title,
  href: `/recipes/${title}`,
  servings,
  baseServings,
  ingredients,
})

const texts = (recipes: ListRecipe[]) => buildShoppingItems(recipes).map((i) => i.text)

describe('splitUnitAndName', () => {
  it.each([
    ['cups flour, sifted', 'cup', 'flour'],
    ['tablespoons olive oil', 'tbsp', 'olive oil'],
    ['T butter', 'tbsp', 'butter'],
    ['t salt', 'tsp', 'salt'],
    ['lbs. ground beef', 'lb', 'ground beef'],
    ['cup of milk', 'cup', 'milk'],
    ['apples, peeled and sliced', null, 'apples'],
    ['cup cold butter, cubed', 'cup', 'butter'],
    ['large eggs', null, 'eggs'],
    ['tbsp unsalted butter', 'tbsp', 'unsalted butter'],
    ['cans whole tomatoes', 'can', 'whole tomatoes'],
  ])('%s', (rest, unit, name) => {
    expect(splitUnitAndName(rest)).toEqual({ unit, name })
  })
})

describe('nameKey', () => {
  it('matches singular and plural', () => {
    expect(nameKey('Apples')).toBe(nameKey('apple'))
    expect(nameKey('garlic cloves')).toBe(nameKey('garlic clove'))
  })
  it('leaves words that only look plural alone', () => {
    expect(nameKey('molasses')).toBe('molasses')
    expect(nameKey('hummus')).toBe('hummus')
    expect(nameKey('couscous')).toBe('couscous')
  })
})

describe('buildShoppingItems', () => {
  it('adds up the same ingredient across recipes', () => {
    expect(
      texts([recipe('Pie', ['2 cups flour']), recipe('Bread', ['1 1/2 cups flour, sifted'])]),
    ).toEqual(['3½ cups flour'])
  })

  it('keeps different units side by side', () => {
    expect(texts([recipe('A', ['1 cup butter']), recipe('B', ['2 tbsp butter'])])).toEqual([
      '1 cup + 2 tbsp butter',
    ])
  })

  it('ignores preparation words when matching', () => {
    expect(texts([recipe('Pie', ['1/2 cup cold butter, cubed']), recipe('Soup', ['2 tbsp butter'])])).toEqual([
      '½ cup + 2 tbsp butter',
    ])
  })

  it('leaves tap water off the list', () => {
    expect(texts([recipe('Pie', ['6 tbsp ice water', '1 cup water', '1 cup coconut water'])])).toEqual([
      '1 cup coconut water',
    ])
  })

  it('adds up counts and matches plurals', () => {
    expect(texts([recipe('A', ['6 apples']), recipe('B', ['1 apple'])])).toEqual(['7 apples'])
  })

  it('scales to the chosen servings', () => {
    expect(texts([recipe('Pie', ['2 cups flour', '3 eggs'], 8, 4)])).toEqual(['6 eggs', '4 cups flour'])
  })

  it('buys for the top of a range', () => {
    expect(texts([recipe('A', ['2-3 cloves garlic'])])).toEqual(['3 cloves garlic'])
  })

  it('lists "to taste" items once and skips section headers', () => {
    expect(
      texts([
        recipe('A', ['For the sauce:', 'Salt to taste']),
        recipe('B', ['salt to taste']),
      ]),
    ).toEqual(['Salt to taste'])
  })

  it('records which recipes need each item', () => {
    const [item] = buildShoppingItems([recipe('Pie', ['1 cup sugar']), recipe('Tea', ['1 tsp sugar'])])
    expect(item.from).toEqual(['Pie', 'Tea'])
  })

  it('sorts by ingredient name, not amount', () => {
    expect(
      texts([recipe('A', ['3 zucchini', '1 cup almonds', '2 lb beef']), recipe('B', ['2 tbsp almonds'])]),
    ).toEqual(['1 cup + 2 tbsp almonds', '2 lb beef', '3 zucchini'])
  })

  it('includes extras', () => {
    const items = buildShoppingItems([], [{ id: 'x1', text: 'Paper towels' }])
    expect(items).toEqual([{ key: 'extra:x1', text: 'Paper towels', from: [] }])
  })
})

describe('listAsText', () => {
  it('marks checked items', () => {
    const items = buildShoppingItems([recipe('A', ['1 cup rice', '2 eggs'])])
    expect(listAsText(items, new Set([items[0].key]))).toBe('☑ 2 eggs\n☐ 1 cup rice')
  })
})
