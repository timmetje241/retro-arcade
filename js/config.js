// Instellingen van de arcade. Pas hier de titel aan of voeg een nieuw spel toe.
window.ARCADE_CONFIG = {
  titel: "JESSY'S ARCADE",
  ondertitel: "33RD BIRTHDAY EDITION",

  // Gedeelde highscores via Supabase (zie README). Leeg laten = alleen records op het eigen apparaat.
  // De "publishable"/"anon" sleutel is bedoeld om openbaar in een website te staan.
  highscores: {
    url: "",
    sleutel: ""
  },

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
      id: "protein-catcher",
      naam: "PROTEIN CATCHER",
      beschrijving: "Vang kwark en creatine, ontwijk pizza en donuts",
      pad: "games/protein-catcher/index.html",
      kleur: "#3ef0ff",
      icoon: "💪"
    },
    {
      id: "tapper",
      naam: "BIER TAPPER",
      beschrijving: "Tap biertjes voor dorstige gasten in Cafe Jessy",
      pad: "games/tapper/index.html",
      kleur: "#f2a900",
      icoon: "🍺"
    },
    {
      id: "breakout",
      naam: "JESSY BREAKOUT",
      beschrijving: "Knal de VIBECODE-blokjes kapot met Jessy's hoofd",
      pad: "games/breakout/index.html",
      kleur: "#b06cff",
      icoon: "🧱"
    },
    {
      id: "whack",
      naam: "WHACK-A-JESSY",
      beschrijving: "Mep Jessy terug zijn hol in, maar niet de koe",
      pad: "games/whack/index.html",
      kleur: "#ff3e5a",
      icoon: "🔨"
    }
  ]
};
