import { createBrowserRouter } from 'react-router'
import { Layout } from './Layout'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
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
            path: 'labels',
            lazy: async () => ({ Component: (await import('../admin/LabelsPage')).LabelsPage }),
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
