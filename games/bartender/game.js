// Jessy's Bar: mix de cocktails van de kaart. Barman Jessy (met snor) proeft ze en reageert, soms heftig.
// Naar het idee van het oude flashspel "Bartender: The Right Mix".
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const RECORD_SLEUTEL = "bartender.record";
  const BOEK_SLEUTEL = "bartender.boek";   // ontdekte recepten, per apparaat
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);
  const gezichten = Arcade.gezichten();

  // --- Spelregels ---
  const AANTAL_BESTELLINGEN = 8;
  const SCHENK_SNELHEID = 1.5;     // delen per seconde
  const SCHENK_START = 0.18;       // zo lang duurt het kantelen van de fles
  const MAX_DELEN = 10;            // zoveel past er in de mengbeker
  const SNELHEIDSBONUS = 25;
  const PROEF_DUUR = 1.4;          // optillen, drinken en neerzetten
  const REACTIE_DUUR = 3.2;
  const ONTDEK_BONUS = 25;         // per nieuw ontdekt recept

  // --- Plekken in beeld ---
  const TOOG = 440;                // bovenkant van de bar
  const SCHAPPEN_Y = [120, 230, 340];
  const BEKER = { x: 560, y: TOOG };
  const SERVEER_X = 670;
  const JX = 840;                  // barman Jessy
  const HOOFD_Y = 150;
  const HOOFD_B = 46;              // halve breedte: lekker langwerpig, net als de echte barman
  const HOOFD_H = 70;

  const DRANKEN = {
    wodka: { naam: "WODKA", kort: "WODKA", kleur: "#eef6ff", alc: 1, vorm: "fles", glas: "#d8ecff" },
    gin: { naam: "GIN", kort: "GIN", kleur: "#e6fff4", alc: 1, vorm: "fles", glas: "#6fbf8f" },
    rum: { naam: "RUM", kort: "RUM", kleur: "#c9772c", alc: 1, vorm: "vierkant", glas: "#e9d6b8" },
    tequila: { naam: "TEQUILA", kort: "TEQUILA", kleur: "#f2e2a0", alc: 1, vorm: "fles", glas: "#e8f0d0" },
    whisky: { naam: "WHISKY", kort: "WHISKY", kleur: "#a8561e", alc: 1, vorm: "vierkant", glas: "#f0e0c8" },
    jager: { naam: "JAGERMEISTER", kort: "JAGER", kleur: "#3a2a12", alc: 0.7, vorm: "vierkant", glas: "#2f5d2a" },
    curacao: { naam: "BLUE CURACAO", kort: "CURACAO", kleur: "#1e7bff", alc: 0.6, vorm: "fles", glas: "#cfe6ff" },
    triplesec: { naam: "TRIPLE SEC", kort: "TR.SEC", kleur: "#ffd9a0", alc: 0.6, vorm: "fles", glas: "#ffe9c8" },
    koffie: { naam: "KOFFIELIKEUR", kort: "KOFFIE", kleur: "#3b2314", alc: 0.6, vorm: "vierkant", glas: "#d9c6b0" },
    grenadine: { naam: "GRENADINE", kort: "GRENAD.", kleur: "#d0103a", alc: 0, vorm: "fles", glas: "#ffd0d8" },
    limoen: { naam: "LIMOENSAP", kort: "LIMOEN", kleur: "#b8e05a", alc: 0, vorm: "fles", glas: "#e8ffd0" },
    cola: { naam: "COLA", kort: "COLA", kleur: "#3a1a0a", alc: 0, vorm: "fles", glas: "#c8e0d8", bruis: true },
    tonic: { naam: "TONIC", kort: "TONIC", kleur: "#f2fff9", alc: 0, vorm: "fles", glas: "#d0fff0", bruis: true },
    bier: { naam: "BIER", kort: "BIER", kleur: "#f2a900", alc: 0.3, vorm: "fles", glas: "#6b3a12", bruis: true },
    sinas: { naam: "SINAASAPPELSAP", kort: "SINAS", kleur: "#ff9800", alc: 0, vorm: "pak", icoon: "🍊" },
    cranberry: { naam: "CRANBERRYSAP", kort: "CRANB.", kleur: "#c2185b", alc: 0, vorm: "pak", icoon: "🍒" },
    ananas: { naam: "ANANASSAP", kort: "ANANAS", kleur: "#ffe066", alc: 0, vorm: "pak", icoon: "🍍" },
    melk: { naam: "MELK", kort: "MELK", kleur: "#fffaf0", alc: 0, vorm: "pak", icoon: "🥛", zuivel: true },
    kwark: { naam: "KWARK", kort: "KWARK", kleur: "#f7f7f2", alc: 0, vorm: "pot", deksel: "#1e88e5", zuivel: true },
    creatine: { naam: "CREATINE", kort: "CREATINE", kleur: "#ffffff", alc: 0, vorm: "pot", deksel: "#222" },
    tabasco: { naam: "TABASCO", kort: "TABASCO", kleur: "#c62828", alc: 0, vorm: "klein", glas: "#ffd0c0" }
  };
  const SCHAPPEN = [
    ["wodka", "gin", "rum", "tequila", "whisky", "jager", "curacao"],
    ["triplesec", "koffie", "grenadine", "limoen", "cola", "tonic", "bier"],
    ["sinas", "cranberry", "ananas", "melk", "kwark", "creatine", "tabasco"]
  ];
  // Waar elke fles staat
  const FLESSEN = [];
  SCHAPPEN.forEach((rij, r) => rij.forEach((id, i) => FLESSEN.push({ id, x: 55 + i * 68, y: SCHAPPEN_Y[r] })));

  const GLAZEN = [
    { id: "cocktail", naam: "COCKTAILGLAS", kort: "COCKTAIL", x: 60, binnen: [[-28, -72], [28, -72], [0, -36]] },
    { id: "long", naam: "LONGDRINKGLAS", kort: "LONG", x: 128, binnen: [[-17, -92], [17, -92], [15, -4], [-15, -4]] },
    { id: "tumbler", naam: "TUMBLER", kort: "TUMBLER", x: 198, binnen: [[-24, -56], [24, -56], [22, -7], [-22, -7]] },
    { id: "shot", naam: "SHOTGLAS", kort: "SHOT", x: 262, binnen: [[-12, -36], [12, -36], [10, -5], [-10, -5]] }
  ];
  const GLAS = Object.fromEntries(GLAZEN.map((g) => [g.id, g]));
  const IJSEMMER = { x: 345 };

  const GARNERINGEN = {
    limoen: "LIMOEN", sinas: "SINAASAPPEL", kers: "KERS", olijf: "OLIJF", parasol: "PARASOLLETJE", geen: "GEEN GARNERING"
  };

  // Echte cocktails (iets versimpeld) en een paar specialiteiten van het huis
  const RECEPTEN = [
    { naam: "CUBA LIBRE", delen: { rum: 2, cola: 4, limoen: 1 }, ijs: true, methode: "roeren", glas: "long", garnering: "limoen" },
    { naam: "SCREWDRIVER", delen: { wodka: 2, sinas: 4 }, ijs: true, methode: "roeren", glas: "long", garnering: "sinas" },
    { naam: "TEQUILA SUNRISE", delen: { tequila: 2, sinas: 4, grenadine: 1 }, ijs: true, methode: "roeren", glas: "long", garnering: "kers" },
    { naam: "MARGARITA", delen: { tequila: 2, triplesec: 1, limoen: 1 }, ijs: true, methode: "shaken", glas: "cocktail", garnering: "limoen" },
    { naam: "COSMOPOLITAN", delen: { wodka: 2, triplesec: 1, cranberry: 2, limoen: 1 }, ijs: true, methode: "shaken", glas: "cocktail", garnering: "limoen" },
    { naam: "PINA COLADA", delen: { rum: 2, ananas: 3, melk: 1 }, ijs: true, methode: "shaken", glas: "long", garnering: "parasol" },
    { naam: "WHITE RUSSIAN", delen: { wodka: 2, koffie: 1, melk: 1 }, ijs: true, methode: "roeren", glas: "tumbler", garnering: "geen" },
    { naam: "GIN TONIC", delen: { gin: 2, tonic: 4 }, ijs: true, methode: "roeren", glas: "long", garnering: "limoen" },
    { naam: "SEX ON THE BEACH", delen: { wodka: 2, sinas: 2, cranberry: 2 }, ijs: true, methode: "shaken", glas: "long", garnering: "parasol" },
    { naam: "BLUE LAGOON", delen: { wodka: 2, curacao: 1, tonic: 3 }, ijs: true, methode: "roeren", glas: "long", garnering: "kers" },
    { naam: "WHISKY COLA", delen: { whisky: 2, cola: 3 }, ijs: true, methode: "roeren", glas: "tumbler", garnering: "geen" },
    { naam: "KAMIKAZE", delen: { wodka: 1, triplesec: 1, limoen: 1 }, ijs: true, methode: "shaken", glas: "shot", garnering: "geen" },
    { naam: "MOJITO ZONDER MUNT", delen: { rum: 2, limoen: 1, tonic: 3 }, ijs: true, methode: "roeren", glas: "long", garnering: "limoen" },
    { naam: "POOLSE KOE", delen: { wodka: 1, melk: 4, grenadine: 1 }, ijs: false, methode: "shaken", glas: "tumbler", garnering: "kers" },
    { naam: "GAINS SHAKE", delen: { kwark: 2, melk: 3, creatine: 1 }, ijs: false, methode: "shaken", glas: "long", garnering: "geen" },
    { naam: "PROTEINE PILS", delen: { bier: 5, creatine: 1 }, ijs: false, methode: "roeren", glas: "long", garnering: "geen" },
    { naam: "JAGERPILS", delen: { jager: 1, bier: 4 }, ijs: false, methode: "roeren", glas: "long", garnering: "geen" },
    { naam: "33 SPECIAL", delen: { rum: 1, ananas: 2, grenadine: 1, sinas: 2 }, ijs: true, methode: "shaken", glas: "cocktail", garnering: "parasol" }
  ];

  // Wat Jessy zegt (en roept) bij elke reactie
  const REACTIES = {
    perfect: { kreet: "PERFECT!", kleur: "#ffe14d", zeg: ["Perfect! Heerlijk!", "Wauw. Meesterlijk.", "Dit is kunst!"] },
    goed: { kreet: "LEKKER!", kleur: "#5fd35f", zeg: ["Lekker!", "Prima drankje.", "Proost!"] },
    matig: { kreet: "MWAH...", kleur: "#ffb74d", zeg: ["Mwah.", "Kan beter.", "Hmm, nou ja."] },
    ziek: { kreet: "BLEGH!", kleur: "#7cd35f", zeg: ["Bleh! Wat is dit?", "Ik voel me niet zo lekker."] },
    vuur: { kreet: "HEEEET!!!", kleur: "#ff5a1f", zeg: ["Heet! Heet! Heet!", "Water! Water!"] },
    boem: { kreet: "BOEM!", kleur: "#ffffff", zeg: ["Wat was dat?!", "Melk en prik, echt?"] },
    spieren: { kreet: "GAINS!!!", kleur: "#3ef0ff", zeg: ["Gains! Gains! Gains!", "Ik voel me sterk!"] },
    blauw: { kreet: "BRRRR!", kleur: "#6ab7ff", zeg: ["Brrr, koud!", "Ik word helemaal blauw."] },
    dronken: { kreet: "HIK!", kleur: "#ff7ab8", zeg: ["Nog eentje dan. Hik.", "Waar is de vloer?"] },
    boer: { kreet: "BOEEERRR", kleur: "#c8e06a", zeg: ["Boeeerrr.", "Pardon."] },
    leeg: { kreet: "LEEG?!", kleur: "#ff5a5a", zeg: ["Het glas is leeg!", "Ga je me nou pesten?"] }
  };

  let toestand;          // klaar, mixen, bereiden, proeven, einde
  let bestellingen, nummer, recept, lagen, ijs, glas, glasInhoud, garnering, limiet, resterend;
  let schenk, bereiding, proef, score, reeks, nieuwRecord, gezicht = null;
  let tijd = 0, sinds = 0, kreten = [], deeltjes = [], schud = 0, flits = 0;
  let muis = { x: -1, y: -1 };
  let record = Arcade.lees(RECORD_SLEUTEL, 0);
  // Jessy bestelt alleen de naam. Het recept zie je pas als je het zelf een keer goed hebt gemixt.
  let boek = new Set(Arcade.lees(BOEK_SLEUTEL, []));
  let boekOpen = false;

  function nieuwSpel() {
    toestand = "klaar";
    score = 0;
    reeks = 0;
    nummer = 0;
    nieuwRecord = false;
    kreten = [];
    deeltjes = [];
    gezicht = Arcade.anderGezicht(gezichten, gezicht);
    // Elke dienst andere bestellingen, van makkelijk (weinig flessen) naar moeilijk
    bestellingen = [...RECEPTEN].sort(() => Math.random() - 0.5).slice(0, AANTAL_BESTELLINGEN)
      .sort((a, b) => Object.keys(a.delen).length - Object.keys(b.delen).length);
    nieuweBestelling();
  }

  function nieuweBestelling() {
    recept = bestellingen[nummer];
    lagen = [];
    ijs = false;
    glas = null;
    glasInhoud = null;
    garnering = "geen";
    limiet = 22 + 6 * Object.keys(recept.delen).length;
    resterend = limiet;
    schenk = null;
    bereiding = null;
    proef = null;
  }

  const som = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);

  function inhoud() {
    const totaal = {};
    lagen.forEach((l) => { totaal[l.id] = (totaal[l.id] || 0) + l.delen; });
    return totaal;
  }

  function hexNaarRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // De kleur van het geheel: alles door elkaar
  function mengKleur(mix) {
    const t = som(mix);
    if (t <= 0) return "rgba(0,0,0,0)";
    const rgb = [0, 0, 0];
    for (const [id, delen] of Object.entries(mix)) {
      hexNaarRgb(DRANKEN[id].kleur).forEach((v, i) => { rgb[i] += v * delen / t; });
    }
    return `rgb(${rgb.map(Math.round).join(",")})`;
  }

  // 1 = precies goed, 0 = helemaal mis. Kleine afwijkingen (te laat losgelaten) kosten bijna niets.
  function nauwkeurigheid(mix, r = recept) {
    const totaalRecept = som(r.delen);
    if (som(mix) < 0.3) return 0;
    let fout = 0;
    for (const id of new Set([...Object.keys(r.delen), ...Object.keys(mix)])) {
      fout += Math.abs((r.delen[id] || 0) - (mix[id] || 0));
    }
    return Math.max(0, Math.min(1, 1 - Math.max(0, fout / totaalRecept - 0.05) * 1.25));
  }

  // Zelfde flessen als het recept (druppeltjes tellen niet) en de verhoudingen ongeveer goed?
  function lijktOp(mix, r) {
    const erin = Object.keys(mix).filter((id) => mix[id] >= 0.3).sort().join();
    return erin === Object.keys(r.delen).sort().join() && nauwkeurigheid(mix, r) >= 0.75;
  }

  // Jessy's tip na het proeven: wat zat er het meest naast?
  function tipVoor(mix, onderdelen) {
    let ergste = null, grootste = 0.4;
    for (const id of new Set([...Object.keys(recept.delen), ...Object.keys(mix)])) {
      const verschil = (mix[id] || 0) - (recept.delen[id] || 0);
      if (Math.abs(verschil) > grootste) { grootste = Math.abs(verschil); ergste = { id, verschil }; }
    }
    if (ergste) {
      const naam = DRANKEN[ergste.id].naam;
      if (!recept.delen[ergste.id]) return naam + " HOORT ER NIET IN";
      if ((mix[ergste.id] || 0) < 0.3) return "ER MIST: " + naam;
      return (ergste.verschil > 0 ? "TE VEEL " : "TE WEINIG ") + naam;
    }
    const fout = onderdelen.find((o) => !o[1]);
    if (!fout) return null;
    if (fout[0] === "GLAS") return "PROBEER EEN ANDER GLAS";
    if (fout[0] === "IJS") return recept.ijs ? "HIJ WIL IJS" : "HIJ WIL GEEN IJS";
    if (fout[0] === "GARNERING") return "ANDERE GARNERING";
    return recept.methode === "shaken" ? "LIEVER SHAKEN" : "LIEVER ROEREN";
  }

  // --- Geluidjes ---
  function glug() {
    Arcade.toon({ type: "sine", van: 260 + Math.random() * 160, naar: 150, duur: 0.08, volume: 0.09 });
  }
  function klink() {
    [0, 0.06, 0.13].forEach((w) => Arcade.toon({ type: "triangle", van: 2100 + Math.random() * 400, naar: 1800, duur: 0.05, volume: 0.07, vertraging: w }));
  }
  function slurp() {
    Arcade.toon({ type: "sawtooth", van: 220, naar: 120, duur: 0.12, volume: 0.06, filter: 900 });
  }
  function fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => Arcade.toon({ type: "square", van: f, duur: i === 3 ? 0.4 : 0.12, volume: 0.09, vertraging: i * 0.11 }));
  }
  function geluidBijReactie(soort) {
    if (soort === "perfect") fanfare();
    else if (soort === "goed") [660, 880].forEach((f, i) => Arcade.toon({ type: "square", van: f, duur: 0.12, volume: 0.08, vertraging: i * 0.12 }));
    else if (soort === "matig") [440, 370].forEach((f, i) => Arcade.toon({ type: "triangle", van: f, duur: 0.2, volume: 0.1, vertraging: i * 0.2 }));
    else if (soort === "ziek") [0, 0.45].forEach((w) => Arcade.toon({ type: "sawtooth", van: 160, naar: 80, duur: 0.35, volume: 0.15, vertraging: w, filter: 700 }));
    else if (soort === "vuur") {
      Arcade.ruis({ duur: 1.2, volume: 0.3 });
      Arcade.toon({ type: "sawtooth", van: 140, naar: 60, duur: 1, volume: 0.12, filter: 900 });
    } else if (soort === "spieren") Arcade.toon({ type: "square", van: 150, naar: 900, duur: 0.9, volume: 0.1 });
    else if (soort === "blauw") {
      for (let i = 0; i < 10; i++) Arcade.toon({ type: "triangle", van: i % 2 ? 620 : 680, duur: 0.06, volume: 0.07, vertraging: i * 0.07 });
    } else if (soort === "boer") Arcade.toon({ type: "sawtooth", van: 95, naar: 62, duur: 1.1, volume: 0.35, filter: 500 });
    else if (soort === "leeg") [0, 0.18].forEach((w) => Arcade.toon({ type: "square", van: 180, duur: 0.14, volume: 0.12, vertraging: w }));
  }

  function zeg(zin) {
    if (Arcade.isStil() || !window.speechSynthesis) return;
    const uitspraak = new SpeechSynthesisUtterance(zin);
    uitspraak.lang = "nl-NL";
    uitspraak.rate = 1.05;
    uitspraak.pitch = 0.7 + Math.random() * 0.5;
    speechSynthesis.cancel();
    speechSynthesis.speak(uitspraak);
  }

  function kreet(woord, x, y, kleur = "#fff", groot = false) {
    kreten.push({ tekst: woord, x, y, leeftijd: 0, kleur, groot });
  }

  // --- Knoppen op de voorkant van de bar ---
  const KNOPPEN = [
    { id: "ijs", tekst: "IJS", x: 20, y: 474, w: 100, h: 44 },
    { id: "shaken", tekst: "SHAKEN", x: 130, y: 474, w: 125, h: 44 },
    { id: "roeren", tekst: "ROEREN", x: 265, y: 474, w: 125, h: 44 },
    { id: "weg", tekst: "WEGGOOIEN", x: 400, y: 474, w: 165, h: 44 },
    ...["limoen", "sinas", "kers", "olijf", "parasol"].map((g, i) => ({ id: "g-" + g, garnering: g, tekst: "", x: 20 + i * 78, y: 528, w: 70, h: 44 })),
    { id: "boek", tekst: "RECEPTEN", x: 420, y: 528, w: 145, h: 44 },
    { id: "serveer", tekst: "SERVEREN", x: 600, y: 474, w: 250, h: 98 }
  ];

  function knopActief(k) {
    if (toestand !== "mixen" || schenk) return false;
    if (k.id === "ijs") return !glasInhoud;
    if (k.id === "shaken" || k.id === "roeren") return !glasInhoud && lagen.length > 0 && !!glas;
    if (k.id === "weg") return lagen.length > 0 || !!glasInhoud || ijs;
    if (k.garnering) return !!glas;
    if (k.id === "serveer") return !!glasInhoud;
    return true;
  }

  function drukKnop(k) {
    if (!knopActief(k)) {
      if ((k.id === "shaken" || k.id === "roeren") && toestand === "mixen" && !glasInhoud) {
        kreet(!glas ? "KIES EERST EEN GLAS" : "DE BEKER IS LEEG", BEKER.x, 300, "#ffb74d");
      } else if (k.id === "serveer" && toestand === "mixen") kreet("EERST SHAKEN OF ROEREN", 720, 440, "#ffb74d");
      return;
    }
    if (k.id === "ijs") {
      ijs = !ijs;
      if (ijs) klink();
      else Arcade.toon({ type: "triangle", van: 900, naar: 500, duur: 0.1, volume: 0.06 });
    } else if (k.id === "shaken" || k.id === "roeren") {
      const mix = inhoud();
      glasInhoud = { mix, ijs, methode: k.id, kleur: mengKleur(mix), vul: 0, totaal: som(mix) };
      bereiding = { methode: k.id, t: 0, klok: 0 };
      toestand = "bereiden";
    } else if (k.id === "weg") {
      lagen = [];
      ijs = false;
      glasInhoud = null;
      garnering = "geen";
      Arcade.ruis({ duur: 0.4, volume: 0.12 });
      kreet("WEG ERMEE", BEKER.x, 300, "#ddd");
    } else if (k.garnering) {
      garnering = garnering === k.garnering ? "geen" : k.garnering;
      Arcade.toon({ type: "square", van: 700, naar: 900, duur: 0.06, volume: 0.06 });
    } else if (k.id === "serveer") {
      serveer();
    } else if (k.id === "boek") {
      boekOpen = true;
      Arcade.toon({ type: "triangle", van: 500, naar: 700, duur: 0.08, volume: 0.06 });
    }
  }

  // --- Bereiden: shaken of roeren, en dan inschenken ---
  const FASEN = {
    shaken: [["naarJessy", 0.3], ["schudden", 1.2], ["naarGlas", 0.35], ["schenken", 0.8], ["terug", 0.3]],
    roeren: [["roeren", 1.1], ["naarGlas", 0.35], ["schenken", 0.8], ["terug", 0.3]]
  };

  function fase() {
    if (!bereiding) return null;
    let t = bereiding.t;
    for (const [naam, duur] of FASEN[bereiding.methode]) {
      if (t < duur) return { naam, k: t / duur };
      t -= duur;
    }
    return null;
  }

  const lerp = (a, b, k) => a + (b - a) * k;
  const zacht = (k) => k * k * (3 - 2 * k);
  const HANDEN = { x: JX - 70, y: 300 };
  const BOVEN_GLAS = { x: SERVEER_X - 55, y: 300 };

  // Waar de mengbeker is: midden-onder (x, y) en hoe scheef
  function bekerPositie() {
    const f = fase();
    const thuis = { x: BEKER.x, y: BEKER.y, hoek: 0 };
    if (!f) return thuis;
    const k = zacht(f.k);
    if (f.naam === "naarJessy") return { x: lerp(thuis.x, HANDEN.x, k), y: lerp(thuis.y, HANDEN.y + 60, k), hoek: 0 };
    if (f.naam === "schudden") return { x: HANDEN.x + Math.sin(bereiding.t * 9) * 8, y: HANDEN.y + 60 + Math.sin(bereiding.t * 34) * 16, hoek: Math.sin(bereiding.t * 17) * 0.25 };
    if (f.naam === "naarGlas") {
      const van = bereiding.methode === "shaken" ? { x: HANDEN.x, y: HANDEN.y + 60 } : thuis;
      return { x: lerp(van.x, BOVEN_GLAS.x, k), y: lerp(van.y, BOVEN_GLAS.y + 60, k), hoek: lerp(0, 2.0, k) };
    }
    if (f.naam === "schenken") return { x: BOVEN_GLAS.x, y: BOVEN_GLAS.y + 60, hoek: 2.0 };
    if (f.naam === "terug") return { x: lerp(BOVEN_GLAS.x, thuis.x, k), y: lerp(BOVEN_GLAS.y + 60, thuis.y, k), hoek: lerp(2.0, 0, k) };
    return thuis;
  }

  function updateBereiding(dt) {
    bereiding.t += dt;
    bereiding.klok -= dt;
    const f = fase();
    if (!f) {
      bereiding = null;
      lagen = [];
      ijs = false;
      glasInhoud.vul = 1;
      toestand = "mixen";
      return;
    }
    if (f.naam === "schudden" && bereiding.klok <= 0) {
      Arcade.ruis({ duur: 0.05, volume: 0.12 });
      if (glasInhoud.ijs) Arcade.toon({ type: "triangle", van: 1800, duur: 0.03, volume: 0.05 });
      bereiding.klok = 0.11;
    } else if (f.naam === "roeren" && bereiding.klok <= 0) {
      Arcade.toon({ type: "triangle", van: 2300 + Math.random() * 300, duur: 0.04, volume: 0.06 });
      bereiding.klok = 0.18;
    } else if (f.naam === "schenken") {
      glasInhoud.vul = f.k;
      if (bereiding.klok <= 0) { glug(); bereiding.klok = 0.12; }
    }
  }

  // --- Serveren en proeven ---
  function kiesReactie(mix, basis) {
    const totaal = som(mix);
    if (totaal < 0.3) return "leeg";
    const ongevraagd = (id) => !(id in recept.delen) && (mix[id] || 0) >= 0.4;
    if (ongevraagd("tabasco")) return "vuur";
    const zuivel = (mix.melk || 0) + (mix.kwark || 0);
    const bruis = (mix.cola || 0) + (mix.tonic || 0) + (mix.bier || 0);
    if (zuivel >= 0.8 && bruis >= 0.8) return "boem";
    if (ongevraagd("creatine")) return "spieren";
    if (basis >= 90) return "perfect";
    if (basis >= 70) return "goed";
    if (basis >= 45) return "matig";
    const alcohol = Object.entries(mix).reduce((s, [id, d]) => s + d * DRANKEN[id].alc, 0) / totaal;
    if ((mix.curacao || 0) / totaal >= 0.35) return "blauw";
    if (alcohol >= 0.7) return "dronken";
    if ((mix.bier || 0) / totaal >= 0.5) return "boer";
    return "ziek";
  }

  function serveer() {
    const mix = glasInhoud.mix;
    const n = nauwkeurigheid(mix);
    const onderdelen = [
      ["GLAS", glas === recept.glas],
      ["IJS", glasInhoud.ijs === recept.ijs],
      [recept.methode === "shaken" ? "SHAKEN" : "ROEREN", glasInhoud.methode === recept.methode],
      ["GARNERING", garnering === recept.garnering]
    ];
    const mixPunten = Math.round(60 * n);
    const basis = mixPunten + 10 * onderdelen.filter((o) => o[1]).length;
    const bonus = n >= 0.5 ? Math.round(SNELHEIDSBONUS * Math.max(0, resterend) / limiet) : 0;
    const perfect = n >= 0.95 && onderdelen.every((o) => o[1]);
    reeks = perfect ? reeks + 1 : 0;
    const reeksBonus = reeks > 1 ? 10 * (reeks - 1) : 0;
    // Elk recept dat je (ongeveer) goed mixt, komt in je receptenboek. Ook als Jessy iets anders bestelde.
    const ontdekt = RECEPTEN.filter((r) => !boek.has(r.naam) && lijktOp(mix, r));
    ontdekt.forEach((r) => boek.add(r.naam));
    if (ontdekt.length) Arcade.bewaar(BOEK_SLEUTEL, [...boek]);
    const ontdekBonus = ontdekt.length * ONTDEK_BONUS;
    const ander = RECEPTEN.find((r) => r !== recept && lijktOp(mix, r));
    const punten = basis + bonus + reeksBonus + ontdekBonus;
    score += punten;
    proef = {
      t: 0, klok: 0, gedaan: new Set(), reactie: kiesReactie(mix, basis), mixPunten, onderdelen, bonus, reeksBonus, punten,
      ontdekBonus, ontdekt: ontdekt.map((r) => r.naam), ander: ander && ander.naam, tip: tipVoor(mix, onderdelen)
    };
    boekOpen = false;
    toestand = "proeven";
    schenk = null;
  }

  function eenmalig(sleutel, doe) {
    if (proef.gedaan.has(sleutel)) return;
    proef.gedaan.add(sleutel);
    doe();
  }

  function mond() {
    return { x: JX, y: HOOFD_Y + HOOFD_H * 0.5 };
  }

  function deeltje(soort, x, y, vx, vy, max, grootte, kleur, zwaarte = 0) {
    deeltjes.push({ soort, x, y, vx, vy, leeftijd: 0, max, grootte, kleur, zwaarte });
  }

  function updateProeven(dt) {
    proef.t += dt;
    proef.klok -= dt;
    const r = proef.t - PROEF_DUUR;
    if (proef.t > 0.5 && proef.t < 1.1 && proef.klok <= 0) { slurp(); proef.klok = 0.16; }
    if (r < 0) return;
    const soort = proef.reactie;
    const m = mond();
    eenmalig("start", () => {
      const info = REACTIES[soort];
      kreet(info.kreet, JX - 60, 70, info.kleur, true);
      geluidBijReactie(soort);
      zeg(info.zeg[Math.floor(Math.random() * info.zeg.length)]);
      if (soort === "perfect" && reeks > 1) kreet("PERFECTE REEKS X" + reeks, 633, 330, "#ff3ea5");
      if (soort === "perfect") Arcade.confetti(60);
      if (proef.ander) kreet("DAT IS EEN " + proef.ander + "!", 300, 250, "#3ef0ff");
    });
    if (proef.ontdekt.length && r >= 0.7) eenmalig("ontdekt", () => {
      kreet("NIEUW RECEPT ONTDEKT!", 300, 150, "#5fd35f", true);
      kreet(proef.ontdekt.join(" + ") + " IN JE BOEK", 300, 190, "#5fd35f");
      [784, 988, 1175, 1568].forEach((f, i) => Arcade.toon({ type: "triangle", van: f, duur: 0.15, volume: 0.08, vertraging: i * 0.08 }));
    });
    const kans = (perSec) => Math.random() < perSec * dt;
    if (soort === "perfect" && kans(10)) {
      deeltje(Math.random() < 0.5 ? "hart" : "ster", JX + (Math.random() - 0.5) * 140, 260, (Math.random() - 0.5) * 40, -90 - Math.random() * 60, 1.4, 16, "#ff3ea5");
    } else if (soort === "vuur" && r > 0.15 && r < 2.2 && kans(70)) {
      deeltje("vuur", m.x - 20, m.y, -260 - Math.random() * 200, (Math.random() - 0.5) * 90, 0.6, 10 + Math.random() * 12, Math.random() < 0.5 ? "#ff9800" : "#ffe14d");
    } else if (soort === "vuur" && r >= 2.2 && kans(12)) {
      deeltje("rook", m.x - 10, m.y - 10, -30, -60, 1.2, 12, "#777");
    } else if (soort === "boer" && r > 0.1 && r < 1.2 && kans(25)) {
      deeltje("wolk", m.x - 10, m.y, -90 - Math.random() * 80, (Math.random() - 0.5) * 40, 1.3, 14 + Math.random() * 10, "rgba(140, 200, 60, 0.6)");
    } else if (soort === "leeg" && kans(20)) {
      const kant = Math.random() < 0.5 ? -1 : 1;
      deeltje("stoom", JX + kant * HOOFD_B, HOOFD_Y, kant * 60, -80, 0.8, 10, "rgba(255,255,255,0.8)");
    } else if (soort === "boem" && r > 0.8 && kans(10)) {
      deeltje("rook", JX + (Math.random() - 0.5) * 70, HOOFD_Y - HOOFD_H + 10, (Math.random() - 0.5) * 30, -50, 1.4, 12, "#555");
    } else if (soort === "blauw" && kans(5)) {
      deeltje("sneeuw", JX + (Math.random() - 0.5) * 160, 60, 0, 60, 2, 14, "#fff");
    } else if (soort === "ziek" && r > 1 && r < 1.6 && kans(40)) {
      deeltje("spuug", m.x - 10, m.y, -80 - Math.random() * 120, -40, 1, 7, "#9ccc65", 500);
    } else if (soort === "spieren" && r < 0.9 && kans(15)) {
      deeltje("ster", JX + (Math.random() - 0.5) * 200, 300 + (Math.random() - 0.5) * 120, 0, -40, 0.6, 14, "#3ef0ff");
    }
    if (soort === "boem") {
      eenmalig("knal", () => {
        if (r < 0.5) { proef.gedaan.delete("knal"); return; }
        flits = 0.35;
        schud = 0.6;
        Arcade.ruis({ duur: 1.1, volume: 0.5 });
        Arcade.toon({ type: "sine", van: 90, naar: 30, duur: 0.9, volume: 0.4 });
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 100 + Math.random() * 300;
          deeltje("vuur", JX, HOOFD_Y + 20, Math.cos(a) * v, Math.sin(a) * v, 0.7, 10 + Math.random() * 10, Math.random() < 0.5 ? "#ff9800" : "#fff59d");
        }
      });
    }
    if (soort === "dronken") {
      [0.3, 0.9, 1.4].forEach((w, i) => {
        if (r >= w) eenmalig("hik" + i, () => {
          Arcade.toon({ type: "sine", van: 600, naar: 950, duur: 0.08, volume: 0.12 });
          kreet("HIK!", JX + 70 - i * 20, 100 + i * 15, "#ff7ab8");
        });
      });
      if (r >= 2.15) eenmalig("plof", () => {
        Arcade.toon({ type: "sine", van: 110, naar: 40, duur: 0.35, volume: 0.35 });
        Arcade.ruis({ duur: 0.25, volume: 0.25 });
        schud = 0.3;
        kreet("*PLOF*", JX, 380, "#fff");
      });
    }
    const duur = soort === "dronken" ? REACTIE_DUUR + 0.6 : REACTIE_DUUR;
    if (r >= duur) volgende();
  }

  function volgende() {
    boekOpen = false;
    nummer++;
    if (nummer >= AANTAL_BESTELLINGEN) einde();
    else {
      nieuweBestelling();
      toestand = "mixen";
      Arcade.toon({ type: "square", van: 880, naar: 1320, duur: 0.08, volume: 0.06 });
    }
  }

  function einde() {
    toestand = "einde";
    sinds = tijd;
    if (score > record) {
      record = score;
      nieuwRecord = true;
      Arcade.bewaar(RECORD_SLEUTEL, record);
    }
    Arcade.confetti(80);
    Arcade.vraagNaam("bartender", score);
  }

  // --- Besturing ---
  function punt(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }

  function fleskOp(p) {
    return FLESSEN.find((f) => Math.abs(p.x - f.x) < 30 && p.y > f.y - 92 && p.y < f.y + 6);
  }
  function glasOp(p) {
    return GLAZEN.find((g) => Math.abs(p.x - g.x) < 32 && p.y > TOOG - 100 && p.y < TOOG + 18);
  }
  function knopOp(p) {
    return KNOPPEN.find((k) => p.x >= k.x && p.x <= k.x + k.w && p.y >= k.y && p.y <= k.y + k.h);
  }
  function ijsemmerOp(p) {
    return Math.abs(p.x - IJSEMMER.x) < 32 && p.y > TOOG - 50 && p.y < TOOG + 10;
  }

  function druk(p) {
    if (toestand === "klaar") { toestand = "mixen"; return; }
    if (toestand === "einde") {
      if (tijd - sinds > 1.2) { nieuwSpel(); toestand = "mixen"; }
      return;
    }
    if (toestand === "proeven") {
      if (proef.t > PROEF_DUUR + 1.2) volgende();
      return;
    }
    if (toestand !== "mixen") return;
    if (boekOpen) { boekOpen = false; return; }
    const knop = knopOp(p);
    if (knop) return drukKnop(knop);
    if (ijsemmerOp(p)) return drukKnop(KNOPPEN[0]);
    const g = glasOp(p);
    if (g) {
      if (glasInhoud) kreet("ER ZIT AL DRANK IN", SERVEER_X, 330, "#ffb74d");
      else { glas = g.id; klink(); }
      return;
    }
    const fles = fleskOp(p);
    if (fles) {
      if (glasInhoud) { kreet("EERST SERVEREN OF WEGGOOIEN", 300, 420, "#ffb74d"); return; }
      schenk = { id: fles.id, van: fles, t: 0, klok: 0, over: false };
    }
  }

  function los() {
    schenk = null;
  }

  canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); druk(punt(e)); });
  canvas.addEventListener("pointermove", (e) => {
    muis = punt(e);
    const klikbaar = toestand !== "mixen" || boekOpen || knopOp(muis) || fleskOp(muis) || glasOp(muis) || ijsemmerOp(muis);
    canvas.style.cursor = klikbaar ? "pointer" : "default";
  });
  canvas.addEventListener("pointerleave", () => { muis = { x: -1, y: -1 }; });
  window.addEventListener("pointerup", los);
  window.addEventListener("pointercancel", los);
  window.addEventListener("blur", los);
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (!e.repeat && toestand !== "mixen") druk({ x: -1, y: -1 });
    } else if (e.code === "KeyM") Arcade.zetStil(!Arcade.isStil());
    else if (e.code === "KeyB" && toestand === "mixen") boekOpen = !boekOpen;
  });

  // --- Bijwerken ---
  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    flits = Math.max(0, flits - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 1.6);
    deeltjes.forEach((d) => {
      d.leeftijd += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += d.zwaarte * dt;
    });
    deeltjes = deeltjes.filter((d) => d.leeftijd < d.max);

    if (toestand === "mixen" || toestand === "bereiden") resterend -= dt;
    if (toestand === "bereiden") updateBereiding(dt);
    if (toestand === "proeven") updateProeven(dt);
    if (toestand === "mixen" && schenk) {
      schenk.t += dt;
      if (schenk.t < SCHENK_START) return;
      const vol = som(inhoud());
      if (vol >= MAX_DELEN) {
        if (!schenk.over) {
          schenk.over = true;
          kreet("OVERLOOP!", BEKER.x, 300, "#ff5a5a");
          Arcade.ruis({ duur: 0.3, volume: 0.15 });
        }
        return;
      }
      const erbij = Math.min(dt * SCHENK_SNELHEID, MAX_DELEN - vol);
      const laatste = lagen[lagen.length - 1];
      if (laatste && laatste.id === schenk.id) laatste.delen += erbij;
      else lagen.push({ id: schenk.id, delen: erbij });
      schenk.klok -= dt;
      if (schenk.klok <= 0) { glug(); schenk.klok = 0.11; }
    }
  }

  // --- Tekenen: de bar ---
  function tekenAchtergrond() {
    c.fillStyle = "#3a1810";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#33150e";
    for (let x = 0; x < W; x += 48) c.fillRect(x, 0, 24, TOOG);
    // Spiegel achter de flessen
    c.fillStyle = "#2a3a44";
    c.fillRect(14, 18, 486, 330);
    c.fillStyle = "rgba(255, 255, 255, 0.06)";
    c.beginPath();
    c.moveTo(60, 18); c.lineTo(140, 18); c.lineTo(40, 348); c.lineTo(14, 348); c.lineTo(14, 160);
    c.fill();
    // Lampjes
    for (let x = 30; x < 500; x += 40) {
      c.fillStyle = Math.floor(tijd * 2 + x / 40) % 6 === 0 ? "#fff59d" : "#ffca28";
      c.beginPath();
      c.arc(x, 12, 4, 0, Math.PI * 2);
      c.fill();
    }
    // Planken
    SCHAPPEN_Y.forEach((y) => {
      c.fillStyle = "#6d4c2e";
      c.fillRect(10, y, 494, 14);
      c.fillStyle = "#c9a227";
      c.fillRect(10, y, 494, 3);
    });
  }

  function tekenFles(id, x, y, hoek = 0, oplichten = false) {
    const d = DRANKEN[id];
    const hoog = flesHoogte(id);
    c.save();
    c.translate(x, y - hoog / 2);
    c.rotate(hoek);
    c.translate(0, hoog / 2);
    if (oplichten) { c.shadowColor = "#ffe14d"; c.shadowBlur = 18; }
    if (d.vorm === "fles" || d.vorm === "vierkant" || d.vorm === "klein") {
      const b = d.vorm === "vierkant" ? 17 : d.vorm === "klein" ? 9 : 14;
      const lijf = d.vorm === "vierkant" ? 54 : d.vorm === "klein" ? 34 : 58;
      const hals = d.vorm === "vierkant" ? 14 : d.vorm === "klein" ? 10 : 22;
      c.fillStyle = d.glas;
      c.beginPath();
      c.roundRect(-b, -lijf, b * 2, lijf, d.vorm === "vierkant" ? 3 : 6);
      c.fill();
      c.shadowBlur = 0;
      c.fillRect(-b * 0.4, -lijf - hals, b * 0.8, hals + 2);
      // De drank in de fles
      c.fillStyle = d.kleur;
      c.fillRect(-b + 3, -lijf * 0.8, b * 2 - 6, lijf * 0.8 - 3);
      // Etiket
      c.fillStyle = "#f5ecd7";
      c.fillRect(-b + 3, -lijf * 0.62, b * 2 - 6, lijf * 0.3);
      c.fillStyle = d.kleur === "#eef6ff" || d.kleur === "#f2fff9" || d.kleur === "#e6fff4" ? "#c62828" : d.kleur;
      c.fillRect(-b + 6, -lijf * 0.53, b * 2 - 12, lijf * 0.12);
      // Dop
      c.fillStyle = id === "tabasco" ? "#2e7d32" : "#c9a227";
      c.fillRect(-b * 0.4 - 1, -lijf - hals - 5, b * 0.8 + 2, 6);
      // Glans
      c.fillStyle = "rgba(255, 255, 255, 0.35)";
      c.fillRect(-b + 3, -lijf + 4, 3, lijf * 0.75);
    } else if (d.vorm === "pak") {
      c.fillStyle = "#fafafa";
      c.fillRect(-16, -62, 32, 62);
      c.shadowBlur = 0;
      c.beginPath();
      c.moveTo(-16, -62); c.lineTo(0, -76); c.lineTo(16, -62);
      c.fill();
      c.fillStyle = "#ddd";
      c.fillRect(-3, -80, 6, 6);
      c.fillStyle = d.kleur;
      c.fillRect(-16, -40, 32, 26);
      c.font = "18px serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(d.icoon, 0, -27);
    } else if (d.vorm === "pot") {
      c.fillStyle = id === "creatine" ? "#212121" : "#fafafa";
      c.beginPath();
      c.roundRect(-18, -42, 36, 42, 5);
      c.fill();
      c.shadowBlur = 0;
      c.fillStyle = d.deksel;
      c.fillRect(-20, -50, 40, 9);
      if (id === "creatine") {
        tekst("C", 0, -22, 14, "#ff3e5a");
      } else {
        c.fillStyle = "#1e88e5";
        c.fillRect(-18, -30, 36, 12);
        tekst("Q", 0, -24, 8, "#fff");
      }
    }
    c.restore();
  }

  function flesHoogte(id) {
    const v = DRANKEN[id].vorm;
    return v === "vierkant" ? 74 : v === "klein" ? 50 : v === "pak" ? 80 : v === "pot" ? 50 : 86;
  }

  function tekenFlessen() {
    const over = toestand === "mixen" && !schenk ? fleskOp(muis) : null;
    FLESSEN.forEach((f) => {
      if (schenk && schenk.van === f) return; // die is aan het schenken
      tekenFles(f.id, f.x, f.y, 0, over === f);
      tekst(DRANKEN[f.id].kort, f.x, f.y + 8, 6, "#f5ecd7");
    });
    if (over) {
      const naam = DRANKEN[over.id].naam;
      tekst(naam, over.x, over.y - 100, 10, "#ffe14d");
    }
  }

  // De fles die nu schenkt: van de plank naar boven de beker, gekanteld
  function tekenSchenkendeFles() {
    if (!schenk) return;
    const k = zacht(Math.min(1, schenk.t / SCHENK_START));
    const hoog = flesHoogte(schenk.id);
    const hoek = 2.3 * k;
    const tip = { x: BEKER.x - 8, y: 300 };
    const doelX = tip.x - (hoog / 2) * Math.sin(2.3);
    const doelY = tip.y + (hoog / 2) * Math.cos(2.3) + hoog / 2;
    const x = lerp(schenk.van.x, doelX, k);
    const y = lerp(schenk.van.y, doelY, k);
    tekenFles(schenk.id, x, y, hoek, true);
    if (k >= 1 && !schenk.over) {
      const niveau = BEKER.y - 8 - som(inhoud()) * 11;
      c.fillStyle = DRANKEN[schenk.id].kleur;
      c.fillRect(tip.x - 2, tip.y, 5, Math.max(0, niveau - tip.y));
    }
  }

  function tekenMengbeker() {
    const p = bekerPositie();
    const f = fase();
    c.save();
    c.translate(p.x, p.y - 60);
    c.rotate(p.hoek);
    c.translate(0, 60);
    // Glas
    c.fillStyle = "rgba(200, 230, 255, 0.18)";
    c.beginPath();
    c.roundRect(-28, -122, 56, 122, 6);
    c.fill();
    // Inhoud: laagjes, of al gemengd als hij geshaked/geroerd wordt
    let vulFactor = 1;
    if (f && f.naam === "schenken") vulFactor = 1 - f.k;
    else if (f && f.naam === "terug") vulFactor = 0;
    let y = -8;
    if (bereiding && glasInhoud) {
      const h = glasInhoud.totaal * 11 * vulFactor;
      c.fillStyle = glasInhoud.kleur;
      c.fillRect(-25, y - h, 50, h);
    } else {
      lagen.forEach((l) => {
        const h = l.delen * 11;
        c.fillStyle = DRANKEN[l.id].kleur;
        c.fillRect(-25, y - h, 50, h);
        y -= h;
      });
    }
    // IJsblokjes
    const metIjs = bereiding && glasInhoud ? glasInhoud.ijs && vulFactor > 0.3 : ijs;
    if (metIjs) {
      c.fillStyle = "rgba(230, 250, 255, 0.85)";
      [[-16, -20], [4, -26], [-6, -40], [12, -14]].forEach(([ix, iy]) => c.fillRect(ix, iy, 11, 11));
    }
    // Maatstreepjes: 1 per deel
    c.fillStyle = "rgba(255, 255, 255, 0.55)";
    for (let i = 1; i <= MAX_DELEN; i++) c.fillRect(19, -8 - i * 11, i % 5 === 0 ? 9 : 5, 2);
    c.strokeStyle = "rgba(255, 255, 255, 0.7)";
    c.lineWidth = 3;
    c.beginPath();
    c.roundRect(-28, -122, 56, 122, 6);
    c.stroke();
    // Deksel bij het shaken
    if (f && (f.naam === "naarJessy" || f.naam === "schudden")) {
      c.fillStyle = "#b0bec5";
      c.beginPath();
      c.roundRect(-30, -140, 60, 22, 4);
      c.fill();
      c.fillStyle = "#cfd8dc";
      c.fillRect(-10, -150, 20, 12);
    }
    // Lepel bij het roeren
    if (f && f.naam === "roeren") {
      const lx = Math.sin(bereiding.t * 14) * 14;
      c.strokeStyle = "#cfd8dc";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(lx, -20);
      c.lineTo(lx * 0.4, -160);
      c.stroke();
    }
    c.restore();
    // Straal naar het glas
    if (f && f.naam === "schenken" && f.k < 0.95) {
      const g = GLAS[glas];
      const top = TOOG + g.binnen[0][1];
      c.fillStyle = glasInhoud.kleur;
      c.fillRect(SERVEER_X - 3, 322, 6, Math.max(0, top + 20 - 322));
    }
  }

  // --- Glazen ---
  function glasPad(g, x, y) {
    c.beginPath();
    g.binnen.forEach(([px, py], i) => (i ? c.lineTo(x + px, y + py) : c.moveTo(x + px, y + py)));
    c.closePath();
  }

  function tekenGlas(id, x, y, opties = {}) {
    const g = GLAS[id];
    const { vul = 0, kleur, metIjs = false, garn = "geen", hoek = 0, oplichten = false } = opties;
    c.save();
    c.translate(x, y);
    c.rotate(hoek);
    if (oplichten) { c.shadowColor = "#ffe14d"; c.shadowBlur = 16; }
    // Voet en steel van het cocktailglas
    if (id === "cocktail") {
      c.fillStyle = "rgba(220, 240, 255, 0.6)";
      c.fillRect(-2, -38, 4, 36);
      c.fillRect(-16, -4, 32, 4);
    }
    c.fillStyle = "rgba(220, 240, 255, 0.2)";
    glasPad(g, 0, 0);
    c.fill();
    c.shadowBlur = 0;
    // Drank
    const boven = g.binnen[0][1];
    const onder = Math.max(...g.binnen.map((p) => p[1]));
    if (vul > 0.01) {
      c.save();
      glasPad(g, 0, 0);
      c.clip();
      const niveau = onder - (onder - boven) * 0.9 * vul;
      c.fillStyle = kleur;
      c.fillRect(-40, niveau, 80, onder - niveau + 2);
      if (metIjs) {
        c.fillStyle = "rgba(230, 250, 255, 0.75)";
        const s = id === "shot" ? 6 : 10;
        [[-0.5, 0.35], [0.1, 0.5], [-0.2, 0.7]].forEach(([fx, fy]) => c.fillRect(fx * (g.binnen[1][0] - 4), onder - (onder - boven) * fy, s, s));
      }
      c.restore();
    }
    c.strokeStyle = "rgba(255, 255, 255, 0.75)";
    c.lineWidth = 2;
    glasPad(g, 0, 0);
    c.stroke();
    tekenGarnering(garn, g.binnen[1][0], boven);
    c.restore();
  }

  function tekenGarnering(soort, rx, ry) {
    if (soort === "limoen" || soort === "sinas") {
      c.fillStyle = soort === "limoen" ? "#558b2f" : "#ef6c00";
      c.beginPath();
      c.arc(rx, ry, 12, Math.PI, 0);
      c.fill();
      c.fillStyle = soort === "limoen" ? "#c5e1a5" : "#ffcc80";
      c.beginPath();
      c.arc(rx, ry, 9, Math.PI, 0);
      c.fill();
      c.strokeStyle = soort === "limoen" ? "#8bc34a" : "#ffa726";
      c.lineWidth = 1;
      for (let a = 1; a < 4; a++) {
        c.beginPath();
        c.moveTo(rx, ry);
        c.lineTo(rx + Math.cos(Math.PI + a * Math.PI / 4) * 9, ry + Math.sin(Math.PI + a * Math.PI / 4) * 9);
        c.stroke();
      }
    } else if (soort === "kers") {
      c.strokeStyle = "#5d4037";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(rx - 2, ry - 4);
      c.quadraticCurveTo(rx + 2, ry - 18, rx + 8, ry - 20);
      c.stroke();
      c.fillStyle = "#d50000";
      c.beginPath();
      c.arc(rx - 2, ry - 2, 6, 0, Math.PI * 2);
      c.fill();
    } else if (soort === "olijf") {
      c.strokeStyle = "#d7b98e";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(rx - 14, ry + 14);
      c.lineTo(rx + 8, ry - 14);
      c.stroke();
      c.fillStyle = "#7cb342";
      c.beginPath();
      c.ellipse(rx - 4, ry, 6, 5, -0.9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#e53935";
      c.fillRect(rx - 6, ry - 2, 3, 3);
    } else if (soort === "parasol") {
      c.strokeStyle = "#8d6e63";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(rx - 6, ry + 10);
      c.lineTo(rx + 6, ry - 20);
      c.stroke();
      ["#ff3ea5", "#ffe14d", "#3ef0ff"].forEach((kl, i) => {
        c.fillStyle = kl;
        c.beginPath();
        c.moveTo(rx + 6, ry - 22);
        c.arc(rx + 6, ry - 20, 16, Math.PI + i * Math.PI / 3 - 0.2, Math.PI + (i + 1) * Math.PI / 3 - 0.2);
        c.fill();
      });
    }
  }

  function tekenToog() {
    // Bovenblad
    c.fillStyle = "#8d5a2b";
    c.fillRect(0, TOOG, W, 20);
    c.fillStyle = "#c9a227";
    c.fillRect(0, TOOG, W, 3);
    // Voorkant
    c.fillStyle = "#5a3418";
    c.fillRect(0, TOOG + 20, W, H - TOOG - 20);
    c.fillStyle = "#4a2a12";
    for (let x = 0; x < W; x += 80) c.fillRect(x, TOOG + 20, 4, H - TOOG - 20);
  }

  function tekenSpullenOpToog() {
    // De glazen waaruit je kiest
    const over = toestand === "mixen" ? glasOp(muis) : null;
    GLAZEN.forEach((g) => {
      if (glas === g.id) {
        c.strokeStyle = "rgba(255, 255, 255, 0.25)";
        c.setLineDash([4, 4]);
        c.strokeRect(g.x - 20, TOOG - 40, 40, 38);
        c.setLineDash([]);
      } else tekenGlas(g.id, g.x, TOOG, { oplichten: over === g });
      tekst(g.kort, g.x, TOOG + 11, 6, "#f5ecd7");
    });
    if (over) tekst(over.naam, over.x + 10, TOOG - 110, 10, "#ffe14d");
    // IJsemmer
    const x = IJSEMMER.x;
    c.fillStyle = "#90a4ae";
    c.beginPath();
    c.moveTo(x - 26, TOOG - 44); c.lineTo(x + 26, TOOG - 44); c.lineTo(x + 20, TOOG); c.lineTo(x - 20, TOOG);
    c.fill();
    c.fillStyle = "rgba(230, 250, 255, 0.9)";
    [[-18, -54], [-4, -58], [8, -52]].forEach(([ix, iy]) => c.fillRect(x + ix, TOOG + iy, 12, 12));
    c.fillStyle = "#cfd8dc";
    c.fillRect(x - 26, TOOG - 44, 52, 5);
    tekst("IJS", x, TOOG + 11, 6, "#f5ecd7");
    if (ijsemmerOp(muis) && toestand === "mixen") tekst(ijs ? "IJS ERUIT" : "IJS ERIN", x, TOOG - 74, 10, "#ffe14d");
  }

  function geserveerdGlasPositie() {
    if (toestand !== "proeven") return { x: SERVEER_X, y: TOOG, hoek: 0, vul: glasInhoud ? glasInhoud.vul : 0 };
    const t = proef.t;
    const g = GLAS[glas];
    const hoogte = -g.binnen[0][1];
    const mondPlek = { x: JX - 40, y: HOOFD_Y + HOOFD_H * 0.5 + hoogte * 0.8 };
    if (t < 0.5) {
      const k = zacht(t / 0.5);
      return { x: lerp(SERVEER_X, mondPlek.x, k), y: lerp(TOOG, mondPlek.y, k), hoek: 0.7 * k, vul: 1 };
    }
    if (t < 1.1) return { x: mondPlek.x, y: mondPlek.y, hoek: 0.7 + (t - 0.5) * 0.8, vul: 1 - (t - 0.5) / 0.6 };
    const k = zacht(Math.min(1, (t - 1.1) / 0.3));
    return { x: lerp(mondPlek.x, SERVEER_X, k), y: lerp(mondPlek.y, TOOG, k), hoek: lerp(1.18, 0, k), vul: 0 };
  }

  function tekenGeserveerdGlas() {
    if (!glas) return;
    const p = geserveerdGlasPositie();
    tekenGlas(glas, p.x, p.y, {
      vul: glasInhoud ? p.vul * Math.min(1, glasInhoud.totaal / 7) : 0,
      kleur: glasInhoud ? glasInhoud.kleur : "#fff",
      metIjs: glasInhoud && glasInhoud.ijs,
      garn: garnering,
      hoek: p.hoek
    });
  }

  // --- Barman Jessy ---
  function pose() {
    const p = { dx: 0, dy: 0, hoek: 0, val: 0, tint: null, arm: 14, breed: 0, roet: 0, handL: { x: JX - 66, y: TOOG + 4 }, handR: { x: JX + 66, y: TOOG + 4 }, duim: false };
    p.dy = Math.sin(tijd * 2) * 1.5; // ademhalen
    const f = fase();
    if (f && (f.naam === "naarJessy" || f.naam === "schudden")) {
      const b = bekerPositie();
      p.handL = { x: b.x - 26, y: b.y - 40 };
      p.handR = { x: b.x + 26, y: b.y - 80 };
    }
    if (toestand !== "proeven") return p;
    const t = proef.t;
    if (t < PROEF_DUUR) {
      const gp = geserveerdGlasPositie();
      if (t < 1.25) p.handL = { x: gp.x, y: gp.y - 30 };
      p.hoek = t > 0.5 && t < 1.1 ? -0.12 : 0;
      return p;
    }
    const r = t - PROEF_DUUR;
    const soort = proef.reactie;
    if (soort === "perfect") {
      p.dy = -Math.abs(Math.sin(r * 9)) * 18;
      p.hoek = Math.sin(r * 9) * 0.12;
      p.handL = { x: JX - 80, y: 200 + Math.sin(r * 9) * 20 };
      p.handR = { x: JX + 80, y: 200 - Math.sin(r * 9) * 20 };
    } else if (soort === "goed") {
      p.dy = -Math.abs(Math.sin(r * 6)) * 6;
      p.handR = { x: JX + 82, y: 250 };
      p.duim = true;
    } else if (soort === "matig") {
      p.hoek = r < 1.6 ? Math.sin(r * 12) * 0.13 : 0;
    } else if (soort === "ziek") {
      p.tint = `rgba(90, 210, 60, ${Math.min(0.55, r * 0.4)})`;
      p.hoek = Math.sin(r * 3) * 0.12;
      p.dx = Math.sin(r * 2.3) * 6;
      p.handR = { x: JX + 30, y: 300 }; // hand op de buik
    } else if (soort === "vuur") {
      p.tint = `rgba(255, 40, 0, ${Math.min(0.5, r * 0.8)})`;
      p.dx = r < 2.2 ? (Math.random() - 0.5) * 6 : 0;
      p.hoek = -0.15;
      p.handL = { x: JX - 40, y: 230 };
      p.handR = { x: JX + 40, y: 230 };
    } else if (soort === "boem") {
      p.roet = r > 0.5 ? 0.78 : 0;
      p.dx = r > 0.5 && r < 1 ? (Math.random() - 0.5) * 12 : 0;
      if (r > 0.5) { p.handL = { x: JX - 90, y: 210 }; p.handR = { x: JX + 90, y: 210 }; }
    } else if (soort === "spieren") {
      const k = Math.min(1, r / 0.8);
      p.arm = 14 + k * 26;
      p.breed = k * 26;
      p.handL = { x: JX - 100 - k * 10, y: 230 - k * 40 };
      p.handR = { x: JX + 100 + k * 10, y: 230 - k * 40 };
      p.spierballen = k;
    } else if (soort === "blauw") {
      p.tint = `rgba(40, 120, 255, ${Math.min(0.6, r * 0.7)})`;
      p.dx = (Math.random() - 0.5) * 4;
      p.handL = { x: JX - 20, y: 310 };
      p.handR = { x: JX + 20, y: 310 };
    } else if (soort === "dronken") {
      p.tint = `rgba(255, 60, 90, ${Math.min(0.35, r * 0.4)})`;
      p.hoek = Math.sin(r * 4) * 0.18;
      p.dx = Math.sin(r * 2.7) * 12;
      if (r > 1.6) p.val = Math.min(1.5, (r - 1.6) * (r - 1.6) * 5);
    } else if (soort === "boer") {
      p.hoek = r < 1.2 ? -0.18 : 0;
      p.dy = r < 1.2 ? 4 : 0;
    } else if (soort === "leeg") {
      p.tint = `rgba(255, 30, 30, ${Math.min(0.45, r * 0.6)})`;
      p.dx = (Math.random() - 0.5) * 5;
      p.handL = { x: JX - 70, y: 230 };
      p.handR = { x: JX + 70, y: 230 };
    }
    return p;
  }

  // Een sierlijke krulsnor
  function tekenSnor(x, y, b) {
    c.save();
    c.translate(x, y);
    c.fillStyle = "#3b2412";
    c.strokeStyle = "#1e1209";
    c.lineWidth = 2;
    for (const kant of [-1, 1]) {
      c.save();
      c.scale(kant, 1);
      c.beginPath();
      c.moveTo(0, -b * 0.06);
      c.bezierCurveTo(b * 0.25, -b * 0.22, b * 0.5, -b * 0.1, b * 0.62, 0);
      c.bezierCurveTo(b * 0.74, b * 0.06, b * 0.84, -b * 0.02, b * 0.8, -b * 0.2);
      c.bezierCurveTo(b * 0.96, -b * 0.02, b * 0.78, b * 0.22, b * 0.52, b * 0.17);
      c.bezierCurveTo(b * 0.3, b * 0.13, b * 0.12, b * 0.17, 0, b * 0.08);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }
    c.restore();
  }

  function tekenHoofd(x, y, p) {
    c.save();
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.ellipse(x, y, HOOFD_B + 3, HOOFD_H + 3, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(x, y, HOOFD_B, HOOFD_H, 0, 0, Math.PI * 2);
    c.clip();
    // De foto wordt uitgerekt: zo krijg je dat lange barmanshoofd
    if (gezicht && gezicht.complete && gezicht.naturalWidth) c.drawImage(gezicht, x - HOOFD_B, y - HOOFD_H, HOOFD_B * 2, HOOFD_H * 2);
    if (p.tint) {
      c.fillStyle = p.tint;
      c.fillRect(x - HOOFD_B, y - HOOFD_H, HOOFD_B * 2, HOOFD_H * 2);
    }
    if (p.roet) {
      c.fillStyle = `rgba(20, 20, 20, ${p.roet})`;
      c.fillRect(x - HOOFD_B, y - HOOFD_H, HOOFD_B * 2, HOOFD_H * 2);
      // Witte oogjes in het roet
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(x - 15, y - 8, 6, 0, Math.PI * 2);
      c.arc(x + 15, y - 8, 6, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    tekenSnor(x, y + HOOFD_H * 0.37, HOOFD_B * 0.62);
    // Haar recht overeind na de knal
    if (p.roet) {
      c.strokeStyle = "#222";
      c.lineWidth = 3;
      for (let i = -4; i <= 4; i++) {
        c.beginPath();
        c.moveTo(x + i * 9, y - HOOFD_H + 6);
        c.lineTo(x + i * 13, y - HOOFD_H - 22 - (i % 2) * 8);
        c.stroke();
      }
    }
  }

  function tekenJessy() {
    const p = pose();
    const x = JX + p.dx;
    c.save();
    // Bij omvallen kantelt hij achterover, achter de bar
    c.translate(JX, H);
    c.rotate(p.val);
    c.translate(-JX, -H);
    c.translate(0, p.dy);
    const b = 52 + p.breed;
    // Lang lijf: wit overhemd met rood gilet
    c.fillStyle = "#f5f5f5";
    c.beginPath();
    c.roundRect(x - b, 238, b * 2, 230, 18);
    c.fill();
    c.fillStyle = "#b71c1c";
    c.beginPath();
    c.moveTo(x - b + 6, 252); c.lineTo(x - 8, 300); c.lineTo(x - 8, 470); c.lineTo(x - b + 6, 470);
    c.fill();
    c.beginPath();
    c.moveTo(x + b - 6, 252); c.lineTo(x + 8, 300); c.lineTo(x + 8, 470); c.lineTo(x + b - 6, 470);
    c.fill();
    c.fillStyle = "#ffd54f";
    [320, 350, 380, 410].forEach((by) => c.fillRect(x - 3, by, 6, 6));
    // Nek en strikje
    c.fillStyle = "#e8b48a";
    c.fillRect(x - 14, HOOFD_Y + HOOFD_H - 12, 28, 238 - (HOOFD_Y + HOOFD_H) + 16);
    c.fillStyle = "#111";
    c.beginPath();
    c.moveTo(x, 248); c.lineTo(x - 20, 238); c.lineTo(x - 20, 258);
    c.moveTo(x, 248); c.lineTo(x + 20, 238); c.lineTo(x + 20, 258);
    c.fill();
    c.fillRect(x - 5, 243, 10, 10);
    // Armen (witte mouwen) en handen
    c.strokeStyle = "#f5f5f5";
    c.lineWidth = p.arm;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x - b + 8, 268); c.lineTo(p.handL.x, p.handL.y);
    c.moveTo(x + b - 8, 268); c.lineTo(p.handR.x, p.handR.y);
    c.stroke();
    c.fillStyle = "#e8b48a";
    [p.handL, p.handR].forEach((h) => {
      c.beginPath();
      c.arc(h.x, h.y, 9 + p.arm * 0.15, 0, Math.PI * 2);
      c.fill();
    });
    if (p.spierballen) {
      // Opgepompte biceps halverwege de armen
      c.fillStyle = "#f5f5f5";
      [[x - b + 8, p.handL], [x + b - 8, p.handR]].forEach(([sx, h]) => {
        c.beginPath();
        c.arc((sx + h.x) / 2, (268 + h.y) / 2 - 8 * p.spierballen, p.arm * 0.75, 0, Math.PI * 2);
        c.fill();
      });
    }
    if (p.duim) {
      c.font = "34px serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("👍", p.handR.x, p.handR.y - 10);
    }
    // Hoofd, kan een beetje kantelen rond de nek
    c.save();
    c.translate(x, 230);
    c.rotate(p.hoek);
    c.translate(-x, -230);
    tekenHoofd(x, HOOFD_Y, p);
    c.restore();
    c.restore();
  }

  // --- Krijtbord met de bestelling ---
  function tekenKrijtbord() {
    const x = 520, y = 18, w = 226, h = 300;
    c.fillStyle = "#6d4c2e";
    c.fillRect(x, y, w, h);
    c.fillStyle = "#1f2b24";
    c.fillRect(x + 8, y + 8, w - 16, h - 16);
    const mx = x + w / 2;
    if (toestand === "proeven" && proef.t > PROEF_DUUR + 0.2) return tekenBeoordeling(x, y, w);
    tekst("BESTELLING " + (nummer + 1) + "/" + AANTAL_BESTELLINGEN, mx, y + 24, 8, "#ffe14d");
    tekst("JESSY WIL EEN...", mx, y + 42, 7, "#ddd");
    tekst(recept.naam, mx, y + 62, recept.naam.length > 13 ? 9 : 12, "#fff");
    if (boek.has(recept.naam)) {
      // Dit recept ken je al: het staat in je boek
      let ry = y + 90;
      for (const [id, delen] of Object.entries(recept.delen)) {
        c.fillStyle = DRANKEN[id].kleur;
        c.fillRect(x + 20, ry - 6, 12, 12);
        tekst(delen + " " + DRANKEN[id].naam, x + 40, ry, 8, "#e8e8e8", "left");
        ry += 19;
      }
      ry = Math.max(ry + 2, y + 174);
      tekst(recept.ijs ? "+ IJS" : "ZONDER IJS", x + 20, ry, 7, "#9be7ff", "left");
      tekst(recept.methode === "shaken" ? "SHAKEN" : "ROEREN", x + 20, ry + 15, 7, "#9be7ff", "left");
      tekst(GLAS[recept.glas].naam, x + 20, ry + 30, 7, "#9be7ff", "left");
      tekst(GARNERINGEN[recept.garnering], x + 20, ry + 45, 7, "#9be7ff", "left");
    } else {
      // Onbekend recept: zelf uitzoeken
      tekst("???", mx, y + 110, 26, "#ffe14d");
      tekst("NOG NIET IN JE BOEK", mx, y + 150, 7, "#ff9ec7");
      tekst(Object.keys(recept.delen).length + " INGREDIENTEN", mx, y + 175, 8, "#9be7ff");
      tekst("PROBEER MAAR!", mx, y + 200, 8, "#e8e8e8");
      tekst("JESSY GEEFT TIPS", mx, y + 218, 7, "#bbb");
    }
    // Tijd voor de snelheidsbonus
    const k = Math.max(0, resterend / limiet);
    c.fillStyle = "rgba(255, 255, 255, 0.15)";
    c.fillRect(x + 20, y + h - 40, w - 40, 8);
    c.fillStyle = k > 0.5 ? "#5fd35f" : k > 0.2 ? "#ffb74d" : "#ff5a5a";
    c.fillRect(x + 20, y + h - 40, (w - 40) * k, 8);
    tekst(k > 0 ? "SNELHEIDSBONUS" : "GEEN BONUS MEER", mx, y + h - 50, 6, "#bbb");
    tekst("SCORE " + score, mx, y + h - 20, 10, "#fff");
  }

  function tekenBeoordeling(x, y, w) {
    const mx = x + w / 2;
    tekst("BEOORDELING", mx, y + 26, 10, "#ffe14d");
    tekst("MIX " + proef.mixPunten + "/60", x + 20, y + 50, 8, "#fff", "left");
    proef.onderdelen.forEach(([naam, goed], i) => {
      tekst(naam, x + 20, y + 70 + i * 17, 7, "#ddd", "left");
      tekst(goed ? "+10" : "FOUT", x + w - 20, y + 70 + i * 17, 7, goed ? "#5fd35f" : "#ff5a5a", "right");
    });
    let ry = y + 144;
    tekst("SNELHEID +" + proef.bonus, x + 20, ry, 7, "#9be7ff", "left");
    if (proef.reeksBonus) tekst("REEKS +" + proef.reeksBonus, x + 20, (ry += 16), 7, "#ff3ea5", "left");
    if (proef.ontdekBonus) tekst("ONTDEKT +" + proef.ontdekBonus, x + 20, (ry += 16), 7, "#5fd35f", "left");
    tekst("TOTAAL +" + proef.punten, mx, y + 200, 12, "#ffe14d");
    if (proef.tip) {
      tekst("JESSY'S TIP:", mx, y + 224, 7, "#ff9ec7");
      tekst(proef.tip, mx, y + 240, 6, "#fff");
    }
    tekst("SCORE " + score, mx, y + 282, 10, "#fff");
    if (proef.t > PROEF_DUUR + 1.2 && Math.floor(tijd * 2) % 2 === 0) tekst("KLIK = VERDER", mx, y + 262, 7, "#ddd");
  }

  function tekenKnoppen() {
    const over = toestand === "mixen" ? knopOp(muis) : null;
    KNOPPEN.forEach((k) => {
      const actief = knopActief(k);
      const aan = (k.id === "ijs" && ijs) || (k.garnering && garnering === k.garnering);
      let kleur = k.id === "serveer" ? "#c62828" : "#37474f";
      if (aan) kleur = "#0277bd";
      c.globalAlpha = actief ? 1 : 0.4;
      c.fillStyle = "#111";
      c.beginPath();
      c.roundRect(k.x, k.y + 4, k.w, k.h, 8);
      c.fill();
      c.fillStyle = over === k && actief ? "#ff3ea5" : kleur;
      c.beginPath();
      c.roundRect(k.x, k.y, k.w, k.h, 8);
      c.fill();
      if (k.garnering) {
        tekenGarnering(k.garnering, k.x + k.w / 2 - 2, k.y + k.h / 2 + 8);
      } else {
        tekst(k.tekst, k.x + k.w / 2, k.y + k.h / 2 + 1, k.id === "serveer" ? 16 : 10, "#fff");
      }
      c.globalAlpha = 1;
    });
    if (over && over.garnering) tekst(GARNERINGEN[over.garnering], over.x + over.w / 2, over.y - 12, 8, "#ffe14d");
  }

  function tekenBoek() {
    c.fillStyle = "rgba(0, 0, 0, 0.6)";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#5d3a1a";
    c.fillRect(40, 24, W - 80, H - 48);
    c.fillStyle = "#3b2a1a";
    c.fillRect(50, 34, W - 100, H - 68);
    c.fillStyle = "#c9a227";
    c.fillRect(W / 2 - 2, 70, 4, H - 130);
    tekst("RECEPTENBOEK", W / 2, 54, 14, "#ffe14d");
    tekst(boek.size + "/" + RECEPTEN.length + " ONTDEKT", W / 2, 76, 8, "#fff");
    const helft = Math.ceil(RECEPTEN.length / 2);
    RECEPTEN.forEach((r, i) => {
      const x = i < helft ? 66 : W / 2 + 16;
      const y = 104 + (i % helft) * 48;
      if (boek.has(r.naam)) {
        tekst(r.naam, x, y, 9, "#ffe14d", "left");
        const flessen = Object.entries(r.delen).map(([id, d]) => d + " " + DRANKEN[id].naam).join(", ");
        tekst(flessen, x, y + 15, 6, "#fff", "left");
        const rest = [r.ijs ? "IJS" : "GEEN IJS", r.methode.toUpperCase(), GLAS[r.glas].kort, r.garnering === "geen" ? "" : GARNERINGEN[r.garnering]];
        tekst(rest.filter(Boolean).join(" - "), x, y + 29, 6, "#9be7ff", "left");
      } else {
        tekst(r.naam, x, y, 9, "#8d7b5a", "left");
        tekst("??? NOG NIET ONTDEKT", x, y + 15, 6, "#999", "left");
      }
    });
    tekst("KLIK / B = DICHT    (DE KLOK LOOPT DOOR!)", W / 2, H - 46, 8, "#fff");
  }

  function tekenDeeltjes() {
    deeltjes.forEach((d) => {
      const a = 1 - d.leeftijd / d.max;
      c.globalAlpha = Math.max(0, a);
      if (d.soort === "hart" || d.soort === "ster" || d.soort === "sneeuw") {
        c.font = d.grootte + "px serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = d.kleur;
        c.fillText(d.soort === "hart" ? "❤️" : d.soort === "ster" ? "✨" : "❄️", d.x, d.y);
      } else {
        const groei = d.soort === "rook" || d.soort === "wolk" || d.soort === "stoom" ? 1 + d.leeftijd * 1.5 : 1;
        c.fillStyle = d.kleur;
        c.beginPath();
        c.arc(d.x, d.y, d.grootte * groei, 0, Math.PI * 2);
        c.fill();
      }
    });
    c.globalAlpha = 1;
  }

  function teken() {
    if (toestand === undefined) return;
    c.save();
    if (schud > 0) c.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8);
    tekenAchtergrond();
    tekenFlessen();
    tekenKrijtbord();
    tekenJessy();
    tekenToog();
    tekenSpullenOpToog();
    tekenGeserveerdGlas();
    tekenMengbeker();
    tekenSchenkendeFles();
    tekenKnoppen();
    tekenDeeltjes();
    c.restore();
    if (boekOpen && toestand === "mixen") tekenBoek();

    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 1.6);
      tekst(k.tekst, k.x, k.y - k.leeftijd * 24, k.groot ? 26 : 11, k.kleur);
    });
    c.globalAlpha = 1;
    if (flits > 0) {
      c.fillStyle = `rgba(255, 255, 255, ${flits / 0.35})`;
      c.fillRect(0, 0, W, H);
    }

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.78)";
      c.fillRect(0, 0, W, H);
      tekst("JESSY'S BAR", W / 2, 70, 34, "#ff3e5a");
      tekst("BARMAN JESSY HEEFT DORST EN ROEPT ALLEEN DE NAAM VAN ZIJN COCKTAIL.", W / 2, 118, 9);
      tekst("KEN JE HET RECEPT NIET? PROBEER MAAR, JESSY GEEFT TIPS!", W / 2, 138, 9);
      tekst("1. KIES EEN GLAS OP DE BAR", W / 2, 175, 11, "#3ef0ff");
      tekst("2. HOUD EEN FLES INGEDRUKT OM TE SCHENKEN (STREEPJE = 1 DEEL)", W / 2, 200, 11, "#3ef0ff");
      tekst("3. IJS ERIN? DAN SHAKEN OF ROEREN", W / 2, 225, 11, "#3ef0ff");
      tekst("4. GARNEREN EN SERVEREN: JESSY PROEFT", W / 2, 250, 11, "#3ef0ff");
      tekst("GOED GEMIXT = RECEPT IN JE RECEPTENBOEK (+" + ONTDEK_BONUS + ")   " + boek.size + "/" + RECEPTEN.length, W / 2, 285, 9, "#5fd35f");
      tekst("PUNTEN: PRECIEZE MIX (60) + GLAS, IJS, METHODE, GARNERING (4X10)", W / 2, 312, 9, "#ffe14d");
      tekst("+ SNELHEIDSBONUS (25) + PERFECTE REEKS", W / 2, 332, 9, "#ffe14d");
      tekst("8 BESTELLINGEN PER AVOND. VERPEST HET EN JESSY REAGEERT...", W / 2, 362, 9, "#ff3ea5");
      tekst("KLIK / SPATIE = OPEN DE BAR", W / 2, 420, 16);
      tekst("RECORD " + record, W / 2, 460, 10, "#ffe14d");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.72)";
      c.fillRect(0, 0, W, H);
      tekst("DE BAR IS DICHT!", W / 2, 130, 28, "#ff3e5a");
      tekst(Arcade.plaagTekst(), W / 2, 180, 11, "#fff");
      tekst("SCORE " + score, W / 2, 240, 22);
      tekst("RECORD " + record, W / 2, 285, 16, "#3ef0ff");
      if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, 322, 13, "#ff3ea5");
      if (tijd - sinds > 1.2 && Math.floor(tijd * 2) % 2 === 0) tekst("KLIK / SPATIE = NOG EEN AVOND", W / 2, 390, 13);
      tekst("ESC = PAUZE", W / 2, 430, 10, "#ddd");
    }
  }

  Arcade.volgScore(() => score);
  nieuwSpel();
  Arcade.lus(update, teken);
})();
