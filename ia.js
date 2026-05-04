/* ═══════════════════════════════════════════
   FlowMoney — ia.js
   Prévisions IA + Conseil du jour (Claude API)
═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ════════ CONSEIL DU JOUR (dashboard) ════════ */

  document.getElementById('btnAnalyze')?.addEventListener('click', async () => {
    const btn  = document.getElementById('btnAnalyze');
    const tip  = document.getElementById('iaTip');
    if (!tip) return;

    btn.textContent = '⏳ Analyse en cours…';
    btn.disabled    = true;
    tip.textContent = 'Analyse de vos données…';

    const stats = Data.getMonthStats();
    const flow  = Data.getFlowByMonths(3);
    const cats  = Data.getExpenseByCategory();

    const prompt = `Tu es un conseiller financier personnel expert. Voici les données du mois en cours d'un utilisateur :
- Revenus : ${Data.formatAmount(stats.income)}
- Dépenses : ${Data.formatAmount(stats.expense)}
- Solde mensuel : ${Data.formatAmount(stats.balance)}
- Taux d'épargne : ${stats.saving}%
- Répartition dépenses par catégorie : ${JSON.stringify(cats)}
- Historique 3 derniers mois : ${JSON.stringify(flow.map(f => ({ mois: f.label, revenus: f.income, dépenses: f.expense })))}

Donne un conseil court, précis et actionnable (2-3 phrases max) en français. Sois direct et encourageant.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages:   [{ role: 'user', content: prompt }]
        })
      });

      const data    = await response.json();
      const conseil = data.content?.find(b => b.type === 'text')?.text || 'Impossible d\'obtenir un conseil pour l\'instant.';
      tip.textContent = conseil;

    } catch (err) {
      tip.textContent = 'Erreur de connexion à l\'IA. Vérifiez votre connexion et réessayez.';
    }

    btn.textContent = '🤖 Analyser mes finances';
    btn.disabled    = false;
  });

  /* ════════ PRÉVISIONS IA (page Prévisions) ════════ */

  document.getElementById('btnLaunchIA')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnLaunchIA');

    // Lecture des champs
    const revenu   = parseFloat(document.getElementById('iaRevenu')?.value)   || 0;
    const loyer    = parseFloat(document.getElementById('iaLoyer')?.value)    || 0;
    const charges  = parseFloat(document.getElementById('iaCharges')?.value)  || 0;
    const alim     = parseFloat(document.getElementById('iaAlim')?.value)     || 0;
    const objectif = parseFloat(document.getElementById('iaObjectif')?.value) || 0;
    const autres   = parseFloat(document.getElementById('iaAutres')?.value)   || 0;

    if (!revenu) {
      showToast('Veuillez saisir au moins votre revenu mensuel.');
      return;
    }

    const totalDepenses = loyer + charges + alim + autres;
    const solde         = revenu - totalDepenses;
    const epargne       = Math.max(solde - objectif, solde); // capacité réelle
    const ratioEpargne  = revenu > 0 ? Math.round((Math.max(solde, 0) / revenu) * 100) : 0;

    // Afficher les KPIs prévisionnels
    const fmt = Data.formatAmount;
    setEl('prevSolde',   fmt(solde));
    setEl('prevEpargne', fmt(Math.max(solde, 0)));
    setEl('prevDepenses', fmt(totalDepenses));
    setEl('prevRatio',   ratioEpargne + '%');

    // Projection sur 12 mois
    const projData = [];
    const now      = new Date();
    let   cumul    = 0;

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      cumul += Math.max(solde, 0);
      projData.push({ label, cumul, depenses: totalDepenses });
    }

    // Afficher les résultats
    document.getElementById('iaResults')?.classList.remove('hidden');

    // Dessiner le graphique
    setTimeout(() => {
      if (typeof drawProjChart === 'function') drawProjChart(projData);
    }, 50);

    // Recommandations IA
    const recommDiv = document.getElementById('iaRecommandations');
    if (recommDiv) {
      recommDiv.innerHTML = '<div class="recomm-item">⏳ Génération des recommandations…</div>';
    }

    btn.textContent = '⏳ Analyse…';
    btn.disabled    = true;

    const prompt = `Tu es un conseiller financier expert. Voici le profil financier mensuel d'un utilisateur :
- Revenu net : ${fmt(revenu)}
- Loyer/crédit : ${fmt(loyer)}
- Charges fixes : ${fmt(charges)}
- Alimentation : ${fmt(alim)}
- Autres dépenses : ${fmt(autres)}
- Total dépenses : ${fmt(totalDepenses)}
- Solde mensuel disponible : ${fmt(solde)}
- Objectif d'épargne : ${fmt(objectif)}
- Taux d'épargne réel : ${ratioEpargne}%
- Projection épargne sur 12 mois : ${fmt(Math.max(solde, 0) * 12)}

Génère exactement 3 recommandations personnalisées en JSON (et SEULEMENT du JSON, sans markdown) :
[
  { "type": "good|warn|bad", "icon": "emoji", "text": "conseil précis et actionnable" },
  { "type": "good|warn|bad", "icon": "emoji", "text": "conseil précis et actionnable" },
  { "type": "good|warn|bad", "icon": "emoji", "text": "conseil précis et actionnable" }
]
Les types : good = point positif, warn = avertissement, bad = point critique à corriger.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages:   [{ role: 'user', content: prompt }]
        })
      });

      const apiData = await response.json();
      const raw     = apiData.content?.find(b => b.type === 'text')?.text || '[]';
      const clean   = raw.replace(/```json|```/g, '').trim();
      const recomms = JSON.parse(clean);

      if (recommDiv) {
        recommDiv.innerHTML = recomms.map(r => `
          <div class="recomm-item ${r.type}">
            <span style="font-size:1.2rem; flex-shrink:0">${r.icon}</span>
            <span>${r.text}</span>
          </div>
        `).join('');
      }

    } catch (err) {
      if (recommDiv) {
        recommDiv.innerHTML = `
          <div class="recomm-item warn">
            <span>⚠️</span>
            <span>Impossible de générer les recommandations IA. Les projections chiffrées sont disponibles ci-dessus.</span>
          </div>
        `;
      }
    }

    btn.textContent = '🤖 Lancer l\'analyse IA';
    btn.disabled    = false;
  });

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function showToast(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
    }
  }
});
