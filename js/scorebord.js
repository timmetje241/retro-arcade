// Highscore-overzicht: per spel de gedeelde top 10, en je eigen record op dit apparaat.
(function () {
  const spellen = window.ARCADE_CONFIG.spellen.filter((s) => s.pad);
  const borden = document.getElementById("borden");
  const melding = document.getElementById("melding");

  document.addEventListener("keydown", (e) => {
    if (e.code === "Escape" || e.code === "Backspace") window.location.href = "index.html";
  });

  if (!Arcade.highscoresAan()) {
    melding.hidden = false;
    melding.textContent = "GEDEELDE HIGHSCORES STAAN NOG UIT";
  }

  function veilig(tekst) {
    const span = document.createElement("span");
    span.textContent = tekst;
    return span.innerHTML;
  }

  spellen.forEach((spel) => {
    const bord = document.createElement("article");
    bord.className = "bord";
    bord.style.setProperty("--kleur", spel.kleur);
    const record = Arcade.lees(spel.id + ".record", 0);
    bord.innerHTML = `
      <h2><span>${spel.icoon}</span> ${spel.naam}</h2>
      <ol class="lijst"><li class="leeg">LADEN...</li></ol>
      <p class="eigen">JOUW RECORD: ${record}</p>
    `;
    borden.appendChild(bord);
    const lijst = bord.querySelector(".lijst");

    if (!Arcade.highscoresAan()) {
      lijst.innerHTML = `<li class="leeg">-</li>`;
      return;
    }
    Arcade.topScores(spel.id)
      .then((scores) => {
        if (!scores.length) {
          lijst.innerHTML = `<li class="leeg">NOG GEEN SCORES</li>`;
          return;
        }
        lijst.innerHTML = scores
          .map((s, i) => `<li><span class="plek">${i + 1}.</span><span class="naam">${veilig(s.naam)}</span><span class="punten">${s.score}</span></li>`)
          .join("");
      })
      .catch(() => {
        lijst.innerHTML = `<li class="leeg">NIET BEREIKBAAR</li>`;
      });
  });
})();
