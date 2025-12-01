// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  onValue, 
  update, 
  push,
  query,
  orderByChild,
  limitToFirst,
  remove,
  orderByValue
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBnDW725laagCdj0INT9gaA2z0FsLn6cO4",
  authDomain: "defi-amis-plus.firebaseapp.com",
  databaseURL: "https://defi-amis-plus-default-rtdb.firebaseio.com",
  projectId: "defi-amis-plus",
  storageBucket: "defi-amis-plus.appspot.com",
  messagingSenderId: "714241330241",
  appId: "1:714241330241:web:b927c37c0d511e66f64ac0"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Déclaration des éléments UI
const screens = {
  login: document.getElementById('screen-login'),
  register: document.getElementById('screen-register'),
  dashboard: document.getElementById('screen-dashboard'),
  team: document.getElementById('screen-team'),
  match: document.getElementById('screen-match'),
  store: document.getElementById('screen-store'),
  profile: document.getElementById('screen-profile'),
  friends: document.getElementById('screen-friends'),
  fusion: document.getElementById('screen-fusion'),
  admin: document.getElementById('screen-admin'),
  profileView: document.getElementById('screen-profile-view'),
  clan: document.getElementById('screen-clan'),
  market: document.getElementById('screen-market'),
  badges: document.getElementById('screen-badges')
};

const footer = document.getElementById('app-footer');
const notification = document.getElementById('notification');
const dailyReward = document.getElementById('daily-reward');

// UID de l'administrateur
const ADMIN_UID = "oTcsqDzJPYUhX9zCls9tQwfy5Kh2";

// Variables globales
let currentUserData = null;
let globalUsers = [];
let isAdmin = false;
let selectedCardsForFusion = [];
let currentlyViewedUser = null;
let currentOpponent = null;
let matchHistory = [];
let matchmakingInterval = null;
let clans = [];
let playerCollectionLimit = 50;

// Nouvelles variables pour les fonctionnalités
let marketPlayers = [];
let availableBadges = [];

// Nouveaux noms de cartes étendus
const extendedCardNames = [
  'Messi', 'Ronaldo', 'Neymar', 'Mbappé', 'Haaland', 'Lewandowski', 
  'De Bruyne', 'Salah', 'Mané', 'Kane', 'Benzema', 'Modric', 
  'Van Dijk', 'Kante', 'Son', 'Lukaku', 'Griezmann', 'Sterling',
  'Bellingham', 'Pedri', 'Foden', 'Musiala', 'Gavi', 'Davies',
  'Hernández', 'Alvarez', 'Martinez', 'Osimhen', 'Kvaratskhelia', 'Leao',
  'Vinicius', 'Rodrygo', 'Valverde', 'Camavinga', 'Tchouaméni', 'Militao',
  'Diaz', 'Gakpo', 'Nunez', 'Mac Allister', 'Caicedo', 'Enzo',
  'Szoboszlai', 'Olmo', 'Simons', 'Xavi Simons', 'Wirtz', 'Musiala'
];

// Fonction utilitaire pour obtenir l'ID utilisateur
function getUserId() {
  return auth.currentUser ? auth.currentUser.uid : null;
}

// Fonction pour obtenir la référence de l'utilisateur dans la base de données
function getUserRef(uid = null) {
  const userId = uid || getUserId();
  return userId ? ref(db, `users/${userId}`) : null;
}

// Show notification function
function showNotification(message, type = '') {
  if (!notification) return;
  
  notification.textContent = message;
  notification.className = 'notification';
  if (type) notification.classList.add(type);
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Fonction pour ajouter une entrée au journal admin
function addAdminLog(message) {
  const adminLog = document.getElementById('admin-log');
  if (!adminLog) return;
  
  const logEntry = document.createElement('div');
  logEntry.className = 'admin-log-entry';
  logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  adminLog.appendChild(logEntry);
  adminLog.scrollTop = adminLog.scrollHeight;
}

// CORRECTION: Fonction showScreen améliorée avec tous les écrans
function showScreen(name) {
  if (!screens[name]) {
    console.error(`Écran ${name} non trouvé`);
    return;
  }
  
  Object.values(screens).forEach(s => {
    if (s) s.classList.remove('active');
  });
  
  // Gestion de la visibilité du footer
  if (name === 'login' || name === 'register') {
    if (footer) footer.classList.remove('visible');
  } else {
    if (footer) footer.classList.add('visible');
  }
  
  // Update footer button states
  if (footer) {
    const footerButtons = footer.querySelectorAll('button');
    footerButtons.forEach(btn => btn.classList.remove('active'));
    
    if (name === 'dashboard') {
      const ftHome = document.getElementById('ft-home');
      if (ftHome) ftHome.classList.add('active');
    }
    if (name === 'team') {
      const ftTeam = document.getElementById('ft-team');
      if (ftTeam) ftTeam.classList.add('active');
    }
    if (name === 'match') {
      const ftMatch = document.getElementById('ft-match');
      if (ftMatch) ftMatch.classList.add('active');
    }
    if (name === 'store') {
      const ftStore = document.getElementById('ft-store');
      if (ftStore) ftStore.classList.add('active');
    }
    if (name === 'profile') {
      const ftProfile = document.getElementById('ft-profile');
      if (ftProfile) ftProfile.classList.add('active');
    }
  }
  
  // CORRECTION: Charger les données pour tous les écrans
  if (name === 'dashboard') loadDashboard();
  if (name === 'team') loadTeam();
  if (name === 'profile') loadProfile();
  if (name === 'friends') loadFriends();
  if (name === 'fusion') loadFusion();
  if (name === 'admin') loadAdminDashboard();
  if (name === 'profileView') loadProfileView();
  if (name === 'match') loadMatch();
  if (name === 'clan') loadClan();
  if (name === 'market') loadMarket();
  if (name === 'badges') loadBadges();
  if (name === 'store') loadStore();
  
  setTimeout(() => {
    if (screens[name]) {
      screens[name].classList.add('active');
    }
  }, 10);
}

// CORRECTION: Fonction pour vérifier et charger les données utilisateur
async function ensureUserData() {
  if (!currentUserData) {
    await loadUserData();
  }
  return currentUserData !== null;
}

// Système de récompense quotidienne
function checkDailyReward() {
  if (!currentUserData) return;
  
  const btnDailyReward = document.getElementById('btn-daily-reward');
  const rewardTimer = document.getElementById('reward-timer');
  
  if (!btnDailyReward || !rewardTimer) return;
  
  const lastReward = currentUserData.lastDailyReward;
  const now = new Date();
  
  if (lastReward) {
    const lastRewardDate = new Date(lastReward);
    const timeDiff = now - lastRewardDate;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 24) {
      // Récompense déjà récupérée aujourd'hui
      btnDailyReward.disabled = true;
      const hoursLeft = Math.floor(24 - hoursDiff);
      rewardTimer.textContent = `Prochaine récompense dans ${hoursLeft}h`;
    } else {
      // Récompense disponible
      btnDailyReward.disabled = false;
      rewardTimer.textContent = "Récompense disponible!";
    }
  } else {
    // Première récompense
    btnDailyReward.disabled = false;
    rewardTimer.textContent = "Récompense disponible!";
  }
}

// Fonctions utilitaires pour les nations et positions
function getRandomNation() {
  const nations = ['France', 'Brésil', 'Argentine', 'Espagne', 'Allemagne', 'Angleterre', 'Italie', 'Portugal', 'Pays-Bas', 'Belgique'];
  return nations[Math.floor(Math.random() * nations.length)];
}

function getRandomPosition() {
  const positions = ['ATT', 'MID', 'DEF', 'GK'];
  return positions[Math.floor(Math.random() * positions.length)];
}

// Générer des cartes de départ avec plus de variété
function generateStarterCards() {
  const rarities = ['bronze', 'bronze', 'bronze', 'silver', 'silver', 'gold', 'gold', 'legendary'];
  const cards = {};
  const starters = [];
  const subs = [];
  
  for (let i = 0; i < 20; i++) {
    const id = 'card' + Date.now() + i;
    const rarity = i < 8 ? rarities[Math.floor(Math.random() * 3)] : 
                  i < 15 ? 'silver' : 
                  i < 18 ? 'gold' : 'legendary';
    
    const name = extendedCardNames[Math.floor(Math.random() * extendedCardNames.length)];
    const attack = 5 + Math.floor(Math.random() * 20);
    const defense = 3 + Math.floor(Math.random() * 18);
    const speed = 1 + Math.floor(Math.random() * 12);
    
    cards[id] = {
      id,
      name,
      rarity,
      attack,
      defense,
      speed,
      level: 1,
      nation: getRandomNation(),
      position: getRandomPosition()
    };
    
    if (i < 5) {
      starters.push(id);
    } else if (i < 11) {
      subs.push(id);
    }
  }
  
  return { cards, starters, subs };
}

// Créer ou récupérer le profil utilisateur
async function ensureUserProfile(uid, username, email) {
  const userRef = getUserRef(uid);
  const snapshot = await get(userRef);
  
  if (!snapshot.exists()) {
    // Créer un nouveau profil utilisateur
    const { cards, starters, subs } = generateStarterCards();
    
    const userData = {
      username: username,
      displayName: username,
      email: email,
      gems: 25,
      coins: 500,
      energy: 15,
      maxEnergy: 20,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      vip: false,
      vipExpiration: null,
      wins: 0,
      losses: 0,
      draws: 0,
      badges: ["Débutant"],
      friends: [],
      friendRequests: [],
      starters,
      subs,
      cards,
      matchHistory: {},
      lastDailyReward: null,
      likes: 0,
      likedBy: [],
      totalMatches: 0,
      winRate: 0,
      totalGoals: 0,
      totalDefenses: 0,
      quests: {
        daily: {},
        weekly: {}
      },
      registrationDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      playersSold: 0
    };
    
    await set(userRef, userData);
    return userData;
  } else {
    // Retourner les données existantes
    const data = snapshot.val();
    // Mettre à jour la dernière connexion
    await update(userRef, {
      lastLogin: new Date().toISOString()
    });
    return data;
  }
}

// Charger les données utilisateur depuis Firebase
async function loadUserData() {
  const userId = getUserId();
  if (!userId) return null;
  
  const userRef = getUserRef();
  const snapshot = await get(userRef);
  
  if (snapshot.exists()) {
    currentUserData = snapshot.val();
    return currentUserData;
  }
  return null;
}

// Mettre à jour les données utilisateur dans Firebase
async function updateUserData(updates) {
  const userId = getUserId();
  if (!userId) return;
  
  const userRef = getUserRef();
  await update(userRef, updates);
  
  if (currentUserData) {
    currentUserData = { ...currentUserData, ...updates };
  }
}

// Charger tous les utilisateurs pour le classement
async function loadAllUsers() {
  const usersRef = ref(db, 'users');
  const snapshot = await get(usersRef);
  
  if (snapshot.exists()) {
    const usersData = snapshot.val();
    globalUsers = Object.entries(usersData)
      .filter(([uid, user]) => user && user.email)
      .map(([uid, user]) => ({
        uid,
        ...user
      }));
    return globalUsers;
  }
  return [];
}

