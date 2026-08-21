#!/bin/bash

echo ""
echo "=========================================="
echo " WORLD OF BL - EXTRACTOR"
echo "=========================================="
echo ""

curl -L -A "Mozilla/5.0" \
"https://www.world-of-bl.com/index.php/Main/Shows" \
-o shows.html \
-sS

echo "HTML descargado."
echo ""

node <<'NODE'
const fs = require("fs");
const cheerio = require("cheerio");

const html = fs.readFileSync("shows.html", "utf8");
const $ = cheerio.load(html);

let results = [];

$("a").each((i, el) => {

    const text = $(el)
        .text()
        .replace(/\s+/g, " ")
        .trim();

    const href = $(el).attr("href") || "";

    if (!text) return;
    if (!href) return;

    results.push({
        text,
        href
    });
});

fs.writeFileSync(
    "all-links.json",
    JSON.stringify(results, null, 2)
);

console.log("TOTAL DE ENLACES:", results.length);
console.log("");
console.log("Archivo creado:");
console.log(process.cwd() + "/all-links.json");
NODE

echo ""
echo "=========================================="
echo " PRIMEROS ENLACES"
echo "=========================================="
echo ""

node <<'NODE'
const fs = require("fs");

const data = JSON.parse(
    fs.readFileSync("all-links.json", "utf8")
);

data.slice(0, 100).forEach((x, i) => {
    console.log(
        `[${i + 1}] ${x.text} => ${x.href}`
    );
});
NODE

echo ""
echo "=========================================="
echo " ARCHIVO COMPLETO"
echo "=========================================="
echo ""
echo "$HOME/asian-bl-universe/all-links.json"
echo ""
