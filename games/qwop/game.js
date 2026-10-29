// Jessy QWOP: loop de 100 meter met Q/W (dijen) en O/P (kuiten). Net zo onhandig als het origineel.
// Net als het echte QWOP gebouwd op de Box2D-natuurkunde (hier planck.js): ledematen met scharnieren
// en motortjes. Q/W laten de heupmotoren draaien, O/P de kniemotoren.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const RECORD_SLEUTEL = "qwop.record";
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);
  const gezichten = Arcade.gezichten();
  const pl = window.planck;
  const Vec2 = pl.Vec2;

  // --- Spelregels en natuurkunde (in meters, y omhoog) ---
  const SCHAAL = 90;               // pixels per meter
  const GROND_Y = 430;             // waar de baan in beeld ligt
  const FINISH = 100;              // meter
  const STAP = 1 / 60;
  const HEUP_SNELHEID = 3.2;
  const HEUP_KRACHT = 260;
  const KNIE_SNELHEID = 4;
  const KNIE_KRACHT = 160;
  const SLAP_KRACHT = 18;          // zonder toets houden de gewrichten nog een klein beetje stand
  const HOOFD_STRAAL = 0.22;
  const EVENWICHT = 2;             // een klein beetje hulp om rechtop te blijven (0 = net zo moeilijk als het origineel)

  const KRETEN = ["AU!", "OEPS", "JESSY.EXE CRASHT", "DAT WAS DE CREATINE NIET", "BENEN VAN KWARK", "OEF!", "PLAT!"];

  let toestand;      // klaar, lopen, gevallen, einde
  let wereld, delen, gewrichten, tijd = 0, sinds = 0, looptijd, afstand, gevallenOp, finish, nieuwRecord, valTekst;
  let toetsen = { Q: false, W: false, O: false, P: false };
  let opgebouwd = 0, camX = 0, gezicht = null, kreten = [];
  let record = Arcade.lees(RECORD_SLEUTEL, 0);
  const aanraking = new Map();      // vinger -> knop

  // --- De loper bouwen ---
  function deel(x, y, w, h, opties = {}) {
    const lijf = wereld.createBody({ type: "dynamic", position: Vec2(x, y), angularDamping: 0.6 });
    const vorm = opties.cirkel ? pl.Circle(opties.cirkel) : pl.Box(w / 2, h / 2);
    lijf.createFixture(vorm, { density: opties.dichtheid || 1, friction: opties.wrijving ?? 0.4, filterGroupIndex: -1 });
    lijf.maat = { w, h, r: opties.cirkel };
    return lijf;
  }

  function scharnier(a, b, x, y, onder, boven, motor) {
    return wereld.createJoint(pl.RevoluteJoint({
      enableLimit: true, lowerAngle: onder, upperAngle: boven,
      enableMotor: !!motor, maxMotorTorque: SLAP_KRACHT, motorSpeed: 0
    }, a, b, Vec2(x, y)));
  }

  function nieuwSpel() {
    toestand = "klaar";
    looptijd = 0;
    afstand = 0;
    gevallenOp = 0;
    finish = false;
    nieuwRecord = false;
    kreten = [];
    camX = -W * 0.4;
    gezicht = Arcade.anderGezicht(gezichten, gezicht);

    wereld = pl.World({ gravity: Vec2(0, -10) });
    const grond = wereld.createBody();
    grond.createFixture(pl.Edge(Vec2(-20, 0), Vec2(FINISH + 40, 0)), { friction: 1 });

    delen = {
      romp: deel(0, 1.33, 0.32, 0.7, { dichtheid: 2.2 }),
      hoofd: deel(0, 1.9, 0, 0, { cirkel: HOOFD_STRAAL, dichtheid: 1.2 }),
      armB: deel(0, 1.34, 0.1, 0.56, { dichtheid: 0.8 }),
      armA: deel(0, 1.34, 0.1, 0.56, { dichtheid: 0.8 })
    };
    gewrichten = {
      nek: scharnier(delen.romp, delen.hoofd, 0, 1.68, -0.4, 0.4),
      schouderA: scharnier(delen.romp, delen.armA, 0, 1.62, -2.2, 2.2, true),
      schouderB: scharnier(delen.romp, delen.armB, 0, 1.62, -2.2, 2.2, true)
    };
    for (const k of ["A", "B"]) {
      delen["dij" + k] = deel(0, 0.755, 0.16, 0.45, { dichtheid: 1.6 });
      delen["kuit" + k] = deel(0, 0.305, 0.12, 0.45, { dichtheid: 1.2 });
      delen["voet" + k] = deel(0.07, 0.04, 0.3, 0.08, { dichtheid: 1.5, wrijving: 2 });
      gewrichten["heup" + k] = scharnier(delen.romp, delen["dij" + k], 0, 0.98, -1.0, 1.7, true);
      gewrichten["knie" + k] = scharnier(delen["dij" + k], delen["kuit" + k], 0, 0.53, -2.4, 0, true);
      gewrichten["enkel" + k] = scharnier(delen["kuit" + k], delen["voet" + k], 0, 0.08, -0.4, 0.5, true);
      gewrichten["enkel" + k].setMaxMotorTorque(40);
    }
  }

  // Q: linkerdij naar voren, rechterdij naar achteren (W andersom). O/P doen hetzelfde met de knieën.
  function motoren() {
    const g = gewrichten;
    const { Q, W: w, O, P } = toestand === "lopen" ? toetsen : {};
    const heup = Q && !w ? 1 : w && !Q ? -1 : 0;
    const knie = O && !P ? 1 : P && !O ? -1 : 0;
    const zet = (gewricht, richting, snelheid, kracht) => {
      gewricht.setMotorSpeed(richting * snelheid);
      gewricht.setMaxMotorTorque(richting ? kracht : SLAP_KRACHT);
    };
    zet(g.heupA, heup, HEUP_SNELHEID, HEUP_KRACHT);
    zet(g.heupB, -heup, HEUP_SNELHEID, HEUP_KRACHT);
    zet(g.knieA, knie, KNIE_SNELHEID, KNIE_KRACHT);
    zet(g.knieB, -knie, KNIE_SNELHEID, KNIE_KRACHT);
    // Armen zwaaien tegengesteld mee met de benen
    zet(g.schouderA, -heup, 2.5, 30);
    zet(g.schouderB, heup, 2.5, 30);
    if (toestand === "gevallen" || toestand === "einde") {
      for (const j of Object.values(g)) j.setMaxMotorTorque(4);
    } else if (toestand === "lopen") {
      // Evenwichtsorgaan: duwt de romp zachtjes terug naar rechtop
      const romp = delen.romp;
      romp.applyTorque(-romp.getAngle() * EVENWICHT - romp.getAngularVelocity() * EVENWICHT * 0.3);
    }
  }

  function wereldPunt(lijf, x, y) {
    return lijf.getWorldPoint(Vec2(x, y));
  }

  // Met je hoofd of je handen op de grond = gevallen
  function checkVallen() {
    const kop = delen.hoofd.getPosition();
    const handA = wereldPunt(delen.armA, 0, -0.28);
    const handB = wereldPunt(delen.armB, 0, -0.28);
    if (kop.y - HOOFD_STRAAL < 0.03 || handA.y < 0.04 || handB.y < 0.04) {
      toestand = "gevallen";
      gevallenOp = tijd;
      valTekst = KRETEN[Math.floor(Math.random() * KRETEN.length)];
      Arcade.toon({ type: "sine", van: 140, naar: 45, duur: 0.35, volume: 0.3 });
      Arcade.ruis({ duur: 0.25, volume: 0.2 });
      setTimeout(() => Arcade.toon({ type: "sawtooth", van: 330, naar: 180, duur: 0.8, volume: 0.08, filter: 1100 }), 250);
    }
  }

  function einde() {
    toestand = "einde";
    sinds = tijd;
    const score = eindScore();
    if (score > record) {
      record = score;
      nieuwRecord = true;
      Arcade.bewaar(RECORD_SLEUTEL, record);
    }
    Arcade.vraagNaam("qwop", score);
  }

  // Wie de finish haalt, staat altijd boven wie viel; daarbinnen wint de snelste tijd.
  // Wie viel, telt in decimeters. Arcade.scoreTekst maakt er "62.4 SEC" of "8.7 M" van.
  function eindScore() {
    if (finish) return Math.max(Arcade.FINISH_BASIS / 2, Arcade.FINISH_BASIS - Math.round(looptijd * 10));
    return Math.max(0, Math.floor(afstand * 10));
  }

  // --- Besturing ---
  const KNOPPEN = ["Q", "W", "O", "P"].map((t, i) => ({ t, x: i < 2 ? 30 + i * 100 : W - 230 + (i - 2) * 100, y: H - 92, w: 88, h: 80 }));
  const TOETS = { KeyQ: "Q", KeyW: "W", KeyO: "O", KeyP: "P" };

  function begin() {
    if (toestand === "klaar") toestand = "lopen";
  }

  function opnieuw() {
    nieuwSpel();
    toestand = "lopen";
  }

  document.addEventListener("keydown", (e) => {
    const t = TOETS[e.code];
    if (t) {
      e.preventDefault();
      toetsen[t] = true;
      begin();
    } else if (e.code === "KeyR") {
      if (toestand !== "einde" || tijd - sinds > 1) opnieuw();
    } else if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (!e.repeat && toestand === "einde" && tijd - sinds > 1) opnieuw();
    } else if (e.code === "KeyM") Arcade.zetStil(!Arcade.isStil());
  });
  document.addEventListener("keyup", (e) => {
    const t = TOETS[e.code];
    if (t) toetsen[t] = false;
  });
  window.addEventListener("blur", () => { toetsen = { Q: false, W: false, O: false, P: false }; });

  // Op een telefoon: vier knoppen op het scherm, met meerdere vingers tegelijk
  function punt(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  function knopOp(p) {
    return KNOPPEN.find((k) => p.x >= k.x && p.x <= k.x + k.w && p.y >= k.y && p.y <= k.y + k.h);
  }
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const knop = knopOp(punt(e));
    if (knop) {
      aanraking.set(e.pointerId, knop.t);
      toetsen[knop.t] = true;
      begin();
    } else if (toestand === "einde" && tijd - sinds > 1) opnieuw();
  });
  function laatLos(e) {
    const t = aanraking.get(e.pointerId);
    if (t) {
      aanraking.delete(e.pointerId);
      if (![...aanraking.values()].includes(t)) toetsen[t] = false;
    }
  }
  window.addEventListener("pointerup", laatLos);
  window.addEventListener("pointercancel", laatLos);

  // --- Bijwerken ---
  function update(dt) {
    tijd += dt;
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 1.5);
    // Voor de start staat Jessy stil (de wereld staat dan nog uit)
    if (toestand !== "klaar") {
      opgebouwd = Math.min(opgebouwd + dt, STAP * 4);
      while (opgebouwd >= STAP) {
        motoren();
        wereld.step(STAP, 8, 3);
        opgebouwd -= STAP;
      }
    }
    if (toestand === "lopen") {
      looptijd += dt;
      const voor = Math.floor(afstand);
      afstand = Math.max(afstand, delen.romp.getPosition().x);
      if (Math.floor(afstand) > voor && Math.floor(afstand) % 10 === 0) {
        kreet(Math.floor(afstand) + " METER!", "#ffe14d");
        Arcade.toon({ type: "square", van: 660, naar: 990, duur: 0.12, volume: 0.07 });
      }
      if (afstand >= FINISH) {
        finish = true;
        Arcade.feest("JESSY HEEFT DE 100 METER GEHAALD!");
        gevallenOp = tijd;
        toestand = "gevallen"; // even uitlopen, dan de uitslag
        valTekst = "FINISH! " + looptijd.toFixed(1) + " SEC";
        return;
      }
      checkVallen();
    } else if (toestand === "gevallen" && tijd - gevallenOp > 2.2) {
      einde();
    }
    // Camera volgt de romp
    const doel = delen.romp.getPosition().x * SCHAAL - W * 0.4;
    camX += (doel - camX) * Math.min(1, dt * 5);
  }

  function kreet(woord, kleur) {
    kreten.push({ tekst: woord, leeftijd: 0, kleur });
  }

  // --- Tekenen ---
  const sx = (x) => x * SCHAAL - camX;
  const sy = (y) => GROND_Y - y * SCHAAL;

  // Tekst die mee schuift met de baan: niet in beeld houden (Arcade.tekst doet dat bij centreren),
  // anders plakken de bordjes aan de rand op elkaar. Het lettertype is even breed als hoog per teken.
  function schuifTekst(woord, x, y, grootte, kleur) {
    tekst(woord, x - (woord.length * grootte) / 2, y, grootte, kleur, "left");
  }

  function tekenAchtergrond() {
    const lucht = c.createLinearGradient(0, 0, 0, 200);
    lucht.addColorStop(0, "#5ec8ff");
    lucht.addColorStop(1, "#bfe9ff");
    c.fillStyle = lucht;
    c.fillRect(0, 0, W, 200);
    // Tribune met publiek dat een beetje meejuicht
    const tribune = -camX * 0.4;
    c.fillStyle = "#555b6e";
    c.fillRect(0, 120, W, 190);
    const kleuren = ["#ff3e5a", "#ffe14d", "#3ef0ff", "#5fd35f", "#ff9800", "#fff", "#b06cff"];
    for (let rij = 0; rij < 6; rij++) {
      const schuif = (((tribune + rij * 9) % 18) + 18) % 18;
      for (let i = -1; i < W / 18 + 1; i++) {
        const wx = i * 18 + schuif;
        const n = Math.round((wx - tribune) / 18) * 7 + rij * 13;
        const spring = toestand === "lopen" && (n + Math.floor(tijd * 4)) % 9 === 0 ? -4 : 0;
        c.fillStyle = kleuren[((n % 7) + 7) % 7];
        c.beginPath();
        c.arc(wx, 140 + rij * 26 + spring, 6, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.fillStyle = "#3a3f4f";
    c.fillRect(0, 300, W, 20);
    // Reclameborden
    c.fillStyle = "#1e2a5a";
    c.fillRect(0, 320, W, 40);
    const bord = -camX * 0.8;
    const teksten = ["JESSY 33", "KWARK", "VIBECODE", "BOE", "CREATINE", "POLISH COW"];
    for (let i = Math.floor(-bord / 240) - 1; i < Math.floor((W - bord) / 240) + 1; i++) {
      schuifTekst(teksten[((i % teksten.length) + teksten.length) % teksten.length], bord + i * 240 + 120, 340, 12, "#ffe14d");
    }
  }

  function tekenBaan() {
    c.fillStyle = "#c0392b";
    c.fillRect(0, 360, W, H - 360);
    c.fillStyle = "#e05a4b";
    c.fillRect(0, GROND_Y, W, 4);
    c.fillStyle = "rgba(255, 255, 255, 0.7)";
    c.fillRect(0, 380, W, 3);
    c.fillRect(0, 470, W, 3);
    // Meterstreepjes
    const eerste = Math.floor(camX / SCHAAL);
    for (let m = eerste; m < eerste + W / SCHAAL + 2; m++) {
      const x = sx(m);
      c.fillStyle = m % 10 === 0 ? "#fff" : "rgba(255, 255, 255, 0.35)";
      c.fillRect(x - 1, 383, m % 10 === 0 ? 4 : 2, 87);
      if (m % 10 === 0 && m >= 0 && m <= FINISH) schuifTekst(m === 0 ? "START" : m + "M", x, 400, 12, "#fff");
    }
    // Finish
    const fx = sx(FINISH);
    if (fx > -40 && fx < W + 40) {
      for (let y = 383; y < 470; y += 10) {
        for (let k = 0; k < 2; k++) {
          c.fillStyle = (y / 10 + k) % 2 ? "#000" : "#fff";
          c.fillRect(fx + k * 10, y, 10, 10);
        }
      }
      c.fillStyle = "#ddd";
      c.fillRect(fx - 4, 200, 6, 230);
      c.fillRect(fx + 20, 200, 6, 230);
      c.fillStyle = "#ff3e5a";
      c.fillRect(fx - 4, 200, 30, 22);
      schuifTekst("FINISH", fx + 11, 190, 12, "#fff");
    }
    // Vlaggetje bij je eigen beste afstand
    if (record > 0 && record < Arcade.FINISH_BASIS / 2) {
      const rx = sx(record / 10);
      c.fillStyle = "#ffe14d";
      c.fillRect(rx, 390, 3, 40);
      c.fillRect(rx, 390, 22, 12);
      schuifTekst("RECORD", rx + 12, 380, 7, "#ffe14d");
    }
  }

  // Een ledemaat als gedraaide rechthoek
  function tekenBlok(lijf, kleur, rond = 6) {
    const p = lijf.getPosition();
    const { w, h } = lijf.maat;
    c.save();
    c.translate(sx(p.x), sy(p.y));
    c.rotate(-lijf.getAngle());
    c.fillStyle = kleur;
    c.beginPath();
    c.roundRect(-w / 2 * SCHAAL, -h / 2 * SCHAAL, w * SCHAAL, h * SCHAAL, rond);
    c.fill();
    c.restore();
  }

  function tekenBeen(k, achter) {
    const huid = achter ? "#c99472" : "#e8b48a";
    tekenBlok(delen["kuit" + k], huid);
    tekenBlok(delen["voet" + k], achter ? "#b0b0b0" : "#fafafa", 4);
    tekenBlok(delen["dij" + k], achter ? "#123a7a" : "#1e56b8", 7);
  }

  function tekenRomp() {
    const lijf = delen.romp;
    const p = lijf.getPosition();
    const { w, h } = lijf.maat;
    c.save();
    c.translate(sx(p.x), sy(p.y));
    c.rotate(-lijf.getAngle());
    const bw = w * SCHAAL, bh = h * SCHAAL;
    c.fillStyle = "#fafafa";
    c.beginPath();
    c.roundRect(-bw / 2, -bh / 2, bw, bh, 10);
    c.fill();
    c.fillStyle = "#1e56b8";
    c.fillRect(-bw / 2, bh / 2 - 12, bw, 12);
    c.fillStyle = "#ff3e5a";
    c.fillRect(-bw / 2, -bh / 2 + 16, bw, 5);
    // Startnummer 33
    c.fillStyle = "#fff";
    c.strokeStyle = "#999";
    c.lineWidth = 1;
    c.fillRect(-12, -6, 24, 20);
    c.strokeRect(-12, -6, 24, 20);
    c.font = `10px ${Arcade.FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#000";
    c.fillText("33", 0, 5);
    c.restore();
  }

  function tekenHoofd() {
    const lijf = delen.hoofd;
    const p = lijf.getPosition();
    const r = HOOFD_STRAAL * SCHAAL;
    c.save();
    c.translate(sx(p.x), sy(p.y));
    c.rotate(-lijf.getAngle());
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(0, 0, r + 2, 0, Math.PI * 2);
    c.fill();
    if (gezicht) Arcade.plaatje(c, gezicht, 0, 0, r);
    c.restore();
  }

  function tekenLoper() {
    tekenBlok(delen.armB, "#c99472", 5);
    tekenBeen("B", true);
    tekenRomp();
    tekenBeen("A", false);
    tekenHoofd();
    tekenBlok(delen.armA, "#e8b48a", 5);
  }

  function tekenKnoppen() {
    KNOPPEN.forEach((k) => {
      const aan = toetsen[k.t];
      c.fillStyle = "rgba(0, 0, 0, 0.45)";
      c.beginPath();
      c.roundRect(k.x, k.y + 4, k.w, k.h, 10);
      c.fill();
      c.fillStyle = aan ? "#ffe14d" : "rgba(255, 255, 255, 0.85)";
      c.beginPath();
      c.roundRect(k.x, k.y + (aan ? 3 : 0), k.w, k.h, 10);
      c.fill();
      tekst(k.t, k.x + k.w / 2, k.y + k.h / 2 + (aan ? 3 : 0), 30, aan ? "#000" : "#333");
    });
    tekst("DIJEN", 130, H - 104, 8, "#fff");
    tekst("KUITEN", W - 130, H - 104, 8, "#fff");
  }

  function teken() {
    if (toestand === undefined) return;
    tekenAchtergrond();
    tekenBaan();
    tekenLoper();
    tekenKnoppen();

    // Afstand bovenin, zoals in het origineel
    tekst(afstand.toFixed(1) + " METER", W / 2, 34, 22, "#fff");
    if (toestand === "lopen" || toestand === "gevallen") tekst(looptijd.toFixed(1) + " SEC", W / 2, 64, 10, "#ddd");
    tekst("R = OPNIEUW", W - 80, 24, 8, "#fff");

    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 1.5);
      tekst(k.tekst, W / 2, 110 - k.leeftijd * 20, 16, k.kleur);
    });
    c.globalAlpha = 1;

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.72)";
      c.fillRect(0, 0, W, H);
      tekst("JESSY QWOP", W / 2, 80, 34, "#3ef0ff");
      tekst("HELP JESSY DE 100 METER TE LOPEN. SUCCES, JE GAAT HET NODIG HEBBEN.", W / 2, 130, 9);
      tekst("Q + W = DIJEN", W / 2, 180, 16, "#ffe14d");
      tekst("O + P = KUITEN", W / 2, 215, 16, "#ffe14d");
      tekst("HOOFD OF HANDEN OP DE GROND = GEVALLEN", W / 2, 260, 10, "#ff5a5a");
      tekst("TIP: KLEINE STAPJES EN VEEL GEDULD", W / 2, 288, 9, "#5fd35f");
      tekst("HIGHSCORE: SNELSTE TIJD OP DE 100 METER", W / 2, 314, 9, "#ddd");
      tekst("NIET GEHAALD? DAN TELT HOE VER JE KWAM", W / 2, 334, 9, "#ddd");
      tekst("DRUK OP Q, W, O OF P OM TE BEGINNEN", W / 2, 375, 14);
      if (record) tekst("RECORD " + Arcade.scoreTekst("qwop", record), W / 2, 408, 10, "#ffe14d");
    } else if (toestand === "gevallen") {
      tekst(valTekst, W / 2, 150, 20, finish ? "#5fd35f" : "#ff5a5a");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.7)";
      c.fillRect(0, 0, W, H);
      if (finish) {
        tekst("JESSY HEEFT HET GEHAALD!", W / 2, 110, 24, "#5fd35f");
        tekst("100 METER IN " + looptijd.toFixed(1) + " SECONDEN", W / 2, 155, 12, "#fff");
      } else {
        tekst("JESSY LIGT PLAT", W / 2, 110, 28, "#ff5a5a");
        tekst("NA " + afstand.toFixed(1) + " METER", W / 2, 155, 14, "#fff");
      }
      tekst(Arcade.plaagTekst(), W / 2, 190, 10, "#ddd");
      tekst(Arcade.scoreTekst("qwop", eindScore()), W / 2, 240, 22);
      tekst("RECORD " + Arcade.scoreTekst("qwop", record), W / 2, 280, 14, "#3ef0ff");
      if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, 315, 13, "#ff3ea5");
      if (tijd - sinds > 1 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE / KLIK = OPNIEUW", W / 2, 370, 13);
    }
  }

  Arcade.volgScore(() => Math.floor(afstand));
  nieuwSpel();
  Arcade.lus(update, teken);
})();