// Load dashboard
async function loadDashboard() {
  if (!await ensureUserData()) return;
  
  // Vérifier l'expiration du VIP
  checkVipExpiration();
  
  const dashGems = document.getElementById('dash-gems');
  const dashCoins = document.getElementById('dash-coins');
  const dashEnergy = document.getElementById('dash-energy');
  const dashLevel = document.getElementById('dash-level');
  const hdrUser = document.getElementById('hdr-user');
  const rewardDay = document.getElementById('reward-day');
  
  if (dashGems) dashGems.textContent = currentUserData.gems || 0;
  if (dashCoins) dashCoins.textContent = currentUserData.coins || 0;
  if (dashEnergy) dashEnergy.textContent = `${currentUserData.energy || 0}/${currentUserData.maxEnergy || 20}`;
  if (dashLevel) dashLevel.textContent = currentUserData.level || 1;
  if (hdrUser) hdrUser.textContent = currentUserData.displayName || 'Joueur';
  
  // Vérification de la récompense quotidienne
  checkDailyReward();
  
  // Afficher le panel admin si l'utilisateur est admin
  const adminPanel = document.getElementById('admin-panel');
  if (adminPanel) {
    if (getUserId() === ADMIN_UID) {
      adminPanel.style.display = 'block';
      isAdmin = true;
    } else {
      adminPanel.style.display = 'none';
      isAdmin = false;
    }
  }
  
  // Charger tous les utilisateurs pour le classement
  await loadAllUsers();
  
  // Populate mini leaderboard with likes
  const miniLeaderboard = document.getElementById('mini-leaderboard');
  if (miniLeaderboard) {
    const sortedUsers = [...globalUsers]
      .sort((a, b) => (b.likes || 0) - (a.likes || 0) || (b.level || 1) - (a.level || 1))
      .slice(0, 5);
    
    miniLeaderboard.innerHTML = '';
    sortedUsers.forEach((user, index) => {
      const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
      const hasLiked = user.likedBy?.includes(getUserId());
      
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      item.innerHTML = `
        <div class="rank ${rankClass}">${index + 1}</div>
        <div>
          <div>${user.displayName || 'Joueur'}</div>
          <div class="small">Niv. ${user.level || 1}</div>
        </div>
        <div class="leaderboard-likes">
          <button class="like-btn-leaderboard ${hasLiked ? 'liked' : ''}" data-user="${user.uid}">
            <i class="fas fa-heart"></i>
          </button>
          <span>${user.likes || 0}</span>
        </div>
      `;
      miniLeaderboard.appendChild(item);
    });
    
    // Événements pour les boutons like dans le classement
    document.querySelectorAll('.like-btn-leaderboard').forEach(btn => {
      btn.addEventListener('click', function() {
        const userId = this.getAttribute('data-user');
        likeUserFromLeaderboard(userId);
      });
    });
  }
  
  // Vérifier et attribuer les badges
  await checkAndAwardBadges();
}

// NOUVEAU: Système de likes dans le classement
async function likeUserFromLeaderboard(userId) {
  if (!currentUserData) return;
  
  const userRef = getUserRef(userId);
  const snapshot = await get(userRef);
  
  if (snapshot.exists()) {
    const userData = snapshot.val();
    const hasLiked = userData.likedBy?.includes(getUserId());
    let updatedLikes = userData.likes || 0;
    let updatedLikedBy = [...(userData.likedBy || [])];
    
    if (hasLiked) {
      // Retirer le like
      updatedLikes = Math.max(0, updatedLikes - 1);
      updatedLikedBy = updatedLikedBy.filter(uid => uid !== getUserId());
      showNotification("Like retiré", "info");
    } else {
      // Ajouter le like
      updatedLikes += 1;
      updatedLikedBy.push(getUserId());
      showNotification("Joueur liké! 💖", "success");
    }
    
    // Mettre à jour le profil liké
    await update(userRef, {
      likes: updatedLikes,
      likedBy: updatedLikedBy
    });
    
    // Recharger le dashboard pour mettre à jour l'affichage
    loadDashboard();
  }
}

// NOUVEAU: Système de clans
async function loadClan() {
  if (!await ensureUserData()) return;
  
  await loadAllUsers();
  await loadClans();
  
  const userClan = document.getElementById('user-clan');
  const clansList = document.getElementById('clans-list');
  const resourceSharing = document.getElementById('resource-sharing');
  
  // Afficher le clan de l'utilisateur
  if (userClan) {
    const userClanData = clans.find(c => c.members?.includes(getUserId()));
    
    if (userClanData) {
      userClan.innerHTML = `
        <div class="clan-item">
          <div class="clan-info">
            <div style="font-weight: bold;">${userClanData.name}</div>
            <div class="small">Niveau ${userClanData.level || 1} • ${userClanData.members.length}/10 membres</div>
            <div class="clan-members">
              ${userClanData.members.slice(0, 5).map(memberId => {
                const member = globalUsers.find(u => u.uid === memberId);
                return `<div class="clan-member" title="${member?.displayName || 'Membre'}">${member?.displayName?.charAt(0) || 'M'}</div>`;
              }).join('')}
              ${userClanData.members.length > 5 ? `<div class="clan-member">+${userClanData.members.length - 5}</div>` : ''}
            </div>
          </div>
          <button class="ghost small-btn leave-clan" data-clan="${userClanData.id}">Quitter</button>
        </div>
      `;
    } else {
      userClan.innerHTML = '<div class="small">Vous n\'êtes dans aucun clan</div>';
    }
  }
  
  // Afficher la liste des clans
  if (clansList) {
    clansList.innerHTML = '';
    
    if (clans.length === 0) {
      clansList.innerHTML = '<div class="small">Aucun clan disponible</div>';
    } else {
      clans.forEach(clan => {
        if (!clan.members?.includes(getUserId())) {
          const clanEl = document.createElement('div');
          clanEl.className = 'clan-item';
          clanEl.innerHTML = `
            <div class="clan-info">
              <div style="font-weight: bold;">${clan.name}</div>
              <div class="small">${clan.members.length}/10 membres • Niveau ${clan.level || 1}</div>
            </div>
            <button class="small-btn join-clan" data-clan="${clan.id}">Rejoindre</button>
          `;
          clansList.appendChild(clanEl);
        }
      });
    }
  }
  
  // Afficher le partage de ressources
  if (resourceSharing) {
    const userClanData = clans.find(c => c.members?.includes(getUserId()));
    
    if (userClanData) {
      resourceSharing.innerHTML = `
        <div class="share-resource">
          <div class="small">Partager des ressources avec le clan</div>
          <div class="share-amount">
            <input type="number" id="share-coins" placeholder="Pièces à partager" min="1" max="${currentUserData.coins || 0}"/>
            <button class="small-btn share-coins-btn">Partager</button>
          </div>
          <div class="tax-info">Taxe: 10% (90% vont au destinataire)</div>
        </div>
      `;
      
      // Événement pour partager des pièces
      document.querySelector('.share-coins-btn').addEventListener('click', async () => {
        const coinsInput = document.getElementById('share-coins');
        const coinsAmount = parseInt(coinsInput.value);
        
        if (!coinsAmount || coinsAmount <= 0) {
          showNotification("Veuillez entrer un montant valide", "warning");
          return;
        }
        
        if (coinsAmount > (currentUserData.coins || 0)) {
          showNotification("Pas assez de pièces", "warning");
          return;
        }
        
        // Calculer la taxe
        const tax = Math.floor(coinsAmount * 0.1);
        const netAmount = coinsAmount - tax;
        
        // Répartir entre les membres du clan (sauf l'utilisateur actuel)
        const otherMembers = userClanData.members.filter(memberId => memberId !== getUserId());
        const sharePerMember = Math.floor(netAmount / otherMembers.length);
        
        if (otherMembers.length === 0) {
          showNotification("Aucun autre membre dans le clan", "warning");
          return;
        }
        
        // Distribuer aux membres
        for (const memberId of otherMembers) {
          const memberRef = getUserRef(memberId);
          const memberSnapshot = await get(memberRef);
          
          if (memberSnapshot.exists()) {
            const memberData = memberSnapshot.val();
            await update(memberRef, {
              coins: (memberData.coins || 0) + sharePerMember
            });
          }
        }
        
        // Déduire de l'utilisateur actuel
        await updateUserData({
          coins: (currentUserData.coins || 0) - coinsAmount
        });
        
        showNotification(`${coinsAmount} pièces partagées avec le clan!`, "success");
        loadClan();
        loadDashboard();
      });
    } else {
      resourceSharing.innerHTML = '<div class="small">Rejoignez un clan pour partager des ressources</div>';
    }
  }
  
  // Événements pour les boutons de clan
  document.querySelectorAll('.join-clan').forEach(btn => {
    btn.addEventListener('click', async function() {
      const clanId = this.getAttribute('data-clan');
      const clan = clans.find(c => c.id === clanId);
      
      if (clan && clan.members.length < 10) {
        // Ajouter l'utilisateur au clan
        const clanRef = ref(db, `clans/${clanId}`);
        const updatedMembers = [...clan.members, getUserId()];
        
        await update(clanRef, {
          members: updatedMembers
        });
        
        showNotification(`Vous avez rejoint le clan ${clan.name}!`, "success");
        loadClan();
      } else {
        showNotification("Clan complet ou introuvable", "warning");
      }
    });
  });
  
  document.querySelectorAll('.leave-clan').forEach(btn => {
    btn.addEventListener('click', async function() {
      const clanId = this.getAttribute('data-clan');
      const clan = clans.find(c => c.id === clanId);
      
      if (clan) {
        // Retirer l'utilisateur du clan
        const clanRef = ref(db, `clans/${clanId}`);
        const updatedMembers = clan.members.filter(memberId => memberId !== getUserId());
        
        await update(clanRef, {
          members: updatedMembers
        });
        
        showNotification(`Vous avez quitté le clan ${clan.name}`, "info");
        loadClan();
      }
    });
  });
}

// NOUVEAU: Charger les clans depuis Firebase
async function loadClans() {
  const clansRef = ref(db, 'clans');
  const snapshot = await get(clansRef);
  
  if (snapshot.exists()) {
    const clansData = snapshot.val();
    clans = Object.entries(clansData).map(([id, clan]) => ({
      id,
      ...clan
    }));
  } else {
    clans = [];
  }
  return clans;
}

// NOUVEAU: Créer un clan
async function createClan(name) {
  if (!currentUserData) return false;
  
  // Vérifier le coût
  if ((currentUserData.coins || 0) < 5000) {
    showNotification("Pas assez de pièces pour créer un clan (5000 pièces requises)", "warning");
    return false;
  }
  
  const clanId = 'clan' + Date.now();
  const clanData = {
    id: clanId,
    name: name,
    level: 1,
    members: [getUserId()],
    createdBy: getUserId(),
    createdAt: new Date().toISOString()
  };
  
  const clanRef = ref(db, `clans/${clanId}`);
  await set(clanRef, clanData);
  
  // Déduire le coût
  await updateUserData({
    coins: (currentUserData.coins || 0) - 5000
  });
  
  showNotification(`Clan ${name} créé avec succès!`, "success");
  return true;
}

