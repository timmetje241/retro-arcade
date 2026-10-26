// Instellingen van de arcade. Pas hier de titel aan of voeg een nieuw spel toe.
window.ARCADE_CONFIG = {
  titel: "JESSY'S ARCADE",
  ondertitel: "33RD BIRTHDAY EDITION",

  // Elk spel krijgt een tegel in het startscherm.
  // pad: map van het spel (met daarin een index.html), of null voor "binnenkort".
  spellen: [
    {
      id: "flappy-koe",
      naam: "FLAPPY KOE",
      beschrijving: "Vlieg de koe tussen de pijpen door",
      pad: "games/flappy-koe/index.html",
      kleur: "#43b047",
      icoon: "🐄"
    },
    {
      id: "snake",
      naam: "GAINS SNAKE",
      beschrijving: "Eet kwark, creatine en bier en word steeds langer",
      pad: "games/snake/index.html",
      kleur: "#ff3ea5",
      icoon: "🐍"
    },
    {
      id: "binnenkort-2",
      naam: "???",
      beschrijving: "Binnenkort...",
      pad: null,
      kleur: "#555",
      icoon: "🔒"
    }
  ]
};
