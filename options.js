// Firefox ma promisowy `browser.*`; jego `chrome.*` jest tylko callbackowe dla zgodności ze
// starym Chrome, więc `await chrome...` by się tu wywalił - patrz ten sam alias w reszcie
// plików rozszerzenia (background.js ma pełniejszy komentarz, w tym o atrapie `browser` w Chromium).
const ext = (typeof browser === 'undefined' || Object.getPrototypeOf(browser) === Object.prototype) ? chrome : browser;

const $ = (id) => document.getElementById(id);

function setStatus(el, kind, text) {
	el.className = 'status ' + kind;
	el.textContent = text;
}

function normalizeBaseUrl(v) {
	return v.trim().replace(/\/+$/, '');
}

(async () => {
	const { baseUrl, apiKey, roundcubeUrl } = await ext.storage.local.get(['baseUrl', 'apiKey', 'roundcubeUrl']);
	$('baseUrl').value = baseUrl || '';
	$('apiKey').value = apiKey || '';
	$('roundcubeUrl').value = roundcubeUrl || '';
})();

$('save').addEventListener('click', async () => {
	const baseUrl = normalizeBaseUrl($('baseUrl').value);
	const apiKey = $('apiKey').value.trim();
	const status = $('status');

	if (!baseUrl || !apiKey) {
		setStatus(status, 'err', 'Wypełnij oba pola.');
		return;
	}

	let origin;
	try {
		origin = new URL(baseUrl).origin + '/*';
	} catch {
		setStatus(status, 'err', 'Nieprawidłowy adres instancji.');
		return;
	}

	// Bez tego zgody hosta fetch z tła i tak poleci, ale w produkcji (bez CORS na serwerze)
	// przeglądarka odrzuci odczyt odpowiedzi - patrz komentarz w background.js.
	const granted = await ext.permissions.request({ origins: [origin] });
	if (!granted) {
		setStatus(status, 'err', 'Bez przyznanego dostępu do tej domeny rozszerzenie nie będzie mogło się z nią połączyć.');
		return;
	}

	await ext.storage.local.set({ baseUrl, apiKey });
	setStatus(status, 'ok', 'Zapisano.');
});

$('test').addEventListener('click', async () => {
	const baseUrl = normalizeBaseUrl($('baseUrl').value);
	const apiKey = $('apiKey').value.trim();
	const status = $('status');
	setStatus(status, 'info', 'Sprawdzanie…');

	const resp = await ext.runtime.sendMessage({ type: 'TIDORA_TEST_CONNECTION', baseUrl, apiKey });
	if (resp?.ok) {
		setStatus(status, 'ok', `Połączono ✓ (klucz: ${resp.apiKeyName || '?'})`);
	} else {
		setStatus(status, 'err', resp?.error || 'Połączenie nieudane.');
	}
});

$('saveRoundcube').addEventListener('click', async () => {
	const roundcubeUrl = normalizeBaseUrl($('roundcubeUrl').value);
	const status = $('roundcubeStatus');

	if (!roundcubeUrl) {
		await ext.storage.local.remove('roundcubeUrl');
		await ext.runtime.sendMessage({ type: 'TIDORA_UNREGISTER_WEBMAIL' });
		setStatus(status, 'info', 'Wyłączono integrację z Roundcube.');
		return;
	}

	let origin;
	try {
		origin = new URL(roundcubeUrl).origin + '/*';
	} catch {
		setStatus(status, 'err', 'Nieprawidłowy adres.');
		return;
	}

	const granted = await ext.permissions.request({ origins: [origin] });
	if (!granted) {
		setStatus(status, 'err', 'Bez przyznanego dostępu przycisk nie pojawi się w Roundcube.');
		return;
	}

	const resp = await ext.runtime.sendMessage({ type: 'TIDORA_REGISTER_WEBMAIL', originPattern: origin });
	if (resp?.ok) {
		await ext.storage.local.set({ roundcubeUrl });
		setStatus(status, 'ok', 'Zapisano - odśwież Roundcube, żeby zobaczyć przycisk.');
	} else {
		setStatus(status, 'err', resp?.error || 'Nie udało się zarejestrować.');
	}
});
