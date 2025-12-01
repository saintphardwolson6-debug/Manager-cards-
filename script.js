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

// Éléments UI
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
  badges: document.getElementById('screen-badges'),
  season: document.getElementById('screen-season'),
  training: document.getElementById('screen-training'),
  tactics: document.getElementById('screen-tactics')
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
let selectedTactic = 'balanced'; // Tactique par défaut

// Nouvelles variables pour les fonctionnalités
let marketPlayers = [];
let availableBadges = [];
let coaches = [];
let battlePassLevel = 1;
let seasonProgress = 0;

// Noms de cartes étendus
const extendedCardNames = [
  'Messi', 'Ronaldo', 'Neymar', 'Mbappé', 'Haaland', 'Lewandowski', 
  'De Bruyne', 'Salah', 'Mané', 'Kane', 'Benzema', 'Modric', 
  'Van Dijk', 'Kante', 'Son', 'Lukaku', 'Griezmann', 'Sterling',
  'Bellingham', 'Pedri', 'Foden', 'Musiala', 'Gavi', 'Davies',
  'Hernández', 'Alvarez', 'Martinez', 'Osimhen', 'Kvaratskhelia', 'Leao'
];

// Fonction utilitaire pour obtenir l'ID utilisateur
function getUserId() {
  return auth.currentUser ? auth.currentUser.uid : null;
}

// Fonction pour obtenir la référence de l'utilisateur
function getUserRef(uid = null) {
  const userId = uid || getUserId();
  return userId ? ref(db, `users/${userId}`) : null;
}

// Fonction pour afficher les notifications
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

// Fonction pour basculer entre les écrans
function showScreen(name) {
  Object.values(screens).forEach(s => {
    if (s) s.classList.remove('active');
  });
  
  // Gestion de la visibilité du footer
  if (name === 'login' || name === 'register') {
    if (footer) footer.classList.remove('visible');
  } else {
    if (footer) footer.classList.add('visible');
  }
  
  // Mettre à jour l'état des boutons du footer
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
  
  // Charger les données spécifiques à l'écran
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
  if (name === 'season') loadSeason();
  if (name === 'training') loadTraining();
  if (name === 'tactics') loadTactics();
  
  setTimeout(() => {
    if (screens[name]) {
      screens[name].classList.add('active');
    }
  }, 10);
}

// Fonction pour vérifier et charger les données utilisateur
async function ensureUserData() {
  if (!currentUserData) {
    await loadUserData();
  }
  return currentUserData !== null;
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

// Mettre à jour les données utilisateur
async function updateUserData(updates) {
  const userId = getUserId();
  if (!userId) return;
  
  const userRef = getUserRef();
  await update(userRef, updates);
  
  if (currentUserData) {
    currentUserData = { ...currentUserData, ...updates };
  }
}

// Créer ou récupérer le profil utilisateur
async function ensureUserProfile(uid, username, email) {
  const userRef = getUserRef(uid);
  const snapshot = await get(userRef);
  
  if (!snapshot.exists()) {
    // Générer des cartes de départ
    const cards = generateStarterCards();
    
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
      starters: ['card1', 'card2', 'card3', 'card4', 'card5'],
      subs: ['card6', 'card7', 'card8', 'card9', 'card10'],
      cards: cards,
      matchHistory: {},
      lastDailyReward: null,
      likes: 0,
      likedBy: [],
      totalMatches: 0,
      winRate: 0,
      totalGoals: 0,
      totalDefenses: 0,
      playersSold: 0,
      trainingPoints: 0,
      tactic: 'balanced',
      battlePass: {
        level: 1,
        xp: 0,
        isVIP: false,
        claimedLevels: []
      },
      season: {
        seasonNumber: 1,
        challenges: {},
        progress: 0
      }
    };
    
    await set(userRef, userData);
    return userData;
  } else {
    const data = snapshot.val();
    await update(userRef, {
      lastLogin: new Date().toISOString()
    });
    return data;
  }
}

// Générer des cartes de départ
function generateStarterCards() {
  const cards = {};
  for (let i = 1; i <= 15; i++) {
    const rarity = i <= 8 ? 'bronze' : i <= 12 ? 'silver' : i <= 14 ? 'gold' : 'legendary';
    cards[`card${i}`] = {
      id: `card${i}`,
      name: extendedCardNames[Math.floor(Math.random() * extendedCardNames.length)],
      rarity: rarity,
      attack: 5 + Math.floor(Math.random() * 20),
      defense: 3 + Math.floor(Math.random() * 18),
      speed: 1 + Math.floor(Math.random() * 12),
      level: 1,
      training: {
        attack: 0,
        defense: 0,
        speed: 0
      },
      nation: getRandomNation(),
      position: getRandomPosition()
    };
  }
  return cards;
}

// Fonctions utilitaires
function getRandomNation() {
  const nations = ['France', 'Brésil', 'Argentine', 'Espagne', 'Allemagne', 'Angleterre', 'Italie', 'Portugal', 'Pays-Bas', 'Belgique'];
  return nations[Math.floor(Math.random() * nations.length)];
}

function getRandomPosition() {
  const positions = ['ATT', 'MID', 'DEF', 'GK'];
  return positions[Math.floor(Math.random() * positions.length)];
}

// Charger tous les utilisateurs
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

