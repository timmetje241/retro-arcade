// Getekende voorwerpen die meerdere spellen gebruiken. Elke functie tekent rond (cx, cy) met grootte s.
window.Tekening = (function () {
  function trapezium(c, cx, cy, boven, onder, h, kleur) {
    c.fillStyle = kleur;
    c.beginPath();
    c.moveTo(cx - boven / 2, cy - h / 2);
    c.lineTo(cx + boven / 2, cy - h / 2);
    c.lineTo(cx + onder / 2, cy + h / 2);
    c.lineTo(cx - onder / 2, cy + h / 2);
    c.fill();
  }

  // Wit bakje kwark met blauwe band en deksel
  function kwark(c, cx, cy, s) {
    const b = s * 0.8, h = s * 0.7;
    trapezium(c, cx, cy + 1, b + 4, b * 0.8 + 4, h + 4, "#1a1a1a");
    trapezium(c, cx, cy + 1, b, b * 0.8, h, "#f7f7f7");
    c.fillStyle = "#2b6cd4";
    c.fillRect(cx - b * 0.42, cy, b * 0.84, h * 0.28);
    c.fillStyle = "#1f4fa3";
    c.beginPath();
    c.roundRect(cx - b / 2 - 3, cy - h / 2 - 3, b + 6, s * 0.16, 2);
    c.fill();
  }

  // Zwarte pot creatine met wit etiket en een rode C
  function creatine(c, cx, cy, s) {
    const b = s * 0.66, h = s * 0.82;
    c.fillStyle = "#000";
    c.beginPath();
    c.roundRect(cx - b / 2 - 2, cy - h / 2 - 2, b + 4, h + 4, s * 0.15);
    c.fill();
    c.fillStyle = "#2a2a2a";
    c.fillRect(cx - b / 2, cy - h / 2 + s * 0.15, b, h - s * 0.17);
    c.fillStyle = "#555";
    c.fillRect(cx - b / 2 - 1, cy - h / 2, b + 2, s * 0.17);
    c.fillStyle = "#fff";
    c.fillRect(cx - b / 2, cy - h * 0.12, b, h * 0.36);
    c.font = `${Math.floor(s * 0.28)}px ${Arcade.FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#e0262b";
    c.fillText("C", cx, cy + h * 0.07);
  }

  // Glas bier met schuimkraag
  function bier(c, cx, cy, s) {
    const b = s * 0.62, h = s * 0.84;
    const top = cy - h / 2;
    trapezium(c, cx, cy, b + 4, b * 0.78 + 4, h + 4, "#1a1a1a");
    trapezium(c, cx, cy, b, b * 0.78, h, "#f2a900");
    c.fillStyle = "#ffd34d";
    c.fillRect(cx - b / 2 + s * 0.12, top + s * 0.18, s * 0.08, h * 0.65);
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(cx - b / 4, top + 1, b / 4, Math.PI, 0);
    c.arc(cx + b / 4, top + 1, b / 4, Math.PI, 0);
    c.fill();
    c.fillRect(cx - b / 2, top, b, s * 0.14);
  }

  // Punt pizza
  function pizza(c, cx, cy, s) {
    const h = s * 0.85;
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.moveTo(cx - s * 0.45, cy - h / 2 - 2);
    c.lineTo(cx + s * 0.45, cy - h / 2 - 2);
    c.lineTo(cx, cy + h / 2 + 3);
    c.fill();
    c.fillStyle = "#f5c242";
    c.beginPath();
    c.moveTo(cx - s * 0.4, cy - h / 2 + 4);
    c.lineTo(cx + s * 0.4, cy - h / 2 + 4);
    c.lineTo(cx, cy + h / 2);
    c.fill();
    c.fillStyle = "#c8792b";
    c.fillRect(cx - s * 0.43, cy - h / 2, s * 0.86, s * 0.14);
    c.fillStyle = "#d1342f";
    [[-0.15, -0.15], [0.12, -0.1], [0, 0.12]].forEach(([dx, dy]) => {
      c.beginPath();
      c.arc(cx + dx * s, cy + dy * s, s * 0.08, 0, Math.PI * 2);
      c.fill();
    });
  }

  // Roze donut met spikkels
  function donut(c, cx, cy, s) {
    const r = s * 0.42;
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(cx, cy, r + 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#c98a4b";
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ff7eb6";
    c.beginPath();
    c.arc(cx, cy - 1, r * 0.85, 0, Math.PI * 2);
    c.fill();
    const kleuren = ["#fff", "#4ec0e9", "#ffe14d", "#5fd35f"];
    for (let i = 0; i < 8; i++) {
      const hoek = (i / 8) * Math.PI * 2;
      c.fillStyle = kleuren[i % 4];
      c.fillRect(cx + Math.cos(hoek) * r * 0.62 - 1, cy + Math.sin(hoek) * r * 0.62 - 1, 3, 3);
    }
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    c.fill();
  }

  // Halter
  function halter(c, cx, cy, s) {
    c.fillStyle = "#1a1a1a";
    c.fillRect(cx - s * 0.45, cy - s * 0.06, s * 0.9, s * 0.12);
    [-1, 1].forEach((kant) => {
      c.fillStyle = "#1a1a1a";
      c.fillRect(cx + kant * s * 0.3 - s * 0.1, cy - s * 0.3, s * 0.2, s * 0.6);
      c.fillStyle = "#666";
      c.fillRect(cx + kant * s * 0.3 - s * 0.07, cy - s * 0.27, s * 0.14, s * 0.54);
    });
  }

  return { kwark, creatine, bier, pizza, donut, halter };
})();
