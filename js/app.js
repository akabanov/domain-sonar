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
                return {domain, available: false, provider: provider.name};
            } else if (data.Status === 3) {
                return {domain, available: true, provider: provider.name};
            } else {
                // Other statuses or NOERROR with no answers.
                // Treat as potentially available but maybe with caution?
                // For simplicity, if no A record, we assume available for registration (or at least not in active use).
                return {domain, available: true, provider: provider.name};
            }
        } catch (error) {
            console.error(`Error checking ${domain} with ${provider.name}:`, error);
            return {domain, available: null, error: error.message}; // Treat as error/unknown
        }
    });
}

const STATE = {
    tlds: [],
    isChecking: false,
    isStopped: false,
    isHistoryExpanded: false,
    history: JSON.parse(localStorage.getItem('domainSonarHistory') || '[]'),
    abortController: null
};

// DOM Elements
const els = {
    input: document.getElementById('domain-input'),
    searchBtn: document.getElementById('search-btn'),
    stopBtn: document.getElementById('stop-btn'),
    errorMsg: document.getElementById('input-error'),
    progressSection: document.getElementById('progress-section'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    progressCount: document.getElementById('progress-count'),
    resultsSection: document.getElementById('results-section'),
    takenList: document.getElementById('taken-list'),
    takenCount: document.getElementById('taken-count'),
    availableList: document.getElementById('available-list'),
    availableCount: document.getElementById('available-count'),
    historyList: document.getElementById('history-list'),
    showAllHistoryBtn: document.getElementById('show-all-history'),
    registrarLinks: document.getElementById('registrar-links'),
    feedbackModal: document.getElementById('feedback-modal'),
    feedbackLink: document.getElementById('feedback-link'),
    closeFeedbackBtn: document.getElementById('close-feedback'),
    feedbackForm: document.getElementById('feedback-form'),
    feedbackStatus: document.getElementById('feedback-status')
};

// Registrars
const REGISTRARS = [
    {name: 'Namecheap', url: 'https://www.namecheap.com/domains/registration/results/?domain='},
    {name: 'GoDaddy', url: 'https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck='},
    {name: 'Porkbun', url: 'https://porkbun.com/checkout/search?q='},
    {name: 'Dynadot', url: 'https://www.dynadot.com/domain/search?domain='},
    {name: 'Name.com', url: 'https://www.name.com/domain/search/'},
    {name: 'Hostinger', url: 'https://www.hostinger.com/domain-name-search?domain='}
];

// Initialization
async function init() {
    try {
        const response = await fetch('tlds.json?v=');
        STATE.tlds = await response.json();
        console.log(`Loaded ${STATE.tlds.length} TLDs`);
        renderHistory();
    } catch (error) {
        console.error('Failed to load TLDs:', error);
        els.errorMsg.textContent = 'Failed to load TLD list. Please refresh.';
        els.errorMsg.classList.remove('hidden');
    }

    setupEventListeners();
}

function setupEventListeners() {
    els.input.addEventListener('input', validateInput);
    els.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !els.searchBtn.disabled) {
            startSearch();
        }
    });

    els.searchBtn.addEventListener('click', startSearch);
    els.stopBtn.addEventListener('click', stopSearch);

    els.showAllHistoryBtn.addEventListener('click', () => {
        STATE.isHistoryExpanded = true;
        renderHistory();
    });

    // Analytics for generator links
    document.querySelectorAll('.generator-link').forEach(link => {
        link.addEventListener('click', function () {
            if (typeof gtag === 'function') {
                gtag('event', 'generator_click', {generator_url: this.href});
            }
        });
    });

    // Feedback Modal
    els.feedbackLink.addEventListener('click', (e) => {
        e.preventDefault();
        els.feedbackModal.showModal();
    });

    els.closeFeedbackBtn.addEventListener('click', () => {
        els.feedbackModal.close();
    });

    els.feedbackModal.addEventListener('click', (e) => {
        const rect = els.feedbackModal.getBoundingClientRect();
        const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
        if (!isInDialog) {
            els.feedbackModal.close();
        }
    });

    els.feedbackForm.addEventListener('submit', handleFeedbackSubmit);
}

