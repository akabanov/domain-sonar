const fs = require('fs');
const path = require('path');

const IANA_URL = 'https://data.iana.org/TLD/tlds-alpha-by-domain.txt';
const OUTPUT_FILE = path.join(__dirname, '../tlds.json');

async function updateTlds() {
    try {
        console.log(`Fetching TLDs from ${IANA_URL}...`);
        const response = await fetch(IANA_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch TLDs: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        const tlds = text
            .split('\n')
            .filter(line => line && !line.startsWith('#')) // Remove comments and empty lines
            .map(line => line.trim().toLowerCase()); // Normalize to lowercase

        console.log(`Found ${tlds.length} TLDs.`);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tlds, null, 2));
        console.log(`Saved TLDs to ${OUTPUT_FILE}`);
    } catch (error) {
        console.error('Error updating TLDs:', error);
        process.exit(1);
    }
}

updateTlds();
