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
      macros: { protein: 38, fat: 196, carbs: 548, fiber: 30 },
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
      macros: { protein: 58, fat: 80, carbs: 340, fiber: 14 },
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

async function seedMenu() {
  // A date-night menu that includes the draft soup, copied in the same
  // way the app does it.
  const menuId = 'sampleDateNightMenu01'
  const batch = db.batch()
  batch.set(db.doc(`menus/${menuId}`), {
    title: 'Valentine’s Date Night',
    date: '2027-02-14',
    message: 'Dinner is on me tonight. Wear something cozy.',
    courses: {
      appetizer: ['sample-draft-soup'],
      main: ['sample-weeknight-pasta'],
      dessert: ['sample-apple-pie'],
      drinks: [],
    },
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  for (const id of ['sample-draft-soup', 'sample-weeknight-pasta', 'sample-apple-pie']) {
    const r = (await db.doc(`recipes/${id}`).get()).data()!
    batch.set(db.doc(`menus/${menuId}/recipes/${id}`), {
      title: r.title,
      description: r.description,
      photoUrl: r.photoUrl,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      servings: r.servings,
      ingredients: r.ingredients,
      steps: r.steps,
      notes: r.notes,
      macros: r.macros ?? null,
    })
  }
  await batch.commit()
  console.log(`✔ Sample menu at http://localhost:5173/menu/${menuId}`)
}

async function seedPotluck() {
  // A guest account to test contributing as a non-admin.
  const guestUid = 'sample-guest-jamie'
  try {
    await auth.deleteUser(guestUid)
  } catch {
    // Didn't exist yet.
  }
  await auth.importUsers([
    {
      uid: guestUid,
      email: 'jamie@foodweb.test',
      emailVerified: true,
      displayName: 'Jamie Guest',
      providerData: [
        { uid: 'google-jamie', email: 'jamie@foodweb.test', displayName: 'Jamie Guest', providerId: 'google.com' },
      ],
    },
  ])

  const potluckId = 'sampleThanksgiving01'
  const now = FieldValue.serverTimestamp()
  const batch = db.batch()
  batch.set(db.doc(`communityMenus/${potluckId}`), {
    title: 'Thanksgiving Potluck',
    eventDate: '2026-11-26',
    description: 'Dinner at 4pm at our place. Bring a dish and a big appetite!',
    courses: ['Appetizers', 'Sides', 'Mains', 'Desserts', 'Drinks'],
    active: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
  })
  const entry = (uid: string, data: Record<string, unknown>) => ({
    uid,
    description: '',
    link: null,
    recipeText: null,
    createdAt: now,
    updatedAt: now,
    ...data,
  })
  batch.set(
    db.doc(`communityMenus/${potluckId}/entries/${guestUid}_0`),
    entry(guestUid, {
      displayName: 'Cousin Jamie',
      course: 'Sides',
      dishName: 'Garlic mashed potatoes',
      description: 'A big pot, extra butter.',
    }),
  )
  batch.set(
    db.doc(`communityMenus/${potluckId}/entries/sample-guest-sarah_0`),
    entry('sample-guest-sarah', {
      displayName: 'Aunt Sarah',
      course: 'Desserts',
      dishName: 'Pumpkin pie',
      description: 'With homemade whipped cream.',
      recipeText: 'Blind-bake the crust. Whisk pumpkin, eggs, cream, sugar, and spices. Bake at 350°F for 50 minutes.',
    }),
  )
  await batch.commit()
  console.log(`✔ Sample potluck at http://localhost:5173/potluck/${potluckId} (guest login: "Jamie Guest")`)
}

await seedAdmin()
await seedData()
await seedMenu()
await seedPotluck()
console.log('\nDone. Sign in at http://localhost:5173/admin and pick "Foodweb Admin".')