function validateInput() {
    const value = els.input.value.trim();
    const isValidChar = /^[a-zA-Z0-9-]+$/.test(value);
    const isLengthValid = value.length <= 63;

    if (value.length > 0) {
        if (!isValidChar) {
            els.input.classList.add('error');
            els.errorMsg.textContent = 'Only letters, numbers, and hyphens are allowed.';
            els.errorMsg.classList.remove('hidden');
            els.searchBtn.disabled = true;
        } else if (!isLengthValid) {
            els.input.classList.add('error');
            els.errorMsg.textContent = 'Domain name is too long (max 63 characters).';
            els.errorMsg.classList.remove('hidden');
            els.searchBtn.disabled = true;
        } else {
            els.input.classList.remove('error');
            els.errorMsg.classList.add('hidden');
            els.searchBtn.disabled = false;
        }
    } else {
        els.input.classList.remove('error');
        els.errorMsg.classList.add('hidden');
        els.searchBtn.disabled = true;
    }
}

async function startSearch() {
    if (STATE.isChecking) return;

    const baseName = els.input.value.trim().toLowerCase();
    if (!baseName) return;

    // Analytics
    if (typeof gtag === 'function') {
        gtag('event', 'search_performed', {search_term: baseName});
    }

    // Reset UI
    STATE.isChecking = true;
    STATE.isStopped = false;
    STATE.abortController = new AbortController();
    els.input.disabled = true;
    els.searchBtn.classList.add('hidden');
    els.stopBtn.classList.remove('hidden');

    els.progressSection.classList.remove('hidden');
    els.resultsSection.classList.add('hidden');
    els.takenList.innerHTML = '';
    els.availableList.innerHTML = '';
    els.takenCount.textContent = '0';
    els.availableCount.textContent = '0';

    // Collapse Potentially Available by default
    document.getElementById('available-group').open = false;

    renderRegistrarLinks(baseName);
    addToHistory(baseName);

    let checkedCount = 0;
    const total = STATE.tlds.length;
    let takenCount = 0;
    let availableCount = 0;
    let currentBatchTaken = [];

    // Create batches to avoid overwhelming the browser event loop, 
    // even though we have rate limiting
    const batchSize = 10;

    for (let i = 0; i < total; i += batchSize) {
        if (!STATE.isChecking) break;

        const batch = STATE.tlds.slice(i, i + batchSize);
        const promises = batch.map(tld => checkDomain(`${baseName}.${tld}`));

        const results = await Promise.all(promises);

        if (!STATE.isChecking) break;

        results.forEach(result => {
            checkedCount++;
            if (result.available === false) {
                takenCount++;
                addResultItem(result.domain, false);
                currentBatchTaken.push(result.domain);

                if (currentBatchTaken.length === 18) {
                    renderBulkOpenLink(currentBatchTaken);
                    currentBatchTaken = [];
                }
            } else {
                availableCount++;
                addResultItem(result.domain, true);
            }
        });

        // Show the last domain checked in this batch for progress
        const lastDomain = results[results.length - 1].domain;
        updateProgress(checkedCount, total, lastDomain);
    }

    if (currentBatchTaken.length > 2) {
        renderBulkOpenLink(currentBatchTaken);
    }

    finishSearch();
}

function stopSearch() {
    if (!STATE.isChecking) return;
    STATE.isChecking = false;
    STATE.isStopped = true;
    if (STATE.abortController) STATE.abortController.abort();
    els.progressText.textContent = 'Search stopped';
    // Don't call finishSearch here immediately as the loop break will handle it or we call it manually if stuck?
    // Actually, the loop will break and then call finishSearch. 
    // But if we are awaiting, we might need to force UI update.
    // Let's just update UI for stop button immediately.
    els.stopBtn.classList.add('hidden');
    els.searchBtn.classList.remove('hidden');
    els.searchBtn.disabled = false;
    els.input.disabled = false;
}

