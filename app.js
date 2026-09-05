const fallbackConferences = [
  {
    id: "eccv26-conference",
    acronym: "ECCV 2026",
    area: "CV",
    rankings: { core: "A*", ccf: "B", ccfField: "Artificial Intelligence" },
    title: "European Conference on Computer Vision",
    stage: "MAIN CONFERENCE",
    deadline: "2026-09-07T22:00:00Z",
    displayDeadline: "Sep 8, 2026",
    meeting: "Sep 8-12, 2026",
    location: "Malmö, Sweden",
  },
  {
    id: "accv26-decision",
    acronym: "ACCV 2026",
    area: "CV",
    rankings: { core: "A", ccf: "C", ccfField: "Artificial Intelligence" },
    title: "Asian Conference on Computer Vision",
    stage: "PAPER DECISION",
    deadline: "2026-09-20T23:59:00Z",
    displayDeadline: "Sep 20, 2026 GMT 23:59",
    meeting: "Dec 16-18, 2026",
    location: "Macau SAR, China",
  },
  {
    id: "accv26-camera",
    acronym: "ACCV 2026",
    area: "CV",
    rankings: { core: "A", ccf: "C", ccfField: "Artificial Intelligence" },
    title: "Asian Conference on Computer Vision",
    stage: "CAMERA-READY",
    deadline: "2026-10-04T23:59:00Z",
    displayDeadline: "Oct 4, 2026 GMT 23:59",
    meeting: "Dec 16-18, 2026",
    location: "Macau SAR, China",
  },
  {
    id: "wacv27-decision",
    acronym: "WACV 2027",
    area: "CV",
    rankings: { core: "A", ccf: "-", ccfField: "Not Listed" },
    title: "Winter Conf. on Apps of CV",
    stage: "FINAL DECISIONS",
    deadline: "2026-10-10T11:59:59Z",
    displayDeadline: "Oct 10, 2026 UTC 11:59",
    meeting: "Jan 4-8, 2027",
    location: "Disney Springs, FL",
  },
  {
    id: "wacv27-camera",
    acronym: "WACV 2027",
    area: "CV",
    rankings: { core: "A", ccf: "-", ccfField: "Not Listed" },
    title: "Winter Conf. on Apps of CV",
    stage: "CAMERA-READY",
    deadline: "2026-11-03T11:59:59Z",
    displayDeadline: "Nov 3, 2026 UTC 11:59",
    meeting: "Jan 4-8, 2027",
    location: "Disney Springs, FL",
  },
  {
    id: "bmvc26-registration",
    acronym: "BMVC 2026",
    area: "CV",
    rankings: { core: "A", ccf: "C", ccfField: "Artificial Intelligence" },
    title: "British Machine Vision Conference",
    stage: "LATE REGISTRATION",
    deadline: "2026-11-03T11:59:59Z",
    displayDeadline: "Nov 2, 2026 AoE / Nov 3 UTC 11:59",
    meeting: "Nov 23-26, 2026",
    location: "Lancaster, UK",
  },
  {
    id: "cvpr27-abstract",
    acronym: "CVPR 2027",
    area: "CV",
    rankings: { core: "A*", ccf: "A", ccfField: "Artificial Intelligence" },
    title: "Computer Vision & Pattern Recognition",
    stage: "ABSTRACT REG.",
    deadline: "2026-11-08T11:59:59Z",
    displayDeadline: "Nov 7, 2026 AoE / Nov 8 UTC 11:59",
    meeting: "Jun 20-25, 2027",
    location: "Seattle, WA",
    projected: true,
  },
  {
    id: "cvpr27-paper",
    acronym: "CVPR 2027",
    area: "CV",
    rankings: { core: "A*", ccf: "A", ccfField: "Artificial Intelligence" },
    title: "Computer Vision & Pattern Recognition",
    stage: "FULL PAPER",
    deadline: "2026-11-14T11:59:59Z",
    displayDeadline: "Nov 13, 2026 AoE / Nov 14 UTC 11:59",
    meeting: "Jun 20-25, 2027",
    location: "Seattle, WA",
    projected: true,
  },
  {
    id: "cvpr27-supp",
    acronym: "CVPR 2027",
    area: "CV",
    rankings: { core: "A*", ccf: "A", ccfField: "Artificial Intelligence" },
    title: "Computer Vision & Pattern Recognition",
    stage: "SUPPLEMENTARY",
    deadline: "2026-11-21T11:59:59Z",
    displayDeadline: "Nov 20, 2026 AoE / Nov 21 UTC 11:59",
    meeting: "Jun 20-25, 2027",
    location: "Seattle, WA",
    projected: true,
  },
  {
    id: "bmvc26-conference",
    acronym: "BMVC 2026",
    area: "CV",
    rankings: { core: "A", ccf: "C", ccfField: "Artificial Intelligence" },
    title: "British Machine Vision Conference",
    stage: "MAIN CONFERENCE",
    deadline: "2026-11-23T00:00:00Z",
    displayDeadline: "Nov 23, 2026",
    meeting: "Nov 23-26, 2026",
    location: "Lancaster, UK",
  },
  {
    id: "iccv27-tba",
    acronym: "ICCV 2027",
    area: "CV",
    rankings: { core: "A*", ccf: "A", ccfField: "Artificial Intelligence" },
    title: "International Conference on Computer Vision",
    stage: "PAPER DEADLINE",
    displayDeadline: "Submission Date TBA",
    meeting: "Oct 2-8, 2027",
    location: "Hong Kong",
    tba: true,
  },
];

