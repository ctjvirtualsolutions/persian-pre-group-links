# Persian Pre-Group Meeting Messages

A simple Firebase web app for a multilingual meeting-message hub. It uses plain HTML, CSS, and JavaScript with no framework and no build or export step.

## What it uses

- Firebase Hosting
- Firebase Authentication with email/password sign-in
- Cloud Firestore
- Plain browser JavaScript modules

No Firebase Storage setup is required. The app stores page content in Firestore and shows the main image from a normal URL that you paste into the admin page.

## Files

- `index.html` — public meeting-message page.
- `app.js` — live Firestore reader for `site/current`, emoji message building, timezone conversion, and public card rendering.
- `content-defaults.js` — starter document content and language defaults used before the first admin save.
- `admin.html` — password-protected admin page focused on the weekly workflow.
- `admin.js` — Firebase Auth login and Firestore save logic.
- `firebase-config.js` — clearly marked Firebase web app config placeholders.
- `styles.css` — shared public/admin styling.
- `firestore.rules` — public read and authenticated write for `site/current`.
- `firebase.json` — Firebase Hosting and Firestore rules configuration.

## Firebase setup

1. Create a Firebase project.
2. In **Project settings → Your apps**, create a Web app.
3. Copy the Web app config into `firebase-config.js` and replace every `YOUR_*` placeholder. The app only needs the config fields used by Firebase Hosting, Authentication, and Firestore; no Storage bucket is required.
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

Meeting updates are made through `admin.html`. Sign in at `/admin.html` with the Firebase Authentication admin user, update the weekly fields, then click **Save to Firestore**.

The simple admin workflow includes:

- page title and subtitle
- main image URL
- show/hide checkboxes for the talk, map, and Zoom sections
- base meeting date
- base day text
- base Brasília time
- address lines, map link, Zoom link, meeting ID, and passcode
- talk title fields for Persian/Farsi, Dari, English, and Brazilian Portuguese
- two optional custom message cards

The four main language cards always exist on the public page:

- `fa` — Persian/Farsi
- `prs` — Dari
- `en` — English
- `pt` — Brazilian Portuguese

Language names, native names, text direction, headings, and labels stay in code defaults so the normal weekly workflow stays short. Persian and Dari remain right-to-left.

## Emoji message format

Every Copy, WhatsApp, SMS, Email, and Share action uses the same emoji-formatted message built by `app.js`. You do not need to type emojis into language labels. The format is:

```text
Heading
Talk label: Talk title

📅 Day label: Day value
🕙 Time label: Time value

📍 Address label:
Address line 1
Address line 2
Address line 3
Address line 4
🗺️ Map label: map link

💻 Zoom label: zoom link
🆔 Meeting ID label: meeting ID
🔐 Passcode label: passcode
```

The talk, map, and Zoom sections follow the admin show/hide checkboxes.

## Custom message cards and timezones

The admin page supports two optional custom cards. Each custom card has:

- enabled checkbox
- display name
- language selection: Persian, Dari, English, Portuguese, or German
- timezone selection
- optional time label override
- optional talk title override

The base time is the Brasília time field. Custom cards use `Intl.DateTimeFormat` in the browser to calculate local time for the selected timezone; no timezone library is used.

Available timezone choices are:

- `America/Sao_Paulo` — Brasília
- `Asia/Kabul` — Kabul
- `Europe/Copenhagen` — Copenhagen
- `Europe/London` — London
- `Europe/Berlin` — Berlin
- `America/New_York` — Eastern Time
- `America/Chicago` — Central Time
- `America/Denver` — Mountain Time
- `America/Los_Angeles` — Pacific Time
- `America/Toronto` — Toronto
- `Asia/Tokyo` — Tokyo

## Main image URL

The main image is controlled by the `mainImageUrl` text field in `admin.html`. Paste or edit any normal image URL there, then save. The admin page writes that URL to the Firestore document `site/current`, and the public page displays the image when `mainImageUrl` has a value.

If `mainImageUrl` is blank, the public page keeps the image area hidden. This app does not upload image files and does not use Firebase Storage.

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
- `baseMeetingDate`
- `baseDayText`
- `baseBrasiliaTime`
- `addressLines`
- `mapLink`
- `zoomLink`
- `meetingId`
- `passcode`
- `customCards`
- `languages`

Each language entry keeps `enabled`, `name`, `nativeName`, `dir`, headings, labels, and talk titles. The simple admin page only edits the four main talk titles. New fields have sensible defaults in `content-defaults.js`, and the app keeps using the existing Firestore document path `site/current`.

## Google Stitch design handoff

The app remains plain HTML, CSS, and JavaScript with stable IDs/classes around the Firebase logic. If you later provide Google Stitch HTML/CSS, translate the visual styles into `index.html`, `admin.html`, and `styles.css` while keeping the Firebase reads/writes, message builder, buttons, and Firestore path unchanged.

## First content save

If `site/current` does not exist yet, the admin page loads starter content from `content-defaults.js`. Sign in at `/admin.html`, review the fields, optionally paste a main image URL, and click **Save to Firestore**. The public page updates live after the document is created.

## Security rules

`firestore.rules` allows everyone to read `site/current`, but only signed-in users can write it.