function updateProgress(current, total, currentDomain) {
    const percent = (current / total) * 100;
    els.progressBar.style.width = `${percent}%`;
    els.progressText.textContent = `Checking ${currentDomain}...`;
    els.progressCount.textContent = `${current}/${total}`;

    els.takenCount.textContent = document.getElementById('taken-list').children.length;
    els.availableCount.textContent = document.getElementById('available-list').children.length;

    // Show results section as soon as we have some data
    if (current > 0 && els.resultsSection.classList.contains('hidden')) {
        els.resultsSection.classList.remove('hidden');
    }
}

function addResultItem(domain, isAvailable) {
    const li = document.createElement('li');
    li.className = 'domain-item';

    const rightSideDiv = document.createElement('div');
    rightSideDiv.style.display = 'flex';
    rightSideDiv.style.alignItems = 'center';
    rightSideDiv.style.gap = '0.5rem';

    if (isAvailable) {
        li.innerHTML = `<span class="domain-name">${domain}</span>`;
        rightSideDiv.innerHTML = `<span class="icon-check">✓</span>`;
    } else {
        li.innerHTML = `<a href="https://${domain}" target="_blank" rel="noopener" class="domain-link">${domain}</a>`;
        rightSideDiv.innerHTML = `<span class="icon-cross">×</span>`;

        const link = li.querySelector('.domain-link');
        // Remove specific link listener as we will handle it on the card level
        // But we keep the link for accessibility and standard behavior

        // Make the whole card clickable
        li.style.cursor = 'pointer';
        li.addEventListener('click', (e) => {
            // Don't trigger if clicking the info button
            if (e.target.closest('.info-btn')) return;

            // If clicking the link directly, let it handle the navigation (default behavior)
            // But we still want to track the event.
            // If clicking elsewhere on the card, we need to open the link manually.

            if (typeof gtag === 'function') {
                gtag('event', 'domain_card_click', {domain: domain, status: 'taken'});
            }

            // If not clicking the link (e.g. clicking the card background), open it
            if (!e.target.closest('.domain-link')) {
                window.open(`https://${domain}`, '_blank');
            }
        });
    }

    // Punycode info (for both available and taken)
    if (domain.includes('xn--')) {
        const infoBtn = document.createElement('button');
        infoBtn.className = 'info-btn';
        infoBtn.textContent = 'i';
        infoBtn.title = 'Internationalized Domain Name (Punycode)';
        infoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showPunycodeInfo();
        });
        rightSideDiv.insertBefore(infoBtn, rightSideDiv.firstChild);
    }

    li.appendChild(rightSideDiv);

    if (isAvailable) {
        els.availableList.appendChild(li);
    } else {
        els.takenList.appendChild(li);
    }
}

function renderBulkOpenLink(domains) {
    // Don't show bulk open on mobile devices as they often block multiple popups
    if (isMobile()) return;

    const li = document.createElement('li');
    li.className = 'bulk-open-item';

    const a = document.createElement('a');
    a.className = 'bulk-open-link';
    a.textContent = `Open last ${domains.length} in separate tabs`;

    a.addEventListener('click', (e) => {
        e.preventDefault();
        domains.forEach(d => window.open(`https://${d}`, '_blank'));
    });

    li.appendChild(a);
    els.takenList.appendChild(li);
}

