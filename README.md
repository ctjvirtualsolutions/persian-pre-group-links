# Persian Pre-Group Meeting Messages

A simple Firebase web app for a multilingual meeting-message hub. It uses plain HTML, CSS, and JavaScript with no framework and no build or export step.

## What it uses

- Firebase Hosting
- Firebase Authentication with email/password sign-in
- Cloud Firestore
- Cloud Storage for Firebase
- Plain browser JavaScript modules

## Files

- `index.html` — public meeting-message page.
- `app.js` — live Firestore reader for `site/current` and public card rendering.
- `content-defaults.js` — starter document content used before the first admin save.
- `admin.html` — password-protected admin page.
- `admin.js` — Firebase Auth login, Firestore save, and Storage upload logic.
- `firebase-config.js` — clearly marked Firebase web app config placeholders.
- `styles.css` — shared public/admin styling.
- `firestore.rules` — public read and authenticated write for `site/current`.
- `storage.rules` — public read and authenticated image upload for the main image path.
- `firebase.json` — Firebase Hosting, Firestore rules, and Storage rules configuration.

## Firebase setup

1. Create a Firebase project.
2. In **Project settings → Your apps**, create a Web app.
3. Copy the Web app config into `firebase-config.js` and replace every `YOUR_*` placeholder.
4. In **Authentication → Sign-in method**, enable **Email/Password**.
5. In **Authentication → Users**, create the admin user.
6. Create a Cloud Firestore database.
7. Create a Cloud Storage bucket.
8. Install the Firebase CLI if needed:

   ```sh
   npm install -g firebase-tools
   ```

9. Log in and select the project:

   ```sh
   firebase login
   firebase use --add
   ```

10. Deploy Hosting and rules:

    ```sh
    firebase deploy
    ```

## Data model

The app uses one Firestore document:

- Collection: `site`
- Document: `current`

The public page listens to this document live. The admin page writes changes directly to it.

Important top-level fields include:

- `title`
- `subtitle`
- `mainImageUrl`
- `showTalk`
- `showMap`
- `showZoom`
- `addressLines`
- `mapLink`
- `zoomLink`
- `meetingId`
- `passcode`
- `languages`

Each language entry includes `enabled`, `name`, `nativeName`, `dir`, and all language-specific labels and values used by the public cards.

## First content save

If `site/current` does not exist yet, the admin page loads starter content from `content-defaults.js`. Sign in at `/admin.html`, review the fields, optionally upload the main image, and click **Save to Firestore**. The public page updates live after the document is created.

## Security rules

`firestore.rules` allows everyone to read `site/current`, but only signed-in users can write it.

`storage.rules` allows everyone to read uploaded main images under `site/current/`, but only signed-in users can upload image files there.
