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
    knop.innerHTML = `
      <span class="icoon">${spel.icoon}</span>
      <span class="naam">${spel.naam}</span>
      <span class="info">${spel.beschrijving}</span>
      ${spel.pad ? `<span class="record">JOUW RECORD ${record}</span><span class="wereld"></span>` : ""}
    `;
    // Wereldrecord uit de gedeelde highscores, als die aan staan
    if (spel.pad && Arcade.highscoresAan()) {
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
