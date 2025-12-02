# Taken Domain Sonar

## App description

### What the App Does

The app is a domain name availability checker. Its core purpose is to solve a common and frustrating problem: finding a unique name for a new business, product, or project that isn't already taken online.

You give it a single name (like "**birdcorner**"), and it scans hundreds of internet domain extensions (called Top-Level Domains or TLDs) to see which ones are available and which are already in use, helping you see the entire brand landscape at a glance.

### How It Works

The app works through a simple three-step process, all from within your browser:

1.  **Generate a List:** When you enter a base name, the app combines it with a built-in list of roughly 1,500 official TLDs (`.com`, `.app`, `.io`, `.store`, etc.). This creates a massive list of potential domain names to check (e.g., `birdcorner.app`, `birdcorner.org`, `birdcorner.dev`, and so on).

2.  **Query DNS Servers:** The app doesn't actually try to *visit* each website. Instead, it uses a technology called **DNS-over-HTTPS (DoH)**. It sends a tiny, secure query to a public DNS server (like Google's or Cloudflare's) for each domain on its list. This is like asking a phone book for the internet: "Is there an entry for `birdcorner.app`?"

3.  **Interpret the Results:**
  *   If the DNS server responds with an IP address, it means the domain is registered and active. The app sorts this into the "**Already In Use**" list.
  *   If the DNS server responds with an error (for example, "NXDOMAIN" or "non-existent domain"), it means there's no record of that domain. This is a strong signal that it's unregistered, and the app sorts it into the "**Potentially Available**" list.

To avoid getting blocked, the app automatically throttles its own requests, adding a small delay between each check and rotating between different DoH providers.

### Practical Use Cases:

* **Startup Naming:** Validate your new company name before you register it.
* **Product Launches:** Find an available domain for a new product or service.
  * **Marketing Campaigns:** Secure unique domains for microsites and marketing
    initiatives.
* **Creative Projects:** Check the availability of a name for your new blog,
  app, or side project.
* **SEO & Domain Investing:** Quickly identify potentially valuable,
  unregistered domain names.

## Specifications

This is a single-page PWA built with vanilla JavaScript and HTML.

### TLD source

Create a GitHub Action (manual/weekly) to build the TLD list from 
https://data.iana.org/TLD/tlds-alpha-by-domain.txt.as as a JSON array into `tlds.json`  
Load `tlds.json` from the app JavaScript code.

### App Layout

Clean, utilitarian, minimalistic, single-column responsive layout.
App icon and name in the app bar: "Taken Domain Sonar"
SEO-optimized app description at the top (dense version from this readme).
Static helper text: "Struggling to come up with a name? Try these generators:," with links referencing the [Random name generators](#random-name-generators) section below.
Prominent, centered input field for the base name (e.g., `birdcorner`).
Inline input validation: disallow empty/invalid characters; show subtle error styling (e.g., soft red border).
Footer: `© {current_year} Bird Corner Apps` linking to https://www.birdcorner.app.
Subtle UI transitions for result appearance, hover states, and history expansion.

### Domain search implementation

Implement DNS-over-HTTPS (DoH) provider rotation (e.g., Google, Cloudflare) with correct headers (`Accept: application/dns-json`).
Generous throttling between DNS queries (≤ ~70 qps per provider) to avoid rate limits.
Manage UI state during checks: disable active elements, like input and history while running; re-enable on completion.
Show progress UI: progress bar, live status like `Checking birdcorner.com... `, and current count `Checked N domains of M`.

### Result display

Prominent summary verdict at the top of search results with three states (e.g., "greenfield", "mixed", "crowded"), color-coded from green to orange based on availability density.
Two sections with counts — "Already In Use" (expanded) and "Potentially Available" (collapsed).
For "Already In Use" entries, link to `https://[domain]` (primary) and `http://[domain]` (secondary).
Display tip under results: "Tip: Some of these domains may be parked or for sale and not actively in use."
Add disclaimer: "Heads up: A 'Potentially Available' status is a good indicator a domain is not in use, but not a 100% guarantee. Final confirmation is with the registrar."
Between the sections there's an invitation: "Check pricing options at your favorite registrar" with the links to top registrars: [Namecheap](https://www.namecheap.com/), [GoDaddy](https://www.godaddy.com/), [Porkbun](https://porkbun.com/), [Dynadot](https://www.dynadot.com/), [Name.com](https://www.name.com/).

### Search history

Persist search history in `localStorage` with name and timestamp.
Show the 3 most recent searches by default; provide "Show all" to expand when >3 exist.
Allow deleting individual history items (permanent removal from `localStorage`).

### Final QA

Usability, responsive layout, and cross-browser checks.

## Extras

### Random name generators

* [Random lists](https://www.randomlists.com/team-names)
* [Shopify](https://www.shopify.com/tools/business-name-generator)
* [Design.com](https://www.design.com/business-name-generator/)
* [heyhey132](https://businessnamegen.com/business-name-generator/)
* [Alex Völk](https://alexvoelk.de/generators/game-studio/)
