/**
 * Fills the LOCAL emulators with an admin account and sample data.
 * Run while `npm run emulators` is running:  npm run seed
 *
 * It refuses to run unless it is pointed at the emulators, so it can't touch production.
 */
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
// Skip probing for Google Cloud metadata; we're never on GCP here.
process.env.METADATA_SERVER_DETECTION = 'none'

const rules = readFileSync('firestore.rules', 'utf8')
const adminUid = rules.match(/request\.auth\.uid in \[\s*'([^']+)'/)?.[1]
if (!adminUid) throw new Error('No admin UID found in firestore.rules')

initializeApp({ projectId: 'demo-foodweb' })
const auth = getAuth()
const db = getFirestore()

async function seedAdmin() {
  // A fake Google account with the admin UID. It shows up in the
  // emulator's Google sign-in popup.
  try {
    await auth.deleteUser(adminUid!)
  } catch {
    // Didn't exist yet.
  }
  const result = await auth.importUsers([
    {
      uid: adminUid!,
      email: 'admin@foodweb.test',
      emailVerified: true,
      displayName: 'Foodweb Admin',
      providerData: [
        {
          uid: 'google-admin',
          email: 'admin@foodweb.test',
          displayName: 'Foodweb Admin',
          providerId: 'google.com',
        },
      ],
    },
  ])
  if (result.failureCount) throw result.errors[0].error
  console.log(`✔ Admin user (uid ${adminUid}, admin@foodweb.test)`)
}

async function seedData() {
  const tags = { dinner: 'dinner', dessert: 'dessert', vegetarian: 'vegetarian', quick: 'quick' }
  const categories = { mains: 'Mains', baking: 'Baking', sides: 'Sides' }

  const batch = db.batch()
  for (const [id, name] of Object.entries(tags)) batch.set(db.doc(`tags/${id}`), { name })
  for (const [id, name] of Object.entries(categories)) {
    batch.set(db.doc(`categories/${id}`), { name })
  }

  const now = FieldValue.serverTimestamp()
  const recipe = (data: Record<string, unknown>) => ({
    description: '',
    photoPath: null,
    photoUrl: null,
    notes: '',
    featured: false,
    createdAt: now,
    updatedAt: now,
    publishedAt: data.status === 'published' ? Timestamp.now() : null,
    ...data,
  })

  batch.set(
    db.doc('recipes/sample-apple-pie'),
    recipe({
      title: 'Brown Butter Apple Pie',
      description: 'A flaky, all-butter crust around cinnamon-spiced apples.',
      prepMinutes: 45,
      cookMinutes: 60,
      servings: 8,
      ingredients: [
        'For the crust:',
        '2 1/2 cups all-purpose flour',
        '1 cup cold butter, cubed',
        '1/2 tsp salt',
        '6 tbsp ice water',
        'For the filling:',
        '6 apples, peeled and sliced',
        '3/4 cup brown sugar',
        '1 1/2 tsp cinnamon',
      ],
      steps: [
        'Cut the butter into the flour and salt until pea-sized, then add water and form two discs.',
        'Toss the apples with sugar and cinnamon.',
        'Roll out the crust, fill, top, and crimp.',
        'Bake at 400°F for 60 minutes until bubbling.',
      ],
      tags: ['dessert'],
      categoryId: 'baking',
      notes: 'Let it cool for at least two hours so the filling sets.',
      status: 'published',
      featured: true,
    }),
  )
  batch.set(
    db.doc('recipes/sample-weeknight-pasta'),
    recipe({
      title: 'Weeknight Garlic Pasta',
      description: 'Fast, cozy, and mostly pantry staples.',
      prepMinutes: 5,
      cookMinutes: 15,
      servings: 4,
      ingredients: ['1 lb spaghetti', '6 cloves garlic, sliced', '1/3 cup olive oil', 'Parmesan, to serve'],
      steps: [
        'Boil the pasta in well-salted water.',
        'Gently fry the garlic in olive oil until golden.',
        'Toss the pasta with the garlic oil and a splash of pasta water.',
      ],
      tags: ['dinner', 'vegetarian', 'quick'],
      categoryId: 'mains',
      status: 'published',
    }),
  )
  batch.set(
    db.doc('recipes/sample-draft-soup'),
    recipe({
      title: 'Secret Tomato Soup (draft)',
      prepMinutes: 10,
      cookMinutes: 30,
      servings: 4,
      ingredients: ['2 cans whole tomatoes', '1 onion', '2 tbsp butter'],
      steps: ['Still working on this one.'],
      tags: ['vegetarian'],
      categoryId: 'sides',
      status: 'draft',
    }),
  )

  await batch.commit()
  console.log('✔ Sample tags, categories, and 3 recipes (2 published, 1 draft)')
}

await seedAdmin()
await seedData()
console.log('\nDone. Sign in at http://localhost:5173/admin and pick "Foodweb Admin".')
