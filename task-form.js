// Wspólny formularz tworzenia zadania, używany zarówno przez popup.html (klik w ikonę
// paska narzędzi - kontekst bieżącej karty) jak i compose.html (okienko otwierane z menu
// kontekstowego - kontekst zaznaczenia/strony przekazany przez background.js). Obie strony
// dostarczają tylko initialPrefill; reszta (wysyłka, obsługa błędów) jest identyczna.
//
// `ext` (alias browser.*/chrome.*) jest już zadeklarowany globalnie przez i18n.js, który
// ładuje się jako pierwszy <script> w popup.html/compose.html (przed tym plikiem) - stąd
// brak własnej deklaracji tutaj, popup.js/compose.js też go widzą za darmo.

// Prefill opisu to HTML z Gmaila/Roundcube/dowolnej strony (patrz content-gmail.js,
// content-webmail.js, background.js getSelectionHtml) - czyli potencjalnie NIE zaufany
// (spreparowany mail/strona), a trafia do innerHTML strony rozszerzenia. Serwer i tak
// przepuszcza opis przez HTMLPurifier przy zapisie, ale ten podgląd renderuje się od razu,
// więc czyścimy też po stronie klienta - allowlista atrybutów (usuwa on*/style/class w
// locie) + blokada javascript:/vbscript: i data: poza data:image/* we src.
function sanitizeHtml(html) {
	const DROP_TAGS = new Set([
		'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'LINK', 'META',
		'BASE', 'SVG', 'MATH', 'NOSCRIPT', 'TEMPLATE', 'AUDIO', 'VIDEO', 'SOURCE', 'TRACK'
	]);
	const ATTR_ALLOWLIST = {
		A: ['href'],
		IMG: ['src', 'alt'],
		TD: ['colspan', 'rowspan'],
		TH: ['colspan', 'rowspan']
	};

	function isSafeUrl(value, allowDataImage) {
		const v = (value || '').trim();
		if (/^(javascript|vbscript):/i.test(v)) return false;
		if (/^data:/i.test(v)) return !!allowDataImage && /^data:image\//i.test(v);
		return true;
	}

	function clean(node) {
		[...node.childNodes].forEach((child) => {
			if (child.nodeType === Node.ELEMENT_NODE) {
				// toUpperCase(): elementy z przestrzeni nazw SVG/MathML (np. <svg>, zagnieżdżony
				// w nich <script>) mają tagName w oryginalnej, małej wielkości liter - bez tego
				// DROP_TAGS by je omijał i zostawiał w wyjściu (patrz PR-owy test bezpieczeństwa).
				const tag = child.tagName.toUpperCase();
				if (DROP_TAGS.has(tag)) {
					child.remove();
					return;
				}
				const allowed = ATTR_ALLOWLIST[tag] || [];
				[...child.attributes].forEach((attr) => {
					const name = attr.name.toLowerCase();
					if (!allowed.includes(name)) {
						child.removeAttribute(attr.name);
						return;
					}
					if ((name === 'href' && !isSafeUrl(attr.value, false)) ||
						(name === 'src' && !isSafeUrl(attr.value, true))) {
						child.removeAttribute(attr.name);
					}
				});
				clean(child);
			} else if (child.nodeType !== Node.TEXT_NODE) {
				child.remove(); // komentarze itp.
			}
		});
	}

	const doc = new DOMParser().parseFromString(html, 'text/html');
	clean(doc.body);
	return doc.body.innerHTML;
}

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
	// HTML (patrz content-gmail.js/content-webmail.js/background.js getSelectionHtml) -
	// sanitizeHtml() powyżej odcina niebezpieczne tagi/atrybuty przed wstawieniem.
	els.description.innerHTML = sanitizeHtml(initialPrefill.description || '');
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
