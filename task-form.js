// Wspólny formularz tworzenia zadania, używany zarówno przez popup.html (klik w ikonę
// paska narzędzi - kontekst bieżącej karty) jak i compose.html (okienko otwierane z menu
// kontekstowego - kontekst zaznaczenia/strony przekazany przez background.js). Obie strony
// dostarczają tylko initialPrefill; reszta (wysyłka, obsługa błędów) jest identyczna.
//
// Deklarowane tu (nie w popup.js/compose.js) - klasyczne (nie-modułowe) skrypty dzielą ten
// sam zakres globalny strony, a ten plik ładuje się w obu jako pierwszy (patrz <script> w
// popup.html/compose.html), więc popup.js/compose.js widzą `ext` bez własnej deklaracji.
// Firefox ma promisowy `browser.*`; jego `chrome.*` jest tylko callbackowe dla zgodności ze
// starym Chrome, więc `await chrome.storage...` by się tu wywalił (patrz background.js po
// pełny komentarz, w tym o atrapie `browser` w Chromium, przed którą chroni ten warunek).
const ext = (typeof browser === 'undefined' || Object.getPrototypeOf(browser) === Object.prototype) ? chrome : browser;

function initTaskForm(initialPrefill, { closeOnSuccess } = {}) {
	const els = {
		title: document.getElementById('title'),
		description: document.getElementById('description'),
		url: document.getElementById('url'),
		contractorField: document.getElementById('contractor-field'),
		contractor: document.getElementById('contractor'),
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
		ext.runtime.openOptionsPage();
	});

	// Selektor klienta jest opcjonalny w dwójnasób: pole samo w sobie (zadanie nie musi
	// dotyczyć konkretnego kontrahenta) i jego widoczność (klucz bez tasks:write - albo
	// wydany zanim ten endpoint istniał w panelu - dostanie 403/404; formularz ma wtedy
	// dalej działać, tylko bez tego pola, zamiast się wywalać).
	if (els.contractorField) {
		ext.runtime.sendMessage({ type: 'TIDORA_LIST_CONTRACTORS' }).then((resp) => {
			if (!resp?.ok || !resp.contractors?.length) return;
			for (const c of resp.contractors) {
				const opt = document.createElement('option');
				opt.value = String(c.id);
				opt.textContent = c.name;
				els.contractor.appendChild(opt);
			}
			els.contractorField.style.display = '';
		});
	}

	document.getElementById('form').addEventListener('submit', async (e) => {
		e.preventDefault();
		const title = els.title.value.trim();
		if (!title) return;

		els.submit.disabled = true;
		setStatus('info', 'Wysyłanie…');

		const { baseUrl, apiKey } = await ext.storage.local.get(['baseUrl', 'apiKey']);
		if (!baseUrl || !apiKey) {
			setStatus('err', 'Uzupełnij adres instancji i klucz API w ustawieniach rozszerzenia.');
			els.submit.disabled = false;
			return;
		}

		const resp = await ext.runtime.sendMessage({
			type: 'TIDORA_CREATE_TASK',
			task: {
				title,
				description: els.description.value.trim(),
				email_url: initialPrefill.email_url || '',
				contractor_id: els.contractor?.value ? Number(els.contractor.value) : undefined
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
