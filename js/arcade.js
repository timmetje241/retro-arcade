// Gedeelde hulpjes voor alle spellen: highscores, geluid en terug naar het menu.
window.Arcade = (function () {
  const PREFIX = "retro-arcade.";

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
      update(dt);
      teken();
      requestAnimationFrame(stap);
    }
    requestAnimationFrame(stap);
  }

  return {
    lees,
    bewaar,
    toon,
    ruis,
    isStil: () => stil,
    zetStil,
    naarMenu: () => { window.location.href = "../../index.html"; },
    FONT,
    schaalCanvas,
    tekst,
    gezichten,
    plaatje,
    lus
  };
})();