// NOUVEAU: Système de saisons et Battle Pass
async function loadSeason() {
  if (!await ensureUserData()) return;
  
  const seasonPanel = document.querySelector('.season-panel');
  if (seasonPanel) {
    seasonPanel.innerHTML = `
      <div class="row" style="justify-content: space-between; align-items: center;">
        <div>
          <div class="small">Saison ${currentUserData.season?.seasonNumber || 1}</div>
          <div>Jour <span id="season-day">12</span>/42</div>
        </div>
        <div class="season-badge">EN COURS</div>
      </div>
      <div class="progress-container" style="margin-top: 12px;">
        <div class="progress-bar" id="season-progress" style="width: ${(currentUserData.season?.progress || 0)}%;"></div>
      </div>
      <div class="row" style="margin-top: 12px; justify-content: space-between;">
        <button id="nav-season" class="ghost small-btn"><i class="fas fa-calendar-alt"></i> Battle Pass</button>
        <button id="nav-events" class="ghost small-btn"><i class="fas fa-star"></i> Événements</button>
      </div>
    `;
  }
  
  // Charger la page de Battle Pass
  const battlePassLevel = currentUserData.battlePass?.level || 1;
  const battlePassXP = currentUserData.battlePass?.xp || 0;
  const isVIP = currentUserData.battlePass?.isVIP || false;
  
  document.getElementById('battle-pass-level').textContent = battlePassLevel;
  document.getElementById('battle-pass-progress').style.width = `${(battlePassXP % 100)}%`;
  
  // Mettre à jour les récompenses
  const rewards = document.querySelectorAll('.season-reward');
  rewards.forEach(reward => {
    const level = parseInt(reward.querySelector('.reward-level').textContent.split(' ')[1]);
    if (level <= battlePassLevel) {
      reward.classList.add('unlocked');
    }
  });
}

// NOUVEAU: Système d'entraînement
async function loadTraining() {
  if (!await ensureUserData()) return;
  
  // Charger les joueurs dans le select
  const trainingSelect = document.getElementById('training-player');
  trainingSelect.innerHTML = '<option value="">Choisir un joueur</option>';
  
  Object.values(currentUserData.cards || {}).forEach(card => {
    const option = document.createElement('option');
    option.value = card.id;
    option.textContent = `${card.name} (${card.rarity}) - ⚔️${card.attack} 🛡️${card.defense} ⚡${card.speed}`;
    trainingSelect.appendChild(option);
  });
  
  // Événement pour sélectionner un joueur
  trainingSelect.addEventListener('change', function() {
    const cardId = this.value;
    const trainingInfo = document.getElementById('training-info');
    
    if (!cardId) {
      trainingInfo.style.display = 'none';
      return;
    }
    
    const card = currentUserData.cards[cardId];
    if (!card) return;
    
    trainingInfo.style.display = 'block';
    document.getElementById('training-attack').textContent = card.attack + (card.training?.attack || 0);
    document.getElementById('training-defense').textContent = card.defense + (card.training?.defense || 0);
    document.getElementById('training-speed').textContent = card.speed + (card.training?.speed || 0);
    
    // Mettre à jour les boutons d'entraînement
    document.querySelectorAll('.train-btn').forEach(btn => {
      btn.onclick = () => trainPlayer(cardId, btn.dataset.stat);
    });
  });
  
  // Charger les entraîneurs
  await loadCoaches();
}

// NOUVEAU: Charger les entraîneurs
async function loadCoaches() {
  // Entraîneurs par défaut
  coaches = [
    { id: 'coach1', name: 'Ancelotti', specialty: 'attaque', bonus: 10, cost: 1000 },
    { id: 'coach2', name: 'Guardiola', specialty: 'tactique', bonus: 15, cost: 1500 },
    { id: 'coach3', name: 'Klopp', specialty: 'vitesse', bonus: 12, cost: 1200 }
  ];
  
  const coachesList = document.getElementById('coaches-list');
  if (coachesList) {
    coachesList.innerHTML = '';
    coaches.forEach(coach => {
      const coachEl = document.createElement('div');
      coachEl.className = 'card-item';
      coachEl.innerHTML = `
        <div>
          <div class="card-title">${coach.name}</div>
          <div class="small">Spécialité: ${coach.specialty}</div>
          <div class="small">Bonus: +${coach.bonus}%</div>
        </div>
        <button class="small-btn hire-coach" data-coach="${coach.id}">
          <i class="fas fa-user-plus"></i> ${coach.cost}🪙
        </button>
      `;
      coachesList.appendChild(coachEl);
    });
    
    // Événements pour embaucher des entraîneurs
    document.querySelectorAll('.hire-coach').forEach(btn => {
      btn.addEventListener('click', async function() {
        const coachId = this.dataset.coach;
        const coach = coaches.find(c => c.id === coachId);
        
        if (!coach) return;
        
        if ((currentUserData.coins || 0) < coach.cost) {
          showNotification(`Pas assez de pièces (${coach.cost} requis)`, 'warning');
          return;
        }
        
        // Appliquer le bonus de l'entraîneur
        const updatedCoins = (currentUserData.coins || 0) - coach.cost;
        await updateUserData({
          coins: updatedCoins,
          activeCoach: coachId,
          coachBonus: coach.bonus
        });
        
        showNotification(`${coach.name} embauché! Bonus de ${coach.bonus}% appliqué.`, 'success');
        loadTraining();
      });
    });
  }
}

