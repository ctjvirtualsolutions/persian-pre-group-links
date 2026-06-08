import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { defaultContent } from './content-defaults.js';

const mainLanguageCodes = ['fa', 'prs', 'en', 'pt'];
const languageOptions = [
  ['fa', 'Persian'],
  ['prs', 'Dari'],
  ['en', 'English'],
  ['pt', 'Portuguese'],
  ['de', 'German']
];
const timezoneOptions = [
  ['America/Sao_Paulo', 'America/Sao_Paulo — Brasília'],
  ['Asia/Kabul', 'Asia/Kabul — Kabul'],
  ['Europe/Copenhagen', 'Europe/Copenhagen — Copenhagen'],
  ['Europe/London', 'Europe/London — London'],
  ['Europe/Berlin', 'Europe/Berlin — Berlin'],
  ['America/New_York', 'America/New_York — Eastern Time'],
  ['America/Chicago', 'America/Chicago — Central Time'],
  ['America/Denver', 'America/Denver — Mountain Time'],
  ['America/Los_Angeles', 'America/Los_Angeles — Pacific Time'],
  ['America/Toronto', 'America/Toronto — Toronto'],
  ['Asia/Tokyo', 'Asia/Tokyo — Tokyo']
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const siteRef = doc(db, 'site', 'current');
let loadedContent = mergeContent();

const elements = {
  loginPanel: document.querySelector('#login-panel'),
  adminPanel: document.querySelector('#admin-panel'),
  loginForm: document.querySelector('#login-form'),
  contentForm: document.querySelector('#content-form'),
  logoutButton: document.querySelector('#logout-button'),
  status: document.querySelector('#admin-status'),
  talkTitleEditor: document.querySelector('#talk-title-editor'),
  customCardEditor: document.querySelector('#custom-card-editor'),
  imagePreview: document.querySelector('#image-preview')
};

function setStatus(message) {
  elements.status.textContent = message;
}

function normalizeTime(value) {
  if (!value) return '';
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?/i);
  if (!match) return '';

  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function mergeContent(data = {}) {
  const languages = Object.fromEntries(
    Object.entries(defaultContent.languages).map(([code, language]) => [
      code,
      {
        ...language,
        ...(data.languages?.[code] || {})
      }
    ])
  );
  const baseDayText = data.baseDayText || data.languages?.en?.dayValue || defaultContent.baseDayText;
  const baseBrasiliaTime = normalizeTime(data.baseBrasiliaTime || data.languages?.pt?.timeValue || defaultContent.baseBrasiliaTime);

  return {
    ...defaultContent,
    ...data,
    baseDayText,
    baseBrasiliaTime,
    customCards: [0, 1].map((index) => ({
      ...defaultContent.customCards[index],
      ...(data.customCards?.[index] || {})
    })),
    languages
  };
}

function setInput(name, value) {
  const input = elements.contentForm.elements[name];
  if (!input) return;

  if (input.type === 'checkbox') input.checked = Boolean(value);
  else input.value = value || '';
}

function getInput(name) {
  const input = elements.contentForm.elements[name];
  if (!input) return '';
  return input.type === 'checkbox' ? input.checked : input.value.trim();
}

function createOptions(options) {
  return options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
}

function renderTalkTitleEditors(content) {
  elements.talkTitleEditor.replaceChildren();

  mainLanguageCodes.forEach((code) => {
    const language = content.languages[code];
    const label = document.createElement('label');
    label.dir = language.dir || 'ltr';
    label.textContent = language.name;

    const input = document.createElement('textarea');
    input.name = `languages.${code}.talkTitle`;
    input.rows = 2;
    input.autocomplete = 'off';

    label.append(input);
    elements.talkTitleEditor.append(label);
  });
}

function renderCustomCardEditors() {
  elements.customCardEditor.replaceChildren();

  [0, 1].forEach((index) => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'custom-card-fieldset';
    fieldset.innerHTML = `
      <legend>Custom version ${index + 1}</legend>
      <div class="form-grid">
        <label class="checkbox-label wide">
          <input type="checkbox" name="customCards.${index}.enabled">
          Enable this custom card
        </label>
        <label>Display name<input name="customCards.${index}.displayName" placeholder="Dari — Kabul Time"></label>
        <label>Language
          <select name="customCards.${index}.languageCode">${createOptions(languageOptions)}</select>
        </label>
        <label>Timezone
          <select name="customCards.${index}.timezone">${createOptions(timezoneOptions)}</select>
        </label>
        <label>Optional time label override<input name="customCards.${index}.timeLabelOverride" placeholder="Local time"></label>
        <label>Optional talk title override<textarea name="customCards.${index}.talkTitleOverride" rows="2"></textarea></label>
      </div>
    `;
    elements.customCardEditor.append(fieldset);
  });
}

