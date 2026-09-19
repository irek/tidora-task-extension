// Rejestrowany DYNAMICZNIE (patrz background.js registerWebmailOrigin) tylko dla domeny
// Roundcube, którą użytkownik poda w Ustawieniach - w manifest.json nie ma na sztywno żadnej
// domeny webmaila poza Gmailem, bo Roundcube jest samodzielnie hostowany i adres zależy od
// instalacji klienta.
//
// W przeciwieństwie do content-gmail.js (jedna, znana domena, więc da się dobrać stabilne
// selektory) tu skiny/wersje Roundcube się różnią - zamiast zgadywać dokładny selektor
// tematu/treści, degradujemy się łagodnie: zaznaczenie użytkownika > heurystyka DOM > sam
// tytuł strony. Pływający przycisk zamiast wstrzykiwania w pasek narzędzi appki z tego
// samego powodu - nie trzeba trafić w konkretny skin, żeby przycisk się w ogóle pojawił.
//
// Alias ext = browser.*/chrome.* (z ochroną przed atrapą `browser` w Chromium) - patrz
// pełny komentarz w background.js.
const ext = (typeof browser === 'undefined' || Object.getPrototypeOf(browser) === Object.prototype) ? chrome : browser;

// innerHTML/klonowanie zaznaczenia, nie innerText - żeby tabele/listy/pogrubienia (np. z
// widoku wiadomości) przeżyły w opisie zadania. Serwer i tak przepuszcza opis przez
// HTMLPurifier (allowlista tagów), więc niepełny/nietypowy HTML jest bezpieczny do wysłania.
function extractFallback() {
	const sel = window.getSelection();
	if (sel && sel.rangeCount > 0 && sel.toString().trim()) {
		const container = document.createElement('div');
		for (let i = 0; i < sel.rangeCount; i++) {
			container.appendChild(sel.getRangeAt(i).cloneContents());
		}
		return { title: document.title, description: container.innerHTML };
	}

	// Najczęstsze miejsca na treść wiadomości w skinach Elastic/Larry - best effort, nie
	// gwarantowane. Jeśli żadne nie trafi, zostaje sam tytuł strony.
	const bodyCandidates = [
		'#messagebody', '.message-part', 'iframe.iframe-content', 'iframe#messagecontframe', '#preview-pane iframe'
	];
	for (const selector of bodyCandidates) {
		const el = document.querySelector(selector);
		if (!el) continue;
		const html = el.tagName === 'IFRAME'
			? el.contentDocument?.body?.innerHTML
			: el.innerHTML;
		if (html && html.trim()) {
			return { title: document.title, description: html.trim().slice(0, 20000) };
		}
	}

	return { title: document.title, description: '' };
}

function createFloatingButton() {
	if (document.getElementById('tidora-webmail-btn')) return;

	const btn = document.createElement('button');
	btn.id = 'tidora-webmail-btn';
	btn.textContent = '+ TIDORA';
	btn.title = 'Utwórz zadanie w TIDORA (z zaznaczenia albo z tej wiadomości)';
	btn.style.cssText = [
		'position:fixed', 'right:20px', 'bottom:20px', 'z-index:2147483647',
		'padding:9px 16px', 'font-size:13px', 'font-family:system-ui,sans-serif',
		'border-radius:20px', 'border:none', 'color:#fff', 'background:#4f46e5',
		'box-shadow:0 2px 8px rgba(0,0,0,.25)', 'cursor:pointer'
	].join(';');
	btn.addEventListener('click', () => {
		const { title, description } = extractFallback();
		ext.runtime.sendMessage({
			type: 'TIDORA_OPEN_COMPOSE',
			prefill: { title, description, email_url: location.href }
		});
	});
	document.documentElement.appendChild(btn);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', createFloatingButton);
} else {
	createFloatingButton();
}
