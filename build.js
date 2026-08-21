const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const SOURCES = [
  "https://www.world-of-bl.com/index.php/Main/Shows",
  "https://www.world-of-bl.com/index.php/Main/Shows-Country"
];

const COUNTRIES = [
  "Brazil",
  "Cambodia",
  "China",
  "Hong Kong",
  "India",
  "Japan",
  "Laos",
  "Myanmar",
  "Philippines",
  "South Korea",
  "Taiwan",
  "Thailand",
  "Vietnam"
];

function normalize(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*OFFLINE[^)]*\)/gi, "")
    .trim();
}

function cleanTitle(title) {
  title = normalize(title);

  if (!title || title.length < 2) return null;

  const lower = title.toLowerCase();

  const badExact = [
    "view",
    "edit",
    "history",
    "attach",
    "print",
    "search",
    "platform",
    "home page",
    "archive",
    "calendar",
    "support me",
    "twitter",
    "youtube",
    "viki",
    "wetv",
    "iqiyi",
    "gaga"
  ];

  if (badExact.includes(lower)) return null;

  if (/^\d{4}$/.test(title)) return null;

  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i.test(title)) {
    return null;
  }

  if (/^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i.test(title)) {
    return null;
  }

  if (/\bshort\b/i.test(title)) return null;

  return title;
}

function detectCountry(text) {
  for (const country of COUNTRIES) {
    if (text.toLowerCase().includes(country.toLowerCase())) {
      return country;
    }
  }

  return "Other Asia";
}

async function getPage(url) {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  return response.data;
}

async function imdbSearch(title, year) {
  try {
    const url =
      "https://v2.sg.media-imdb.com/suggestion/x/" +
      encodeURIComponent(title) +
      ".json";

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const results = response.data?.d || [];

    const series = results.filter(x =>
      x.id &&
      x.id.startsWith("tt") &&
      (
        x.qid === "tvSeries" ||
        x.qid === "tvMiniSeries"
      )
    );

    if (!series.length) return null;

    if (year) {
      const exact = series.find(
        x => Number(x.y) === Number(year)
      );

      if (exact) return exact;
    }

    return series[0];

  } catch {
    return null;
  }
}

async function main() {

  console.log("");
  console.log("==========================================");
  console.log("        ASIAN BL UNIVERSE BUILDER");
  console.log("==========================================");
  console.log("");

  const found = new Map();

  for (const source of SOURCES) {

    console.log("Descargando:");
    console.log(source);
    console.log("");

    try {

      const html = await getPage(source);

      console.log("HTTP 200");
      console.log("");

      const $ = cheerio.load(html);

      $("a").each((i, el) => {

        const href = $(el).attr("href") || "";

        if (!href.includes("Main/")) return;

        let title = $(el).text().trim();

        title = cleanTitle(title);

        if (!title) return;

        const rowText = $(el)
          .closest("tr")
          .text()
          .replace(/\s+/g, " ");

        const parentText = $(el)
          .parent()
          .text()
          .replace(/\s+/g, " ");

        const context = rowText + " " + parentText;

        const country = detectCountry(context);

        const years = context.match(/\b(19|20)\d{2}\b/g);

        const year = years
          ? Number(years[0])
          : null;

        const key = title
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .trim();

        if (!found.has(key)) {

          found.set(key, {
            name: title,
            country,
            year
          });

        } else {

          const existing = found.get(key);

          if (
            existing.country === "Other Asia" &&
            country !== "Other Asia"
          ) {
            existing.country = country;
          }

          if (!existing.year && year) {
            existing.year = year;
          }
        }
      });

    } catch (error) {

      console.log(
        "ERROR:",
        error.response?.status || error.message
      );

      console.log("");
    }
  }

  const titles = [...found.values()];

  console.log("==========================================");
  console.log("TÍTULOS DESCUBIERTOS:", titles.length);
  console.log("==========================================");
  console.log("");

  const catalog = [];
  const missing = [];
  const seenIMDb = new Set();

  for (let i = 0; i < titles.length; i++) {

    const item = titles[i];

    process.stdout.write(
      `[${i + 1}/${titles.length}] ${item.name}`
    );

    const imdb = await imdbSearch(
      item.name,
      item.year
    );

    if (!imdb) {

      missing.push(item);

      console.log(" → SIN IMDb");

      continue;
    }

    if (seenIMDb.has(imdb.id)) {

      console.log(" → DUPLICADO IMDb");

      continue;
    }

    seenIMDb.add(imdb.id);

    if (imdb.y) {
      item.year = Number(imdb.y);
    }

    catalog.push({
      id: imdb.id,
      type: "series",
      name: item.name,
      year: item.year || undefined,
      imdb_id: imdb.id,
      country: item.country
    });

    console.log(" →", imdb.id);
  }

  fs.writeFileSync(
    "catalog.json",
    JSON.stringify(catalog, null, 2)
  );

  fs.writeFileSync(
    "missing.json",
    JSON.stringify(missing, null, 2)
  );

  console.log("");
  console.log("==========================================");
  console.log("                RESULTADO");
  console.log("==========================================");
  console.log("");
  console.log("TÍTULOS ÚNICOS:", titles.length);
  console.log("CON IMDb:", catalog.length);
  console.log("SIN IMDb:", missing.length);
  console.log("TOTAL:", catalog.length + missing.length);
  console.log("");
  console.log("catalog.json creado correctamente.");
  console.log("missing.json creado correctamente.");
  console.log("");
}

main().catch(error => {

  console.error("");
  console.error("==========================================");
  console.error("                  ERROR");
  console.error("==========================================");
  console.error("");

  console.error(
    error.response?.status ||
    error.message ||
    error
  );

  console.error("");

  process.exit(1);
});
