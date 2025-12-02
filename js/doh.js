const PROVIDERS = [
    {
        name: 'Google',
        url: 'https://dns.google/resolve',
        limit: 70 // qps
    },
    {
        name: 'Cloudflare',
        url: 'https://cloudflare-dns.com/dns-query',
        limit: 70 // qps
    }
];

class RateLimiter {
    constructor(limit) {
        this.limit = limit;
        this.queue = [];
        this.active = 0;
        this.interval = 1000 / limit;
        this.lastCall = 0;
    }

    async schedule(fn) {
        const now = Date.now();
        const timeSinceLast = now - this.lastCall;
        const delay = Math.max(0, this.interval - timeSinceLast);

        this.lastCall = now + delay;

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(fn());
            }, delay);
        });
    }
}

const limiters = PROVIDERS.map(p => new RateLimiter(p.limit));
let providerIndex = 0;

export async function checkDomain(domain) {
    const providerIdx = providerIndex++ % PROVIDERS.length;
    const provider = PROVIDERS[providerIdx];
    const limiter = limiters[providerIdx];

    return limiter.schedule(async () => {
        try {
            const url = new URL(provider.url);
            url.searchParams.set('name', domain);
            url.searchParams.set('type', 'A'); // Check for A record

            const response = await fetch(url.toString(), {
                headers: {
                    'Accept': 'application/dns-json'
                }
            });

            if (!response.ok) {
                throw new Error(`DoH error: ${response.status}`);
            }

            const data = await response.json();

            // Status 0 means NOERROR (exists), Status 3 means NXDOMAIN (available)
            // However, we need to check if there are answers.
            // Sometimes NOERROR is returned with no answers (nodata), which might mean available or just no A record.
            // But for our purpose, if there's an IP, it's taken.

            if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
                return { domain, available: false, provider: provider.name };
            } else if (data.Status === 3) {
                return { domain, available: true, provider: provider.name };
            } else {
                // Other statuses or NOERROR with no answers. 
                // Treat as potentially available but maybe with caution? 
                // For simplicity, if no A record, we assume available for registration (or at least not in active use).
                return { domain, available: true, provider: provider.name };
            }
        } catch (error) {
            console.error(`Error checking ${domain} with ${provider.name}:`, error);
            return { domain, available: null, error: error.message }; // Treat as error/unknown
        }
    });
}