// NOUVEAU: Entraîner un joueur
async function trainPlayer(cardId, stat) {
  if (!currentUserData) return;
  
  const trainingCost = 100;
  if ((currentUserData.coins || 0) < trainingCost) {
    showNotification(`Pas assez de pièces (${trainingCost} requis)`, 'warning');
    return;
  }
  
  const card = currentUserData.cards[cardId];
  if (!card) return;
  
  // Appliquer le bonus de l'entraîneur si présent
  const coachBonus = currentUserData.coachBonus || 0;
  const bonusMultiplier = 1 + (coachBonus / 100);
  
  // Mettre à jour la statistique
  const updatedCards = { ...currentUserData.cards };
  const trainingPoints = (card.training?.[stat] || 0) + Math.floor(5 * bonusMultiplier);
  
  updatedCards[cardId] = {
    ...card,
    training: {
      ...(card.training || {}),
      [stat]: trainingPoints
    }
  };
  
  const updatedCoins = (currentUserData.coins || 0) - trainingCost;
  
  await updateUserData({
    coins: updatedCoins,
    cards: updatedCards,
    trainingPoints: (currentUserData.trainingPoints || 0) + 1
  });
  
  showNotification(`${card.name} entraîné! +${Math.floor(5 * bonusMultiplier)} ${stat}.`, 'success');
  loadTraining();
}

// NOUVEAU: Système de tactiques
async function loadTactics() {
  if (!await ensureUserData()) return;
  
  // Mettre à jour la tactique sélectionnée
  const tacticCards = document.querySelectorAll('.tactic-card');
  tacticCards.forEach(card => {
    const tactic = card.dataset.tactic;
    card.classList.remove('active');
    if (tactic === (currentUserData.tactic || 'balanced')) {
      card.classList.add('active');
      selectedTactic = tactic;
    }
    
    card.addEventListener('click', async function() {
      const newTactic = this.dataset.tactic;
      selectedTactic = newTactic;
      
      tacticCards.forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      
      await updateUserData({
        tactic: newTactic
      });
      
      showNotification(`Tactique changée: ${newTactic}`, 'success');
    });
  });
}

// NOUVEAU: Calcul de la force d'équipe avec tactiques
function calculateTeamStrengthWithTactics(userData) {
  if (!userData?.cards || !userData?.starters) return { strength: 0, bonus: 0 };
  
  let totalStrength = 0;
  let positionCount = { ATT: 0, MID: 0, DEF: 0, GK: 0 };
  
  userData.starters.forEach(cardId => {
    const card = userData.cards[cardId];
    if (card) {
      let cardStrength = card.attack + card.defense + card.speed;
      
      // Ajouter l'entraînement
      if (card.training) {
        cardStrength += (card.training.attack || 0) + (card.training.defense || 0) + (card.training.speed || 0);
      }
      
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
  
  // Bonus d'équilibre
  const hasAllPositions = positionCount.ATT > 0 && positionCount.MID > 0 && 
                         positionCount.DEF > 0 && positionCount.GK > 0;
  if (hasAllPositions) totalStrength *= 1.1;
  
  // Appliquer la tactique
  let tacticBonus = 0;
  const tactic = userData.tactic || 'balanced';
  
  if (tactic === 'offensive') {
    tacticBonus = 15;
    totalStrength *= 1.15; // +15% attaque
    totalStrength *= 0.90; // -10% défense
  } else if (tactic === 'defensive') {
    tacticBonus = 15;
    totalStrength *= 0.90; // -10% attaque
    totalStrength *= 1.15; // +15% défense
  }
  
  return {
    strength: Math.round(totalStrength),
    bonus: tacticBonus
  };
}

// Système de récompense quotidienne amélioré
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
      btnDailyReward.disabled = true;
      const hoursLeft = Math.floor(24 - hoursDiff);
      rewardTimer.textContent = `Prochaine récompense dans ${hoursLeft}h`;
    } else {
      btnDailyReward.disabled = false;
      rewardTimer.textContent = "Récompense disponible!";
    }
  } else {
    btnDailyReward.disabled = false;
    rewardTimer.textContent = "Récompense disponible!";
  }
}

