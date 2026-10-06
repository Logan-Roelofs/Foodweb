import { Link } from 'react-router'
import { addRecipeToList, useShoppingList } from '../lib/shoppingStore'
import { Button } from './ui'

/** "Add to shopping list" under a recipe's ingredients, at the chosen servings. */
export function AddToListButton({
  recipe,
  servings,
  source,
}: {
  recipe: { title: string; servings: number; ingredients: string[] }
  servings: number
  source: { id: string; href: string }
}) {
  const list = useShoppingList()
  const onList = list.recipes.find((r) => r.id === source.id)
  const upToDate = onList?.servings === servings

  function add() {
    addRecipeToList({
      id: source.id,
      title: recipe.title,
      href: source.href,
      servings,
      baseServings: recipe.servings,
      ingredients: recipe.ingredients,
    })
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 print:hidden">
      {upToDate ? (
        <span className="text-sm font-semibold text-olive-700" role="status">
          ✓ On your shopping list
        </span>
      ) : (
        <Button variant="secondary" onClick={add}>
          🛒 {onList ? `Update list to ${servings} servings` : 'Add to shopping list'}
        </Button>
      )}
      {onList && (
        <Link to="/shopping-list" className="text-sm font-semibold text-terracotta-600 hover:underline">
          View list
        </Link>
      )}
    </div>
  )
}
