// Slokken Derby: een Japanse paardenrace (met commentator!) waarop je inzet met slokken bier.
// Geen highscore: dit is een spel voor met z'n allen op de bank.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);
  const SPELERS_SLEUTEL = "derby.spelers";

  function plaatje(pad) {
    const img = new Image();
    img.src = "../../img/" + pad;
    return img;
  }
  const jessy = Arcade.gezichten()[Math.floor(Math.random() * 5)];
  const maten = [1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5).slice(0, 2).map((n) => plaatje(`maten/maat-${n}.png`));

  // --- De baan ---
  const LENGTE = 3000;             // eenheden = meters
  const SCHAAL = 6;                // pixels per eenheid
  const BAAN_Y = 186;              // bovenste baan
  const BAAN_H = 44;
  const MAX_SPELERS = 8;
  const MAX_INZET = 10;

  // --- De 8 deelnemers (afgesteld met duizenden nagespeelde races, zodat iedereen een kans maakt).
  // snel = topsnelheid, acc = optrekken, moe = vermoeidheid na 'uithoud' van de race,
  // chaos = hoe wisselvallig, en elk heeft een eigen streek. ---
  const KARAKTERS = [
    {
      naam: "JESSY 33", jp: "ジェシー", kleur: "#ff3ea5", vacht: "#8d5524", gezicht: jessy,
      tekst: ["DE JARIGE (31 OKTOBER)", "FEESTJE = TURBO"],
      snel: 34.94, acc: 1.6, moe: 0.12, uithoud: 0.6, chaos: 0.25,
      streek(p, race, rng, dt) {
        if (rng() < 0.03 * dt) actie(p, "turbo", 1.6, "🎉", "FEESTJE! JESSY GAAT LOS", "パーティー！");
      }
    },
    {
      naam: "LISA", jp: "リサ", kleur: "#5c6bc0", vacht: "#3e2723", gezicht: plaatje("lisa.png"),
      tekst: ["ALTIJD STABIEL", "KIJKT SOMS OM NAAR JESSY"],
      snel: 36.6, acc: 1.8, moe: 0.08, uithoud: 0.7, chaos: 0.08,
      streek(p, race, rng, dt) {
        if (rng() < 0.03 * dt) actie(p, "stop", 0.7, "👀", "LISA KIJKT OM: ZIT JESSY WEER OP ZIJN TELEFOON?", "リサが振り向いた！");
      }
    },
    {
      naam: "POOLSE KOE", jp: "ポーランドのウシ", kleur: "#fafafa", koe: true, icoon: "🐄",
      tekst: ["GEEN PAARD. WEL SNEL?", "BOE! OF KOEIENRAKET"],
      snel: 36.16, acc: 1.2, moe: 0.05, uithoud: 0.5, chaos: 0.45,
      streek(p, race, rng, dt) {
        if (rng() < 0.07 * dt) actie(p, "stop", 0.8, "💬", "DE KOE ZEGT BOE EN STAAT STIL", "モー！");
        else if (rng() < 0.035 * dt) actie(p, "turbo", 2.5, "🚀", "KOEIENRAKET!!!", "ロケットウシ！");
      }
    },
    {
      naam: "KWARK KAREL", jp: "カレル", kleur: "#3ef0ff", vacht: "#c68e4e", gezicht: maten[0],
      tekst: ["TRAAG BEGIN, MAAR", "STERKE EINDSPURT"],
      snel: 34.32, acc: 1.1, moe: -0.3, uithoud: 0.5, chaos: 0.15,
      streek() {}
    },
    {
      naam: "BIERBUIK BERT", jp: "ベルト", kleur: "#f2a900", vacht: "#6d4c41", gezicht: maten[1],
      tekst: ["KOMT LANGZAAM OP GANG", "BOERT ZICH NAAR VOREN"],
      snel: 34.78, acc: 0.7, moe: 0.1, uithoud: 0.6, chaos: 0.2,
      streek(p, race, rng, dt) {
        if (rng() < 0.05 * dt) actie(p, "turbo", 1.2, "💨", "BERT LAAT EEN BOER EN SCHIET NAAR VOREN", "ゲップ！");
      }
    },
    {
      naam: "VIBECODER 3000", jp: "バイブコーダー", kleur: "#5fd35f", vacht: "#455a64", icoon: "🤖",
      tekst: ["ONVOORSPELBAAR", "GLITCHT DOOR DE BAAN"],
      snel: 34.69, acc: 1.5, moe: 0.1, uithoud: 0.6, chaos: 0.3,
      streek(p, race, rng, dt) {
        if (rng() < 0.08 * dt) {
          const sprong = (rng() - 0.42) * 90;
          p.x = Math.max(0, p.x + sprong);
          p.glitch = 0.5;
          if (race.zeg) race.zeg(sprong > 0 ? "GLITCH! DE VIBECODER TELEPORTEERT NAAR VOREN" : "BUG! DE VIBECODER SPRINGT TERUG", "バグです！", p);
        }
      }
    },
    {
      naam: "BEERTJE (4)", jp: "ベールチェ", kleur: "#ffb74d", vacht: "#ffe0b2", icoon: "🧸", klein: true,
      tekst: ["PONY. SUPERSNEL WEG", "PLUKT GRAAG BLOEMETJES"],
      snel: 37.88, acc: 3, moe: 0.15, uithoud: 0.4, chaos: 0.3,
      streek(p, race, rng, dt) {
        if (rng() < 0.045 * dt) actie(p, "stop", 1.1, "🌼", "BEERTJE STOPT OM EEN BLOEMETJE TE PLUKKEN", "お花！");
      }
    },
    {
      naam: "ZIJNE MAJESTEIT", jp: "陛下", kleur: "#b06cff", vacht: "#fafafa", icoon: "🤴",
      tekst: ["SNELLE START, SNEL MOE", "ZWAAIT NAAR HET VOLK"],
      snel: 40.93, acc: 1.5, moe: 0.42, uithoud: 0.45, chaos: 0.15,
      streek(p, race, rng, dt) {
        if (rng() < 0.05 * dt) actie(p, "stop", 1, "👋", "ZIJNE MAJESTEIT ZWAAIT NAAR HET VOLK. NIEMAND ZWAAIT TERUG", "陛下が手を振る");
        else if (rng() < 0.012 * dt) actie(p, "slip", 2, "💥", "DE MAJESTEIT VALT VAN ZIJN TROON!", "落ちた！");
      }
    }
  ];

  // Iets laten gebeuren met een paard (en het melden als er gekeken wordt)
  let huidigeRace = null;
  function actie(p, soort, duur, icoon, nl, jp) {
    p[soort] = Math.max(p[soort], duur);
    p.icoon = icoon;
    p.icoonTijd = Math.max(duur, 1.2);
    if (huidigeRace && huidigeRace.zeg) huidigeRace.zeg(nl, jp, p);
  }

  // --- Gebeurtenissen tijdens de race ---
  const EVENTS = [
    { id: "banaan", doe(race, rng) {
      const p = willekeurigPaard(race, rng);
      actie(p, "slip", 1.6, "🍌", `BANAAN OP DE BAAN! ${p.k.naam} GLIJDT UIT`, "バナナです！");
      race.slokken.push({ paard: p.i, n: 1, reden: "BANAAN" });
    } },
    { id: "bier", doe(race, rng) {
      const p = willekeurigPaard(race, rng);
      actie(p, "stop", 1, "🍺", `${p.k.naam} STOPT VOOR EEN BIERTJE...`, "ビール休憩！");
      p.naStop = 2.2;
      race.slokken.push({ paard: p.i, n: 1, reden: "DRINKT MEE" });
    } },
    { id: "regen", doe(race) {
      race.effect.regen = 3.5;
      if (race.zeg) race.zeg("PLOTSELINGE REGENBUI! IEDEREEN GLIBBERT", "雨です！");
    } },
    { id: "wind", doe(race) {
      race.effect.wind = 3;
      if (race.zeg) race.zeg("RUGWIND! ZE VLIEGEN OVER DE BAAN", "追い風！");
    } },
    { id: "duif", doe(race, rng) {
      const p = willekeurigPaard(race, rng);
      actie(p, "stop", 0.8, "🐦", `EEN DUIF! ${p.k.naam} SCHRIKT ZICH ROT`, "ハトだ！");
    } },
    { id: "proteine", doe(race, rng) {
      const p = willekeurigPaard(race, rng);
      actie(p, "turbo", 2.5, "💪", `PROTEINESHAKE VOOR ${p.k.naam}! GAINS!`, "プロテイン！");
    } },
    { id: "bug", doe(race, rng) {
      const a = willekeurigPaard(race, rng);
      let b = willekeurigPaard(race, rng);
      if (a === b) b = race.paarden[(a.i + 3) % 8];
      if (b.klaar !== null) return;
      [a.x, b.x] = [b.x, a.x];
      a.glitch = b.glitch = 0.8;
      if (race.zeg) race.zeg(`VIBECODE BUG: ${a.k.naam} EN ${b.k.naam} WISSELEN VAN PLEK!`, "なんということでしょう！");
    } },
    { id: "oversteek", doe(race) {
      race.effect.oversteek = 1.3;
      if (race.zeg) race.zeg("ER STEEKT EEN KOE OVER! IEDEREEN REMT", "ウシが横断中！");
    } },
    { id: "proost", doe(race) {
      race.slokken.push({ paard: "alle", n: 1, reden: "PROOST-PAUZE" });
      if (race.zeg) race.zeg("PROOST-PAUZE! IEDEREEN NEEMT 1 SLOK", "乾杯！");
    } }
  ];

  function willekeurigPaard(race, rng) {
    const kandidaten = race.paarden.filter((p) => p.klaar === null);
    return kandidaten[Math.floor(rng() * kandidaten.length)] || race.paarden[0];
  }

  // --- De race zelf: werkt zonder tekenen, zodat we de kansen vooraf kunnen uitrekenen ---
  function maakRace(rng, zeg) {
    const race = {
      t: 0, zeg, slokken: [], volgorde: [], effect: { regen: 0, wind: 0, oversteek: 0 },
      paarden: KARAKTERS.map((k, i) => ({ i, k, x: 0, v: 0, vorm: 0, stop: 0, turbo: 0, slip: 0, glitch: 0, naStop: 0, klaar: null, icoon: "", icoonTijd: 0, fase: rng() * 6 })),
      events: []
    };
    const soorten = [...EVENTS].sort(() => rng() - 0.5);
    // Elk soort gebeurtenis hooguit één keer, verspreid over de hele race (ruim 80 seconden)
    const aantal = 7 + Math.floor(rng() * 3);
    for (let i = 0; i < aantal; i++) race.events.push({ tijd: 5 + i * (72 / aantal) + rng() * 4, soort: soorten[i % soorten.length] });
    return race;
  }

  function stapRace(race, dt, rng) {
    huidigeRace = race;
    race.t += dt;
    for (const e of race.events) {
      if (!e.gedaan && race.t >= e.tijd) { e.gedaan = true; e.soort.doe(race, rng); }
    }
    for (const sleutel in race.effect) race.effect[sleutel] = Math.max(0, race.effect[sleutel] - dt);
    for (const p of race.paarden) {
      const k = p.k;
      p.fase += dt * (4 + p.v * 0.35);
      p.icoonTijd = Math.max(0, p.icoonTijd - dt);
      p.glitch = Math.max(0, p.glitch - dt);
      if (p.klaar !== null) {
        // Uitlopen na de finish
        p.v *= 1 - dt * 0.8;
        p.x += p.v * dt;
        continue;
      }
      k.streek(p, race, rng, dt);
      const voortgang = p.x / LENGTE;
      p.vorm = Math.max(-0.12, Math.min(0.12, p.vorm * (1 - dt * 0.4) + (rng() - 0.5) * k.chaos * dt * 2));
      let doel = k.snel * (1 + p.vorm) * (1 - k.moe * Math.max(0, voortgang - k.uithoud));
      if (p.stop > 0) doel = 0;
      else if (p.slip > 0) doel *= 0.15;
      else if (p.turbo > 0) doel *= 1.55;
      if (race.effect.regen > 0) doel *= 0.75;
      if (race.effect.wind > 0) doel *= 1.12;
      if (race.effect.oversteek > 0) doel = 0;
      p.v += (doel - p.v) * Math.min(1, k.acc * dt * (p.stop > 0 || race.effect.oversteek > 0 ? 3 : 1));
      p.x += p.v * dt;
      const wasStop = p.stop > 0;
      p.stop = Math.max(0, p.stop - dt);
      p.turbo = Math.max(0, p.turbo - dt);
      p.slip = Math.max(0, p.slip - dt);
      if (wasStop && p.stop === 0 && p.naStop) {
        p.turbo = p.naStop;
        p.naStop = 0;
        p.icoon = "🚀";
        p.icoonTijd = 1.5;
        if (race.zeg) race.zeg(`...EN ${k.naam} GAAT ALS EEN RAKET!`, "はやい！", p);
      }
      if (p.x >= LENGTE) {
        p.klaar = race.t;
        race.volgorde.push(p.i);
      }
    }
  }

  // Kansen uitrekenen door de race 250 keer stiekem te laten lopen
  const MIN_ODDS = 1.5;
  const MAX_ODDS = 3;
  const KANSEN = (function () {
    const winst = new Array(8).fill(0);
    const N = 250;
    for (let n = 0; n < N; n++) {
      const race = maakRace(Math.random, null);
      while (!race.volgorde.length && race.t < 300) stapRace(race, 0.1, Math.random);
      winst[race.volgorde[0] ?? 0]++;
    }
    huidigeRace = null;
    // Eerlijke odds omrekenen naar 1,5x (favoriet) tot 3x (outsider), zodat niemand ineens 20 slokken uitdeelt
    const eerlijk = winst.map((w) => N / Math.max(1, w));
    const laag = Math.min(...eerlijk), hoog = Math.max(...eerlijk);
    return eerlijk.map((o) => Math.round((MIN_ODDS + (MAX_ODDS - MIN_ODDS) * (o - laag) / Math.max(0.001, hoog - laag)) * 10) / 10);
  })();

  // --- Spelers, met een eigen foto die alleen op dit apparaat blijft ---
  function nieuweSpeler(naam, foto = null) {
    const s = { naam, foto: null, img: null, paard: Math.floor(Math.random() * 8), inzet: 2, gedronken: 0, uitgedeeld: 0 };
    zetFoto(s, foto);
    return s;
  }
  function zetFoto(s, foto) {
    s.foto = foto;
    s.img = null;
    if (foto) {
      s.img = new Image();
      s.img.src = foto;
    }
  }
  let spelers = Arcade.lees(SPELERS_SLEUTEL, null);
  if (!Array.isArray(spelers) || !spelers.length) spelers = [Arcade.gebruikersnaam() || "SPELER 1"];
  // Eerder werden alleen namen bewaard, nu naam + foto
  spelers = spelers.slice(0, MAX_SPELERS).map((x) => (typeof x === "string" ? nieuweSpeler(x) : nieuweSpeler(x.naam, x.foto)));

  function bewaarSpelers() {
    Arcade.bewaar(SPELERS_SLEUTEL, spelers.map((s) => ({ naam: s.naam, foto: s.foto })));
  }

  // Foto kiezen of maken (op een telefoon met de camera), verkleind tot een vierkantje van 128 pixels
  const fotoKiezer = document.createElement("input");
  fotoKiezer.type = "file";
  fotoKiezer.accept = "image/*";
  fotoKiezer.style.display = "none";
  document.body.appendChild(fotoKiezer);
  let fotoVoor = null;
  function kiesFoto(s) {
    fotoVoor = s;
    fotoKiezer.value = "";
    fotoKiezer.click();
  }
  fotoKiezer.addEventListener("change", () => {
    const bestand = fotoKiezer.files && fotoKiezer.files[0];
    const s = fotoVoor;
    if (!bestand || !s) return;
    const adres = URL.createObjectURL(bestand);
    const img = new Image();
    img.onload = () => {
      const maat = 128;
      const doek = document.createElement("canvas");
      doek.width = doek.height = maat;
      const kant = Math.min(img.width, img.height);
      doek.getContext("2d").drawImage(img, (img.width - kant) / 2, (img.height - kant) / 2, kant, kant, 0, 0, maat, maat);
      URL.revokeObjectURL(adres);
      zetFoto(s, doek.toDataURL("image/jpeg", 0.8));
      bewaarSpelers();
    };
    img.src = adres;
  });
  function vraagNaam(huidig) {
    const naam = window.prompt("Naam van de speler (leeg = verwijderen):", huidig || "");
    if (naam === null) return null;
    return naam.trim().toUpperCase().slice(0, 10);
  }

  // --- Geluid en de Japanse commentator ---
  function zegJapans(jp) {
    if (Arcade.isStil() || !window.speechSynthesis || !jp) return;
    const u = new SpeechSynthesisUtterance(jp);
    u.lang = "ja-JP";
    u.rate = 1.25;
    u.pitch = 1.3;
    const stem = speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith("ja"));
    if (stem) u.voice = stem;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // De fanfare voor de start, zoals bij de Japanse races
  function fanfare() {
    const noten = [[523, 0, 0.15], [659, 0.16, 0.15], [784, 0.32, 0.15], [1047, 0.48, 0.45], [784, 0.95, 0.15], [1047, 1.12, 0.8]];
    noten.forEach(([f, w, d]) => {
      Arcade.toon({ type: "sawtooth", van: f, duur: d, volume: 0.07, vertraging: w, filter: 2500 });
      Arcade.toon({ type: "square", van: f / 2, duur: d, volume: 0.04, vertraging: w });
    });
  }

  // --- Japanse racemuziek: taiko, een shamisen-achtig tokkeltje en een melodie in de Japanse yo-toonladder ---
  Arcade.geenMuziekHier(); // de Polish cow even uit, anders loopt het door elkaar
  const YO = [293.66, 329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0];
  const TEL = 60 / 160 / 2;                // achtste noten op 160 bpm
  // 32 achtsten (4 maten), -1 = rust
  const MELODIE = [5, -1, 5, 6, 7, -1, 6, 5, 4, -1, 5, -1, 3, -1, -1, -1,
    5, -1, 5, 6, 7, -1, 8, 7, 6, 5, 4, -1, 5, -1, -1, -1];
  const TWEEDE = [7, 8, 7, 6, 5, -1, 4, 5, 6, -1, 5, 4, 3, -1, 2, -1,
    3, 4, 5, -1, 6, 5, 4, 3, 2, -1, 3, -1, 0, -1, -1, -1];
  const BAS = [0, 0, 3, 0, 2, 2, 4, 2];
  let muziekTel = 0, muziekKlok = 0;

  function muziekAan() {
    return toestand === "race" && !Arcade.isStil() && !Arcade.isMuziekUit() && !document.hidden;
  }

  function speelTel(tel, wacht) {
    const stuk = Math.floor(tel / 32) % 2 ? TWEEDE : MELODIE;
    const noot = stuk[tel % 32];
    const sneller = race && race.volgorde.length === 0 && race.paarden.some((p) => p.x > LENGTE * 0.85);
    // Melodie: fluit (sinus) met een felle shamisen-tokkel eronder
    if (noot >= 0) {
      Arcade.toon({ type: "triangle", van: YO[noot] * 2, duur: TEL * 1.6, volume: 0.13, vertraging: wacht });
      Arcade.toon({ type: "square", van: YO[noot], naar: YO[noot] * 0.98, duur: 0.07, volume: 0.07, vertraging: wacht, filter: 2200 });
    }
    // Bas op de tellen
    if (tel % 2 === 0) Arcade.toon({ type: "sawtooth", van: YO[BAS[(tel / 2) % 8]] / 2, duur: TEL * 1.2, volume: 0.07, vertraging: wacht, filter: 600 });
    // Taiko: dong op 1 en 3, tikjes ertussen; in de laatste rechte lijn dubbel zo druk
    if (tel % 8 === 0 || tel % 8 === 3 || (sneller && tel % 2 === 0)) {
      Arcade.toon({ type: "sine", van: 120, naar: 50, duur: 0.25, volume: 0.3, vertraging: wacht });
    } else if (tel % 4 === 2) {
      Arcade.toon({ type: "square", van: 900, naar: 600, duur: 0.03, volume: 0.05, vertraging: wacht });
    }
  }

  function muziek(dt) {
    if (!muziekAan()) { muziekKlok = 0; return; }
    muziekKlok -= dt;
    // Een klein stukje vooruit inplannen, zodat het strak in de maat blijft
    while (muziekKlok < 0.15) {
      speelTel(muziekTel, Math.max(0, muziekKlok));
      muziekTel++;
      muziekKlok += TEL;
    }
  }

  function hoefjes() {
    Arcade.ruis({ duur: 0.03, volume: 0.03 });
  }

  // --- Toestand ---
  let toestand = "inzet";   // inzet, race, uitslag
  let race = null, rng = Math.random, aftellen = 0, tijd = 0, camX = 0, tijdSchaal = 1, fotofinish = false;
  let banner = null, uitslag = null, zones = [], muis = { x: -1, y: -1 }, leiderVorige = -1, laatsteCommentaar = 0;
  let regenDruppels = [], hoefKlok = 0, laatsteRechte = false, afgelopenSinds = 0, stof = [];

  function melding(nl, jp, paard) {
    banner = { nl, jp, t: 0 };
    zegJapans(jp);
    if (paard) paard.flits = 0.6;
  }

  function startRace() {
    bewaarSpelers();
    race = maakRace(rng, melding);
    stof = [];
    toestand = "race";
    aftellen = 3.2;
    camX = -100;
    tijdSchaal = 1;
    fotofinish = false;
    leiderVorige = -1;
    laatsteRechte = false;
    afgelopenSinds = 0;
    banner = { nl: "DE JESSY CUP OVER 3000 METER. DE PAARDEN STAAN KLAAR...", jp: "まもなくスタートです", t: 0 };
    fanfare();
    setTimeout(() => zegJapans("各馬、ゲートイン完了"), 1600);
  }

  function rondAf() {
    toestand = "uitslag";
    const volgorde = [...race.volgorde];
    race.paarden.filter((p) => !volgorde.includes(p.i)).sort((a, b) => b.x - a.x).forEach((p) => volgorde.push(p.i));
    const winnaar = volgorde[0];
    const tweede = volgorde[1];
    const regels = spelers.map((s) => {
      let drinken = 0, uitdelen = 0;
      const redenen = [];
      if (s.paard === winnaar) {
        uitdelen = Math.round(s.inzet * KANSEN[winnaar]);
        redenen.push("GEWONNEN!");
      } else if (s.paard === tweede) {
        redenen.push("2E: GERED");
      } else {
        drinken += s.inzet;
        redenen.push("VERLOREN");
      }
      for (const sl of race.slokken) {
        if (sl.paard === "alle" || sl.paard === s.paard) { drinken += sl.n; redenen.push(sl.reden + " +" + sl.n); }
      }
      if (winnaar === 0) { drinken += 1; redenen.push("PROOST OP DE JARIGE +1"); }
      s.gedronken += drinken;
      s.uitgedeeld += uitdelen;
      return { s, drinken, uitdelen, redenen };
    });
    uitslag = { volgorde, regels, tijden: race.paarden.map((p) => p.klaar) };
    Arcade.confetti(winnaar === 0 ? 200 : 80);
    if (winnaar === 0) Arcade.spandoek("JESSY WINT OP ZIJN VERJAARDAG!");
    zegJapans(`${KARAKTERS[winnaar].jp}、優勝！`);
  }

  // --- Bijwerken ---
  function update(dt) {
    tijd += dt;
    if (banner) banner.t += dt;
    if (toestand !== "race") return;
    if (aftellen > 0) {
      const voor = Math.ceil(aftellen);
      aftellen -= dt;
      if (Math.ceil(aftellen) !== voor && aftellen > 0) Arcade.toon({ type: "square", van: 440, duur: 0.15, volume: 0.1 });
      if (aftellen <= 0) {
        Arcade.toon({ type: "square", van: 880, duur: 0.4, volume: 0.12 });
        melding("EN ZE ZIJN VERTROKKEN!", "スタートしました！");
        muziekTel = 0;
        muziekKlok = 0.3;
      }
      return;
    }
    // Fotofinish: twee paarden vlak bij elkaar vlak voor de streep = slow motion
    const opBaan = race.paarden.filter((p) => p.klaar === null).sort((a, b) => b.x - a.x);
    if (!race.volgorde.length && opBaan.length > 1 && opBaan[0].x > LENGTE - 45 && opBaan[0].x - opBaan[1].x < 10) {
      if (!fotofinish) { fotofinish = true; melding("HET WORDT EEN FOTOFINISH!", "写真判定です！"); }
      tijdSchaal = 0.3;
    } else tijdSchaal = race.volgorde.length ? 1 : Math.min(1, tijdSchaal + dt);
    const stap = dt * tijdSchaal;
    stapRace(race, stap, rng);
    muziek(dt);

    // Commentaar bij een nieuwe leider (niet te vaak)
    const leider = [...race.paarden].sort((a, b) => b.x - a.x)[0];
    if (!race.volgorde.length && leider.i !== leiderVorige && tijd - laatsteCommentaar > 3.5 && race.t > 3) {
      leiderVorige = leider.i;
      laatsteCommentaar = tijd;
      if (!banner || banner.t > 1.5) melding(`${leider.k.naam} NEEMT DE LEIDING!`, `トップは${leider.k.jp}！`);
    }
    if (!race.halverwege && leider.x > LENGTE * 0.5) {
      race.halverwege = true;
      melding(`HALVERWEGE! ${leider.k.naam} LIGT VOOROP`, "折り返し地点です！");
    }
    if (!laatsteRechte && leider.x > LENGTE * 0.85) {
      laatsteRechte = true;
      melding("DE LAATSTE RECHTE LIJN! WIE HOUDT HET VOL?", "最後の直線です！");
    }
    if (race.volgorde.length === 1 && !race.winnaarGemeld) {
      race.winnaarGemeld = true;
      const w = KARAKTERS[race.volgorde[0]];
      melding(`FINISH! ${w.naam} WINT DE JESSY CUP!`, `ゴール！${w.jp}！`);
      Arcade.toon({ type: "square", van: 660, naar: 1320, duur: 0.4, volume: 0.1 });
    }
    if (race.volgorde.length) {
      afgelopenSinds += dt;
      if (race.volgorde.length === 8 || afgelopenSinds > 6) rondAf();
    }
    // Hoefgetrappel
    hoefKlok -= dt;
    if (hoefKlok <= 0) { hoefjes(); hoefKlok = 0.09; }
    // Camera volgt de leider
    const doel = Math.max(-100, Math.min(LENGTE * SCHAAL - W + 160, leider.x * SCHAAL - W * 0.62));
    camX += (doel - camX) * Math.min(1, dt * 4);
    race.paarden.forEach((p) => { p.flits = Math.max(0, (p.flits || 0) - dt); });
    // Stofwolkjes achter rennende paarden
    race.paarden.forEach((p) => {
      if (p.v > 12 && Math.random() < dt * 14) {
        stof.push({ x: p.x * SCHAAL + 10, y: BAAN_Y + p.i * BAAN_H + 36, t: 0, max: 0.5 + Math.random() * 0.4, r: 3 + Math.random() * 3 });
      }
    });
    stof.forEach((d) => { d.t += dt; d.y -= dt * 8; });
    stof = stof.filter((d) => d.t < d.max);
    // Regen
    if (race.effect.regen > 0) for (let i = 0; i < 6; i++) regenDruppels.push({ x: Math.random() * W, y: -10, v: 600 + Math.random() * 300 });
    regenDruppels.forEach((d) => { d.y += d.v * dt; d.x -= 80 * dt; });
    regenDruppels = regenDruppels.filter((d) => d.y < H);
  }

  // --- Besturing ---
  function punt(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = punt(e);
    const zone = zones.find((z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
    if (zone && !zone.bijKlik) {
      zone.doe();
      Arcade.toon({ type: "square", van: 700, naar: 900, duur: 0.05, volume: 0.05 });
    }
  });
  // Een fotovenster mag de browser alleen openen bij een echte klik
  canvas.addEventListener("click", (e) => {
    const p = punt(e);
    const zone = zones.find((z) => z.bijKlik && p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
    if (zone) zone.doe();
  });
  canvas.addEventListener("pointermove", (e) => {
    muis = punt(e);
    canvas.style.cursor = zones.some((z) => muis.x >= z.x && muis.x <= z.x + z.w && muis.y >= z.y && muis.y <= z.y + z.h) ? "pointer" : "default";
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      if (e.repeat) return;
      if (toestand === "inzet") startRace();
      else if (toestand === "uitslag") toestand = "inzet";
    } else if (e.code === "KeyM") Arcade.zetStil(!Arcade.isStil());
  });

  // --- Tekenen: algemene hulpjes ---
  // Kleur lichter (f > 0) of donkerder (f < 0) maken
  function tint(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const doel = f > 0 ? 255 : 0, k = Math.abs(f);
    const kanaal = (v) => Math.round(v + (doel - v) * k);
    return `rgb(${kanaal((n >> 16) & 255)},${kanaal((n >> 8) & 255)},${kanaal(n & 255)})`;
  }

  function knop(x, y, w, h, woord, doe, opties = {}) {
    const over = muis.x >= x && muis.x <= x + w && muis.y >= y && muis.y <= y + h;
    const kleur = over ? "#ff3ea5" : (opties.kleur || "#37474f");
    c.fillStyle = "rgba(0, 0, 0, 0.5)";
    c.beginPath();
    c.roundRect(x, y + 3, w, h, 7);
    c.fill();
    const verloop = c.createLinearGradient(0, y, 0, y + h);
    verloop.addColorStop(0, tint(kleur, 0.25));
    verloop.addColorStop(1, tint(kleur, -0.2));
    c.fillStyle = verloop;
    c.beginPath();
    c.roundRect(x, y, w, h, 7);
    c.fill();
    c.fillStyle = "rgba(255, 255, 255, 0.18)";
    c.fillRect(x + 4, y + 3, w - 8, Math.max(2, h * 0.25));
    tekst(woord, x + w / 2, y + h / 2 + 1, opties.grootte || 10, "#fff");
    zones.push({ x, y, w, h, doe, bijKlik: opties.bijKlik });
  }

  // Rond plaatje zonder feesthoedje (dat krijgt alleen Jessy)
  function rondPlaatje(img, x, y, r) {
    if (!img || !img.complete || !img.naturalWidth) return false;
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.clip();
    c.drawImage(img, x - r, y - r, r * 2, r * 2);
    c.restore();
    return true;
  }

  function gezicht(k, x, y, r) {
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(x, y, r + 2, 0, Math.PI * 2);
    c.fill();
    if (k.gezicht === jessy) Arcade.plaatje(c, k.gezicht, x, y, r);
    else if (k.gezicht) rondPlaatje(k.gezicht, x, y, r);
    else {
      c.fillStyle = k.kleur;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.font = `${Math.round(r * 1.3)}px serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(k.icoon, x, y + 1);
    }
  }

  // De foto van een speler, of een gekleurd rondje met de eerste letter
  const SPELER_KLEUREN = ["#ff3ea5", "#3ef0ff", "#ffe14d", "#5fd35f", "#ff9800", "#b06cff", "#ff5a5a", "#4fc3f7"];
  function spelerFoto(s, x, y, r) {
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(x, y, r + 2, 0, Math.PI * 2);
    c.fill();
    if (!rondPlaatje(s.img, x, y, r)) {
      c.fillStyle = SPELER_KLEUREN[spelers.indexOf(s) % SPELER_KLEUREN.length] || "#888";
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      tekst(s.naam.slice(0, 1) || "?", x, y + 1, Math.max(7, Math.round(r * 0.9)), "#fff");
    }
  }

  // Stadion bij avond, voor het inzet- en uitslagscherm
  function tekenAvond() {
    const lucht = c.createLinearGradient(0, 0, 0, H);
    lucht.addColorStop(0, "#0d1b3d");
    lucht.addColorStop(0.6, "#1c2f5e");
    lucht.addColorStop(1, "#0b0b1e");
    c.fillStyle = lucht;
    c.fillRect(0, 0, W, H);
    // Schijnwerpers
    [[120, -40], [W - 120, -40]].forEach(([lx, ly], i) => {
      const straal = c.createRadialGradient(lx, ly, 10, lx, ly, 520);
      straal.addColorStop(0, "rgba(255, 245, 200, 0.22)");
      straal.addColorStop(1, "rgba(255, 245, 200, 0)");
      c.fillStyle = straal;
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(lx + (i ? -520 : 120), H);
      c.lineTo(lx + (i ? -120 : 520), H);
      c.fill();
    });
    // Sterretjes
    c.fillStyle = "rgba(255, 255, 255, 0.6)";
    for (let i = 0; i < 40; i++) {
      const x = (i * 197) % W, y = (i * 83) % 200;
      if ((i + Math.floor(tijd * 2)) % 9) c.fillRect(x, y, 2, 2);
    }
  }

  function kaart(x, y, w, h, kleur, oplichten) {
    c.fillStyle = "rgba(0, 0, 0, 0.4)";
    c.beginPath();
    c.roundRect(x + 2, y + 4, w, h, 10);
    c.fill();
    const verloop = c.createLinearGradient(x, y, x + w, y + h);
    verloop.addColorStop(0, tint(kleur, -0.55));
    verloop.addColorStop(1, "rgba(20, 24, 48, 0.95)");
    c.fillStyle = verloop;
    c.beginPath();
    c.roundRect(x, y, w, h, 10);
    c.fill();
    c.strokeStyle = oplichten ? kleur : "rgba(255, 255, 255, 0.12)";
    c.lineWidth = oplichten ? 3 : 1;
    c.stroke();
  }

  // --- Inzetscherm ---
  function tekenInzet() {
    tekenAvond();
    tekst("SLOKKEN DERBY", W / 2, 32, 28, "#ffe14d");
    tekst("DE JESSY CUP  -  ZET IN MET SLOKKEN BIER", W / 2, 62, 9, "#ff9ec7");

    // De 8 deelnemers met hun odds en wie erop wedt
    KARAKTERS.forEach((k, i) => {
      const x = 16 + (i % 2) * 256, y = 80 + Math.floor(i / 2) * 112;
      const gekozen = spelers.filter((s) => s.paard === i);
      kaart(x, y, 246, 102, k.kleur, gekozen.length > 0);
      gezicht(k, x + 36, y + 36, 24);
      tekst((i + 1) + ". " + k.naam, x + 68, y + 18, 8, "#fff", "left");
      tekst(k.tekst[0], x + 68, y + 40, 6, "#c8c8d8", "left");
      tekst(k.tekst[1], x + 68, y + 54, 6, "#c8c8d8", "left");
      tekst(KANSEN[i].toFixed(1) + "X", x + 236, y + 84, 14, "#ffe14d", "right");
      gekozen.forEach((s, j) => spelerFoto(s, x + 20 + j * 20, y + 84, 8));
    });

    // Spelers
    const px = 536;
    tekst("SPELERS", px + 8, 94, 10, "#3ef0ff", "left");
    tekst("PAARD", px + 236, 94, 7, "#9aa");
    tekst("SLOKKEN", px + 352, 94, 7, "#9aa");
    spelers.forEach((s, i) => {
      const y = 108 + i * 50;
      const k = KARAKTERS[s.paard];
      kaart(px, y, 410, 44, k.kleur, false);
      // Foto: klik om er een te kiezen of te maken
      spelerFoto(s, px + 24, y + 22, 16);
      if (!s.foto) {
        c.font = "12px serif";
        c.textAlign = "center";
        c.fillText("📷", px + 36, y + 34);
      }
      zones.push({ x: px, y, w: 44, h: 44, doe: () => kiesFoto(s), bijKlik: true });
      // Naam: klik om te wijzigen of te verwijderen
      tekst(s.naam, px + 50, y + 16, 9, "#fff", "left");
      tekst(`DRONK ${s.gedronken}  DEELDE ${s.uitgedeeld}`, px + 50, y + 33, 6, "#9aa", "left");
      zones.push({ x: px + 46, y, w: 116, h: 44, doe: () => {
        const naam = vraagNaam(s.naam);
        if (naam === null) return;
        if (!naam) { if (spelers.length > 1) spelers.splice(spelers.indexOf(s), 1); }
        else s.naam = naam;
        bewaarSpelers();
      } });
      knop(px + 166, y + 8, 26, 28, "<", () => { s.paard = (s.paard + 7) % 8; });
      gezicht(k, px + 214, y + 22, 13);
      tekst(String(s.paard + 1), px + 242, y + 22, 10, k.kleur === "#fafafa" ? "#fff" : k.kleur);
      knop(px + 256, y + 8, 26, 28, ">", () => { s.paard = (s.paard + 1) % 8; });
      knop(px + 304, y + 8, 26, 28, "-", () => { s.inzet = Math.max(1, s.inzet - 1); });
      tekst(String(s.inzet), px + 352, y + 22, 12, "#ffe14d");
      knop(px + 374, y + 8, 26, 28, "+", () => { s.inzet = Math.min(MAX_INZET, s.inzet + 1); });
    });
    if (spelers.length < MAX_SPELERS) {
      knop(px, 108 + spelers.length * 50, 160, 36, "+ SPELER", () => {
        const naam = vraagNaam("");
        if (naam) { spelers.push(nieuweSpeler(naam)); bewaarSpelers(); }
      });
    }

    tekst("WINNEND PAARD: DEEL INZET X ODDS UIT", 20, 538, 7, "#5fd35f", "left");
    tekst("2E PLAATS: GERED  -  REST: DRINK JE INZET", 20, 556, 7, "#ff9ec7", "left");
    tekst("KLIK OP JE FOTO OF NAAM OM ZE TE WIJZIGEN  -  WATER MAG OOK", 20, 574, 6, "#9aa", "left");
    knop(700, 530, 240, 54, "START RACE!", startRace, { kleur: "#c62828", grootte: 14 });
  }

  // --- Race: lucht, tribune en baan ---
  const WOLKEN = [[80, 30, 1], [330, 55, 0.7], [560, 25, 1.2], [790, 50, 0.8], [1020, 35, 1]];

  function tekenLucht() {
    const lucht = c.createLinearGradient(0, 0, 0, 150);
    lucht.addColorStop(0, "#3d9be9");
    lucht.addColorStop(1, "#c4e8ff");
    c.fillStyle = lucht;
    c.fillRect(0, 0, W, 150);
    // Zon
    const zon = c.createRadialGradient(880, 34, 4, 880, 34, 70);
    zon.addColorStop(0, "rgba(255, 250, 210, 1)");
    zon.addColorStop(0.3, "rgba(255, 240, 160, 0.8)");
    zon.addColorStop(1, "rgba(255, 240, 160, 0)");
    c.fillStyle = zon;
    c.fillRect(800, 0, 160, 110);
    // Wolken drijven langzaam voorbij
    WOLKEN.forEach(([bx, by, s]) => {
      const x = ((bx - camX * 0.03 + tijd * 6) % (W + 240) + W + 240) % (W + 240) - 120;
      c.fillStyle = "rgba(255, 255, 255, 0.9)";
      [[0, 0, 22], [20, -8, 18], [40, 0, 20], [18, 6, 18]].forEach(([dx, dy, r]) => {
        c.beginPath();
        c.arc(x + dx * s, by + dy * s, r * s, 0, Math.PI * 2);
        c.fill();
      });
    });
    // De Fuji in de verte
    const berg = 520 - camX * 0.02;
    const bergKleur = c.createLinearGradient(0, 40, 0, 150);
    bergKleur.addColorStop(0, "#7d93c4");
    bergKleur.addColorStop(1, "#9fb4dc");
    c.fillStyle = bergKleur;
    c.beginPath();
    c.moveTo(berg - 200, 150); c.quadraticCurveTo(berg - 40, 60, berg - 18, 44); c.lineTo(berg + 18, 44); c.quadraticCurveTo(berg + 40, 60, berg + 200, 150);
    c.fill();
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(berg - 38, 66); c.lineTo(berg - 18, 44); c.lineTo(berg + 18, 44); c.lineTo(berg + 38, 66);
    c.lineTo(berg + 22, 62); c.lineTo(berg + 10, 70); c.lineTo(berg - 4, 60); c.lineTo(berg - 18, 68);
    c.fill();
    // Bomenrij
    const bomen = -camX * 0.25;
    for (let i = Math.floor(-bomen / 46) - 1; i < Math.floor((W - bomen) / 46) + 2; i++) {
      const x = bomen + i * 46;
      const h = 14 + ((i * 7919) % 10 + 10) % 10;
      c.fillStyle = (i % 2) ? "#2e6b34" : "#357a3b";
      c.beginPath();
      c.arc(x, 112 - h * 0.3, h, 0, Math.PI * 2);
      c.fill();
    }
  }

  function tekenTribune() {
    // Overkapping met pilaren
    const schuif = -camX * 0.5;
    c.fillStyle = "#6b7a8f";
    c.fillRect(0, 92, W, 58);
    c.fillStyle = "#3c4656";
    c.beginPath();
    c.moveTo(0, 78); c.lineTo(W, 78); c.lineTo(W, 92); c.lineTo(0, 92);
    c.fill();
    c.fillStyle = "#c62828";
    c.fillRect(0, 74, W, 5);
    // Publiek: hoofdjes in rijen, sommigen springen
    const huid = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac"];
    const shirts = ["#ff3e5a", "#ffe14d", "#3ef0ff", "#fff", "#5fd35f", "#ff9800", "#b06cff"];
    for (let rij = 0; rij < 3; rij++) {
      const off = ((schuif + rij * 6) % 12 + 12) % 12;
      for (let x = -12; x < W + 12; x += 12) {
        const n = Math.round((x + off - schuif) / 12) + rij * 5;
        const nn = ((n % 7) + 7) % 7;
        const spring = (n + Math.floor(tijd * 6)) % 7 === 0 ? -3 : 0;
        const by = 104 + rij * 15 + spring;
        c.fillStyle = shirts[nn];
        c.fillRect(x + off - 4, by + 3, 8, 7);
        c.fillStyle = huid[nn % 5];
        c.beginPath();
        c.arc(x + off, by, 4, 0, Math.PI * 2);
        c.fill();
      }
    }
    for (let i = Math.floor(-schuif / 160) - 1; i < Math.floor((W - schuif) / 160) + 2; i++) {
      c.fillStyle = "#2c3440";
      c.fillRect(schuif + i * 160, 79, 5, 71);
    }
    // Spandoeken
    const bord = -camX * 0.8;
    const doeken = ["ジェシー杯", "JESSY CUP 33", "競馬", "KWARK", "がんばれ！", "BOE"];
    const doek = c.createLinearGradient(0, 150, 0, 172);
    doek.addColorStop(0, "#d32f2f");
    doek.addColorStop(1, "#8e1a1a");
    c.fillStyle = doek;
    c.fillRect(0, 150, W, 22);
    for (let i = Math.floor(-bord / 200) - 1; i < Math.floor((W - bord) / 200) + 1; i++) {
      const woord = doeken[((i % doeken.length) + doeken.length) % doeken.length];
      c.font = "bold 14px sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#fff";
      c.fillText(woord, bord + i * 200 + 100, 162);
    }
  }

  // Groot scherm in het stadion: wie ligt er voorop?
  function tekenGrootScherm() {
    const leider = [...race.paarden].sort((a, b) => b.x - a.x)[0];
    const x = 740, y = 4, w = 210, h = 64;
    if (banner && banner.t < 4) return; // de commentator gaat voor
    c.fillStyle = "#111";
    c.beginPath();
    c.roundRect(x, y, w, h, 6);
    c.fill();
    c.fillStyle = "#08222f";
    c.fillRect(x + 5, y + 5, w - 10, h - 10);
    gezicht(leider.k, x + 34, y + 32, 20);
    tekst("1. " + leider.k.naam, x + 62, y + 22, 7, "#ffe14d", "left");
    tekst(race.t.toFixed(1) + " SEC", x + 62, y + 42, 7, "#3ef0ff", "left");
  }

  function tekenBaan() {
    // Gras met maaistroken die met de baan meeschuiven
    c.fillStyle = "#3f8f3a";
    c.fillRect(0, 172, W, H - 172);
    const strook = 80;
    for (let x = -((camX % (strook * 2)) + strook * 2) % (strook * 2) - strook * 2; x < W; x += strook * 2) {
      c.fillStyle = "rgba(255, 255, 255, 0.06)";
      c.fillRect(x, 180, strook, BAAN_Y + 8 * BAAN_H - 184);
    }
    // Lichte scheidslijntjes tussen de banen
    c.fillStyle = "rgba(255, 255, 255, 0.1)";
    for (let i = 1; i < 8; i++) c.fillRect(0, BAAN_Y + i * BAAN_H - 6, W, 1);
    // Bloemenperk onder het onderste hek
    const onder = BAAN_Y + 8 * BAAN_H;
    c.fillStyle = "#2f6e2c";
    c.fillRect(0, onder, W, H - onder);
    for (let x = -((camX % 24) + 24) % 24; x < W; x += 24) {
      const n = Math.round((x + camX) / 24);
      c.fillStyle = ["#ff5a7a", "#ffe14d", "#fff", "#b06cff"][((n % 4) + 4) % 4];
      c.beginPath();
      c.arc(x + 6, onder + 10 + (n % 2) * 5, 3, 0, Math.PI * 2);
      c.fill();
    }
    // Hekken boven en onder, met schaduw
    [176, onder - 4].forEach((y) => {
      c.fillStyle = "rgba(0, 0, 0, 0.18)";
      c.fillRect(0, y + 5, W, 4);
      for (let x = -((camX % 40) + 40) % 40; x < W; x += 40) {
        c.fillStyle = "#ddd";
        c.fillRect(x, y - 2, 3, 12);
      }
      c.fillStyle = "#fafafa";
      c.fillRect(0, y, W, 4);
    });
    // Afstandspalen (om de 100 eenheden = 200 meter), rood-wit
    for (let m = 0; m <= LENGTE; m += 200) {
      const x = m * SCHAAL - camX;
      if (x < -60 || x > W + 60) continue;
      if (m === LENGTE) continue;
      c.fillStyle = "rgba(255, 255, 255, 0.35)";
      c.fillRect(x - 1, 180, 2, onder - 184);
      for (let y = 140; y < 176; y += 8) {
        c.fillStyle = (y / 8) % 2 ? "#e53935" : "#fff";
        c.fillRect(x - 3, y, 6, 8);
      }
      const rest = LENGTE - m;
      c.fillStyle = "#fff";
      c.fillRect(x - 26, 128, 52, 14);
      c.font = `7px ${Arcade.FONT}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#c62828";
      c.fillText(m === 0 ? "START" : rest + "M", x, 136);
    }
    // Finish: dambordlijn en een grote paal met "goal"
    const fx = LENGTE * SCHAAL - camX;
    if (fx > -60 && fx < W + 60) {
      for (let y = 180; y < onder - 4; y += 10) {
        for (let k = 0; k < 2; k++) {
          c.fillStyle = (y / 10 + k) % 2 ? "#111" : "#fff";
          c.fillRect(fx - 5 + k * 5, y, 5, 10);
        }
      }
      c.fillStyle = "#ffe14d";
      c.fillRect(fx - 3, 104, 6, 76);
      c.beginPath();
      c.arc(fx, 100, 18, 0, Math.PI * 2);
      c.fill();
      c.font = "bold 12px sans-serif";
      c.fillStyle = "#c62828";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("ゴール", fx, 101);
    }
  }

  // --- Paarden ---
  // Eén been met een knie, in galop. Voorbenen buigen naar achteren, achterbenen naar voren.
  function been(hx, hy, fase, kleur, voor, rent) {
    const zwaai = rent ? Math.sin(fase) * 0.65 : 0.05;
    const buig = rent ? (voor ? Math.max(0, -Math.sin(fase + 0.9)) * 1.3 : -Math.max(0, Math.sin(fase + 0.9)) * 1.1) : 0;
    const kx = hx + Math.sin(zwaai) * 12, ky = hy + Math.cos(zwaai) * 12;
    const hoek = zwaai + buig;
    const vx = kx + Math.sin(hoek) * 13, vy = ky + Math.cos(hoek) * 13;
    c.strokeStyle = kleur;
    c.lineCap = "round";
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(kx, ky); c.lineTo(vx, vy); c.stroke();
    c.fillStyle = "#222";
    c.fillRect(vx - 3, vy - 1, 7, 4);
  }

  function tekenPaard(p, x, y) {
    const k = p.k;
    const s = k.klein ? 0.78 : 1;
    const rent = p.v > 3;
    const galop = rent ? Math.sin(p.fase * 2) * 2 : 0; // op en neer
    // Schaduw op het gras
    c.fillStyle = "rgba(0, 0, 0, 0.22)";
    c.beginPath();
    c.ellipse(x + 2, y + 26 * s, 34 * s, 5, 0, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.translate(x, y + galop);
    if (p.slip > 0) c.rotate(Math.sin(tijd * 18) * 0.35);
    c.scale(s, s);
    const vacht = k.koe ? "#f5f5f5" : k.vacht;
    const donker = k.koe ? "#cfcfcf" : tint(vacht, -0.35);
    // Achterste benen (verder weg, donkerder)
    been(-22, 4, p.fase + 1.6, donker, false, rent);
    been(18, 4, p.fase + 4.7, donker, true, rent);
    // Staart met losse haren
    c.strokeStyle = k.koe ? "#444" : tint(vacht, -0.6);
    c.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-30, -6);
      c.quadraticCurveTo(-44, -6 + Math.sin(tijd * 12 + i) * 5, -46 - i * 2, 8 + i * 3);
      c.stroke();
    }
    // Lijf met schaduw van boven naar onder
    const lijf = c.createLinearGradient(0, -16, 0, 14);
    lijf.addColorStop(0, tint(vacht, 0.25));
    lijf.addColorStop(1, tint(vacht, -0.25));
    c.fillStyle = lijf;
    c.beginPath();
    c.moveTo(-30, -6);
    c.bezierCurveTo(-20, -16, 10, -16, 22, -11);
    c.bezierCurveTo(31, -6, 32, 6, 24, 10);
    c.bezierCurveTo(10, 14, -16, 14, -26, 10);
    c.bezierCurveTo(-36, 6, -36, -2, -30, -6);
    c.fill();
    if (k.koe) {
      c.fillStyle = "#222";
      [[-16, -4, 7], [4, 4, 6], [14, -8, 5], [-24, 6, 4]].forEach(([vx, vy, r]) => { c.beginPath(); c.ellipse(vx, vy, r, r * 0.8, 0.4, 0, Math.PI * 2); c.fill(); });
      c.fillStyle = "#f8bbd0";
      c.beginPath(); c.ellipse(-6, 12, 6, 3, 0, 0, Math.PI * 2); c.fill(); // uier
    }
    // Hals
    c.fillStyle = lijf;
    c.beginPath();
    c.moveTo(12, -12);
    c.quadraticCurveTo(22, -30, 30, -40);
    c.lineTo(38, -36);
    c.quadraticCurveTo(32, -18, 28, 2);
    c.fill();
    // Hoofd
    c.fillStyle = k.koe ? "#f5f5f5" : tint(vacht, 0.1);
    c.beginPath();
    c.moveTo(30, -42);
    c.quadraticCurveTo(44, -40, 54, -30);
    c.quadraticCurveTo(55, -24, 49, -23);
    c.quadraticCurveTo(40, -24, 34, -28);
    c.fill();
    if (k.koe) {
      c.fillStyle = "#f8bbd0";
      c.beginPath(); c.ellipse(52, -26, 5, 4, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#e0d6c0"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(33, -43); c.quadraticCurveTo(30, -50, 34, -54); c.stroke();
    } else {
      // Oor, manen en hoofdstel
      c.fillStyle = tint(vacht, -0.2);
      c.beginPath(); c.moveTo(32, -42); c.lineTo(31, -50); c.lineTo(37, -43); c.fill();
      c.strokeStyle = tint(vacht, -0.6);
      c.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const mx = 13 + i * 4, my = -14 - i * 6;
        c.beginPath();
        c.moveTo(mx, my);
        c.lineTo(mx - 6 - Math.sin(tijd * 14 + i) * 2, my + 2);
        c.stroke();
      }
      c.strokeStyle = k.kleur;
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(36, -38); c.lineTo(44, -27); c.lineTo(52, -28); c.stroke();
    }
    c.fillStyle = "#111";
    c.beginPath(); c.arc(41, -35, 1.8, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(52, -27, 1.2, 0, Math.PI * 2); c.fill();
    // Voorste benen
    been(-18, 4, p.fase, vacht === "#fafafa" ? "#e8e8e8" : vacht, false, rent);
    been(22, 4, p.fase + 3.1, vacht === "#fafafa" ? "#e8e8e8" : vacht, true, rent);
    // Dekje met nummer en zadel
    c.fillStyle = k.kleur;
    c.beginPath();
    c.roundRect(-14, -16, 24, 15, 3);
    c.fill();
    c.font = `8px ${Arcade.FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = k.kleur === "#fafafa" || k.kleur === "#ffe14d" || k.kleur === "#3ef0ff" ? "#000" : "#fff";
    c.fillText(String(p.i + 1), -2, -8);
    if (!k.koe) {
      c.fillStyle = "#4e342e";
      c.beginPath(); c.ellipse(-1, -16, 11, 3.5, 0, 0, Math.PI * 2); c.fill();
      // Jockey: gehurkt, in zijn eigen kleuren
      c.strokeStyle = "#f5f5f5";
      c.lineWidth = 4;
      c.beginPath(); c.moveTo(-2, -18); c.lineTo(8, -15); c.lineTo(4, -7); c.stroke(); // been
      c.strokeStyle = k.kleur;
      c.lineWidth = 9;
      c.beginPath(); c.moveTo(-3, -20); c.lineTo(9, -32); c.stroke(); // romp
      c.lineWidth = 4;
      const zweep = rent ? Math.sin(p.fase * 2) * 3 : 0;
      c.beginPath(); c.moveTo(8, -31); c.lineTo(20, -26 + zweep); c.stroke(); // arm naar de teugels
      c.strokeStyle = "#333";
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(20, -26 + zweep); c.lineTo(38, -35); c.stroke(); // teugels
    }
    c.restore();
    // Gezicht van de jockey (niet geschaald, zodat je het goed ziet). De koe rijdt zichzelf.
    if (!k.koe) {
      const gx = x + 13 * s, gy = y + galop - 42 * s;
      gezicht(k, gx, gy, 11);
      if (k.gezicht && k.gezicht !== jessy) {
        // Cap in de kleuren van het paard
        c.fillStyle = k.kleur;
        c.beginPath();
        c.arc(gx, gy - 1, 12, Math.PI * 1.05, Math.PI * 1.95);
        c.fill();
        c.fillRect(gx, gy - 6, 15, 3);
      }
    } else {
      c.font = "16px serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("🐄", x + 44, y + galop - 50);
    }
  }

  function tekenRace() {
    tekenLucht();
    tekenTribune();
    tekenBaan();
    // Stofwolkjes achter de hoeven
    stof.forEach((d) => {
      c.fillStyle = `rgba(214, 190, 140, ${0.55 * (1 - d.t / d.max)})`;
      c.beginPath();
      c.arc(d.x - camX, d.y, d.r * (1 + d.t * 2), 0, Math.PI * 2);
      c.fill();
    });
    const paarden = race.paarden;
    paarden.forEach((p) => {
      const x = p.x * SCHAAL - camX + 40;
      const y = BAAN_Y + p.i * BAAN_H + 12;
      if (x < -90 || x > W + 90) return;
      // Supporters: de foto's van wie op dit paard wedt, rennen mee
      spelers.filter((s) => s.paard === p.i).forEach((s, j) => {
        spelerFoto(s, x - 58 - j * 20, y - 22 + Math.sin(tijd * 10 + j) * 3, 9);
      });
      // Snelheidsstrepen bij turbo
      if (p.turbo > 0) {
        c.strokeStyle = "rgba(255, 255, 255, 0.75)";
        c.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(x - 44 - i * 10, y - 12 + i * 7);
          c.lineTo(x - 80 - i * 10 - Math.random() * 20, y - 12 + i * 7);
          c.stroke();
        }
      }
      if (p.glitch > 0) {
        // Glitch: verschoven kopietjes
        c.globalAlpha = 0.45;
        c.save(); c.translate(-7, 0); tekenPaard(p, x, y); c.restore();
        c.save(); c.translate(7, 0); tekenPaard(p, x, y); c.restore();
        c.globalAlpha = 1;
      }
      tekenPaard(p, x, y);
      if (p.flits > 0) {
        c.strokeStyle = `rgba(255, 225, 77, ${p.flits / 0.6})`;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x + 6, y - 14, 46, 0, Math.PI * 2);
        c.stroke();
      }
      if (p.icoonTijd > 0 && p.icoon) {
        c.font = "22px serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(p.icoon, x + 6, y - 66 + Math.sin(tijd * 8) * 3);
      }
      if (p.klaar !== null) {
        const plek = race.volgorde.indexOf(p.i) + 1;
        tekst(plek + "E", x + 64, y - 6, 10, plek === 1 ? "#ffe14d" : "#fff");
      }
    });
    // Overstekende koe
    if (race.effect.oversteek > 0) {
      const k = 1 - race.effect.oversteek / 1.3;
      c.font = "60px serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("🐄", W * 0.55, 190 + k * 340);
    }
    // Regen
    if (regenDruppels.length) {
      c.fillStyle = "rgba(40, 60, 90, 0.18)";
      c.fillRect(0, 0, W, H);
      c.strokeStyle = "rgba(200, 220, 255, 0.7)";
      c.lineWidth = 2;
      regenDruppels.forEach((d) => { c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - 4, d.y + 14); c.stroke(); });
    }
    // Mini-kaart onderaan
    c.fillStyle = "rgba(0, 0, 0, 0.65)";
    c.fillRect(0, H - 40, W, 40);
    c.fillStyle = "#555";
    c.beginPath();
    c.roundRect(60, H - 23, W - 120, 6, 3);
    c.fill();
    c.fillStyle = "#ffe14d";
    c.fillRect(W - 62, H - 32, 4, 24);
    paarden.forEach((p) => {
      const x = 60 + Math.min(1, p.x / LENGTE) * (W - 120);
      const y = H - 20 - (p.i % 2 ? 7 : -7);
      c.fillStyle = "#111";
      c.beginPath();
      c.arc(x, y, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = p.k.kleur;
      c.beginPath();
      c.arc(x, y, 7.5, 0, Math.PI * 2);
      c.fill();
      c.font = `7px ${Arcade.FONT}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = p.k.kleur === "#fafafa" || p.k.kleur === "#ffe14d" || p.k.kleur === "#3ef0ff" ? "#000" : "#fff";
      c.fillText(String(p.i + 1), x, y + 1);
    });
    tekenGrootScherm();
    // Commentator-banner
    if (banner && banner.t < 4) {
      const verloop = c.createLinearGradient(0, 0, 0, 66);
      verloop.addColorStop(0, "rgba(10, 10, 30, 0.92)");
      verloop.addColorStop(1, "rgba(10, 10, 30, 0.7)");
      c.fillStyle = verloop;
      c.fillRect(0, 0, W, 66);
      c.fillStyle = "#c62828";
      c.fillRect(0, 64, W, 3);
      c.font = "bold 22px sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#ffe14d";
      c.fillText(banner.jp, W / 2, 21);
      tekst(banner.nl, W / 2, 49, banner.nl.length > 50 ? 8 : 10, "#fff");
    }
    if (fotofinish && !race.volgorde.length) {
      c.fillStyle = "rgba(255, 255, 255, 0.12)";
      c.fillRect(0, 0, W, H);
      tekst("FOTOFINISH!", W / 2, 96, 18, "#ff3ea5");
    }
    // Aftellen bij de startboxen
    if (aftellen > 0) {
      for (let i = 0; i < 8; i++) {
        const bx = -camX + 64, by = BAAN_Y + i * BAAN_H - 6;
        c.fillStyle = "#b0bec5";
        c.fillRect(bx, by, 10, BAAN_H - 2);
        c.fillStyle = "#37474f";
        c.fillRect(bx, by, 10, 4);
      }
      c.fillStyle = "rgba(0, 0, 0, 0.3)";
      c.fillRect(0, 0, W, H);
      tekst(aftellen > 3 ? "KLAAR?" : String(Math.ceil(aftellen)), W / 2, H / 2, 64, "#ffe14d");
    }
  }

  // --- Uitslag ---
  function tekenUitslag() {
    tekenAvond();
    const w = KARAKTERS[uitslag.volgorde[0]];
    tekst("UITSLAG JESSY CUP", W / 2, 30, 20, "#ffe14d");
    tekst(w.naam + " WINT!", W / 2, 60, 12, w.kleur === "#fafafa" ? "#fff" : w.kleur);
    // Podium voor de top 3
    const PODIUM = [[0, 160, 104, "#ffd54f"], [1, 40, 76, "#cfd8dc"], [2, 280, 54, "#d7a86e"]]; // goud in het midden
    PODIUM.forEach(([plek, x, h, kleur]) => {
      const i = uitslag.volgorde[plek];
      const k = KARAKTERS[i];
      const top = 270 - h;
      const blok = c.createLinearGradient(0, top, 0, 270);
      blok.addColorStop(0, tint(kleur, 0.2));
      blok.addColorStop(1, tint(kleur, -0.3));
      c.fillStyle = blok;
      c.fillRect(x, top, 120, h);
      tekst(String(plek + 1), x + 60, top + 22, 22, "#fff");
      gezicht(k, x + 60, top - 30, plek === 0 ? 28 : 22);
      tekst(k.naam, x + 60, top + h - 12, 6, "#222");
      if (plek === 0) {
        c.font = "26px serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("🏆", x + 104, top - 52);
      }
    });
    // Plek 4 t/m 8
    uitslag.volgorde.slice(3).forEach((i, n) => {
      const k = KARAKTERS[i];
      const y = 300 + n * 46;
      kaart(20, y - 20, 400, 40, k.kleur, false);
      tekst((n + 4) + ".", 34, y, 10, "#fff", "left");
      gezicht(k, 88, y, 14);
      tekst(k.naam, 112, y - 6, 8, "#fff", "left");
      const t = uitslag.tijden[i];
      tekst(t !== null ? t.toFixed(1) + " SEC" : "NIET BINNEN", 112, y + 10, 6, "#aab", "left");
      tekst(KANSEN[i].toFixed(1) + "X", 410, y, 8, "#889", "right");
    });
    // Wie drinkt er?
    tekst("WIE DRINKT?", 690, 96, 12, "#3ef0ff");
    uitslag.regels.forEach((r, i) => {
      const y = 126 + i * 50;
      const goed = r.uitdelen > 0;
      kaart(450, y - 20, 490, 46, goed ? "#5fd35f" : r.drinken ? "#ff5a5a" : "#ffe14d", goed);
      spelerFoto(r.s, 474, y + 3, 15);
      tekst(r.s.naam, 498, y - 4, 9, "#fff", "left");
      tekst(r.redenen.join(" - ").slice(0, 48), 498, y + 14, 6, "#aab", "left");
      if (r.uitdelen) tekst("DEEL " + r.uitdelen + " UIT", 930, y - 4, 10, "#5fd35f", "right");
      if (r.drinken) tekst("DRINK " + r.drinken, 930, r.uitdelen ? y + 14 : y - 4, 10, "#ff5a5a", "right");
      if (!r.uitdelen && !r.drinken) tekst("GERED!", 930, y - 4, 10, "#ffe14d", "right");
    });
    knop(700, 530, 240, 54, "NIEUWE RACE", () => { toestand = "inzet"; }, { kleur: "#c62828", grootte: 12 });
  }

  function teken() {
    zones = [];
    if (toestand === "inzet") tekenInzet();
    else if (toestand === "race") tekenRace();
    else tekenUitslag();
  }

  Arcade.lus(update, teken);
})();