// NOUVEAU: Système de clans amélioré
async function loadClan() {
  if (!await ensureUserData()) return;
  
  await loadAllUsers();
  await loadClans();
  
  const userClan = document.getElementById('user-clan');
  const clansList = document.getElementById('clans-list');
  
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
  
  // Événements pour les boutons de clan
  document.querySelectorAll('.join-clan').forEach(btn => {
    btn.addEventListener('click', async function() {
      const clanId = this.getAttribute('data-clan');
      const clan = clans.find(c => c.id === clanId);
      
      if (clan && clan.members.length < 10) {
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

// Charger les clans
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

// Créer un clan
async function createClan(name) {
  if (!currentUserData) return false;
  
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
  
  await updateUserData({
    coins: (currentUserData.coins || 0) - 5000
  });
  
  showNotification(`Clan ${name} créé avec succès!`, "success");
  return true;
}

// NOUVEAU: Système de marché
async function loadMarket() {
  if (!await ensureUserData()) return;
  
  await loadAllUsers();
  await loadMarketPlayers();
  
  const sellPlayer = document.getElementById('sell-player');
  const upgradePlayer = document.getElementById('upgrade-player');
  const marketPlayersEl = document.getElementById('market-players');
  
  if (sellPlayer) {
    const userCards = Object.values(currentUserData.cards || {});
    sellPlayer.innerHTML = `
      <div class="small">Sélectionnez un joueur à vendre</div>
      <select id="player-to-sell" style="width: 100%; margin: 8px 0;">
        <option value="">Choisir un joueur</option>
        ${userCards.map(card => `
          <option value="${card.id}" data-rarity="${card.rarity}">${card.name} (${card.rarity})</option>
        `).join('')}
      </select>
      <div class="row">
        <input type="number" id="sell-price" placeholder="Prix en pièces" min="100" style="flex: 1;"/>
        <button class="small-btn" id="btn-sell-player">Vendre</button>
      </div>
    `;
    
    document.getElementById('btn-sell-player').addEventListener('click', sellPlayerOnMarket);
  }
  
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
    
    document.querySelectorAll('.buy-player-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const playerId = this.getAttribute('data-player');
        const player = marketPlayers.find(p => p.id === playerId);
        
        if (!player) return;
        
        if ((currentUserData.coins || 0) < player.price) {
          showNotification("Pas assez de pièces pour acheter ce joueur", "warning");
          return;
        }
        
        const userCardsCount = Object.keys(currentUserData.cards || {}).length;
        if (userCardsCount >= playerCollectionLimit) {
          showNotification(`Limite de collection atteinte (${playerCollectionLimit} joueurs maximum)`, "warning");
          return;
        }
        
        await buyPlayerFromMarket(player);
      });
    });
  }
}

// Vendre un joueur
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
  
  if ((currentUserData.starters || []).includes(playerId)) {
    showNotification("Impossible de vendre un joueur de l'équipe de départ", "warning");
    return;
  }
  
  const updatedCards = { ...currentUserData.cards };
  delete updatedCards[playerId];
  
  const updatedSubs = (currentUserData.subs || []).filter(id => id !== playerId);
  
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
  
  await updateUserData({
    cards: updatedCards,
    subs: updatedSubs,
    playersSold: (currentUserData.playersSold || 0) + 1
  });
  
  showNotification(`${player.name} mis en vente pour ${price} pièces!`, "success");
  loadMarket();
}

// Acheter un joueur
async function buyPlayerFromMarket(player) {
  const updatedCoins = (currentUserData.coins || 0) - player.price;
  
  const playerId = 'card' + Date.now();
  const updatedCards = {
    ...currentUserData.cards,
    [playerId]: {
      ...player,
      id: playerId
    }
  };
  
  const updatedSubs = [...(currentUserData.subs || []), playerId];
  
  const sellerRef = getUserRef(player.sellerId);
  const sellerSnapshot = await get(sellerRef);
  
  if (sellerSnapshot.exists()) {
    const sellerData = sellerSnapshot.val();
    const sellerRevenue = Math.floor(player.price * 0.9);
    
    await update(sellerRef, {
      coins: (sellerData.coins || 0) + sellerRevenue
    });
  }
  
  const marketRef = ref(db, `market/${player.id}`);
  await remove(marketRef);
  
  await updateUserData({
    coins: updatedCoins,
    cards: updatedCards,
    subs: updatedSubs
  });
  
  showNotification(`${player.name} acheté pour ${player.price} pièces!`, "success");
  loadMarket();
}

// Charger les joueurs du marché
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

// NOUVEAU: Système de badges
async function loadBadges() {
  if (!await ensureUserData()) return;
  
  await loadAvailableBadges();
  
  const userBadges = document.getElementById('user-badges');
  const availableBadgesEl = document.getElementById('available-badges');
  
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

// Charger les badges disponibles
async function loadAvailableBadges() {
  availableBadges = [
    { name: "Débutant", icon: "🎯", description: "Compléter le tutoriel" },
    { name: "Collectionneur", icon: "📚", description: "Collectionner 20 joueurs" },
    { name: "Vainqueur", icon: "🏆", description: "Gagner 10 matchs" },
    { name: "Élite", icon: "⭐", description: "Atteindre le niveau 10" },
    { name: "Légende", icon: "👑", description: "Atteindre le niveau 25" },
    { name: "Marchand", icon: "💰", description: "Vendre 5 joueurs" },
    { name: "Stratège", icon: "♟️", description: "Gagner 5 matchs consécutifs" },
    { name: "Social", icon: "👥", description: "Avoir 10 amis" },
    { name: "Entraîneur", icon: "🏋️", description: "Entraîner 10 fois" }
  ];
  
  return availableBadges;
}

// Vérifier et attribuer les badges
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
  
  // Badge Entraîneur
  if (!userBadges.includes("Entraîneur") && (currentUserData.trainingPoints || 0) >= 10) {
    newBadges.push("Entraîneur");
  }
  
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

// NOUVEAU: Système VIP
async function buyVip() {
  if (!currentUserData) return;
  
  const vipCost = 2000;
  
  if ((currentUserData.gems || 0) < vipCost) {
    showNotification(`Pas assez de gems pour acheter VIP (${vipCost} gems requis)`, "warning");
    return;
  }
  
  const now = new Date();
  const vipExpiration = currentUserData.vipExpiration ? new Date(currentUserData.vipExpiration) : null;
  
  if (vipExpiration && vipExpiration > now) {
    showNotification("Vous avez déjà un abonnement VIP actif", "warning");
    return;
  }
  
  const newExpiration = new Date();
  newExpiration.setDate(newExpiration.getDate() + 30);
  
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
    maxEnergy: 30
  });
  
  showNotification("Abonnement VIP activé pour 30 jours! 👑", "success");
  loadDashboard();
}

