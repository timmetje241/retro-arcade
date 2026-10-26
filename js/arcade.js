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

  function speelMuziek() {
    if (stil || muziekUit) muziek.pause();
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
    melding.style.display = muziek.paused && !stil && !muziekUit ? "block" : "none";
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
    if (!IS_SPEL) return;
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
    c.strokeStyle = "#000";
    c.strokeText(woord, x, y);
    c.fillStyle = kleur;
    c.fillText(woord, x, y);
  }

  // De gezichten van de jarige (img/jessy-1.png t/m jessy-5.png)
  function gezichten() {
    return [1, 2, 3, 4, 5].map((n) => {
      const img = new Image();
      img.src = `../../img/jessy-${n}.png`;
      return img;
    });
  }

  // Tekent een rond plaatje als het geladen is
  function plaatje(c, img, x, y, straal) {
    if (img.complete && img.naturalWidth) c.drawImage(img, x - straal, y - straal, straal * 2, straal * 2);
  }

  // Hoofdlus: roept elke frame update(dt) en teken() aan
  function lus(update, teken) {
    let vorige = performance.now();
    function stap(nu) {
      const dt = Math.max(0, Math.min((nu - vorige) / 1000, 1 / 30));
      vorige = nu;
      if (!gepauzeerd) update(dt);
      teken();
      requestAnimationFrame(stap);
    }
    requestAnimationFrame(stap);
  }

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
    gepauzeerd: () => gepauzeerd,
    highscoresAan: () => !!highscoreInstelling(),
    topScores,
    vraagNaam,
    naarMenu,
    FONT,
    schaalCanvas,
    tekst,
    gezichten,
    plaatje,
    lus
  };
})();
