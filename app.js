/* ═══════════════════════════════════════════
   FlowMoney — app.js
   Initialisation globale & rendu des pages
═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Réinitialiser les filtres ── */
  function resetFilters() {
    const filterType  = document.getElementById('filterType');
    const filterCat   = document.getElementById('filterCat');
    const filterMonth = document.getElementById('filterMonth');
    if (filterType)  filterType.value  = '';
    if (filterCat)   filterCat.value   = '';
    if (filterMonth) filterMonth.value = '';
  }

  /* ══════════════════════════════════════════
     Surcharge de navigateTo — c'est ici que
     chaque page est rafraîchie à la visite
  ══════════════════════════════════════════ */
  const _navigateTo = window.navigateTo;

  window.navigateTo = function (pageId) {
    // 1. Active la bonne page visuellement
    if (typeof _navigateTo === 'function') _navigateTo(pageId);

    // 2. Rafraîchit le contenu selon la page
    switch (pageId) {

      case 'dashboard':
        if (typeof updateDashboard === 'function') updateDashboard();
        // Graphiques après le rendu DOM (léger délai nécessaire)
        setTimeout(() => {
          if (typeof drawCharts === 'function') drawCharts();
        }, 80);
        break;

      case 'transactions':
        resetFilters();
        if (typeof renderTransactions === 'function') renderTransactions();
        break;

      case 'budget':
        if (typeof renderBudgets === 'function') renderBudgets();
        break;

      case 'previsions':
        // Rien à pré-charger, l'utilisateur remplit le formulaire
        break;
    }
  };

  /* ── Patch des callbacks après soumission de formulaire ──
     data.js appelle renderTransactions / renderBudgets / updateDashboard
     directement — on s'assure qu'ils déclenchent aussi le re-render
     de la page courante si nécessaire.
     (Ces fonctions sont déjà définies dans data.js ; on les réexpose
      ici pour être sûr qu'elles restent synchronisées.) ── */

  // Patch submitTx : après ajout d'une transaction,
  // re-render la liste ET le dashboard
  const _origSubmitTx = document.getElementById('submitTx');
  if (_origSubmitTx) {
    // On écoute en phase capture pour s'exécuter APRÈS le handler de data.js
    _origSubmitTx.addEventListener('click', () => {
      // Petit délai pour laisser data.js sauvegarder d'abord
      setTimeout(() => {
        if (typeof renderTransactions === 'function') renderTransactions();
        if (typeof renderBudgets      === 'function') renderBudgets();
        if (typeof updateDashboard    === 'function') updateDashboard();
        setTimeout(() => {
          if (typeof drawCharts === 'function') drawCharts();
        }, 80);
      }, 50);
    });
  }

  // Patch submitBudget : après ajout d'une enveloppe, re-render budget
  const _origSubmitBudget = document.getElementById('submitBudget');
  if (_origSubmitBudget) {
    _origSubmitBudget.addEventListener('click', () => {
      setTimeout(() => {
        if (typeof renderBudgets === 'function') renderBudgets();
      }, 50);
    });
  }

  /* ── Initialisation au chargement si déjà connecté ── */
  const user = Auth.currentUser();
  if (user) {
    resetFilters();
    if (typeof updateDashboard    === 'function') updateDashboard();
    if (typeof renderTransactions === 'function') renderTransactions();
    if (typeof renderBudgets      === 'function') renderBudgets();
    setTimeout(() => {
      if (typeof drawCharts === 'function') drawCharts();
    }, 100);
  }

});
