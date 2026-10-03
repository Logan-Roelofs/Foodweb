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

`VITE_ADMIN_UIDS` in your `.env` must match the UID in the rules files, or the dashboard won't show for the seeded admin.

---

## Admin access

The admin allowlist lives in **both** `firestore.rules` and `storage.rules`:

```
function isAdmin() {
  return request.auth != null && request.auth.uid in ['<your-uid>'];
}
```

These rules are what actually protect your data. `VITE_ADMIN_UIDS` only decides whether the app shows the dashboard. A user ID isn't secret, so it's fine to commit.

**To make yourself admin:**
1. Go to `https://<project-id>.web.app/admin` and sign in with your Google account. You'll see **Not authorized** with your user ID. Click **Copy user ID**.
2. In `firestore.rules` **and** `storage.rules`, replace `ADMIN_UID_NOT_SET` with your user ID. A test fails if the two files don't match.
3. Set `VITE_ADMIN_UIDS` to the same ID in your local `.env` and in GitHub (**Settings**, then **Secrets and variables**, then **Actions**, then the **Variables** tab).
4. Commit and push. When the deploy finishes, reload `/admin`.

To add a second admin, add another quoted ID to both lists, e.g. `['uid1', 'uid2']`, and comma-separate them in `VITE_ADMIN_UIDS`.

### Tests

```bash
npm run test:rules
```

This starts the Firestore and Storage emulators, runs the security-rules tests in `tests/rules/`, and shuts the emulators down. CI runs the same command before every deploy.

```bash
npm run typecheck
```

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
| `VITE_ADMIN_UIDS` | Your user ID (see "Admin access" above). You can add it later. |
| `FIREBASE_PROJECT_ID` | `projectId`. **Add this one last**, because it turns deploys on. |

#### 9. Deploy
In GitHub, open the repo, then **Actions**, then **Deploy live**, then **Run workflow**. You can also just push to `main`. When it finishes, the site is live at `https://<project-id>.web.app`.

To check that PR previews work, open a pull request. A bot comment with the preview URL should appear within a few minutes.

### Troubleshooting deploys
- **`Permission denied` / `403` in the deploy step:** the error message names the missing permission. Add the matching role to the `github-deployer` service account (step 7) and re-run the workflow.
- **`Storage has not been set up`:** first make sure step 6 is finished and the `VITE_FIREBASE_STORAGE_BUCKET` variable is right. The live workflow names the bucket explicitly to avoid a misleading version of this error.
- **`auth/unauthorized-domain` when signing in:** go to **Authentication**, then **Settings**, then **Authorized domains**, and add the domain you're on. `<project-id>.web.app` and `<project-id>.firebaseapp.com` are already there by default.
