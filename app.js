/* ═══════════════════════════════════════════
   FlowMoney — app.js
   Initialisation globale au chargement
   (la navigation et les refreshs sont gérés
    directement dans auth.js → navigateTo)
═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Initialisation si l'utilisateur est déjà connecté ── */
  const user = Auth.currentUser();

  if (user) {
    if (typeof updateDashboard    === 'function') updateDashboard();
    if (typeof renderTransactions === 'function') renderTransactions();
    if (typeof renderBudgets      === 'function') renderBudgets();

    // Graphiques après rendu DOM
    setTimeout(() => {
      if (typeof drawCharts === 'function') drawCharts();
    }, 100);
  }

});
