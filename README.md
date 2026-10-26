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
| Protein Catcher | Pijltjes / muis / vinger | Lopen |
| Bier Tapper | Omhoog / omlaag | Bar kiezen |
| Bier Tapper | Spatie / tik op een bar | Bier tappen |
| Jessy Breakout | Muis / vinger / pijltjes | Peddel bewegen |
| Jessy Breakout | Spatie / klik | Bal schieten |
| Whack-a-Jessy | Klik / tik, of QWE ASD ZXC | Meppen |
| Alle spellen | M / Esc | Geluid aan/uit / terug naar menu |

## Spellen

- **Flappy Koe**: vlieg een koe tussen de VIBECODE-pijpen door. Haal een bronzen, zilveren, gouden of platina koebel!
- **Gains Snake**: snake met Jessy als hoofd. Zijn staart groeit met potjes kwark, creatine en biertjes.
- **Protein Catcher**: vang kwark, creatine en halters, maar laat pizza en donuts vallen.
- **Bier Tapper**: tap biertjes voor dorstige gasten in Cafe Jessy, zonder glazen te breken.
- **Jessy Breakout**: Jessy's hoofd is de bal, de blokjes spellen VIBECODE. Met bonussen!
- **Whack-a-Jessy**: 30 seconden lang Jessy terug zijn hol in meppen. Niet de koe raken!

## Hoe het in elkaar zit

```
index.html              startscherm
css/style.css           opmaak van het startscherm
js/config.js            titel en de lijst met spellen
js/arcade.js            gedeelde hulpjes: records, geluid, tekst, schalen, hoofdlus
js/tekeningen.js        getekende kwark, creatine, bier, pizza, donut en halter
img/                    de gezichten van Jessy
js/menu.js              logica van het startscherm
games/<spel>/           elk spel in een eigen map
```

Er zijn geen frameworks of build-stappen nodig: het is gewone HTML, CSS en JavaScript.

## Een nieuw spel toevoegen

1. Maak een map `games/mijn-spel/` met daarin een `index.html`.
2. Laad `../../js/arcade.js` in je spel. Dan kun je `Arcade.lees(...)`, `Arcade.bewaar(...)`, `Arcade.toon(...)` en `Arcade.naarMenu()` gebruiken.
3. Voeg het spel toe aan de lijst `spellen` in `js/config.js` (of vervang een van de "binnenkort"-tegels).

Bewaar je record onder de sleutel `"<id>.record"`, dan toont het startscherm het automatisch.

## Moeilijkheid aanpassen

Bovenin `games/flappy-koe/game.js` staan de spelregels, zoals zwaartekracht, sprongkracht en de afstand tussen de pijpen.
