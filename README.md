# TIDORA - Utwórz zadanie

*[Read this in English](#tidora---create-task)*

Rozszerzenie do przeglądarki (Chrome/Edge/Firefox, Manifest V3), które tworzy zadania w
aplikacji TIDORA.business bez wchodzenia do panelu:

- **Dowolne zaznaczenie tekstu na dowolnej stronie** → menu kontekstowe → „Utwórz zadanie
  w TIDORA z zaznaczenia" (działa wszędzie, w tym w Roundcube - nie wymaga żadnej
  konfiguracji domeny).
- **Gmail** - przycisk „+ TIDORA" wstrzykiwany obok tematu otwartej wiadomości: jednym
  kliknięciem tworzy zadanie z tematu + treści + linkiem do wiadomości.
- **Roundcube** (opcjonalnie) - po podaniu adresu w Ustawieniach rozszerzenia pojawia się
  pływający przycisk „+ TIDORA" w widoku poczty.
- **Ikona na pasku narzędzi** - szybkie utworzenie zadania z bieżącej karty.
- **Wybór klienta** - jeśli klucz API ma uprawnienie do tworzenia zadań, formularz dociąga
  listę kontrahentów i pozwala od razu powiązać zadanie z klientem (opcjonalnie).
- **Dwujęzyczny interfejs** (polski / angielski) - dopasowuje się automatycznie do języka
  przeglądarki (WebExtensions i18n, `_locales/`).

## Wymaga

Klucza API TIDORA.business z uprawnieniem `Tworzenie zadań` i przypisanym Twoim kontem -
Ustawienia → Integracje → API zewnętrzne → Nowy klucz. Zob. `/api-docs.html` w panelu
Twojej instancji dla pełnej dokumentacji `/ext/*`.

## Instalacja (tryb deweloperski / niepodpisane)

**Chrome / Edge:**
1. `chrome://extensions` → włącz „Tryb dewelopera"
2. „Wczytaj rozpakowane" → wskaż ten katalog

**Firefox:**
1. `about:debugging#/runtime/this-firefox`
2. „Wczytaj tymczasowy dodatek" → wskaż `manifest.json`

Po instalacji otwórz Ustawienia rozszerzenia (prawy klik na ikonę → Opcje, albo link w
popupie) i podaj adres instancji + klucz API. Zapisanie poprosi o zgodę na dostęp do tej
domeny - to normalne (patrz `background.js`: bez niej fetch w tle działa, ale w produkcji,
bez nagłówków CORS na serwerze, przeglądarka odrzuci odczyt odpowiedzi).

## Architektura (skrót)

Wszystkie faktyczne wywołania `/api/ext/*` idą przez `background.js` (service worker), nigdy
bezpośrednio ze content scriptów/popupu/opcji - tylko tło ma nadane `host_permissions` dla
zapisanego adresu instancji.

Interfejs jest zlokalizowany przez WebExtensions i18n API: `_locales/pl/messages.json` i
`_locales/en/messages.json` trzymają wszystkie teksty, `i18n.js` podmienia je w DOM (atrybuty
`data-i18n*`), `manifest.json` używa placeholderów `__MSG_x__`. Przeglądarka sama wybiera
język na podstawie ustawień użytkownika (polski jako `default_locale`/fallback).

## Znane ograniczenia

- Selektory Gmaila (`content-gmail.js`) opierają się na klasach, których Google nie
  dokumentuje i może zmienić bez ostrzeżenia.
- Integracja z Roundcube jest "best effort" - różne skiny/wersje mają różny DOM, więc
  przycisk zawsze się pojawi, ale automatyczne wyciąganie tematu/treści może nie zadziałać
  w każdej instalacji (wtedy trzeba ręcznie zaznaczyć tekst przed kliknięciem).

---

# TIDORA - Create Task

*[Przeczytaj po polsku](#tidora---utwórz-zadanie)*

A browser extension (Chrome/Edge/Firefox, Manifest V3) that creates tasks in the
TIDORA.business app without opening the panel:

- **Any text selection on any page** → context menu → "Create task in TIDORA from
  selection" (works everywhere, including Roundcube - no domain setup required).
- **Gmail** - a "+ TIDORA" button injected next to the subject of an open message: one
  click creates a task from the subject + body + a link back to the message.
- **Roundcube** (optional) - once you enter your address in the extension's settings, a
  floating "+ TIDORA" button appears in the mail view.
- **Toolbar icon** - quickly create a task from the current tab.
- **Client selection** - if the API key has permission to create tasks, the form fetches
  the client list and lets you link the task to a client right away (optional).
- **Bilingual interface** (Polish / English) - matches your browser's language
  automatically (WebExtensions i18n, `_locales/`).

## Requirements

A TIDORA.business API key with the `Create tasks` permission and your account assigned -
Settings → Integrations → External API → New key. See `/api-docs.html` in your instance's
panel for the full `/ext/*` documentation.

## Installation (developer mode / unsigned)

**Chrome / Edge:**
1. `chrome://extensions` → enable "Developer mode"
2. "Load unpacked" → select this directory

**Firefox:**
1. `about:debugging#/runtime/this-firefox`
2. "Load Temporary Add-on" → select `manifest.json`

After installing, open the extension's settings (right-click the icon → Options, or the
link in the popup) and enter your instance address + API key. Saving will ask for
permission to access that domain - that's expected (see `background.js`: without it, the
background fetch still runs, but in production, without CORS headers on the server, the
browser will refuse to let the extension read the response).

## Architecture (brief)

All actual `/api/ext/*` calls go through `background.js` (service worker), never directly
from content scripts/popup/options - only the background has `host_permissions` granted
for the saved instance address.

The UI is localized via the WebExtensions i18n API: `_locales/pl/messages.json` and
`_locales/en/messages.json` hold all the text, `i18n.js` substitutes it into the DOM
(`data-i18n*` attributes), and `manifest.json` uses `__MSG_x__` placeholders. The browser
picks the language automatically based on the user's settings (Polish as
`default_locale`/fallback).

## Known limitations

- Gmail selectors (`content-gmail.js`) rely on classes that Google doesn't document and
  may change without notice.
- Roundcube integration is "best effort" - different skins/versions have different DOM, so
  the button always appears, but automatically extracting the subject/body may not work in
  every installation (in that case, select the text manually before clicking).
