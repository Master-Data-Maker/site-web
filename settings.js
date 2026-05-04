/* ═══════════════════════════════════════════
   FlowMoney — settings.js
   Gestion du profil utilisateur
═══════════════════════════════════════════ */

const AVATARS = ['😀','😎','🧑‍💻','👩‍💼','🧑‍🎨','🦊','🐼','🚀','💎','🌟'];

const BADGES = [
  { icon: '💼', label: 'Salarié' },
  { icon: '🧑‍💻', label: 'Dev / IT' },
  { icon: '🩺', label: 'Médecin' },
  { icon: '🎓', label: 'Étudiant' },
  { icon: '🏗️', label: 'Artisan' },
  { icon: '📊', label: 'Finance' },
  { icon: '🎨', label: 'Créatif' },
  { icon: '🚗', label: 'Chauffeur' },
  { icon: '👩‍🍳', label: 'Cuisinier' },
  { icon: '📦', label: 'Commerce' },
  { icon: '🏠', label: 'Immobilier' },
  { icon: '🌍', label: 'Freelance' },
];

const PROFILE_KEY = 'flowmoney_profile';

function getProfile() {
  return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
}
function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

function applyProfile() {
  const profile = getProfile();
  const user = Auth.currentUser();
  if (!user) return;

  // Avatar
  const avatar = document.getElementById('userAvatar');
  if (avatar) {
    if (profile.avatar) {
      avatar.textContent = profile.avatar;
      avatar.style.fontSize = '1.4rem';
      avatar.style.background = 'rgba(255,255,255,0.06)';
    } else {
      avatar.textContent = user.name.slice(0, 2).toUpperCase();
      avatar.style.fontSize = '';
      avatar.style.background = '';
    }
  }

  // Pseudo
  const userName = document.getElementById('userName');
  if (userName) userName.textContent = profile.name || user.name;

  // Statut
  const status = document.getElementById('userStatus');
  if (status) {
    const badge = BADGES.find(b => b.label === profile.badge);
    status.textContent = badge ? `${badge.icon} ${badge.label}` : '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modalSettings');

  // Ouvrir
  document.getElementById('btnSettings')?.addEventListener('click', () => {
    const profile = getProfile();
    const user = Auth.currentUser();

    // Remplir le champ pseudo
    document.getElementById('settingsName').value = profile.name || user?.name || '';

    // Preview avatar
    const preview = document.getElementById('settingsAvatarPreview');
    preview.textContent = profile.avatar || (user?.name?.slice(0, 2).toUpperCase() || '?');
    if (profile.avatar) {
      preview.style.fontSize = '1.8rem';
      preview.style.background = 'rgba(255,255,255,0.06)';
    }

    // Options avatar
    const avatarOpts = document.getElementById('settingsAvatarOptions');
    avatarOpts.innerHTML = AVATARS.map(a => `
      <div class="avatar-opt ${profile.avatar === a ? 'selected' : ''}" data-avatar="${a}">${a}</div>
    `).join('');

    avatarOpts.querySelectorAll('.avatar-opt').forEach(el => {
      el.addEventListener('click', () => {
        avatarOpts.querySelectorAll('.avatar-opt').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        preview.textContent = el.dataset.avatar;
        preview.style.fontSize = '1.8rem';
        preview.style.background = 'rgba(255,255,255,0.06)';
      });
    });

    // Badges métier
    const badgeGrid = document.getElementById('badgeGrid');
    badgeGrid.innerHTML = BADGES.map(b => `
      <div class="badge-opt ${profile.badge === b.label ? 'selected' : ''}" data-badge="${b.label}">
        <span>${b.icon}</span>
        <span>${b.label}</span>
      </div>
    `).join('');

    badgeGrid.querySelectorAll('.badge-opt').forEach(el => {
      el.addEventListener('click', () => {
        badgeGrid.querySelectorAll('.badge-opt').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
      });
    });

    modal.classList.remove('hidden');
  });

  // Fermer
  ['closeSettings', 'closeSettingsBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  });

  // Sauvegarder
  document.getElementById('submitSettings')?.addEventListener('click', () => {
    const name = document.getElementById('settingsName').value.trim();
    const selectedAvatar = document.querySelector('.avatar-opt.selected')?.dataset.avatar || '';
    const selectedBadge = document.querySelector('.badge-opt.selected')?.dataset.badge || '';

    saveProfile({ name, avatar: selectedAvatar, badge: selectedBadge });
    applyProfile();
    modal.classList.add('hidden');
    window.showToast?.('Profil mis à jour ✓');
  });

  // Appliquer le profil au chargement
  applyProfile();
});
