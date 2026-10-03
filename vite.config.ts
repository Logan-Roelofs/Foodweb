import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * The admin allowlist lives in firestore.rules (the real enforcement). The app
 * reads the same list at build time to decide whether to show the dashboard,
 * so there is only one place to edit.
 */
function adminUidsFromRules(): string[] {
  const rules = readFileSync('firestore.rules', 'utf8')
  const match = rules.match(/request\.auth\.uid in \[([^\]]*)\]/)
  if (!match) throw new Error('Could not find the admin allowlist in firestore.rules')
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __ADMIN_UIDS__: JSON.stringify(adminUidsFromRules()),
  },
})
