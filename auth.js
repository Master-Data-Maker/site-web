/* ═══════════════════════════════════════════
   FlowMoney — auth.js
   Système d'authentification (localStorage)
═══════════════════════════════════════════ */

const Auth = (() => {

  // ── Clés localStorage ──────────────────────
  const USERS_KEY    = 'flowmoney_users';
  const SESSION_KEY  = 'flowmoney_session';

  // ── Récupérer tous les comptes enregistrés ─
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  }

  // ── Sauvegarder les comptes ────────────────
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // ── Récupérer la session active ────────────
  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  }

  // ── Démarrer une session ───────────────────
  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  // ── Supprimer la session ───────────────────
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  // ── Inscription ────────────────────────────
  function register(name, username, password, password2) {
    if (!name || !username || !password || !password2) {
      return { ok: false, error: 'Tous les champs sont obligatoires.' };
    }
    if (password.length < 8) {
      return { ok: false, error: 'Le mot de passe doit faire au moins 8 caractères.' };
    }
    if (password !== password2) {
      return { ok: false, error: 'Les mots de passe ne correspondent pas.' };
    }

    const users = getUsers();
    const key = username.toLowerCase().trim();

    if (users[key]) {
      return { ok: false, error: 'Cet identifiant est déjà utilisé.' };
    }

    // Hashage simple (btoa) — suffisant pour un projet front-only
    const hashed = btoa(password);

    users[key] = {
      name: name.trim(),
      username: key,
      password: hashed,
      createdAt: new Date().toISOString()
    };

    saveUsers(users);

    const sessionUser = { name: users[key].name, username: key };
    setSession(sessionUser);

    return { ok: true, user: sessionUser };
  }

  // ── Connexion ──────────────────────────────
  function login(username, password) {
    if (!username || !password) {
      return { ok: false, error: 'Identifiant et mot de passe requis.' };
    }

    const users = getUsers();
    const key   = username.toLowerCase().trim();
    const user  = users[key];

    if (!user || user.password !== btoa(password)) {
      return { ok: false, error: 'Identifiant ou mot de passe incorrect.' };
    }

    const sessionUser = { name: user.name, username: key };
    setSession(sessionUser);

    return { ok: true, user: sessionUser };
  }

  // ── Déconnexion ────────────────────────────
  function logout() {
    clearSession();
  }

  // ── Retourner l'utilisateur connecté ───────
  function currentUser() {
    return getSession();
  }

  // API publique
  return { register, login, logout, currentUser };
})();


/* ═══════════════════════════════════════════
   Gestion UI des modales & état connecté
═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── Éléments ───────────────────────────────
  const heroSection   = document.getElementById('heroSection');
  const appMain       = document.getElementById('appMain');
  const navAuth       = document.getElementById('navAuth');
  const navUser       = document.getElementById('navUser');
  const userAvatar    = document.getElementById('userAvatar');
  const userName      = document.getElementById('userName');
  const dashGreeting  = document.getElementById('dashGreeting');

  // Modales
  const modalLogin    = document.getElementById('modalLogin');
  const modalRegister = document.getElementById('modalRegister');

  // Champs login
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginError    = document.getElementById('loginError');

  // Champs register
  const regName       = document.getElementById('regName');
  const regUsername   = document.getElementById('regUsername');
  const regPassword   = document.getElementById('regPassword');
  const regPassword2  = document.getElementById('regPassword2');
  const regError      = document.getElementById('regError');

  // ─── Helpers UI ─────────────────────────────
  function showModal(modal) {
    modal.classList.remove('hidden');
  }
  function hideModal(modal) {
    modal.classList.add('hidden');
  }
  function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function hideError(el) {
    el.classList.add('hidden');
  }
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 400);
    }, 3000);
  }

  // ─── Mettre à jour l'interface selon l'état ─
  function applyAuthState(user) {
    if (user) {
      // Connecté → afficher l'app, cacher le hero
      heroSection.classList.add('hidden');
      appMain.classList.remove('hidden');
      navAuth.classList.add('hidden');
      navUser.classList.remove('hidden');

      const initials = user.name.slice(0, 2).toUpperCase();
      userAvatar.textContent = initials;
      userName.textContent   = user.name;

      if (dashGreeting) {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
        dashGreeting.textContent = `${greeting}, ${user.name} 👋`;
      }

      // Afficher le tableau de bord par défaut
      navigateTo('dashboard');

    } else {
      // Non connecté → afficher le hero
      heroSection.classList.remove('hidden');
      appMain.classList.add('hidden');
      navAuth.classList.remove('hidden');
      navUser.classList.add('hidden');
    }
  }

  // ─── Navigation entre pages ──────────────────
  function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const page = document.getElementById('page' + capitalize(pageId));
    if (page) page.classList.add('active');

    const link = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (link) link.classList.add('active');

    // Met à jour les stats si on est sur le dashboard
    if (pageId === 'dashboard' && typeof updateDashboard === 'function') {
      updateDashboard();
    }
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ─── Boutons d'ouverture des modales ─────────
  document.getElementById('btnLogin')?.addEventListener('click', () => showModal(modalLogin));
  document.getElementById('btnRegister')?.addEventListener('click', () => showModal(modalRegister));
  document.getElementById('heroRegister')?.addEventListener('click', () => showModal(modalRegister));
  document.getElementById('heroLogin')?.addEventListener('click', () => showModal(modalLogin));

  // ─── Fermeture des modales ────────────────────
  ['closeLogin', 'closeLoginBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      hideModal(modalLogin);
      hideError(loginError);
    });
  });
  ['closeRegister', 'closeRegisterBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      hideModal(modalRegister);
      hideError(regError);
    });
  });

  // ─── Switch entre modales ─────────────────────
  document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    hideModal(modalLogin);
    showModal(modalRegister);
  });
  document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    hideModal(modalRegister);
    showModal(modalLogin);
  });

  // ─── Soumission connexion ─────────────────────
  document.getElementById('submitLogin')?.addEventListener('click', () => {
    hideError(loginError);
    const result = Auth.login(loginUsername.value, loginPassword.value);
    if (!result.ok) {
      showError(loginError, result.error);
    } else {
      hideModal(modalLogin);
      loginUsername.value = '';
      loginPassword.value = '';
      showToast(`Bienvenue, ${result.user.name} ! 👋`);
      applyAuthState(result.user);
    }
  });

  // ─── Soumission inscription ───────────────────
  document.getElementById('submitRegister')?.addEventListener('click', () => {
    hideError(regError);
    const result = Auth.register(
      regName.value,
      regUsername.value,
      regPassword.value,
      regPassword2.value
    );
    if (!result.ok) {
      showError(regError, result.error);
    } else {
      hideModal(modalRegister);
      regName.value = regUsername.value = regPassword.value = regPassword2.value = '';
      showToast(`Compte créé avec succès ! Bienvenue, ${result.user.name} 🎉`);
      applyAuthState(result.user);
    }
  });

  // ─── Déconnexion ──────────────────────────────
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    Auth.logout();
    showToast('Vous avez été déconnecté.');
    applyAuthState(null);
  });

  // ─── Navigation par les liens ─────────────────
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  });

  // ─── Entrée clavier dans les modales ──────────
  [loginPassword].forEach(el => {
    el?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('submitLogin')?.click();
    });
  });
  [regPassword2].forEach(el => {
    el?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('submitRegister')?.click();
    });
  });

  // ─── Restaurer la session au chargement ───────
  const user = Auth.currentUser();
  applyAuthState(user);

  // ─── Date actuelle ────────────────────────────
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // Exposer navigateTo globalement pour les autres scripts
  window.navigateTo = navigateTo;
});
