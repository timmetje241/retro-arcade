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

  return {
    lees,
    bewaar,
    toon,
    ruis,
    isStil: () => stil,
    zetStil,
    naarMenu: () => { window.location.href = "../../index.html"; }
  };
})();
