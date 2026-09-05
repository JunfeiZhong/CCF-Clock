import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BIBBY_CV_URL = "https://trybibby.com/conference-deadlines/cv";
const CCFDDL_URL = "https://raw.githubusercontent.com/ccfddl/ccfddl.github.io/master/conference/allconf.yml";
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CURRENT_DATA_FILE = path.join(PROJECT_ROOT, "conferences.json");
const DRAFT_DATA_FILE = path.join(PROJECT_ROOT, "conferences.generated.json");
const APPLY_UPDATES = process.argv.includes("--apply");
const FETCH_RETRIES = 3;
const FETCH_HEADERS = {
  "user-agent": "Mozilla/5.0 CV Paper Clock data updater",
};

const ALLOWED_SERIES = new Set(["ACCV", "BMVC", "CVPR", "ECCV", "ICCV", "ICDAR", "ICIP", "WACV"]);

const RANKINGS_BY_SERIES = {
  ACCV: { core: "A", ccf: "C", ccfField: "Artificial Intelligence" },
  BMVC: { core: "A", ccf: "C", ccfField: "Artificial Intelligence" },
  CVPR: { core: "A*", ccf: "A", ccfField: "Artificial Intelligence" },
  ECCV: { core: "A*", ccf: "B", ccfField: "Artificial Intelligence" },
  ICCV: { core: "A*", ccf: "A", ccfField: "Artificial Intelligence" },
  ICDAR: { core: "A", ccf: "C", ccfField: "Artificial Intelligence" },
  ICIP: { core: "A", ccf: "C", ccfField: "Artificial Intelligence" },
  WACV: { core: "A", ccf: "-", ccfField: "Not Listed" },
};

const TITLES_BY_SERIES = {
  ACCV: "Asian Conference on Computer Vision",
  BMVC: "British Machine Vision Conference",
  CVPR: "Computer Vision & Pattern Recognition",
  ECCV: "European Conference on Computer Vision",
  ICCV: "International Conference on Computer Vision",
  ICDAR: "Document Analysis and Recognition",
  ICIP: "IEEE International Conference on Image Processing",
  WACV: "Winter Conf. on Apps of CV",
};