// Vérifier l'expiration du VIP
function checkVipExpiration() {
  if (!currentUserData || !currentUserData.vip) return;
  
  const now = new Date();
  const vipExpiration = new Date(currentUserData.vipExpiration);
  
  if (vipExpiration < now) {
    updateUserData({
      vip: false,
      maxEnergy: 20
    });
    showNotification("Votre abonnement VIP a expiré", "info");
  }
}

// Afficher le statut VIP
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

// Charger le dashboard
async function loadDashboard() {
  if (!await ensureUserData()) return;
  
  checkVipExpiration();
  
  const dashGems = document.getElementById('dash-gems');
  const dashCoins = document.getElementById('dash-coins');
  const dashEnergy = document.getElementById('dash-energy');
  const dashLevel = document.getElementById('dash-level');
  const hdrUser = document.getElementById('hdr-user');
  
  if (dashGems) dashGems.textContent = currentUserData.gems || 0;
  if (dashCoins) dashCoins.textContent = currentUserData.coins || 0;
  if (dashEnergy) dashEnergy.textContent = `${currentUserData.energy || 0}/${currentUserData.maxEnergy || 20}`;
  if (dashLevel) dashLevel.textContent = currentUserData.level || 1;
  if (hdrUser) hdrUser.textContent = currentUserData.displayName || 'Joueur';
  
  checkDailyReward();
  
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
  
  await loadAllUsers();
  
  // Charger le classement avec likes
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
    
    document.querySelectorAll('.like-btn-leaderboard').forEach(btn => {
      btn.addEventListener('click', function() {
        const userId = this.getAttribute('data-user');
        likeUserFromLeaderboard(userId);
      });
    });
  }
  
  await checkAndAwardBadges();
}

// Système de likes dans le classement
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
      updatedLikes = Math.max(0, updatedLikes - 1);
      updatedLikedBy = updatedLikedBy.filter(uid => uid !== getUserId());
      showNotification("Like retiré", "info");
    } else {
      updatedLikes += 1;
      updatedLikedBy.push(getUserId());
      showNotification("Joueur liké! 💖", "success");
    }
    
    await update(userRef, {
      likes: updatedLikes,
      likedBy: updatedLikedBy
    });
    
    loadDashboard();
  }
}

// Charger l'équipe
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
            <span>⚔️ ${card.attack + (card.training?.attack || 0)}</span>
            <span>🛡️ ${card.defense + (card.training?.defense || 0)}</span>
            <span>⚡ ${card.speed + (card.training?.speed || 0)}</span>
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
  
  document.getElementById('btn-auto-best').addEventListener('click', autoSelectBestTeam);
}

// Sélection automatique de la meilleure équipe
function autoSelectBestTeam() {
  if (!currentUserData || !currentUserData.cards) return;
  
  const sortedCards = Object.values(currentUserData.cards)
    .sort((a, b) => {
      const scoreA = a.attack + a.defense + a.speed;
      const scoreB = b.attack + b.defense + b.speed;
      return scoreB - scoreA;
    });
  
  const bestCards = sortedCards.slice(0, 5);
  const bestCardIds = bestCards.map(card => card.id);
  
  updateUserData({
    starters: bestCardIds
  });
  
  showNotification("Équipe optimisée automatiquement!", "success");
  loadTeam();
}

// NOUVEAU: Charger les matchs
async function loadMatch() {
  if (!await ensureUserData()) return;
  
  await loadAllUsers();
  
  const matchOpponent = document.getElementById('match-opponent');
  const matchResult = document.getElementById('match-result');
  
  if (matchOpponent) matchOpponent.style.display = 'none';
  if (matchResult) matchResult.style.display = 'none';
  
  loadMatchHistory();
}

