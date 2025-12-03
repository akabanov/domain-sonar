# Specifications

This is a single-page PWA built with vanilla JavaScript and HTML.

## TLD source

Create a GitHub Action (manual/weekly) to build the TLD list from
https://data.iana.org/TLD/tlds-alpha-by-domain.txt.as as a JSON array into `tlds.json`  
Load `tlds.json` from the app JavaScript code.

## App Layout

Clean, utilitarian, minimalistic, single-column responsive layout.
App icon and name in the app bar: "Taken Domain Sonar"
SEO-optimized app description at the top (dense version from this readme).
Static helper text: "Struggling to come up with a name? Try these generators:," with links referencing the [Random name generators](#random-name-generators) section below.
Prominent, centered input field for the base name (e.g., `birdcorner`).
Inline input validation: disallow empty/invalid characters; show subtle error styling (e.g., soft red border).
Footer: `© {current_year} Bird Corner Apps` linking to https://www.birdcorner.app.
Subtle UI transitions for result appearance, hover states, and history expansion.

## Domain search implementation

Implement DNS-over-HTTPS (DoH) provider rotation (e.g., Google, Cloudflare) with correct headers (`Accept: application/dns-json`).
Generous throttling between DNS queries (≤ ~70 qps per provider) to avoid rate limits.
Manage UI state during checks: disable active elements, like input and history while running; re-enable on completion.
Show progress UI: progress bar, live status like `Checking birdcorner.com... `, and current count `Checked N domains of M`.

## Result display

Prominent summary verdict at the top of search results with three states (e.g., "greenfield", "mixed", "crowded"), color-coded from green to orange based on availability density.
Two sections with counts — "Already In Use" (expanded) and "Potentially Available" (collapsed).
For "Already In Use" entries, link to `https://[domain]` (primary) and `http://[domain]` (secondary).
Display tip under results: "Tip: Some of these domains may be parked or for sale and not actively in use."
Add disclaimer: "Heads up: A 'Potentially Available' status is a good indicator a domain is not in use, but not a 100% guarantee. Final confirmation is with the registrar."
Between the sections there's an invitation: "Check pricing options at your favorite registrar" with the links to top registrars: [Namecheap](https://www.namecheap.com/), [GoDaddy](https://www.godaddy.com/), [Porkbun](https://porkbun.com/), [Dynadot](https://www.dynadot.com/), [Name.com](https://www.name.com/).

## Search history

Persist search history in `localStorage` with name and timestamp.
Show the 3 most recent searches by default; provide "Show all" to expand when >3 exist.
Allow deleting individual history items (permanent removal from `localStorage`).

## Final QA

Usability, responsive layout, and cross-browser checks.

