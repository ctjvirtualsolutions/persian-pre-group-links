# Persian Pre-Group Meeting Messages

A simple static, multilingual meeting-message hub for the Persian pre-group. It is built with plain HTML, CSS, and JavaScript, so it works well on GitHub Pages without a build step.

## Files

- `index.html` — page structure and card template.
- `styles.css` — mobile-friendly card layout and visual styling.
- `app.js` — loads `config.json`, renders meeting cards, and powers copy/share buttons.
- `config.json` — editable meeting content, languages, and display options.
- `.nojekyll` — tells GitHub Pages to serve the site as a plain static site.

## Updating future meetings

In most cases, you only need to edit `config.json` for future meetings.

Use `config.json` to control:

- visible languages
- talk title
- day
- time
- address lines
- map link
- Zoom link
- meeting ID
- passcode
- whether the talk title shows
- whether the map shows
- whether Zoom details show

## Language cards

Each visible language in `config.json` appears as its own card. Every card includes the message text and buttons for:

- Copy
- WhatsApp
- SMS
- Email
- Share

Persian and Dari are configured with right-to-left text direction.

## GitHub Pages

To publish with GitHub Pages:

1. Commit these files to the repository.
2. In GitHub, open **Settings** → **Pages**.
3. Choose the branch and root folder for the Pages source.
4. Save, then open the published GitHub Pages URL.