// Trouver un adversaire
async function findOpponent() {
  if (!await ensureUserData()) return;
  
  if ((currentUserData.energy || 0) < 5) {
    showNotification("Pas assez d'énergie! Achetez-en ou attendez.", "warning");
    return;
  }
  
  const btnFindOpponent = document.getElementById('btn-find-opponent');
  const matchmakingStatus = document.getElementById('matchmaking-status');
  
  if (btnFindOpponent) btnFindOpponent.disabled = true;
  if (matchmakingStatus) matchmakingStatus.style.display = 'block';
  
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
    
    if (searchTime >= 2 && Math.random() > 0.5) {
      clearInterval(searchInterval);
      finishMatchmaking();
    }
    
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
  
  const availableOpponents = globalUsers.filter(user => 
    user.uid !== getUserId()
  );
  
  if (availableOpponents.length === 0) {
    showNotification("Aucun adversaire trouvé. Réessayez plus tard.", "warning");
    return;
  }
  
  currentOpponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
  
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
  
  const updatedEnergy = (currentUserData.energy || 0) - 5;
  await updateUserData({ energy: updatedEnergy });
  
  // Calculer la force avec tactiques
  const userStrength = calculateTeamStrengthWithTactics(currentUserData).strength;
  const opponentStrength = calculateTeamStrengthWithTactics(currentOpponent).strength;
  
  const userRandomFactor = 0.8 + Math.random() * 0.4;
  const opponentRandomFactor = 0.8 + Math.random() * 0.4;
  
  const userFinalStrength = userStrength * userRandomFactor;
  const opponentFinalStrength = opponentStrength * opponentRandomFactor;
  
  let userGoals = Math.floor(userFinalStrength / 20);
  let opponentGoals = Math.floor(opponentFinalStrength / 20);
  
  userGoals = Math.max(0, userGoals);
  opponentGoals = Math.max(0, opponentGoals);
  
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
  
  const updatedWins = (currentUserData.wins || 0) + (userWon ? 1 : 0);
  const updatedLosses = (currentUserData.losses || 0) + (!userWon && result !== 'Match nul' ? 1 : 0);
  const updatedDraws = (currentUserData.draws || 0) + (result === 'Match nul' ? 1 : 0);
  const updatedTotalMatches = (currentUserData.totalMatches || 0) + 1;
  const updatedWinRate = Math.round((updatedWins / updatedTotalMatches) * 100);
  const updatedTotalGoals = (currentUserData.totalGoals || 0) + userGoals;
  
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
  
  let updatedLevel = currentUserData.level || 1;
  let updatedXpToNextLevel = currentUserData.xpToNextLevel || 100;
  
  if (updatedXp >= updatedXpToNextLevel) {
    updatedLevel += 1;
    updatedXp = updatedXp - updatedXpToNextLevel;
    updatedXpToNextLevel = Math.floor(updatedXpToNextLevel * 1.5);
    showNotification(`Félicitations! Vous êtes maintenant niveau ${updatedLevel}!`, "success");
  }
  
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
            <div class="small">Force: ${Math.round(userStrength)}</div>
          </div>
          <div class="vs">VS</div>
          <div class="team">
            <div>${currentOpponent.displayName || 'Adversaire'}</div>
            <div class="small">Force: ${Math.round(opponentStrength)}</div>
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
  
  const matchOpponent = document.getElementById('match-opponent');
  if (matchOpponent) matchOpponent.style.display = 'none';
  
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

// Charger la boutique
async function loadStore() {
  if (!await ensureUserData()) return;
  
  displayVipStatus();
}

// Acheter des packs
async function buyPack(packType, cost, currency) {
  if (!await ensureUserData()) return;
  
  if ((currentUserData[currency] || 0) < cost) {
    showNotification(`Pas assez de ${currency === 'gems' ? 'Gems' : 'Pièces'}!`, "warning");
    return;
  }
  
  const updatedCurrency = (currentUserData[currency] || 0) - cost;
  
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
      training: {
        attack: 0,
        defense: 0,
        speed: 0
      },
      nation: getRandomNation(),
      position: getRandomPosition()
    };
  }
  
  const updatedCards = { ...currentUserData.cards, ...newCards };
  const updatedSubs = [...(currentUserData.subs || [])];
  
  Object.keys(newCards).forEach(cardId => {
    if (updatedSubs.length < 10) {
      updatedSubs.push(cardId);
    }
  });
  
  showNotification(`Pack ${packType} acheté! ${cardCount} nouvelles cartes ajoutées.`, "success");
  
  const updates = {
    cards: updatedCards,
    subs: updatedSubs
  };
  updates[currency] = updatedCurrency;
  
  await updateUserData(updates);
  loadDashboard();
}

// Acheter de l'énergie
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

// Charger le profil
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