// NOUVEAU: Système de marché des joueurs
async function loadMarket() {
  if (!await ensureUserData()) return;
  
  await loadAllUsers();
  await loadMarketPlayers();
  
  const sellPlayer = document.getElementById('sell-player');
  const upgradePlayer = document.getElementById('upgrade-player');
  const marketPlayersEl = document.getElementById('market-players');
  
  // Afficher l'interface de vente
  if (sellPlayer) {
    const userCards = Object.values(currentUserData.cards || {});
    sellPlayer.innerHTML = `
      <div class="small">Sélectionnez un joueur à vendre</div>
      <select id="player-to-sell" style="width: 100%; margin: 8px 0;">
        <option value="">Choisir un joueur</option>
        ${userCards.map(card => `
          <option value="${card.id}" data-rarity="${card.rarity}">${card.name} (${card.rarity}) - ⚔️${card.attack} 🛡️${card.defense} ⚡${card.speed}</option>
        `).join('')}
      </select>
      <div class="row">
        <input type="number" id="sell-price" placeholder="Prix en pièces" min="100" style="flex: 1;"/>
        <button class="small-btn" id="btn-sell-player">Vendre</button>
      </div>
    `;
    
    // Événement pour vendre un joueur
    document.getElementById('btn-sell-player').addEventListener('click', sellPlayerOnMarket);
  }
  
  // Afficher l'interface d'amélioration
  if (upgradePlayer) {
    const userCards = Object.values(currentUserData.cards || {});
    upgradePlayer.innerHTML = `
      <div class="small">Sélectionnez un joueur à améliorer</div>
      <select id="player-to-upgrade" style="width: 100%; margin: 8px 0;">
        <option value="">Choisir un joueur</option>
        ${userCards.map(card => `
          <option value="${card.id}" data-rarity="${card.rarity}">${card.name} (${card.rarity}) - Niv. ${card.level || 1}</option>
        `).join('')}
      </select>
      <div id="upgrade-info" style="margin-top: 8px;">
        <!-- Informations d'amélioration -->
      </div>
    `;
    
    // Événement pour changer de joueur à améliorer
    document.getElementById('player-to-upgrade').addEventListener('change', showUpgradeInfo);
  }
  
  // Afficher les joueurs en vente
  if (marketPlayersEl) {
    marketPlayersEl.innerHTML = '';
    
    if (marketPlayers.length === 0) {
      marketPlayersEl.innerHTML = '<div class="small">Aucun joueur en vente</div>';
    } else {
      marketPlayers.forEach(player => {
        if (player.sellerId !== getUserId()) {
          const playerEl = document.createElement('div');
          playerEl.className = 'player-card-market';
          playerEl.innerHTML = `
            <div class="player-info">
              <div style="font-weight: bold;">${player.name}</div>
              <div class="small">${player.rarity} • ${player.position} • Niv. ${player.level || 1}</div>
              <div class="card-stats">
                <span>⚔️ ${player.attack}</span>
                <span>🛡️ ${player.defense}</span>
                <span>⚡ ${player.speed}</span>
              </div>
            </div>
            <div class="player-price">
              <div>${player.price} 🪙</div>
              <button class="small-btn buy-player-btn" data-player="${player.id}">Acheter</button>
            </div>
          `;
          marketPlayersEl.appendChild(playerEl);
        }
      });
    }
    
    // Événements pour acheter des joueurs
    document.querySelectorAll('.buy-player-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const playerId = this.getAttribute('data-player');
        const player = marketPlayers.find(p => p.id === playerId);
        
        if (!player) return;
        
        if ((currentUserData.coins || 0) < player.price) {
          showNotification("Pas assez de pièces pour acheter ce joueur", "warning");
          return;
        }
        
        // Vérifier la limite de collection
        const userCardsCount = Object.keys(currentUserData.cards || {}).length;
        if (userCardsCount >= playerCollectionLimit) {
          showNotification(`Limite de collection atteinte (${playerCollectionLimit} joueurs maximum)`, "warning");
          return;
        }
        
        // Acheter le joueur
        await buyPlayerFromMarket(player);
      });
    });
  }
}

// NOUVEAU: Vendre un joueur sur le marché
async function sellPlayerOnMarket() {
  const playerSelect = document.getElementById('player-to-sell');
  const priceInput = document.getElementById('sell-price');
  
  const playerId = playerSelect.value;
  const price = parseInt(priceInput.value);
  
  if (!playerId || !price || price < 100) {
    showNotification("Veuillez sélectionner un joueur et entrer un prix valide (min. 100 pièces)", "warning");
    return;
  }
  
  const player = currentUserData.cards[playerId];
  if (!player) return;
  
  // Vérifier que le joueur n'est pas dans l'équipe de départ
  if ((currentUserData.starters || []).includes(playerId)) {
    showNotification("Impossible de vendre un joueur de l'équipe de départ", "warning");
    return;
  }
  
  // Retirer le joueur de la collection
  const updatedCards = { ...currentUserData.cards };
  delete updatedCards[playerId];
  
  const updatedSubs = (currentUserData.subs || []).filter(id => id !== playerId);
  
  // Ajouter le joueur au marché
  const marketPlayer = {
    id: 'market_' + Date.now(),
    ...player,
    sellerId: getUserId(),
    sellerName: currentUserData.displayName || 'Joueur',
    price: price,
    listedAt: new Date().toISOString()
  };
  
  const marketRef = ref(db, `market/${marketPlayer.id}`);
  await set(marketRef, marketPlayer);
  
  // Mettre à jour l'utilisateur
  await updateUserData({
    cards: updatedCards,
    subs: updatedSubs,
    playersSold: (currentUserData.playersSold || 0) + 1
  });
  
  showNotification(`${player.name} mis en vente pour ${price} pièces!`, "success");
  loadMarket();
}

// NOUVEAU: Acheter un joueur du marché
async function buyPlayerFromMarket(player) {
  // Déduire le prix
  const updatedCoins = (currentUserData.coins || 0) - player.price;
  
  // Ajouter le joueur à la collection
  const playerId = 'card' + Date.now();
  const updatedCards = {
    ...currentUserData.cards,
    [playerId]: {
      ...player,
      id: playerId
    }
  };
  
  const updatedSubs = [...(currentUserData.subs || []), playerId];
  
  // Verser les pièces au vendeur (avec taxe de 10%)
  const sellerRef = getUserRef(player.sellerId);
  const sellerSnapshot = await get(sellerRef);
  
  if (sellerSnapshot.exists()) {
    const sellerData = sellerSnapshot.val();
    const sellerRevenue = Math.floor(player.price * 0.9); // 10% de taxe
    
    await update(sellerRef, {
      coins: (sellerData.coins || 0) + sellerRevenue
    });
  }
  
  // Retirer le joueur du marché
  const marketRef = ref(db, `market/${player.id}`);
  await remove(marketRef);
  
  // Mettre à jour l'utilisateur actuel
  await updateUserData({
    coins: updatedCoins,
    cards: updatedCards,
    subs: updatedSubs
  });
  
  showNotification(`${player.name} acheté pour ${player.price} pièces!`, "success");
  loadMarket();
}

// NOUVEAU: Charger les joueurs du marché
async function loadMarketPlayers() {
  const marketRef = ref(db, 'market');
  const snapshot = await get(marketRef);
  
  if (snapshot.exists()) {
    const marketData = snapshot.val();
    marketPlayers = Object.values(marketData);
  } else {
    marketPlayers = [];
  }
  return marketPlayers;
}

// NOUVEAU: Afficher les informations d'amélioration
async function showUpgradeInfo() {
  const playerSelect = document.getElementById('player-to-upgrade');
  const upgradeInfo = document.getElementById('upgrade-info');
  
  const playerId = playerSelect.value;
  if (!playerId) {
    upgradeInfo.innerHTML = '';
    return;
  }
  
  const player = currentUserData.cards[playerId];
  if (!player) return;
  
  const upgradeCost = calculateUpgradeCost(player);
  const canUpgrade = (currentUserData.coins || 0) >= upgradeCost;
  
  upgradeInfo.innerHTML = `
    <div class="upgrade-stats">
      <div>
        <div class="small">Attaque</div>
        <div>${player.attack} → ${player.attack + 5}</div>
      </div>
      <div>
        <div class="small">Défense</div>
        <div>${player.defense} → ${player.defense + 3}</div>
      </div>
      <div>
        <div class="small">Vitesse</div>
        <div>${player.speed} → ${player.speed + 2}</div>
      </div>
    </div>
    <div class="upgrade-cost">
      <div>Coût:</div>
      <div>${upgradeCost} 🪙</div>
    </div>
    <button class="upgrade-btn small-btn ${canUpgrade ? 'success' : 'ghost'}" id="btn-upgrade-player" ${!canUpgrade ? 'disabled' : ''}>
      <i class="fas fa-arrow-up"></i> Améliorer
    </button>
  `;
  
  // Événement pour améliorer le joueur
  document.getElementById('btn-upgrade-player').addEventListener('click', () => {
    upgradePlayer(playerId);
  });
}

// NOUVEAU: Calculer le coût d'amélioration
function calculateUpgradeCost(player) {
  const baseCost = 500;
  const rarityMultiplier = {
    'bronze': 1,
    'silver': 2,
    'gold': 4,
    'legendary': 8
  };
  
  const levelMultiplier = player.level || 1;
  
  return baseCost * (rarityMultiplier[player.rarity] || 1) * levelMultiplier;
}

// NOUVEAU: Améliorer un joueur
async function upgradePlayer(playerId) {
  const player = currentUserData.cards[playerId];
  if (!player) return;
  
  const upgradeCost = calculateUpgradeCost(player);
  
  if ((currentUserData.coins || 0) < upgradeCost) {
    showNotification("Pas assez de pièces pour améliorer ce joueur", "warning");
    return;
  }
  
  // Améliorer les statistiques
  const updatedCards = {
    ...currentUserData.cards,
    [playerId]: {
      ...player,
      attack: player.attack + 5,
      defense: player.defense + 3,
      speed: player.speed + 2,
      level: (player.level || 1) + 1
    }
  };
  
  // Déduire le coût
  const updatedCoins = (currentUserData.coins || 0) - upgradeCost;
  
  // Mettre à jour l'utilisateur
  await updateUserData({
    coins: updatedCoins,
    cards: updatedCards
  });
  
  showNotification(`${player.name} amélioré au niveau ${(player.level || 1) + 1}!`, "success");
  loadMarket();
}

