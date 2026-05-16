const apiBase = `${window.location.origin}`;
const token = `Bearer ${localStorage.getItem("jwt_token")}`;
let currentRoomId = null;
let hookInterval = null;
let lastIds = new Set();
let allHooks = [];
let searchTerm = "";
let currentPage = 1;
let itemsPerPage = 25;
let sortOrder = "newest";
let isOnline = true;
let reconnectAttempts = 0;
let forwardEnabled = false;
let forwardEndpoint = "";
let roomsPanelOpen = false;
let duplicatesPanelOpen = false;
let currentWebhookDetails = null;
let searchActive = false;
let serverSearchResults = [];
let searchMode = "substring";
const DUP_PAGE_SIZE = 20;
const DUP_RECEIPTS_PAGE = 100;
const DUP_BODY_LIMIT = 20000;
let dupCurrentPage = 1;
let dupTotalPages = 1;

function initLucideIcons() {
    lucide.createIcons();
}

const roomIdInput = document.getElementById("roomId");
const roomStatus = document.getElementById("roomStatus");
const webhooksContainer = document.getElementById("webhooksContainer");
const webhookCount = document.getElementById("webhookCount");
const displayedCount = document.getElementById("displayedCount");
const currentPageDisplay = document.getElementById("currentPageDisplay");
const searchInput = document.getElementById("searchInput");
const fakeErrorToggle = document.getElementById("fakeErrorToggle");
const fakeStatusInput = document.getElementById("fakeStatusInput");
const sortOrderSelect = document.getElementById("sortOrder");
const itemsPerPageSelect = document.getElementById("itemsPerPage");
const connectionStatus = document.getElementById("connectionStatus");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageNumbers = document.getElementById("pageNumbers");
const forwardToggle = document.getElementById("forwardToggle");
const forwardEndpointInput = document.getElementById("forwardEndpoint");
const webhookModal = document.getElementById("webhookModal");
const modalContent = document.getElementById("modalContent");

const showRoomsBtn = document.getElementById("showRoomsBtn");
const roomsPanel = document.getElementById("roomsPanel");
const closeRoomsPanelBtn = document.getElementById("closeRoomsPanel");
const roomsPanelLoading = document.getElementById("roomsPanelLoading");
const roomsList = document.getElementById("roomsList");
const roomsPanelEmpty = document.getElementById("roomsPanelEmpty");
const roomsPanelError = document.getElementById("roomsPanelError");

const showDuplicatesBtn = document.getElementById("showDuplicatesBtn");
const duplicatesPanel = document.getElementById("duplicatesPanel");
const closeDuplicatesPanelBtn = document.getElementById("closeDuplicatesPanel");
const refreshDuplicatesBtn = document.getElementById("refreshDuplicatesBtn");
const duplicatesPanelLoading = document.getElementById("duplicatesPanelLoading");
const duplicatesList = document.getElementById("duplicatesList");
const duplicatesPanelEmpty = document.getElementById("duplicatesPanelEmpty");
const duplicatesPanelError = document.getElementById("duplicatesPanelError");
const duplicatesPanelNoRoom = document.getElementById("duplicatesPanelNoRoom");
const duplicatesSummary = document.getElementById("duplicatesSummary");
const searchModeSelect = document.getElementById("searchMode");
const searchBtn = document.getElementById("searchBtn");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const searchHint = document.getElementById("searchHint");

// Initialize
fakeStatusInput.disabled = false;
fakeErrorToggle.checked = false;

// Modal Functions
window.openWebhookDetails = async (receiptId) => {
    if (!currentRoomId) return;

    try {
        const res = await fetch(`${apiBase}/hook/${encodeURIComponent(currentRoomId)}/${encodeURIComponent(receiptId)}`, {
            headers: { "Authorization": token }
        });

        if (!res.ok) throw new Error("Failed to fetch webhook details");

        const webhook = await res.json();
        currentWebhookDetails = webhook;

        displayWebhookDetails(webhook);
        webhookModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error fetching webhook details:', error);
        showAlert("Ошибка загрузки деталей вебхука", "error");
    }
};

window.closeModal = (event) => {
    if (event && event.target !== event.currentTarget && event.type === 'click') return;

    webhookModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    currentWebhookDetails = null;
};

window.copyModalContent = () => {
    if (!currentWebhookDetails) return;

    const text = JSON.stringify(currentWebhookDetails, null, 2);
    navigator.clipboard.writeText(text).then(() => {
        showAlert("Полная информация скопирована", "success");
    });
};

function getMethodBadgeClass(method) {
    const methodUpper = method.toUpperCase();
    const classes = {
        'GET': 'method-GET',
        'POST': 'method-POST',
        'PUT': 'method-PUT',
        'PATCH': 'method-PATCH',
        'DELETE': 'method-DELETE',
        'OPTIONS': 'method-OPTIONS',
        'HEAD': 'method-HEAD'
    };
    return classes[methodUpper] || 'method-default';
}

