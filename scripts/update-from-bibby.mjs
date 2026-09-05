import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BIBBY_CV_URL = "https://trybibby.com/conference-deadlines/cv";
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CURRENT_DATA_FILE = path.join(PROJECT_ROOT, "conferences.json");
const DRAFT_DATA_FILE = path.join(PROJECT_ROOT, "conferences.generated.json");
const APPLY_UPDATES = process.argv.includes("--apply");

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

function toAbsoluteUrl(value) {
  if (!value) {
    return "";
  }

  return new URL(decodeHtml(value), BIBBY_CV_URL).href;
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

function getDeadlineTime(item) {
  return item.deadline ? new Date(item.deadline).getTime() : Number.POSITIVE_INFINITY;
}

function stableStringify(value) {
  return JSON.stringify(value, null, 2);
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

function mergeConferences(currentConferences, bibbyConferences) {
  const bibbyById = new Map(bibbyConferences.map((item) => [item.id, item]));
  const bibbyAcronyms = new Set(bibbyConferences.map((item) => item.acronym));
  const merged = currentConferences
    .filter((item) => !(item.tba && bibbyAcronyms.has(item.acronym)))
    .map((item) => bibbyById.get(item.id) ?? item);
  const existingIds = new Set(merged.map((item) => item.id));

  for (const item of bibbyConferences) {
    if (!existingIds.has(item.id)) {
      merged.push(item);
      existingIds.add(item.id);
    }
  }

  return merged.sort((a, b) => getDeadlineTime(a) - getDeadlineTime(b));
}

async function main() {
  const currentData = JSON.parse(await fs.readFile(CURRENT_DATA_FILE, "utf8"));
  const currentConferences = Array.isArray(currentData) ? currentData : currentData.conferences;

  if (!Array.isArray(currentConferences)) {
    throw new Error("conferences.json does not contain a conferences array.");
  }

  const response = await fetch(BIBBY_CV_URL, {
    headers: {
      "user-agent": "Mozilla/5.0 CV Paper Clock data updater",
    },
  });

  if (!response.ok) {
    throw new Error(`Bibby request failed: ${response.status}`);
  }

  const bibbyConferences = parseBibbyCards(await response.text());
  const mergedConferences = mergeConferences(currentConferences, bibbyConferences);
  const outputFile = APPLY_UPDATES ? CURRENT_DATA_FILE : DRAFT_DATA_FILE;
  const hasConferenceChanges = stableStringify(currentConferences) !== stableStringify(mergedConferences);

  if (APPLY_UPDATES && !hasConferenceChanges) {
    console.log(`Imported ${bibbyConferences.length} Bibby entries.`);
    console.log("No conference data changes detected.");
    return;
  }

  const output = {
    updatedAt: new Date().toISOString().slice(0, 10),
    source: BIBBY_CV_URL,
    policy: {
      mode: APPLY_UPDATES ? "auto-apply" : "review-before-publish",
      allowedSeries: [...ALLOWED_SERIES],
      note: "Generated from Bibby visible CV cards, merged with existing local conferences.",
    },
    stats: {
      currentCount: currentConferences.length,
      bibbyImportedCount: bibbyConferences.length,
      outputCount: mergedConferences.length,
    },
    conferences: mergedConferences,
  };

  await fs.writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`Imported ${bibbyConferences.length} Bibby entries.`);
  console.log(`Wrote ${mergedConferences.length} entries to ${path.relative(PROJECT_ROOT, outputFile)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
