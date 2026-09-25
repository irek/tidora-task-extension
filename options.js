// `ext` (alias browser.*/chrome.*) jest już zadeklarowany globalnie przez i18n.js, który
// ładuje się jako pierwszy <script> w options.html (przed tym plikiem).
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
		setStatus(status, 'err', ext.i18n.getMessage('errFillBothFields'));
		return;
	}

	let origin;
	try {
		origin = new URL(baseUrl).origin + '/*';
	} catch {
		setStatus(status, 'err', ext.i18n.getMessage('errInvalidInstanceUrl'));
		return;
	}

	// Bez tego zgody hosta fetch z tła i tak poleci, ale w produkcji (bez CORS na serwerze)
	// przeglądarka odrzuci odczyt odpowiedzi - patrz komentarz w background.js.
	const granted = await ext.permissions.request({ origins: [origin] });
	if (!granted) {
		setStatus(status, 'err', ext.i18n.getMessage('errHostAccessDenied'));
		return;
	}

	await ext.storage.local.set({ baseUrl, apiKey });
	setStatus(status, 'ok', ext.i18n.getMessage('statusSaved'));
});

$('test').addEventListener('click', async () => {
	const baseUrl = normalizeBaseUrl($('baseUrl').value);
	const apiKey = $('apiKey').value.trim();
	const status = $('status');
	setStatus(status, 'info', ext.i18n.getMessage('statusChecking'));

	const resp = await ext.runtime.sendMessage({ type: 'TIDORA_TEST_CONNECTION', baseUrl, apiKey });
	if (resp?.ok) {
		setStatus(status, 'ok', ext.i18n.getMessage('statusConnectedOk', resp.apiKeyName || '?'));
	} else {
		setStatus(status, 'err', resp?.error || ext.i18n.getMessage('statusConnectionFailed'));
	}
});

$('saveRoundcube').addEventListener('click', async () => {
	const roundcubeUrl = normalizeBaseUrl($('roundcubeUrl').value);
	const status = $('roundcubeStatus');

	if (!roundcubeUrl) {
		await ext.storage.local.remove('roundcubeUrl');
		await ext.runtime.sendMessage({ type: 'TIDORA_UNREGISTER_WEBMAIL' });
		setStatus(status, 'info', ext.i18n.getMessage('statusRoundcubeDisabled'));
		return;
	}

	let origin;
	try {
		origin = new URL(roundcubeUrl).origin + '/*';
	} catch {
		setStatus(status, 'err', ext.i18n.getMessage('errInvalidAddress'));
		return;
	}

	const granted = await ext.permissions.request({ origins: [origin] });
	if (!granted) {
		setStatus(status, 'err', ext.i18n.getMessage('errRoundcubeAccessDenied'));
		return;
	}

	const resp = await ext.runtime.sendMessage({ type: 'TIDORA_REGISTER_WEBMAIL', originPattern: origin });
	if (resp?.ok) {
		await ext.storage.local.set({ roundcubeUrl });
		setStatus(status, 'ok', ext.i18n.getMessage('statusRoundcubeSaved'));
	} else {
		setStatus(status, 'err', resp?.error || ext.i18n.getMessage('errRoundcubeRegisterFailed'));
	}
});
