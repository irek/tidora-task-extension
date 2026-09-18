// Wspólny formularz tworzenia zadania, używany zarówno przez popup.html (klik w ikonę
// paska narzędzi - kontekst bieżącej karty) jak i compose.html (okienko otwierane z menu
// kontekstowego - kontekst zaznaczenia/strony przekazany przez background.js). Obie strony
// dostarczają tylko initialPrefill; reszta (wysyłka, obsługa błędów) jest identyczna.
function initTaskForm(initialPrefill, { closeOnSuccess } = {}) {
	const els = {
		title: document.getElementById('title'),
		description: document.getElementById('description'),
		url: document.getElementById('url'),
		submit: document.getElementById('submit'),
		status: document.getElementById('status'),
		openOptions: document.getElementById('open-options')
	};

	els.title.value = initialPrefill.title || '';
	els.description.value = initialPrefill.description || '';
	els.url.textContent = initialPrefill.email_url || '';
	els.url.href = initialPrefill.email_url || '';

	els.openOptions?.addEventListener('click', (e) => {
		e.preventDefault();
		chrome.runtime.openOptionsPage();
	});

	document.getElementById('form').addEventListener('submit', async (e) => {
		e.preventDefault();
		const title = els.title.value.trim();
		if (!title) return;

		els.submit.disabled = true;
		setStatus('info', 'Wysyłanie…');

		const { baseUrl, apiKey } = await chrome.storage.local.get(['baseUrl', 'apiKey']);
		if (!baseUrl || !apiKey) {
			setStatus('err', 'Uzupełnij adres instancji i klucz API w ustawieniach rozszerzenia.');
			els.submit.disabled = false;
			return;
		}

		const resp = await chrome.runtime.sendMessage({
			type: 'TIDORA_CREATE_TASK',
			task: {
				title,
				description: els.description.value.trim(),
				email_url: initialPrefill.email_url || ''
			}
		});

		if (resp?.ok) {
			setStatus('ok', 'Zadanie utworzone ✓');
			if (closeOnSuccess) {
				setTimeout(() => window.close(), 700);
			} else {
				els.submit.disabled = false;
			}
		} else {
			setStatus('err', resp?.error || 'Nie udało się utworzyć zadania.');
			els.submit.disabled = false;
		}
	});

	function setStatus(kind, text) {
		els.status.className = 'status ' + kind;
		els.status.textContent = text;
	}
}
