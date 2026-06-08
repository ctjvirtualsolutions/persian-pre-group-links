# Persian Pre-Group Meeting Messages

A simple Firebase web app for a multilingual meeting-message hub. It uses plain HTML, CSS, and JavaScript with no framework, no build step, and no export step.

## What it uses

- Firebase Hosting
- Firebase Authentication with email/password sign-in
- Cloud Firestore
- Plain browser JavaScript modules

No Firebase Storage setup is required. The main image is controlled by a normal image URL saved in Firestore.

## Files

- `index.html` — public meeting-message page.
- `app.js` — live Firestore reader for `site/current` and public card rendering.
- `content-defaults.js` — starter document content used before the first admin save.
- `admin.html` — password-protected admin page.
- `admin.js` — Firebase Auth login and Firestore save logic.
- `firebase-config.js` — clearly marked Firebase web app config placeholders.
- `styles.css` — shared public/admin styling.
- `firestore.rules` — public read and authenticated write for `site/current`.
- `firebase.json` — Firebase Hosting and Firestore rules configuration.

## Firebase setup

1. Create a Firebase project.
2. In **Project settings → Your apps**, create a Web app.
3. Copy the Web app config into `firebase-config.js` and replace every `YOUR_*` placeholder.
4. In **Authentication → Sign-in method**, enable **Email/Password**.
5. In **Authentication → Users**, create the admin user.
6. Create a Cloud Firestore database.
7. Install the Firebase CLI if needed:

   ```sh
   npm install -g firebase-tools
   ```

8. Log in and select the project:

   ```sh
   firebase login
   firebase use --add
   ```

9. Deploy Hosting and Firestore rules:

   ```sh
   firebase deploy
   ```

## Updating meeting content

Meeting updates are made through `admin.html`, not by editing `config.json` or running an export step. Sign in at `/admin.html` with the Firebase Authentication admin user, edit the page content, language visibility, meeting details, language-specific labels/values, and main image URL, then click **Save to Firestore**.

The main image is controlled by the `mainImageUrl` field in `admin.html`. Paste or edit any normal publicly reachable image URL there. The public page shows the image when `mainImageUrl` has a value and hides the image area when it is blank.

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

If `site/current` does not exist yet, the admin page loads starter content from `content-defaults.js`. Sign in at `/admin.html`, review the fields, optionally paste a main image URL, and click **Save to Firestore**. The public page updates live after the document is created.

## Security rules

`firestore.rules` allows everyone to read `site/current`, but only signed-in users can write it.
