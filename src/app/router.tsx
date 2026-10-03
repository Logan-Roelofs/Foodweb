import { createBrowserRouter } from 'react-router'
import { Layout } from './Layout'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RecipesPage } from '../pages/RecipesPage'
import { RecipePage } from '../pages/RecipePage'
import { MenuPage, MenuRecipePage } from '../pages/MenuPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'recipes', element: <RecipesPage /> },
      { path: 'recipes/:recipeId', element: <RecipePage /> },
      { path: 'menu/:menuId', element: <MenuPage /> },
      { path: 'menu/:menuId/:recipeId', element: <MenuRecipePage /> },
      {
        // The admin area is loaded on demand so visitors never download it.
        path: 'admin',
        lazy: async () => ({ Component: (await import('../admin/AdminLayout')).AdminLayout }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('../admin/AdminRecipesPage')).AdminRecipesPage,
            }),
          },
          {
            path: 'recipes/new',
            lazy: async () => ({
              Component: (await import('../admin/RecipeEditorPage')).RecipeEditorPage,
            }),
          },
          {
            path: 'recipes/:recipeId',
            lazy: async () => ({
              Component: (await import('../admin/RecipeEditorPage')).RecipeEditorPage,
            }),
          },
          {
            path: 'menus',
            lazy: async () => ({ Component: (await import('../admin/MenusPage')).MenusPage }),
          },
          {
            path: 'menus/new',
            lazy: async () => ({
              Component: (await import('../admin/MenuEditorPage')).MenuEditorPage,
            }),
          },
          {
            path: 'menus/:menuId',
            lazy: async () => ({
              Component: (await import('../admin/MenuEditorPage')).MenuEditorPage,
            }),
          },
          {
            path: 'labels',
            lazy: async () => ({ Component: (await import('../admin/LabelsPage')).LabelsPage }),
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