function decodeHtml(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function stripTags(value) {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirst(value, pattern) {
  return value.match(pattern)?.[1] ?? "";
}

function toAbsoluteUrl(value, baseUrl = BIBBY_CV_URL) {
  if (!value) {
    return "";
  }

  return new URL(decodeHtml(value), baseUrl).href;
}

function normalizeStage(value) {
  const stage = value.replace(/\s+in$/i, "").trim();

  if (/abstract/i.test(stage)) {
    return "ABSTRACT REG.";
  }

  if (/camera/i.test(stage)) {
    return "CAMERA-READY";
  }

  if (/decision/i.test(stage)) {
    return "FINAL DECISIONS";
  }

  if (/supp/i.test(stage)) {
    return "SUPPLEMENTARY";
  }

  if (/paper/i.test(stage)) {
    return "FULL PAPER";
  }

  return stage.toUpperCase();
}

function getStageSuffix(stage) {
  const round = stage.match(/ROUND\s+(\d+)/i)?.[1];

  if (round && /ABSTRACT/i.test(stage)) {
    return `round-${round}-abstract`;
  }

  if (round && /PAPER/i.test(stage)) {
    return `round-${round}-paper`;
  }

  if (/ABSTRACT/.test(stage)) {
    return "abstract";
  }

  if (/CAMERA/.test(stage)) {
    return "camera";
  }

  if (/DECISION/.test(stage)) {
    return "decision";
  }

  if (/SUPPLEMENT/.test(stage)) {
    return "supp";
  }

  if (/PAPER/.test(stage)) {
    return "paper";
  }

  return stage.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseDeadline(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function cleanYamlScalar(value) {
  let scalar = String(value ?? "").trim();

  if (
    (scalar.startsWith("'") && scalar.endsWith("'")) ||
    (scalar.startsWith("\"") && scalar.endsWith("\""))
  ) {
    scalar = scalar.slice(1, -1);
  }

  return scalar.replace(/''/g, "'").trim();
}

function getUtcOffsetMinutes(timezone) {
  const zone = cleanYamlScalar(timezone);

  if (!zone) {
    return null;
  }

  if (/^(aoe|utc-12)$/i.test(zone)) {
    return -12 * 60;
  }

  if (/^utc$/i.test(zone)) {
    return 0;
  }

  const match = zone.match(/^utc\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);

  if (!match) {
    return null;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3] ?? "0", 10);

  return sign * (hours * 60 + minutes);
}

function parseZonedDeadline(value, timezone) {
  const deadline = cleanYamlScalar(value).replace("T", " ");
  const match = deadline.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!match) {
    return parseDeadline(deadline);
  }

  const offsetMinutes = getUtcOffsetMinutes(timezone);

  if (offsetMinutes === null) {
    return parseDeadline(deadline);
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  const localTime = Date.UTC(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
    Number.parseInt(hour, 10),
    Number.parseInt(minute, 10),
    Number.parseInt(second, 10),
  );

  return new Date(localTime - offsetMinutes * 60_000).toISOString();
}

function formatCcfddlDeadline(value, timezone) {
  const deadline = cleanYamlScalar(value).replace("T", " ");
  const match = deadline.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);

  if (!match) {
    return deadline || "Date TBA";
  }

  const [, year, month, day, hour, minute] = match;
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    Number.parseInt(month, 10) - 1
  ];
  const zone = cleanYamlScalar(timezone) || "UTC";

  return `${monthName} ${Number.parseInt(day, 10)}, ${year} ${zone} ${hour}:${minute}`;
}

function getRoundNumber(comment) {
  const text = cleanYamlScalar(comment).toLowerCase();

  if (/\b(first|round\s*1|1st)\b/.test(text)) {
    return 1;
  }

  if (/\b(second|round\s*2|2nd)\b/.test(text)) {
    return 2;
  }

  return null;
}

function getCcfddlStage(key, comment) {
  const round = getRoundNumber(comment);

  if (round && key === "abstract_deadline") {
    return `ROUND ${round} ABSTRACT`;
  }

  if (round && key === "deadline") {
    return `ROUND ${round} PAPER`;
  }

  return key === "abstract_deadline" ? "ABSTRACT REG." : "FULL PAPER";
}

function getDeadlineTime(item) {
  return item.deadline ? new Date(item.deadline).getTime() : Number.POSITIVE_INFINITY;
}

function stableStringify(value) {
  return JSON.stringify(value, null, 2);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchText(url) {
  let lastError = null;

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    let response;

    try {
      response = await fetch(url, { headers: FETCH_HEADERS });
    } catch (error) {
      lastError = error;

      if (attempt < FETCH_RETRIES) {
        await wait(750 * attempt);
        continue;
      }

      throw error;
    }

    if (!response.ok) {
      throw new Error(`request failed: ${response.status}`);
    }

    return response.text();
  }

  throw lastError ?? new Error("request failed");
}

function parseCard(cardHtml) {
  const text = stripTags(cardHtml);
  const rawName = stripTags(extractFirst(cardHtml, /<h3[^>]*>([\s\S]*?)<\/h3>/));
  const name = rawName.replace(/\s*\[EST\.\]\s*/i, " ").replace(/\s+/g, " ").trim();
  const [, series, year] = name.match(/^([A-Z0-9]+)\s+(\d{4})\b/) ?? [];

  if (!series || !year || !ALLOWED_SERIES.has(series)) {
    return null;
  }

  const afterHeading = cardHtml.split("</h3></a>")[1] ?? "";
  const subtitleHtml = extractFirst(afterHeading, /<div[^>]*>([\s\S]*?)<\/div>/);
  const subtitle = stripTags(subtitleHtml);
  const [title, subtitleStage = "Paper"] = subtitle.split(/\s+-\s+/);
  const deadlineText = extractFirst(text, /\bdeadline\s+(.+?)\s+conference\s+/i);
  const meeting = extractFirst(text, /\bconference\s+(.+?)\s+venue\s+/i);
  const location = extractFirst(text, /\bvenue\s+(.+?)\s+official call/i);
  const stage = normalizeStage(subtitleStage);
  const deadline = parseDeadline(deadlineText);
  const suffix = getStageSuffix(stage);
  const href = extractFirst(cardHtml, /<a\s+href="([^"]+)"/);
  const projected = /\[EST\.\]/i.test(rawName);

  return {
    id: `${series.toLowerCase()}${year.slice(-2)}-${suffix}`,
    acronym: `${series} ${year}`,
    area: "CV",
    rankings: RANKINGS_BY_SERIES[series],
    title: title || name,
    stage,
    deadline,
    displayDeadline: deadlineText || "Date TBA",
    meeting: meeting || "TBA",
    location: location || "TBA",
    ...(projected ? { projected: true } : {}),
    ...(!deadline ? { tba: true } : {}),
    source: "Bibby CV Clock",
    sourceUrl: toAbsoluteUrl(href),
  };
}

