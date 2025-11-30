# Junelds webbplats

Kort statisk webbplats för Junelds — "Med hästen som partner".

Vad som lagts till i denna version:

- Enhetlig sidrubrik och slogan (`Junelds`, "Med hästen som partner").
- En återanvändbar modalkomponent (`components.js`) för visning av detaljer per tur.
- Modal-stilar och tillgänglighetsstöd i `styles.css`.
- En enkel media-mapp (`/media`) för bilder och videor samt instruktion i `media/README.md`.

Hur man använder media:

1. Lägg till bild- eller videofiler i mappen `media/`.
2. För automatiskt index måste du skapa en `media/index.json` vid byggtid eller lägga till en enkel serverlogik som exponerar filerna.
3. Sajten visar i nuläget en platsreservare i `index.html` där thumbnails kan ritas in.

Hur man använder modalen:

- I `index.html` finns knappar med klassen `open-modal` och attributet `data-tour` (t.ex. `data-tour="nyborjartur"`).
- `components.js` innehåller en kort datakarta för turer och logik för att öppna/stänga modalen.
- Du kan lägga till fler turtyper i `components.js` i objektet `tours`.

Språk: Svenska (sv)

Vill du att jag automatiskt genererar thumbnails eller en `media/index.json`-fil? Säg till så skapar jag ett enkelt skript för Windows PowerShell.