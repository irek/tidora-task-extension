// Tło rozszerzenia - jedyne miejsce, które faktycznie woła API TIDORA. Content scripty i
// popup/compose/options NIGDY nie fetchują same - zawsze przez wiadomość do tego skryptu.
// Powód: to on ma host_permissions dla zapisanego baseUrl (nadane dynamicznie przy zapisie
// ustawień), więc tylko stąd fetch cross-origin działa bez configu CORS po stronie serwera
// TIDORA (uprawnienie hosta w rozszerzeniu omija CORS dla tła - udokumentowane zachowanie
// Chrome/Firefox MV3, nie obejście, nie hack).
//
// Chrome MV3 wymaga background.service_worker; Firefox (na dziś) go nie obsługuje i chce
// background.scripts - manifest.json deklaruje oba, każda przeglądarka używa swojego. Firefox
// ma promisowy `browser.*`; jego `chrome.*` jest tylko callbackowe dla zgodności ze starym
// Chrome, więc `await chrome.storage...` by się tu wywalił - stąd alias `ext` zamiast
// wywołań wprost (patrz ten sam alias w każdym pozostałym pliku rozszerzenia).
//
// `typeof browser !== 'undefined'` NIE WYSTARCZY - nowsze Chromium (zweryfikowane na żywo:
// Chromium spod Playwrighta) podstawia OKROJONY, niedziałający obiekt `browser` (prosty
// {}, prototyp Object.prototype - prawdziwy Firefoksowy `browser` go NIE ma) i wtedy
// onMessage zarejestrowany przez tę atrapę nigdy nie odpala się na wiadomości wysłane przez
// chrome.runtime.sendMessage (zaobserwowane: opcje wisną w nieskończoność na "Sprawdzanie…").
// Ten sam test prototypu stosuje oficjalny webextension-polyfill Mozilli.
const ext = (typeof browser === 'undefined' || Object.getPrototypeOf(browser) === Object.prototype) ? chrome : browser;

const ROUNDCUBE_SCRIPT_ID = 'tidora-webmail-roundcube';

ext.runtime.onInstalled.addListener(() => {
	ext.contextMenus.create({
		id: 'tidora-from-selection',
		title: ext.i18n.getMessage('ctxMenuSelection'),
		contexts: ['selection']
	});
	ext.contextMenus.create({
		id: 'tidora-from-page',
		title: ext.i18n.getMessage('ctxMenuPage'),
		contexts: ['page']
	});
});

ext.contextMenus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId === 'tidora-from-selection') {
		// info.selectionText (z API menu kontekstowego) to zawsze goły plain text - żeby
		// zachować strukturę zaznaczenia (np. tabelę), trzeba sięgnąć po HTML zaznaczenia w
		// samej stronie. executeScript działa tu na aktywnej karcie dzięki activeTab -
		// kliknięcie w menu kontekstowe LICZY SIĘ jako gest użytkownika, który je przyznaje.
		// Nie wychodzi na stronach specjalnych (chrome://, Web Store...) - wtedy spadamy na
		// plain text zamiast wywalać całą akcję.
		let html = '';
		try {
			const [{ result }] = await ext.scripting.executeScript({ target: { tabId: tab.id }, func: getSelectionHtml });
			html = result || '';
		} catch {
			/* strona specjalna albo brak dostępu - fallback niżej */
		}
		openCompose({
			title: truncate(info.selectionText || tab?.title || '', 140),
			description: html || escapeHtml(info.selectionText || ''),
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

ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
	if (msg?.type === 'TIDORA_LIST_CONTRACTORS') {
		listContractors().then(sendResponse);
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

function escapeHtml(s) {
	return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Uruchamiane W STRONIE przez ext.scripting.executeScript - musi być samowystarczalne (bez
// domknięć na zmienne z tego pliku, przegląderka je serializuje osobno). Klonuje zaznaczenie
// do pomocniczego kontenera i czyta jego innerHTML - zachowuje strukturę (tabele, listy,
// pogrubienia), nie tylko goły tekst jak `info.selectionText` z API menu kontekstowego.
function getSelectionHtml() {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return '';
	const container = document.createElement('div');
	for (let i = 0; i < sel.rangeCount; i++) {
		container.appendChild(sel.getRangeAt(i).cloneContents());
	}
	return container.innerHTML;
}

async function openCompose(prefill) {
	const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
	await ext.storage.session.set({ [id]: prefill });
	const url = ext.runtime.getURL('compose.html') + '?id=' + encodeURIComponent(id);
	ext.windows.create({ url, type: 'popup', width: 420, height: 480 });
}

async function getConfig() {
	const { baseUrl, apiKey } = await ext.storage.local.get(['baseUrl', 'apiKey']);
	return { baseUrl: (baseUrl || '').replace(/\/+$/, ''), apiKey: apiKey || '' };
}

async function createTask(task) {
	const { baseUrl, apiKey } = await getConfig();
	if (!baseUrl || !apiKey) {
		return { ok: false, error: ext.i18n.getMessage('errFillSettings') };
	}
	try {
		const res = await fetch(baseUrl + '/api/ext/tasks', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
			body: JSON.stringify(task)
		});
		const data = await res.json().catch(() => null);
		if (!res.ok || !data?.result) {
			return { ok: false, error: data?.error || ext.i18n.getMessage('errServerHttp', String(res.status)) };
		}
		notify(ext.i18n.getMessage('notifyTaskCreatedTitle'), task.title);
		return { ok: true, taskId: data.task_id };
	} catch (e) {
		return { ok: false, error: ext.i18n.getMessage('errConnectFailed', e.message) };
	}
}

// Lista kontrahentów do dropdownu w formularzu - klucz bez tasks:write (albo z tasks:write,
// ale wydany PRZED dodaniem tego endpointu w panelu) dostanie tu 403/404; formularz ma się
// wtedy obejść bez selektora klienta, nie zepsuć całej reszty (patrz initContractorPicker w
// task-form.js).
async function listContractors() {
	const { baseUrl, apiKey } = await getConfig();
	if (!baseUrl || !apiKey) {
		return { ok: false, error: ext.i18n.getMessage('errNoConfig') };
	}
	try {
		const res = await fetch(baseUrl + '/api/ext/contractors', {
			headers: { Authorization: 'Bearer ' + apiKey }
		});
		const data = await res.json().catch(() => null);
		if (!res.ok || !data?.result) {
			return { ok: false, error: data?.error || `HTTP ${res.status}` };
		}
		return { ok: true, contractors: data.contractors };
	} catch (e) {
		return { ok: false, error: e.message };
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
		ext.notifications.create({
			type: 'basic',
			iconUrl: ext.runtime.getURL('icons/icon48.png'),
			title,
			message: message || ''
		});
	} catch {
		/* notifications API bywa niedostępne (np. brak uprawnienia OS) - nie blokuje reszty */
	}
}

// Roundcube (i podobne webmaile) mają domenę zależną od instalacji klienta - nie da się jej
// wpisać na sztywno w manifest.json jak dla Gmaila. Rejestracja dynamiczna (ext.scripting)
// po tym, jak użytkownik poda adres w Ustawieniach i przyzna uprawnienie hosta.
async function registerWebmailOrigin(originPattern) {
	try {
		await unregisterWebmail();
		await ext.scripting.registerContentScripts([
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
		const existing = await ext.scripting.getRegisteredContentScripts({ ids: [ROUNDCUBE_SCRIPT_ID] });
		if (existing.length) {
			await ext.scripting.unregisterContentScripts({ ids: [ROUNDCUBE_SCRIPT_ID] });
		}
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e.message };
	}
}
