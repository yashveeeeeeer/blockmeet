# BLOCKMeet

An ultra-interactive Minecraft-inspired 8-bit pixel world landing page that redirects visitors to Cal.com booking links. Built with Vite + React + TypeScript + TailwindCSS + Framer Motion.

## Village destinations

- `/blockmeet/athenaeum`: the reading library, with covers, titles, category filters and author/title search. No dates or reading-status labels.
- `/blockmeet/bakery`: the original writings page, including its articles, reading animations and display controls. Published article URLs under `/blockmeet/writings/` are unchanged.

Both houses are clickable. Keyboard users can reach each destination through skip links that appear only on focus. Bakery and Athenaeum remain visible when the village draws fewer buildings.

## Reading library

The source is the first tab of [the reading sheet](https://docs.google.com/spreadsheets/d/1_osSnIbsvgJADRjoIj07pE1AOh1BuAOpSfENd58M4QM/edit). Keep it readable by anyone with the link; no Google credentials are stored in this repository.

Keep the `Title`, `Type`, `Author`, and `Link` column names. Only `Title` is required. Add rows normally: the page fetches the public CSV on each visit and categories are generated from `Type`. Books, essays, articles, web pages, papers and courses are recognized; other type names also work. `Added`, `Status`, `Finished`, and `Notes` are not shown. Empty rows are ignored and duplicate title/author pairs share one card. Items without a valid HTTP(S) link remain readable cards.

`public/library/readings.csv` is the saved fallback. The page starts with this copy (or the last successfully fetched copy in the visitor's browser), so a slow or unavailable Google Sheet does not leave an empty page. It offers a refresh if the live request fails.

### Covers and automatic refresh

Run `npm run library:sync` with Node 22.18+ to refresh the CSV and cover catalog. The sync checks publisher ISBN covers, source-page image metadata and explicitly labelled cover illustrations. For books without a usable image, it also searches Google Books and Open Library using the title and author. At least two lookups are attempted before an unresolved book uses a plain white title page. Search results, errors and source URLs are recorded in `public/library/covers.json`. Images are cached in `public/library/covers/`; visitors do not depend on publisher image servers. `cover-overrides.json` holds verified edition-specific sources and exclusions for misleading generic site images.

The existing GitHub Pages workflow runs the sync before each deployment and every six hours. New rows appear on the next page visit; their discovered covers appear after the next deployment. Until then they use the same white title-page treatment. A failed sheet request preserves the checked-in fallback. GitHub may delay scheduled runs, and pauses schedules in public repositories after 60 days without activity; the live CSV continues updating titles while the sheet remains accessible. The workflow can also be run manually from Actions.

No spreadsheet writes, account switching, API keys or paid services are needed. Author and status information are not printed on cards; the author remains searchable and available in the accessible link label.

## Development

```sh
npm ci
npm run dev
npm test
npm run build
```

Open the Vite URL with the `/blockmeet/` base path. Pull requests run the parser/data checks and production build. GitHub Pages' existing `404.html` redirect supports direct links and reloads at both destinations.
