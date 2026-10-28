# BLOCKMeet

An ultra-interactive Minecraft-inspired 8-bit pixel world landing page that redirects visitors to Cal.com booking links. Built with Vite + React + TypeScript + TailwindCSS + Framer Motion.

## Village destinations

- `/blockmeet/athenaeum`: a Three.js reading shelf, with interactive book spines, covers, a category dropdown in the collection header. No dates or reading-status labels.
- `/blockmeet/bakery`: the original writings page, including its articles, reading animations and display controls. Published article URLs under `/blockmeet/writings/` are unchanged.

Both houses are clickable. Keyboard users can reach each destination through skip links that appear only on focus. Bakery and Athenaeum remain visible when the village draws fewer buildings.

## Reading library

The source is the first tab of [the reading sheet](https://docs.google.com/spreadsheets/d/1_osSnIbsvgJADRjoIj07pE1AOh1BuAOpSfENd58M4QM/edit). Keep it readable by anyone with the link; no Google credentials are stored in this repository. Readings keep the sheet's row order, including when filtered. After `All`, dropdown categories follow the order in which each type first appears in the sheet. Rearranging rows updates that order on the next visit.

Keep the `Title`, `Type`, `Author`, and `Link` column names. Only `Title` is required. Add rows normally: the page fetches the public CSV on each visit and categories are generated from `Type`. Books, essays, articles, web pages, papers and courses are recognized; other type names also work. `Added`, `Status`, `Finished`, and `Notes` are not shown. Empty rows are ignored and duplicate title/author pairs share one card. Items without a valid HTTP(S) link remain readable cards.

`public/library/readings.csv` is the saved fallback. The page starts with this copy (or the last successfully fetched copy in the visitor's browser), so a slow or unavailable Google Sheet does not leave an empty page. A failed live request keeps the saved collection visible.

`public/library/additions.csv` holds readings added through GitHub when the sheet cannot be edited. These follow the sheet rows in file order and are included in the initial, cached, and live collection, as well as cover syncs. A matching title/author pair or URL in the sheet takes precedence, so moving an addition into the sheet does not create a duplicate and uses the sheet's position. Remove its row from `additions.csv` once the sheet is maintained as its source. Dates and completion status remain hidden.

### Interactive shelf

The shelf is an original implementation inspired by the stacked-book interaction at Stripe Press. Its reusable Three.js geometry, cloth textures, title typography, and binding colors are generated locally; no Stripe models, code, branding, or artwork are included. Books use the existing cached front covers. Essays use generated title bindings, so generic social-preview thumbnails never appear on the shelf.

Select a spine to inspect a cover. Drag a selected book, use the rotation buttons, or press Left/Right to turn it; select it again or press Escape to put it back. Every volume has an ordinary source link. Colors are derived from the reading ID and do not change when filtering or reordering the sheet. New sheet rows receive a binding automatically.

The closed shelf uses small transparent WebP renders on both desktop and mobile. Scrolling creates no WebGL renderer, worker, geometry, or per-frame layout loop. The first six previews load eagerly; idle work warms up to 64 remaining previews at low priority, two at a time, while native lazy loading handles any larger collection. Decoded images remain in the document when scrolled off screen. The 3D code loads only when a book is opened, and only that selected book gets a renderer. Desktop retains its high-resolution material settings; narrow screens or coarse-pointer devices use a 1.5 device-pixel-ratio cap, a 1.5-million-pixel budget, smaller textures, and lighter geometry. The renderer is disposed after closing. Reduced-motion preferences disable rotational transitions. Reopening a book resets its rotation.

This avoids the old desktop cache churn: limiting the shelf to 12 GPU books caused earlier bindings to be disposed and reconstructed when scrolling back, including texture uploads and relief generation. Browser caching of downloaded cover images did not prevent that rebuilding.

Shelf preview assets live in `public/library/shelf-previews/`, indexed by `shelf-previews.json`. Their fingerprints include the title, author, category, and cover path. Each render also gets a content-hash revision in its URL so updated graphics bypass stale browser caches. New or changed sheet rows immediately get a lightweight titled spine until regenerated; opening still uses their current 3D cover. To regenerate previews after `npm run library:sync` or a binding geometry/material change, start `npm run dev`, open `/blockmeet/__shelf-previews`, and choose **Generate and save shelf previews**. Review and commit the resulting assets and manifest. This same-origin export tool and its write endpoint exist only in the local dev server and are excluded from production.

The hardcover geometry is generated locally from a compact cross-section: recessed cover hinges, beveled boards, an inset page block and a rounded spine. Raised spine lettering conforms to that curve. It needs no external 3D model download; the closed shelf uses the same model rendered to WebP and creates no WebGL scene while scrolling.

E-ink mode uses a paper-colored layout with upright grayscale covers. Each cover links directly to its source in a new tab, without expanding a details section; entries without a URL remain static. There is no 3D rotation, gloss, or CRT effect in e-ink mode. WebGL initialization failures and lost contexts use the upright HTML grid with expandable details in the current color theme. Renderer resources and listeners are disposed when leaving the shelf or changing its collection.

### Cover sync

Run `npm run library:sync` with Node 22.18+ to refresh the CSV and cover catalog. The sync checks publisher ISBN covers, source-page image metadata and explicitly labelled cover illustrations. For books without a usable image, it also searches Google Books and Open Library using the title and author. At least two lookups are attempted before an unresolved book uses a plain white title page. Search results, errors and source URLs are recorded in `public/library/covers.json`. Images are cached in `public/library/covers/`; visitors do not depend on publisher image servers. `cover-overrides.json` holds verified edition-specific sources and exclusions for misleading generic site images.

The existing GitHub Pages workflow runs the sync before each deployment and every six hours. New rows appear on the next page visit; their discovered covers appear after the next deployment. Until then they use the same white title-page treatment. A failed sheet request preserves the checked-in fallback. GitHub may delay scheduled runs, and pauses schedules in public repositories after 60 days without activity; the live CSV continues updating titles while the sheet remains accessible. The workflow can also be run manually from Actions.

No spreadsheet writes, account switching, API keys or paid services are needed. Dates and status labels are not displayed; author names remain on generated covers and in the 3D reading details.

## Development

```sh
npm ci
npm run dev
npm test
npm run build
```

Open the Vite URL with the `/blockmeet/` base path. Pull requests run the parser/data checks and production build. GitHub Pages' existing `404.html` redirect supports direct links and reloads at both destinations.
