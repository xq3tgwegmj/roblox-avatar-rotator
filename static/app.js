// ========================================
// State Management
// ========================================
let state = {
    outfits: [],
    selectedOutfits: new Set(),
    isLoading: false,
    rotationActive: false
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    cookieInput: document.getElementById('cookieInput'),
    toggleCookie: document.getElementById('toggleCookie'),
    eyeIcon: document.getElementById('eyeIcon'),
    fetchBtn: document.getElementById('fetchBtn'),
    outfitList: document.getElementById('outfitList'),
    intervalSlider: document.getElementById('intervalSlider'),
    intervalValue: document.getElementById('intervalValue'),
    warningText: document.getElementById('warningText'),
    startupCheckbox: document.getElementById('startupCheckbox'),
    saveBtn: document.getElementById('saveBtn'),
    statusIndicator: document.getElementById('statusIndicator'),
    toastContainer: document.getElementById('toastContainer')
};

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    setupEventListeners();
    checkStatus();

    // Poll for status updates
    setInterval(checkStatus, 2000);
});

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
    // Cookie visibility toggle
    elements.toggleCookie.addEventListener('click', () => {
        const isPassword = elements.cookieInput.type === 'password';
        elements.cookieInput.type = isPassword ? 'text' : 'password';
        elements.eyeIcon.innerHTML = isPassword
            ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
            : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    });

    // Fetch outfits
    elements.fetchBtn.addEventListener('click', fetchOutfits);

    // Interval slider
    elements.intervalSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        elements.intervalValue.textContent = value;
        elements.warningText.style.display = value < 3 ? 'flex' : 'none';
    });

    // Save button
    elements.saveBtn.addEventListener('click', saveConfig);
}

// ========================================
// API Calls
// ========================================
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();

            if (config.cookie) {
                elements.cookieInput.value = config.cookie;
            }

            if (config.interval) {
                elements.intervalSlider.value = config.interval;
                elements.intervalValue.textContent = config.interval;
                elements.warningText.style.display = config.interval < 3 ? 'flex' : 'none';
            }

            if (config.startup !== undefined) {
                elements.startupCheckbox.checked = config.startup;
            }

            if (config.outfits && config.outfits.length > 0) {
                state.outfits = config.outfits;
                config.outfits.forEach(o => state.selectedOutfits.add(o.id));
                renderOutfitList();
            }
        }
    } catch (error) {
        console.error('Failed to load config:', error);
    }
}

async function checkStatus() {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const data = await response.json();
            state.rotationActive = data.active;
            updateStatusIndicator();
        }
    } catch (error) {
        console.error('Failed to check status:', error);
    }
}

async function fetchOutfits() {
    const cookie = elements.cookieInput.value.trim();
    if (!cookie) {
        showToast('Please enter your Roblox cookie first', 'error');
        return;
    }

    setLoading(true);

    try {
        const response = await fetch('/api/outfits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cookie })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.outfits && data.outfits.length > 0) {
                state.outfits = data.outfits;
                renderOutfitList();
                showToast(`Loaded ${data.outfits.length} outfits`, 'success');
            } else {
                showToast('No outfits found', 'warning');
            }
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to fetch outfits', 'error');
        }
    } catch (error) {
        showToast('Connection error. Is the server running?', 'error');
    } finally {
        setLoading(false);
    }
}

async function saveConfig() {
    if (state.selectedOutfits.size === 0) {
        showToast('Please select at least one outfit', 'warning');
        return;
    }

    const selectedOutfitData = state.outfits
        .filter(o => state.selectedOutfits.has(o.id))
        .map(o => ({ id: o.id, name: o.name }));

    const config = {
        cookie: elements.cookieInput.value.trim(),
        outfits: selectedOutfitData,
        interval: parseInt(elements.intervalSlider.value),
        startup: elements.startupCheckbox.checked
    };

    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            showToast('Settings saved successfully!', 'success');
            setTimeout(() => {
                window.close();
            }, 1500);
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// ========================================
// UI Rendering
// ========================================
function renderOutfitList() {
    if (state.outfits.length === 0) {
        elements.outfitList.innerHTML = `
            <div class="outfit-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/>
                </svg>
                <p>Enter your cookie and click "Fetch Outfits" to load your outfits</p>
            </div>
        `;
        return;
    }

    elements.outfitList.innerHTML = state.outfits.map(outfit => `
        <div class="outfit-item ${state.selectedOutfits.has(outfit.id) ? 'selected' : ''}" 
             data-id="${outfit.id}" 
             onclick="toggleOutfit(${outfit.id})">
            <div class="outfit-checkbox">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
            <span class="outfit-name">${escapeHtml(outfit.name)}</span>
        </div>
    `).join('');
}

function toggleOutfit(id) {
    if (state.selectedOutfits.has(id)) {
        state.selectedOutfits.delete(id);
    } else {
        state.selectedOutfits.add(id);
    }

    const item = document.querySelector(`.outfit-item[data-id="${id}"]`);
    if (item) {
        item.classList.toggle('selected');
    }
}

function updateStatusIndicator() {
    const indicator = elements.statusIndicator;
    const statusText = indicator.querySelector('.status-text');

    if (state.rotationActive) {
        indicator.classList.add('active');
        statusText.textContent = 'Active';
    } else {
        indicator.classList.remove('active');
        statusText.textContent = 'Inactive';
    }
}

function setLoading(loading) {
    state.isLoading = loading;
    elements.fetchBtn.disabled = loading;
    elements.fetchBtn.classList.toggle('loading', loading);
    elements.fetchBtn.querySelector('span').textContent = loading ? 'Loading...' : 'Fetch Outfits';
}

// ========================================
// Toast Notifications
// ========================================
function showToast(message, type = 'success') {
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// Utilities
// ========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
