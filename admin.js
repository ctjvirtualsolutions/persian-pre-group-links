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
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';
import { defaultContent } from './content-defaults.js';

const languageOrder = ['fa', 'prs', 'en', 'pt', 'de'];
const fieldLabels = {
  heading: 'Heading',
  talkLabel: 'Talk label',
  talkTitle: 'Talk title',
  dayLabel: 'Day label',
  dayValue: 'Day value',
  timeLabel: 'Time label',
  timeValue: 'Time value',
  addressLabel: 'Address label',
  mapLabel: 'Map label',
  zoomLabel: 'Zoom label',
  meetingIdLabel: 'Meeting ID label',
  passcodeLabel: 'Passcode label'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const siteRef = doc(db, 'site', 'current');

const elements = {
  loginPanel: document.querySelector('#login-panel'),
  adminPanel: document.querySelector('#admin-panel'),
  loginForm: document.querySelector('#login-form'),
  contentForm: document.querySelector('#content-form'),
  logoutButton: document.querySelector('#logout-button'),
  status: document.querySelector('#admin-status'),
  languageEditor: document.querySelector('#language-editor'),
  imagePreview: document.querySelector('#image-preview')
};

function setStatus(message) {
  elements.status.textContent = message;
}

function mergeContent(data = {}) {
  return {
    ...defaultContent,
    ...data,
    languages: {
      ...defaultContent.languages,
      ...(data.languages || {})
    }
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

function createLanguageEditor(code, language) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'language-fieldset';
  fieldset.dir = language.dir || 'ltr';

  const legend = document.createElement('legend');
  legend.textContent = `${language.name} (${code})`;
  fieldset.append(legend);

  const metaGrid = document.createElement('div');
  metaGrid.className = 'form-grid';
  metaGrid.innerHTML = `
    <label class="checkbox-label wide" dir="ltr">
      <input type="checkbox" name="languages.${code}.enabled">
      Show this language on the public page
    </label>
    <label>Name<input name="languages.${code}.name" autocomplete="off"></label>
    <label>Native name<input name="languages.${code}.nativeName" autocomplete="off"></label>
    <label>Direction
      <select name="languages.${code}.dir">
        <option value="ltr">Left to right</option>
        <option value="rtl">Right to left</option>
      </select>
    </label>
  `;
  fieldset.append(metaGrid);

  const fieldsGrid = document.createElement('div');
  fieldsGrid.className = 'form-grid';
  Object.entries(fieldLabels).forEach(([field, label]) => {
    const wrapper = document.createElement('label');
    wrapper.textContent = label;

    const input = field === 'heading' || field === 'talkTitle'
      ? document.createElement('textarea')
      : document.createElement('input');
    input.name = `languages.${code}.${field}`;
    input.autocomplete = 'off';
    if (input.tagName === 'TEXTAREA') input.rows = 2;

    wrapper.append(input);
    fieldsGrid.append(wrapper);
  });
  fieldset.append(fieldsGrid);

  return fieldset;
}

function renderLanguageEditors(content) {
  elements.languageEditor.replaceChildren();
  languageOrder.forEach((code) => {
    elements.languageEditor.append(createLanguageEditor(code, content.languages[code]));
  });
}

function fillForm(content) {
  setInput('title', content.title);
  setInput('subtitle', content.subtitle);
  setInput('showTalk', content.showTalk);
  setInput('showMap', content.showMap);
  setInput('showZoom', content.showZoom);
  setInput('addressLines', (content.addressLines || []).join('\n'));
  setInput('mapLink', content.mapLink);
  setInput('zoomLink', content.zoomLink);
  setInput('meetingId', content.meetingId);
  setInput('passcode', content.passcode);
  setInput('mainImageUrl', content.mainImageUrl);

  elements.imagePreview.hidden = !content.mainImageUrl;
  if (content.mainImageUrl) elements.imagePreview.src = content.mainImageUrl;

  Object.entries(content.languages).forEach(([code, language]) => {
    setInput(`languages.${code}.enabled`, language.enabled);
    setInput(`languages.${code}.name`, language.name);
    setInput(`languages.${code}.nativeName`, language.nativeName);
    setInput(`languages.${code}.dir`, language.dir);
    Object.keys(fieldLabels).forEach((field) => {
      setInput(`languages.${code}.${field}`, language[field]);
    });
  });
}

function collectFormData() {
  const languages = {};

  languageOrder.forEach((code) => {
    languages[code] = {
      enabled: getInput(`languages.${code}.enabled`),
      name: getInput(`languages.${code}.name`),
      nativeName: getInput(`languages.${code}.nativeName`),
      dir: getInput(`languages.${code}.dir`) || 'ltr'
    };

    Object.keys(fieldLabels).forEach((field) => {
      languages[code][field] = getInput(`languages.${code}.${field}`);
    });
  });

  return {
    title: getInput('title'),
    subtitle: getInput('subtitle'),
    mainImageUrl: getInput('mainImageUrl'),
    showTalk: getInput('showTalk'),
    showMap: getInput('showMap'),
    showZoom: getInput('showZoom'),
    addressLines: getInput('addressLines').split('\n').map((line) => line.trim()).filter(Boolean),
    mapLink: getInput('mapLink'),
    zoomLink: getInput('zoomLink'),
    meetingId: getInput('meetingId'),
    passcode: getInput('passcode'),
    languages,
    updatedAt: serverTimestamp()
  };
}

async function loadContent() {
  setStatus('Loading content…');
  const snapshot = await getDoc(siteRef);
  const content = mergeContent(snapshot.exists() ? snapshot.data() : {});
  renderLanguageEditors(content);
  fillForm(content);
  setStatus(snapshot.exists() ? 'Content loaded.' : 'Default content loaded. Save once to create site/current.');
}

async function uploadMainImageIfSelected() {
  const fileInput = elements.contentForm.elements.mainImageFile;
  const file = fileInput.files[0];
  if (!file) return getInput('mainImageUrl');

  setStatus('Uploading image…');
  const extension = file.name.split('.').pop() || 'jpg';
  const storagePath = `site/current/main-image-${Date.now()}.${extension}`;
  const imageRef = ref(storage, storagePath);
  await uploadBytes(imageRef, file, { contentType: file.type });
  return getDownloadURL(imageRef);
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
  const imageUrl = await uploadMainImageIfSelected();
  setInput('mainImageUrl', imageUrl);

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
