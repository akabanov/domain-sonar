# Taken Domain Sonar

## About

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

---

## Development Roadmap

This project will be developed in milestones to ensure a structured and
efficient workflow.

### Milestone 1: Foundational UI & Project Setup

1. **Project Structure:** Set up the initial `index.html`, `style.css`, and
   `app.js` files.
2. **Ergonomic Layout:**

* Implement a clean, minimalistic, single-column layout.
* Create a prominent, centered input field for the base name (e.g.,
  `birdcorner`).

3. **Footer:** Footer content:
   `© {current_year} Bird Corner Apps` with a hyperlink to
   `https://www.birdcorner.app`.

4. **Inline Validation:** Implement basic validation on the input field to
   disallow empty strings or invalid characters, with subtle visual feedback (
   e.g., a soft red border).

### Milestone 2: TLD List Generation Script

1. **Create a Node.js Script:** Develop a GitHub action (triggered manually
   or once a week if possible)

2. **Fetch Authoritative Data:** The action must fetch the official list of TLDs
   from an authoritative source (e.g., the IANA TLD list at
   `https://data.iana.org/TLD/tlds-alpha-by-domain.txt`).

3. **Generate JSON:** The action will parse the fetched text file and save the
   TLDs into a clean JSON array in a `tlds.json` file within the project's
   public directory. If `tlds.json` is changed, the action must push the changes
   back to GitHub.

### Milestone 3: Core DNS Checking Logic

1. **Load TLDs:** In `app.js`, fetch and load the `tlds.json` file.

2. **Implement DoH Rotation:**

* Use at least 2-3 reliable, free DNS-over-HTTPS (DoH) providers (
  e.g., Google, Cloudflare).
* Implement the core `checkDns` function that rotates through these providers
  for each query to distribute the load. Remember to handle provider-specific
  requirements, like HTTP headers (`Accept: application/dns-json`).

3. **Generous Throttling:** Introduce a delay between
   each DNS query to prevent any possibility of being rate-limited (no more
   than 70 queries per second per provider). This ensures
   stability and gives the user time to view on-page content like ads.

### Milestone 4: Interactive UI State & Animations

1. **State Management:**

* When a search is initiated, disable the main input field and the search
  history section to prevent new actions.
* Re-enable these elements once the check is complete.

2. **Progress Animation:**

* Implement a progress bar that updates as the checks proceed.
* Display a status message like: `Checking birdcorner.com...`
* Upon completion, show the total number of domains checked (e.g.,
  `Checked 1578 domains`).

3. **Subtle Animations:** Add smooth, subtle CSS transitions for UI elements,
   such as when results appear, buttons are hovered over, or history expands.

### Milestone 5: Results Display

1. **Categorize Results:** Create two distinct, clearly labeled sections for the
   output:

* **"Already In Use"**: Use this for domains that have DNS records.
  (expanded by default; show the number of results in the title)
* **"Potentially Available"**: Use this enhanced wording for domains that
  returned no DNS record. (collapsed by default; show the number of results in
  the title)

2. **"Already In Use" Functionality:**

* Make each domain a clickable link. The primary link should go to
  `https://[domain-name]`.
* Add a smaller, secondary link for `http://[domain-name]`.
* Include a tagline under this section: *"Tip: Some of these domains may be
  parked or for sale and not actively in use."*

3. **Disclaimer:** Add a clearly visible disclaimer at the bottom of the
   results: *"Heads up: A 'Potentially Available' status is a good indicator a
   domain is not in use, but it's not a 100% guarantee. The final confirmation
   will be with the domain registrar."*

### Milestone 6: Search History

1. **Local Storage:** Use the browser's `localStorage` to persist search history
   between sessions.
2. **Store & Display:**

* For each search, store the name and a timestamp.
* By default, display the 3 most recent searches.
* If more than 3 exist, add a "Show all" button that expands to show the full
  history.

3. **User Control:** Add a "delete" icon next to each entry in the history,
   allowing a user to remove it permanently from `localStorage`.

### Milestone 7: Monetization & Final Polish

1. **SEO Content:** Write and embed the final SEO-optimized marketing
   description on the main page.
2. **Final Review:** Conduct a thorough review of the application against all
   requirements. Test for usability, responsiveness on different screen sizes,
   and cross-browser compatibility.