// Wspólny formularz tworzenia zadania, używany zarówno przez popup.html (klik w ikonę
// paska narzędzi - kontekst bieżącej karty) jak i compose.html (okienko otwierane z menu
// kontekstowego - kontekst zaznaczenia/strony przekazany przez background.js). Obie strony
// dostarczają tylko initialPrefill; reszta (wysyłka, obsługa błędów) jest identyczna.
//
// `ext` (alias browser.*/chrome.*) jest już zadeklarowany globalnie przez i18n.js, który
// ładuje się jako pierwszy <script> w popup.html/compose.html (przed tym plikiem) - stąd
// brak własnej deklaracji tutaj, popup.js/compose.js też go widzą za darmo.
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
	// contenteditable, nie textarea - Ctrl+V wkleja WYSIWYG (tabele/listy/pogrubienia), textarea
	// spłaszczyłby wszystko do plain text. innerHTML, bo prefill z content scriptów jest już
	// HTML (patrz content-gmail.js/content-webmail.js/background.js getSelectionHtml).
	els.description.innerHTML = initialPrefill.description || '';
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
		setStatus('info', ext.i18n.getMessage('statusSending'));

		const { baseUrl, apiKey } = await ext.storage.local.get(['baseUrl', 'apiKey']);
		if (!baseUrl || !apiKey) {
			setStatus('err', ext.i18n.getMessage('errFillSettings'));
			els.submit.disabled = false;
			return;
		}

		const resp = await ext.runtime.sendMessage({
			type: 'TIDORA_CREATE_TASK',
			task: {
				title,
				description: els.description.innerHTML.trim(),
				email_url: initialPrefill.email_url || '',
				contractor_id: els.contractor?.value ? Number(els.contractor.value) : undefined
			}
		});

		if (resp?.ok) {
			setStatus('ok', ext.i18n.getMessage('statusTaskCreated'));
			if (closeOnSuccess) {
				setTimeout(() => window.close(), 700);
			} else {
				els.submit.disabled = false;
			}
		} else {
			setStatus('err', resp?.error || ext.i18n.getMessage('statusTaskCreateFailed'));
			els.submit.disabled = false;
		}
	});

	function setStatus(kind, text) {
		els.status.className = 'status ' + kind;
		els.status.textContent = text;
	}
}
