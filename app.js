import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { doc, getFirestore, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

import { defaultContent } from './content-defaults.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const siteRef = doc(db, 'site', 'current');

const elements = {
  title: document.querySelector('#site-title'),
  subtitle: document.querySelector('#site-subtitle'),
  imageWrap: document.querySelector('#main-image-wrap'),
  image: document.querySelector('#main-image'),
  cards: document.querySelector('#language-cards'),
  status: document.querySelector('#status-message'),
  template: document.querySelector('#language-card-template')
};

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

function getEnabledLanguages(content) {
  return Object.entries(content.languages || {})
    .filter(([, language]) => language.enabled)
    .map(([code, language]) => ({ code, ...language }));
}

function createDetail(label, value, href = '') {
  if (!value) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'detail-item';

  const term = document.createElement('dt');
  term.textContent = label;

  const description = document.createElement('dd');
  if (href) {
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = value;
    description.append(link);
  } else {
    description.textContent = value;
  }

  wrapper.append(term, description);
  return wrapper;
}

function getDetails(content, language) {
  const address = (content.addressLines || []).filter(Boolean).join('\n');
  const details = [];

  if (content.showTalk) details.push(createDetail(language.talkLabel, language.talkTitle));
  details.push(createDetail(language.dayLabel, language.dayValue));
  details.push(createDetail(language.timeLabel, language.timeValue));
  details.push(createDetail(language.addressLabel, address));
  if (content.showMap) details.push(createDetail(language.mapLabel, content.mapLink, content.mapLink));
  if (content.showZoom) {
    details.push(createDetail(language.zoomLabel, content.zoomLink, content.zoomLink));
    details.push(createDetail(language.meetingIdLabel, content.meetingId));
    details.push(createDetail(language.passcodeLabel, content.passcode));
  }

  return details.filter(Boolean);
}

function buildMessage(content, language) {
  const address = (content.addressLines || []).filter(Boolean).join('\n');
  const lines = [language.heading, ''];

  if (content.showTalk && language.talkTitle) lines.push(`${language.talkLabel}: ${language.talkTitle}`);
  if (language.dayValue) lines.push(`${language.dayLabel}: ${language.dayValue}`);
  if (language.timeValue) lines.push(`${language.timeLabel}: ${language.timeValue}`);
  if (address) lines.push(`${language.addressLabel}:\n${address}`);
  if (content.showMap && content.mapLink) lines.push(`${language.mapLabel}: ${content.mapLink}`);
  if (content.showZoom && content.zoomLink) {
    lines.push(`${language.zoomLabel}: ${content.zoomLink}`);
    if (content.meetingId) lines.push(`${language.meetingIdLabel}: ${content.meetingId}`);
    if (content.passcode) lines.push(`${language.passcodeLabel}: ${content.passcode}`);
  }

  return lines.filter(Boolean).join('\n');
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.append(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
}

function setStatus(message) {
  elements.status.textContent = message;
  window.clearTimeout(setStatus.timeout);
  setStatus.timeout = window.setTimeout(() => {
    elements.status.textContent = '';
  }, 2500);
}

function renderCards(content) {
  const languages = getEnabledLanguages(content);
  elements.cards.replaceChildren();

  if (!languages.length) {
    elements.cards.innerHTML = '<p class="empty-state">No languages are currently selected.</p>';
    return;
  }

  languages.forEach((language) => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const message = buildMessage(content, language);
    const encodedMessage = encodeURIComponent(message);

    card.lang = language.code;
    card.dir = language.dir || 'ltr';
    card.querySelector('.language-name').textContent = `${language.name} • ${language.nativeName}`;
    card.querySelector('.message-heading').textContent = language.heading;
    card.querySelector('.message-details').append(...getDetails(content, language));

    const copyButton = card.querySelector('.copy-button');
    copyButton.addEventListener('click', async () => {
      await copyText(message);
      setStatus('Copied!');
    });

    const whatsappButton = card.querySelector('.whatsapp-button');
    whatsappButton.href = `https://wa.me/?text=${encodedMessage}`;

    const smsButton = card.querySelector('.sms-button');
    smsButton.href = `sms:?&body=${encodedMessage}`;

    const emailButton = card.querySelector('.email-button');
    emailButton.href = `mailto:?subject=${encodeURIComponent(language.heading)}&body=${encodedMessage}`;

    const shareButton = card.querySelector('.share-button');
    shareButton.addEventListener('click', async () => {
      if (navigator.share) {
        await navigator.share({ title: language.heading, text: message });
      } else {
        await copyText(message);
        setStatus('Copied!');
      }
    });

    elements.cards.append(card);
  });
}

function render(content) {
  document.title = content.title;
  elements.title.textContent = content.title;
  elements.subtitle.textContent = content.subtitle;

  if (content.mainImageUrl) {
    elements.image.src = content.mainImageUrl;
    elements.image.alt = content.title;
    elements.imageWrap.hidden = false;
  } else {
    elements.image.removeAttribute('src');
    elements.imageWrap.hidden = true;
  }

  renderCards(content);
}

onSnapshot(siteRef, (snapshot) => {
  const content = mergeContent(snapshot.exists() ? snapshot.data() : {});
  render(content);
}, (error) => {
  elements.status.textContent = `Could not load meeting details: ${error.message}`;
});
