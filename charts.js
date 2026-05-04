/* ═══════════════════════════════════════════
   FlowMoney — charts.js
   Graphiques Canvas (sans dépendance externe)
═══════════════════════════════════════════ */

window.drawCharts = function () {
  drawFlowChart();
  drawDonutChart();
};

/* ════════ FLOW CHART (barres revenus/dépenses sur 6 mois) ════════ */
function drawFlowChart() {
  const canvas = document.getElementById('flowChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Adapter la taille au conteneur
  const parent = canvas.parentElement;
  canvas.width  = parent.clientWidth  || 600;
  canvas.height = 220;

  const data   = Data.getFlowByMonths(6);
  const W      = canvas.width;
  const H      = canvas.height;
  const pad    = { top: 24, right: 20, bottom: 36, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const allValues = data.flatMap(d => [d.income, d.expense]);
  const maxVal    = Math.max(...allValues, 1);

  const groupW  = chartW / data.length;
  const barW    = Math.min(groupW * 0.3, 28);
  const gap     = barW * 0.6;

  // Grille horizontale
  const steps = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 1;
  ctx.font        = '11px DM Sans, sans-serif';
  ctx.fillStyle   = '#8892aa';
  ctx.textAlign   = 'right';

  for (let i = 0; i <= steps; i++) {
    const y    = pad.top + chartH - (i / steps) * chartH;
    const val  = (maxVal * i / steps);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    ctx.fillText(formatK(val), pad.left - 8, y + 4);
  }

  // Barres
  data.forEach((d, i) => {
    const cx      = pad.left + i * groupW + groupW / 2;
    const xInc    = cx - gap / 2 - barW;
    const xExp    = cx + gap / 2;

    // Revenu (vert)
    const hInc = (d.income / maxVal) * chartH || 0;
    const gradInc = ctx.createLinearGradient(0, pad.top + chartH - hInc, 0, pad.top + chartH);
    gradInc.addColorStop(0, '#34d399');
    gradInc.addColorStop(1, 'rgba(52,211,153,0.3)');
    ctx.fillStyle = gradInc;
    roundRect(ctx, xInc, pad.top + chartH - hInc, barW, hInc, 4);
    ctx.fill();

    // Dépense (rouge)
    const hExp = (d.expense / maxVal) * chartH || 0;
    const gradExp = ctx.createLinearGradient(0, pad.top + chartH - hExp, 0, pad.top + chartH);
    gradExp.addColorStop(0, '#f87171');
    gradExp.addColorStop(1, 'rgba(248,113,113,0.3)');
    ctx.fillStyle = gradExp;
    roundRect(ctx, xExp, pad.top + chartH - hExp, barW, hExp, 4);
    ctx.fill();

    // Label mois
    ctx.fillStyle   = '#8892aa';
    ctx.textAlign   = 'center';
    ctx.font        = '11px DM Sans, sans-serif';
    ctx.fillText(d.label, cx, H - 8);
  });

  // Légende
  drawLegendItem(ctx, W - 120, 10, '#34d399', 'Revenus');
  drawLegendItem(ctx, W - 50,  10, '#f87171', 'Dépenses');
}

/* ════════ DONUT CHART (répartition dépenses) ════════ */
function drawDonutChart() {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const size = Math.min(canvas.parentElement.clientWidth, 220);
  canvas.width  = size;
  canvas.height = size;

  ctx.clearRect(0, 0, size, size);

  const data   = Data.getExpenseByCategory();
  const legend = document.getElementById('donutLegend');
  const total  = Object.values(data).reduce((s, v) => s + v, 0);

  if (!total) {
    ctx.fillStyle   = '#8892aa';
    ctx.font        = '13px DM Sans, sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillText('Aucune dépense', size / 2, size / 2);
    if (legend) legend.innerHTML = '';
    return;
  }

  const cx     = size / 2;
  const cy     = size / 2;
  const radius = size * 0.42;
  const inner  = size * 0.26;
  let   angle  = -Math.PI / 2;

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  entries.forEach(([cat, val]) => {
    const slice = (val / total) * 2 * Math.PI;
    const color = Data.getCatColor(cat);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    angle += slice;
  });

  // Trou central
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
  ctx.fillStyle = '#1c2235';
  ctx.fill();

  // Total au centre
  ctx.fillStyle   = '#f0f4ff';
  ctx.font        = `bold 14px Syne, sans-serif`;
  ctx.textAlign   = 'center';
  ctx.fillText(Data.formatAmount(total), cx, cy + 5);

  // Légende
  if (legend) {
    legend.innerHTML = entries.map(([cat, val]) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${Data.getCatColor(cat)}"></div>
        <span>${Data.getCatIcon(cat)} ${cat}</span>
        <span style="margin-left:auto; color:#f0f4ff; font-weight:500">${Data.formatAmount(val)}</span>
      </div>
    `).join('');
  }
}

/* ════════ PROJECTION CHART (page Prévisions) ════════ */
window.drawProjChart = function (monthlyData) {
  const canvas = document.getElementById('projChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const parent = canvas.parentElement;
  canvas.width  = parent.clientWidth || 700;
  canvas.height = 260;

  const W      = canvas.width;
  const H      = canvas.height;
  const pad    = { top: 24, right: 20, bottom: 40, left: 70 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const allVals = monthlyData.flatMap(d => [d.cumul, d.depenses]);
  const maxVal  = Math.max(...allVals, 1);
  const n       = monthlyData.length;

  // Grille
  const steps = 4;
  ctx.font      = '11px DM Sans, sans-serif';
  ctx.fillStyle = '#8892aa';
  ctx.textAlign = 'right';
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 1;

  for (let i = 0; i <= steps; i++) {
    const y   = pad.top + chartH - (i / steps) * chartH;
    const val = maxVal * i / steps;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    ctx.fillText(formatK(val), pad.left - 8, y + 4);
  }

  // Zone épargne cumulée
  const cumulPoints = monthlyData.map((d, i) => ({
    x: pad.left + (i / (n - 1)) * chartW,
    y: pad.top  + chartH - (d.cumul / maxVal) * chartH
  }));

  const gradCumul = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  gradCumul.addColorStop(0, 'rgba(0,212,170,0.25)');
  gradCumul.addColorStop(1, 'rgba(0,212,170,0.02)');

  ctx.beginPath();
  ctx.moveTo(cumulPoints[0].x, pad.top + chartH);
  cumulPoints.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(cumulPoints[n - 1].x, pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = gradCumul;
  ctx.fill();

  // Ligne épargne
  ctx.beginPath();
  cumulPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#00d4aa';
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // Ligne dépenses
  const depPoints = monthlyData.map((d, i) => ({
    x: pad.left + (i / (n - 1)) * chartW,
    y: pad.top  + chartH - (d.depenses / maxVal) * chartH
  }));

  ctx.beginPath();
  depPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth   = 2;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Labels mois
  ctx.fillStyle = '#8892aa';
  ctx.textAlign = 'center';
  ctx.font      = '11px DM Sans, sans-serif';
  monthlyData.forEach((d, i) => {
    const x = pad.left + (i / (n - 1)) * chartW;
    ctx.fillText(d.label, x, H - 8);
  });

  // Légende
  drawLegendItem(ctx, W - 160, 10, '#00d4aa', 'Épargne cumulée');
  drawLegendItem(ctx, W - 55,  10, '#f87171', 'Dépenses');
};

/* ════════ HELPERS ════════ */
function roundRect(ctx, x, y, w, h, r) {
  if (h <= 0) return;
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawLegendItem(ctx, x, y, color, label) {
  ctx.fillStyle = color;
  roundRect(ctx, x - 28, y - 2, 10, 10, 3);
  ctx.fill();
  ctx.fillStyle   = '#8892aa';
  ctx.textAlign   = 'left';
  ctx.font        = '11px DM Sans, sans-serif';
  ctx.fillText(label, x - 14, y + 8);
}

function formatK(val) {
  if (val >= 1000) return (val / 1000).toFixed(1).replace('.0', '') + 'k €';
  return Math.round(val) + ' €';
}

// Redessiner si la fenêtre change de taille
window.addEventListener('resize', () => {
  if (typeof drawCharts === 'function') drawCharts();
});