function displayWebhookDetails(webhook) {
    const metadata = webhook.metadata || {};
    const headers = metadata.headers || {};
    const query = metadata.query || {};
    const body = webhook.body;

    // Format headers
    const headersHtml = Object.keys(headers).length > 0
        ? Object.entries(headers).map(([key, value]) => `
            <div class="flex items-start gap-2 py-1">
                <code class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono">${escapeHtml(key)}</code>
                <code class="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded font-mono flex-1 break-all">${escapeHtml(Array.isArray(value) ? value.join(', ') : value)}</code>
            </div>
        `).join('')
        : '<p class="text-gray-400 text-sm italic">(empty)</p>';

    // Format query strings
    const queryHtml = Object.keys(query).length > 0
        ? Object.entries(query).map(([key, value]) => `
            <div class="flex items-start gap-2 py-1">
                <code class="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-mono">${escapeHtml(key)}</code>
                <code class="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded font-mono flex-1 break-all">${escapeHtml(Array.isArray(value) ? value.join(', ') : value)}</code>
            </div>
        `).join('')
        : '<p class="text-gray-400 text-sm italic">(empty)</p>';

    // Format body
    const bodyHtml = body && Object.keys(body).length > 0
        ? `<pre class="text-sm font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto border border-gray-200">${syntaxHighlight(body)}</pre>`
        : '<p class="text-gray-400 text-sm italic">(no body content)</p>';

    modalContent.innerHTML = `
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-xs text-gray-600 mb-1">Method</p>
                    <span class="method-badge ${getMethodBadgeClass(metadata.method || 'POST')}">${metadata.method || 'POST'}</span>
                </div>
                <div>
                    <p class="text-xs text-gray-600 mb-1">ID</p>
                    <code class="text-sm bg-white px-2 py-1 rounded font-mono text-gray-800">${webhook.receiptId}</code>
                </div>
                <div>
                    <p class="text-xs text-gray-600 mb-1">Host / IP</p>
                    <div class="flex items-center gap-2">
                        <code class="text-sm bg-white px-2 py-1 rounded font-mono text-gray-800">${metadata.ip || 'unknown'}</code>
                        ${metadata.ip && metadata.ip !== 'unknown' ? `<a href="https://www.whois.com/whois/${metadata.ip}" target="_blank" class="text-blue-600 hover:text-blue-800 text-xs">whois</a>` : ''}
                    </div>
                </div>
                <div>
                    <p class="text-xs text-gray-600 mb-1">Date</p>
                    <p class="text-sm text-gray-800">${formatTimestamp(webhook.timestamp)}</p>
                </div>
            </div>
            <div class="mt-3">
                <p class="text-xs text-gray-600 mb-1">URL</p>
                <code class="text-sm bg-white px-2 py-1 rounded font-mono text-gray-800 break-all block">${metadata.url || 'N/A'}</code>
            </div>
        </div>
        
        <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <i data-lucide="list" class="w-5 h-5 text-gray-600"></i>
                Headers
            </h4>
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                ${headersHtml}
            </div>
        </div>
        
        <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <i data-lucide="search" class="w-5 h-5 text-gray-600"></i>
                Query Strings
            </h4>
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                ${queryHtml}
            </div>
        </div>
        
        <div>
            <h4 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <i data-lucide="file-text" class="w-5 h-5 text-gray-600"></i>
                Body
            </h4>
            ${bodyHtml}
        </div>
    `;

    initLucideIcons();
}

// Forward webhook toggle
forwardToggle.addEventListener("change", (e) => {
    forwardEnabled = e.target.checked;
    forwardEndpointInput.disabled = !forwardEnabled;

    if (forwardEnabled && !forwardEndpointInput.value.trim()) {
        showAlert("Введите URL для пересылки", "warning");
        forwardToggle.checked = false;
        forwardEnabled = false;
        forwardEndpointInput.disabled = true;
    } else {
        showAlert(forwardEnabled ? "Пересылка вебхуков включена" : "Пересылка вебхуков отключена", "success");
    }
});

forwardEndpointInput.addEventListener("input", (e) => {
    forwardEndpoint = e.target.value.trim();
});

// Forward webhook function
async function forwardWebhook(webhookBody) {
    if (!forwardEnabled || !forwardEndpoint) return;

    try {
        const response = await fetch(forwardEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookBody)
        });

        if (!response.ok) {
            console.error('Forward failed:', response.status);
            showAlert(`Ошибка пересылки: ${response.status}`, "error");
        }
    } catch (error) {
        console.error('Forward error:', error);
        showAlert(`Ошибка пересылки: ${error.message}`, "error");
    }
}

// Copy with visual feedback
function copyToClipboardWithFeedback(text, event) {
    navigator.clipboard.writeText(text).then(() => {
        const indicator = document.createElement('div');
        indicator.className = 'copy-indicator';
        indicator.textContent = '✓ Скопировано';
        indicator.style.left = event.pageX + 'px';
        indicator.style.top = event.pageY + 'px';
        document.body.appendChild(indicator);

        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 1000);
    });
}

function updateConnectionStatus(online) {
    isOnline = online;
    const connectionStatus = document.getElementById("connectionStatus");
    if (!connectionStatus) return;

    connectionStatus.className = "";

    if (online) {
        connectionStatus.classList.add("flex", "items-center", "gap-2", "px-3", "py-1", "rounded-full", "bg-green-100", "text-green-700", "text-sm", "mb-3");
        connectionStatus.innerHTML = `
            <span class="w-2 h-2 bg-green-500 rounded-full pulse-dot"></span>
            <span>Подключено</span>
        `;
        reconnectAttempts = 0;
    } else {
        connectionStatus.classList.add("flex", "items-center", "gap-2", "px-3", "py-1", "rounded-full", "bg-red-100", "text-red-700", "text-sm", "mb-3", "connection-lost");
        connectionStatus.innerHTML = `
            <span class="w-2 h-2 bg-red-500 rounded-full"></span>
            <span>Нет соединения</span>
        `;
        attemptReconnect();
    }
}

