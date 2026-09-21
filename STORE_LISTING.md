# Treści do formularzy Chrome Web Store / Firefox Add-ons

Ten plik nie jest częścią rozszerzenia - to gotowe treści do wklejenia w panelu deweloperskim
przy publikacji. Wszystko poniżej można kopiować bez zmian; miejsca do uzupełnienia są
oznaczone **[TU]**.

## Podstawowe dane

- **Nazwa**: TIDORA — Utwórz zadanie
- **Kategoria**: Produktywność (Productivity)
- **Strona domowa / homepage**: https://tidora.business
- **Polityka prywatności**: https://tidora.pl/polityka-prywatnosci.html#rozszerzenie
- **Kontakt**: hello@tidora.pl

## Krótki opis (Chrome: max 132 znaki; AMO: "Summary")

```
Twórz zadania w TIDORA.business z Gmaila, Roundcube albo dowolnego zaznaczenia na stronie.
```

## Pełny opis

```
TIDORA — Utwórz zadanie pozwala tworzyć zadania w Twojej instancji TIDORA.business bez
otwierania panelu - prosto z Gmaila, Roundcube albo dowolnej innej strony.

FUNKCJE

• Zaznacz dowolny tekst na dowolnej stronie → menu kontekstowe → "Utwórz zadanie w TIDORA
  z zaznaczenia". Działa wszędzie, w tym w Roundcube - bez żadnej konfiguracji domeny.
  Zachowuje formatowanie zaznaczenia (np. tabelę), nie tylko goły tekst.
• Gmail - przycisk "+ TIDORA" tuż obok tematu otwartej wiadomości: jednym kliknięciem
  tworzy zadanie z tematu, treści maila i linkiem powrotnym do wiadomości.
• Roundcube (opcjonalnie) - po podaniu adresu Twojego Roundcube w Ustawieniach rozszerzenia
  pojawia się dodatkowy przycisk w widoku poczty.
• Ikona na pasku narzędzi - szybkie utworzenie zadania z bieżącej karty.
• Wybór klienta - jeśli Twój klucz API ma do tego uprawnienie, formularz pozwala od razu
  powiązać nowe zadanie z konkretnym kontrahentem.

WYMAGANIA

Potrzebujesz własnej instancji TIDORA.business i osobistego klucza API z uprawnieniem
"Tworzenie zadań" - wygenerujesz go w panelu: Ustawienia → Integracje → API zewnętrzne →
Nowy klucz. Rozszerzenie łączy się WYŁĄCZNIE z adresem instancji, który sam podasz w
Ustawieniach rozszerzenia.

PRYWATNOŚĆ

Adres instancji i klucz API są zapisywane wyłącznie lokalnie w Twojej przeglądarce.
Rozszerzenie nie wysyła żadnych danych do autora rozszerzenia ani do jakiegokolwiek serwera
poza Twoją własną instancją TIDORA.business. Brak analityki, brak reklam, brak śledzenia.
Pełna polityka prywatności: https://tidora.pl/polityka-prywatnosci.html#rozszerzenie
```

## Deklaracja jednego przeznaczenia (Chrome "Single purpose")

```
Tworzenie zadań w systemie TIDORA.business (do którego użytkownik ma własne, osobiste
konto) na podstawie zaznaczonego tekstu, otwartej wiadomości e-mail albo bieżącej strony.
```

## Uzasadnienie uprawnień (Chrome "Permission justification", pole per uprawnienie)

| Uprawnienie | Uzasadnienie |
|---|---|
| `storage` | Przechowuje lokalnie w przeglądarce adres instancji użytkownika i jego osobisty klucz API - potrzebne do połączenia z jego kontem TIDORA.business. Nigdy nie jest wysyłane nigdzie poza tę instancję. |
| `contextMenus` | Dodaje opcję "Utwórz zadanie w TIDORA" do menu kontekstowego (zaznaczenie / strona), żeby użytkownik mógł od razu przenieść zaznaczony tekst do formularza zadania. |
| `notifications` | Pokazuje jedno potwierdzenie po pomyślnym utworzeniu zadania. |
| `activeTab` | Pozwala odczytać tytuł/adres bieżącej karty i (przy akcji z menu kontekstowego) treść zaznaczenia - wyłącznie w momencie, gdy użytkownik sam kliknie ikonę rozszerzenia albo opcję menu kontekstowego. |
| `scripting` | Odczytuje sformatowaną treść zaznaczenia (np. tabelę) na aktywnej karcie w momencie akcji użytkownika oraz (opcjonalnie, po konfiguracji) wstrzykuje przycisk "+ TIDORA" w Gmailu i Roundcube. |
| Uprawnienie hosta (`optional_host_permissions`) | Żądane per-domena, dopiero gdy użytkownik sam wpisze adres swojej instancji TIDORA.business (i opcjonalnie Roundcube) w Ustawieniach rozszerzenia - rozszerzenie NIE żąda dostępu do wszystkich stron z góry przy instalacji. |

## Zrzuty ekranu

`store-assets/screenshot-1-popup.png` i `store-assets/screenshot-2-options.png` - poglądowe,
wygenerowane automatycznie z przykładową treścią. Wystarczą na start, ale warto rozważyć
własne, bardziej "marketingowe" (np. w kontekście realnego Gmaila) przed publikacją.

## Pakiet do wgrania

`.\build-package.ps1` generuje `dist\tidora-task-extension.zip` - JEDEN plik, ten sam dla
Chrome Web Store i Firefox Add-ons (manifest.json deklaruje `background.service_worker` i
`background.scripts` naraz, każda przeglądarka bierze swoje). Zweryfikowany: rozpakowany na
nowo i wczytany jako "unpacked" ładuje się bez błędów.

## Co jeszcze zrobić przed publikacją (poza tym repo)

1. **[TU]** Założyć konto dewelopera Chrome Web Store (jednorazowa opłata 5 USD) i konto
   dewelopera Firefox Add-ons (bezpłatne).
2. **[TU]** Wgrać `dist/tidora-task-extension.zip` do Chrome Web Store, wypełnić formularz
   treściami z tego pliku, przejść recenzję (zwykle 1-3 dni).
3. **[TU]** Wgrać ten sam `dist/tidora-task-extension.zip` do AMO, przejść recenzję (bywa
   dłuższa niż Chrome, czasem tygodnie przy pierwszej publikacji nowego dodatku).
4. **[TU]** Scommitować i wdrożyć zmianę w `tidora.pl/polityka-prywatnosci.html` (nowa
   sekcja 5) na żywą stronę - dopóki nie jest opublikowana, link z listingu prowadzi do
   nieistniejącej treści.
5. Rozważyć podniesienie jakości zrzutów ekranu przed publikacją (obecne są funkcjonalne
   i wygenerowane automatycznie, ale nie "dopracowane marketingowo") - ikony to już prawdziwy
   sygnet marki TIDORA Business.
