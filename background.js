// Service worker (MV3) - jedyne miejsce, które faktycznie woła API TIDORA.
// Content scripty i popup/compose/options NIGDY nie fetchują same - zawsze
// przez wiadomość do tego workera. Powód: to on ma host_permissions dla
// zapisanego baseUrl (nadane dynamicznie przy zapisie ustawień), więc tylko
// stąd fetch cross-origin działa bez configu CORS po stronie serwera TIDORA
// (uprawnienie hosta w rozszerzeniu omija CORS dla tła/service workera -
// udokumentowane zachowanie Chrome/Firefox MV3, nie obejście, nie hack).

const ROUNDCUBE_SCRIPT_ID = 'tidora-webmail-roundcube';

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: 'tidora-from-selection',
		title: 'Utwórz zadanie w TIDORA z zaznaczenia',
		contexts: ['selection']
	});
	chrome.contextMenus.create({
		id: 'tidora-from-page',
		title: 'Utwórz zadanie w TIDORA z tej strony',
		contexts: ['page']
	});
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === 'tidora-from-selection') {
		openCompose({
			title: truncate(info.selectionText || tab?.title || '', 140),
			description: info.selectionText || '',
			email_url: tab?.url || ''
		});
	} else if (info.menuItemId === 'tidora-from-page') {
		openCompose({
			title: truncate(tab?.title || '', 140),
			description: '',
			email_url: tab?.url || ''
		});
	}
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg?.type === 'TIDORA_OPEN_COMPOSE') {
		openCompose(msg.prefill);
		sendResponse({ ok: true });
		return false;
	}
	if (msg?.type === 'TIDORA_CREATE_TASK') {
		createTask(msg.task).then(sendResponse);
		return true; // async
	}
	if (msg?.type === 'TIDORA_TEST_CONNECTION') {
		testConnection(msg.baseUrl, msg.apiKey).then(sendResponse);
		return true;
	}
	if (msg?.type === 'TIDORA_REGISTER_WEBMAIL') {
		registerWebmailOrigin(msg.originPattern).then(sendResponse);
		return true;
	}
	if (msg?.type === 'TIDORA_UNREGISTER_WEBMAIL') {
		unregisterWebmail().then(sendResponse);
		return true;
	}
	return false;
});

function truncate(s, max) {
	s = (s || '').trim().replace(/\s+/g, ' ');
	return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

async function openCompose(prefill) {
	const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
	await chrome.storage.session.set({ [id]: prefill });
	const url = chrome.runtime.getURL('compose.html') + '?id=' + encodeURIComponent(id);
	chrome.windows.create({ url, type: 'popup', width: 420, height: 480 });
}

async function getConfig() {
	const { baseUrl, apiKey } = await chrome.storage.local.get(['baseUrl', 'apiKey']);
	return { baseUrl: (baseUrl || '').replace(/\/+$/, ''), apiKey: apiKey || '' };
}

async function createTask(task) {
	const { baseUrl, apiKey } = await getConfig();
	if (!baseUrl || !apiKey) {
		return { ok: false, error: 'Uzupełnij adres instancji i klucz API w ustawieniach rozszerzenia.' };
	}
	try {
		const res = await fetch(baseUrl + '/api/ext/tasks', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
			body: JSON.stringify(task)
		});
		const data = await res.json().catch(() => null);
		if (!res.ok || !data?.result) {
			return { ok: false, error: data?.error || `Błąd serwera (HTTP ${res.status})` };
		}
		notify('Zadanie utworzone', task.title);
		return { ok: true, taskId: data.task_id };
	} catch (e) {
		return { ok: false, error: 'Nie udało się połączyć z instancją TIDORA (' + e.message + ')' };
	}
}

async function testConnection(baseUrl, apiKey) {
	baseUrl = (baseUrl || '').replace(/\/+$/, '');
	try {
		const res = await fetch(baseUrl + '/api/ext/ping', {
			headers: { Authorization: 'Bearer ' + apiKey }
		});
		const data = await res.json().catch(() => null);
		if (!res.ok || !data?.result) {
			return { ok: false, error: data?.error || `HTTP ${res.status}` };
		}
		return { ok: true, apiKeyName: data.api_key };
	} catch (e) {
		return { ok: false, error: e.message };
	}
}

function notify(title, message) {
	try {
		chrome.notifications.create({
			type: 'basic',
			iconUrl: chrome.runtime.getURL('icons/icon48.png'),
			title,
			message: message || ''
		});
	} catch {
		/* notifications API bywa niedostępne (np. brak uprawnienia OS) - nie blokuje reszty */
	}
}

// Roundcube (i podobne webmaile) mają domenę zależną od instalacji klienta - nie da się jej
// wpisać na sztywno w manifest.json jak dla Gmaila. Rejestracja dynamiczna (chrome.scripting)
// po tym, jak użytkownik poda adres w Ustawieniach i przyzna uprawnienie hosta.
async function registerWebmailOrigin(originPattern) {
	try {
		await unregisterWebmail();
		await chrome.scripting.registerContentScripts([
			{
				id: ROUNDCUBE_SCRIPT_ID,
				matches: [originPattern],
				js: ['content-webmail.js'],
				runAt: 'document_idle',
				allFrames: true
			}
		]);
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e.message };
	}
}

async function unregisterWebmail() {
	try {
		const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [ROUNDCUBE_SCRIPT_ID] });
		if (existing.length) {
			await chrome.scripting.unregisterContentScripts({ ids: [ROUNDCUBE_SCRIPT_ID] });
		}
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e.message };
	}
}