// NOUVEAU: Système de badges par accomplissements
async function loadBadges() {
  if (!await ensureUserData()) return;
  
  await loadAvailableBadges();
  
  const userBadges = document.getElementById('user-badges');
  const availableBadgesEl = document.getElementById('available-badges');
  
  // Afficher les badges de l'utilisateur
  if (userBadges) {
    const userBadgeList = currentUserData.badges || [];
    userBadges.innerHTML = '';
    
    if (userBadgeList.length === 0) {
      userBadges.innerHTML = '<div class="small" style="grid-column: 1 / -1;">Aucun badge obtenu</div>';
    } else {
      userBadgeList.forEach(badgeName => {
        const badge = availableBadges.find(b => b.name === badgeName);
        if (badge) {
          const badgeEl = document.createElement('div');
          badgeEl.className = 'badge-item unlocked';
          badgeEl.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="small">${badge.name}</div>
          `;
          userBadges.appendChild(badgeEl);
        }
      });
    }
  }
  
  // Afficher les badges disponibles
  if (availableBadgesEl) {
    availableBadgesEl.innerHTML = '';
    
    availableBadges.forEach(badge => {
      const hasBadge = (currentUserData.badges || []).includes(badge.name);
      const badgeEl = document.createElement('div');
      badgeEl.className = `badge-item ${hasBadge ? 'unlocked' : 'locked'}`;
      badgeEl.innerHTML = `
        <div class="badge-icon">${badge.icon}</div>
        <div class="small">${badge.name}</div>
        <div class="small" style="margin-top: 4px; font-size: 10px;">${badge.description}</div>
      `;
      availableBadgesEl.appendChild(badgeEl);
    });
  }
}

// NOUVEAU: Charger les badges disponibles
async function loadAvailableBadges() {
  // En temps normal, cela viendrait de Firebase
  // Pour l'instant, on les définit en dur
  availableBadges = [
    { name: "Débutant", icon: "🎯", description: "Compléter le tutoriel" },
    { name: "Collectionneur", icon: "📚", description: "Collectionner 20 joueurs" },
    { name: "Vainqueur", icon: "🏆", description: "Gagner 10 matchs" },
    { name: "Élite", icon: "⭐", description: "Atteindre le niveau 10" },
    { name: "Légende", icon: "👑", description: "Atteindre le niveau 25" },
    { name: "Marchand", icon: "💰", description: "Vendre 5 joueurs" },
    { name: "Stratège", icon: "♟️", description: "Gagner 5 matchs consécutifs" },
    { name: "Social", icon: "👥", description: "Avoir 10 amis" }
  ];
  
  return availableBadges;
}

// NOUVEAU: Vérifier et attribuer les badges
async function checkAndAwardBadges() {
  if (!currentUserData) return;
  
  const userBadges = currentUserData.badges || [];
  const newBadges = [];
  
  // Badge Débutant
  if (!userBadges.includes("Débutant") && currentUserData.totalMatches >= 1) {
    newBadges.push("Débutant");
  }
  
  // Badge Collectionneur
  if (!userBadges.includes("Collectionneur") && Object.keys(currentUserData.cards || {}).length >= 20) {
    newBadges.push("Collectionneur");
  }
  
  // Badge Vainqueur
  if (!userBadges.includes("Vainqueur") && (currentUserData.wins || 0) >= 10) {
    newBadges.push("Vainqueur");
  }
  
  // Badge Élite
  if (!userBadges.includes("Élite") && (currentUserData.level || 1) >= 10) {
    newBadges.push("Élite");
  }
  
  // Badge Légende
  if (!userBadges.includes("Légende") && (currentUserData.level || 1) >= 25) {
    newBadges.push("Légende");
  }
  
  // Badge Marchand
  if (!userBadges.includes("Marchand") && (currentUserData.playersSold || 0) >= 5) {
    newBadges.push("Marchand");
  }
  
  // Badge Social
  if (!userBadges.includes("Social") && (currentUserData.friends || []).length >= 10) {
    newBadges.push("Social");
  }
  
  // Si de nouveaux badges ont été gagnés
  if (newBadges.length > 0) {
    const updatedBadges = [...userBadges, ...newBadges];
    await updateUserData({
      badges: updatedBadges
    });
    
    newBadges.forEach(badge => {
      showNotification(`Nouveau badge débloqué: ${badge}!`, "success");
    });
  }
}

// NOUVEAU: Système VIP avec durée limitée
async function buyVip() {
  if (!currentUserData) return;
  
  const vipCost = 2000;
  
  if ((currentUserData.gems || 0) < vipCost) {
    showNotification(`Pas assez de gems pour acheter VIP (${vipCost} gems requis)`, "warning");
    return;
  }
  
  // Vérifier si l'utilisateur a déjà un VIP actif
  const now = new Date();
  const vipExpiration = currentUserData.vipExpiration ? new Date(currentUserData.vipExpiration) : null;
  
  if (vipExpiration && vipExpiration > now) {
    showNotification("Vous avez déjà un abonnement VIP actif", "warning");
    return;
  }
  
  // Calculer la nouvelle date d'expiration
  const newExpiration = new Date();
  newExpiration.setDate(newExpiration.getDate() + 30); // 30 jours
  
  // Mettre à jour l'utilisateur
  const updatedGems = (currentUserData.gems || 0) - vipCost;
  const updatedBadges = [...(currentUserData.badges || [])];
  
  if (!updatedBadges.includes("VIP")) {
    updatedBadges.push("VIP");
  }
  
  await updateUserData({
    vip: true,
    vipExpiration: newExpiration.toISOString(),
    gems: updatedGems,
    badges: updatedBadges,
    maxEnergy: 30 // +50% d'énergie
  });
  
  showNotification("Abonnement VIP activé pour 30 jours! 👑", "success");
  loadDashboard();
}

// NOUVEAU: Vérifier l'expiration du VIP
function checkVipExpiration() {
  if (!currentUserData || !currentUserData.vip) return;
  
  const now = new Date();
  const vipExpiration = new Date(currentUserData.vipExpiration);
  
  if (vipExpiration < now) {
    // VIP expiré
    updateUserData({
      vip: false,
      maxEnergy: 20
    });
    showNotification("Votre abonnement VIP a expiré", "info");
  }
}

// NOUVEAU: Afficher le statut VIP
function displayVipStatus() {
  const vipStatus = document.getElementById('vip-status');
  if (!vipStatus) return;
  
  if (currentUserData.vip) {
    const expiration = new Date(currentUserData.vipExpiration);
    const now = new Date();
    const daysLeft = Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));
    
    vipStatus.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div>Statut: <span class="vip-badge">VIP Actif</span></div>
          <div class="small">Expire dans ${daysLeft} jour(s)</div>
        </div>
        <div class="vip-timer">${daysLeft}J</div>
      </div>
    `;
  } else {
    vipStatus.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div>Statut: Standard</div>
          <div class="small">Passez VIP pour des avantages exclusifs</div>
        </div>
      </div>
    `;
  }
}

// MODIFIÉ: Charger la boutique avec le système VIP
async function loadStore() {
  if (!await ensureUserData()) return;
  
  // Afficher le statut VIP
  displayVipStatus();
}

// MODIFIÉ: Charger le match sans le système de championnat
async function loadMatch() {
  if (!await ensureUserData()) return;
  
  await loadAllUsers();
  
  // Masquer les sections de résultat et d'adversaire
  const matchOpponent = document.getElementById('match-opponent');
  const matchResult = document.getElementById('match-result');
  
  if (matchOpponent) matchOpponent.style.display = 'none';
  if (matchResult) matchResult.style.display = 'none';
  
  // Charger l'historique des matchs
  loadMatchHistory();
}

// CORRECTION: Système d'amis fonctionnel
async function loadFriends() {
  if (!await ensureUserData()) return;
  
  await loadAllUsers();
  
  const friendsList = document.getElementById('friends-list');
  const friendRequests = document.getElementById('friend-requests');
  const suggestedFriends = document.getElementById('suggested-friends');
  
  // Afficher la liste d'amis
  if (friendsList) {
    friendsList.innerHTML = '';
    const friends = currentUserData.friends || [];
    
    if (friends.length === 0) {
      friendsList.innerHTML = '<div class="small">Aucun ami</div>';
    } else {
      friends.forEach(friendId => {
        const friend = globalUsers.find(u => u.uid === friendId);
        if (friend) {
          const friendEl = document.createElement('div');
          friendEl.className = 'friend-item';
          friendEl.innerHTML = `
            <div class="friend-avatar ${friend.vip ? 'vip' : ''}">
              ${friend.vip ? '👑' : '👤'}
            </div>
            <div class="small">${friend.displayName || 'Joueur'}</div>
            <div class="quick" style="width: 100%;">
              <button class="ghost small-btn view-profile" data-user="${friend.uid}">
                <i class="fas fa-eye"></i> Voir
              </button>
            </div>
          `;
          friendsList.appendChild(friendEl);
        }
      });
    }
  }
  
  // Afficher les demandes d'amis
  if (friendRequests) {
    friendRequests.innerHTML = '';
    const requests = currentUserData.friendRequests || [];
    
    if (requests.length === 0) {
      friendRequests.innerHTML = '<div class="small">Aucune demande d\'ami</div>';
    } else {
      requests.forEach(requestId => {
        const requester = globalUsers.find(u => u.uid === requestId);
        if (requester && requester.uid !== getUserId()) {
          const requestEl = document.createElement('div');
          requestEl.className = 'leaderboard-item';
          requestEl.innerHTML = `
            <div>${requester.displayName || 'Joueur'}</div>
            <div class="user-actions">
              <button class="success small-btn accept-request" data-user="${requester.uid}"><i class="fas fa-check"></i></button>
              <button class="danger small-btn decline-request" data-user="${requester.uid}"><i class="fas fa-times"></i></button>
            </div>
          `;
          friendRequests.appendChild(requestEl);
        }
      });
    }
  }
  
  // Afficher les suggestions d'amis
  if (suggestedFriends) {
    suggestedFriends.innerHTML = '';
    const currentFriends = currentUserData.friends || [];
    const currentRequests = currentUserData.friendRequests || [];
    
    const suggestions = globalUsers
      .filter(user => 
        user.uid !== getUserId() && 
        !currentFriends.includes(user.uid) &&
        !currentRequests.includes(user.uid)
      )
      .slice(0, 4);
    
    if (suggestions.length === 0) {
      suggestedFriends.innerHTML = '<div class="small">Aucune suggestion</div>';
    } else {
      suggestions.forEach(user => {
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'friend-item';
        suggestionEl.innerHTML = `
          <div class="friend-avatar ${user.vip ? 'vip' : ''}">
            ${user.vip ? '👑' : '👤'}
          </div>
          <div class="small">${user.displayName || 'Joueur'}</div>
          <button class="small-btn add-friend" data-user="${user.uid}"><i class="fas fa-user-plus"></i> Ajouter</button>
        `;
        suggestedFriends.appendChild(suggestionEl);
      });
    }
  }
  
  // CORRECTION: Ajout des événements pour les boutons d'amis
  document.querySelectorAll('.add-friend').forEach(btn => {
    btn.addEventListener('click', async function() {
      const userId = this.getAttribute('data-user');
      if (!userId) return;
      
      // Ajouter la demande d'ami
      const userRef = getUserRef(userId);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        const updatedRequests = [...(userData.friendRequests || []), getUserId()];
        
        await update(userRef, {
          friendRequests: updatedRequests
        });
        
        showNotification(`Demande d'ami envoyée à ${userData.displayName || 'Joueur'}`, "success");
      }
    });
  });
  
  document.querySelectorAll('.accept-request').forEach(btn => {
    btn.addEventListener('click', async function() {
      const userId = this.getAttribute('data-user');
      if (!userId) return;
      
      // Accepter la demande d'ami
      const currentFriends = [...(currentUserData.friends || []), userId];
      const updatedRequests = (currentUserData.friendRequests || []).filter(id => id !== userId);
      
      await updateUserData({
        friends: currentFriends,
        friendRequests: updatedRequests
      });
      
      // Ajouter l'utilisateur actuel à la liste d'amis de l'autre utilisateur
      const friendRef = getUserRef(userId);
      const friendSnapshot = await get(friendRef);
      
      if (friendSnapshot.exists()) {
        const friendData = friendSnapshot.val();
        const friendFriends = [...(friendData.friends || []), getUserId()];
        
        await update(friendRef, {
          friends: friendFriends
        });
      }
      
      showNotification("Demande d'ami acceptée!", "success");
      loadFriends();
    });
  });
  
  document.querySelectorAll('.view-profile').forEach(btn => {
    btn.addEventListener('click', function() {
      const userId = this.getAttribute('data-user');
      if (!userId) return;
      
      viewUserProfile(userId);
    });
  });
}

// Achat avec pièces et gems
async function buyPack(packType, cost, currency) {
  if (!await ensureUserData()) return;
  
  if ((currentUserData[currency] || 0) < cost) {
    showNotification(`Pas assez de ${currency === 'gems' ? 'Gems' : 'Pièces'}!`, "warning");
    return;
  }
  
  const updatedCurrency = (currentUserData[currency] || 0) - cost;
  
  // Générer des cartes
  const cardCount = packType === 'silver' ? 4 : packType === 'vip' ? 5 : 3;
  const newCards = {};
  
  for (let i = 0; i < cardCount; i++) {
    const id = 'card' + Date.now() + Math.random().toString(36).substr(2, 5);
    let rarity;
    
    switch(packType) {
      case 'bronze':
        rarity = Math.random() < 0.7 ? 'bronze' : 'silver';
        break;
      case 'silver':
        rarity = Math.random() < 0.6 ? 'silver' : Math.random() < 0.8 ? 'gold' : 'bronze';
        break;
      case 'gold':
        rarity = Math.random() < 0.5 ? 'gold' : Math.random() < 0.8 ? 'legendary' : 'silver';
        break;
      case 'vip':
        rarity = Math.random() < 0.4 ? 'legendary' : Math.random() < 0.7 ? 'gold' : 'silver';
        break;
    }
    
    const name = extendedCardNames[Math.floor(Math.random() * extendedCardNames.length)];
    
    newCards[id] = {
      id,
      name: `${name} ${Math.floor(Math.random() * 100)}`,
      rarity,
      attack: 5 + Math.floor(Math.random() * 20),
      defense: 3 + Math.floor(Math.random() * 15),
      speed: 1 + Math.floor(Math.random() * 10),
      level: 1,
      nation: getRandomNation(),
      position: getRandomPosition()
    };
  }
  
  // Mettre à jour les cartes
  const updatedCards = { ...currentUserData.cards, ...newCards };
  const updatedSubs = [...(currentUserData.subs || [])];
  
  // Ajouter les nouvelles cartes aux substituts
  Object.keys(newCards).forEach(cardId => {
    if (updatedSubs.length < 10) {
      updatedSubs.push(cardId);
    }
  });
  
  showNotification(`Pack ${packType} acheté! ${cardCount} nouvelles cartes ajoutées.`, "success");
  
  // Mettre à jour Firebase
  const updates = {
    cards: updatedCards,
    subs: updatedSubs
  };
  updates[currency] = updatedCurrency;
  
  await updateUserData(updates);
  loadDashboard();
}

// Achat d'énergie avec pièces et gems
async function buyEnergy(amount, cost, currency) {
  if (!await ensureUserData()) return;
  
  if ((currentUserData[currency] || 0) < cost) {
    showNotification(`Pas assez de ${currency === 'gems' ? 'Gems' : 'Pièces'}!`, "warning");
    return;
  }
  
  const updatedCurrency = (currentUserData[currency] || 0) - cost;
  const updatedEnergy = Math.min(currentUserData.maxEnergy || 20, (currentUserData.energy || 0) + amount);
  
  const updates = {
    energy: updatedEnergy
  };
  updates[currency] = updatedCurrency;
  
  await updateUserData(updates);
  
  showNotification(`+${amount} Énergie ajoutée!`, "success");
  loadDashboard();
}

