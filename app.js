/* ═══════════════════════════════════════════
   FlowMoney — app.js
   Initialisation globale & rendu des pages
═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Surcharge de navigateTo pour déclencher les rendus par page ── */
  const _navigateTo = window.navigateTo;

  window.navigateTo = function (pageId) {
    if (typeof _navigateTo === 'function') _navigateTo(pageId);

    switch (pageId) {
      case 'dashboard':
        if (typeof updateDashboard === 'function') updateDashboard();
        break;
      case 'transactions':
        if (typeof renderTransactions === 'function') renderTransactions();
        break;
      case 'budget':
        if (typeof renderBudgets === 'function') renderBudgets();
        break;
    }
  };

  /* ── Initialisation au chargement si déjà connecté ── */
  const user = Auth.currentUser();
  if (user) {
    if (typeof updateDashboard    === 'function') updateDashboard();
    if (typeof renderTransactions === 'function') renderTransactions();
    if (typeof renderBudgets      === 'function') renderBudgets();
  }

  /* ── Redessiner les graphiques après un court délai
        (le DOM doit être rendu avant que Canvas soit mesurable) ── */
  setTimeout(() => {
    if (user && typeof drawCharts === 'function') drawCharts();
  }, 100);

});
