const configUrl = 'config.json';

const elements = {
  title: document.querySelector('#site-title'),
  intro: document.querySelector('#site-intro'),
  summary: document.querySelector('#meeting-summary'),
  cards: document.querySelector('#language-cards'),
  status: document.querySelector('#status-message'),
  template: document.querySelector('#language-card-template'),
};

let labels = {};

async function loadConfig() {
  const response = await fetch(configUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Unable to load ${configUrl}`);
  }

  return response.json();
}

function line(label, value) {
  return value ? `${label}: ${value}` : '';
}

function buildMessage(language, config) {
  const { meeting, settings } = config;
  const parts = [language.heading, language.message];

  if (settings.showTalkTitle) {
    parts.push(line(labels.talkTitle, meeting.talkTitle));
  }

  parts.push(line(labels.day, meeting.day));
  parts.push(line(labels.time, meeting.time));

  if (meeting.addressLines?.length) {
    parts.push(`${labels.address}:\n${meeting.addressLines.join('\n')}`);
  }

  if (settings.showMap && meeting.mapLink) {
    parts.push(line(labels.map, meeting.mapLink));
  }

  if (settings.showZoomDetails) {
    parts.push(line(labels.zoom, meeting.zoomLink));
    parts.push(line(labels.meetingId, meeting.meetingId));
    parts.push(line(labels.passcode, meeting.passcode));
  }

  return parts.filter(Boolean).join('\n\n');
}

function createDetail(label, value, link) {
  if (!value) {
    return null;
  }

  const item = document.createElement('div');
  item.className = 'detail-item';

  const term = document.createElement('dt');
  term.textContent = label;

  const description = document.createElement('dd');

  if (link) {
    const anchor = document.createElement('a');
    anchor.href = link;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.textContent = value;
    description.append(anchor);
  } else {
    description.textContent = value;
  }

  item.append(term, description);
  return item;
}

function createDetails(config) {
  const { meeting, settings } = config;
  const detailItems = [];

  if (settings.showTalkTitle) {
    detailItems.push(createDetail(labels.talkTitle, meeting.talkTitle));
  }

  detailItems.push(createDetail(labels.day, meeting.day));
  detailItems.push(createDetail(labels.time, meeting.time));
  detailItems.push(createDetail(labels.address, meeting.addressLines?.join(', ')));

  if (settings.showMap) {
    detailItems.push(createDetail(labels.map, 'Open map', meeting.mapLink));
  }

  if (settings.showZoomDetails) {
    detailItems.push(createDetail(labels.zoom, 'Open Zoom', meeting.zoomLink));
    detailItems.push(createDetail(labels.meetingId, meeting.meetingId));
    detailItems.push(createDetail(labels.passcode, meeting.passcode));
  }

  return detailItems.filter(Boolean);
}

function setStatus(message) {
  elements.status.textContent = message;
  window.clearTimeout(setStatus.timeoutId);
  setStatus.timeoutId = window.setTimeout(() => {
    elements.status.textContent = '';
  }, 2500);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function setShareLinks(card, language, message) {
  const encodedMessage = encodeURIComponent(message);
  const encodedSubject = encodeURIComponent(language.heading);

  card.querySelector('.whatsapp-button').href = `https://wa.me/?text=${encodedMessage}`;
  card.querySelector('.sms-button').href = `sms:?&body=${encodedMessage}`;
  card.querySelector('.email-button').href = `mailto:?subject=${encodedSubject}&body=${encodedMessage}`;
}

function renderSummary(config) {
  elements.summary.replaceChildren();

  const details = document.createElement('dl');
  details.className = 'summary-grid';
  details.append(...createDetails(config));
  elements.summary.append(details);
}

function renderCards(config) {
  elements.cards.replaceChildren();

  config.languages
    .filter((language) => language.visible)
    .forEach((language) => {
      const card = elements.template.content.firstElementChild.cloneNode(true);
      const message = buildMessage(language, config);

      card.dir = language.dir || 'ltr';
      card.lang = language.code;
      card.querySelector('.language-name').textContent = `${language.name} • ${language.nativeName}`;
      card.querySelector('.message-heading').textContent = language.heading;
      card.querySelector('.message-text').textContent = language.message;
      card.querySelector('.message-details').append(...createDetails(config));

      const copyButton = card.querySelector('.copy-button');
      copyButton.textContent = labels.copy;
      copyButton.addEventListener('click', async () => {
        try {
          await copyText(message);
          setStatus(labels.copied);
        } catch (error) {
          setStatus(labels.copyFailed);
        }
      });

      card.querySelector('.whatsapp-button').textContent = labels.whatsapp;
      card.querySelector('.sms-button').textContent = labels.sms;
      card.querySelector('.email-button').textContent = labels.email;
      card.querySelector('.share-button').textContent = labels.share;
      setShareLinks(card, language, message);

      const shareButton = card.querySelector('.share-button');
      shareButton.addEventListener('click', async () => {
        if (navigator.share) {
          await navigator.share({ title: language.heading, text: message });
        } else {
          await copyText(message);
          setStatus(labels.copied);
        }
      });

      elements.cards.append(card);
    });
}

async function init() {
  try {
    const config = await loadConfig();
    labels = config.ui.labels;

    document.title = config.ui.siteTitle;
    elements.title.textContent = config.ui.siteTitle;
    elements.intro.textContent = config.ui.intro;

    renderSummary(config);
    renderCards(config);
  } catch (error) {
    elements.intro.textContent = 'Could not load meeting details. Please check config.json.';
  }
}

init();