// Fonction pour inspecter un profil
async function viewUserProfile(userId) {
  const userRef = getUserRef(userId);
  const snapshot = await get(userRef);
  
  if (snapshot.exists()) {
    currentlyViewedUser = { uid: userId, ...snapshot.val() };
    showScreen('profile-view');
    loadProfileView();
  } else {
    showNotification("Profil non trouvé", "warning");
  }
}

// Charger le profil inspecté
async function loadProfileView() {
  if (!currentlyViewedUser) return;
  
  const viewedUserName = document.getElementById('viewed-user-name');
  const profileViewContent = document.getElementById('profile-view-content');
  
  if (viewedUserName) viewedUserName.textContent = currentlyViewedUser.displayName || 'Joueur';
  if (!profileViewContent) return;
  
  const isOwnProfile = currentlyViewedUser.uid === getUserId();
  const hasLiked = currentUserData?.likedBy?.includes(currentlyViewedUser.uid);
  
  profileViewContent.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar ${currentlyViewedUser.vip ? 'vip' : ''}">
        ${currentlyViewedUser.vip ? '👑' : '👤'}
      </div>
      <h3>${currentlyViewedUser.displayName || 'Joueur'}</h3>
      <div class="badges" style="justify-content: center; margin: 8px 0;">
        ${currentlyViewedUser.vip ? '<div class="badge vip-badge"><i class="fas fa-crown"></i> VIP</div>' : ''}
        <div class="badge"><i class="fas fa-trophy"></i> Niv. ${currentlyViewedUser.level || 1}</div>
        <div class="badge"><i class="fas fa-heart"></i> ${currentlyViewedUser.likes || 0} Likes</div>
      </div>
    </div>
    
    <div class="stats">
      <div class="stat">
        <div class="icon">🏆</div>
        <div>
          <div class="small">Victoires</div>
          <div>${currentlyViewedUser.wins || 0}</div>
        </div>
      </div>
      <div class="stat">
        <div class="icon">📊</div>
        <div>
          <div class="small">Matchs</div>
          <div>${currentlyViewedUser.totalMatches || 0}</div>
        </div>
      </div>
      <div class="stat">
        <div class="icon">⚡</div>
        <div>
          <div class="small">Taux Victoire</div>
          <div>${currentlyViewedUser.winRate || 0}%</div>
        </div>
      </div>
      <div class="stat">
        <div class="icon">⭐</div>
        <div>
          <div class="small">Badges</div>
          <div>${(currentlyViewedUser.badges || []).length}</div>
        </div>
      </div>
    </div>
    
    <div class="panel">
      <div class="small" style="margin-bottom: 8px;">Badges Obtenus</div>
      <div class="badges">
        ${(currentlyViewedUser.badges || []).map(badge => `
          <div class="badge"><i class="fas fa-medal"></i> ${badge}</div>
        `).join('')}
        ${(currentlyViewedUser.badges || []).length === 0 ? '<div class="small">Aucun badge</div>' : ''}
      </div>
    </div>
    
    ${!isOwnProfile ? `
      <div class="panel">
        <div class="row" style="justify-content: center; gap: 12px;">
          <button id="btn-like-profile" class="${hasLiked ? 'liked' : ''} like-btn">
            <i class="fas fa-heart"></i> ${hasLiked ? 'Unlike' : 'Like'} (${currentlyViewedUser.likes || 0})
          </button>
          <button id="btn-challenge-user" class="small-btn">
            <i class="fas fa-trophy"></i> Défier
          </button>
        </div>
      </div>
    ` : ''}
    
    <div class="panel">
      <div class="small" style="margin-bottom: 8px;">Statistiques Détaillées</div>
      <div class="row">
        <div style="flex: 1;">
          <div class="small">Cartes Possédées</div>
          <div>${Object.keys(currentlyViewedUser.cards || {}).length}</div>
        </div>
        <div style="flex: 1;">
          <div class="small">Amis</div>
          <div>${(currentlyViewedUser.friends || []).length}</div>
        </div>
      </div>
      <div class="row" style="margin-top: 8px;">
        <div style="flex: 1;">
          <div class="small">Membre depuis</div>
          <div>${new Date(currentlyViewedUser.registrationDate || Date.now()).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  `;
  
  // Événements pour les boutons
  if (!isOwnProfile) {
    document.getElementById('btn-like-profile')?.addEventListener('click', likeUserProfile);
    document.getElementById('btn-challenge-user')?.addEventListener('click', () => {
      showNotification(`Défi envoyé à ${currentlyViewedUser.displayName || 'Joueur'}!`, "info");
    });
  }
}

// Fonction pour liker un profil
async function likeUserProfile() {
  if (!currentlyViewedUser || !currentUserData) return;
  
  const viewedUserRef = getUserRef(currentlyViewedUser.uid);
  const currentUserId = getUserId();
  
  const hasLiked = currentUserData.likedBy?.includes(currentlyViewedUser.uid);
  let updatedLikes = currentlyViewedUser.likes || 0;
  let updatedLikedBy = [...(currentUserData.likedBy || [])];
  
  if (hasLiked) {
    // Retirer le like
    updatedLikes = Math.max(0, updatedLikes - 1);
    updatedLikedBy = updatedLikedBy.filter(uid => uid !== currentlyViewedUser.uid);
    showNotification("Like retiré", "info");
  } else {
    // Ajouter le like
    updatedLikes += 1;
    updatedLikedBy.push(currentlyViewedUser.uid);
    showNotification("Profil liké! 💖", "success");
  }
  
  // Mettre à jour le profil liké
  await update(viewedUserRef, {
    likes: updatedLikes
  });
  
  // Mettre à jour l'utilisateur actuel
  await updateUserData({
    likedBy: updatedLikedBy
  });
  
  // Recharger la vue
  currentlyViewedUser.likes = updatedLikes;
  loadProfileView();
}

// CORRECTION: Système de fusion fonctionnel
async function loadFusion() {
  if (!await ensureUserData()) return;
  
  const fusionCards = document.getElementById('fusion-cards');
  if (!fusionCards) return;
  
  // Afficher les cartes disponibles pour la fusion
  fusionCards.innerHTML = '';
  Object.values(currentUserData.cards || {}).forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = `card-item ${card.rarity} fusion-card`;
    cardEl.setAttribute('data-card', card.id);
    cardEl.innerHTML = `
      <div>
        <div class="card-title">${card.name}</div>
        <div class="small">${card.position} | ${card.nation}</div>
      </div>
      <div class="card-stats">
        <span>⚔️ ${card.attack}</span>
        <span>🛡️ ${card.defense}</span>
        <span>⚡ ${card.speed}</span>
      </div>
    `;
    fusionCards.appendChild(cardEl);
  });
  
  // Réinitialiser les emplacements de fusion
  selectedCardsForFusion = [];
  document.querySelectorAll('.fusion-slot').forEach(slot => {
    slot.innerHTML = '<div class="small">Emplacement vide</div>';
    slot.classList.remove('filled');
  });
  
  document.getElementById('btn-fusion').disabled = true;
  document.getElementById('fusion-result').style.display = 'none';
  
  // CORRECTION: Événements pour les cartes de fusion - version corrigée
  document.querySelectorAll('.fusion-card').forEach(cardEl => {
    cardEl.addEventListener('click', function() {
      const cardId = this.getAttribute('data-card');
      
      // Vérifier si la carte est déjà sélectionnée
      if (selectedCardsForFusion.includes(cardId)) {
        // Retirer la carte
        const index = selectedCardsForFusion.indexOf(cardId);
        selectedCardsForFusion.splice(index, 1);
        this.classList.remove('fusion-selected');
        updateFusionSlot(index, null);
      } else if (selectedCardsForFusion.length < 3) {
        // Ajouter la carte
        selectedCardsForFusion.push(cardId);
        this.classList.add('fusion-selected');
        updateFusionSlot(selectedCardsForFusion.length - 1, cardId);
      }
      
      updateFusionButton();
    });
  });
}

// CORRECTION: Fonctions utilitaires pour la fusion
function updateFusionSlot(index, cardId) {
  const slot = document.getElementById(`fusion-slot-${index + 1}`);
  if (!slot) return;
  
  if (!cardId) {
    slot.innerHTML = '<div class="small">Emplacement vide</div>';
    slot.classList.remove('filled');
  } else {
    const card = currentUserData.cards[cardId];
    slot.innerHTML = `
      <div>
        <div class="card-title">${card.name}</div>
        <div class="small">${card.rarity}</div>
      </div>
    `;
    slot.classList.add('filled');
  }
}

function updateFusionButton() {
  const btnFusion = document.getElementById('btn-fusion');
  if (btnFusion) {
    btnFusion.disabled = selectedCardsForFusion.length !== 3;
    btnFusion.textContent = `Fusionner (${selectedCardsForFusion.length}/3) - 100🪙`;
  }
}

// Exécuter la fusion
async function executeFusion() {
  if (selectedCardsForFusion.length !== 3) return;
  
  // Vérifier le coût
  if ((currentUserData.coins || 0) < 100) {
    showNotification("Pas assez de pièces pour la fusion! (100 pièces requises)", "warning");
    return;
  }
  
  // Calculer la nouvelle carte
  const cards = selectedCardsForFusion.map(id => currentUserData.cards[id]);
  const totalAttack = cards.reduce((sum, card) => sum + card.attack, 0);
  const totalDefense = cards.reduce((sum, card) => sum + card.defense, 0);
  const totalSpeed = cards.reduce((sum, card) => sum + card.speed, 0);
  
  // Déterminer la rareté de la nouvelle carte
  const rarityScore = cards.reduce((score, card) => {
    if (card.rarity === 'bronze') return score + 1;
    if (card.rarity === 'silver') return score + 2;
    if (card.rarity === 'gold') return score + 3;
    if (card.rarity === 'legendary') return score + 4;
    return score;
  }, 0);
  
  let newRarity = 'bronze';
  if (rarityScore >= 10) newRarity = 'legendary';
  else if (rarityScore >= 7) newRarity = 'gold';
  else if (rarityScore >= 4) newRarity = 'silver';
  
  // Créer la nouvelle carte
  const newCardId = 'card' + Date.now();
  const newCard = {
    id: newCardId,
    name: `Fusion ${extendedCardNames[Math.floor(Math.random() * extendedCardNames.length)]}`,
    rarity: newRarity,
    attack: Math.floor(totalAttack / 3) + 5,
    defense: Math.floor(totalDefense / 3) + 3,
    speed: Math.floor(totalSpeed / 3) + 2,
    level: 1,
    nation: getRandomNation(),
    position: getRandomPosition()
  };
  
  // Mettre à jour les données utilisateur
  const updatedCards = { ...currentUserData.cards };
  
  // Supprimer les cartes fusionnées
  selectedCardsForFusion.forEach(cardId => {
    delete updatedCards[cardId];
  });
  
  // Ajouter la nouvelle carte
  updatedCards[newCardId] = newCard;
  
  // Mettre à jour les substituts
  const updatedSubs = [...(currentUserData.subs || [])];
  updatedSubs.push(newCardId);
  
  // Déduire le coût
  const updatedCoins = (currentUserData.coins || 0) - 100;
  
  // Mettre à jour Firebase
  await updateUserData({
    cards: updatedCards,
    subs: updatedSubs,
    coins: updatedCoins
  });
  
  // Afficher le résultat
  const fusionResult = document.getElementById('fusion-result');
  if (fusionResult) {
    fusionResult.innerHTML = `
      <div class="fusion-success">
        <div class="reward-icon">✨</div>
        <h3>Fusion Réussie!</h3>
        <div class="card-item ${newCard.rarity}">
          <div>
            <div class="card-title">${newCard.name}</div>
            <div class="small">${newCard.position} | ${newCard.nation}</div>
          </div>
          <div class="card-stats">
            <span>⚔️ ${newCard.attack}</span>
            <span>🛡️ ${newCard.defense}</span>
            <span>⚡ ${newCard.speed}</span>
          </div>
        </div>
      </div>
    `;
    fusionResult.style.display = 'block';
    fusionResult.classList.add('fusion-success');
  }
  
  showNotification("Fusion réussie! Nouvelle carte créée.", "success");
  
  // Recharger l'interface de fusion
  setTimeout(() => {
    loadFusion();
  }, 3000);
}

// CORRECTION: Dashboard admin avec tous les boutons fonctionnels
async function loadAdminDashboard() {
  if (!isAdmin) {
    showNotification("Accès refusé", "danger");
    showScreen('dashboard');
    return;
  }
  
  await loadAllUsers();
  
  // Calculer les statistiques globales
  const totalUsers = globalUsers.length;
  const totalMatches = globalUsers.reduce((sum, user) => sum + (user.totalMatches || 0), 0);
  const totalGems = globalUsers.reduce((sum, user) => sum + (user.gems || 0), 0);
  const totalCoins = globalUsers.reduce((sum, user) => sum + (user.coins || 0), 0);
  
  const adminTotalUsers = document.getElementById('admin-total-users');
  const adminTotalMatches = document.getElementById('admin-total-matches');
  const adminTotalGems = document.getElementById('admin-total-gems');
  const adminTotalCoins = document.getElementById('admin-total-coins');
  
  if (adminTotalUsers) adminTotalUsers.textContent = totalUsers;
  if (adminTotalMatches) adminTotalMatches.textContent = totalMatches;
  if (adminTotalGems) adminTotalGems.textContent = totalGems;
  if (adminTotalCoins) adminTotalCoins.textContent = totalCoins;
  
  // Afficher le classement réel avec likes
  const adminLeaderboard = document.getElementById('admin-leaderboard');
  if (adminLeaderboard) {
    adminLeaderboard.innerHTML = '';
    
    const topUsers = [...globalUsers]
      .sort((a, b) => (b.likes || 0) - (a.likes || 0) || (b.level || 1) - (a.level || 1))
      .slice(0, 10);
    
    topUsers.forEach((user, index) => {
      const rankClass = index < 3 ? `rank-${index+1}` : '';
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      item.innerHTML = `
        <div class="rank ${rankClass}">${index+1}</div>
        <div>
          <div>${user.displayName || 'Joueur'}</div>
          <div class="small">Niv. ${user.level || 1}</div>
        </div>
        <div style="margin-left: auto; text-align: right;">
          <div>${user.likes || 0} ❤️</div>
          <div class="small">${user.wins || 0}V ${user.losses || 0}D</div>
        </div>
      `;
      adminLeaderboard.appendChild(item);
    });
  }
  
  // Initialisation des onglets admin
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // Activer l'onglet sélectionné
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Afficher la section correspondante
      document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(`admin-${tabId}-section`).classList.add('active');
    });
  });
  
  // Initialisation des boutons admin
  document.getElementById('admin-send-notif')?.addEventListener('click', function() {
    const message = document.getElementById('admin-notif-message')?.value;
    if (!message) {
      showNotification("Veuillez entrer un message", "warning");
      return;
    }
    
    showNotification("Notification envoyée à tous les utilisateurs", "success");
    addAdminLog(`Notification envoyée: "${message}"`);
  });
  
  document.getElementById('admin-add-gems')?.addEventListener('click', async function() {
    // Ajouter 10 gems à tous les utilisateurs
    for (const user of globalUsers) {
      const userRef = getUserRef(user.uid);
      await update(userRef, {
        gems: (user.gems || 0) + 10
      });
    }
    
    showNotification("10 gems ajoutés à tous les utilisateurs", "success");
    addAdminLog("10 gems ajoutés à tous les utilisateurs");
    loadAdminDashboard();
  });
  
  document.getElementById('admin-add-coins')?.addEventListener('click', async function() {
    // Ajouter 100 pièces à tous les utilisateurs
    for (const user of globalUsers) {
      const userRef = getUserRef(user.uid);
      await update(userRef, {
        coins: (user.coins || 0) + 100
      });
    }
    
    showNotification("100 pièces ajoutées à tous les utilisateurs", "success");
    addAdminLog("100 pièces ajoutées à tous les utilisateurs");
    loadAdminDashboard();
  });
  
  document.getElementById('admin-set-gems')?.addEventListener('click', async function() {
    const userId = document.getElementById('admin-user-id')?.value;
    const gemsAmount = parseInt(document.getElementById('admin-gems-amount')?.value);
    
    if (!userId || isNaN(gemsAmount)) {
      showNotification("Veuillez entrer un ID utilisateur et un montant valide", "warning");
      return;
    }
    
    const userRef = getUserRef(userId);
    await update(userRef, {
      gems: gemsAmount
    });
    
    showNotification(`Gems définis à ${gemsAmount} pour l'utilisateur ${userId}`, "success");
    addAdminLog(`Gems définis à ${gemsAmount} pour l'utilisateur ${userId}`);
  });
  
  document.getElementById('admin-set-coins')?.addEventListener('click', async function() {
    const userId = document.getElementById('admin-user-id')?.value;
    const coinsAmount = parseInt(document.getElementById('admin-coins-amount')?.value);
    
    if (!userId || isNaN(coinsAmount)) {
      showNotification("Veuillez entrer un ID utilisateur et un montant valide", "warning");
      return;
    }
    
    const userRef = getUserRef(userId);
    await update(userRef, {
      coins: coinsAmount
    });
    
    showNotification(`Pièces définies à ${coinsAmount} pour l'utilisateur ${userId}`, "success");
    addAdminLog(`Pièces définies à ${coinsAmount} pour l'utilisateur ${userId}`);
  });
}