// NOUVEAU: Initialisation complète des événements
document.addEventListener('DOMContentLoaded', function() {
  // Événements de connexion
  document.getElementById('btn-login')?.addEventListener('click', async () => {
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
  
  document.getElementById('btn-go-register')?.addEventListener('click', () => {
    showScreen('register');
  });
  
  document.getElementById('btn-cancel-register')?.addEventListener('click', () => {
    showScreen('login');
  });
  
  document.getElementById('btn-register')?.addEventListener('click', async () => {
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
  
  // Navigation dashboard
  const navButtons = {
    'nav-team': 'team',
    'nav-store': 'store',
    'nav-match': 'match',
    'nav-friends': 'friends',
    'nav-fusion': 'fusion',
    'nav-admin': 'admin',
    'nav-clan': 'clan',
    'nav-market': 'market',
    'nav-badges': 'badges',
    'nav-season': 'season',
    'nav-training': 'training',
    'nav-tactics': 'tactics',
    'nav-events': 'match'
  };
  
  Object.entries(navButtons).forEach(([buttonId, screenName]) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', () => showScreen(screenName));
    }
  });
  
  // Boutons retour
  const backButtons = {
    'team-back': 'dashboard',
    'match-back': 'dashboard',
    'store-back': 'dashboard',
    'profile-back': 'dashboard',
    'friends-back': 'dashboard',
    'fusion-back': 'dashboard',
    'admin-back': 'dashboard',
    'profile-view-back': 'friends',
    'clan-back': 'dashboard',
    'market-back': 'dashboard',
    'badges-back': 'dashboard',
    'season-back': 'dashboard',
    'training-back': 'dashboard',
    'tactics-back': 'team'
  };
  
  Object.entries(backButtons).forEach(([buttonId, screenName]) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', () => showScreen(screenName));
    }
  });
  
  // Footer navigation
  const footerButtons = {
    'ft-home': 'dashboard',
    'ft-team': 'team',
    'ft-match': 'match',
    'ft-store': 'store',
    'ft-profile': 'profile'
  };
  
  Object.entries(footerButtons).forEach(([buttonId, screenName]) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', () => showScreen(screenName));
    }
  });
  
  // Boutons d'achat
  document.querySelectorAll('.buy-pack').forEach(btn => {
    btn.addEventListener('click', () => {
      const packType = btn.dataset.pack;
      const cost = parseInt(btn.dataset.cost);
      const currency = btn.dataset.currency;
      buyPack(packType, cost, currency);
    });
  });
  
  document.querySelectorAll('.buy-energy').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.dataset.amount);
      const cost = parseInt(btn.dataset.cost);
      const currency = btn.dataset.currency;
      buyEnergy(amount, cost, currency);
    });
  });
  
  // Bouton VIP
  document.getElementById('btn-buy-vip')?.addEventListener('click', buyVip);
  
  // Boutons de match
  document.getElementById('btn-find-opponent')?.addEventListener('click', findOpponent);
  document.getElementById('btn-play-match')?.addEventListener('click', playMatch);
  document.getElementById('btn-join-tournament')?.addEventListener('click', () => {
    showNotification("Tournoi rejoint! Le tournoi commencera bientôt.", "success");
  });
  
  // Récompense quotidienne
  document.getElementById('btn-daily-reward')?.addEventListener('click', () => {
    if (document.getElementById('btn-daily-reward').disabled) {
      showNotification("Récompense déjà récupérée aujourd'hui", "warning");
      return;
    }
    
    if (dailyReward) dailyReward.classList.add('active');
  });
  
  document.getElementById('claim-reward')?.addEventListener('click', async () => {
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
  
  // Fusion
  document.getElementById('btn-fusion')?.addEventListener('click', executeFusion);
  
  // Créer un clan
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
  
  // Tournoi
  document.getElementById('btn-join-war')?.addEventListener('click', () => {
    showNotification("Participation enregistrée pour la prochaine guerre de clans!", "success");
  });
  
  // Battle Pass
  document.getElementById('btn-upgrade-pass')?.addEventListener('click', async () => {
    if (!currentUserData) return;
    
    const vipCost = 500;
    if ((currentUserData.gems || 0) < vipCost) {
      showNotification(`Pas assez de gems (${vipCost} requis)`, "warning");
      return;
    }
    
    const updatedGems = (currentUserData.gems || 0) - vipCost;
    await updateUserData({
      gems: updatedGems,
      battlePass: {
        ...(currentUserData.battlePass || {}),
        isVIP: true
      }
    });
    
    showNotification("Battle Pass VIP activé!", "success");
    loadSeason();
  });
  
  // Masquer le footer au chargement initial
  if (footer) footer.classList.remove('visible');
});

// Gestionnaire d'état d'authentification
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserData = await ensureUserProfile(user.uid, user.displayName || 'Joueur', user.email);
    const hdrUser = document.getElementById('hdr-user');
    if (hdrUser) hdrUser.textContent = currentUserData.displayName || 'Joueur';
    showScreen('dashboard');
    showNotification(`Bienvenue ${currentUserData.displayName || 'Joueur'}!`, "success");
  } else {
    currentUserData = null;
    showScreen('login');
    const hdrUser = document.getElementById('hdr-user');
    if (hdrUser) hdrUser.textContent = 'Non connecté';
  }
});

// NOUVEAU: Fusion améliorée
async function loadFusion() {
  if (!await ensureUserData()) return;
  
  const fusionCards = document.getElementById('fusion-cards');
  if (!fusionCards) return;
  
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
  
  selectedCardsForFusion = [];
  document.querySelectorAll('.fusion-slot').forEach(slot => {
    slot.innerHTML = '<div class="small">Emplacement vide</div>';
    slot.classList.remove('filled');
  });
  
  document.getElementById('btn-fusion').disabled = true;
  document.getElementById('fusion-result').style.display = 'none';
  
  document.querySelectorAll('.fusion-card').forEach(cardEl => {
    cardEl.addEventListener('click', function() {
      const cardId = this.getAttribute('data-card');
      
      if (selectedCardsForFusion.includes(cardId)) {
        const index = selectedCardsForFusion.indexOf(cardId);
        selectedCardsForFusion.splice(index, 1);
        this.classList.remove('fusion-selected');
        updateFusionSlot(index, null);
      } else if (selectedCardsForFusion.length < 3) {
        selectedCardsForFusion.push(cardId);
        this.classList.add('fusion-selected');
        updateFusionSlot(selectedCardsForFusion.length - 1, cardId);
      }
      
      updateFusionButton();
    });
  });
}

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

