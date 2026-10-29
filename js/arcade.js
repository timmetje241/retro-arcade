// Gedeelde hulpjes voor alle spellen: highscores, geluid, muziek, pauzemenu en terug naar het menu.
window.Arcade = (function () {
  const PREFIX = "retro-arcade.";
  // De hoofdmap van de arcade, afgeleid van waar dit script staat (werkt ook vanuit games/<spel>/)
  const BASIS = new URL("..", document.currentScript.src);
  // Een pagina met een canvas#scherm is een spel en krijgt een pauzemenu
  const IS_SPEL = !!document.getElementById("scherm");

  function lees(sleutel, standaard) {
    try {
      const waarde = localStorage.getItem(PREFIX + sleutel);
      return waarde === null ? standaard : JSON.parse(waarde);
    } catch (e) {
      return standaard;
    }
  }

  function bewaar(sleutel, waarde) {
    try {
      localStorage.setItem(PREFIX + sleutel, JSON.stringify(waarde));
    } catch (e) {
      // Opslaan mag mislukken (bv. privévenster); het spel werkt dan gewoon zonder.
    }
  }

  // --- Geluid (zelf gemaakt met Web Audio, geen geluidsbestanden nodig) ---
  let ctx = null;
  let stil = lees("stil", false);

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Eén toon: type (square/sine/sawtooth/triangle), van frequentie naar frequentie.
  function toon({ type = "square", van = 440, naar = van, duur = 0.1, volume = 0.15, vertraging = 0, filter = 0 }) {
    if (stil) return;
    const a = audio();
    if (!a) return;
    const start = a.currentTime + vertraging;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(van, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(naar, 1), start + duur);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duur);
    let laatste = osc;
    if (filter) {
      const lp = a.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = filter;
      osc.connect(lp);
      laatste = lp;
    }
    laatste.connect(gain);
    gain.connect(a.destination);
    osc.start(start);
    osc.stop(start + duur + 0.05);
  }

  function ruis({ duur = 0.2, volume = 0.2 }) {
    if (stil) return;
    const a = audio();
    if (!a) return;
    const buffer = a.createBuffer(1, Math.floor(a.sampleRate * duur), a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const bron = a.createBufferSource();
    const gain = a.createGain();
    gain.gain.value = volume;
    bron.buffer = buffer;
    bron.connect(gain);
    gain.connect(a.destination);
    bron.start();
  }

  function zetStil(waarde) {
    stil = waarde;
    bewaar("stil", stil);
    speelMuziek();
    toonMelding();
  }

  function naarMenu() {
    window.location.href = new URL("index.html", BASIS).href;
  }

  // --- Achtergrondmuziek (loopt door van pagina naar pagina) ---
  let muziekUit = lees("muziekUit", false);
  const muziek = new Audio(new URL("muziek/polish-cow-8bit.mp3", BASIS).href);
  muziek.loop = true;
  muziek.volume = 0.35;
  muziek.addEventListener("loadedmetadata", () => {
    const t = lees("muziekTijd", 0);
    if (t > 0 && t < muziek.duration) muziek.currentTime = t;
  });

  // Sommige spellen hebben hun eigen geluid en willen de muziek niet (zonder je instelling te veranderen)
  let muziekHier = true;

  function speelMuziek() {
    if (stil || muziekUit || !muziekHier) muziek.pause();
    else muziek.play().catch(() => {}); // browsers spelen pas na een klik of toets
  }

  function zetMuziekUit(waarde) {
    muziekUit = waarde;
    bewaar("muziekUit", muziekUit);
    speelMuziek();
    toonMelding();
  }

  function bewaarMuziekTijd() {
    if (!muziek.paused) bewaar("muziekTijd", muziek.currentTime);
  }
  setInterval(bewaarMuziekTijd, 1000);
  window.addEventListener("pagehide", bewaarMuziekTijd);

  // Browsers blokkeren geluid tot de bezoeker klikt, tikt of een toets indrukt. Welke gebeurtenis
  // telt verschilt per browser (op een telefoon pas bij het loslaten), dus we proberen het bij allemaal.
  speelMuziek();
  ["pointerdown", "pointerup", "mousedown", "touchend", "click", "keydown", "keyup"].forEach((soort) => {
    window.addEventListener(soort, () => { if (muziek.paused) speelMuziek(); }, true);
  });

  // Melding zolang de browser de muziek nog tegenhoudt
  let melding = null;
  function toonMelding() {
    if (!document.body) return;
    if (!melding) {
      melding = document.createElement("div");
      melding.textContent = "♪ KLIK OF DRUK OP EEN TOETS VOOR MUZIEK ♪";
      melding.style.cssText = `position: fixed; left: 50%; top: 10px; transform: translateX(-50%); z-index: 30;
        font: 10px ${'"Press Start 2P", "Courier New", monospace'}; color: #0b0b1e; background: #ffe14d;
        border: 3px solid #000; padding: 8px 12px; pointer-events: none; text-align: center; max-width: 90vw;`;
      document.body.appendChild(melding);
    }
    melding.style.display = muziek.paused && !stil && !muziekUit && muziekHier ? "block" : "none";
  }
  muziek.addEventListener("playing", toonMelding);
  muziek.addEventListener("pause", toonMelding);
  // Even wachten: als de browser autoplay toestaat, speelt de muziek dan al en is de melding niet nodig
  setTimeout(toonMelding, 800);

  // --- Pauzemenu (Esc of de pauzeknop) ---
  let gepauzeerd = false;
  let keuze = 0;
  let pauzeLaag = null;
  const KEUZES = [
    { tekst: () => "VERDER SPELEN", doe: () => sluitPauze() },
    { tekst: () => "GELUID: " + (stil ? "UIT" : "AAN"), doe: () => zetStil(!stil) },
    { tekst: () => "MUZIEK: " + (muziekUit ? "UIT" : "AAN"), doe: () => zetMuziekUit(!muziekUit) },
    { tekst: () => "OPNIEUW BEGINNEN", doe: () => window.location.reload() },
    { tekst: () => "NAAR HET MENU", doe: () => naarMenu() }
  ];

  function maakPauzeMenu() {
    const stijl = document.createElement("style");
    stijl.textContent = `
      .pauze-knop { position: fixed; right: 12px; bottom: 12px; width: 48px; height: 48px; z-index: 10;
        font: 16px ${FONT}; color: #fff; background: rgba(0,0,0,0.55); border: 3px solid #fff; cursor: pointer; }
      .pauze-laag { position: fixed; inset: 0; z-index: 20; display: none; align-items: center; justify-content: center;
        background: rgba(5, 5, 20, 0.8); font-family: ${FONT}; }
      .pauze-laag.open { display: flex; }
      .pauze-doos { background: #15153a; border: 4px solid #ff3ea5; box-shadow: 8px 8px 0 #000; padding: 28px 24px;
        display: flex; flex-direction: column; gap: 14px; min-width: min(320px, 86vw); text-align: center; }
      .pauze-doos h2 { margin: 0 0 10px; font-size: 26px; color: #ffe14d; text-shadow: 3px 3px 0 #ff3ea5; }
      .pauze-doos button { font: 12px ${FONT}; color: #fff; background: #0b0b1e; border: 3px solid #3ef0ff;
        padding: 14px 10px; cursor: pointer; }
      .pauze-doos button.gekozen { background: #3ef0ff; color: #0b0b1e; }
      .pauze-doos p { margin: 8px 0 0; font-size: 8px; color: #8a8aa8; line-height: 1.8; }
      .pauze-doos .naam-vak { font: 16px ${FONT}; text-align: center; text-transform: uppercase; padding: 12px;
        background: #0b0b1e; color: #ffe14d; border: 3px solid #ffe14d; outline: none; }
    `;
    document.head.appendChild(stijl);

    const knop = document.createElement("button");
    knop.className = "pauze-knop";
    knop.textContent = "II";
    knop.setAttribute("aria-label", "Pauze");
    knop.addEventListener("click", openPauze);
    document.body.appendChild(knop);

    pauzeLaag = document.createElement("div");
    pauzeLaag.className = "pauze-laag";
    pauzeLaag.innerHTML = `<div class="pauze-doos"><h2>PAUZE</h2><div class="keuzes"></div>
      <p>PIJLTJES + ENTER<br>ESC = VERDER</p></div>`;
    document.body.appendChild(pauzeLaag);
  }

  // De knoppen worden één keer gemaakt en daarna alleen bijgewerkt. Opnieuw opbouwen onder de muis
  // zou de knop tussen indrukken en loslaten vervangen, en dan komt een klik nooit aan.
  let keuzeKnoppen = [];
  function tekenKeuzes() {
    if (!keuzeKnoppen.length) {
      const lijst = pauzeLaag.querySelector(".keuzes");
      lijst.style.display = "flex";
      lijst.style.flexDirection = "column";
      lijst.style.gap = "12px";
      keuzeKnoppen = KEUZES.map((k, i) => {
        const b = document.createElement("button");
        b.addEventListener("click", () => { keuze = i; kies(); });
        b.addEventListener("mouseenter", () => { keuze = i; tekenKeuzes(); });
        lijst.appendChild(b);
        return b;
      });
    }
    keuzeKnoppen.forEach((b, i) => {
      b.textContent = KEUZES[i].tekst();
      b.classList.toggle("gekozen", i === keuze);
    });
  }

  function kies() {
    KEUZES[keuze].doe();
    if (gepauzeerd) tekenKeuzes();
  }

  function openPauze() {
    if (gepauzeerd) return;
    gepauzeerd = true;
    keuze = 0;
    tekenKeuzes();
    pauzeLaag.classList.add("open");
  }

  function sluitPauze() {
    gepauzeerd = false;
    pauzeLaag.classList.remove("open");
  }

  // Luistert vóór de spellen zelf, zodat toetsen in het pauzemenu niet bij het spel aankomen
  window.addEventListener("keydown", (e) => {
    if (!IS_SPEL || gebruikerVraagOpen()) return; // eerst je naam invullen, dan pas pauzeren
    if (naamLaag && naamLaag.classList.contains("open")) {
      // Typen in het naamvak mag gewoon, maar het spel hoort er niets van
      e.stopImmediatePropagation();
      if (e.code === "Enter") { e.preventDefault(); naamKlaar(true); }
      else if (e.code === "Escape") { e.preventDefault(); naamKlaar(false); }
      return;
    }
    if (!gepauzeerd) {
      if (e.code === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        openPauze();
      }
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat) return;
    if (e.code === "Escape") sluitPauze();
    else if (e.code === "ArrowUp" || e.code === "KeyW") { keuze = (keuze - 1 + KEUZES.length) % KEUZES.length; tekenKeuzes(); }
    else if (e.code === "ArrowDown" || e.code === "KeyS") { keuze = (keuze + 1) % KEUZES.length; tekenKeuzes(); }
    else if (e.code === "Enter" || e.code === "Space") kies();
  }, true);

  // --- Gedeelde highscores (Supabase, zie README) ---
  const TOP = 10;

  function highscoreInstelling() {
    const h = window.ARCADE_CONFIG && window.ARCADE_CONFIG.highscores;
    return h && h.url && h.sleutel ? h : null;
  }

  async function highscoreVerzoek(pad, opties = {}) {
    const h = highscoreInstelling();
    const antwoord = await fetch(h.url.replace(/\/$/, "") + "/rest/v1/" + pad, {
      ...opties,
      headers: { apikey: h.sleutel, "Content-Type": "application/json", ...(opties.headers || {}) }
    });
    if (!antwoord.ok) throw new Error("Highscores: " + antwoord.status);
    return antwoord.status === 204 || antwoord.status === 201 ? null : antwoord.json();
  }

  // De laatst ingestuurde scores van alle spellen, nieuwste eerst (voor de lichtkrant)
  function laatsteScores(aantal = 10) {
    if (!highscoreInstelling()) return Promise.resolve([]);
    return highscoreVerzoek(`scores?select=naam,score,spel,gemaakt&order=gemaakt.desc&limit=${aantal}`);
  }

  // De beste scores van één spel, hoogste eerst
  function topScores(spel) {
    if (!highscoreInstelling()) return Promise.resolve([]);
    return highscoreVerzoek(`scores?select=naam,score,gemaakt&spel=eq.${encodeURIComponent(spel)}&order=score.desc,gemaakt.asc&limit=${TOP}`);
  }

  function stuurScore(spel, naam, score) {
    return highscoreVerzoek("scores", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ spel, naam, score })
    });
  }

  // Naam-invoer na een game over, als de score in de top 10 komt
  let naamLaag = null;
  let naamKlaar = () => {};

  function maakNaamLaag() {
    naamLaag = document.createElement("div");
    naamLaag.className = "pauze-laag";
    naamLaag.innerHTML = `<div class="pauze-doos">
      <h2>HIGHSCORE!</h2>
      <p class="naam-info" style="font-size: 12px; color: #fff; line-height: 2;"></p>
      <input class="naam-vak" maxlength="12" autocomplete="off" spellcheck="false" aria-label="Je naam">
      <div class="keuzes" style="display: flex; flex-direction: column; gap: 12px;">
        <button class="gekozen opslaan">OPSLAAN</button>
        <button class="overslaan">OVERSLAAN</button>
      </div>
      <p>ENTER = OPSLAAN<br>ESC = OVERSLAAN</p></div>`;
    document.body.appendChild(naamLaag);
    naamLaag.querySelector(".opslaan").addEventListener("click", () => naamKlaar(true));
    naamLaag.querySelector(".overslaan").addEventListener("click", () => naamKlaar(false));
  }

  async function vraagNaam(spel, score) {
    kiesPlaag(spel); // elke game over een nieuwe plaagtekst
    if (!highscoreInstelling() || score <= 0) return;
    let lijst;
    try {
      lijst = await topScores(spel);
    } catch (e) {
      return; // geen internet of database niet bereikbaar: dan maar geen gedeelde highscore
    }
    if (lijst.length >= TOP && score <= lijst[lijst.length - 1].score) return;
    const plek = lijst.filter((s) => s.score >= score).length + 1;

    if (!naamLaag) maakNaamLaag();
    const vak = naamLaag.querySelector(".naam-vak");
    naamLaag.querySelector(".naam-info").innerHTML = `SCORE ${score}<br>PLEK #${plek} VAN DE WERELD`;
    vak.value = lees("naam", "");
    naamLaag.classList.add("open");
    setTimeout(() => { vak.focus(); vak.select(); }, 50);

    naamKlaar = async (opslaan) => {
      const naam = vak.value.trim().toUpperCase().slice(0, 12);
      if (opslaan && !naam) { vak.focus(); return; }
      naamKlaar = () => {};
      if (opslaan) {
        bewaar("naam", naam);
        naamLaag.querySelector(".naam-info").textContent = "OPSLAAN...";
        try {
          await stuurScore(spel, naam, score);
          naamLaag.querySelector(".naam-info").textContent = "OPGESLAGEN!";
          toon({ type: "square", van: 660, naar: 1320, duur: 0.2, volume: 0.1 });
        } catch (e) {
          naamLaag.querySelector(".naam-info").textContent = "MISLUKT, PROBEER LATER";
        }
        await new Promise((r) => setTimeout(r, 900));
      }
      naamLaag.classList.remove("open");
      vak.blur();
    };
  }

  // --- Tekenhulpjes voor canvas-spellen ---
  const FONT = '"Press Start 2P", "Courier New", monospace';

  // Laat het canvas meeschalen met het venster, met dezelfde verhouding.
  function schaalCanvas(canvas) {
    const pasAan = () => {
      const schaal = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
      canvas.style.width = Math.floor(canvas.width * schaal) + "px";
      canvas.style.height = Math.floor(canvas.height * schaal) + "px";
    };
    window.addEventListener("resize", pasAan);
    pasAan();
  }

  // Pixeltekst met een zwarte rand
  function tekst(c, woord, x, y, grootte, kleur = "#fff", uitlijning = "center") {
    c.font = `${grootte}px ${FONT}`;
    c.textAlign = uitlijning;
    c.textBaseline = "middle";
    c.lineJoin = "round";
    c.lineWidth = Math.max(3, grootte / 3);
    if (uitlijning === "center") {
      // Gecentreerde tekst altijd helemaal in beeld houden
      const half = c.measureText(woord).width / 2 + 4;
      x = Math.max(half, Math.min(c.canvas.width - half, x));
    }
    c.strokeStyle = "#000";
    c.strokeText(woord, x, y);
    c.fillStyle = kleur;
    c.fillText(woord, x, y);
  }

  // De gezichten van de jarige (img/jessy-1.png t/m jessy-5.png)
  function gezichten() {
    return [1, 2, 3, 4, 5].map((n) => {
      const img = new Image();
      img.src = new URL(`img/jessy-${n}.png`, BASIS).href;
      return img;
    });
  }

  // Een willekeurig gezicht dat niet het huidige is, zodat ze steeds rouleren
  function anderGezicht(lijst, huidig) {
    const keuze = lijst.filter((g) => g !== huidig);
    return keuze[Math.floor(Math.random() * keuze.length)];
  }

  // Tekent een rond plaatje als het geladen is. Gezichten van Jessy krijgen een feesthoedje.
  function plaatje(c, img, x, y, straal) {
    if (!img.complete || !img.naturalWidth) return;
    c.drawImage(img, x - straal, y - straal, straal * 2, straal * 2);
    if (straal >= 14 && img.src.includes("/img/jessy-")) feesthoedje(c, x, y, straal);
  }

  function feesthoedje(c, x, y, straal) {
    const h = straal * 0.95;
    const b = straal * 0.75;
    c.save();
    c.translate(x + straal * 0.25, y - straal * 0.82);
    c.rotate(0.3);
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.moveTo(-b / 2 - 2, 2);
    c.lineTo(b / 2 + 2, 2);
    c.lineTo(0, -h - 3);
    c.fill();
    c.fillStyle = "#ff3ea5";
    c.beginPath();
    c.moveTo(-b / 2, 0);
    c.lineTo(b / 2, 0);
    c.lineTo(0, -h);
    c.fill();
    // Gele streepjes en een pompon
    c.fillStyle = "#ffe14d";
    c.fillRect(-b * 0.32, -h * 0.3, b * 0.64, Math.max(2, straal * 0.08));
    c.fillRect(-b * 0.18, -h * 0.6, b * 0.36, Math.max(2, straal * 0.08));
    c.fillStyle = "#3ef0ff";
    c.beginPath();
    c.arc(0, -h, Math.max(3, straal * 0.13), 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // --- Plaagteksten bij game over ---
  const PLAAG_ALGEMEEN = [
    "33 EN NU AL KRAKEND?",
    "DAT WAS DE CREATINE NIET",
    "MEER KWARK NODIG",
    "TIJD VOOR EEN DUTJE",
    "VIBECODEN GAAT BETER",
    "BOE ZEGT DE KOE",
    "VOLGEND JAAR BETER",
    "NOG EEN RONDJE?"
  ];
  const PLAAG_PER_SPEL = {
    "flappy-koe": ["ZELFS BEERTJE (4) VLIEGT VERDER", "DE KOE IS TELEURGESTELD"],
    snake: ["ZELFS BEERTJE (4) WORDT LANGER", "TE VEEL BIER, TE WEINIG KWARK"],
    "protein-catcher": ["ZELFS BEERTJE (4) VANGT BETER", "SKIP LEG DAY NIET"],
    tapper: ["ZELFS BEERTJE (4) TAPT SNELLER", "MAM IS NIET ONDER DE INDRUK"],
    breakout: ["ZELFS BEERTJE (4) MIKT BETER", "DE KOE WON"],
    whack: ["ZELFS BEERTJE (4) MEPT HARDER", "JESSY LACHT JE UIT"],
    gluren: ["ZELFS BEERTJE (4) GLUURT BETER", "LISA ZIET ALLES", "BRUH."]
  };
  let plaag = "";

  function kiesPlaag(spel) {
    const lijst = [...PLAAG_ALGEMEEN, ...(PLAAG_PER_SPEL[spel] || []), ...(PLAAG_PER_SPEL[spel] || [])];
    plaag = lijst[Math.floor(Math.random() * lijst.length)];
  }

  // --- Feest: confetti, een "boe" en een spandoek ---
  let confettiCanvas = null;
  let deeltjes = [];
  let blijvendeConfetti = false;
  let confettiLoopt = false;
  const CONFETTI_KLEUREN = ["#ff3ea5", "#3ef0ff", "#ffe14d", "#5fd35f", "#ff8a3d", "#b06cff", "#fff"];

  function nieuwDeeltje(bovenaan) {
    return {
      x: Math.random() * window.innerWidth,
      y: bovenaan ? -20 : Math.random() * window.innerHeight * 0.5,
      vx: (Math.random() - 0.5) * 120,
      vy: 80 + Math.random() * 160,
      draai: Math.random() * 6,
      draaiV: (Math.random() - 0.5) * 10,
      kleur: CONFETTI_KLEUREN[Math.floor(Math.random() * CONFETTI_KLEUREN.length)],
      b: 6 + Math.random() * 6
    };
  }

  function confetti(aantal = 160, blijvend = false) {
    if (!document.body) return;
    blijvendeConfetti = blijvendeConfetti || blijvend;
    if (!confettiCanvas) {
      confettiCanvas = document.createElement("canvas");
      confettiCanvas.style.cssText = "position: fixed; inset: 0; pointer-events: none; z-index: 25;";
      document.body.appendChild(confettiCanvas);
    }
    for (let i = 0; i < aantal; i++) deeltjes.push(nieuwDeeltje(false));
    if (confettiLoopt) return;
    confettiLoopt = true;
    let vorige = performance.now();
    const stap = (nu) => {
      const dt = Math.min((nu - vorige) / 1000, 0.05);
      vorige = nu;
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
      const c = confettiCanvas.getContext("2d");
      if (blijvendeConfetti && deeltjes.length < 90) deeltjes.push(nieuwDeeltje(true));
      deeltjes.forEach((d) => {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.draai += d.draaiV * dt;
        c.save();
        c.translate(d.x, d.y);
        c.rotate(d.draai);
        c.fillStyle = d.kleur;
        c.fillRect(-d.b / 2, -d.b / 4, d.b, d.b / 2);
        c.restore();
      });
      deeltjes = deeltjes.filter((d) => d.y < window.innerHeight + 20);
      if (deeltjes.length || blijvendeConfetti) requestAnimationFrame(stap);
      else confettiLoopt = false;
    };
    requestAnimationFrame(stap);
  }

  function spandoek(woord, duur = 3000) {
    if (!document.body) return;
    const doek = document.createElement("div");
    doek.textContent = woord;
    doek.style.cssText = `position: fixed; left: 50%; top: 28%; transform: translate(-50%, -50%) rotate(-4deg); z-index: 26;
      font: clamp(16px, 4vw, 30px) ${FONT}; color: #ffe14d; background: #ff3ea5; border: 4px solid #000;
      box-shadow: 6px 6px 0 #000; padding: 16px 20px; text-align: center; pointer-events: none; max-width: 90vw;
      text-shadow: 3px 3px 0 #000; transition: opacity 0.5s;`;
    document.body.appendChild(doek);
    setTimeout(() => { doek.style.opacity = "0"; }, duur);
    setTimeout(() => doek.remove(), duur + 600);
  }

  function boe() {
    toon({ type: "sawtooth", van: 180, naar: 120, duur: 0.25, volume: 0.25, filter: 900 });
    toon({ type: "sawtooth", van: 120, naar: 85, duur: 0.7, volume: 0.25, filter: 700, vertraging: 0.2 });
  }

  function feest(woord) {
    confetti(200);
    spandoek(woord);
    boe();
  }

  // Easter egg: wie in een spel voorbij de 33 punten komt, krijgt een verjaardagsfeestje
  function volgScore(geefScore) {
    let vorige = 0;
    setInterval(() => {
      const nu = geefScore();
      if (vorige < 33 && nu >= 33) feest("HAPPY 33RD JESSY!");
      vorige = nu;
    }, 150);
  }

  // Is het vandaag Jessy's verjaardag (31 oktober)?
  function isVerjaardag() {
    const d = new Date();
    return d.getMonth() === 9 && d.getDate() === 31;
  }

  // Het spel staat stil bij pauze, bij de naamvraag en bij het highscore-venster. Dat laatste kan
  // even na een game over verschijnen (eerst wordt online de top 10 opgehaald), dus soms al in een nieuw potje.
  function staatStil() {
    return gepauzeerd || gebruikerVraagOpen() || (!!naamLaag && naamLaag.classList.contains("open"));
  }

  // Hoofdlus: roept elke frame update(dt) en teken() aan
  function lus(update, teken) {
    let vorige = performance.now();
    function stap(nu) {
      const dt = Math.max(0, Math.min((nu - vorige) / 1000, 1 / 30));
      vorige = nu;
      if (!staatStil()) update(dt);
      teken();
      requestAnimationFrame(stap);
    }
    requestAnimationFrame(stap);
  }

  // --- Gebruikersnaam: iedereen vult bij het eerste bezoek een naam in, die per apparaat bewaard blijft ---
  const MAX_NAAM = 12;
  let gebruikerLaag = null;
  // In een style="..."-attribuut mogen geen dubbele aanhalingstekens staan
  const FONT_ATTR = FONT.replace(/"/g, "'");
  const naamWachters = [];

  function gebruikersnaam() {
    return lees("naam", "");
  }

  function gebruikerVraagOpen() {
    return !!gebruikerLaag && gebruikerLaag.style.display !== "none";
  }

  // Roept terug zodra er een naam is (meteen, als die er al was)
  function bijNaam(terug) {
    if (gebruikersnaam()) terug(gebruikersnaam());
    else naamWachters.push(terug);
  }

  function vraagGebruikersnaam(magSluiten = false) {
    if (!document.body) return;
    if (!gebruikerLaag) {
      gebruikerLaag = document.createElement("div");
      gebruikerLaag.style.cssText = `position: fixed; inset: 0; z-index: 40; display: flex; align-items: center;
        justify-content: center; background: rgba(5, 5, 20, 0.92); font-family: ${FONT}; padding: 16px;`;
      gebruikerLaag.innerHTML = `
        <form style="background: #15153a; border: 4px solid #ff3ea5; box-shadow: 8px 8px 0 #000; padding: 28px 22px;
          display: flex; flex-direction: column; gap: 16px; width: min(380px, 100%); text-align: center;">
          <h2 style="margin: 0; font-size: 20px; color: #ffe14d; text-shadow: 3px 3px 0 #ff3ea5; line-height: 1.5;">WELKOM!</h2>
          <p style="margin: 0; font-size: 11px; color: #fff; line-height: 2;">WAT IS JE NAAM?</p>
          <input name="naam" maxlength="${MAX_NAAM}" autocomplete="nickname" spellcheck="false" aria-label="Je naam"
            style="font: 16px ${FONT_ATTR}; text-align: center; text-transform: uppercase; padding: 12px; background: #0b0b1e;
            color: #ffe14d; border: 3px solid #ffe14d; outline: none;">
          <p class="fout" style="margin: 0; font-size: 9px; color: #ff5a5a; min-height: 9px;"></p>
          <button type="submit" style="font: 12px ${FONT_ATTR}; color: #0b0b1e; background: #3ef0ff; border: 3px solid #000;
            padding: 14px 10px; cursor: pointer;">SPELEN!</button>
          <button type="button" class="annuleer" style="font: 10px ${FONT_ATTR}; color: #fff; background: transparent;
            border: 3px solid #555; padding: 10px; cursor: pointer;">ANNULEREN</button>
          <p style="margin: 0; font-size: 8px; color: #8a8aa8; line-height: 1.8;">DEZE NAAM WORDT ONTHOUDEN<br>OP DIT APPARAAT</p>
        </form>`;
      document.body.appendChild(gebruikerLaag);
      const formulier = gebruikerLaag.querySelector("form");
      formulier.addEventListener("submit", (e) => {
        e.preventDefault();
        const naam = formulier.naam.value.trim().toUpperCase().slice(0, MAX_NAAM);
        if (!naam) {
          gebruikerLaag.querySelector(".fout").textContent = "VUL EEN NAAM IN";
          formulier.naam.focus();
          return;
        }
        bewaar("naam", naam);
        gebruikerLaag.style.display = "none";
        formulier.naam.blur();
        toon({ type: "square", van: 660, naar: 1320, duur: 0.15, volume: 0.1 });
        naamWachters.splice(0).forEach((terug) => terug(naam));
        window.dispatchEvent(new CustomEvent("arcade-naam", { detail: naam }));
      });
      gebruikerLaag.querySelector(".annuleer").addEventListener("click", () => {
        gebruikerLaag.style.display = "none";
      });
    }
    const formulier = gebruikerLaag.querySelector("form");
    formulier.naam.value = gebruikersnaam();
    gebruikerLaag.querySelector(".fout").textContent = "";
    // Bij het eerste bezoek kun je niet annuleren: zonder naam geen arcade
    gebruikerLaag.querySelector(".annuleer").style.display = magSluiten && gebruikersnaam() ? "block" : "none";
    gebruikerLaag.style.display = "flex";
    setTimeout(() => { formulier.naam.focus(); formulier.naam.select(); }, 50);
  }

  // Zolang het venster open is, horen het menu en de spellen niets van je toetsen
  window.addEventListener("keydown", (e) => {
    if (!gebruikerVraagOpen()) return;
    e.stopImmediatePropagation();
    if (e.code === "Escape" && gebruikerLaag.querySelector(".annuleer").style.display !== "none") {
      gebruikerLaag.style.display = "none";
    }
  }, true);

  if (!gebruikersnaam()) vraagGebruikersnaam();

  if (IS_SPEL) maakPauzeMenu();

  return {
    lees,
    bewaar,
    toon,
    ruis,
    isStil: () => stil,
    zetStil,
    isMuziekUit: () => muziekUit,
    muziekSpeelt: () => !muziek.paused,
    zetMuziekUit,
    geenMuziekHier: () => { muziekHier = false; speelMuziek(); },
    gepauzeerd: staatStil,
    gebruikersnaam,
    vraagGebruikersnaam,
    bijNaam,
    highscoresAan: () => !!highscoreInstelling(),
    topScores,
    laatsteScores,
    vraagNaam,
    plaagTekst: () => plaag,
    confetti,
    spandoek,
    feest,
    volgScore,
    isVerjaardag,
    naarMenu,
    FONT,
    schaalCanvas,
    tekst,
    gezichten,
    anderGezicht,
    plaatje,
    lus
  };
})();