// CORRECTION: Système de sélection automatique d'équipe
function autoSelectBestTeam() {
  if (!currentUserData || !currentUserData.cards) return;
  
  // Trier les cartes par score total (attaque + défense + vitesse)
  const sortedCards = Object.values(currentUserData.cards)
    .sort((a, b) => {
      const scoreA = a.attack + a.defense + a.speed;
      const scoreB = b.attack + b.defense + b.speed;
      return scoreB - scoreA;
    });
  
  // Prendre les 5 meilleures cartes
  const bestCards = sortedCards.slice(0, 5);
  const bestCardIds = bestCards.map(card => card.id);
  
  // Mettre à jour l'équipe de départ
  updateUserData({
    starters: bestCardIds
  });
  
  showNotification("Équipe optimisée automatiquement!", "success");
  loadTeam();
}

// CORRECTION: Calcul de la force d'équipe amélioré
function calculateTeamStrength(userData) {
  if (!userData?.cards || !userData?.starters) return 0;
  
  let totalStrength = 0;
  let positionCount = { ATT: 0, MID: 0, DEF: 0, GK: 0 };
  
  userData.starters.forEach(cardId => {
    const card = userData.cards[cardId];
    if (card) {
      // Force de base
      let cardStrength = card.attack + card.defense + card.speed;
      
      // Bonus de rareté
      const rarityBonus = {
        'bronze': 0,
        'silver': 10,
        'gold': 25,
        'legendary': 50
      };
      cardStrength += rarityBonus[card.rarity] || 0;
      
      // Bonus de niveau
      cardStrength += (card.level || 1) * 2;
      
      totalStrength += cardStrength;
      positionCount[card.position] = (positionCount[card.position] || 0) + 1;
    }
  });
  
  // Bonus d'équilibre d'équipe
  const hasAllPositions = positionCount.ATT > 0 && positionCount.MID > 0 && 
                         positionCount.DEF > 0 && positionCount.GK > 0;
  if (hasAllPositions) totalStrength *= 1.1;
  
  return Math.round(totalStrength);
}

// CORRECTION: Système de match contre joueurs réels
async function findOpponent() {
  if (!await ensureUserData()) return;
  
  // Vérifier l'énergie
  if ((currentUserData.energy || 0) < 5) {
    showNotification("Pas assez d'énergie! Achetez-en ou attendez.", "warning");
    return;
  }
  
  const btnFindOpponent = document.getElementById('btn-find-opponent');
  const matchmakingStatus = document.getElementById('matchmaking-status');
  
  if (btnFindOpponent) btnFindOpponent.disabled = true;
  if (matchmakingStatus) matchmakingStatus.style.display = 'block';
  
  // Simuler la recherche d'adversaire avec un délai
  let searchTime = 0;
  const searchInterval = setInterval(() => {
    searchTime += 1;
    
    if (matchmakingStatus) {
      const dots = '.'.repeat((searchTime % 3) + 1);
      matchmakingStatus.innerHTML = `
        <div class="loading"></div>
        <div>Recherche d'adversaire en cours${dots}</div>
      `;
    }
    
    // Trouver un adversaire après 2-5 secondes
    if (searchTime >= 2 && Math.random() > 0.5) {
      clearInterval(searchInterval);
      finishMatchmaking();
    }
    
    // Arrêter la recherche après 10 secondes maximum
    if (searchTime >= 10) {
      clearInterval(searchInterval);
      finishMatchmaking(true);
    }
  }, 1000);
  
  matchmakingInterval = searchInterval;
}

// Terminer la recherche d'adversaire
function finishMatchmaking(timeout = false) {
  const btnFindOpponent = document.getElementById('btn-find-opponent');
  const matchmakingStatus = document.getElementById('matchmaking-status');
  
  if (btnFindOpponent) btnFindOpponent.disabled = false;
  if (matchmakingStatus) matchmakingStatus.style.display = 'none';
  
  if (timeout) {
    showNotification("Aucun adversaire trouvé. Réessayez plus tard.", "warning");
    return;
  }
  
  // Filtrer les utilisateurs disponibles (exclure l'utilisateur actuel)
  const availableOpponents = globalUsers.filter(user => 
    user.uid !== getUserId()
  );
  
  if (availableOpponents.length === 0) {
    showNotification("Aucun adversaire trouvé. Réessayez plus tard.", "warning");
    return;
  }
  
  // Choisir un adversaire aléatoire
  currentOpponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
  
  // Afficher l'adversaire
  const matchOpponent = document.getElementById('match-opponent');
  const opponentInfo = document.getElementById('opponent-info');
  
  if (matchOpponent && opponentInfo) {
    opponentInfo.innerHTML = `
      <div class="leaderboard-item opponent-found">
        <div class="friend-avatar ${currentOpponent.vip ? 'vip' : ''}">
          ${currentOpponent.vip ? '👑' : '👤'}
        </div>
        <div>
          <div>${currentOpponent.displayName || 'Joueur'}</div>
          <div class="small">Niveau ${currentOpponent.level || 1} • ${currentOpponent.wins || 0} victoires</div>
        </div>
      </div>
    `;
    matchOpponent.style.display = 'block';
  }
  
  showNotification(`Adversaire trouvé: ${currentOpponent.displayName || 'Joueur'}`, "success");
}

