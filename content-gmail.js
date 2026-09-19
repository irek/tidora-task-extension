// Gmail nie ma stabilnego, udokumentowanego DOM - te selektory (.hP dla tematu, .a3s.aiL
// dla treści wiadomości) są tym, czego od lat używają inne rozszerzenia integrujące się z
// Gmailem, ale Google może je zmienić bez ostrzeżenia. Jeśli przycisk przestanie się
// pojawiać, to pierwsze miejsce do sprawdzenia.
//
// Alias ext = browser.*/chrome.* (z ochroną przed atrapą `browser` w Chromium) - patrz
// pełny komentarz w background.js.
const ext = (typeof browser === 'undefined' || Object.getPrototypeOf(browser) === Object.prototype) ? chrome : browser;

const SUBJECT_SELECTOR = 'h2.hP';
const BODY_SELECTOR = '.a3s.aiL';
const BUTTON_MARK = 'data-tidora-injected';

function injectButton() {
	const subjectEls = document.querySelectorAll(SUBJECT_SELECTOR);
	subjectEls.forEach((subjectEl) => {
		if (subjectEl.hasAttribute(BUTTON_MARK)) return;
		subjectEl.setAttribute(BUTTON_MARK, '1');

		const btn = document.createElement('button');
		btn.textContent = '+ TIDORA';
		btn.title = 'Utwórz zadanie w TIDORA z tej wiadomości';
		btn.style.cssText = [
			'margin-left:10px', 'padding:3px 10px', 'font-size:12px', 'font-family:inherit',
			'border-radius:14px', 'border:1px solid #4f46e5', 'color:#4f46e5', 'background:#fff',
			'cursor:pointer', 'vertical-align:middle'
		].join(';');
		btn.addEventListener('mouseenter', () => { btn.style.background = '#4f46e5'; btn.style.color = '#fff'; });
		btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; btn.style.color = '#4f46e5'; });
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			createTaskFromMessage(subjectEl);
		});

		subjectEl.appendChild(btn);
	});
}

function createTaskFromMessage(subjectEl) {
	const title = (subjectEl.textContent || '').replace('+ TIDORA', '').trim();

	// Kontener wiadomości (.hP) i jej treść (.a3s.aiL) żyją w tym samym wątku DOM, ale nie są
	// ojciec/dziecko - najbliższe wspólne miejsce to kontener konwersacji, stąd szukanie w górę.
	const container = subjectEl.closest('.adn, .if, [role="main"]') || document;
	const bodyEl = container.querySelector(BODY_SELECTOR);
	// innerHTML, nie innerText - żeby tabele/listy/pogrubienia z maila przeżyły w opisie
	// zadania. Serwer i tak przepuszcza to przez HTMLPurifier (allowlista tagów), więc
	// obcięcie w środku znacznika jest bezpieczne - parser po prostu domknie, co się da.
	const description = bodyEl ? bodyEl.innerHTML.trim().slice(0, 20000) : '';

	ext.runtime.sendMessage({
		type: 'TIDORA_OPEN_COMPOSE',
		prefill: { title, description, email_url: location.href }
	});
}

const observer = new MutationObserver(() => injectButton());
observer.observe(document.body, { childList: true, subtree: true });
injectButton();