async function attemptReconnect() {
    if (isOnline || !currentRoomId) return;

    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    connectionStatus.innerHTML = `
        <span class="w-2 h-2 bg-yellow-500 rounded-full mb-3 pulse-dot"></span>
        <span>Переподключение... (${reconnectAttempts})</span>
    `;

    setTimeout(async () => {
        try {
            const res = await fetch(`${apiBase}/hook/all/${encodeURIComponent(currentRoomId)}`, { headers: { "Authorization": token } });
            if (res.ok) {
                updateConnectionStatus(true);
                showAlert("Соединение восстановлено", "success");
            } else {
                attemptReconnect();
            }
        } catch {
            attemptReconnect();
        }
    }, delay);
}

// Fake Error Toggle
fakeErrorToggle.addEventListener("change", async (e) => {
    if (!currentRoomId) {
        fakeErrorToggle.checked = false;
        return showAlert("Сначала создайте комнату", "warning");
    }

    const enabled = e.target.checked;
    const parsed = parseInt(fakeStatusInput.value, 10);
    const statusCode = (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) ? parsed : 500;

    try {
        const res = await fetch(`${apiBase}/room/${encodeURIComponent(currentRoomId)}/fake-error`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify({ enabled, statusCode })
        });

        if (!res.ok) throw new Error("Не удалось обновить статус");

        fakeStatusInput.disabled = !enabled;
        showAlert(enabled ? `Симуляция ${statusCode} включена` : "Симуляция отключена", "success");
    } catch (err) {
        fakeErrorToggle.checked = !enabled;
        showAlert("Ошибка при изменении состояния", "error");
        updateConnectionStatus(false);
    }
});

async function updateFakeErrorStatus() {
    if (!currentRoomId) return;
    try {
        const res = await fetch(`${apiBase}/room/${encodeURIComponent(currentRoomId)}/fake-error`, { headers: { "Authorization": token } });
        if (!res.ok) {
            fakeErrorToggle.checked = false;
            fakeStatusInput.disabled = false;
            return;
        }
        const data = await res.json();
        const enabled = data.fakeError ?? data.enabled ?? false;
        const statusCode = data.statusCode ?? data.status ?? 500;

        fakeErrorToggle.checked = Boolean(enabled);
        fakeStatusInput.value = statusCode;
        fakeStatusInput.disabled = !enabled;
    } catch (err) {
        console.warn("updateFakeErrorStatus failed", err);
    }
}

window.copyUrlToClipboard = (event, url) => {
    event.stopPropagation();
    copyToClipboardWithFeedback(url, event);
};

document.getElementById("closeRoomBtn").addEventListener("click", async () => {
    if (!currentRoomId) return showAlert("Нет активной комнаты", "warning");

    try {
        await fetch(`${apiBase}/room/${encodeURIComponent(currentRoomId)}`, { method: "DELETE", headers: { "Authorization": token } });
        stopFetchingHooks();
        closeDuplicatesPanelFn();
        roomStatus.innerHTML = `<div class="text-gray-500 text-sm">Комната закрыта</div>`;
        currentRoomId = null;
        lastIds.clear();
        allHooks = [];
        currentPage = 1;
        renderAllWebhooks();

        fakeErrorToggle.checked = false;
        fakeStatusInput.value = "500";
        fakeStatusInput.disabled = false;

        document.getElementById('roomStatus').classList.add('hidden');

        // Refresh rooms panel if it's open
        if (roomsPanelOpen) {
            fetchAllRooms();
        }

        showAlert("Комната закрыта", "success");
    } catch (e) {
        // showAlert("Ошибка закрытия комнаты", "error");
    }
});

document.getElementById("clearHooksBtn").addEventListener("click", async () => {
    if (!currentRoomId) return showAlert("Нет активной комнаты", "warning");

    try {
        await fetch(`${apiBase}/hook/delete/${encodeURIComponent(currentRoomId)}`, { method: "DELETE", headers: { "Authorization": token } });
        lastIds.clear();
        allHooks = [];
        currentPage = 1;
        renderAllWebhooks();
        showAlert("Вебхуки очищены", "success");
    } catch (e) {
        showAlert("Ошибка очистки", "error");
    }
});