// Jouer un match
async function playMatch() {
  if (!currentUserData || !currentOpponent) return;
  
  // Consommer de l'énergie
  const updatedEnergy = (currentUserData.energy || 0) - 5;
  await updateUserData({ energy: updatedEnergy });
  
  // Simuler un match
  const userTeamStrength = calculateTeamStrength(currentUserData);
  const opponentTeamStrength = calculateTeamStrength(currentOpponent);
  
  // Ajouter un peu d'aléatoire
  const userRandomFactor = 0.8 + Math.random() * 0.4;
  const opponentRandomFactor = 0.8 + Math.random() * 0.4;
  
  const userFinalStrength = userTeamStrength * userRandomFactor;
  const opponentFinalStrength = opponentTeamStrength * opponentRandomFactor;
  
  // Déterminer le résultat
  let userGoals = Math.floor(userFinalStrength / 20);
  let opponentGoals = Math.floor(opponentFinalStrength / 20);
  
  // Assurer au moins 0 but
  userGoals = Math.max(0, userGoals);
  opponentGoals = Math.max(0, opponentGoals);
  
  // Déterminer le gagnant
  let result = '';
  let userWon = false;
  
  if (userGoals > opponentGoals) {
    result = 'Victoire';
    userWon = true;
  } else if (userGoals < opponentGoals) {
    result = 'Défaite';
    userWon = false;
  } else {
    result = 'Match nul';
  }
  
  // Mettre à jour les statistiques
  const updatedWins = (currentUserData.wins || 0) + (userWon ? 1 : 0);
  const updatedLosses = (currentUserData.losses || 0) + (!userWon && result !== 'Match nul' ? 1 : 0);
  const updatedDraws = (currentUserData.draws || 0) + (result === 'Match nul' ? 1 : 0);
  const updatedTotalMatches = (currentUserData.totalMatches || 0) + 1;
  const updatedWinRate = Math.round((updatedWins / updatedTotalMatches) * 100);
  const updatedTotalGoals = (currentUserData.totalGoals || 0) + userGoals;
  
  // Récompenses
  let coinsReward = 50;
  let xpReward = 25;
  
  if (userWon) {
    coinsReward = 100;
    xpReward = 50;
  } else if (result === 'Match nul') {
    coinsReward = 75;
    xpReward = 35;
  }
  
  const updatedCoins = (currentUserData.coins || 0) + coinsReward;
  const updatedXp = (currentUserData.xp || 0) + xpReward;
  
  // Vérifier le niveau up
  let updatedLevel = currentUserData.level || 1;
  let updatedXpToNextLevel = currentUserData.xpToNextLevel || 100;
  
  if (updatedXp >= updatedXpToNextLevel) {
    updatedLevel += 1;
    updatedXp = updatedXp - updatedXpToNextLevel;
    updatedXpToNextLevel = Math.floor(updatedXpToNextLevel * 1.5);
    showNotification(`Félicitations! Vous êtes maintenant niveau ${updatedLevel}!`, "success");
  }
  
  // Mettre à jour l'utilisateur
  await updateUserData({
    wins: updatedWins,
    losses: updatedLosses,
    draws: updatedDraws,
    totalMatches: updatedTotalMatches,
    winRate: updatedWinRate,
    totalGoals: updatedTotalGoals,
    coins: updatedCoins,
    xp: updatedXp,
    level: updatedLevel,
    xpToNextLevel: updatedXpToNextLevel
  });
  
  // Ajouter au historique
  const matchEntry = {
    opponent: currentOpponent.displayName || 'Joueur',
    result: result,
    score: `${userGoals}-${opponentGoals}`,
    date: new Date().toISOString(),
    coins: coinsReward,
    xp: xpReward
  };
  
  matchHistory.unshift(matchEntry);
  if (matchHistory.length > 10) matchHistory = matchHistory.slice(0, 10);
  
  // Afficher le résultat
  const matchResult = document.getElementById('match-result');
  const matchResultContent = document.getElementById('match-result-content');
  
  if (matchResult && matchResultContent) {
    matchResultContent.innerHTML = `
      <div class="match-result">
        <h3>${result}</h3>
        <div class="match-score">${userGoals} - ${opponentGoals}</div>
        <div class="team-lineup">
          <div class="team">
            <div>${currentUserData.displayName || 'Vous'}</div>
            <div class="small">Force: ${Math.round(userTeamStrength)}</div>
          </div>
          <div class="vs">VS</div>
          <div class="team">
            <div>${currentOpponent.displayName || 'Adversaire'}</div>
            <div class="small">Force: ${Math.round(opponentTeamStrength)}</div>
          </div>
        </div>
        <div class="rewards">
          <div class="small">Récompenses:</div>
          <div>+${coinsReward} 🪙</div>
          <div>+${xpReward} ⭐ XP</div>
        </div>
      </div>
    `;
    matchResult.style.display = 'block';
  }
  
  // Masquer la section adversaire
  const matchOpponent = document.getElementById('match-opponent');
  if (matchOpponent) matchOpponent.style.display = 'none';
  
  // Recharger l'historique
  loadMatchHistory();
  
  showNotification(`Match terminé: ${result} ${userGoals}-${opponentGoals}`, "success");
}

// Charger l'historique des matchs
function loadMatchHistory() {
  const matchHistoryElement = document.getElementById('match-history');
  if (!matchHistoryElement) return;
  
  if (matchHistory.length === 0) {
    matchHistoryElement.innerHTML = '<div class="small">Aucun match joué</div>';
  } else {
    matchHistoryElement.innerHTML = matchHistory.map(match => `
      <div class="leaderboard-item">
        <div>
          <div>${match.opponent}</div>
          <div class="small">${match.score} • ${new Date(match.date).toLocaleDateString()}</div>
        </div>
        <div style="margin-left: auto; text-align: right;">
          <div>${match.result}</div>
          <div class="small">+${match.coins}🪙 +${match.xp}⭐</div>
        </div>
      </div>
    `).join('');
  }
}

// CORRECTION: Load team function
async function loadTeam() {
  if (!await ensureUserData()) return;
  
  const teamContent = document.getElementById('team-content');
  const subsContent = document.getElementById('subs-content');
  
  if (teamContent) {
    teamContent.innerHTML = '';
    (currentUserData.starters || []).forEach(cardId => {
      const card = currentUserData.cards?.[cardId];
      if (card) {
        const cardEl = document.createElement('div');
        cardEl.className = `card-item ${card.rarity}`;
        cardEl.innerHTML = `
          <div>
            <div class="card-title">${card.name}</div>
            <div class="small">${card.position} | ${card.nation}</div>
          </div>
          <div class="card-stats">
            <span>⚔️ ${card.attack}</span>
            <span>🛡️ ${card.defense}</span>
            <span>⚡ ${card.speed}</span>
          </div>
        `;
        teamContent.appendChild(cardEl);
      }
    });
  }
  
  if (subsContent) {
    subsContent.innerHTML = '';
    (currentUserData.subs || []).forEach(cardId => {
      const card = currentUserData.cards?.[cardId];
      if (card) {
        const cardEl = document.createElement('div');
        cardEl.className = `card-item ${card.rarity}`;
        cardEl.innerHTML = `
          <div>
            <div class="card-title">${card.name}</div>
            <div class="small">${card.position} | ${card.nation}</div>
          </div>
          <div class="card-stats">
            <span>⚔️ ${card.attack}</span>
            <span>🛡️ ${card.defense}</span>
          </div>
        `;
        subsContent.appendChild(cardEl);
      }
    });
  }
  
  // Événements pour la sélection automatique
  document.getElementById('btn-auto-best').addEventListener('click', autoSelectBestTeam);
}

