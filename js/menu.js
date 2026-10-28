// Startscherm: tekent een tegel per spel en laat je kiezen met muis of toetsenbord.
(function () {
  const config = window.ARCADE_CONFIG;
  document.getElementById("titel").textContent = config.titel;
  document.getElementById("ondertitel").textContent = config.ondertitel;
  document.title = config.titel;

  const lijst = document.getElementById("spellen");
  const knoppen = config.spellen.map((spel) => {
    const knop = document.createElement("button");
    knop.className = "spel";
    knop.style.setProperty("--kleur", spel.kleur);
    knop.disabled = !spel.pad;

    const record = Arcade.lees(spel.id + ".record", 0);
    const metScore = spel.pad && !spel.geenRecord;
    knop.innerHTML = `
      <span class="icoon">${spel.icoon}</span>
      <span class="naam">${spel.naam}</span>
      <span class="info">${spel.beschrijving}</span>
      ${metScore ? `<span class="record">JOUW RECORD ${record}</span><span class="wereld"></span>` : ""}
    `;
    // Wereldrecord uit de gedeelde highscores, als die aan staan
    if (metScore && Arcade.highscoresAan()) {
      Arcade.topScores(spel.id)
        .then((scores) => {
          if (scores.length) knop.querySelector(".wereld").textContent = `WERELD: ${scores[0].naam} ${scores[0].score}`;
        })
        .catch(() => {});
    }
    knop.addEventListener("click", () => start(spel));
    knop.addEventListener("mouseenter", () => kies(config.spellen.indexOf(spel)));
    lijst.appendChild(knop);
    return knop;
  });

  const speelbaar = config.spellen.map((s, i) => (s.pad ? i : -1)).filter((i) => i >= 0);
  let gekozen = speelbaar[0] ?? 0;

  function kies(index) {
    if (!config.spellen[index].pad) return;
    gekozen = index;
    knoppen.forEach((k, i) => k.classList.toggle("gekozen", i === gekozen));
  }

  function start(spel) {
    if (!spel.pad) return;
    Arcade.toon({ type: "square", van: 520, naar: 1040, duur: 0.15 });
    setTimeout(() => { window.location.href = spel.pad; }, 150);
  }

  // --- Lichtkrant: verjaardag, wereldrecords en de nieuwste scores ---
  const lichtkrant = document.getElementById("lichtkrant");
  const naamVan = (id) => (config.spellen.find((s) => s.id === id) || { naam: id }).naam;

  function dagenTotVerjaardag() {
    const nu = new Date();
    let jarig = new Date(nu.getFullYear(), 9, 31);
    if (jarig < new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())) jarig = new Date(nu.getFullYear() + 1, 9, 31);
    return Math.round((jarig - new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())) / 86400000);
  }

  let laatsteBerichten = [];
  function toonLichtkrant(berichten) {
    laatsteBerichten = berichten;
    const naam = Arcade.gebruikersnaam();
    lichtkrant.textContent = [...(naam ? [`HOI ${naam}!`] : []), ...berichten].join("   ★   ");
    // Lange tekst mag langer duren, zodat hij overal even snel loopt
    lichtkrant.style.setProperty("--duur", Math.max(15, lichtkrant.textContent.length * 0.22) + "s");
  }

  const berichten = [];
  if (Arcade.isVerjaardag()) {
    berichten.push("VANDAAG JARIG: HIEP HIEP HOERA VOOR JESSY!");
    Arcade.confetti(120, true);
  } else {
    const dagen = dagenTotVerjaardag();
    berichten.push(dagen === 1 ? "MORGEN IS JESSY JARIG!" : `NOG ${dagen} DAGEN TOT JESSY'S VERJAARDAG`);
  }
  berichten.push("HAAL 33 PUNTEN VOOR EEN VERRASSING");
  berichten.push("BOE ZEGT DE KOE");
  toonLichtkrant(berichten);

  if (Arcade.highscoresAan()) {
    Promise.all([
      Arcade.laatsteScores(8).catch(() => []),
      ...config.spellen.filter((s) => s.pad && !s.geenRecord).map((s) => Arcade.topScores(s.id).then((l) => [s.id, l[0]]).catch(() => [s.id, null]))
    ]).then(([laatste, ...records]) => {
      const extra = [];
      laatste.forEach((s) => extra.push(`${s.naam} SCOORDE ${s.score} BIJ ${naamVan(s.spel)}`));
      records.forEach(([id, top]) => { if (top) extra.push(`WERELDRECORD ${naamVan(id)}: ${top.naam} MET ${top.score}`); });
      if (extra.length) toonLichtkrant([...berichten.slice(0, 1), ...extra, ...berichten.slice(1)]);
    });
  }

  // Wie speelt er? Naam tonen en wijzigen
  const spelerKnop = document.getElementById("speler");
  function toonSpeler() {
    spelerKnop.textContent = "SPELER: " + (Arcade.gebruikersnaam() || "?");
  }
  spelerKnop.addEventListener("click", () => Arcade.vraagGebruikersnaam(true));
  window.addEventListener("arcade-naam", () => {
    toonSpeler();
    toonLichtkrant(laatsteBerichten);
  });
  toonSpeler();

  // Muziek en geluid aan/uit (knop of toets M)
  const geluidKnop = document.getElementById("geluid");
  function toonGeluid() {
    geluidKnop.textContent = Arcade.isStil() ? "M = GELUID UIT" : "M = GELUID AAN";
  }
  function wisselGeluid() {
    Arcade.zetStil(!Arcade.isStil());
    toonGeluid();
  }
  geluidKnop.addEventListener("click", wisselGeluid);
  toonGeluid();

  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyM") { wisselGeluid(); return; }
    if (e.code === "KeyH") { window.location.href = "highscores.html"; return; }
    const plek = speelbaar.indexOf(gekozen);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      kies(speelbaar[(plek + 1) % speelbaar.length]);
      Arcade.toon({ van: 660, duur: 0.05 });
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      kies(speelbaar[(plek - 1 + speelbaar.length) % speelbaar.length]);
      Arcade.toon({ van: 660, duur: 0.05 });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      start(config.spellen[gekozen]);
    }
  });

  kies(gekozen);
})();
