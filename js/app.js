import { checkDomain } from './doh.js';

const STATE = {
    tlds: [],
    isChecking: false,
    history: JSON.parse(localStorage.getItem('domainSonarHistory') || '[]'),
    abortController: null
};

// DOM Elements
const els = {
    input: document.getElementById('domain-input'),
    searchBtn: document.getElementById('search-btn'),
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
    registrarLinks: document.getElementById('registrar-links')
};

// Registrars
const REGISTRARS = [
    { name: 'Namecheap', url: 'https://www.namecheap.com/domains/registration/results/?domain=' },
    { name: 'GoDaddy', url: 'https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=' },
    { name: 'Porkbun', url: 'https://porkbun.com/checkout/search?q=' },
    { name: 'Dynadot', url: 'https://www.dynadot.com/domain/search?domain=' },
    { name: 'Name.com', url: 'https://www.name.com/domain/search/' },
    { name: 'Hostinger', url: 'https://www.hostinger.com/domain-name-search?domain=' }
];

// Initialization
async function init() {
    try {
        const response = await fetch('tlds.json');
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

    els.showAllHistoryBtn.addEventListener('click', () => {
        renderHistory(true);
        els.showAllHistoryBtn.classList.add('hidden');
    });
}

function validateInput() {
    const value = els.input.value.trim();
    const isValid = /^[a-zA-Z0-9-]+$/.test(value);

    if (value.length > 0 && !isValid) {
        els.input.classList.add('error');
        els.errorMsg.textContent = 'Only letters, numbers, and hyphens are allowed.';
        els.errorMsg.classList.remove('hidden');
        els.searchBtn.disabled = true;
    } else {
        els.input.classList.remove('error');
        els.errorMsg.classList.add('hidden');
        els.searchBtn.disabled = value.length === 0;
    }
}

async function startSearch() {
    if (STATE.isChecking) return;

    const baseName = els.input.value.trim().toLowerCase();
    if (!baseName) return;

    // Reset UI
    STATE.isChecking = true;
    STATE.abortController = new AbortController(); // Not fully used yet for fetch cancellation but good practice
    els.input.disabled = true;
    els.searchBtn.disabled = true;

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

    // Create batches to avoid overwhelming the browser event loop, 
    // even though we have rate limiting in doh.js
    const batchSize = 10;

    for (let i = 0; i < total; i += batchSize) {
        const batch = STATE.tlds.slice(i, i + batchSize);
        const promises = batch.map(tld => checkDomain(`${baseName}.${tld}`));

        const results = await Promise.all(promises);

        results.forEach(result => {
            checkedCount++;
            if (result.available === false) {
                takenCount++;
                addResultItem(result.domain, false);
            } else {
                availableCount++;
                addResultItem(result.domain, true);
            }
        });

        // Show the last domain checked in this batch for progress
        const lastDomain = results[results.length - 1].domain;
        updateProgress(checkedCount, total, lastDomain);
    }

    finishSearch();
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

    if (isAvailable) {
        li.innerHTML = `
            <span class="domain-name">${domain}</span>
            <span class="icon-check">✓</span>
        `;
        els.availableList.appendChild(li);
    } else {
        li.innerHTML = `
            <a href="https://${domain}" target="_blank" rel="noopener" class="domain-link">${domain}</a>
            <span class="icon-cross">×</span>
        `;
        els.takenList.appendChild(li);
    }
}

function finishSearch() {
    STATE.isChecking = false;
    els.input.disabled = false;
    els.searchBtn.disabled = false;
    els.progressSection.classList.add('hidden');
}

function renderRegistrarLinks(baseName) {
    els.registrarLinks.innerHTML = '';
    REGISTRARS.forEach(reg => {
        const a = document.createElement('a');
        a.href = `${reg.url}${baseName}`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = reg.name;
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

function renderHistory(showAll = false) {
    els.historyList.innerHTML = '';

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
                <button class="delete-btn" aria-label="Delete">×</button>
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

init();