async function executeFusion() {
  if (selectedCardsForFusion.length !== 3) return;
  
  if ((currentUserData.coins || 0) < 100) {
    showNotification("Pas assez de pièces pour la fusion! (100 pièces requises)", "warning");
    return;
  }
  
  const cards = selectedCardsForFusion.map(id => currentUserData.cards[id]);
  const totalAttack = cards.reduce((sum, card) => sum + card.attack, 0);
  const totalDefense = cards.reduce((sum, card) => sum + card.defense, 0);
  const totalSpeed = cards.reduce((sum, card) => sum + card.speed, 0);
  
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
  
  const newCardId = 'card' + Date.now();
  const newCard = {
    id: newCardId,
    name: `Fusion ${extendedCardNames[Math.floor(Math.random() * extendedCardNames.length)]}`,
    rarity: newRarity,
    attack: Math.floor(totalAttack / 3) + 5,
    defense: Math.floor(totalDefense / 3) + 3,
    speed: Math.floor(totalSpeed / 3) + 2,
    level: 1,
    training: {
      attack: 0,
      defense: 0,
      speed: 0
    },
    nation: getRandomNation(),
    position: getRandomPosition()
  };
  
  const updatedCards = { ...currentUserData.cards };
  
  selectedCardsForFusion.forEach(cardId => {
    delete updatedCards[cardId];
  });
  
  updatedCards[newCardId] = newCard;
  
  const updatedSubs = [...(currentUserData.subs || [])];
  updatedSubs.push(newCardId);
  
  const updatedCoins = (currentUserData.coins || 0) - 100;
  
  await updateUserData({
    cards: updatedCards,
    subs: updatedSubs,
    coins: updatedCoins
  });
  
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
  
  setTimeout(() => {
    loadFusion();
  }, 3000);
}

// NOUVEAU: Vue de profil
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
  
  if (!isOwnProfile) {
    document.getElementById('btn-like-profile')?.addEventListener('click', likeUserProfile);
    document.getElementById('btn-challenge-user')?.addEventListener('click', () => {
      showNotification(`Défi envoyé à ${currentlyViewedUser.displayName || 'Joueur'}!`, "info");
    });
  }
}

async function likeUserProfile() {
  if (!currentlyViewedUser || !currentUserData) return;
  
  const viewedUserRef = getUserRef(currentlyViewedUser.uid);
  const currentUserId = getUserId();
  
  const hasLiked = currentUserData.likedBy?.includes(currentlyViewedUser.uid);
  let updatedLikes = currentlyViewedUser.likes || 0;
  let updatedLikedBy = [...(currentUserData.likedBy || [])];
  
  if (hasLiked) {
    updatedLikes = Math.max(0, updatedLikes - 1);
    updatedLikedBy = updatedLikedBy.filter(uid => uid !== currentlyViewedUser.uid);
    showNotification("Like retiré", "info");
  } else {
    updatedLikes += 1;
    updatedLikedBy.push(currentlyViewedUser.uid);
    showNotification("Profil liké! 💖", "success");
  }
  
  await update(viewedUserRef, {
    likes: updatedLikes
  });
  
  await updateUserData({
    likedBy: updatedLikedBy
  });
  
  currentlyViewedUser.likes = updatedLikes;
  loadProfileView();
}

// NOUVEAU: Amis
async function loadFriends() {
  if (!await ensureUserData()) return;
  
  await loadAllUsers();
  
  const friendsList = document.getElementById('friends-list');
  const friendRequests = document.getElementById('friend-requests');
  const suggestedFriends = document.getElementById('suggested-friends');
  
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
  
  // Événements pour les amis
  document.querySelectorAll('.add-friend').forEach(btn => {
    btn.addEventListener('click', async function() {
      const userId = this.getAttribute('data-user');
      if (!userId) return;
      
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
      
      const currentFriends = [...(currentUserData.friends || []), userId];
      const updatedRequests = (currentUserData.friendRequests || []).filter(id => id !== userId);
      
      await updateUserData({
        friends: currentFriends,
        friendRequests: updatedRequests
      });
      
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

// NOUVEAU: Dashboard admin
async function loadAdminDashboard() {
  if (!isAdmin) {
    showNotification("Accès refusé", "danger");
    showScreen('dashboard');
    return;
  }
  
  await loadAllUsers();
  
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
  
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(`admin-${tabId}-section`).classList.add('active');
    });
  });
  
  // Actions admin
  document.getElementById('admin-send-notif')?.addEventListener('click', function() {
    const message = document.getElementById('admin-notif-message')?.value;
    if (!message) {
      showNotification("Veuillez entrer un message", "warning");
      return;
    }
    
    showNotification("Notification envoyée à tous les utilisateurs", "success");
  });
  
  document.getElementById('admin-add-gems')?.addEventListener('click', async function() {
    for (const user of globalUsers) {
      const userRef = getUserRef(user.uid);
      await update(userRef, {
        gems: (user.gems || 0) + 10
      });
    }
    
    showNotification("10 gems ajoutés à tous les utilisateurs", "success");
    loadAdminDashboard();
  });
}

// Corriger la navigation sur mobile
function fixMobileNavigation() {
  // Forcer la visibilité du footer sur mobile
  if (footer) {
    footer.classList.add('visible');
    footer.style.display = 'flex';
  }
  
  // Assurer que les boutons sont cliquables
  document.querySelectorAll('button').forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.style.minHeight = '44px'; // Taille minimum pour mobile
  });
}

// Lancer les correctifs au chargement
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(fixMobileNavigation, 1000);
});