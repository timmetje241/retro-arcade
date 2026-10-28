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
| Gains Snake | Pijltjes / WASD / vegen | Sturen |
| Protein Catcher | Pijltjes / muis / vinger | Lopen |
| Bier Tapper | Omhoog / omlaag | Bar kiezen |
| Bier Tapper | Spatie (alleen toetsenbord) | Bier tappen |
| Jessy Breakout | Muis / vinger / pijltjes | Peddel bewegen |
| Jessy Breakout | Spatie / klik | Bal schieten |
| Whack-a-Jessy | Klik / tik, of QWE ASD ZXC | Meppen |
| Alle spellen | Esc / pauzeknop (rechtsonder) | Pauzemenu: verder, geluid, muziek, opnieuw, naar menu |
| TV Meppen | Klik / tik, of spatie | Meppen |
| TV Meppen | 1 / 2 / 3 | Hamer, klomp of koe |
| Overal | M | Geluid aan/uit |
| Menu | H | Highscores bekijken |

## Spellen

- **Flappy Koe**: vlieg een koe tussen de VIBECODE-pijpen door. Haal een bronzen, zilveren, gouden of platina koebel!
- **Gains Snake**: snake met Jessy als hoofd. Zijn staart groeit met potjes kwark, creatine en biertjes.
- **Protein Catcher**: vang kwark (+1), creatine (+2) en halters (+3). Pizza en donuts kosten een hartje, 5 keer op rij iets goeds missen ook. Een biertje maakt je 5 seconden dronken (besturing omgedraaid) en elke 25 seconden is het CHEAT DAY. Combo's geven x2 en x3.
- **Bier Tapper**: tap bier voor de gasten in Cafe Jessy. Een biertje duwt een gast terug; daarna schuift hij het lege glas terug, dat je moet vangen. Studenten zijn snel, opa wil 3 bier en mam wil water (geen bier geven!). Soms fooi (+5), en elke 40 seconden HAPPY HOUR (punten x2).
- **Jessy Breakout**: Jessy's hoofd is de bal. Vijf levels (VIBECODE, PROOST, HAPPY 33, BOE BOE! en een eindbaas: een gigantisch Jessy-hoofd dat pizza's gooit). Creatineblokken moet je 2x raken, halters 3x, koeblokken zijn onbreekbaar. Pizza maakt je peddel klein. Daarna begint ronde 2, sneller.
- **Whack-a-Jessy**: 30 seconden meppen. Jessy +1, taaie Jessy met blauwe rand 2x meppen (+2), gouden Jessy +5, biertje +3 seconden, de koe -3 en mis-meppen -1. Combo's geven x2 en x3, de laatste 10 seconden is het FRENZY.

- **TV Meppen**: mep de ouwe beeldbuis met het koninklijk huis erop aan gruzelementen, met een hamer (1), klomp (2) of vallende koe (3). Geen score: gewoon meppen tot hij ontploft.

## Verrassingen

- Kom je in een spel voorbij de **33 punten**, dan krijg je confetti, een "boe" en "HAPPY 33RD JESSY!".
- Alle gezichten van Jessy dragen een **feesthoedje**.
- Op **31 oktober** (Jessy's verjaardag) regent het confetti op het startscherm.
- De **lichtkrant** op het startscherm telt af naar de verjaardag en toont de nieuwste scores en wereldrecords.
- Bij elke game over staat er een **plaagtekst** (de lijst staat in `js/arcade.js`, zoek op `PLAAG_`).

## Muziek

Op de achtergrond speelt een 8-bit versie van de "Polish cow" (`muziek/polish-cow-8bit.mp3`): *Gdzie jest biały węgorz? (Zejście)* van Cypis. De muziek loopt door als je van spel wisselt. Browsers starten geluid pas na de eerste klik of toets.

## Gedeelde highscores

Na een game over vraagt het spel om je naam als je score in de top 10 komt. Op `highscores.html` (of toets **H** in het menu) staat per spel de top 10 van iedereen.

De scores staan in een gratis [Supabase](https://supabase.com)-database. Zo zet je die aan:

1. Maak een gratis account en een nieuw project op supabase.com.
2. Open **SQL Editor**, plak de inhoud van `supabase/scores.sql` en klik op **Run**.
3. Ga naar **Project Settings → API** (of **API Keys**) en kopieer de **Project URL** en de **publishable/anon key**.
4. Vul die in bij `highscores` in `js/config.js`.

De anon/publishable sleutel is bedoeld om openbaar in een website te staan: hij kan alleen scores lezen en toevoegen, niet wijzigen of verwijderen. Gebruik nooit de **service_role/secret** sleutel. Valsspelen (een nep-score insturen) is wel mogelijk; voor een verjaardagsspel is dat prima.

Zonder instellingen werkt alles gewoon, alleen met records op het eigen apparaat.

## Hoe het in elkaar zit

```
index.html              startscherm
highscores.html         overzicht van de gedeelde highscores (js/scorebord.js)
supabase/scores.sql     de database-tabel voor de highscores
css/style.css           opmaak van het startscherm
js/config.js            titel en de lijst met spellen
js/arcade.js            gedeelde hulpjes: records, geluid, tekst, schalen, hoofdlus
js/tekeningen.js        getekende kwark, creatine, bier, pizza, donut en halter
img/                    de gezichten van Jessy
muziek/                 de 8-bit titelsong
js/menu.js              logica van het startscherm
games/<spel>/           elk spel in een eigen map
```

Er zijn geen frameworks of build-stappen nodig: het is gewone HTML, CSS en JavaScript.

## Na een wijziging

Draai na elke wijziging `python tools/nieuwe-versie.py`. Dat zet een nieuw versienummer achter de scripts, zodat bezoekers meteen de nieuwe versie krijgen in plaats van een oude uit hun browsergeheugen.

## Een nieuw spel toevoegen

1. Maak een map `games/mijn-spel/` met daarin een `index.html`.
2. Laad `../../js/arcade.js` in je spel. Dan kun je `Arcade.lees(...)`, `Arcade.bewaar(...)`, `Arcade.toon(...)` en `Arcade.naarMenu()` gebruiken.
3. Voeg het spel toe aan de lijst `spellen` in `js/config.js` (of vervang een van de "binnenkort"-tegels).

Bewaar je record onder de sleutel `"<id>.record"`, dan toont het startscherm het automatisch.

## Moeilijkheid aanpassen

Bovenin `games/flappy-koe/game.js` staan de spelregels, zoals zwaartekracht, sprongkracht en de afstand tussen de pijpen.
