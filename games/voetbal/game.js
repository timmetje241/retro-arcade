// Kopbal: 1 tegen 1 voetballen met grote hoofden, zoals het oude "1 on 1 Soccer".
// Tegen de computer of met z'n tweeën op één toetsenbord. Wie wil, speelt met een selfie als hoofd.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);

  // --- Veld ---
  const GROND = 392;
  const DOEL_B = 64;              // hoe diep een goal is
  const LAT_Y = GROND - 140;      // hoogte van de lat
  const SPEELTIJD = 90;

  // --- Natuurkunde ---
  const ZWAARTEKRACHT = 1700;
  const BAL_ZWAARTEKRACHT = 1150;
  const LOOPSNELHEID = 280;
  const SPRONG = -640;
  const HOOFD_R = 30;
  const LIJF_R = 17;
  const BAL_R = 15;
  const TRAP_DUUR = 0.2;
  const TRAP_KRACHT = 470;
  const CPU_SNELHEID = 0.86;     // de computer loopt iets langzamer dan jij

  // --- Hoofden ---
  const gezichten = Arcade.gezichten();
  const maten = [1, 2, 3, 4, 5, 6, 7].map((n) => {
    const img = new Image();
    img.src = `../../img/maten/maat-${n}.png`;
    return img;
  });
  const SELFIE_SLEUTEL = (speler) => `voetbal.selfie${speler}`;

  // --- Instellingen (gekozen voor de aftrap) ---
  const keuze = { modus: 1, hoofd: ["jessy", "maat"] };
  let selfies = [Arcade.lees(SELFIE_SLEUTEL(1), null), Arcade.lees(SELFIE_SLEUTEL(2), null)];

  let toestand = "instellen";     // instellen, aftrap, spelen, goal, einde
  let spelers, bal, score, rest, goldenGoal, tijd = 0, sinds = 0, kreten = [], schud = 0, laatsteGoal = 0;
  const toetsen = {};

  // --- Geluid ---
  function fluit(lang) {
    Arcade.toon({ type: "square", van: 2100, naar: 2000, duur: lang ? 0.5 : 0.15, volume: 0.06 });
    if (!lang) Arcade.toon({ type: "square", van: 2100, naar: 2000, duur: 0.15, volume: 0.06, vertraging: 0.2 });
  }
  function trapGeluid(hard) {
    Arcade.ruis({ duur: 0.05, volume: 0.15 + hard * 0.1 });
    Arcade.toon({ type: "square", van: 180, naar: 70, duur: 0.1, volume: 0.12 });
  }
  function juichen() {
    Arcade.ruis({ duur: 1.4, volume: 0.25 });
    [523, 659, 784, 1047].forEach((f, i) => Arcade.toon({ type: "square", van: f, duur: 0.15, volume: 0.1, vertraging: 0.1 + i * 0.12 }));
  }

  // --- Spelers ---
  function maakSpeler(nr) {
    const links = nr === 1;
    const hoofdKeuze = keuze.hoofd[nr - 1];
    const mens = nr === 1 || keuze.modus === 2;
    let hoofd;
    let naam;
    if (hoofdKeuze === "selfie" && selfies[nr - 1]) {
      hoofd = new Image();
      hoofd.src = selfies[nr - 1];
      naam = nr === 1 ? Arcade.gebruikersnaam() || "SPELER 1" : "SPELER 2";
    } else if (hoofdKeuze === "jessy") {
      hoofd = Arcade.anderGezicht(gezichten, null);
      naam = "JESSY";
    } else {
      hoofd = maten[Math.floor(Math.random() * maten.length)];
      naam = mens ? "SPELER 2" : "CPU";
    }
    return {
      nr, mens, hoofd, naam,
      startX: links ? 220 : W - 220,
      x: 0, y: GROND, vx: 0, vy: 0, opGrond: true,
      richting: links ? 1 : -1,
      trap: 0, getrapt: false,
      shirt: links ? "#ff8a3d" : "#1e88e5",
      broek: links ? "#fff" : "#0d3c75",
      denk: 0, wil: { links: false, rechts: false, spring: false, trap: false }
    };
  }

  function nieuweWedstrijd() {
    spelers = [maakSpeler(1), maakSpeler(2)];
    score = [0, 0];
    rest = SPEELTIJD;
    goldenGoal = false;
    aftrap();
  }

  function aftrap() {
    spelers.forEach((s) => {
      s.x = s.startX;
      s.y = GROND;
      s.vx = s.vy = 0;
      s.trap = 0;
    });
    bal = { x: W / 2, y: 90, vx: (Math.random() - 0.5) * 120, vy: 0, draai: 0 };
    toestand = "aftrap";
    sinds = tijd;
    fluit(false);
  }

  // --- Besturing ---
  // Met 1 speler mag je zowel WASD als de pijltjes gebruiken. Met 2 spelers: links WASD + spatie, rechts pijltjes + pijltje omlaag.
  function knoppenVan(s) {
    if (!s.mens) return s.wil;
    const een = keuze.modus === 1;
    if (s.nr === 1) {
      return {
        links: toetsen.KeyA || (een && toetsen.ArrowLeft),
        rechts: toetsen.KeyD || (een && toetsen.ArrowRight),
        spring: toetsen.KeyW || (een && toetsen.ArrowUp),
        trap: toetsen.Space || toetsen.KeyS || (een && toetsen.ArrowDown)
      };
    }
    return {
      links: toetsen.ArrowLeft,
      rechts: toetsen.ArrowRight,
      spring: toetsen.ArrowUp,
      trap: toetsen.ArrowDown || toetsen.Enter || toetsen.Numpad0
    };
  }

  function trapToetsen(s) {
    if (s.nr === 1) return keuze.modus === 1 ? ["Space", "KeyS", "ArrowDown"] : ["Space", "KeyS"];
    return ["ArrowDown", "Enter", "Numpad0"];
  }

  document.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (toestand === "instellen") {
      if (e.code === "Enter" && !e.repeat) startWedstrijd();
      return;
    }
    if (e.code === "KeyM") Arcade.zetStil(!Arcade.isStil());
    if (toestand === "einde" && !e.repeat && tijd - sinds > 1) {
      if (e.code === "Space" || e.code === "Enter") nieuweWedstrijd();
      if (e.code === "KeyN") toonInstellingen();
      return;
    }
    toetsen[e.code] = true;
    // Trappen gebeurt bij het indrukken van de traptoets zelf, niet zolang je hem vasthoudt
    if (e.repeat || !spelers) return;
    spelers.forEach((s) => {
      if (s.mens && trapToetsen(s).includes(e.code) && s.trap <= 0) begintrap(s);
    });
  });
  document.addEventListener("keyup", (e) => { toetsen[e.code] = false; });
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (toestand === "einde" && tijd - sinds > 1) nieuweWedstrijd();
  });

  function begintrap(s) {
    s.trap = TRAP_DUUR;
    s.getrapt = false;
  }

  // --- Computerspeler ---
  function denkNa(s, dt) {
    s.denk -= dt;
    if (s.denk > 0) return;
    s.denk = 0.06 + Math.random() * 0.05; // een beetje reactietijd, anders is hij niet te verslaan
    const eigenDoelRechts = s.richting === -1;
    const hoofdY = s.y - 62;
    const dx = bal.x - s.x;
    const balAchterMij = eigenDoelRechts ? bal.x > s.x + 10 : bal.x < s.x - 10;
    let doelX;
    if (balAchterMij) {
      // Terug om te verdedigen: tussen de bal en het eigen doel gaan staan
      doelX = bal.x + (eigenDoelRechts ? 34 : -34);
    } else if (Math.abs(dx) < 140) {
      doelX = bal.x + (eigenDoelRechts ? 20 : -20); // net achter de bal, om hem richting de tegenstander te duwen
    } else {
      // Bal ver weg: een beetje terugzakken richting eigen helft
      doelX = (bal.x + (eigenDoelRechts ? W - 150 : 150)) / 2;
    }
    s.wil.links = doelX < s.x - 8;
    s.wil.rechts = doelX > s.x + 8;
    const hoog = bal.y < hoofdY - 10;
    s.wil.spring = s.opGrond && Math.abs(dx) < 90 && hoog && bal.vy > -150 && Math.random() < 0.6;
    const voorMij = eigenDoelRechts ? dx < 0 : dx > 0;
    if (voorMij && Math.abs(dx) < 50 && bal.y > s.y - 60 && s.trap <= 0 && Math.random() < 0.7) begintrap(s);
  }

  // --- Botsingen ---
  function botsCirkel(cx, cy, r, s, e) {
    const dx = bal.x - cx;
    const dy = bal.y - cy;
    const afstand = Math.hypot(dx, dy);
    if (afstand >= r + BAL_R || afstand === 0) return false;
    const nx = dx / afstand;
    const ny = dy / afstand;
    bal.x = cx + nx * (r + BAL_R);
    bal.y = cy + ny * (r + BAL_R);
    const rvx = bal.vx - (s ? s.vx : 0);
    const rvy = bal.vy - (s ? s.vy : 0);
    const naar = rvx * nx + rvy * ny;
    if (naar < 0) {
      bal.vx -= (1 + e) * naar * nx;
      bal.vy -= (1 + e) * naar * ny;
      if (Math.abs(naar) > 120) Arcade.toon({ type: "triangle", van: 300, naar: 200, duur: 0.05, volume: 0.06 });
    }
    return true;
  }

  function botsLat(x1, x2) {
    // De lat als dunne balk; de bal stuitert erop of eronder
    const cx = Math.max(x1, Math.min(bal.x, x2));
    const cy = Math.max(LAT_Y - 6, Math.min(bal.y, LAT_Y));
    const dx = bal.x - cx;
    const dy = bal.y - cy;
    const afstand = Math.hypot(dx, dy);
    if (afstand >= BAL_R || afstand === 0) return;
    const nx = dx / afstand;
    const ny = dy / afstand;
    bal.x = cx + nx * BAL_R;
    bal.y = cy + ny * BAL_R;
    const naar = bal.vx * nx + bal.vy * ny;
    if (naar < 0) {
      bal.vx -= 1.7 * naar * nx;
      bal.vy -= 1.7 * naar * ny;
      Arcade.toon({ type: "square", van: 900, naar: 700, duur: 0.08, volume: 0.06 }); // tok, lat!
    }
  }

  // --- Bijwerken ---
  function updateSpeler(s, dt) {
    if (!s.mens) denkNa(s, dt);
    const k = knoppenVan(s);
    const snelheid = LOOPSNELHEID * (s.mens ? 1 : CPU_SNELHEID);
    s.vx = (k.rechts ? snelheid : 0) - (k.links ? snelheid : 0);
    if (k.spring && s.opGrond) {
      s.vy = SPRONG;
      s.opGrond = false;
    }
    s.vy += ZWAARTEKRACHT * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.y >= GROND) {
      s.y = GROND;
      s.vy = 0;
      s.opGrond = true;
    }
    s.x = Math.max(24, Math.min(W - 24, s.x));
    s.trap = Math.max(0, s.trap - dt);
  }

  let klemPauze = 0;

  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    klemPauze = Math.max(0, klemPauze - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 1.6);
    if (toestand === "instellen" || toestand === "einde") return;

    if (toestand === "goal") {
      if (tijd - sinds > 1.8) {
        if (goldenGoal || rest <= 0) eindigWedstrijd();
        else aftrap();
      }
      // Bal en spelers bewegen nog even uit
    } else if (toestand === "aftrap" && tijd - sinds > 0.6) {
      toestand = "spelen";
    }

    if (toestand === "spelen") {
      rest -= dt;
      if (rest <= 0 && !goldenGoal) {
        rest = 0;
        if (score[0] === score[1]) {
          goldenGoal = true;
          kreten.push({ tekst: "GOLDEN GOAL!", leeftijd: 0, groot: true });
          fluit(false);
        } else {
          eindigWedstrijd();
          return;
        }
      }
    }

    // Een paar kleine stapjes per frame, zodat de bal nergens doorheen schiet
    const stappen = 3;
    const ds = dt / stappen;
    for (let i = 0; i < stappen; i++) {
      spelers.forEach((s) => updateSpeler(s, ds));

      // Spelers duwen elkaar opzij
      const [a, b] = spelers;
      const overlap = 46 - Math.abs(a.x - b.x);
      if (overlap > 0 && Math.abs(a.y - b.y) < 60) {
        const kant = a.x < b.x ? -1 : 1;
        a.x += (kant * overlap) / 2;
        b.x -= (kant * overlap) / 2;
      }

      bal.vy += BAL_ZWAARTEKRACHT * ds;
      bal.vx *= 1 - 0.15 * ds;
      bal.x += bal.vx * ds;
      bal.y += bal.vy * ds;
      bal.draai += (bal.vx * ds) / BAL_R;

      // Grond, plafond en muren
      if (bal.y > GROND - BAL_R) {
        bal.y = GROND - BAL_R;
        if (bal.vy > 60) Arcade.toon({ type: "triangle", van: 160, duur: 0.04, volume: Math.min(0.08, bal.vy / 6000) });
        bal.vy = -bal.vy * 0.72;
        bal.vx *= 0.97;
        if (Math.abs(bal.vy) < 40) bal.vy = 0;
      }
      if (bal.y < BAL_R) { bal.y = BAL_R; bal.vy = Math.abs(bal.vy) * 0.8; }
      if (bal.x < BAL_R) { bal.x = BAL_R; bal.vx = Math.abs(bal.vx) * 0.6; }
      if (bal.x > W - BAL_R) { bal.x = W - BAL_R; bal.vx = -Math.abs(bal.vx) * 0.6; }
      botsLat(0, DOEL_B);
      botsLat(W - DOEL_B, W);

      // Koppen en lijfjes
      let geraakt = 0;
      spelers.forEach((s) => {
        const hoofd = botsCirkel(s.x, s.y - 62, HOOFD_R, s, 0.75);
        const lijf = botsCirkel(s.x, s.y - 22, LIJF_R, s, 0.4);
        if (hoofd || lijf) geraakt++;
        // Trappen: tijdens de zwaai raakt de voet de bal
        if (s.trap > TRAP_DUUR * 0.3 && !s.getrapt) {
          const vx = s.x + s.richting * 28;
          const vy = s.y - 12;
          if (Math.hypot(bal.x - vx, bal.y - vy) < BAL_R + 24) {
            s.getrapt = true;
            bal.vx = s.richting * (TRAP_KRACHT + Math.abs(s.vx) * 0.4);
            bal.vy = -300 - Math.random() * 160;
            trapGeluid(1);
          }
        }
      });
      // Bal ingeklemd tussen twee spelers: hij schiet omhoog en de spelers botsen uit elkaar,
      // anders vormen hun hoofden een dak waar de bal steeds tegenaan stuitert
      if (geraakt === 2 && klemPauze <= 0 && bal.y > GROND - 70) {
        klemPauze = 0.4;
        bal.vy = -480 - Math.random() * 120;
        bal.vx = (Math.random() - 0.5) * 160;
        bal.y -= 4;
        const [links, rechts] = spelers[0].x < spelers[1].x ? spelers : [spelers[1], spelers[0]];
        links.x = Math.max(24, links.x - 16);
        rechts.x = Math.min(W - 24, rechts.x + 16);
      }
    }
    if (toestand === "spelen") controleerGoal();
  }

  function controleerGoal() {
    let maker = -1;
    if (bal.x + BAL_R < DOEL_B && bal.y - BAL_R > LAT_Y) maker = 1;          // in het linkerdoel: punt voor rechts
    if (bal.x - BAL_R > W - DOEL_B && bal.y - BAL_R > LAT_Y) maker = 0;      // in het rechterdoel: punt voor links
    if (maker < 0) return;
    score[maker]++;
    laatsteGoal = maker;
    toestand = "goal";
    sinds = tijd;
    schud = 0.4;
    const juich = ["GOAL!!!", "GOOOAL!", "WAT EEN KNAL!", "IN DE KRUISING!", "KOPPIE KOPPIE!"];
    kreten.push({ tekst: juich[Math.floor(Math.random() * juich.length)], leeftijd: 0, groot: true });
    juichen();
  }

  function eindigWedstrijd() {
    toestand = "einde";
    sinds = tijd;
    fluit(true);
    if (score[0] !== score[1]) {
      Arcade.confetti(160);
      // Tegen de computer winnen is een feestje waard
      if (keuze.modus === 1 && score[0] > score[1]) Arcade.spandoek("GEWONNEN VAN DE CPU!");
    }
  }

  // --- Tekenen ---
  function tekenVeld() {
    const lucht = c.createLinearGradient(0, 0, 0, 160);
    lucht.addColorStop(0, "#5fb3e8");
    lucht.addColorStop(1, "#a8dcf5");
    c.fillStyle = lucht;
    c.fillRect(0, 0, W, H);
    // Tribune met publiek
    c.fillStyle = "#3a3a5a";
    c.fillRect(0, 70, W, 90);
    const kleuren = ["#ff8a3d", "#fff", "#1e88e5", "#ffe14d", "#ff3e5a", "#5fd35f"];
    for (let rij = 0; rij < 4; rij++) {
      for (let x = 6 + (rij % 2) * 9; x < W; x += 18) {
        const wip = toestand === "goal" ? Math.abs(Math.sin(tijd * 12 + x)) * 5 : 0;
        c.fillStyle = kleuren[(x * 7 + rij * 3) % kleuren.length];
        c.beginPath();
        c.arc(x, 86 + rij * 20 - wip, 6, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.fillStyle = "#e8e8f0";
    c.fillRect(0, 156, W, 6);
    // Gras met strepen
    for (let x = 0; x < W; x += 80) {
      c.fillStyle = (x / 80) % 2 ? "#5cb83c" : "#66c446";
      c.fillRect(x, 162, 80, H - 162);
    }
    c.fillStyle = "rgba(255, 255, 255, 0.85)";
    c.fillRect(W / 2 - 2, 170, 4, GROND - 170);
    c.strokeStyle = "rgba(255, 255, 255, 0.85)";
    c.lineWidth = 4;
    c.beginPath();
    c.ellipse(W / 2, GROND - 6, 110, 26, 0, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#4a9a30";
    c.fillRect(0, GROND, W, H - GROND);
  }

  function tekenDoel(links) {
    const x1 = links ? 0 : W - DOEL_B;
    // Net
    c.strokeStyle = "rgba(255, 255, 255, 0.45)";
    c.lineWidth = 1;
    for (let x = x1; x <= x1 + DOEL_B; x += 10) {
      c.beginPath();
      c.moveTo(x, LAT_Y);
      c.lineTo(x, GROND);
      c.stroke();
    }
    for (let y = LAT_Y; y <= GROND; y += 10) {
      c.beginPath();
      c.moveTo(x1, y);
      c.lineTo(x1 + DOEL_B, y);
      c.stroke();
    }
    // Paal en lat
    const paalX = links ? DOEL_B - 3 : W - DOEL_B - 3;
    c.fillStyle = "#000";
    c.fillRect(x1 - 1, LAT_Y - 8, DOEL_B + 2, 10);
    c.fillRect(paalX - 1, LAT_Y - 8, 8, GROND - LAT_Y + 8);
    c.fillStyle = "#fff";
    c.fillRect(x1, LAT_Y - 7, DOEL_B, 7);
    c.fillRect(paalX, LAT_Y - 7, 6, GROND - LAT_Y + 7);
  }

  function tekenSchaduw(x, breedte) {
    c.fillStyle = "rgba(0, 0, 0, 0.25)";
    c.beginPath();
    c.ellipse(x, GROND + 4, breedte, 6, 0, 0, Math.PI * 2);
    c.fill();
  }

  function tekenSpeler(s) {
    tekenSchaduw(s.x, 26);
    const r = s.richting;
    // Benen en schoenen; tijdens het trappen zwaait één been naar voren
    const zwaai = s.trap > 0 ? Math.sin((1 - s.trap / TRAP_DUUR) * Math.PI) : 0;
    c.strokeStyle = "#1a1a1a";
    c.lineWidth = 7;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(s.x - r * 6, s.y - 18);
    c.lineTo(s.x - r * 6, s.y - 4);
    c.moveTo(s.x + r * 6, s.y - 18);
    c.lineTo(s.x + r * (6 + zwaai * 22), s.y - 4 - zwaai * 10);
    c.stroke();
    c.fillStyle = "#111";
    c.fillRect(s.x - r * 6 - 6, s.y - 6, 12, 6);
    c.fillRect(s.x + r * (6 + zwaai * 22) - 6, s.y - 6 - zwaai * 10, 12, 6);
    // Lijfje
    c.fillStyle = s.broek;
    c.fillRect(s.x - 12, s.y - 24, 24, 8);
    c.fillStyle = s.shirt;
    c.beginPath();
    c.roundRect(s.x - 14, s.y - 40, 28, 20, 6);
    c.fill();
    // Hoofd
    const hy = s.y - 62;
    c.fillStyle = "#000";
    c.beginPath();
    c.arc(s.x, hy, HOOFD_R + 3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = s.shirt;
    c.beginPath();
    c.arc(s.x, hy, HOOFD_R + 1, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.beginPath();
    c.arc(s.x, hy, HOOFD_R, 0, Math.PI * 2);
    c.clip();
    Arcade.plaatje(c, s.hoofd, s.x, hy, HOOFD_R);
    c.restore();
    // Feesthoedje van Jessy staat buiten de cirkel, dus nog een keer zonder clip
    if (s.hoofd.src && s.hoofd.src.includes("/img/jessy-")) Arcade.plaatje(c, s.hoofd, s.x, hy, HOOFD_R);
  }

  function tekenBal() {
    tekenSchaduw(bal.x, Math.max(6, 16 - (GROND - bal.y) / 25));
    c.save();
    c.translate(bal.x, bal.y);
    c.rotate(bal.draai);
    c.fillStyle = "#000";
    c.beginPath();
    c.arc(0, 0, BAL_R + 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(0, 0, BAL_R, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#222";
    for (let i = 0; i < 5; i++) {
      const hoek = (i / 5) * Math.PI * 2;
      c.beginPath();
      c.arc(Math.cos(hoek) * 10, Math.sin(hoek) * 10, 4, 0, Math.PI * 2);
      c.fill();
    }
    c.beginPath();
    c.arc(0, 0, 5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function tekenScorebord() {
    c.fillStyle = "#000";
    c.fillRect(W / 2 - 190, 8, 380, 50);
    c.fillStyle = "#15153a";
    c.fillRect(W / 2 - 187, 11, 374, 44);
    tekst(spelers[0].naam, W / 2 - 100, 24, 10, spelers[0].shirt);
    tekst(spelers[1].naam, W / 2 + 100, 24, 10, "#3ef0ff");
    tekst(String(score[0]), W / 2 - 100, 44, 16, "#fff");
    tekst(String(score[1]), W / 2 + 100, 44, 16, "#fff");
    const klok = goldenGoal ? "GOLDEN" : `${Math.floor(Math.ceil(rest) / 60)}:${String(Math.ceil(rest) % 60).padStart(2, "0")}`;
    tekst(klok, W / 2, 34, goldenGoal ? 10 : 14, rest <= 10 && !goldenGoal ? "#ff5a5a" : "#ffe14d");
  }

  function teken() {
    c.save();
    if (schud > 0) c.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6);
    tekenVeld();
    tekenDoel(true);
    tekenDoel(false);
    if (spelers) {
      spelers.forEach(tekenSpeler);
      tekenBal();
    }
    c.restore();

    if (!spelers) return;
    tekenScorebord();

    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 1.6);
      tekst(k.tekst, W / 2, 140 - k.leeftijd * 20, k.groot ? 34 : 14, "#ffe14d");
    });
    c.globalAlpha = 1;

    if (toestand === "aftrap") tekst("AFTRAP!", W / 2, 200, 20, "#fff");

    if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.6)";
      c.fillRect(0, 0, W, H);
      const [a, b] = score;
      let titel = "GELIJKSPEL!";
      if (a !== b) {
        const winnaar = spelers[a > b ? 0 : 1];
        titel = winnaar.mens ? winnaar.naam + " WINT!" : "DE CPU WINT!";
      }
      tekst(titel, W / 2, 150, 26, "#ffe14d");
      tekst(`${a} - ${b}`, W / 2, 210, 34, "#fff");
      if (tijd - sinds > 1 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE = NOG EEN POTJE", W / 2, 290, 12, "#fff");
      tekst("N = ANDERE SPELERS   ESC = PAUZE", W / 2, 330, 9, "#ddd");
    }
  }

  // --- Instellingen voor de aftrap (met selfie-camera) ---
  const laag = document.getElementById("instellen");
  const kanCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext);
  let stroom = null;

  function hoofdKnop(speler, waarde, label, plaatje) {
    const gekozen = keuze.hoofd[speler - 1] === waarde;
    return `<button type="button" data-speler="${speler}" data-hoofd="${waarde}" class="${gekozen ? "gekozen" : ""}">
      ${plaatje ? `<img src="${plaatje}" alt="">` : ""}${label}</button>`;
  }

  function toonInstellingen() {
    toestand = "instellen";
    stopCamera();
    const tweede = keuze.modus === 2;
    const rijSpeler = (nr) => {
      const standaard = nr === 1
        ? hoofdKnop(1, "jessy", "JESSY", gezichten[0].src)
        : hoofdKnop(2, "maat", "EEN MAATJE", maten[0].src);
      const selfie = selfies[nr - 1]
        ? hoofdKnop(nr, "selfie", "MIJN SELFIE", selfies[nr - 1]) + `<button type="button" data-camera="${nr}">NIEUWE SELFIE</button>`
        : kanCamera ? `<button type="button" data-camera="${nr}">SELFIE MAKEN</button>` : "";
      return `<h3>${nr === 1 ? "SPELER 1 (LINKS)" : tweede ? "SPELER 2 (RECHTS)" : "TEGENSTANDER (CPU)"}</h3><div class="rij">${standaard}${nr === 1 || tweede ? selfie : ""}</div>`;
    };
    laag.innerHTML = `
      <div class="doos">
        <h2>KOPBAL</h2>
        <div class="rij">
          <button type="button" data-modus="1" class="${keuze.modus === 1 ? "gekozen" : ""}">1 SPELER<br>TEGEN DE CPU</button>
          <button type="button" data-modus="2" class="${keuze.modus === 2 ? "gekozen" : ""}">2 SPELERS<br>1 TOETSENBORD</button>
        </div>
        ${rijSpeler(1)}
        ${rijSpeler(2)}
        <p class="klein">${tweede
          ? "LINKS: A/D LOPEN, W SPRINGEN, SPATIE TRAPPEN<br>RECHTS: PIJLTJES LOPEN, OMHOOG SPRINGEN, OMLAAG TRAPPEN"
          : "PIJLTJES OF A/D LOPEN, OMHOOG OF W SPRINGEN<br>SPATIE TRAPPEN"}<br>${kanCamera ? "JE SELFIE BLIJFT ALLEEN OP DIT APPARAAT" : ""}</p>
        <button type="button" class="aftrap" data-start>AFTRAP! (ENTER)</button>
      </div>`;
    laag.hidden = false;
  }

  laag.addEventListener("click", (e) => {
    const knop = e.target.closest("button");
    if (!knop) return;
    if (knop.dataset.modus) {
      keuze.modus = Number(knop.dataset.modus);
      toonInstellingen();
    } else if (knop.dataset.hoofd) {
      keuze.hoofd[Number(knop.dataset.speler) - 1] = knop.dataset.hoofd;
      toonInstellingen();
    } else if (knop.dataset.camera) {
      openCamera(Number(knop.dataset.camera));
    } else if (knop.dataset.start !== undefined) {
      startWedstrijd();
    } else if (knop.dataset.klik) {
      maakFoto(Number(knop.dataset.klik));
    } else if (knop.dataset.terug !== undefined) {
      toonInstellingen();
    }
  });

  async function openCamera(nr) {
    laag.innerHTML = `
      <div class="doos">
        <h2>SELFIE!</h2>
        <p class="klein">ZET JE HOOFD IN HET RONDJE</p>
        <div class="camera"><video autoplay playsinline muted></video></div>
        <p class="klein fout"></p>
        <div class="rij">
          <button type="button" class="aftrap" data-klik="${nr}">KLIK!</button>
          <button type="button" data-terug>TERUG</button>
        </div>
      </div>`;
    try {
      stroom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false });
      laag.querySelector("video").srcObject = stroom;
    } catch (fout) {
      laag.querySelector(".fout").textContent = "GEEN CAMERA OF GEEN TOESTEMMING";
    }
  }

  function stopCamera() {
    if (stroom) stroom.getTracks().forEach((t) => t.stop());
    stroom = null;
  }

  function maakFoto(nr) {
    const video = laag.querySelector("video");
    if (!video || !video.videoWidth) return;
    // Vierkant uit het midden, gespiegeld zoals je jezelf ziet, en rond uitgeknipt
    const maat = 192;
    const doek = document.createElement("canvas");
    doek.width = doek.height = maat;
    const d = doek.getContext("2d");
    const kant = Math.min(video.videoWidth, video.videoHeight) * 0.84; // het rondje beslaat 84% van het beeld
    const sx = (video.videoWidth - kant) / 2;
    const sy = (video.videoHeight - kant) / 2;
    d.beginPath();
    d.arc(maat / 2, maat / 2, maat / 2, 0, Math.PI * 2);
    d.clip();
    d.translate(maat, 0);
    d.scale(-1, 1);
    d.drawImage(video, sx, sy, kant, kant, 0, 0, maat, maat);
    const plaatje = doek.toDataURL("image/png");
    selfies[nr - 1] = plaatje;
    Arcade.bewaar(SELFIE_SLEUTEL(nr), plaatje);
    keuze.hoofd[nr - 1] = "selfie";
    Arcade.toon({ type: "square", van: 1200, naar: 600, duur: 0.1, volume: 0.1 });
    toonInstellingen();
  }

  function startWedstrijd() {
    stopCamera();
    laag.hidden = true;
    nieuweWedstrijd();
  }

  toonInstellingen();
  Arcade.lus(update, teken);
})();