// CORRECTION: Load profile function
async function loadProfile() {
  if (!await ensureUserData()) return;
  
  const profileContent = document.getElementById('profile-content');
  if (!profileContent) return;
  
  const vipStatus = currentUserData.vip ? '👑 VIP' : '👤 Standard';
  
  profileContent.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar ${currentUserData.vip ? 'vip' : ''}">
        ${currentUserData.vip ? '👑' : '👤'}
      </div>
      <h3>${currentUserData.displayName || 'Joueur'}</h3>
      <div class="badges" style="justify-content: center; margin: 8px 0;">
        <div class="badge ${currentUserData.vip ? 'vip-badge' : ''}">
          ${vipStatus}
        </div>
        <div class="badge"><i class="fas fa-heart"></i> ${currentUserData.likes || 0} Likes</div>
      </div>
    </div>
    
    <div class="stat">
      <div class="icon">👤</div>
      <div>
        <div class="small">Nom</div>
        <div>${currentUserData.displayName || 'Joueur'}</div>
      </div>
    </div>
    <div class="stat">
      <div class="icon">📧</div>
      <div>
        <div class="small">Email</div>
        <div>${currentUserData.email || 'Non défini'}</div>
      </div>
    </div>
    <div class="stat">
      <div class="icon">🏆</div>
      <div>
        <div class="small">Victoires/Défaites</div>
        <div>${currentUserData.wins || 0}V / ${currentUserData.losses || 0}D</div>
      </div>
    </div>
    <div class="stat">
      <div class="icon">📊</div>
      <div>
        <div class="small">Taux de victoire</div>
        <div>${currentUserData.winRate || 0}%</div>
      </div>
    </div>
    
    <div class="panel">
      <div class="small" style="margin-bottom: 8px;">Badges Obtenus</div>
      <div class="badges">
        ${(currentUserData.badges || []).map(badge => `
          <div class="badge"><i class="fas fa-medal"></i> ${badge}</div>
        `).join('')}
        ${(currentUserData.badges || []).length === 0 ? '<div class="small">Aucun badge</div>' : ''}
      </div>
    </div>
    
    <button id="btn-signout" class="danger small-btn" style="margin-top: 16px; width: 100%;">
      <i class="fas fa-sign-out-alt"></i> Déconnexion
    </button>
  `;
  
  // Événement de déconnexion
  document.getElementById('btn-signout')?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      showNotification("Déconnexion réussie", "success");
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
      showNotification("Erreur de déconnexion", "danger");
    }
  });
}

// Gestionnaire d'état d'authentification
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Utilisateur connecté
    currentUserData = await ensureUserProfile(user.uid, user.displayName || 'Joueur', user.email);
    const hdrUser = document.getElementById('hdr-user');
    if (hdrUser) hdrUser.textContent = currentUserData.displayName || 'Joueur';
    showScreen('dashboard');
    showNotification(`Bienvenue ${currentUserData.displayName || 'Joueur'}!`, "success");
  } else {
    // Utilisateur déconnecté
    currentUserData = null;
    showScreen('login');
    const hdrUser = document.getElementById('hdr-user');
    if (hdrUser) hdrUser.textContent = 'Non connecté';
  }
});

// CORRECTION: Initialisation complète des événements - version corrigée
document.addEventListener('DOMContentLoaded', function() {
  // Événements de connexion
  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      const email = document.getElementById('login-email')?.value;
      const password = document.getElementById('login-pass')?.value;
      
      if (!email || !password) {
        showNotification("Veuillez remplir tous les champs", "warning");
        return;
      }
      
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        console.error("Erreur de connexion:", error);
        showNotification("Erreur de connexion: " + error.message, "danger");
      }
    });
  }
  
  const btnGoRegister = document.getElementById('btn-go-register');
  if (btnGoRegister) {
    btnGoRegister.addEventListener('click', () => {
      showScreen('register');
    });
  }
  
  const btnCancelRegister = document.getElementById('btn-cancel-register');
  if (btnCancelRegister) {
    btnCancelRegister.addEventListener('click', () => {
      showScreen('login');
    });
  }
  
  const btnRegister = document.getElementById('btn-register');
  if (btnRegister) {
    btnRegister.addEventListener('click', async () => {
      const username = document.getElementById('reg-name')?.value;
      const email = document.getElementById('reg-email')?.value;
      const password = document.getElementById('reg-pass')?.value;
      
      if (!username || !email || !password) {
        showNotification("Veuillez remplir tous les champs", "warning");
        return;
      }
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, {
          displayName: username
        });
        
        await ensureUserProfile(user.uid, username, email);
      } catch (error) {
        console.error("Erreur d'inscription:", error);
        showNotification("Erreur d'inscription: " + error.message, "danger");
      }
    });
  }
  
  // Navigation dashboard
  const navTeam = document.getElementById('nav-team');
  if (navTeam) navTeam.addEventListener('click', () => showScreen('team'));
  
  const navStore = document.getElementById('nav-store');
  if (navStore) navStore.addEventListener('click', () => showScreen('store'));
  
  const navMatch = document.getElementById('nav-match');
  if (navMatch) navMatch.addEventListener('click', () => showScreen('match'));
  
  const navFriends = document.getElementById('nav-friends');
  if (navFriends) navFriends.addEventListener('click', () => showScreen('friends'));
  
  const navFusion = document.getElementById('nav-fusion');
  if (navFusion) navFusion.addEventListener('click', () => showScreen('fusion'));
  
  const navAdmin = document.getElementById('nav-admin');
  if (navAdmin) navAdmin.addEventListener('click', () => showScreen('admin'));
  
  // CORRECTION: Navigation vers les nouveaux écrans
  const navClan = document.getElementById('nav-clan');
  if (navClan) navClan.addEventListener('click', () => showScreen('clan'));
  
  const navMarket = document.getElementById('nav-market');
  if (navMarket) navMarket.addEventListener('click', () => showScreen('market'));
  
  const navBadges = document.getElementById('nav-badges');
  if (navBadges) navBadges.addEventListener('click', () => showScreen('badges'));
  
  // Boutons retour
  const teamBack = document.getElementById('team-back');
  if (teamBack) teamBack.addEventListener('click', () => showScreen('dashboard'));
  
  const matchBack = document.getElementById('match-back');
  if (matchBack) matchBack.addEventListener('click', () => showScreen('dashboard'));
  
  const storeBack = document.getElementById('store-back');
  if (storeBack) storeBack.addEventListener('click', () => showScreen('dashboard'));
  
  const profileBack = document.getElementById('profile-back');
  if (profileBack) profileBack.addEventListener('click', () => showScreen('dashboard'));
  
  const friendsBack = document.getElementById('friends-back');
  if (friendsBack) friendsBack.addEventListener('click', () => showScreen('dashboard'));
  
  const fusionBack = document.getElementById('fusion-back');
  if (fusionBack) fusionBack.addEventListener('click', () => showScreen('dashboard'));
  
  const adminBack = document.getElementById('admin-back');
  if (adminBack) adminBack.addEventListener('click', () => showScreen('dashboard'));
  
  const profileViewBack = document.getElementById('profile-view-back');
  if (profileViewBack) profileViewBack.addEventListener('click', () => showScreen('friends'));
  
  // CORRECTION: Boutons retour pour les nouveaux écrans
  const clanBack = document.getElementById('clan-back');
  if (clanBack) clanBack.addEventListener('click', () => showScreen('dashboard'));
  
  const marketBack = document.getElementById('market-back');
  if (marketBack) marketBack.addEventListener('click', () => showScreen('dashboard'));
  
  const badgesBack = document.getElementById('badges-back');
  if (badgesBack) badgesBack.addEventListener('click', () => showScreen('dashboard'));
  
  // Footer navigation
  const ftHome = document.getElementById('ft-home');
  if (ftHome) ftHome.addEventListener('click', () => showScreen('dashboard'));
  
  const ftTeam = document.getElementById('ft-team');
  if (ftTeam) ftTeam.addEventListener('click', () => showScreen('team'));
  
  const ftMatch = document.getElementById('ft-match');
  if (ftMatch) ftMatch.addEventListener('click', () => showScreen('match'));
  
  const ftStore = document.getElementById('ft-store');
  if (ftStore) ftStore.addEventListener('click', () => showScreen('store'));
  
  const ftProfile = document.getElementById('ft-profile');
  if (ftProfile) ftProfile.addEventListener('click', () => showScreen('profile'));
  
  // Boutons d'achat de packs avec pièces et gems
  document.querySelectorAll('.buy-pack').forEach(btn => {
    btn.addEventListener('click', () => {
      const packType = btn.dataset.pack;
      const cost = parseInt(btn.dataset.cost);
      const currency = btn.dataset.currency;
      buyPack(packType, cost, currency);
    });
  });
  
  // Boutons d'achat d'énergie avec pièces et gems
  document.querySelectorAll('.buy-energy').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.dataset.amount);
      const cost = parseInt(btn.dataset.cost);
      const currency = btn.dataset.currency;
      buyEnergy(amount, cost, currency);
    });
  });
  
  // CORRECTION: Bouton VIP fonctionnel
  const btnBuyVip = document.getElementById('btn-buy-vip');
  if (btnBuyVip) {
    btnBuyVip.addEventListener('click', buyVip);
  }
  
  // Bouton trouver adversaire
  const btnFindOpponent = document.getElementById('btn-find-opponent');
  if (btnFindOpponent) {
    btnFindOpponent.addEventListener('click', findOpponent);
  }
  
  // Bouton jouer match
  const btnPlayMatch = document.getElementById('btn-play-match');
  if (btnPlayMatch) {
    btnPlayMatch.addEventListener('click', playMatch);
  }
  
  // Daily reward
  const btnDailyReward = document.getElementById('btn-daily-reward');
  if (btnDailyReward) {
    btnDailyReward.addEventListener('click', () => {
      if (btnDailyReward.disabled) {
        showNotification("Récompense déjà récupérée aujourd'hui", "warning");
        return;
      }
      
      if (dailyReward) dailyReward.classList.add('active');
    });
  }
  
  const claimReward = document.getElementById('claim-reward');
  if (claimReward) {
    claimReward.addEventListener('click', async () => {
      if (!currentUserData) {
        await loadUserData();
      }
      
      if (!currentUserData) return;
      
      const updatedGems = (currentUserData.gems || 0) + 2;
      const updatedCoins = (currentUserData.coins || 0) + 200;
      const now = new Date().toISOString();
      
      await updateUserData({
        gems: updatedGems,
        coins: updatedCoins,
        lastDailyReward: now
      });
      
      if (dailyReward) dailyReward.classList.remove('active');
      showNotification("Récompense quotidienne récupérée!", "success");
      loadDashboard();
    });
  }
  
  // CORRECTION: Fusion fonctionnelle
  const btnFusion = document.getElementById('btn-fusion');
  if (btnFusion) {
    btnFusion.addEventListener('click', executeFusion);
  }
  
  // Événement pour créer un clan
  document.getElementById('btn-create-clan')?.addEventListener('click', async () => {
    const clanName = document.getElementById('clan-name')?.value;
    if (!clanName) {
      showNotification("Veuillez entrer un nom de clan", "warning");
      return;
    }
    
    const success = await createClan(clanName);
    if (success) {
      document.getElementById('clan-name').value = '';
      loadClan();
    }
  });
  
  // CORRECTION: Événements pour les boutons de sélection automatique
  document.getElementById('btn-auto-best')?.addEventListener('click', autoSelectBestTeam);
  
  // CORRECTION: Masquer le footer au chargement initial
  if (footer) footer.classList.remove('visible');
});

// CORRECTION: Script de diagnostic et réparation
function diagnoseAndFix() {
  console.log('🔍 Diagnostic des bugs...');
  
  const issues = [];
  
  // Vérifier la navigation
  const missingScreens = ['clan', 'market', 'badges'];
  missingScreens.forEach(screen => {
    if (!screens[screen]) {
      issues.push(`Écran ${screen} manquant`);
    }
  });
  
  // Vérifier les écouteurs d'événements
  const criticalButtons = [
    'btn-buy-vip', 'btn-fusion', 'btn-find-opponent',
    'btn-play-match', 'btn-daily-reward', 'btn-auto-best'
  ];
  
  criticalButtons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (!btn) {
      issues.push(`Bouton critique manquant: ${btnId}`);
    }
  });
  
  // Vérifier Firebase
  if (!auth?.currentUser && currentUserData) {
    issues.push('Incohérence des données d authentification');
  }
  
  console.log('Problèmes détectés:', issues);
  
  // Appliquer les correctifs automatiques
  if (issues.length > 0) {
    console.log('🛠️ Application des correctifs...');
    applyEmergencyFixes();
  }
  
  return issues;
}

function applyEmergencyFixes() {
  // Correction de la navigation
  const originalShowScreen = showScreen;
  showScreen = function(name) {
    originalShowScreen(name);
    
    // Charger les écrans manquants
    if (name === 'clan' && typeof loadClan === 'function') loadClan();
    if (name === 'market' && typeof loadMarket === 'function') loadMarket();
    if (name === 'badges' && typeof loadBadges === 'function') loadBadges();
  };
  
  // Réattacher les événements critiques
  setTimeout(() => {
    const vipBtn = document.getElementById('btn-buy-vip');
    if (vipBtn && !vipBtn._fixed) {
      vipBtn.addEventListener('click', buyVip);
      vipBtn._fixed = true;
    }
  }, 1000);
}

// Lancer le diagnostic au chargement
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(diagnoseAndFix, 2000);
});

// NOUVELLES FONCTIONNALITÉS AJOUTÉES

// Système de quêtes quotidiennes
async function loadDailyQuests() {
  if (!currentUserData) return;
  
  const today = new Date().toDateString();
  const lastQuestUpdate = currentUserData.lastQuestUpdate;
  
  // Réinitialiser les quêtes si c'est un nouveau jour
  if (!lastQuestUpdate || new Date(lastQuestUpdate).toDateString() !== today) {
    const dailyQuests = {
      playMatches: { target: 3, progress: 0, reward: { coins: 100, gems: 5 } },
      winMatches: { target: 2, progress: 0, reward: { coins: 150, gems: 10 } },
      openPacks: { target: 1, progress: 0, reward: { coins: 50, gems: 2 } }
    };
    
    await updateUserData({
      dailyQuests,
      lastQuestUpdate: new Date().toISOString()
    });
  }
}

// Système de tournois
async function loadTournaments() {
  if (!await ensureUserData()) return;
  
  // Vérifier s'il y a un tournoi en cours
  const tournamentsRef = ref(db, 'tournaments/active');
  const snapshot = await get(tournamentsRef);
  
  if (snapshot.exists()) {
    const tournament = snapshot.val();
    // Afficher le tournoi dans l'interface
    displayTournamentInfo(tournament);
  }
}

// Système de messagerie
async function loadMessages() {
  if (!await ensureUserData()) return;
  
  const messagesRef = ref(db, `messages/${getUserId()}`);
  const snapshot = await get(messagesRef);
  
  if (snapshot.exists()) {
    const messages = snapshot.val();
    // Afficher les messages dans l'interface
    displayMessages(messages);
  }
}

// Système d'événements spéciaux
async function checkSpecialEvents() {
  const now = new Date();
  const eventsRef = ref(db, 'events');
  const snapshot = await get(eventsRef);
  
  if (snapshot.exists()) {
    const events = snapshot.val();
    const activeEvents = Object.values(events).filter(event => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      return now >= startDate && now <= endDate;
    });
    
    if (activeEvents.length > 0) {
      displaySpecialEvents(activeEvents);
    }
  }
}

// Système de statistiques avancées
function calculateAdvancedStats() {
  if (!currentUserData) return {};
  
  const stats = {
    totalCards: Object.keys(currentUserData.cards || {}).length,
    averageCardLevel: 0,
    bestCard: null,
    collectionCompletion: 0,
    favoritePosition: '',
    favoriteNation: ''
  };
  
  // Calculer les statistiques avancées
  const cards = Object.values(currentUserData.cards || {});
  if (cards.length > 0) {
    stats.averageCardLevel = cards.reduce((sum, card) => sum + (card.level || 1), 0) / cards.length;
    stats.bestCard = cards.reduce((best, card) => {
      const cardScore = card.attack + card.defense + card.speed;
      const bestScore = best.attack + best.defense + best.speed;
      return cardScore > bestScore ? card : best;
    }, cards[0]);
    
    // Calculer la position favorite
    const positionCount = {};
    cards.forEach(card => {
      positionCount[card.position] = (positionCount[card.position] || 0) + 1;
    });
    stats.favoritePosition = Object.keys(positionCount).reduce((a, b) => 
      positionCount[a] > positionCount[b] ? a : b
    );
    
    // Calculer la nation favorite
    const nationCount = {};
    cards.forEach(card => {
      nationCount[card.nation] = (nationCount[card.nation] || 0) + 1;
    });
    stats.favoriteNation = Object.keys(nationCount).reduce((a, b) => 
      nationCount[a] > nationCount[b] ? a : b
    );
  }
  
  return stats;
}

// Système de sauvegarde automatique
function setupAutoSave() {
  setInterval(async () => {
    if (currentUserData) {
      try {
        await updateUserData({
          lastAutoSave: new Date().toISOString()
        });
        console.log('Sauvegarde automatique effectuée');
      } catch (error) {
        console.error('Erreur de sauvegarde automatique:', error);
      }
    }
  }, 60000); // Sauvegarde toutes les minutes
}

// Initialiser les systèmes supplémentaires
document.addEventListener('DOMContentLoaded', function() {
  // Démarrer la sauvegarde automatique
  setupAutoSave();
  
  // Vérifier les événements spéciaux
  setTimeout(checkSpecialEvents, 5000);
  
  // Charger les quêtes quotidiennes
  setTimeout(loadDailyQuests, 3000);
});