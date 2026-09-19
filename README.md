# TIDORA — Utwórz zadanie

Rozszerzenie do przeglądarki (Chrome/Edge/Firefox, Manifest V3), które tworzy zadania w
TIDORA (FAKTURA) bez wchodzenia do panelu:

- **Dowolne zaznaczenie tekstu na dowolnej stronie** → menu kontekstowe → „Utwórz zadanie
  w TIDORA z zaznaczenia" (działa wszędzie, w tym w Roundcube — nie wymaga żadnej
  konfiguracji domeny).
- **Gmail** — przycisk „+ TIDORA" wstrzykiwany obok tematu otwartej wiadomości: jednym
  kliknięciem tworzy zadanie z tematu + treści + linkiem do wiadomości.
- **Roundcube** (opcjonalnie) — po podaniu adresu w Ustawieniach rozszerzenia pojawia się
  pływający przycisk „+ TIDORA" w widoku poczty.
- **Ikona na pasku narzędzi** — szybkie utworzenie zadania z bieżącej karty.
- **Wybór klienta** — jeśli klucz API ma uprawnienie do tworzenia zadań, formularz dociąga
  listę kontrahentów i pozwala od razu powiązać zadanie z klientem (opcjonalnie).

## Wymaga

Klucza API TIDORA (FAKTURA) z uprawnieniem `Tworzenie zadań` i przypisanym Twoim kontem —
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
domeny — to normalne (patrz `background.js`: bez niej fetch w tle działa, ale w produkcji,
bez nagłówków CORS na serwerze, przeglądarka odrzuci odczyt odpowiedzi).

## Architektura (skrót)

Wszystkie faktyczne wywołania `/api/ext/*` idą przez `background.js` (service worker), nigdy
bezpośrednio ze content scriptów/popupu/opcji — tylko tło ma nadane `host_permissions` dla
zapisanego adresu instancji, co pozwala ominąć CORS (udokumentowane zachowanie
rozszerzeń MV3, nie obejście zabezpieczeń serwera).

## Znane ograniczenia

- Selektory Gmaila (`content-gmail.js`) opierają się na klasach, których Google nie
  dokumentuje i może zmienić bez ostrzeżenia.
- Integracja z Roundcube jest "best effort" — różne skiny/wersje mają różny DOM, więc
  przycisk zawsze się pojawi, ale automatyczne wyciąganie tematu/treści może nie zadziałać
  w każdej instalacji (wtedy trzeba ręcznie zaznaczyć tekst przed kliknięciem).
- Ikony to prosty placeholder wygenerowany programowo, nie branding docelowy.
