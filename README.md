# Foodweb

A cozy recipe and menu site: public recipes, private date-night menus shared by link, and community potluck menus.

**Stack:** React + TypeScript + Vite + Tailwind, with Firebase (Auth, Firestore, Storage, Hosting). There's no custom server and no Cloud Functions. Security lives in `firestore.rules` and `storage.rules`.

---

## Local development

### One-time setup

1. **Node.js 22+** (24 recommended).
2. **Java 21+**, which the Firebase emulators need. On Windows:
   ```bash
   winget install EclipseAdoptium.Temurin.21.JDK
   ```
   Close and reopen your terminal afterwards, then check with `java -version`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create your local env file:
   ```bash
   cp .env.example .env
   ```
   With `VITE_USE_EMULATORS=true` (the default), the app talks only to the local emulators, and you don't need any real Firebase values.

### Running

Run these in two terminals:

```bash
npm run emulators
```
```bash
npm run dev
```

- App: http://localhost:5173
- Emulator UI (browse data, fake users, uploaded files): http://localhost:4000

The emulators run as a `demo-foodweb` project, so nothing you do locally can touch production. Data is saved to `./emulator-data` when you stop the emulators with Ctrl+C, and it's reloaded the next time you start them.

**First time (or to reset sample data):** with the emulators running, open a third terminal and run:

```bash
npm run seed
```

This creates a fake **Foodweb Admin** Google account whose user ID matches the admin allowlist in `firestore.rules`, along with sample tags, categories and recipes. Go to http://localhost:5173/admin, click **Sign in with Google**, and pick **Foodweb Admin** in the emulator's popup. Choose **Add new account** instead to see what a non-admin sees.


### Tests

```bash
npm run test:rules
```

This starts the Firestore and Storage emulators, runs the security-rules tests in `tests/rules/`, and shuts the emulators down. CI runs the same command before every deploy.

```bash
npm run test:unit
```

This runs plain unit tests (e.g. the ingredient parser behind the servings scaler). It doesn't need the emulators.

```bash
npm run typecheck
```

---

## Admin access

The admin allowlist lives in **both** `firestore.rules` and `storage.rules`:

```
function isAdmin() {
  return request.auth != null && request.auth.uid in ['<your-uid>'];
}
```

These rules are what actually protect your data. At build time the app reads the same list from `firestore.rules` to decide whether to show the dashboard, so there is nothing else to configure. A user ID isn't secret, so it's fine to commit.

**To make yourself admin:**
1. Go to `https://<project-id>.web.app/admin` and sign in with your Google account. You'll see **Not authorized** with your user ID. Click **Copy user ID**.
2. In `firestore.rules` **and** `storage.rules`, put your user ID in the allowlist. A test fails if the two files don't match.
3. Commit and push. When the deploy finishes, reload `/admin`.

To add a second admin, add another quoted ID to both lists, e.g. `['uid1', 'uid2']`.

---

## How curated menus work

- **Unlisted:** each menu lives at `/menu/<id>`, where `<id>` is a random 20-character Firestore ID. The rules let anyone *open* an active menu by its ID, but only the admin can *list* menus, so links can't be discovered. Hosting also sends `X-Robots-Tag: noindex` for `/menu/**` so search engines skip them.
- **Recipe copies:** when you save a menu, each chosen recipe is copied into `menus/<id>/recipes/<recipeId>`. That's how a menu can include drafts without making them public. If you edit a recipe later, open the menu and click **Save menu** to refresh its copy.
- **Menu only:** untick **Let guests open the recipes** (`showRecipes: false`) to share a single-page card. Dishes aren't clickable, the Foodweb name in the top bar isn't a link, and the site navigation is hidden. The recipe copies are saved with just the name, description, and photo, so the ingredients and steps can't be read through the link. Ticking it again and saving restores the full copies.
- **Turning a link off** (`active: false`) hides the menu *and* its recipe copies. A revoked link, a mistyped link, and a menu that never existed all show the same "This menu isn't available" page.

## How potlucks (community menus) work