function parseBibbyCards(html) {
  const cards = [...html.matchAll(/<article class="card"[\s\S]*?<\/article>/g)].map((match) => match[0]);
  const parsed = cards.map(parseCard).filter(Boolean);
  const unique = new Map();

  for (const item of parsed) {
    unique.set(item.id, item);
  }

  return [...unique.values()];
}

function parseCcfddlConfs(block) {
  const confs = [];
  const lines = block.split(/\r?\n/);
  let current = null;
  let inTimeline = false;
  let currentTimelineItem = null;

  for (const line of lines) {
    const yearMatch = line.match(/^  - year:\s*(.+)\s*$/);

    if (yearMatch) {
      if (current) {
        confs.push(current);
      }

      current = { year: cleanYamlScalar(yearMatch[1]), timeline: [] };
      inTimeline = false;
      currentTimelineItem = null;
      continue;
    }

    if (!current) {
      continue;
    }

    if (/^    timeline:\s*$/.test(line)) {
      inTimeline = true;
      currentTimelineItem = null;
      continue;
    }

    if (inTimeline) {
      const itemStart = line.match(/^    - ([a-z_]+):\s*(.*)$/);

      if (itemStart) {
        currentTimelineItem = { [itemStart[1]]: cleanYamlScalar(itemStart[2]) };
        current.timeline.push(currentTimelineItem);
        continue;
      }

      const itemValue = line.match(/^      ([a-z_]+):\s*(.*)$/);

      if (itemValue && currentTimelineItem) {
        currentTimelineItem[itemValue[1]] = cleanYamlScalar(itemValue[2]);
        continue;
      }

      if (/^    [a-z_]+:/.test(line)) {
        inTimeline = false;
        currentTimelineItem = null;
      } else {
        continue;
      }
    }

    const propertyMatch = line.match(/^    ([a-z_]+):\s*(.*)$/);

    if (propertyMatch) {
      current[propertyMatch[1]] = cleanYamlScalar(propertyMatch[2]);
    }
  }

  if (current) {
    confs.push(current);
  }

  return confs;
}

function parseCcfddlConferences(yaml, now = Date.now()) {
  const blocks = String(yaml).replace(/^\uFEFF/, "").split(/\n(?=- title:\s)/);
  const parsed = [];

  for (const block of blocks) {
    const series = cleanYamlScalar(block.match(/^- title:\s*(.+)$/m)?.[1] ?? "");

    if (!ALLOWED_SERIES.has(series)) {
      continue;
    }

    const description = cleanYamlScalar(block.match(/^  description:\s*(.+)$/m)?.[1] ?? "");
    const title = TITLES_BY_SERIES[series] ?? description;

    for (const conf of parseCcfddlConfs(block)) {
      const year = Number.parseInt(conf.year, 10);

      if (!Number.isInteger(year)) {
        continue;
      }

      for (const timelineItem of conf.timeline) {
        for (const key of ["abstract_deadline", "deadline"]) {
          if (!timelineItem[key]) {
            continue;
          }

          const deadline = parseZonedDeadline(timelineItem[key], conf.timezone);

          if (!deadline || new Date(deadline).getTime() < now) {
            continue;
          }

          const stage = getCcfddlStage(key, timelineItem.comment);
          const suffix = getStageSuffix(stage);

          parsed.push({
            id: `${series.toLowerCase()}${String(year).slice(-2)}-${suffix}`,
            acronym: `${series} ${year}`,
            area: "CV",
            rankings: RANKINGS_BY_SERIES[series],
            title,
            stage,
            deadline,
            displayDeadline: formatCcfddlDeadline(timelineItem[key], conf.timezone),
            meeting: conf.date || "TBA",
            location: conf.place || "TBA",
            source: "ccfddl",
            sourceUrl: toAbsoluteUrl(conf.link, CCFDDL_URL),
          });
        }
      }
    }
  }

  const unique = new Map();

  for (const item of parsed) {
    unique.set(item.id, item);
  }

  return [...unique.values()].sort((a, b) => getDeadlineTime(a) - getDeadlineTime(b));
}

