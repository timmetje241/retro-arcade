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
  const LENGTE = 1000;             // eenheden; op de bordjes is dat 2000 meter
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
      snel: 35.1, acc: 1.6, moe: 0.12, uithoud: 0.6, chaos: 0.25,
      streek(p, race, rng, dt) {
        if (rng() < 0.03 * dt) actie(p, "turbo", 1.6, "🎉", "FEESTJE! JESSY GAAT LOS", "パーティー！");
      }
    },
    {
      naam: "LISA", jp: "リサ", kleur: "#5c6bc0", vacht: "#3e2723", gezicht: plaatje("lisa.png"),
      tekst: ["ALTIJD STABIEL", "KIJKT SOMS OM NAAR JESSY"],
      snel: 36.3, acc: 1.8, moe: 0.08, uithoud: 0.7, chaos: 0.08,
      streek(p, race, rng, dt) {
        if (rng() < 0.03 * dt) actie(p, "stop", 0.7, "👀", "LISA KIJKT OM: ZIT JESSY WEER OP ZIJN TELEFOON?", "リサが振り向いた！");
      }
    },
    {
      naam: "POOLSE KOE", jp: "ポーランドのウシ", kleur: "#fafafa", koe: true, icoon: "🐄",
      tekst: ["GEEN PAARD. WEL SNEL?", "BOE! OF KOEIENRAKET"],
      snel: 35.1, acc: 1.2, moe: 0.05, uithoud: 0.5, chaos: 0.45,
      streek(p, race, rng, dt) {
        if (rng() < 0.07 * dt) actie(p, "stop", 0.8, "💬", "DE KOE ZEGT BOE EN STAAT STIL", "モー！");
        else if (rng() < 0.035 * dt) actie(p, "turbo", 2.5, "🚀", "KOEIENRAKET!!!", "ロケットウシ！");
      }
    },
    {
      naam: "KWARK KAREL", jp: "カレル", kleur: "#3ef0ff", vacht: "#c68e4e", gezicht: maten[0],
      tekst: ["TRAAG BEGIN, MAAR", "STERKE EINDSPURT"],
      snel: 35.1, acc: 1.1, moe: -0.3, uithoud: 0.5, chaos: 0.15,
      streek() {}
    },
    {
      naam: "BIERBUIK BERT", jp: "ベルト", kleur: "#f2a900", vacht: "#6d4c41", gezicht: maten[1],
      tekst: ["KOMT LANGZAAM OP GANG", "BOERT ZICH NAAR VOREN"],
      snel: 35.45, acc: 0.7, moe: 0.1, uithoud: 0.6, chaos: 0.2,
      streek(p, race, rng, dt) {
        if (rng() < 0.05 * dt) actie(p, "turbo", 1.2, "💨", "BERT LAAT EEN BOER EN SCHIET NAAR VOREN", "ゲップ！");
      }
    },
    {
      naam: "VIBECODER 3000", jp: "バイブコーダー", kleur: "#5fd35f", vacht: "#455a64", icoon: "🤖",
      tekst: ["ONVOORSPELBAAR", "GLITCHT DOOR DE BAAN"],
      snel: 34.35, acc: 1.5, moe: 0.1, uithoud: 0.6, chaos: 0.3,
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
      snel: 36.95, acc: 3, moe: 0.15, uithoud: 0.4, chaos: 0.3,
      streek(p, race, rng, dt) {
        if (rng() < 0.045 * dt) actie(p, "stop", 1.1, "🌼", "BEERTJE STOPT OM EEN BLOEMETJE TE PLUKKEN", "お花！");
      }
    },
    {
      naam: "ZIJNE MAJESTEIT", jp: "陛下", kleur: "#b06cff", vacht: "#fafafa", icoon: "👑",
      tekst: ["SNELLE START, SNEL MOE", "ZWAAIT NAAR HET VOLK"],
      snel: 39.6, acc: 1.5, moe: 0.42, uithoud: 0.45, chaos: 0.15,
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
    const aantal = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < aantal; i++) race.events.push({ tijd: 4 + i * 5.5 + rng() * 3, soort: soorten[i] });
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

  // Kansen uitrekenen door de race 400 keer stiekem te laten lopen
  const KANSEN = (function () {
    const winst = new Array(8).fill(0);
    const N = 400;
    for (let n = 0; n < N; n++) {
      const race = maakRace(Math.random, null);
      while (!race.volgorde.length && race.t < 90) stapRace(race, 0.05, Math.random);
      winst[race.volgorde[0] ?? 0]++;
    }
    huidigeRace = null;
    // Odds zoals bij de bookmaker, afgerond op halven
    return winst.map((w) => Math.max(1.5, Math.min(20, Math.round((0.85 * N / Math.max(1, w)) * 2) / 2)));
  })();

  // --- Spelers ---
  let spelers = Arcade.lees(SPELERS_SLEUTEL, null);
  if (!Array.isArray(spelers) || !spelers.length) spelers = [Arcade.gebruikersnaam() || "SPELER 1"];
  spelers = spelers.slice(0, MAX_SPELERS).map((naam) => nieuweSpeler(naam));

  function nieuweSpeler(naam) {
    return { naam, paard: Math.floor(Math.random() * 8), inzet: 2, gedronken: 0, uitgedeeld: 0 };
  }
  function bewaarSpelers() {
    Arcade.bewaar(SPELERS_SLEUTEL, spelers.map((s) => s.naam));
  }
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

  function hoefjes() {
    Arcade.ruis({ duur: 0.03, volume: 0.03 });
  }

  // --- Toestand ---
  let toestand = "inzet";   // inzet, race, uitslag
  let race = null, rng = Math.random, aftellen = 0, tijd = 0, camX = 0, tijdSchaal = 1, fotofinish = false;
  let banner = null, uitslag = null, zones = [], muis = { x: -1, y: -1 }, leiderVorige = -1, laatsteCommentaar = 0;
  let regenDruppels = [], hoefKlok = 0, laatsteRechte = false, afgelopenSinds = 0;

  function melding(nl, jp, paard) {
    banner = { nl, jp, t: 0 };
    zegJapans(jp);
    if (paard) paard.flits = 0.6;
  }

  function startRace() {
    bewaarSpelers();
    race = maakRace(rng, melding);
    toestand = "race";
    aftellen = 3.2;
    camX = -100;
    tijdSchaal = 1;
    fotofinish = false;
    leiderVorige = -1;
    laatsteRechte = false;
    afgelopenSinds = 0;
    banner = { nl: "DE JESSY CUP OVER 2000 METER. DE PAARDEN STAAN KLAAR...", jp: "まもなくスタートです", t: 0 };
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

    // Commentaar bij een nieuwe leider (niet te vaak)
    const leider = [...race.paarden].sort((a, b) => b.x - a.x)[0];
    if (!race.volgorde.length && leider.i !== leiderVorige && tijd - laatsteCommentaar > 3.5 && race.t > 3) {
      leiderVorige = leider.i;
      laatsteCommentaar = tijd;
      if (!banner || banner.t > 1.5) melding(`${leider.k.naam} NEEMT DE LEIDING!`, `トップは${leider.k.jp}！`);
    }
    if (!laatsteRechte && leider.x > LENGTE * 0.75) {
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
    if (zone) {
      zone.doe();
      Arcade.toon({ type: "square", van: 700, naar: 900, duur: 0.05, volume: 0.05 });
    }
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
  function knop(x, y, w, h, woord, doe, opties = {}) {
    const over = muis.x >= x && muis.x <= x + w && muis.y >= y && muis.y <= y + h;
    c.fillStyle = "#111";
    c.beginPath();
    c.roundRect(x, y + 3, w, h, 6);
    c.fill();
    c.fillStyle = over ? "#ff3ea5" : (opties.kleur || "#37474f");
    c.beginPath();
    c.roundRect(x, y, w, h, 6);
    c.fill();
    tekst(woord, x + w / 2, y + h / 2 + 1, opties.grootte || 10, "#fff");
    zones.push({ x, y, w, h, doe });
  }

  function gezicht(k, x, y, r) {
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(x, y, r + 2, 0, Math.PI * 2);
    c.fill();
    if (k.gezicht) Arcade.plaatje(c, k.gezicht, x, y, r);
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

  // --- Inzetscherm ---
  function tekenInzet() {
    const lucht = c.createLinearGradient(0, 0, 0, H);
    lucht.addColorStop(0, "#1b2a4a");
    lucht.addColorStop(1, "#0b0b1e");
    c.fillStyle = lucht;
    c.fillRect(0, 0, W, H);
    tekst("SLOKKEN DERBY", W / 2, 30, 26, "#ffe14d");
    tekst("DE JESSY CUP  -  ZET IN MET SLOKKEN BIER", W / 2, 60, 9, "#ff9ec7");

    // De 8 deelnemers met hun odds
    KARAKTERS.forEach((k, i) => {
      const x = 16 + (i % 2) * 256, y = 78 + Math.floor(i / 2) * 112;
      const gekozen = spelers.filter((s) => s.paard === i);
      c.fillStyle = "rgba(255, 255, 255, 0.07)";
      c.beginPath();
      c.roundRect(x, y, 248, 104, 8);
      c.fill();
      c.fillStyle = k.kleur;
      c.fillRect(x, y, 6, 104);
      gezicht(k, x + 36, y + 36, 22);
      tekst((i + 1) + ". " + k.naam, x + 66, y + 18, 8, "#fff", "left");
      tekst(k.tekst[0], x + 66, y + 40, 6, "#bbb", "left");
      tekst(k.tekst[1], x + 66, y + 54, 6, "#bbb", "left");
      tekst(KANSEN[i].toFixed(1) + "X", x + 238, y + 86, 13, "#ffe14d", "right");
      tekst(gekozen.map((s) => s.naam).join(" ").slice(0, 22), x + 14, y + 88, 6, k.kleur === "#fafafa" ? "#ddd" : k.kleur, "left");
    });

    // Spelers
    const px = 536;
    tekst("SPELERS", px + 8, 92, 10, "#3ef0ff", "left");
    tekst("PAARD", px + 236, 92, 7, "#888");
    tekst("SLOKKEN", px + 352, 92, 7, "#888");
    spelers.forEach((s, i) => {
      const y = 108 + i * 50;
      const k = KARAKTERS[s.paard];
      c.fillStyle = "rgba(255, 255, 255, 0.06)";
      c.beginPath();
      c.roundRect(px, y, 410, 44, 6);
      c.fill();
      // Naam: klik om te wijzigen of te verwijderen
      tekst(s.naam, px + 10, y + 16, 9, "#fff", "left");
      tekst(`DRONK ${s.gedronken}  DEELDE ${s.uitgedeeld}`, px + 10, y + 33, 6, "#888", "left");
      zones.push({ x: px, y, w: 160, h: 44, doe: () => {
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
    tekst("KLIK OP EEN NAAM OM HEM TE WIJZIGEN (LEEG = WEG)  -  WATER MAG OOK", 20, 574, 6, "#888", "left");
    knop(700, 530, 240, 54, "START RACE!", startRace, { kleur: "#c62828", grootte: 14 });
  }

  // --- Race ---
  function tekenTribune() {
    c.fillStyle = "#87ceeb";
    c.fillRect(0, 0, W, 150);
    // Bergen (Fuji!) ver weg
    const berg = -camX * 0.05;
    c.fillStyle = "#8aa2c8";
    c.beginPath();
    c.moveTo(berg + 500, 150); c.lineTo(berg + 700, 40); c.lineTo(berg + 900, 150);
    c.fill();
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(berg + 663, 62); c.lineTo(berg + 700, 40); c.lineTo(berg + 737, 62); c.lineTo(berg + 715, 58); c.lineTo(berg + 700, 66); c.lineTo(berg + 685, 58);
    c.fill();
    // Tribune met publiek
    const schuif = -camX * 0.5;
    c.fillStyle = "#5d4037";
    c.fillRect(0, 96, W, 60);
    const kleuren = ["#ff3e5a", "#ffe14d", "#3ef0ff", "#fff", "#5fd35f", "#ff9800"];
    for (let rij = 0; rij < 3; rij++) {
      const off = ((schuif + rij * 7) % 14 + 14) % 14;
      for (let x = -14; x < W + 14; x += 14) {
        const n = Math.round((x + off - schuif) / 14) + rij * 5;
        c.fillStyle = kleuren[((n % 6) + 6) % 6];
        const spring = (n + Math.floor(tijd * 6)) % 7 === 0 ? -3 : 0;
        c.beginPath();
        c.arc(x + off, 108 + rij * 16 + spring, 5, 0, Math.PI * 2);
        c.fill();
      }
    }
    // Spandoeken
    const bord = -camX * 0.8;
    const doeken = ["ジェシー杯", "JESSY CUP 33", "競馬", "KWARK", "がんばれ！", "BOE"];
    c.fillStyle = "#b71c1c";
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

  function tekenBaan() {
    c.fillStyle = "#3f8f3a";
    c.fillRect(0, 172, W, H - 172);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? "#4a9a42" : "#438f3c";
      c.fillRect(0, BAAN_Y + i * BAAN_H - 6, W, BAAN_H);
    }
    // Hekken boven en onder
    c.fillStyle = "#fff";
    c.fillRect(0, 176, W, 4);
    c.fillRect(0, BAAN_Y + 8 * BAAN_H - 4, W, 4);
    for (let x = -((camX % 40) + 40) % 40; x < W; x += 40) {
      c.fillRect(x, 172, 3, 12);
      c.fillRect(x, BAAN_Y + 8 * BAAN_H - 8, 3, 12);
    }
    // Afstandspalen (om de 100 eenheden = 200 meter)
    for (let m = 0; m <= LENGTE; m += 100) {
      const x = m * SCHAAL - camX;
      if (x < -50 || x > W + 50) continue;
      c.fillStyle = m === LENGTE ? "#fff" : "rgba(255, 255, 255, 0.4)";
      c.fillRect(x - 2, 180, m === LENGTE ? 6 : 3, BAAN_Y + 8 * BAAN_H - 184);
      const rest = (LENGTE - m) * 2;
      if (m < LENGTE) tekst(m === 0 ? "START" : rest + "M", x - (m === 0 ? 20 : 30), 194, 7, "#fff", "left");
    }
    // Finish
    const fx = LENGTE * SCHAAL - camX;
    if (fx > -60 && fx < W + 60) {
      c.fillStyle = "#ffe14d";
      c.fillRect(fx - 4, 120, 10, 60);
      c.beginPath();
      c.arc(fx + 1, 116, 16, 0, Math.PI * 2);
      c.fill();
      c.font = "bold 12px sans-serif";
      c.fillStyle = "#c62828";
      c.textAlign = "center";
      c.fillText("ゴール", fx + 1, 117);
    }
  }

  function tekenPaard(p, x, y) {
    const k = p.k;
    const s = k.klein ? 0.75 : 1;
    const rent = p.v > 3;
    c.save();
    c.translate(x, y);
    if (p.slip > 0) c.rotate(Math.sin(tijd * 18) * 0.35);
    c.scale(s, s);
    const lijf = k.koe ? "#fafafa" : k.vacht;
    const donker = k.koe ? "#bbb" : "rgba(0, 0, 0, 0.35)";
    // Benen in galop
    c.lineCap = "round";
    [[-20, 0], [-12, 1.6], [14, 3.1], [22, 4.7]].forEach(([bx, off], i) => {
      const a = rent ? Math.sin(p.fase + off) * 0.7 : 0;
      c.strokeStyle = i % 2 ? lijf : donker;
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(bx, 4);
      c.lineTo(bx + Math.sin(a) * 15, 4 + Math.cos(a) * 18);
      c.stroke();
    });
    // Staart
    c.strokeStyle = k.koe ? "#333" : "#2b1a10";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-28, -4);
    c.quadraticCurveTo(-40, -2 + Math.sin(tijd * 12) * 4, -42, 10);
    c.stroke();
    // Lijf
    c.fillStyle = lijf;
    c.beginPath();
    c.ellipse(0, -2, 30, 12, 0, 0, Math.PI * 2);
    c.fill();
    if (k.koe) {
      c.fillStyle = "#222";
      [[-14, -6, 7], [6, 2, 6], [16, -8, 5]].forEach(([vx, vy, r]) => { c.beginPath(); c.arc(vx, vy, r, 0, Math.PI * 2); c.fill(); });
    }
    // Hals en hoofd
    c.fillStyle = lijf;
    c.beginPath();
    c.moveTo(18, -10); c.lineTo(30, -28); c.lineTo(38, -24); c.lineTo(28, -2);
    c.fill();
    c.beginPath();
    c.ellipse(40, -26, 11, 6, 0.35, 0, Math.PI * 2);
    c.fill();
    if (k.koe) {
      c.fillStyle = "#f8bbd0";
      c.beginPath(); c.ellipse(48, -23, 5, 4, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#ddd"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(34, -32); c.lineTo(30, -40); c.stroke();
    } else {
      c.fillStyle = "#2b1a10";
      c.fillRect(24, -30, 8, 4); // manen
    }
    c.fillStyle = "#000";
    c.fillRect(40, -29, 3, 3);
    // Dekje met nummer
    c.fillStyle = k.kleur;
    c.fillRect(-12, -14, 22, 14);
    c.font = `8px ${Arcade.FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = k.kleur === "#fafafa" || k.kleur === "#ffe14d" ? "#000" : "#fff";
    c.fillText(String(p.i + 1), -1, -7);
    c.restore();
    // Jockey (de koe rijdt zichzelf)
    if (!k.koe) {
      c.fillStyle = k.kleur;
      c.fillRect(x - 6, y - 26 * s, 12, 14);
      gezicht(k, x, y - 34 * s, 11);
    } else {
      c.font = "18px serif";
      c.textAlign = "center";
      c.fillText("🐄", x - 2, y - 26);
    }
  }

  function tekenRace() {
    tekenTribune();
    tekenBaan();
    const paarden = race.paarden;
    paarden.forEach((p) => {
      const x = p.x * SCHAAL - camX + 40;
      const y = BAAN_Y + p.i * BAAN_H + 18;
      if (x < -80 || x > W + 80) return;
      // Snelheidsstrepen bij turbo
      if (p.turbo > 0) {
        c.strokeStyle = "rgba(255, 255, 255, 0.7)";
        c.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(x - 40 - i * 12, y - 10 + i * 6);
          c.lineTo(x - 70 - i * 12 - Math.random() * 20, y - 10 + i * 6);
          c.stroke();
        }
      }
      if (p.glitch > 0) {
        // Glitch: rood/blauw verschoven kopietjes
        c.globalAlpha = 0.5;
        c.save(); c.translate(-6, 0); tekenPaard(p, x, y); c.restore();
        c.save(); c.translate(6, 0); tekenPaard(p, x, y); c.restore();
        c.globalAlpha = 1;
      }
      tekenPaard(p, x, y);
      if (p.icoonTijd > 0 && p.icoon) {
        c.font = "22px serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(p.icoon, x + 6, y - 60 + Math.sin(tijd * 8) * 3);
      }
      if (p.klaar !== null) {
        const plek = race.volgorde.indexOf(p.i) + 1;
        tekst(plek + "E", x + 60, y - 6, 10, plek === 1 ? "#ffe14d" : "#fff");
      }
    });
    // Overstekende koe
    if (race.effect.oversteek > 0) {
      const k = 1 - race.effect.oversteek / 1.3;
      c.font = "60px serif";
      c.textAlign = "center";
      c.fillText("🐄", W * 0.55, 190 + k * 340);
    }
    // Regen
    if (regenDruppels.length) {
      c.strokeStyle = "rgba(200, 220, 255, 0.7)";
      c.lineWidth = 2;
      regenDruppels.forEach((d) => { c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - 4, d.y + 14); c.stroke(); });
    }
    // Mini-kaart onderaan
    c.fillStyle = "rgba(0, 0, 0, 0.6)";
    c.fillRect(0, H - 40, W, 40);
    c.fillStyle = "#666";
    c.fillRect(60, H - 21, W - 120, 3);
    c.fillStyle = "#ffe14d";
    c.fillRect(W - 62, H - 32, 4, 24);
    paarden.forEach((p) => {
      const x = 60 + Math.min(1, p.x / LENGTE) * (W - 120);
      c.fillStyle = p.k.kleur;
      c.beginPath();
      c.arc(x, H - 20 - (p.i % 2 ? 6 : -6), 8, 0, Math.PI * 2);
      c.fill();
      c.font = `7px ${Arcade.FONT}`;
      c.textAlign = "center";
      c.fillStyle = p.k.kleur === "#fafafa" || p.k.kleur === "#ffe14d" || p.k.kleur === "#3ef0ff" ? "#000" : "#fff";
      c.fillText(String(p.i + 1), x, H - 19 - (p.i % 2 ? 6 : -6));
    });
    // Commentator-banner
    if (banner && banner.t < 4) {
      c.fillStyle = "rgba(0, 0, 0, 0.75)";
      c.fillRect(0, 0, W, 64);
      c.font = "bold 22px sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#ffe14d";
      c.fillText(banner.jp, W / 2, 20);
      tekst(banner.nl, W / 2, 48, banner.nl.length > 50 ? 8 : 10, "#fff");
    }
    if (fotofinish && !race.volgorde.length) tekst("FOTOFINISH!", W / 2, 90, 16, "#ff3ea5");
    // Aftellen
    if (aftellen > 0) {
      c.fillStyle = "rgba(0, 0, 0, 0.35)";
      c.fillRect(0, 0, W, H);
      tekst(aftellen > 3 ? "KLAAR?" : String(Math.ceil(aftellen)), W / 2, H / 2, 60, "#ffe14d");
      // Startboxen
      c.fillStyle = "#9e9e9e";
      for (let i = 0; i < 8; i++) c.fillRect(-camX + 60, BAAN_Y + i * BAAN_H - 6, 8, BAAN_H - 4);
    }
  }

  // --- Uitslag ---
  function tekenUitslag() {
    c.fillStyle = "#0b0b1e";
    c.fillRect(0, 0, W, H);
    const w = KARAKTERS[uitslag.volgorde[0]];
    tekst("UITSLAG JESSY CUP", W / 2, 30, 20, "#ffe14d");
    tekst(w.naam + " WINT!", W / 2, 60, 12, w.kleur === "#fafafa" ? "#fff" : w.kleur);
    // Einduitslag
    uitslag.volgorde.forEach((i, plek) => {
      const k = KARAKTERS[i];
      const y = 100 + plek * 52;
      c.fillStyle = plek === 0 ? "rgba(255, 225, 77, 0.2)" : "rgba(255, 255, 255, 0.05)";
      c.fillRect(20, y - 22, 400, 46);
      tekst((plek + 1) + ".", 30, y, 12, plek === 0 ? "#ffe14d" : "#fff", "left");
      gezicht(k, 92, y, 16);
      tekst(k.naam, 118, y - 6, 8, "#fff", "left");
      tekst(KANSEN[i].toFixed(1) + "X", 410, y - 6, 8, "#888", "right");
      const t = uitslag.tijden[i];
      tekst(t !== null ? t.toFixed(1) + " SEC" : "NIET BINNEN", 118, y + 10, 6, "#aaa", "left");
    });
    // Wie drinkt er?
    tekst("WIE DRINKT?", 690, 96, 12, "#3ef0ff");
    uitslag.regels.forEach((r, i) => {
      const y = 126 + i * 50;
      c.fillStyle = "rgba(255, 255, 255, 0.06)";
      c.fillRect(450, y - 18, 490, 46);
      tekst(r.s.naam, 462, y - 4, 9, "#fff", "left");
      tekst(r.redenen.join(" - ").slice(0, 52), 462, y + 14, 6, "#aaa", "left");
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