document.getElementById("sendTestHookBtn").addEventListener("click", async () => {
    if (!currentRoomId) return showAlert("Нет активной комнаты", "warning");

    const testData = {
        message: "Тестовый вебхук",
        time: new Date().toISOString(),
        randomValue: Math.random().toString(36).substring(7),
        nested: {
            level1: {
                level2: "Глубокое значение",
                array: [1, 2, 3, 4, 5]
            }
        }
    };

    try {
        const res = await fetch(`${apiBase}/hook/${encodeURIComponent(currentRoomId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify(testData)
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => null);
            throw new Error(errBody?.error || res.status);
        }
        showAlert("Тестовый вебхук отправлен", "success");
    } catch (e) {
        showAlert("Ошибка отправки: " + e.message, "error");
        updateConnectionStatus(false);
    }
});

document.getElementById("exportBtn").addEventListener("click", () => {
    if (allHooks.length === 0) return showAlert("Нет данных для экспорта", "warning");

    const dataStr = JSON.stringify(allHooks, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `webhooks_${currentRoomId || 'no-room'}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showAlert("Экспорт завершён", "success");
});

// Search and Sort
searchInput.addEventListener("input", (e) => {
    if (searchActive) return;
    searchTerm = e.target.value.trim().toLowerCase();
    currentPage = 1;
    renderAllWebhooks();
});

async function runServerSearch() {
    const raw = searchInput.value.trim();
    if (!currentRoomId) return showAlert("Сначала откройте комнату", "warning");
    if (!raw) return showAlert("Введите запрос для поиска", "warning");

    searchMode = searchModeSelect.value === "exact" ? "exact" : "substring";
    searchHint.classList.remove("hidden");
    searchHint.className = "mt-2 text-xs text-gray-500";
    searchHint.textContent = `Ищем (${searchMode === "exact" ? "точное JSON" : "подстрока"})…`;

    try {
        const res = await fetch(`${apiBase}/hook/${encodeURIComponent(currentRoomId)}/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify({ mode: searchMode, query: raw, offset: 0, limit: 500 })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            searchHint.className = "mt-2 text-xs text-red-600";
            searchHint.textContent = "Ошибка: " + (data.error || res.status);
            return;
        }
        searchActive = true;
        serverSearchResults = data.matches || [];
        currentPage = 1;
        const shown = serverSearchResults.length;
        const total = data.total ?? shown;
        searchHint.className = "mt-2 text-xs text-gray-600";
        searchHint.textContent = `Найдено: ${total}${shown < total ? ` (показаны первые ${shown})` : ""}. Режим: ${searchMode === "exact" ? "точное JSON" : "подстрока"}.`;
        renderAllWebhooks();
    } catch (err) {
        searchHint.className = "mt-2 text-xs text-red-600";
        searchHint.textContent = "Ошибка сети: " + String(err).slice(0, 120);
    }
}

function clearSearch() {
    searchInput.value = "";
    searchTerm = "";
    searchActive = false;
    serverSearchResults = [];
    searchHint.classList.add("hidden");
    currentPage = 1;
    renderAllWebhooks();
}

searchBtn.addEventListener("click", runServerSearch);
clearSearchBtn.addEventListener("click", clearSearch);
searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        runServerSearch();
    }
});

sortOrderSelect.addEventListener("change", (e) => {
    sortOrder = e.target.value;
    currentPage = 1;
    renderAllWebhooks();
});

itemsPerPageSelect.addEventListener("change", (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderAllWebhooks();
});

// Pagination
prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderAllWebhooks();
    }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(getFilteredHooks().length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderAllWebhooks();
    }
});

// Utility Functions
window.deleteWebhook = async (webhookId) => {
    if (!currentRoomId) return;

    try {
        await fetch(`${apiBase}/hook/${encodeURIComponent(currentRoomId)}/${encodeURIComponent(webhookId)}`, { method: "DELETE", headers: { "Authorization": token } });
        allHooks = allHooks.filter(h => h.receiptId !== webhookId);
        lastIds.delete(webhookId);
        renderAllWebhooks();
        showAlert("Вебхук удалён", "success");
    } catch (e) {
        showAlert("Ошибка удаления", "error");
        updateConnectionStatus(false);
    }
};

window.copyEntireWebhook = (body, event) => {
    const text = JSON.stringify(body, null, 2);
    copyToClipboardWithFeedback(text, event);
};

function startFetchingHooks() {
    stopFetchingHooks();
    hookInterval = setInterval(async () => {
        if (!currentRoomId) return;
        try {
            const res = await fetch(`${apiBase}/hook/all/${encodeURIComponent(currentRoomId)}`, { headers: { "Authorization": token } });
            if (!res.ok) {
                updateConnectionStatus(false);
                throw new Error("Ошибка загрузки");
            }
            updateConnectionStatus(true);
            const data = await res.json();
            processWebhooks(data);
        } catch (e) {
            updateConnectionStatus(false);
            console.error("Ошибка загрузки вебхуков:", e);
        }
    }, 2000);
}

function stopFetchingHooks() {
    if (hookInterval) clearInterval(hookInterval);
}

function processWebhooks(hooks) {
    if (!hooks || hooks.length === 0) return;

    let hasNew = false;
    hooks.forEach(hook => {
        if (!lastIds.has(hook.receiptId)) {
            lastIds.add(hook.receiptId);
            allHooks.push(hook);
            hasNew = true;

            // Forward webhook if enabled
            if (forwardEnabled && forwardEndpoint) {
                forwardWebhook(hook.body);
            }
        }
    });

    if (hasNew) {
        if (searchActive) {
            webhookCount.textContent = allHooks.length;
        } else {
            sortAllHooks();
            renderAllWebhooks();
        }
    }
}

function sortAllHooks() {
    allHooks.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();

        if (sortOrder === "newest") {
            return timeB - timeA;
        } else {
            return timeA - timeB;
        }
    });
}

function getFilteredHooks() {
    const source = searchActive ? serverSearchResults : allHooks;
    let filtered = source;
    if (!searchActive && searchTerm) {
        filtered = source.filter(hook => {
            const bodyStr = JSON.stringify(hook.body).toLowerCase();
            return bodyStr.includes(searchTerm) || hook.receiptId.toString().toLowerCase().includes(searchTerm);
        });
    }

    const sorted = [...filtered];
    sorted.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
    return sorted;
}

function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
                const key = match.slice(1, -2);
                return `<span class="${cls}" onclick="copyValue(event, '${escapeHtml(key)}')" title="Копировать ключ">${match}</span>`;
            } else {
                cls = 'json-string';
                const val = match.slice(1, -1);
                return `<span class="${cls}" onclick="copyValue(event, '${escapeHtml(val)}')" title="Копировать значение">${match}</span>`;
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
    });
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.copyValue = (event, value) => {
    event.stopPropagation();
    const decodedValue = value.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;/g, "'");
    copyToClipboardWithFeedback(decodedValue, event);
};

function renderAllWebhooks() {
    const filtered = getFilteredHooks();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedHooks = filtered.slice(startIdx, endIdx);

    webhookCount.textContent = allHooks.length;
    displayedCount.textContent = paginatedHooks.length;
    currentPageDisplay.textContent = currentPage;

    if (paginatedHooks.length === 0) {
        const emptyTitle = searchActive
            ? "Ничего не найдено по серверному запросу"
            : (searchTerm ? "Ничего не найдено" : "Нет вебхуков для отображения");
        const emptySub = searchActive
            ? "Измените запрос или сбросьте поиск"
            : (searchTerm ? "Попробуйте изменить запрос" : "Создайте комнату и отправьте первый вебхук");
        webhooksContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 text-gray-400">
                <i data-lucide="inbox" class="w-16 h-16 mb-4 text-gray-300"></i>
                <p class="text-lg">${emptyTitle}</p>
                <p class="text-sm mt-2">${emptySub}</p>
            </div>
        `;
    } else {
        webhooksContainer.innerHTML = paginatedHooks.map(hook => {
            const method = hook.metadata?.method || 'POST';
            const methodBadgeClass = getMethodBadgeClass(method);

            return `
            <div class="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-lg hover:border-green-300 transition-all fade-in">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-3">
                        <button onclick="openWebhookDetails('${hook.receiptId}')" 
                                class="px-2 py-1 bg-green-100 text-green-700 text-xs font-mono rounded hover:bg-green-200 transition cursor-pointer"
                                title="Открыть детали">
                            ID: ${hook.receiptId}
                        </button>
                        <span class="method-badge ${methodBadgeClass}">${method}</span>
                        <span class="text-sm text-gray-500 flex items-center gap-1">
                            <i data-lucide="clock" class="w-3 h-3"></i>
                            ${formatTimestamp(hook.timestamp)}
                        </span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="copyEntireWebhook(${escapeJson(hook.body)}, event)"
                                class="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition text-sm font-medium flex items-center gap-1"
                                title="Копировать весь объект">
                            <i data-lucide="copy" class="w-4 h-4"></i>
                            <span>Копировать всё</span>
                        </button>
                        <button onclick="deleteWebhook('${hook.receiptId}')"
                                class="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition text-sm font-medium flex items-center gap-1"
                                title="Удалить">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                            <span>Удалить</span>
                        </button>
                    </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg overflow-x-auto border border-gray-200 hover:bg-white transition">
                    <pre class="text-sm font-mono">${syntaxHighlight(hook.body)}</pre>
                </div>
                <div class="mt-2 text-xs text-gray-500 italic flex items-center gap-1">
                    <i data-lucide="info" class="w-3 h-3"></i>
                    <span>Нажмите на ID для детальной информации или на ключ/значение для копирования</span>
                </div>
            </div>
        `}).join("");
    }

    initLucideIcons();
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

    let pages = [];
    if (totalPages <= 7) {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
        if (currentPage <= 4) {
            pages = [1, 2, 3, 4, 5, '...', totalPages];
        } else if (currentPage >= totalPages - 3) {
            pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    pageNumbers.innerHTML = pages.map(page => {
        if (page === '...') {
            return `<span class="px-3 py-2 text-gray-400">...</span>`;
        }
        const isActive = page === currentPage;
        return `
            <button onclick="goToPage(${page})"
                    class="px-3 py-2 rounded-lg font-medium transition ${
            isActive
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }">
                ${page}
            </button>
        `;
    }).join('');

    initLucideIcons();
}

window.goToPage = (page) => {
    currentPage = page;
    renderAllWebhooks();
};

function formatTimestamp(ts) {
    if (!ts) return "Недавно";
    const date = new Date(ts);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Только что";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;

    return date.toLocaleString("ru-RU", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeJson(obj) {
    return JSON.stringify(obj).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function openDuplicatesPanel() {
    duplicatesPanelOpen = true;
    duplicatesPanel.classList.remove("translate-x-full");
    stopFetchingHooks();
    dupCurrentPage = 1;
    fetchDuplicatesSummary();
}

function closeDuplicatesPanelFn() {
    duplicatesPanelOpen = false;
    duplicatesPanel.classList.add("translate-x-full");
    if (currentRoomId) startFetchingHooks();
}

function resetDupPanel() {
    duplicatesList.innerHTML = "";
    duplicatesPanelEmpty.classList.add("hidden");
    duplicatesPanelError.classList.add("hidden");
    duplicatesPanelNoRoom.classList.add("hidden");
    duplicatesPanelLoading.classList.add("hidden");
}

async function fetchDuplicatesSummary() {
    resetDupPanel();
    if (!currentRoomId) {
        duplicatesSummary.textContent = "Сначала откройте комнату";
        duplicatesPanelNoRoom.classList.remove("hidden");
        return;
    }
    duplicatesSummary.textContent = `Сканируем ${currentRoomId}…`;
    duplicatesPanelLoading.classList.remove("hidden");
    try {
        const url = `${apiBase}/hook/${encodeURIComponent(currentRoomId)}/duplicates/summary?page=${dupCurrentPage}&pageSize=${DUP_PAGE_SIZE}`;
        const res = await fetch(url, { headers: { "Authorization": token } });
        duplicatesPanelLoading.classList.add("hidden");
        if (!res.ok) {
            duplicatesPanelError.classList.remove("hidden");
            duplicatesSummary.textContent = "Ошибка загрузки";
            return;
        }
        const data = await res.json();
        const headers = Array.isArray(data.groups) ? data.groups : [];
        dupTotalPages = data.totalPages || 1;
        duplicatesSummary.textContent = `Групп: ${data.totalGroups} · в дубликатах: ${data.totalDuplicateWebhooks} из ${data.totalWebhooks}`;
        if (data.totalGroups === 0) {
            duplicatesPanelEmpty.classList.remove("hidden");
            return;
        }
        const html = headers.map(h => renderDuplicateHeader(h));
        if (dupTotalPages > 1) html.push(renderDupPagination(dupCurrentPage, dupTotalPages));
        duplicatesList.innerHTML = html.join("");
        initLucideIcons();
    } catch (err) {
        duplicatesPanelLoading.classList.add("hidden");
        duplicatesPanelError.classList.remove("hidden");
        console.error("fetchDuplicatesSummary", err);
    }
}

function renderDuplicateHeader(h) {
    const preview = String(h.bodyPreview ?? "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
    return `
        <div class="border border-orange-200 rounded-xl bg-orange-50/30 overflow-hidden fade-in" data-hash="${h.bodyHash}">
            <button type="button" class="w-full px-3 py-2.5 bg-orange-50 border-b border-orange-200 flex items-center justify-between hover:bg-orange-100/70 transition text-left"
                    onclick="toggleDuplicateGroup('${h.bodyHash}', this)">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-lg shrink-0">×${h.count}</span>
                    <span class="text-xs font-mono text-orange-700 shrink-0">${h.bodyHash}</span>
                    <span class="text-xs text-gray-600 truncate font-mono">${preview}</span>
                </div>
                <i data-lucide="chevron-down" class="w-4 h-4 text-orange-600 ml-2 shrink-0 dup-toggle-arrow transition-transform duration-200"></i>
            </button>
            <div class="px-3 py-1.5 text-[11px] text-gray-500 bg-white border-b border-orange-100 flex items-center gap-1">
                <i data-lucide="clock" class="w-3 h-3 text-gray-400 shrink-0"></i>
                Первый: #${h.firstReceiptId} (${formatTimestamp(h.firstTimestamp)}) ·
                Последний: #${h.lastReceiptId} (${formatTimestamp(h.lastTimestamp)})
            </div>
            <div class="dup-group-body hidden"></div>
        </div>`;
}

function renderDupPagination(page, total) {
    const prev = page > 1
        ? `<button type="button" class="btn px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-sm" onclick="dupGoToPage(${page - 1})"><i data-lucide="chevron-left" class="w-4 h-4"></i> Назад</button>`
        : `<button type="button" class="btn px-3 py-1.5 bg-gray-100 border border-gray-200 text-sm text-gray-400" disabled><i data-lucide="chevron-left" class="w-4 h-4"></i> Назад</button>`;
    const next = page < total
        ? `<button type="button" class="btn px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-sm" onclick="dupGoToPage(${page + 1})">Вперёд <i data-lucide="chevron-right" class="w-4 h-4"></i></button>`
        : `<button type="button" class="btn px-3 py-1.5 bg-gray-100 border border-gray-200 text-sm text-gray-400" disabled>Вперёд <i data-lucide="chevron-right" class="w-4 h-4"></i></button>`;
    return `<div class="flex items-center justify-between pt-2">${prev}<span class="text-xs text-gray-500">Стр. ${page} из ${total}</span>${next}</div>`;
}

window.dupGoToPage = (n) => {
    dupCurrentPage = n;
    fetchDuplicatesSummary();
};

window.toggleDuplicateGroup = async (hash, btn) => {
    const card = btn.closest("[data-hash]");
    const body = card.querySelector(".dup-group-body");
    const arrow = card.querySelector(".dup-toggle-arrow");
    if (!body.classList.contains("hidden")) {
        body.classList.add("hidden");
        arrow?.classList.remove("rotate-180");
        return;
    }
    arrow?.classList.add("rotate-180");
    if (body.dataset.loaded === "1") {
        body.classList.remove("hidden");
        return;
    }
    body.classList.remove("hidden");
    body.innerHTML = `<div class="px-3 py-3 text-xs text-gray-500 flex items-center gap-2"><i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Загрузка…</div>`;
    initLucideIcons();
    try {
        const res = await fetch(
            `${apiBase}/hook/${encodeURIComponent(currentRoomId)}/duplicates/group/${encodeURIComponent(hash)}?offset=0&limit=${DUP_RECEIPTS_PAGE}`,
            { headers: { "Authorization": token } }
        );
        if (!res.ok) {
            body.innerHTML = `<div class="px-3 py-3 text-xs text-red-500">Ошибка загрузки группы</div>`;
            return;
        }
        renderGroupBody(body, await res.json(), hash, 0);
        body.dataset.loaded = "1";
        initLucideIcons();
    } catch (err) {
        body.innerHTML = `<div class="px-3 py-3 text-xs text-red-500">Ошибка: ${String(err).slice(0, 100)}</div>`;
    }
};

function renderGroupBody(container, data, hash, offset) {
    const receipts = data.receipts || [];
    const total = data.receiptsTotal || receipts.length;
    const idsHtml = receipts.map(r => `
            <button type="button" onclick="jumpToWebhook('${r.receiptId}')"
                    class="px-2 py-0.5 bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-mono rounded-lg transition"
                    title="${r.timestamp ? formatTimestamp(r.timestamp) : ""}">
                #${r.receiptId}
            </button>`).join("");
    const nextOff = offset + receipts.length;
    const hasMore = nextOff < total;
    const moreBtn = hasMore
        ? `<button type="button" class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                       onclick="loadMoreReceipts('${hash}',${nextOff},this)">
                  <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Показать ещё (${total - nextOff} осталось)
               </button>`
        : "";
    let bodyJson = "";
    try {
        bodyJson = JSON.stringify(data.body, null, 2);
    } catch {
        bodyJson = String(data.body);
    }
    const trunc = bodyJson.length > DUP_BODY_LIMIT;
    const forRender = trunc
        ? bodyJson.slice(0, DUP_BODY_LIMIT) + "\n\n… [тело обрезано, " + (bodyJson.length - DUP_BODY_LIMIT) + " символов скрыто]"
        : bodyJson;
    container.innerHTML = `
            <div class="px-3 py-2 flex flex-wrap items-center gap-1 bg-white border-b border-orange-100">
                <span class="dup-id-counter text-xs text-gray-500 mr-1 flex items-center gap-1"><i data-lucide="hash" class="w-3 h-3"></i>ID (${receipts.length} из ${total}):</span>
                <span class="dup-ids-list flex flex-wrap gap-1">${idsHtml}</span>
            </div>
            <div class="px-3 py-1 bg-white border-b border-orange-100">${moreBtn}</div>
            <div class="px-3 py-2 bg-white border-b border-orange-100 flex justify-end">
                <button type="button" onclick="copyEntireWebhook(${escapeJson(data.body)},event)"
                        class="btn text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i> Копировать тело
                </button>
            </div>
            <div class="bg-gray-50 p-3 overflow-x-auto max-h-64 overflow-y-auto">
                <pre class="text-xs font-mono">${syntaxHighlight(forRender)}</pre>
            </div>`;
    initLucideIcons();
}

window.loadMoreReceipts = async (hash, offset, btn) => {
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin inline-block align-middle"></i> Загрузка…';
    initLucideIcons();
    try {
        const res = await fetch(
            `${apiBase}/hook/${encodeURIComponent(currentRoomId)}/duplicates/group/${encodeURIComponent(hash)}?offset=${offset}&limit=${DUP_RECEIPTS_PAGE}`,
            { headers: { "Authorization": token } }
        );
        if (!res.ok) {
            btn.textContent = "Ошибка";
            return;
        }
        const d = await res.json();
        const card = document.querySelector(`[data-hash="${hash}"]`);
        if (!card) return;
        const idsList = card.querySelector(".dup-ids-list");
        const extra = (d.receipts || []).map(r => `
                <button type="button" onclick="jumpToWebhook('${r.receiptId}')"
                        class="px-2 py-0.5 bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-mono rounded-lg transition">
                    #${r.receiptId}
                </button>`).join("");
        idsList.insertAdjacentHTML("beforeend", extra);
        const shown = idsList.querySelectorAll("button").length;
        const counter = card.querySelector(".dup-id-counter");
        if (counter) {
            counter.innerHTML = `<i data-lucide="hash" class="w-3 h-3"></i>ID (${shown} из ${d.receiptsTotal}):`;
        }
        const nextOff = offset + (d.receipts || []).length;
        initLucideIcons();
        if (nextOff >= d.receiptsTotal) {
            btn.remove();
        } else {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Показать ещё (${d.receiptsTotal - nextOff} осталось)`;
            btn.onclick = () => window.loadMoreReceipts(hash, nextOff, btn);
            initLucideIcons();
        }
    } catch {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Ошибка, повторить';
        initLucideIcons();
    }
};

window.jumpToWebhook = (receiptId) => {
    searchInput.value = "";
    searchTerm = String(receiptId).toLowerCase();
    searchActive = false;
    serverSearchResults = [];
    searchHint.classList.add("hidden");
    currentPage = 1;
    renderAllWebhooks();
    closeDuplicatesPanelFn();
    const found = allHooks.find(h => String(h.receiptId) === String(receiptId));
    showAlert(
        found ? `Отфильтровано по ID #${receiptId}` : `Хук #${receiptId} ещё не подгружен на фронт`,
        found ? "success" : "warning"
    );
};

function showAlert(message, type) {
    const colors = {
        success: "bg-green-100 text-green-800 border-green-400",
        error: "bg-red-100 text-red-800 border-red-400",
        warning: "bg-yellow-100 text-yellow-800 border-yellow-400"
    };

    const icons = {
        success: "check-circle",
        error: "x-circle",
        warning: "alert-circle"
    };

    const alert = document.createElement("div");
    alert.className = `fixed top-20 right-6 px-5 py-3 rounded-lg border-l-4 ${colors[type]} shadow-2xl transition-all z-50 max-w-md fade-in`;
    alert.innerHTML = `
        <div class="flex items-center gap-3">
            <i data-lucide="${icons[type]}" class="w-5 h-5"></i>
            <span class="font-medium">${message}</span>
        </div>
    `;
    document.body.appendChild(alert);

    initLucideIcons();

    setTimeout(() => {
        alert.style.opacity = "0";
        alert.style.transform = "translateX(100%)";
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

async function openRoom(id) {
    if (!id) return showAlert("Введите ID комнаты", "warning");

    try {
        currentRoomId = id;
        roomIdInput.value = id;
        lastIds.clear();
        allHooks = [];
        currentPage = 1;
        renderAllWebhooks();

        const res = await fetch(`${apiBase}/room/${encodeURIComponent(id)}`, { method: "POST", headers: { "Authorization": token } });
        if (!res.ok) throw new Error("Ошибка создания/входа в комнату");

        const webhookUrl = `${apiBase}/hook/${encodeURIComponent(id)}`;
        roomStatus.innerHTML = `
            <div class="font-semibold text-green-700 mb-2 flex items-center gap-2">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                <span>Комната активна</span>
            </div>
            <div class="webhook-url-container text-xs break-all bg-white p-2 rounded border border-gray-200 group">
                <div class="flex items-center justify-between gap-2">
                    <span class="flex-1">${webhookUrl}</span>
                    <button onclick="copyUrlToClipboard(event, '${webhookUrl}')"
                            class="copy-btn-inline text-blue-600 hover:text-blue-800"
                            title="Копировать URL">
                        <i data-lucide="copy" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;

        await updateFakeErrorStatus();
        initLucideIcons();
        if (duplicatesPanelOpen) {
            dupCurrentPage = 1;
            fetchDuplicatesSummary();
        } else {
            startFetchingHooks();
        }
        updateConnectionStatus(true);
        showAlert("Комната создана успешно", "success");
    } catch (e) {
        showAlert("Ошибка: " + (e.message || e), "error");
        updateConnectionStatus(false);
    }
}

document.getElementById("createRoomBtn").addEventListener("click", async () => {
    const id = roomIdInput.value.trim();
    await openRoom(id);
});

function openRoomsPanel() {
    roomsPanelOpen = true;
    roomsPanel.classList.remove('translate-x-full');
    roomsPanelError.classList.add('hidden');
    fetchAllRooms();
}

function closeRoomsPanelFn() {
    roomsPanelOpen = false;
    roomsPanel.classList.add('translate-x-full');
}

showRoomsBtn.addEventListener('click', openRoomsPanel);
closeRoomsPanelBtn.addEventListener('click', closeRoomsPanelFn);

async function fetchAllRooms() {
    roomsList.innerHTML = '';
    roomsPanelEmpty.classList.add('hidden');
    roomsPanelError.classList.add('hidden');
    roomsPanelLoading.classList.remove('hidden');

    try {
        const res = await fetch(`${apiBase}/room/allRooms`, { headers: { "Authorization": token } });
        roomsPanelLoading.classList.add('hidden');

        if (!res.ok) {
            roomsPanelError.classList.remove('hidden');
            return;
        }

        const data = await res.json();
        const rooms = data.rooms;

        if (!rooms || rooms.length === 0) {
            roomsPanelEmpty.classList.remove('hidden');
            return;
        }

        roomsList.innerHTML = rooms.map(r => `
            <div class="p-3 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50">
                <div class="flex flex-col">
                    <button class="text-left text-sm font-medium text-gray-800 room-select-btn" data-room-id="${r.roomId}">
                        ${r.roomId}
                    </button>
                    <div class="text-xs text-gray-500 flex items-center gap-1">
                        <i data-lucide="database" class="w-3 h-3"></i>
                        <span>Вебхуков: ${r.webhooksCount}</span>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <button class="px-3 py-1 bg-green-600 text-white rounded text-sm select-room-action flex items-center gap-1" data-room-id="${r.roomId}">
                        <i data-lucide="log-in" class="w-3 h-3"></i>
                        <span>Открыть</span>
                    </button>
                </div>
            </div>
        `).join('');

        initLucideIcons();

        document.querySelectorAll('.select-room-action, .room-select-btn').forEach(el => {
            el.addEventListener('click', async (e) => {
                const rid = e.currentTarget.getAttribute('data-room-id');
                await openRoom(rid);
                closeRoomsPanelFn();
            });
        });

    } catch (err) {
        roomsPanelLoading.classList.add('hidden');
        roomsPanelError.classList.remove('hidden');
        console.error('fetchAllRooms error', err);
    }
}

window.addEventListener('online', () => {
    updateConnectionStatus(true);
    if (currentRoomId) {
        showAlert("Интернет-соединение восстановлено", "success");
        if (!duplicatesPanelOpen) startFetchingHooks();
    }
});

window.addEventListener('offline', () => {
    updateConnectionStatus(false);
    showAlert("Потеряно интернет-соединение", "error");
});

// Close modal / duplicates on ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && duplicatesPanelOpen) {
        closeDuplicatesPanelFn();
        return;
    }
    if (e.key === 'Escape' && !webhookModal.classList.contains('hidden')) {
        closeModal();
    }
});

showDuplicatesBtn.addEventListener("click", openDuplicatesPanel);
closeDuplicatesPanelBtn.addEventListener("click", closeDuplicatesPanelFn);
refreshDuplicatesBtn.addEventListener("click", () => {
    dupCurrentPage = 1;
    fetchDuplicatesSummary();
});

renderAllWebhooks();
initLucideIcons();
