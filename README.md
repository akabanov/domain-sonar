# Domain Sonar

## App description

### What the App Does

The app is a domain name availability checker. Its core purpose is to solve a
common and frustrating problem: finding a unique name for a new business,
product, or project that isn't already taken online.

You give it a single name (like "**birdcorner**"), and it scans hundreds of
internet domain extensions (called Top-Level Domains or TLDs) to see which ones
are available and which are already in use, helping you see the entire brand
landscape at a glance.

### How It Works

The app works through a simple three-step process, all from within your browser:

1. **Generate a List:** When you enter a base name, the app combines it with a
   built-in list of roughly 1,500 official TLDs (`.com`, `.app`, `.io`,
   `.store`, etc.). This creates a massive list of potential domain names to
   check (e.g., `birdcorner.app`, `birdcorner.org`, `birdcorner.dev`, and so
   on).

2. **Query DNS Servers:** The app doesn't actually try to *visit* each website.
   Instead, it uses a technology called **DNS-over-HTTPS (DoH)**. It sends a
   tiny, secure query to a public DNS server (like Google's or Cloudflare's) for
   each domain on its list. This is like asking a phone book for the internet: "
   Is there an entry for `birdcorner.app`?"

3. **Interpret the Results:**

* If the DNS server responds with an IP address, it means the domain is
  registered and active. The app sorts this into the "**Already In Use**" list.
* If the DNS server responds with an error (for example, "NXDOMAIN" or "
  non-existent domain"), it means there's no record of that domain. This is a
  strong signal that it's unregistered, and the app sorts it into the "*
  *Potentially Available**" list.

To avoid getting blocked, the app automatically throttles its own requests,
adding a small delay between each check and rotating between different DoH
providers.

### Practical Use Cases:

* **Startup Naming:** Validate your new company name before you register it.
* **Product Launches:** Find an available domain for a new product or service.
  * **Marketing Campaigns:** Secure unique domains for microsites and marketing
    initiatives.
* **Creative Projects:** Check the availability of a name for your new blog,
  app, or side project.
* **SEO & Domain Investing:** Quickly identify potentially valuable,
  unregistered domain names.

## Extras

### Random name generators

* [Random lists](https://www.randomlists.com/team-names)
* [Shopify](https://www.shopify.com/tools/business-name-generator)
* [Design.com](https://www.design.com/business-name-generator/)
* [heyhey132](https://businessnamegen.com/business-name-generator/)
* [Alex Völk](https://alexvoelk.de/generators/game-studio/)