function mergeConferences(currentConferences, importedConferences) {
  const importedById = new Map(importedConferences.map((item) => [item.id, item]));
  const importedAcronyms = new Set(importedConferences.map((item) => item.acronym));
  const merged = currentConferences
    .filter((item) => !(item.tba && importedAcronyms.has(item.acronym)))
    .map((item) => importedById.get(item.id) ?? item);
  const existingIds = new Set(merged.map((item) => item.id));

  for (const item of importedConferences) {
    if (!existingIds.has(item.id)) {
      merged.push(item);
      existingIds.add(item.id);
    }
  }

  return merged.sort((a, b) => getDeadlineTime(a) - getDeadlineTime(b));
}

async function fetchBibbyConferences() {
  const conferences = parseBibbyCards(await fetchText(BIBBY_CV_URL));

  if (!conferences.length) {
    throw new Error("no supported CV cards found");
  }

  return {
    name: "Bibby CV Clock",
    url: BIBBY_CV_URL,
    conferences,
  };
}

async function fetchCcfddlConferences() {
  const conferences = parseCcfddlConferences(await fetchText(CCFDDL_URL));

  if (!conferences.length) {
    throw new Error("no upcoming supported CV entries found");
  }

  return {
    name: "ccfddl",
    url: CCFDDL_URL,
    conferences,
  };
}

async function fetchUpstreamConferences() {
  const errors = [];
  const loaders = [
    { name: "Bibby CV Clock", load: fetchBibbyConferences },
    { name: "ccfddl", load: fetchCcfddlConferences },
  ];

  for (const loader of loaders) {
    try {
      const result = await loader.load();
      return { ...result, errors };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${loader.name}: ${message}`);
      console.warn(`Warning: ${loader.name} unavailable: ${message}`);
    }
  }

  return {
    name: "No upstream source",
    url: "",
    conferences: [],
    errors,
  };
}

async function main() {
  const currentData = JSON.parse(await fs.readFile(CURRENT_DATA_FILE, "utf8"));
  const currentConferences = Array.isArray(currentData) ? currentData : currentData.conferences;

  if (!Array.isArray(currentConferences)) {
    throw new Error("conferences.json does not contain a conferences array.");
  }

  const upstream = await fetchUpstreamConferences();

  if (!upstream.conferences.length) {
    console.warn("No upstream conference data available. Keeping current data unchanged.");
    return;
  }

  const mergedConferences = mergeConferences(currentConferences, upstream.conferences);
  const outputFile = APPLY_UPDATES ? CURRENT_DATA_FILE : DRAFT_DATA_FILE;
  const hasConferenceChanges = stableStringify(currentConferences) !== stableStringify(mergedConferences);

  if (APPLY_UPDATES && !hasConferenceChanges) {
    console.log(`Imported ${upstream.conferences.length} entries from ${upstream.name}.`);
    console.log("No conference data changes detected.");
    return;
  }

  const output = {
    updatedAt: new Date().toISOString().slice(0, 10),
    source: upstream.url,
    policy: {
      mode: APPLY_UPDATES ? "auto-apply" : "review-before-publish",
      allowedSeries: [...ALLOWED_SERIES],
      note: `Generated from ${upstream.name}, merged with existing local conferences.`,
    },
    stats: {
      currentCount: currentConferences.length,
      importedCount: upstream.conferences.length,
      source: upstream.name,
      outputCount: mergedConferences.length,
      ...(upstream.errors.length ? { upstreamWarnings: upstream.errors } : {}),
    },
    conferences: mergedConferences,
  };

  await fs.writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`Imported ${upstream.conferences.length} entries from ${upstream.name}.`);
  console.log(`Wrote ${mergedConferences.length} entries to ${path.relative(PROJECT_ROOT, outputFile)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