- **Unlisted** like curated menus: each one lives at `/potluck/<random id>`, can't be listed by anyone but the admin, and isn't indexed by search engines.
- **Anyone with the link can see** what's been claimed, live, with no sign-in. **Adding a dish requires Google sign-in.** Each dish stores the contributor's Firebase UID and the display name they typed. Their email is never stored or shown.
- **Contributors can edit or delete only their own dishes**, and only while the potluck is open (link on and not locked). Dishes must use one of the potluck's courses, and links must start with `http(s)://`.
- **Locking** finalizes the menu. It stays visible, but nobody can add, edit, or remove dishes, except the admin, who can always remove a dish.
- **Add to my recipes** (admin only, on the potluck page) copies a dish into your recipe box as a draft, crediting the contributor in the notes.
- **Up to 10 dishes per person per potluck.** Dish IDs must be `<uid>_<0-9>`, which the rules enforce, so nobody can flood a potluck even by bypassing the app.
- Locally, `npm run seed` creates a sample potluck and a guest account, **Jamie Guest**, so you can try contributing as a non-admin.

---

## Shopping list

- **Adding:** recipe pages have **Add to shopping list** (at the servings currently chosen in the scaler). Date-night menus that share their recipes have **Add the whole menu**. Menu-only cards don't, since they hold no ingredients.
- **Where it lives:** `/shopping-list` is stored in the visitor's browser (`localStorage`). There's no sign-in and nothing on the server, so each device has its own list. **Share or copy** sends it to a phone's Notes, Messages, or Reminders.
- **Combining** (`src/lib/shoppingList.ts`, unit-tested):
  - The same ingredient is added up across recipes (2 cups + 1 cup flour → 3 cups flour). Plurals and preparation words are ignored when matching ("cold butter" = "butter").
  - Different units stay side by side ("1 cup + 2 tbsp butter"). Units aren't converted.
  - Ranges round up to the top ("2-3 cloves" → 3), "to taste" lines appear once, and tap water is left off.

---

## Link previews

When a Foodweb link is shared in a text or chat, apps show just the Foodweb logo (`public/og-logo.png`, 1200×630) with the title "Foodweb" and no description text. The tags are in `index.html`. Preview crawlers don't run JavaScript, so every page (including menus and potlucks) shares this one card. Making them page-specific would need server-side rendering via a Cloud Function.

The image URL is built from `VITE_FIREBASE_PROJECT_ID` (`https://<project-id>.web.app/og-logo.png`). If you add a custom domain later, change that `og:image` line in `index.html` to use it.

## Optional: App Check (only if you ever get spam)

