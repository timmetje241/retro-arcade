# Jessy's Arcade (33rd birthday edition)

Een kleine retro spelhal in de browser, gemaakt als verjaardagscadeau. 🎂

## Spelen

**Simpelst:** dubbelklik op `index.html`. Het spel opent in je browser. Je hebt geen installatie of internet nodig (alleen het pixellettertype wordt online geladen; zonder internet zie je een ander lettertype).

**Via een lokale server** (handig tijdens het bouwen):

```bash
python -m http.server 8765
```

Ga daarna naar http://localhost:8765.

## Besturing

| Waar | Toets | Wat |
|------|-------|-----|
| Menu | Pijltjes / muis | Spel kiezen |
| Menu | Enter / klik | Spel starten |
| Flappy Koe | Spatie / klik / tik | Vliegen |
| Flappy Koe | M | Geluid aan/uit |
| Flappy Koe | Esc | Terug naar het menu |
| Gains Snake | Pijltjes / WASD / vegen | Sturen |
| Gains Snake | P | Pauze |

## Spellen

- **Flappy Koe**: vlieg een koe tussen de VIBECODE-pijpen door. Haal een bronzen, zilveren, gouden of platina koebel!
- **Gains Snake**: snake met Jessy als hoofd. Zijn staart groeit met potjes kwark, creatine en biertjes.

## Hoe het in elkaar zit

```
index.html              startscherm
css/style.css           opmaak van het startscherm
js/config.js            titel en de lijst met spellen
js/arcade.js            gedeelde hulpjes: records, geluid, terug naar menu
js/menu.js              logica van het startscherm
games/flappy-koe/       het spel Flappy Koe
```

Er zijn geen frameworks of build-stappen nodig: het is gewone HTML, CSS en JavaScript.

## Een nieuw spel toevoegen

1. Maak een map `games/mijn-spel/` met daarin een `index.html`.
2. Laad `../../js/arcade.js` in je spel. Dan kun je `Arcade.lees(...)`, `Arcade.bewaar(...)`, `Arcade.toon(...)` en `Arcade.naarMenu()` gebruiken.
3. Voeg het spel toe aan de lijst `spellen` in `js/config.js` (of vervang een van de "binnenkort"-tegels).

Bewaar je record onder de sleutel `"<id>.record"`, dan toont het startscherm het automatisch.

## Moeilijkheid aanpassen

Bovenin `games/flappy-koe/game.js` staan de spelregels, zoals zwaartekracht, sprongkracht en de afstand tussen de pijpen.