function showPunycodeInfo() {
    // Check if popup already exists
    let popup = document.querySelector('.info-popup');
    if (popup) return;

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    popup = document.createElement('div');
    popup.className = 'info-popup';
    popup.innerHTML = `
        <h4>Internationalized Domain Name</h4>
        <p>This domain uses "Punycode" (starts with xn--) to represent non-ASCII characters (like emojis or foreign alphabets) in the Domain Name System.</p>
        <button id="close-popup">Got it</button>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    const close = () => {
        overlay.remove();
        popup.remove();
    };

    overlay.addEventListener('click', close);
    popup.querySelector('#close-popup').addEventListener('click', close);
}

function finishSearch() {
    if (STATE.isChecking) {
        // If we came here naturally, reset state
        STATE.isChecking = false;
    }
    els.input.disabled = false;
    els.searchBtn.disabled = false;
    els.searchBtn.classList.remove('hidden');
    els.stopBtn.classList.add('hidden');

    if (!STATE.isStopped) {
        els.progressSection.classList.add('hidden');
    }
}

function renderRegistrarLinks(baseName) {
    els.registrarLinks.innerHTML = '';
    REGISTRARS.forEach(reg => {
        const a = document.createElement('a');
        a.href = `${reg.url}${baseName}`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = reg.name;
        a.addEventListener('click', () => {
            if (typeof gtag === 'function') {
                gtag('event', 'registrar_click', {registrar_name: reg.name, domain: baseName});
            }
        });
        els.registrarLinks.appendChild(a);
    });
}

// History Management
function addToHistory(name) {
    // Remove if exists to move to top
    STATE.history = STATE.history.filter(item => item.name !== name);

    STATE.history.unshift({
        name,
        timestamp: Date.now()
    });

    // Keep max 50
    if (STATE.history.length > 50) {
        STATE.history.pop();
    }

    localStorage.setItem('domainSonarHistory', JSON.stringify(STATE.history));
    renderHistory();
}

function deleteHistoryItem(name) {
    STATE.history = STATE.history.filter(item => item.name !== name);
    localStorage.setItem('domainSonarHistory', JSON.stringify(STATE.history));
    renderHistory();
}

function renderHistory() {
    els.historyList.innerHTML = '';
    const showAll = STATE.isHistoryExpanded;

    if (STATE.history.length === 0) {
        els.historyList.innerHTML = '<li style="color: var(--text-secondary); text-align: start;">No recent searches</li>';
        els.showAllHistoryBtn.classList.add('hidden');
        return;
    }

    const itemsToShow = showAll ? STATE.history : STATE.history.slice(0, 3);

    itemsToShow.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';

        const date = new Date(item.timestamp).toLocaleDateString();

        li.innerHTML = `
            <span class="history-name">${item.name}</span>
            <div class="history-meta">
                <span class="history-time">${date}</span>
                <div class="delete-btn" aria-label="Delete"/>
            </div>
        `;

        li.querySelector('.history-name').addEventListener('click', () => {
            els.input.value = item.name;
            validateInput();
            startSearch();
        });

        li.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem(item.name);
        });

        els.historyList.appendChild(li);
    });

    if (!showAll && STATE.history.length > 3) {
        els.showAllHistoryBtn.classList.remove('hidden');
    } else {
        els.showAllHistoryBtn.classList.add('hidden');
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function handleFeedbackSubmit(e) {
    e.preventDefault();
    const form = els.feedbackForm;
    const status = els.feedbackStatus;
    const submitBtn = form.querySelector('button[type="submit"]');

    status.classList.add('hidden');
    status.className = 'status-message hidden';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const data = new FormData(form);

    try {
        const response = await fetch(form.action, {
            method: form.method,
            body: data,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            status.textContent = 'Thanks for your feedback!';
            status.classList.add('success');
            status.classList.remove('hidden');
            form.reset();
            setTimeout(() => {
                els.feedbackModal.close();
                status.classList.add('hidden');
                status.classList.remove('success');
            }, 2000);
        } else {
            const data = await response.json();
            if (Object.hasOwn(data, 'errors')) {
                status.textContent = data["errors"].map(error => error["message"]).join(", ");
            } else {
                status.textContent = 'Oops! There was a problem submitting your form';
            }
            status.classList.add('error');
            status.classList.remove('hidden');
        }
    } catch (error) {
        status.textContent = 'Oops! There was a problem submitting your form';
        status.classList.add('error');
        status.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Feedback';
    }
}

init();