[App Check](https://firebase.google.com/docs/app-check) makes Firestore reject requests that don't come from your real site. It isn't set up by default, because the per-person dish cap, locking, and admin removal already cover a personal site, and App Check adds Google's reCAPTCHA script to every page.

If you need it later:
1. In Google Cloud, create a **reCAPTCHA Enterprise** site key for your domains (`<project-id>.web.app`, `<project-id>.firebaseapp.com`).
2. In the Firebase console, go to **App Check**, then **Apps**, and register the web app with that key.
3. Initialize App Check in `src/lib/firebase.ts`, right after `initializeApp`, using `initializeAppCheck` with a `ReCaptchaEnterpriseProvider`.
4. Deploy, watch the App Check **metrics** for a few days to confirm real traffic is verified, and only then click **Enforce** for Cloud Firestore.

---

## Deployment

GitHub Actions does all deploys:

| Trigger | Workflow | What it does |
|---|---|---|
| Push to `main` | `.github/workflows/deploy-live.yml` | Tests the rules, builds, then deploys Hosting, Firestore rules and indexes, and Storage rules to the live site |
| Pull request | `.github/workflows/deploy-preview.yml` | Tests the rules, builds, deploys to a temporary preview URL (expires after 7 days), and comments the link on the PR |

Until the `FIREBASE_PROJECT_ID` repository variable exists, the workflows only test and build. The deploy steps are skipped.

Notes:
- **Previews use production data.** Preview sites talk to the live Firestore and Storage.
- **Google sign-in doesn't work on preview URLs.** Their domains aren't on Firebase Auth's authorized-domain list. Test admin and contributor features locally with the emulators.

### First-time Firebase + GitHub setup

#### 1. Create the Firebase project
1. Go to https://console.firebase.google.com and click **Create a project**.
2. Name it (e.g. `foodweb`). Firebase gives it a **project ID** like `foodweb-1a2b3`. Write this down.
3. Google Analytics is optional; you can turn it off.

#### 2. Upgrade to the Blaze plan
Cloud Storage (recipe photos) requires it.
1. Click the gear icon, then **Usage and billing**, then **Details & settings**, then **Modify plan**, then **Blaze**, and attach a billing account.
2. Set a budget alert:
   - In the same screen, open the link to **Google Cloud Billing**, then **Budgets & alerts**, then **Create budget**.
   - Use something like $5, with email alerts at 50%, 90% and 100%.
   - A budget only alerts you; it doesn't cap spending. A small personal site should stay within the free allowance.

#### 3. Register a web app (gives you the config values)
1. Click the gear icon, then **Project settings**, then **General**. Under **Your apps**, click the `</>` (Web) icon.
2. Nickname: `foodweb-web`. **Don't** tick "Also set up Firebase Hosting" (our workflow handles that).
3. Firebase shows a `firebaseConfig` object. Keep it open for step 7.

#### 4. Turn on Google sign-in
**Build**, then **Authentication**, then **Get started**, then **Sign-in method**, then **Google**. Enable it, choose a support email, and save.

#### 5. Create Firestore
1. **Build**, then **Firestore Database**, then **Create database**.
2. Pick a location close to you (e.g. `nam5 (United States)`). **This can't be changed later.**
3. Start in **production mode**. Our rules replace the defaults on the first deploy.

#### 6. Create Storage
**Build**, then **Storage**, then **Get started**. Choose the same location and start in **production mode**.

#### 7. Create a service account for GitHub
This is the "robot" account GitHub uses to deploy.
1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts. Make sure your Firebase project is selected in the top bar.
2. Click **Create service account**, name it `github-deployer`, and click **Create and continue**.
3. Add these roles (type each name into the role search box):
   - **Firebase Hosting Admin**: deploys the site and preview channels
   - **Firebase Rules Admin**: deploys Firestore and Storage rules
   - **Cloud Datastore Index Admin**: deploys Firestore indexes
   - **Cloud Storage for Firebase Viewer**: lets the deploy find your Storage bucket
   - **Service Usage Consumer**: lets the Firebase CLI check which APIs are enabled
   - **API Keys Viewer**: used by the hosting deploy action
4. Click **Done**.
5. Click the new account, then **Keys**, then **Add key**, then **Create new key**, then **JSON**. A `.json` file downloads.
6. **Treat this file like a password.** Don't put it in the project folder, and never commit it. You'll paste its contents into GitHub in the next step, then delete the file.

#### 8. Add GitHub secret and variables
In GitHub, open the repo, then **Settings**, then **Secrets and variables**, then **Actions**.

**Secrets** tab, then **New repository secret**:

| Name | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | The entire contents of the JSON key file from step 7 |

Now delete the JSON file from your computer.

**Variables** tab, then **New repository variable**, for each of these (values come from the `firebaseConfig` in step 3):

| Name | From `firebaseConfig` |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `FIREBASE_PROJECT_ID` | `projectId`. **Add this one last**, because it turns deploys on. |

#### 9. Deploy
In GitHub, open the repo, then **Actions**, then **Deploy live**, then **Run workflow**. You can also just push to `main`. When it finishes, the site is live at `https://<project-id>.web.app`.

To check that PR previews work, open a pull request. A bot comment with the preview URL should appear within a few minutes.

### Troubleshooting deploys
- **`Permission denied` / `403` in the deploy step:** the error message names the missing permission. Add the matching role to the `github-deployer` service account (step 7) and re-run the workflow.
- **`Storage has not been set up`:** first make sure step 6 is finished and the `VITE_FIREBASE_STORAGE_BUCKET` variable is right. The live workflow names the bucket explicitly to avoid a misleading version of this error.
- **`auth/unauthorized-domain` when signing in:** go to **Authentication**, then **Settings**, then **Authorized domains**, and add the domain you're on. `<project-id>.web.app` and `<project-id>.firebaseapp.com` are already there by default.
