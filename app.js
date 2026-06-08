import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { doc, getFirestore, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

import { defaultContent } from './content-defaults.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const siteRef = doc(db, 'site', 'current');

const mainLanguageCodes = ['fa', 'prs', 'en', 'pt'];
const timezones = {
  'America/Sao_Paulo': 'Brasília',
  'Asia/Kabul': 'Kabul',
  'Europe/Copenhagen': 'Copenhagen',
  'Europe/London': 'London',
  'Europe/Berlin': 'Berlin',
  'America/New_York': 'Eastern Time',
  'America/Chicago': 'Central Time',
  'America/Denver': 'Mountain Time',
  'America/Los_Angeles': 'Pacific Time',
  'America/Toronto': 'Toronto',
  'Asia/Tokyo': 'Tokyo'
};
const messageEmojis = {
  day: '📅',
  time: '🕙',
  address: '📍',
  map: '🗺️',
  zoom: '💻',
  meetingId: '🆔',
  passcode: '🔐'
};

const elements = {
  title: document.querySelector('#site-title'),
  subtitle: document.querySelector('#site-subtitle'),
  imageWrap: document.querySelector('#main-image-wrap'),
  image: document.querySelector('#main-image'),
  cards: document.querySelector('#language-cards'),
  status: document.querySelector('#status-message'),
  template: document.querySelector('#language-card-template')
};

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

function withBaseMeetingValues(content, language) {
  return {
    ...language,
    dayValue: content.baseDayText || language.dayValue,
    timeValue: content.baseBrasiliaTime || language.timeValue
  };
}

function getSaoPauloDate(content) {
  if (!content.baseMeetingDate || !content.baseBrasiliaTime) return null;
  const [year, month, day] = content.baseMeetingDate.split('-').map(Number);
  const [hour, minute] = content.baseBrasiliaTime.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute));
}

function formatTimeForTimezone(content, timezone) {
  const date = getSaoPauloDate(content);
  if (!date || !timezone) return content.baseBrasiliaTime || '';

  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  } catch (error) {
    console.warn('Could not format custom timezone:', timezone, error);
    return content.baseBrasiliaTime || '';
  }
}

function getMainLanguageCards(content) {
  return mainLanguageCodes.map((code) => ({
    code,
    cardName: '',
    ...withBaseMeetingValues(content, content.languages[code])
  }));
}

function getCustomLanguageCards(content) {
  return (content.customCards || [])
    .filter((customCard) => customCard?.enabled)
    .map((customCard, index) => {
      const code = customCard.languageCode || 'en';
      const language = content.languages[code] || content.languages.en;
      const timezoneName = timezones[customCard.timezone] || customCard.timezone;
      return {
        code: `custom-${index + 1}`,
        languageCode: code,
        cardName: customCard.displayName || `${language.name} — ${timezoneName}`,
        ...language,
        talkTitle: customCard.talkTitleOverride || language.talkTitle,
        timeLabel: customCard.timeLabelOverride || language.timeLabel,
        dayValue: content.baseDayText || language.dayValue,
        timeValue: formatTimeForTimezone(content, customCard.timezone)
      };
    });
}

function getCards(content) {
  return [...getMainLanguageCards(content), ...getCustomLanguageCards(content)];
}

function createDetail(label, value, href = '', emoji = '') {
  if (!value) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'detail-item';

  const term = document.createElement('dt');
  term.textContent = emoji ? `${emoji} ${label}` : label;

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
  details.push(createDetail(language.dayLabel, language.dayValue, '', messageEmojis.day));
  details.push(createDetail(language.timeLabel, language.timeValue, '', messageEmojis.time));
  details.push(createDetail(language.addressLabel, address, '', messageEmojis.address));
  if (content.showMap) details.push(createDetail(language.mapLabel, content.mapLink, content.mapLink, messageEmojis.map));
  if (content.showZoom) {
    details.push(createDetail(language.zoomLabel, content.zoomLink, content.zoomLink, messageEmojis.zoom));
    details.push(createDetail(language.meetingIdLabel, content.meetingId, '', messageEmojis.meetingId));
    details.push(createDetail(language.passcodeLabel, content.passcode, '', messageEmojis.passcode));
  }

  return details.filter(Boolean);
}

function buildMessage(content, language) {
  const address = (content.addressLines || []).filter(Boolean).join('\n');
  const lines = [language.heading, ''];

  if (content.showTalk && language.talkTitle) lines.push(`${language.talkLabel}: ${language.talkTitle}`, '');
  if (language.dayValue) lines.push(`${messageEmojis.day} ${language.dayLabel}: ${language.dayValue}`);
  if (language.timeValue) lines.push(`${messageEmojis.time} ${language.timeLabel}: ${language.timeValue}`, '');
  if (address) lines.push(`${messageEmojis.address} ${language.addressLabel}:`, address);
  if (content.showMap && content.mapLink) lines.push(`${messageEmojis.map} ${language.mapLabel}: ${content.mapLink}`, '');
  if (content.showZoom && content.zoomLink) {
    lines.push(`${messageEmojis.zoom} ${language.zoomLabel}: ${content.zoomLink}`);
    if (content.meetingId) lines.push(`${messageEmojis.meetingId} ${language.meetingIdLabel}: ${content.meetingId}`);
    if (content.passcode) lines.push(`${messageEmojis.passcode} ${language.passcodeLabel}: ${content.passcode}`);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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
  const cards = getCards(content);
  elements.cards.replaceChildren();

  if (!cards.length) {
    elements.cards.innerHTML = '<p class="empty-state">No language cards are currently available.</p>';
    return;
  }

  cards.forEach((language) => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const message = buildMessage(content, language);
    const encodedMessage = encodeURIComponent(message);

    card.lang = language.code.startsWith('custom-') ? language.languageCode || '' : language.code;
    card.dir = language.dir || 'ltr';
    card.querySelector('.language-name').textContent = language.cardName || `${language.name} • ${language.nativeName}`;
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
        setStatus('Sharing is not available here, so the message was copied.');
      }
    });

    elements.cards.append(card);
  });
}

function renderContent(content) {
  document.title = content.title;
  elements.title.textContent = content.title;
  elements.subtitle.textContent = content.subtitle;

  elements.imageWrap.hidden = !content.mainImageUrl;
  if (content.mainImageUrl) {
    elements.image.src = content.mainImageUrl;
    elements.image.alt = content.title;
  } else {
    elements.image.removeAttribute('src');
  }

  renderCards(content);
}

onSnapshot(siteRef, (snapshot) => {
  const content = mergeContent(snapshot.exists() ? snapshot.data() : {});
  renderContent(content);
}, (error) => {
  console.error(error);
  renderContent(mergeContent());
  setStatus('Could not load Firestore content, so default content is shown.');
});