function fillForm(content) {
  setInput('title', content.title);
  setInput('subtitle', content.subtitle);
  setInput('mainImageUrl', content.mainImageUrl);
  setInput('showTalk', content.showTalk);
  setInput('showMap', content.showMap);
  setInput('showZoom', content.showZoom);
  setInput('baseMeetingDate', content.baseMeetingDate);
  setInput('baseDayText', content.baseDayText);
  setInput('baseBrasiliaTime', content.baseBrasiliaTime);
  setInput('addressLines', (content.addressLines || []).join('\n'));
  setInput('mapLink', content.mapLink);
  setInput('zoomLink', content.zoomLink);
  setInput('meetingId', content.meetingId);
  setInput('passcode', content.passcode);

  elements.imagePreview.hidden = !content.mainImageUrl;
  if (content.mainImageUrl) elements.imagePreview.src = content.mainImageUrl;

  mainLanguageCodes.forEach((code) => {
    setInput(`languages.${code}.talkTitle`, content.languages[code]?.talkTitle);
  });

  content.customCards.forEach((customCard, index) => {
    setInput(`customCards.${index}.enabled`, customCard.enabled);
    setInput(`customCards.${index}.displayName`, customCard.displayName);
    setInput(`customCards.${index}.languageCode`, customCard.languageCode);
    setInput(`customCards.${index}.timezone`, customCard.timezone);
    setInput(`customCards.${index}.timeLabelOverride`, customCard.timeLabelOverride);
    setInput(`customCards.${index}.talkTitleOverride`, customCard.talkTitleOverride);
  });
}

function collectLanguages() {
  const languages = Object.fromEntries(
    Object.entries(defaultContent.languages).map(([code, language]) => [
      code,
      {
        ...language,
        ...(loadedContent.languages?.[code] || {})
      }
    ])
  );

  mainLanguageCodes.forEach((code) => {
    languages[code] = {
      ...languages[code],
      enabled: true,
      talkTitle: getInput(`languages.${code}.talkTitle`) || languages[code].talkTitle
    };
  });

  return languages;
}

function collectCustomCards() {
  return [0, 1].map((index) => ({
    enabled: getInput(`customCards.${index}.enabled`),
    displayName: getInput(`customCards.${index}.displayName`),
    languageCode: getInput(`customCards.${index}.languageCode`) || defaultContent.customCards[index].languageCode,
    timezone: getInput(`customCards.${index}.timezone`) || defaultContent.customCards[index].timezone,
    timeLabelOverride: getInput(`customCards.${index}.timeLabelOverride`),
    talkTitleOverride: getInput(`customCards.${index}.talkTitleOverride`)
  }));
}

function collectFormData() {
  return {
    title: getInput('title'),
    subtitle: getInput('subtitle'),
    mainImageUrl: getInput('mainImageUrl'),
    showTalk: getInput('showTalk'),
    showMap: getInput('showMap'),
    showZoom: getInput('showZoom'),
    baseMeetingDate: getInput('baseMeetingDate'),
    baseDayText: getInput('baseDayText'),
    baseBrasiliaTime: getInput('baseBrasiliaTime'),
    addressLines: getInput('addressLines').split('\n').map((line) => line.trim()).filter(Boolean),
    mapLink: getInput('mapLink'),
    zoomLink: getInput('zoomLink'),
    meetingId: getInput('meetingId'),
    passcode: getInput('passcode'),
    customCards: collectCustomCards(),
    languages: collectLanguages(),
    updatedAt: serverTimestamp()
  };
}

async function loadContent() {
  setStatus('Loading content…');
  const snapshot = await getDoc(siteRef);
  const content = mergeContent(snapshot.exists() ? snapshot.data() : {});
  loadedContent = content;
  renderTalkTitleEditors(content);
  renderCustomCardEditors();
  fillForm(content);
  setStatus(snapshot.exists() ? 'Content loaded.' : 'Default content loaded. Save once to create site/current.');
}

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Signing in…');
  const email = elements.loginForm.elements.email.value.trim();
  const password = elements.loginForm.elements.password.value;
  await signInWithEmailAndPassword(auth, email, password);
  elements.loginForm.reset();
});

elements.logoutButton.addEventListener('click', () => signOut(auth));

elements.contentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Saving to Firestore…');
  await setDoc(siteRef, collectFormData(), { merge: true });
  setStatus('Saved. The public page updates live.');
});

onAuthStateChanged(auth, async (user) => {
  const signedIn = Boolean(user);
  elements.loginPanel.hidden = signedIn;
  elements.adminPanel.hidden = !signedIn;

  if (signedIn) await loadContent();
  else setStatus('Sign in to edit the site.');
});
