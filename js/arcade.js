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
  }

  function bewaarMuziekTijd() {
    if (!muziek.paused) bewaar("muziekTijd", muziek.currentTime);
  }
  setInterval(bewaarMuziekTijd, 1000);
  window.addEventListener("pagehide", bewaarMuziekTijd);

  speelMuziek();
  ["pointerdown", "keydown"].forEach((soort) => {
    window.addEventListener(soort, () => { if (muziek.paused) speelMuziek(); }, true);
  });

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

  function tekenKeuzes() {
    const lijst = pauzeLaag.querySelector(".keuzes");
    lijst.innerHTML = "";
    lijst.style.display = "flex";
    lijst.style.flexDirection = "column";
    lijst.style.gap = "12px";
    KEUZES.forEach((k, i) => {
      const b = document.createElement("button");
      b.textContent = k.tekst();
      b.classList.toggle("gekozen", i === keuze);
      b.addEventListener("click", () => { keuze = i; kies(); });
      b.addEventListener("mouseenter", () => { keuze = i; tekenKeuzes(); });
      lijst.appendChild(b);
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

  // De vier gezichten van de jarige (img/jessy-1.png t/m jessy-4.png)
  function gezichten() {
    return [1, 2, 3, 4].map((n) => {
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
    zetMuziekUit,
    gepauzeerd: () => gepauzeerd,
    naarMenu,
    FONT,
    schaalCanvas,
    tekst,
    gezichten,
    plaatje,
    lus
  };
})();
