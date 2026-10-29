// Instellingen van de arcade. Pas hier de titel aan of voeg een nieuw spel toe.
window.ARCADE_CONFIG = {
  titel: "JESSY'S ARCADE",
  ondertitel: "33RD BIRTHDAY EDITION",

  // Gedeelde highscores via Supabase (zie README). Leeg laten = alleen records op het eigen apparaat.
  // De "publishable"/"anon" sleutel is bedoeld om openbaar in een website te staan.
  highscores: {
    url: "https://kykyxbophrwvvmmnvvwi.supabase.co",
    sleutel: "sb_publishable_OftpBLI-ocgGPqvAlmiJJA_4wauwZ39"
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
    },
    {
      id: "tv-meppen",
      naam: "TV MEPPEN",
      beschrijving: "Mep de ouwe beeldbuis helemaal aan gruzelementen",
      pad: "games/tv-meppen/index.html",
      kleur: "#ff8a3d",
      icoon: "📺",
      geenRecord: true  // geen score, gewoon meppen
    },
    {
      id: "voetbal",
      naam: "KOPBAL",
      beschrijving: "1 tegen 1 voetballen met grote hoofden, tegen de CPU of met z'n tweeën",
      pad: "games/voetbal/index.html",
      kleur: "#5fd35f",
      icoon: "⚽",
      geenRecord: true
    },
    {
      id: "gluren",
      naam: "STIEKEM GLUREN",
      beschrijving: "Kijk stiekem dank memes zonder dat Lisa het ziet",
      pad: "games/gluren/index.html",
      kleur: "#ff3ea5",
      icoon: "📱"
    },
    {
      id: "bartender",
      naam: "JESSY'S BAR",
      beschrijving: "Mix cocktails voor barman Jessy (met snor) en kijk hoe hij reageert",
      pad: "games/bartender/index.html",
      kleur: "#e53935",
      icoon: "🍸"
    }
  ]
};
