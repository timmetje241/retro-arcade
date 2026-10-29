// Stiekem Gluren: Jessy kijkt op de bank stiekem dank memes op zijn telefoon. Niet betrapt worden door Lisa!
// Naar het idee van een oud "ogle"-spelletje: ingedrukt houden om te gluren, loslaten als ze kijkt.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const RECORD_SLEUTEL = "gluren.record";
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);
  Arcade.geenMuziekHier(); // de Polish cow even uit, anders hoor je de memes niet

  const gezichten = Arcade.gezichten();
  const lisa = new Image();
  lisa.src = "../../img/lisa.png";

  // --- Spelregels ---
  const MAX_BETRAPT = 3;
  const PUNTEN_PER_SEC = 10;
  const MAX_VERMENIGVULDIGER = 4;
  const MEME_DUUR = 1.6;            // zo lang staat een meme in beeld
  const NEP_KANS = 0.25;            // soms doet Lisa alsof ze gaat kijken, maar kijkt ze toch niet

  // Zelfgetekende tekstmemes (geen echte plaatjes)
  const MEMES = [
    { tekst: "STONKS", emoji: "📈", kleur: "#1565c0", zeg: "stonks" },
    { tekst: "BRUH", emoji: "🗿", kleur: "#424242", zeg: "bruh" },
    { tekst: "SHEESH", emoji: "🥶", kleur: "#00838f", zeg: "sheeesh" },
    { tekst: "EMOTIONAL DAMAGE", emoji: "💥", kleur: "#c62828", zeg: "emotional damage" },
    { tekst: "MUCH WOW", emoji: "🐕", kleur: "#f9a825", zeg: "much wow" },
    { tekst: "THIS IS FINE", emoji: "🔥", kleur: "#e65100", zeg: "this is fine" },
    { tekst: "NOICE", emoji: "👌", kleur: "#2e7d32", zeg: "noice" },
    { tekst: "SUS", emoji: "📮", kleur: "#b71c1c", zeg: "sus" },
    { tekst: "YEET", emoji: "🚀", kleur: "#4527a0", zeg: "yeet" },
    { tekst: "OK BOOMER", emoji: "👴", kleur: "#5d4037", zeg: "ok boomer" },
    { tekst: "UNO REVERSE", emoji: "🔄", kleur: "#d32f2f", zeg: "no u" },
    { tekst: "GIGACHAD", emoji: "🗿", kleur: "#212121", zeg: "giga chad" },
    { tekst: "KOE GOES BOE", emoji: "🐄", kleur: "#558b2f", zeg: "moo" },
    { tekst: "JESSY.EXE GESTOPT", emoji: "💀", kleur: "#37474f", zeg: "oh no" },
    { tekst: "WHEN LISA KIJKT", emoji: "😳", kleur: "#ad1457", zeg: "uh oh" },
    { tekst: "33 JAAR? OOF", emoji: "🎂", kleur: "#6a1b9a", zeg: "oof" }
  ];
  const BETRAPT_TEKST = ["JESSY!!", "WAT DOE JE?!", "WEER DIE MEMES?!", "TELEFOON WEG!", "ECHT HOOR..."];
  const ONSCHULDIG = ["FIUUU~", "LA LA LA~", "*KIJKT TV*", "HMM HMM~"];

  let toestand;          // klaar, spelen, betrapt, einde
  let score, betrapt, gluurt, telefoon, achterElkaar, meme, memeTijd, lisaStaat, lisaTimer, lisaWaarschuwing, spelTijd;
  let tijd = 0, sinds = 0, kreten = [], schud = 0, nieuwRecord = false, jessy = null, onschuldig = 0, gezegd = 0;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);

  function nieuwSpel() {
    toestand = "klaar";
    score = 0;
    betrapt = 0;
    gluurt = false;
    telefoon = 0;          // 0 = weggestopt, 1 = helemaal voor zijn neus
    achterElkaar = 0;
    meme = MEMES[0];
    memeTijd = 0;
    lisaStaat = "tv";      // tv, verdacht, kijkt
    lisaTimer = 2.5;
    lisaWaarschuwing = false;
    spelTijd = 0;
    kreten = [];
    nieuwRecord = false;
    jessy = Arcade.anderGezicht(gezichten, jessy);
  }

  function vermenigvuldiger() {
    return Math.min(MAX_VERMENIGVULDIGER, 1 + Math.floor(achterElkaar / 3));
  }

  // --- Meme-geluiden, zelf nagemaakt met de geluidschip van de browser ---
  function vineBoom() {
    Arcade.toon({ type: "sine", van: 110, naar: 38, duur: 0.9, volume: 0.5 });
    Arcade.toon({ type: "square", van: 70, naar: 30, duur: 0.5, volume: 0.12, filter: 300 });
    Arcade.ruis({ duur: 0.15, volume: 0.15 });
  }
  function airhorn() {
    // daaa-da-da-daaaa, met drie tonen tegelijk zoals een echte toeter
    [[0, 0.35], [0.4, 0.12], [0.55, 0.12], [0.7, 0.6]].forEach(([wacht, duur]) => {
      [440, 554, 659].forEach((f) => Arcade.toon({ type: "sawtooth", van: f, naar: f * 0.98, duur, volume: 0.06, vertraging: wacht, filter: 3000 }));
    });
  }
  function hitmarker() {
    [0, 0.09, 0.18].forEach((w) => Arcade.toon({ type: "square", van: 3200, naar: 2600, duur: 0.04, volume: 0.08, vertraging: w }));
  }
  function sadTrombone() {
    [[392, 0], [370, 0.35], [349, 0.7], [330, 1.05]].forEach(([f, w], i) => {
      Arcade.toon({ type: "sawtooth", van: f, naar: i === 3 ? f * 0.85 : f, duur: i === 3 ? 0.9 : 0.32, volume: 0.1, vertraging: w, filter: 1200 });
    });
  }
  function dunDunDun() {
    [[196, 0, 0.25], [196, 0.3, 0.25], [185, 0.6, 1.0]].forEach(([f, w, d]) => {
      [f, f * 1.19, f * 1.5].forEach((g) => Arcade.toon({ type: "sawtooth", van: g, duur: d, volume: 0.06, vertraging: w, filter: 1500 }));
    });
  }
  function bonk() {
    Arcade.toon({ type: "triangle", van: 300, naar: 80, duur: 0.2, volume: 0.25 });
  }
  const MEME_GELUIDEN = [vineBoom, airhorn, hitmarker, vineBoom, bonk];

  // De browser zegt de meme hardop (als hij dat kan); in het Engels, zo hoort het bij memes
  function zeg(woorden, nederlands) {
    if (Arcade.isStil() || !window.speechSynthesis) return;
    const uitspraak = new SpeechSynthesisUtterance(woorden);
    uitspraak.lang = nederlands ? "nl-NL" : "en-US";
    uitspraak.rate = 0.95 + Math.random() * 0.3;
    uitspraak.pitch = 0.6 + Math.random() * 0.8;
    uitspraak.volume = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(uitspraak);
  }

  function nieuweMeme() {
    let volgende;
    do { volgende = MEMES[Math.floor(Math.random() * MEMES.length)]; } while (volgende === meme);
    meme = volgende;
    memeTijd = 0;
    // Om en om een geluidje of de stem, anders wordt het een kakofonie
    gezegd++;
    if (gezegd % 2) MEME_GELUIDEN[Math.floor(Math.random() * MEME_GELUIDEN.length)]();
    else zeg(meme.zeg);
  }

  // --- Besturing: ingedrukt houden = gluren ---
  function druk() {
    if (toestand === "klaar") { toestand = "spelen"; return; }
    if (toestand === "einde") {
      if (tijd - sinds > 1.2) nieuwSpel();
      return;
    }
    if (toestand === "spelen") gluurt = true;
  }
  function los() {
    gluurt = false;
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowDown") {
      e.preventDefault();
      if (!e.repeat) druk();
    } else if (e.code === "KeyM") Arcade.zetStil(!Arcade.isStil());
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowDown") los();
  });
  canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); druk(); });
  window.addEventListener("pointerup", los);
  window.addEventListener("pointercancel", los);
  window.addEventListener("blur", los);

  // --- Bijwerken ---
  function betrap() {
    betrapt++;
    toestand = "betrapt";
    sinds = tijd;
    schud = 0.4;
    gluurt = false;
    achterElkaar = 0;
    if (window.speechSynthesis) speechSynthesis.cancel();
    dunDunDun();
    setTimeout(sadTrombone, 900);
    kreten.push({ tekst: BETRAPT_TEKST[Math.floor(Math.random() * BETRAPT_TEKST.length)], x: 300, y: 120, leeftijd: 0, groot: true, kleur: "#ff5a5a" });
    setTimeout(() => zeg("Jessy!", true), 150);
  }

  function einde() {
    toestand = "einde";
    sinds = tijd;
    score = Math.floor(score);
    if (score > record) {
      record = score;
      nieuwRecord = true;
      Arcade.bewaar(RECORD_SLEUTEL, record);
    }
    Arcade.confetti(80);
    Arcade.vraagNaam("gluren", score);
  }

  function updateLisa(dt) {
    lisaTimer -= dt;
    if (lisaStaat === "tv" && lisaTimer <= 0) {
      lisaStaat = "verdacht";
      lisaWaarschuwing = Math.random() < NEP_KANS; // true = ze doet alleen alsof
      lisaTimer = Math.max(0.32, 0.95 - spelTijd * 0.008);
      Arcade.toon({ type: "sine", van: 520, naar: 700, duur: 0.18, volume: 0.08 }); // "hmm?"
    } else if (lisaStaat === "verdacht" && lisaTimer <= 0) {
      if (lisaWaarschuwing) {
        lisaStaat = "tv"; // nepperd!
        lisaTimer = 0.6 + Math.random() * 1.5;
      } else {
        lisaStaat = "kijkt";
        lisaTimer = 0.9 + Math.random() * 0.8;
      }
    } else if (lisaStaat === "kijkt") {
      // Zit hij op zijn telefoon terwijl ze kijkt? Dan is hij erbij
      if (telefoon > 0.45) {
        betrap();
        lisaStaat = "tv";
        lisaTimer = 2.5;
        return;
      }
      if (lisaTimer <= 0) {
        lisaStaat = "tv";
        // Hoe langer je speelt, hoe vaker ze kijkt
        const basis = Math.max(0.7, 3.4 - spelTijd * 0.03);
        lisaTimer = basis + Math.random() * 2.2;
      }
    }
  }

  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 1.4);
    onschuldig += dt;

    // De telefoon gaat niet in één keer weg: even opletten dus
    const doel = gluurt && toestand === "spelen" ? 1 : 0;
    telefoon += Math.sign(doel - telefoon) * Math.min(Math.abs(doel - telefoon), dt * 7);

    if (toestand === "betrapt" && tijd - sinds > 1.8) {
      if (betrapt >= MAX_BETRAPT) einde();
      else toestand = "spelen";
    }
    if (toestand !== "spelen") return;
    spelTijd += dt;
    updateLisa(dt);
    if (toestand !== "spelen") return;

    if (telefoon > 0.9) {
      achterElkaar += dt;
      score += dt * PUNTEN_PER_SEC * vermenigvuldiger();
      memeTijd += dt;
      if (memeTijd >= MEME_DUUR || memeTijd === dt) nieuweMeme();
    } else if (!gluurt) {
      achterElkaar = 0;
      memeTijd = 0;
    }
  }

  // --- Tekenen ---
  function tekenKamer() {
    // Behang en vloer
    c.fillStyle = "#e9dcc0";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#e0d0ae";
    for (let x = 0; x < W; x += 40) c.fillRect(x, 0, 20, 380);
    c.fillStyle = "#8d6e4e";
    c.fillRect(0, 380, W, H - 380);
    c.fillStyle = "#7a5c3e";
    for (let x = 0; x < W; x += 60) c.fillRect(x, 380, 3, H - 380);
    // Schilderij met een koe
    c.fillStyle = "#5d4037";
    c.fillRect(40, 60, 120, 90);
    c.fillStyle = "#b3e5fc";
    c.fillRect(48, 68, 104, 74);
    c.fillStyle = "#7cb342";
    c.fillRect(48, 118, 104, 24);
    c.font = "38px serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("🐄", 100, 112);
    // Staande lamp
    c.fillStyle = "#555";
    c.fillRect(696, 120, 6, 260);
    c.fillStyle = "#ffe082";
    c.beginPath();
    c.moveTo(670, 120);
    c.lineTo(728, 120);
    c.lineTo(714, 80);
    c.lineTo(684, 80);
    c.fill();
  }

  function tekenBank() {
    c.fillStyle = "#3b5e2b";
    c.beginPath();
    c.roundRect(150, 210, 500, 130, 26);
    c.fill();
    c.fillStyle = "#4e7a39";
    c.beginPath();
    c.roundRect(170, 300, 460, 70, 16);
    c.fill();
    c.fillStyle = "#3b5e2b";
    c.beginPath();
    c.roundRect(130, 260, 60, 120, 20);
    c.fill();
    c.beginPath();
    c.roundRect(610, 260, 60, 120, 20);
    c.fill();
    c.fillStyle = "#2b2b2b";
    c.fillRect(180, 370, 12, 14);
    c.fillRect(608, 370, 12, 14);
  }

  function tekenPersoon(x, hoofd, opties) {
    const { shirt, broek, hoek = 0, dx = 0, dy = 0, telefoonHand = 0 } = opties;
    // Benen
    c.fillStyle = broek;
    c.fillRect(x - 34, 312, 68, 26);
    c.fillRect(x - 32, 330, 26, 60);
    c.fillRect(x + 6, 330, 26, 60);
    c.fillStyle = "#222";
    c.fillRect(x - 36, 386, 32, 10);
    c.fillRect(x + 4, 386, 32, 10);
    // Lijf
    c.fillStyle = shirt;
    c.beginPath();
    c.roundRect(x - 40, 230, 80, 90, 20);
    c.fill();
    // Armen: naar de telefoon of op de knieën
    c.strokeStyle = shirt;
    c.lineWidth = 16;
    c.lineCap = "round";
    c.beginPath();
    if (telefoonHand > 0) {
      const hx = x - 6 - telefoonHand * 6;
      const hy = 318 - telefoonHand * 26;
      c.moveTo(x - 32, 250); c.lineTo(hx - 12, hy);
      c.moveTo(x + 32, 250); c.lineTo(hx + 12, hy);
    } else {
      c.moveTo(x - 32, 250); c.lineTo(x - 30, 322);
      c.moveTo(x + 32, 250); c.lineTo(x + 30, 322);
    }
    c.stroke();
    // Hoofd (rond, met dunne rand)
    c.save();
    c.translate(x + dx, 192 + dy);
    c.rotate(hoek);
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(0, 0, 48, 0, Math.PI * 2);
    c.fill();
    Arcade.plaatje(c, hoofd, 0, 0, 45);
    c.restore();
  }

  function tekenTelefoonInHand(x) {
    if (telefoon <= 0.05) return;
    const hx = x - 6 - telefoon * 6;
    const hy = 318 - telefoon * 26;
    c.save();
    c.translate(hx, hy);
    c.rotate(-0.25);
    c.fillStyle = "#111";
    c.fillRect(-14, -22, 28, 44);
    c.fillStyle = meme.kleur;
    c.fillRect(-11, -18, 22, 34);
    c.restore();
    // Schermlicht op zijn gezicht
    c.fillStyle = `rgba(150, 200, 255, ${0.15 * telefoon})`;
    c.beginPath();
    c.arc(x, 210, 60, 0, Math.PI * 2);
    c.fill();
  }

  function tekenGrotePhone() {
    // De meme groot in beeld, als een telefoon die van rechts in beeld schuift
    if (telefoon <= 0.05) return;
    const x = W - 200 * telefoon - 10;
    const y = 90;
    c.fillStyle = "#000";
    c.beginPath();
    c.roundRect(x, y, 190, 330, 22);
    c.fill();
    c.fillStyle = meme.kleur;
    c.fillRect(x + 12, y + 30, 166, 270);
    // Een beetje "deep fried": felle rand en schudden
    const tril = memeTijd < 0.15 ? (Math.random() - 0.5) * 8 : 0;
    c.font = "86px serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(meme.emoji, x + 95 + tril, y + 150);
    const regels = meme.tekst.length > 10 ? meme.tekst.split(" ") : [meme.tekst];
    regels.forEach((r, i) => tekst(r, x + 95, y + 225 + i * 22 - (regels.length - 1) * 11, regels.length > 1 ? 13 : 18, "#fff"));
    tekst("DANKMEMES", x + 95, y + 46, 9, "#ffe14d");
    c.fillStyle = "#333";
    c.fillRect(x + 75, y + 12, 40, 6);
  }

  function tekenLisa() {
    let hoek = 0, dx = 0;
    if (lisaStaat === "verdacht") { hoek = 0.12; dx = 6; }
    if (lisaStaat === "kijkt" || toestand === "betrapt") { hoek = 0.32; dx = 18; }
    tekenPersoon(300, lisa, { shirt: "#5c6bc0", broek: "#263238", hoek, dx });
    if (toestand === "spelen" && lisaStaat === "verdacht") tekst("?", 300, 110 + Math.sin(tijd * 10) * 3, 28, "#ffe14d");
    if (lisaStaat === "kijkt" && toestand === "spelen") {
      tekst("👀", 300, 110, 26);
      // Kijklijn naar Jessy
      c.strokeStyle = "rgba(255, 90, 90, 0.7)";
      c.setLineDash([8, 8]);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(345, 190);
      c.lineTo(450, 210);
      c.stroke();
      c.setLineDash([]);
    }
  }

  function tekenJessy() {
    // Gluren: hoofd naar beneden, naar de telefoon. Anders onschuldig naar de tv
    const hoek = -0.35 * telefoon;
    const dy = 14 * telefoon;
    tekenPersoon(500, jessy, { shirt: "#f5f5f5", broek: "#1e3a5f", hoek, dy, telefoonHand: telefoon });
    tekenTelefoonInHand(500);
    if (toestand === "spelen" && telefoon < 0.05) {
      const t = ONSCHULDIG[Math.floor(onschuldig / 2.5) % ONSCHULDIG.length];
      tekst(t, 520, 120, 10, "#5d4037");
    }
  }

  function tekenHud() {
    tekst("MEME-PUNTEN " + Math.floor(score), 16, 24, 14, "#fff", "left");
    if (vermenigvuldiger() > 1 && toestand === "spelen") tekst("X" + vermenigvuldiger() + " COMBO", 16, 50, 12, "#ff3ea5", "left");
    tekst("BETRAPT", W - 150, 24, 10, "#fff", "left");
    for (let i = 0; i < MAX_BETRAPT; i++) {
      c.fillStyle = i < betrapt ? "#ff3e5a" : "rgba(0, 0, 0, 0.25)";
      c.fillRect(W - 150 + i * 26, 38, 20, 14);
    }
  }

  function teken() {
    c.save();
    if (schud > 0) c.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6);
    tekenKamer();
    tekenBank();
    tekenLisa();
    tekenJessy();
    c.restore();
    tekenGrotePhone();
    tekenHud();

    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 1.4);
      tekst(k.tekst, k.x, k.y - k.leeftijd * 20, k.groot ? 24 : 12, k.kleur);
    });
    c.globalAlpha = 1;

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.7)";
      c.fillRect(0, 0, W, H);
      tekst("STIEKEM GLUREN", W / 2, 90, 30, "#ffe14d");
      tekst("JESSY WIL DANK MEMES KIJKEN...", W / 2, 150, 12);
      tekst("MAAR LISA MAG HET NIET ZIEN!", W / 2, 178, 12, "#ff3ea5");
      tekst("HOUD SPATIE / MUIS INGEDRUKT = GLUREN", W / 2, 240, 11, "#3ef0ff");
      tekst("LOSLATEN ALS LISA KIJKT!", W / 2, 266, 11, "#3ef0ff");
      tekst("? = ZE WORDT ACHTERDOCHTIG", W / 2, 306, 10, "#ffe14d");
      tekst("LANGER GLUREN = MEER PUNTEN", W / 2, 330, 10, "#5fd35f");
      tekst("3X BETRAPT = TELEFOON AFGEPAKT", W / 2, 354, 10, "#ff5a5a");
      tekst("SPATIE / KLIK = START", W / 2, 410, 16);
      tekst("RECORD " + record, W / 2, 450, 10, "#ffe14d");
    } else if (toestand === "betrapt") {
      tekst("BETRAPT!", W / 2, 440, 30, "#ff5a5a");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.65)";
      c.fillRect(0, 0, W, H);
      tekst("TELEFOON AFGEPAKT!", W / 2, 120, 26, "#ff5a5a");
      tekst("LISA IS ER KLAAR MEE", W / 2, 165, 12, "#ffe14d");
      tekst(Arcade.plaagTekst(), W / 2, 195, 10, "#fff");
      tekst("MEME-PUNTEN " + score, W / 2, 250, 20);
      tekst("RECORD " + record, W / 2, 290, 16, "#3ef0ff");
      if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, 325, 13, "#ff3ea5");
      if (tijd - sinds > 1.2 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE / KLIK = OPNIEUW", W / 2, 390, 13);
      tekst("ESC = PAUZE", W / 2, 430, 10, "#ddd");
    }
  }

  Arcade.volgScore(() => Math.floor(score));
  nieuwSpel();
  Arcade.lus(update, teken);
})();