let conferences = fallbackConferences;

const board = document.querySelector("#conferenceBoard");
const displayCardCount = 11;
const localConferenceDataSource = "conferences.json";
const conferenceRefreshMs = 6 * 60 * 60 * 1000;
let remoteConferenceDataSource = "";

const conferenceCycleYears = {
  ACCV: 2,
  BMVC: 1,
  CVPR: 1,
  ECCV: 2,
  ICCV: 2,
  ICDAR: 2,
  ICIP: 1,
  WACV: 1,
};

const colorThemes = {
  light: true,
  dark: true,
};

function normalizeColorTheme(value) {
  return Object.prototype.hasOwnProperty.call(colorThemes, value) ? value : "light";
}

function applyColorTheme(value) {
  const theme = normalizeColorTheme(value);

  document.body.classList.remove("theme-light", "theme-dark");
  document.body.classList.add(`theme-${theme}`);
  document.body.dataset.colorTheme = theme;
}

function withCacheBuster(url) {
  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}t=${Date.now()}`;
}

function normalizeDataSourceUrl(value) {
  const url = String(value ?? "").trim();

  if (!url) {
    return "";
  }

  return /^https?:\/\//i.test(url) ? url : "";
}

function getConferenceDataSources() {
  const sources = [];

  if (remoteConferenceDataSource) {
    sources.push({ name: "remote", url: remoteConferenceDataSource });
  }

  sources.push({ name: "local", url: localConferenceDataSource });

  return sources;
}

function normalizeConferenceList(payload) {
  const list = Array.isArray(payload) ? payload : payload?.conferences;

  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  const isValid = list.every((item) => {
    return (
      item &&
      typeof item.id === "string" &&
      typeof item.acronym === "string" &&
      typeof item.area === "string" &&
      typeof item.title === "string" &&
      typeof item.stage === "string" &&
      typeof item.displayDeadline === "string" &&
      typeof item.meeting === "string" &&
      typeof item.location === "string" &&
      item.rankings &&
      typeof item.rankings.core === "string" &&
      typeof item.rankings.ccf === "string"
    );
  });

  if (!isValid) {
    return null;
  }

  return list.map((item) => ({
    ...item,
    rankings: {
      ccfField: "Not Listed",
      ...item.rankings,
    },
  }));
}

async function fetchConferenceList(source) {
  const response = await fetch(withCacheBuster(source.url), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`${source.name} data request failed: ${response.status}`);
  }

  const loadedConferences = normalizeConferenceList(await response.json());

  if (!loadedConferences) {
    throw new Error(`${source.name} data is empty or invalid.`);
  }

  return loadedConferences;
}

async function loadConferenceData() {
  if (typeof fetch !== "function") {
    document.body.dataset.dataSource = "fallback";
    render();
    return;
  }

  for (const source of getConferenceDataSources()) {
    try {
      conferences = await fetchConferenceList(source);
      document.body.dataset.dataSource = source.name;
      render();
      return;
    } catch (error) {
      console.warn(error);
    }
  }

  conferences = fallbackConferences;
  document.body.dataset.dataSource = "fallback";
  render();
}

function applyDataSourceUrl(value) {
  const nextSource = normalizeDataSourceUrl(value);

  if (nextSource === remoteConferenceDataSource) {
    return;
  }

  remoteConferenceDataSource = nextSource;
  loadConferenceData();
}

function getRemaining(target, now = new Date()) {
  if (!target) {
    return null;
  }

  const difference = new Date(target).getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(difference / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds, isPast: difference <= 0 };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function formatInlineText(value) {
  const parts = String(value).match(/[A-Za-z]+|\d+|[^A-Za-z\d]+/g) ?? [];

  return parts
    .map((part) => {
      const escaped = escapeHtml(part);

      if (/^[A-Za-z]+$/.test(part)) {
        return `<span class="latin-token latin-token--letters">${escaped}</span>`;
      }

      if (/^\d+$/.test(part)) {
        return `<span class="latin-token latin-token--digits">${escaped}</span>`;
      }

      return escaped;
    })
    .join("");
}

function statusFor(item, remaining) {
  if (item.tba || !remaining) {
    return "tba";
  }

  if (remaining.isPast) {
    return "past";
  }

  const days = remaining.totalSeconds / 86400;

  if (days <= 30) {
    return "urgent";
  }

  if (days <= 90) {
    return "soon";
  }

  return "later";
}

function renderCountdown(remaining) {
  if (!remaining) {
    return `<span class="countdown__num">${formatInlineText("TBA")}</span>`;
  }

  if (remaining.isPast) {
    return '<span class="countdown__num">CLOSED</span>';
  }

  return `
    <span class="countdown__num">${remaining.days}</span><span class="countdown__unit">D</span>
    <span class="countdown__sep">:</span>
    <span class="countdown__num">${pad(remaining.hours)}</span><span class="countdown__unit">H</span>
    <span class="countdown__sep">:</span>
    <span class="countdown__num">${pad(remaining.minutes)}</span><span class="countdown__unit">M</span>
    <span class="countdown__sep">:</span>
    <span class="countdown__num">${pad(remaining.seconds)}</span><span class="countdown__unit">S</span>
  `;
}

function renderCompactCountdown(remaining) {
  let label;

  if (!remaining) {
    label = "TBA";
  } else if (remaining.isPast) {
    label = "CLOSED";
  } else if (remaining.days > 0) {
    label = `${remaining.days}D ${pad(remaining.hours)}H`;
  } else if (remaining.hours > 0) {
    label = `${remaining.hours}H ${pad(remaining.minutes)}M`;
  } else {
    label = `${remaining.minutes}M ${pad(remaining.seconds)}S`;
  }

  return `<span class="countdown__compact">${formatInlineText(label)}</span>`;
}

function getDeadlineTime(item) {
  return item.deadline ? new Date(item.deadline).getTime() : Number.POSITIVE_INFINITY;
}

function getConferenceSeries(item) {
  return item.acronym.split(" ")[0];
}

function getConferenceYear(item) {
  const match = item.acronym.match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : new Date().getFullYear();
}

function createNextCyclePlaceholder(item) {
  const series = getConferenceSeries(item);
  const nextYear = getConferenceYear(item) + (conferenceCycleYears[series] ?? 1);

  return {
    id: `${item.id}-next-${nextYear}`,
    acronym: `${series} ${nextYear}`,
    area: item.area,
    rankings: item.rankings,
    title: item.title,
    stage: item.stage,
    displayDeadline: "Date TBA",
    meeting: "TBA",
    location: "TBA",
    tba: true,
    cyclePlaceholder: true,
  };
}

function getDisplayConferences(now = new Date()) {
  const currentTime = now.getTime();
  const datedFuture = conferences
    .filter((item) => item.deadline && getDeadlineTime(item) > currentTime)
    .sort((a, b) => getDeadlineTime(a) - getDeadlineTime(b));
  const announcedTba = conferences.filter((item) => item.tba);
  const expiredPlaceholders = conferences
    .filter((item) => item.deadline && getDeadlineTime(item) <= currentTime)
    .sort((a, b) => getDeadlineTime(a) - getDeadlineTime(b))
    .map(createNextCyclePlaceholder);
  const displayItems = [...datedFuture, ...announcedTba];

  for (const placeholder of expiredPlaceholders) {
    if (displayItems.length >= displayCardCount) {
      break;
    }

    displayItems.push(placeholder);
  }

  return displayItems.slice(0, displayCardCount);
}

function renderBadges(item) {
  const ccfRank = item.rankings.ccf;
  const ccfClass = ccfRank === "-" ? " badge--muted" : " badge--ccf";
  const projectedBadge = item.projected ? [`<span class="badge badge--estimate">${formatInlineText("EST.")}</span>`] : [];
  const cycleBadge = item.cyclePlaceholder ? [`<span class="badge badge--cycle">${formatInlineText("TBA")}</span>`] : [];

  return [
    `<span class="badge badge--area">${formatInlineText(item.area)}</span>`,
    `<span class="badge badge--core">${formatInlineText(`CORE ${item.rankings.core}`)}</span>`,
    `<span class="badge${ccfClass}" title="${escapeHtml(`CCF ${item.rankings.ccfField}`)}">${formatInlineText(`CCF ${ccfRank}`)}</span>`,
    ...projectedBadge,
    ...cycleBadge,
  ].join("");
}

function renderMeta(item) {
  return `
    <dl class="conference-meta">
      <div class="conference-meta__item conference-meta__item--deadline">
        <dt>${formatInlineText("DEADLINE")}</dt>
        <dd>${formatInlineText(item.displayDeadline)}</dd>
      </div>
      <div class="conference-meta__item conference-meta__item--meeting">
        <dt>${formatInlineText("MEETING")}</dt>
        <dd>${formatInlineText(item.meeting)}</dd>
      </div>
      <div class="conference-meta__item conference-meta__item--location">
        <dt>${formatInlineText("LOCATION")}</dt>
        <dd>${formatInlineText(item.location)}</dd>
      </div>
    </dl>
  `;
}

function createCard(item, now, featured = false) {
  const remaining = getRemaining(item.deadline, now);
  const status = statusFor(item, remaining);
  const cardClass = featured ? "conference-card conference-card--featured" : "conference-card";
  const cycleClass = item.cyclePlaceholder ? " is-cycle" : "";

  return `
    <article class="${cardClass}${cycleClass} status-${status}" data-deadline-id="${item.id}">
      <div class="conference-card__main">
        <div class="conference-card__top">
          <h2>${formatInlineText(item.acronym)}</h2>
          <div class="badges">${renderBadges(item)}</div>
        </div>
        <p class="conference-card__title">${formatInlineText(item.title)}</p>
        <p class="conference-card__stage">${formatInlineText(item.stage)}</p>
        <div class="countdown ${featured ? "countdown--featured" : ""}" aria-live="polite">
          ${featured ? renderCountdown(remaining) : renderCompactCountdown(remaining)}
        </div>
      </div>
      <div class="conference-card__details">
        ${renderMeta(item)}
      </div>
    </article>
  `;
}

function render(now = new Date()) {
  const displayItems = getDisplayConferences(now);
  const nextIndex = displayItems.findIndex((item) => item.deadline && getDeadlineTime(item) > now.getTime());
  const featured = displayItems[nextIndex >= 0 ? nextIndex : 0];
  const rest = displayItems.filter((item) => item.id !== featured.id);

  board.innerHTML = [createCard(featured, now, true), ...rest.map((item) => createCard(item, now))].join("");
}

const initialParams = new URLSearchParams(window.location.search);

remoteConferenceDataSource = normalizeDataSourceUrl(initialParams.get("data") ?? initialParams.get("source"));
applyColorTheme(initialParams.get("theme") ?? "light");
render();
loadConferenceData();
setInterval(() => render(), 1000);
setInterval(() => loadConferenceData(), conferenceRefreshMs);

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "l") {
    applyColorTheme("light");
  }

  if (event.key.toLowerCase() === "d") {
    applyColorTheme("dark");
  }
});

window.wallpaperPropertyListener = {
  applyUserProperties(properties) {
    if (properties.colortheme) {
      applyColorTheme(properties.colortheme.value);
    }

    if (properties.datasourceurl) {
      applyDataSourceUrl(properties.datasourceurl.value);
    }
  },
};
