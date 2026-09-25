// Lokalizacja stron rozszerzenia (popup/compose/options) w oparciu o WebExtensions i18n API.
// manifest.json/CSS mają wbudowaną podmianę __MSG_x__, ale HTML jej nie ma - stąd ten mały
// helper: przechodzi DOM i podmienia treść/atrybuty elementów oznaczonych data-i18n-*.
// Ładowany jako pierwszy <script> na każdej stronie (przed task-form.js/options.js), żeby
// alias `ext` był dostępny dla nich bez własnej deklaracji (patrz ten sam wzorzec w task-form.js).
const ext = (typeof browser === 'undefined' || Object.getPrototypeOf(browser) === Object.prototype) ? chrome : browser;

function applyI18n(root = document) {
	document.documentElement.lang = ext.i18n.getUILanguage().split('-')[0] || 'en';

	root.querySelectorAll('[data-i18n]').forEach((el) => {
		el.textContent = ext.i18n.getMessage(el.getAttribute('data-i18n'));
	});
	// Treść zawsze z zaufanego, statycznego messages.json (nigdy z danych użytkownika), ale
	// simple tagi jak <code> wymagają parsowania HTML, nie samego textContent. replaceChildren
	// z węzłami zamiast literalnego el.innerHTML = string - addons-linter (AMO) flaguje każde
	// przypisanie do innerHTML jako "Unsafe assignment" niezależnie od źródła danych.
	root.querySelectorAll('[data-i18n-html]').forEach((el) => {
		const html = ext.i18n.getMessage(el.getAttribute('data-i18n-html'));
		const parsed = document.importNode(new DOMParser().parseFromString(html, 'text/html').body, true);
		el.replaceChildren(...parsed.childNodes);
	});
	root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
		el.setAttribute('placeholder', ext.i18n.getMessage(el.getAttribute('data-i18n-placeholder')));
	});
	// Div contenteditable (nie <input>) - jej "placeholder" to CSS `content: attr(data-placeholder)`
	// (patrz task-form.css), stąd osobny atrybut zamiast prawdziwego `placeholder`.
	root.querySelectorAll('[data-i18n-dataplaceholder]').forEach((el) => {
		el.setAttribute('data-placeholder', ext.i18n.getMessage(el.getAttribute('data-i18n-dataplaceholder')));
	});
	root.querySelectorAll('[data-i18n-title]').forEach((el) => {
		el.setAttribute('title', ext.i18n.getMessage(el.getAttribute('data-i18n-title')));
	});
}

applyI18n();
