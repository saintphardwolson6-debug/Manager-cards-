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
  orderByValue,
  onChildAdded,
  off
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
  badges: document.getElementById('screen-badges'),
  events: document.getElementById('screen-events')
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

// NOUVELLES VARIABLES POUR LES FONCTIONNALITÉS AVANCÉES
let marketPlayers = [];
let availableBadges = [];
let currentSeason = null;
let battlePassData = null;
let activeEvents = [];
let clanWars = [];
let clanTechTree = [];
let clanChatListener = null;

// Système de Saisons
const SEASON_DURATION = 8; // 8 semaines
const BATTLE_PASS_FREE_REWARDS = [
  { level: 1, type: 'coins', amount: 500 },
  { level: 2, type: 'gems', amount: 25 },
  { level: 3, type: 'card', rarity: 'silver' },
  { level: 5, type: 'coins', amount: 1000 },
  { level: 7, type: 'energy', amount: 20 },
  { level: 10, type: 'card', rarity: 'gold' },
  { level: 15, type: 'badge', name: 'Saison 1' }
];

const BATTLE_PASS_PREMIUM_REWARDS = [
  { level: 1, type: 'gems', amount: 100 },
  { level: 2, type: 'card', rarity: 'gold' },
  { level: 3, type: 'vip', days: 7 },
  { level: 5, type: 'coins', amount: 2000 },
  { level: 7, type: 'card', rarity: 'legendary' },
  { level: 10, type: 'gems', amount: 500 },
  { level: 15, type: 'badge', name: 'VIP Saison 1' }
];

// Noms de cartes étendus
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

// NOUVEAU: Arbre de talents du clan
const CLAN_TECH_TREE = [
  { id: 'training_boost', name: 'Bonus Entraînement', cost: 1000, effect: '+5% efficacité entraînement', level: 1, maxLevel: 5 },
  { id: 'match_rewards', name: 'Récompenses Match', cost: 1500, effect: '+5% pièces par match', level: 0, maxLevel: 3 },
  { id: 'energy_regen', name: 'Régénération Énergie', cost: 2000, effect: '+1 énergie/heure', level: 0, maxLevel: 2 },
  { id: 'pack_discount', name: 'Réduction Packs', cost: 2500, effect: '-5% prix packs', level: 0, maxLevel: 3 },
  { id: 'fusion_discount', name: 'Réduction Fusion', cost: 1800, effect: '-10% coût fusion', level: 0, maxLevel: 2 }
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
  
  // CORRECTION: Toujours montrer le footer sauf pour login/register
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
    if (name === 'events') {
      const ftEvents = document.getElementById('ft-events');
      if (ftEvents) ftEvents.classList.add('active');
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
  if (name === 'events') loadEvents();
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

// NOUVEAU: Système de Saisons et Battle Pass
async function initializeSeasonSystem() {
  const seasonRef = ref(db, 'currentSeason');
  const snapshot = await get(seasonRef);
  
  if (!snapshot.exists()) {
    // Créer une nouvelle saison
    const seasonData = {
      number: 1,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + SEASON_DURATION * 7 * 24 * 60 * 60 * 1000).toISOString(),
      active: true
    };
    await set(seasonRef, seasonData);
    currentSeason = seasonData;
  } else {
    currentSeason = snapshot.val();
    
    // Vérifier si la saison est terminée
    const now = new Date();
    const endDate = new Date(currentSeason.endDate);
    
    if (now > endDate) {
      // Terminer la saison et en créer une nouvelle
      await endSeasonAndStartNew();
    }
  }
  
  // Initialiser le Battle Pass de l'utilisateur
  await initializeUserBattlePass();
}

// NOUVEAU: Terminer la saison et en commencer une nouvelle
async function endSeasonAndStartNew() {
  // Distribuer les récompenses de fin de saison
  const allUsers = await loadAllUsers();
  
  for (const user of allUsers) {
    const userBattlePassRef = ref(db, `battlePass/${user.uid}/${currentSeason.number}`);
    const userBPSnapshot = await get(userBattlePassRef);
    
    if (userBPSnapshot.exists()) {
      const userBP = userBPSnapshot.val();
      
      // Récompenses basées sur le niveau du Battle Pass
      if (userBP.level >= 10) {
        const userRef = getUserRef(user.uid);
        const rewards = {
          coins: userBP.level * 100,
          gems: Math.floor(userBP.level / 2) * 25
        };
        
        await update(userRef, {
          coins: (user.coins || 0) + rewards.coins,
          gems: (user.gems || 0) + rewards.gems
        });
      }
    }
  }
  
  // Créer une nouvelle saison
  const newSeasonNumber = currentSeason.number + 1;
  const newSeasonData = {
    number: newSeasonNumber,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + SEASON_DURATION * 7 * 24 * 60 * 60 * 1000).toISOString(),
    active: true
  };
  
  await set(ref(db, 'currentSeason'), newSeasonData);
  currentSeason = newSeasonData;
}

// NOUVEAU: Initialiser le Battle Pass utilisateur
async function initializeUserBattlePass() {
  if (!currentSeason || !currentUserData) return;
  
  const userBattlePassRef = ref(db, `battlePass/${getUserId()}/${currentSeason.number}`);
  const snapshot = await get(userBattlePassRef);
  
  if (!snapshot.exists()) {
    const battlePassData = {
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      premium: false,
      claimedRewards: [],
      challengesCompleted: 0
    };
    
    await set(userBattlePassRef, battlePassData);
    battlePassData = battlePassData;
  } else {
    battlePassData = snapshot.val();
  }
}

// NOUVEAU: Ajouter de l'XP au Battle Pass
async function addBattlePassXP(xpAmount) {
  if (!battlePassData || !currentSeason) return;
  
  const newXP = battlePassData.xp + xpAmount;
  let newLevel = battlePassData.level;
  let xpToNextLevel = battlePassData.xpToNextLevel;
  let leveledUp = false;
  
  // Vérifier les montées de niveau
  while (newXP >= xpToNextLevel && newLevel < 50) {
    newXP -= xpToNextLevel;
    newLevel++;
    xpToNextLevel = Math.floor(xpToNextLevel * 1.2); // 20% d'augmentation par niveau
    leveledUp = true;
    
    showNotification(`Battle Pass: Niveau ${newLevel} atteint!`, "success");
  }
  
  // Mettre à jour le Battle Pass
  const userBattlePassRef = ref(db, `battlePass/${getUserId()}/${currentSeason.number}`);
  await update(userBattlePassRef, {
    level: newLevel,
    xp: newXP,
    xpToNextLevel: xpToNextLevel
  });
  
  battlePassData.level = newLevel;
  battlePassData.xp = newXP;
  battlePassData.xpToNextLevel = xpToNextLevel;
  
  // Recharger l'affichage du Battle Pass
  if (document.getElementById('battle-pass-preview')) {
    loadBattlePassPreview();
  }
}

// NOUVEAU: Charger l'aperçu du Battle Pass
function loadBattlePassPreview() {
  if (!battlePassData || !currentSeason) return;
  
  const bpPreview = document.getElementById('battle-pass-preview');
  const bpProgressFill = document.getElementById('bp-progress-fill');
  const bpCurrentLevel = document.getElementById('bp-current-level');
  
  if (bpPreview && bpProgressFill && bpCurrentLevel) {
    const progressPercent = (battlePassData.xp / battlePassData.xpToNextLevel) * 100;
    
    bpProgressFill.style.width = `${progressPercent}%`;
    bpCurrentLevel.textContent = `Niv. ${battlePassData.level}`;
  }
}

// NOUVEAU: Afficher le modal du Battle Pass
function showBattlePassModal() {
  const modal = document.getElementById('battle-pass-modal');
  if (!modal) return;
  
  modal.classList.add('active');
  
  // Charger les récompenses
  loadBattlePassRewards();
}

// NOUVEAU: Charger les récompenses du Battle Pass
function loadBattlePassRewards() {
  const freeRewards = document.getElementById('free-rewards');
  const premiumRewards = document.getElementById('premium-rewards');
  
  if (!freeRewards || !premiumRewards) return;
  
  // Récompenses gratuites
  freeRewards.innerHTML = BATTLE_PASS_FREE_REWARDS.map(reward => `
    <div class="reward-item ${battlePassData.level >= reward.level ? 'unlocked' : 'locked'} ${battlePassData.claimedRewards?.includes(`free_${reward.level}`) ? 'claimed' : ''}">
      <div class="reward-level">Niv. ${reward.level}</div>
      <div class="reward-content">
        ${getRewardDisplay(reward)}
      </div>
      ${battlePassData.level >= reward.level && !battlePassData.claimedRewards?.includes(`free_${reward.level}`) ? 
        `<button class="small-btn claim-reward" data-type="free" data-level="${reward.level}">Récupérer</button>` : 
        ''}
    </div>
  `).join('');
  
  // Récompenses premium
  premiumRewards.innerHTML = BATTLE_PASS_PREMIUM_REWARDS.map(reward => `
    <div class="reward-item ${!battlePassData.premium ? 'premium-locked' : battlePassData.level >= reward.level ? 'unlocked' : 'locked'} ${battlePassData.claimedRewards?.includes(`premium_${reward.level}`) ? 'claimed' : ''}">
      <div class="reward-level">Niv. ${reward.level}</div>
      <div class="reward-content">
        ${getRewardDisplay(reward)}
        ${!battlePassData.premium ? '<div class="premium-badge">VIP</div>' : ''}
      </div>
      ${battlePassData.premium && battlePassData.level >= reward.level && !battlePassData.claimedRewards?.includes(`premium_${reward.level}`) ? 
        `<button class="small-btn claim-reward" data-type="premium" data-level="${reward.level}">Récupérer</button>` : 
        ''}
    </div>
  `).join('');
  
  // Événements pour réclamer les récompenses
  document.querySelectorAll('.claim-reward').forEach(btn => {
    btn.addEventListener('click', claimBattlePassReward);
  });
}

// NOUVEAU: Obtenir l'affichage d'une récompense
function getRewardDisplay(reward) {
  switch (reward.type) {
    case 'coins':
      return `<div class="reward-icon">🪙</div><div>${reward.amount} Pièces</div>`;
    case 'gems':
      return `<div class="reward-icon">💎</div><div>${reward.amount} Gems</div>`;
    case 'card':
      return `<div class="reward-icon">🎴</div><div>Carte ${reward.rarity}</div>`;
    case 'energy':
      return `<div class="reward-icon">⚡</div><div>${reward.amount} Énergie</div>`;
    case 'vip':
      return `<div class="reward-icon">👑</div><div>VIP ${reward.days} jours</div>`;
    case 'badge':
      return `<div class="reward-icon">🏅</div><div>Badge ${reward.name}</div>`;
    default:
      return '<div>Récompense</div>';
  }
}

// NOUVEAU: Réclamer une récompense du Battle Pass
async function claimBattlePassReward(event) {
  const button = event.target;
  const rewardType = button.getAttribute('data-type');
  const rewardLevel = parseInt(button.getAttribute('data-level'));
  
  const rewardKey = `${rewardType}_${rewardLevel}`;
  
  if (battlePassData.claimedRewards?.includes(rewardKey)) {
    showNotification("Récompense déjà réclamée", "warning");
    return;
  }
  
  // Trouver la récompense
  const rewards = rewardType === 'free' ? BATTLE_PASS_FREE_REWARDS : BATTLE_PASS_PREMIUM_REWARDS;
  const reward = rewards.find(r => r.level === rewardLevel);
  
  if (!reward) return;
  
  // Appliquer la récompense
  await applyReward(reward);
  
  // Marquer comme réclamée
  const updatedClaimedRewards = [...(battlePassData.claimedRewards || []), rewardKey];
  const userBattlePassRef = ref(db, `battlePass/${getUserId()}/${currentSeason.number}`);
  
  await update(userBattlePassRef, {
    claimedRewards: updatedClaimedRewards
  });
  
  battlePassData.claimedRewards = updatedClaimedRewards;
  
  showNotification("Récompense réclamée!", "success");
  loadBattlePassRewards();
}

// NOUVEAU: Appliquer une récompense
async function applyReward(reward) {
  switch (reward.type) {
    case 'coins':
      await updateUserData({
        coins: (currentUserData.coins || 0) + reward.amount
      });
      break;
    case 'gems':
      await updateUserData({
        gems: (currentUserData.gems || 0) + reward.amount
      });
      break;
    case 'energy':
      await updateUserData({
        energy: Math.min(currentUserData.maxEnergy || 20, (currentUserData.energy || 0) + reward.amount)
      });
      break;
    case 'card':
      await generateCardReward(reward.rarity);
      break;
    case 'vip':
      await activateTemporaryVIP(reward.days);
      break;
    case 'badge':
      await addBadge(reward.name);
      break;
  }
  
  loadDashboard();
}

// NOUVEAU: Générer une carte récompense
async function generateCardReward(rarity) {
  const cardId = 'card' + Date.now();
  const name = extendedCardNames[Math.floor(Math.random() * extendedCardNames.length)];
  
  const baseStats = {
    bronze: { attack: 10, defense: 8, speed: 5 },
    silver: { attack: 15, defense: 12, speed: 8 },
    gold: { attack: 22, defense: 18, speed: 12 },
    legendary: { attack: 30, defense: 25, speed: 18 }
  };
  
  const stats = baseStats[rarity] || baseStats.bronze;
  
  const newCard = {
    id: cardId,
    name: `${name} ${Math.floor(Math.random() * 100)}`,
    rarity: rarity,
    attack: stats.attack + Math.floor(Math.random() * 5),
    defense: stats.defense + Math.floor(Math.random() * 5),
    speed: stats.speed + Math.floor(Math.random() * 3),
    level: 1,
    nation: getRandomNation(),
    position: getRandomPosition()
  };
  
  const updatedCards = {
    ...currentUserData.cards,
    [cardId]: newCard
  };
  
  const updatedSubs = [...(currentUserData.subs || []), cardId];
  
  await updateUserData({
    cards: updatedCards,
    subs: updatedSubs
  });
  
  showNotification(`Nouvelle carte ${rarity} obtenue: ${newCard.name}`, "success");
}

// NOUVEAU: Activer le VIP temporaire
async function activateTemporaryVIP(days) {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  await updateUserData({
    vip: true,
    vipExpiration: expirationDate.toISOString(),
    maxEnergy: 30
  });
  
  showNotification(`VIP activé pour ${days} jours!`, "success");
}

// NOUVEAU: Ajouter un badge
async function addBadge(badgeName) {
  const updatedBadges = [...(currentUserData.badges || []), badgeName];
  await updateUserData({
    badges: updatedBadges
  });
  
  showNotification(`Nouveau badge: ${badgeName}`, "success");
}

// NOUVEAU: Acheter le Battle Pass premium
async function buyBattlePass() {
  if (!currentUserData) return;
  
  const battlePassCost = 1500;
  
  if ((currentUserData.gems || 0) < battlePassCost) {
    showNotification(`Pas assez de gems pour acheter le Battle Pass (${battlePassCost} gems requis)`, "warning");
    return;
  }
  
  if (battlePassData.premium) {
    showNotification("Vous avez déjà le Battle Pass premium", "warning");
    return;
  }
  
  const userBattlePassRef = ref(db, `battlePass/${getUserId()}/${currentSeason.number}`);
  
  await update(userBattlePassRef, {
    premium: true
  });
  
  await updateUserData({
    gems: (currentUserData.gems || 0) - battlePassCost
  });
  
  battlePassData.premium = true;
  
  showNotification("Battle Pass premium acheté!", "success");
  loadBattlePassRewards();
  loadDashboard();
}

// NOUVEAU: Système d'Événements et Défis
async function loadEvents() {
  if (!await ensureUserData()) return;
  
  await loadActiveEvents();
  await loadWeeklyTournaments();
  await loadDailyChallenges();
  
  // Afficher les événements actifs
  displayActiveEvents();
  displayWeeklyTournaments();
  displayDailyChallenges();
}

// NOUVEAU: Charger les événements actifs
async function loadActiveEvents() {
  const eventsRef = ref(db, 'events');
  const snapshot = await get(eventsRef);
  
  if (snapshot.exists()) {
    const eventsData = snapshot.val();
    const now = new Date();
    
    activeEvents = Object.values(eventsData).filter(event => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      return now >= startDate && now <= endDate;
    });
  } else {
    activeEvents = [];
  }
}

// NOUVEAU: Charger les tournois hebdomadaires
async function loadWeeklyTournaments() {
  // Pour l'instant, générer des tournois fictifs
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
  
  weeklyTournaments = [
    {
      id: 'tournament1',
      name: 'Tournoi Débutants',
      description: 'Réservé aux joueurs niveau 1-10',
      startDate: startOfWeek.toISOString(),
      endDate: endOfWeek.toISOString(),
      requirements: { maxLevel: 10 },
      rewards: { coins: 2000, gems: 100 }
    },
    {
      id: 'tournament2',
      name: 'Ligue des Champions',
      description: 'Tournoi élite sans restrictions',
      startDate: startOfWeek.toISOString(),
      endDate: endOfWeek.toISOString(),
      requirements: {},
      rewards: { coins: 5000, gems: 250, card: 'legendary' }
    }
  ];
}

// NOUVEAU: Charger les défis quotidiens
async function loadDailyChallenges() {
  const today = new Date().toDateString();
  const userChallengesRef = ref(db, `users/${getUserId()}/dailyChallenges`);
  const snapshot = await get(userChallengesRef);
  
  if (!snapshot.exists() || snapshot.val().date !== today) {
    // Générer de nouveaux défis quotidiens
    const dailyChallenges = {
      date: today,
      challenges: [
        { id: 'play_matches', type: 'play_matches', target: 3, progress: 0, reward: { coins: 100, xp: 50 } },
        { id: 'win_matches', type: 'win_matches', target: 2, progress: 0, reward: { coins: 200, xp: 100 } },
        { id: 'open_packs', type: 'open_packs', target: 1, progress: 0, reward: { coins: 150, xp: 75 } },
        { id: 'train_players', type: 'train_players', target: 2, progress: 0, reward: { coins: 120, xp: 60 } }
      ]
    };
    
    await set(userChallengesRef, dailyChallenges);
    currentUserData.dailyChallenges = dailyChallenges;
  } else {
    currentUserData.dailyChallenges = snapshot.val();
  }
}

// NOUVEAU: Afficher les événements actifs
function displayActiveEvents() {
  const eventsList = document.getElementById('events-list');
  if (!eventsList) return;
  
  if (activeEvents.length === 0) {
    eventsList.innerHTML = '<div class="small">Aucun événement actif</div>';
  } else {
    eventsList.innerHTML = activeEvents.map(event => `
      <div class="event-item ${event.special ? 'special' : ''}">
        <h4>${event.name}</h4>
        <p class="small">${event.description}</p>
        <div class="event-time">
          ${new Date(event.endDate).toLocaleDateString()}
        </div>
      </div>
    `).join('');
  }
}

// NOUVEAU: Afficher les tournois hebdomadaires
function displayWeeklyTournaments() {
  const tournamentsList = document.getElementById('weekly-tournaments');
  if (!tournamentsList) return;
  
  tournamentsList.innerHTML = weeklyTournaments.map(tournament => {
    const canParticipate = checkTournamentRequirements(tournament);
    
    return `
      <div class="tournament-item ${canParticipate ? 'eligible' : 'not-eligible'}">
        <h4>${tournament.name}</h4>
        <p class="small">${tournament.description}</p>
        <div class="tournament-rewards">
          <span>${tournament.rewards.coins}🪙</span>
          <span>${tournament.rewards.gems}💎</span>
          ${tournament.rewards.card ? `<span>Carte ${tournament.rewards.card}</span>` : ''}
        </div>
        <button class="small-btn ${canParticipate ? 'success' : 'ghost'}" ${!canParticipate ? 'disabled' : ''}>
          ${canParticipate ? 'Participer' : 'Non éligible'}
        </button>
      </div>
    `;
  }).join('');
}

// NOUVEAU: Vérifier les conditions d'un tournoi
function checkTournamentRequirements(tournament) {
  if (!currentUserData) return false;
  
  if (tournament.requirements.maxLevel && currentUserData.level > tournament.requirements.maxLevel) {
    return false;
  }
  
  if (tournament.requirements.minLevel && currentUserData.level < tournament.requirements.minLevel) {
    return false;
  }
  
  return true;
}

// NOUVEAU: Afficher les défis quotidiens
function displayDailyChallenges() {
  const challengesList = document.getElementById('daily-challenges');
  if (!challengesList || !currentUserData.dailyChallenges) return;
  
  challengesList.innerHTML = currentUserData.dailyChallenges.challenges.map(challenge => {
    const progressPercent = (challenge.progress / challenge.target) * 100;
    const isCompleted = challenge.progress >= challenge.target;
    
    return `
      <div class="challenge-item ${isCompleted ? 'completed' : ''}">
        <div class="challenge-info">
          <div class="challenge-name">${getChallengeName(challenge.type)}</div>
          <div class="challenge-progress">${challenge.progress}/${challenge.target}</div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="challenge-reward">
          <span>${challenge.reward.coins}🪙</span>
          <span>${challenge.reward.xp}⭐</span>
          ${isCompleted ? 
            `<button class="small-btn claim-challenge" data-id="${challenge.id}">Récupérer</button>` :
            ''}
        </div>
      </div>
    `;
  }).join('');
  
  // Événements pour réclamer les défis
  document.querySelectorAll('.claim-challenge').forEach(btn => {
    btn.addEventListener('click', claimDailyChallenge);
  });
}

// NOUVEAU: Obtenir le nom d'un défi
function getChallengeName(challengeType) {
  const names = {
    'play_matches': 'Jouer des matchs',
    'win_matches': 'Gagner des matchs',
    'open_packs': 'Ouvrir des packs',
    'train_players': 'Entraîner des joueurs',
    'fuse_cards': 'Fusionner des cartes',
    'join_clan': 'Rejoindre un clan'
  };
  
  return names[challengeType] || 'Défi';
}

// NOUVEAU: Réclamer un défi quotidien
async function claimDailyChallenge(event) {
  const challengeId = event.target.getAttribute('data-id');
  const challenges = currentUserData.dailyChallenges.challenges;
  const challenge = challenges.find(c => c.id === challengeId);
  
  if (!challenge || challenge.progress < challenge.target) {
    showNotification("Défi non terminé", "warning");
    return;
  }
  
  // Appliquer les récompenses
  await updateUserData({
    coins: (currentUserData.coins || 0) + challenge.reward.coins
  });
  
  // Ajouter l'XP au Battle Pass
  await addBattlePassXP(challenge.reward.xp);
  
  // Marquer le défi comme réclamé
  const updatedChallenges = challenges.map(c => 
    c.id === challengeId ? { ...c, progress: -1 } : c
  );
  
  const userChallengesRef = ref(db, `users/${getUserId()}/dailyChallenges`);
  await update(userChallengesRef, {
    challenges: updatedChallenges
  });
  
  currentUserData.dailyChallenges.challenges = updatedChallenges;
  
  showNotification("Défi réclamé!", "success");
  displayDailyChallenges();
}

// NOUVEAU: Mettre à jour la progression des défis
async function updateChallengeProgress(challengeType, amount = 1) {
  if (!currentUserData.dailyChallenges) return;
  
  const challenges = currentUserData.dailyChallenges.challenges;
  const challenge = challenges.find(c => c.type === challengeType);
  
  if (challenge && challenge.progress >= 0) {
    const newProgress = Math.min(challenge.target, challenge.progress + amount);
    
    if (newProgress !== challenge.progress) {
      challenge.progress = newProgress;
      
      const userChallengesRef = ref(db, `users/${getUserId()}/dailyChallenges`);
      await update(userChallengesRef, {
        challenges: challenges
      });
      
      // Recharger l'affichage si on est sur l'écran des événements
      if (document.getElementById('daily-challenges')) {
        displayDailyChallenges();
      }
      
      // Vérifier si le défi est complété pour la première fois
      if (newProgress === challenge.target) {
        showNotification(`Défi "${getChallengeName(challengeType)}" terminé!`, "success");
      }
    }
  }
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
      position: getRandomPosition(),
      contract: 30, // 30 matchs de contrat
      fatigue: 0, // 0% de fatigue
      lastTraining: null
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
      playersSold: 0,
      // NOUVEAUX CHAMPS
      currentTactic: 'balanced',
      trainingPoints: 0,
      clanId: null,
      battlePassLevel: 1
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
  
  // NOUVEAU: Charger le Battle Pass
  if (currentSeason && battlePassData) {
    loadBattlePassPreview();
  }
  
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

// NOUVEAU: Système de clans amélioré
async function loadClan() {
  if (!await ensureUserData()) return;
  
  await loadAllUsers();
  await loadClans();
  await loadClanWars();
  await loadClanTechTree();
  
  const userClan = document.getElementById('user-clan');
  const clansList = document.getElementById('clans-list');
  const resourceSharing = document.getElementById('resource-sharing');
  const clanWarsSection = document.getElementById('clan-wars');
  const techTreeSection = document.getElementById('clan-tech-tree');
  
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
      
      // Initialiser le chat du clan
      initializeClanChat(userClanData.id);
    } else {
      userClan.innerHTML = '<div class="small">Vous n\'êtes dans aucun clan</div>';
    }
  }
  
  // Afficher les guerres de clan
  if (clanWarsSection) {
    const userClanData = clans.find(c => c.members?.includes(getUserId()));
    
    if (userClanData) {
      const clanWarsHTML = clanWars.filter(war => 
        war.challengerId === userClanData.id || war.defenderId === userClanData.id
      ).map(war => `
        <div class="clan-war-item">
          <div class="war-teams">
            <span class="${war.challengerId === userClanData.id ? 'own-clan' : ''}">${war.challengerName}</span>
            <span>VS</span>
            <span class="${war.defenderId === userClanData.id ? 'own-clan' : ''}">${war.defenderName}</span>
          </div>
          <div class="war-score">${war.challengerScore || 0} - ${war.defenderScore || 0}</div>
          <div class="war-status ${war.status}">${getWarStatusText(war.status)}</div>
        </div>
      `).join('');
      
      clanWarsSection.querySelector('#active-clan-wars').innerHTML = 
        clanWarsHTML || '<div class="small">Aucune guerre active</div>';
    } else {
      clanWarsSection.style.display = 'none';
    }
  }
  
  // Afficher l'arbre de talents
  if (techTreeSection) {
    const userClanData = clans.find(c => c.members?.includes(getUserId()));
    
    if (userClanData && userClanData.techTree) {
      const techTreeProgress = document.getElementById('tech-tree-progress');
      const techTreeGrid = document.getElementById('tech-tree-grid');
      
      // Calculer le progrès total
      const totalLevels = CLAN_TECH_TREE.reduce((sum, tech) => sum + tech.maxLevel, 0);
      const currentLevels = userClanData.techTree.reduce((sum, tech) => sum + tech.level, 0);
      const progressPercent = (currentLevels / totalLevels) * 100;
      
      techTreeProgress.innerHTML = `
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="small">Progrès: ${currentLevels}/${totalLevels}</div>
      `;
      
      // Afficher les technologies
      techTreeGrid.innerHTML = userClanData.techTree.map(tech => {
        const techData = CLAN_TECH_TREE.find(t => t.id === tech.id);
        const canUpgrade = tech.level < techData.maxLevel && 
                          (userClanData.resources || 0) >= techData.cost;
        
        return `
          <div class="tech-item ${tech.level > 0 ? 'unlocked' : 'locked'}">
            <div class="tech-icon">🔬</div>
            <div class="tech-info">
              <div class="tech-name">${techData.name}</div>
              <div class="tech-level">Niveau ${tech.level}/${techData.maxLevel}</div>
              <div class="tech-effect">${techData.effect}</div>
            </div>
            ${canUpgrade ? 
              `<button class="small-btn upgrade-tech" data-tech="${tech.id}">
                Améliorer (${techData.cost})
              </button>` :
              '<div class="tech-cost">Coût: ' + techData.cost + '</div>'
            }
          </div>
        `;
      }).join('');
      
      // Événements pour améliorer les technologies
      document.querySelectorAll('.upgrade-tech').forEach(btn => {
        btn.addEventListener('click', upgradeClanTech);
      });
    } else {
      techTreeSection.style.display = 'none';
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
        
        // Ajouter les ressources au clan
        const clanRef = ref(db, `clans/${userClanData.id}`);
        await update(clanRef, {
          resources: (userClanData.resources || 0) + tax
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
        
        // Mettre à jour l'utilisateur
        await updateUserData({
          clanId: clanId
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
        
        // Mettre à jour l'utilisateur
        await updateUserData({
          clanId: null
        });
        
        // Arrêter l'écoute du chat
        if (clanChatListener) {
          off(clanChatListener);
        }
        
        showNotification(`Vous avez quitté le clan ${clan.name}`, "info");
        loadClan();
      }
    });
  });
  
  // Événement pour créer une guerre de clan
  document.getElementById('btn-create-clan-war')?.addEventListener('click', showClanWarModal);
}

// NOUVEAU: Initialiser le chat du clan
function initializeClanChat(clanId) {
  const chatMessages = document.getElementById('clan-chat-messages');
  const chatInput = document.getElementById('clan-chat-input');
  const chatSend = document.getElementById('clan-chat-send');
  
  if (!chatMessages || !chatInput || !chatSend) return;
  
  // Nettoyer l'écouteur précédent
  if (clanChatListener) {
    off(clanChatListener);
  }
  
  // Écouter les nouveaux messages
  const chatRef = ref(db, `clanChats/${clanId}`);
  clanChatListener = onChildAdded(chatRef, (snapshot) => {
    const message = snapshot.val();
    displayChatMessage(message);
  });
  
  // Charger les messages existants
  get(chatRef).then(snapshot => {
    if (snapshot.exists()) {
      const messages = Object.values(snapshot.val());
      chatMessages.innerHTML = '';
      messages.forEach(message => displayChatMessage(message));
    }
  });
  
  // Événement pour envoyer un message
  chatSend.addEventListener('click', sendClanMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendClanMessage();
    }
  });
}

// NOUVEAU: Afficher un message de chat
function displayChatMessage(message) {
  const chatMessages = document.getElementById('clan-chat-messages');
  if (!chatMessages) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = 'chat-message';
  messageEl.innerHTML = `
    <div class="message-sender">${message.senderName}:</div>
    <div class="message-text">${message.text}</div>
    <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
  `;
  
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// NOUVEAU: Envoyer un message de chat
async function sendClanMessage() {
  const chatInput = document.getElementById('clan-chat-input');
  const messageText = chatInput.value.trim();
  
  if (!messageText || !currentUserData) return;
  
  const userClanData = clans.find(c => c.members?.includes(getUserId()));
  if (!userClanData) return;
  
  const message = {
    senderId: getUserId(),
    senderName: currentUserData.displayName || 'Joueur',
    text: messageText,
    timestamp: new Date().toISOString()
  };
  
  const chatRef = ref(db, `clanChats/${userClanData.id}`);
  await push(chatRef, message);
  
  chatInput.value = '';
}

// NOUVEAU: Charger les guerres de clan
async function loadClanWars() {
  const warsRef = ref(db, 'clanWars');
  const snapshot = await get(warsRef);
  
  if (snapshot.exists()) {
    const warsData = snapshot.val();
    clanWars = Object.values(warsData).filter(war => war.status === 'active');
  } else {
    clanWars = [];
  }
}

// NOUVEAU: Charger l'arbre de talents du clan
async function loadClanTechTree() {
  // Pour l'instant, initialiser avec des données par défaut
  clanTechTree = CLAN_TECH_TREE;
}

// NOUVEAU: Obtenir le texte du statut d'une guerre
function getWarStatusText(status) {
  const statusTexts = {
    'active': 'En cours',
    'pending': 'En attente',
    'finished': 'Terminée',
    'cancelled': 'Annulée'
  };
  
  return statusTexts[status] || status;
}

// NOUVEAU: Améliorer une technologie de clan
async function upgradeClanTech(event) {
  const techId = event.target.getAttribute('data-tech');
  const userClanData = clans.find(c => c.members?.includes(getUserId()));
  
  if (!userClanData) return;
  
  const techData = CLAN_TECH_TREE.find(t => t.id === techId);
  const currentTech = userClanData.techTree?.find(t => t.id === techId) || { id: techId, level: 0 };
  
  if (currentTech.level >= techData.maxLevel) {
    showNotification("Niveau maximum atteint", "warning");
    return;
  }
  
  if ((userClanData.resources || 0) < techData.cost) {
    showNotification("Pas assez de ressources dans le clan", "warning");
    return;
  }
  
  // Mettre à jour la technologie
  const updatedTechTree = userClanData.techTree ? 
    userClanData.techTree.map(t => t.id === techId ? { ...t, level: t.level + 1 } : t) :
    [{ id: techId, level: 1 }];
  
  const clanRef = ref(db, `clans/${userClanData.id}`);
  await update(clanRef, {
    techTree: updatedTechTree,
    resources: (userClanData.resources || 0) - techData.cost
  });
  
  showNotification(`${techData.name} amélioré au niveau ${currentTech.level + 1}!`, "success");
  loadClan();
}

// NOUVEAU: Afficher le modal pour créer une guerre de clan
function showClanWarModal() {
  // Implémentation simplifiée - en production, vous auriez une interface pour sélectionner le clan adverse
  showNotification("Fonctionnalité en développement", "info");
}

// NOUVEAU: Système d'entraînement des joueurs
function showTrainingModal() {
  const modal = document.getElementById('training-modal');
  if (!modal) return;
  
  modal.classList.add('active');
  loadTrainingInterface();
}

// NOUVEAU: Charger l'interface d'entraînement
function loadTrainingInterface() {
  const playerSelect = document.getElementById('training-player-select');
  const trainingStats = document.getElementById('training-stats');
  const trainingActions = document.getElementById('training-actions');
  
  if (!playerSelect || !trainingStats || !trainingActions) return;
  
  // Remplir la liste des joueurs
  playerSelect.innerHTML = '<option value="">Sélectionnez un joueur</option>';
  Object.values(currentUserData.cards || {}).forEach(card => {
    const option = document.createElement('option');
    option.value = card.id;
    option.textContent = `${card.name} (${card.rarity}) - ⚔️${card.attack} 🛡️${card.defense} ⚡${card.speed}`;
    playerSelect.appendChild(option);
  });
  
  // Événement pour changer de joueur
  playerSelect.addEventListener('change', (e) => {
    const cardId = e.target.value;
    if (cardId) {
      displayTrainingStats(cardId);
    } else {
      trainingStats.innerHTML = '';
      trainingActions.innerHTML = '';
    }
  });
}

// NOUVEAU: Afficher les stats d'entraînement d'un joueur
function displayTrainingStats(cardId) {
  const card = currentUserData.cards[cardId];
  const trainingStats = document.getElementById('training-stats');
  const trainingActions = document.getElementById('training-actions');
  
  if (!card || !trainingStats || !trainingActions) return;
  
  trainingStats.innerHTML = `
    <div class="training-player-info">
      <h4>${card.name}</h4>
      <div class="player-stats">
        <div class="stat-row">
          <span>Attaque:</span>
          <span>${card.attack}</span>
          <button class="small-btn train-stat" data-stat="attack" data-card="${cardId}">+</button>
        </div>
        <div class="stat-row">
          <span>Défense:</span>
          <span>${card.defense}</span>
          <button class="small-btn train-stat" data-stat="defense" data-card="${cardId}">+</button>
        </div>
        <div class="stat-row">
          <span>Vitesse:</span>
          <span>${card.speed}</span>
          <button class="small-btn train-stat" data-stat="speed" data-card="${cardId}">+</button>
        </div>
      </div>
      <div class="fatigue-info">
        Fatigue: ${card.fatigue || 0}%
        ${card.fatigue >= 80 ? '<span class="warning-text">(Joueur fatigué!)</span>' : ''}
      </div>
    </div>
  `;
  
  trainingActions.innerHTML = `
    <div class="training-cost">
      <div class="small">Coût par entraînement: 50 pièces</div>
      <div class="small">Fatigue: +5% par session</div>
    </div>
    <button class="small-btn success" id="btn-rest-player" data-card="${cardId}">
      Reposer le joueur (25 pièces)
    </button>
  `;
  
  // Événements pour l'entraînement
  document.querySelectorAll('.train-stat').forEach(btn => {
    btn.addEventListener('click', trainPlayerStat);
  });
  
  document.getElementById('btn-rest-player')?.addEventListener('click', restPlayer);
}

// NOUVEAU: Entraîner une statistique de joueur
async function trainPlayerStat(event) {
  const stat = event.target.getAttribute('data-stat');
  const cardId = event.target.getAttribute('data-card');
  const card = currentUserData.cards[cardId];
  
  if (!card) return;
  
  // Vérifier le coût
  if ((currentUserData.coins || 0) < 50) {
    showNotification("Pas assez de pièces pour l'entraînement", "warning");
    return;
  }
  
  // Vérifier la fatigue
  if ((card.fatigue || 0) >= 100) {
    showNotification("Le joueur est trop fatigué pour s'entraîner", "warning");
    return;
  }
  
  // Améliorer la statistique
  const statIncrease = Math.floor(Math.random() * 3) + 1; // 1-3 points
  const updatedCards = {
    ...currentUserData.cards,
    [cardId]: {
      ...card,
      [stat]: card[stat] + statIncrease,
      fatigue: Math.min(100, (card.fatigue || 0) + 5),
      lastTraining: new Date().toISOString()
    }
  };
  
  // Déduire le coût
  const updatedCoins = (currentUserData.coins || 0) - 50;
  
  await updateUserData({
    cards: updatedCards,
    coins: updatedCoins
  });
  
  // Mettre à jour la progression du défi
  await updateChallengeProgress('train_players', 1);
  
  showNotification(`${card.name} a amélioré son ${getStatName(stat)} de +${statIncrease}!`, "success");
  displayTrainingStats(cardId);
  loadDashboard();
}

// NOUVEAU: Reposer un joueur
async function restPlayer(event) {
  const cardId = event.target.getAttribute('data-card');
  const card = currentUserData.cards[cardId];
  
  if (!card) return;
  
  // Vérifier le coût
  if ((currentUserData.coins || 0) < 25) {
    showNotification("Pas assez de pièces pour reposer le joueur", "warning");
    return;
  }
  
  if ((card.fatigue || 0) <= 0) {
    showNotification("Le joueur n'est pas fatigué", "warning");
    return;
  }
  
  const updatedCards = {
    ...currentUserData.cards,
    [cardId]: {
      ...card,
      fatigue: Math.max(0, (card.fatigue || 0) - 20)
    }
  };
  
  const updatedCoins = (currentUserData.coins || 0) - 25;
  
  await updateUserData({
    cards: updatedCards,
    coins: updatedCoins
  });
  
  showNotification(`${card.name} s'est reposé. Fatigue réduite.`, "success");
  displayTrainingStats(cardId);
  loadDashboard();
}

// NOUVEAU: Obtenir le nom d'une statistique
function getStatName(stat) {
  const names = {
    'attack': 'attaque',
    'defense': 'défense',
    'speed': 'vitesse'
  };
  
  return names[stat] || stat;
}

// NOUVEAU: Système de tactiques d'équipe
function showTacticsModal() {
  const modal = document.getElementById('tactics-modal');
  if (!modal) return;
  
  modal.classList.add('active');
  
  // Sélectionner la tactique actuelle
  const currentTactic = currentUserData.currentTactic || 'balanced';
  document.querySelectorAll('.tactic-option').forEach(option => {
    if (option.getAttribute('data-tactic') === currentTactic) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
  
  // Événements pour sélectionner une tactique
  document.querySelectorAll('.tactic-option').forEach(option => {
    option.addEventListener('click', selectTactic);
  });
}

// NOUVEAU: Sélectionner une tactique
async function selectTactic(event) {
  const tactic = event.currentTarget.getAttribute('data-tactic');
  
  await updateUserData({
    currentTactic: tactic
  });
  
  showNotification(`Tactique changée: ${getTacticName(tactic)}`, "success");
  
  // Fermer le modal
  const modal = document.getElementById('tactics-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  
  // Recharger l'équipe pour afficher la nouvelle tactique
  loadTeam();
}

// NOUVEAU: Obtenir le nom d'une tactique
function getTacticName(tactic) {
  const names = {
    'offensive': 'Offensive',
    'defensive': 'Défensive',
    'balanced': 'Équilibrée'
  };
  
  return names[tactic] || tactic;
}

// NOUVEAU: Appliquer les bonus de tactique
function applyTacticBonus(baseStats, tactic) {
  const bonuses = {
    'offensive': { attack: 1.15, defense: 0.9 },
    'defensive': { attack: 0.9, defense: 1.15 },
    'balanced': { attack: 1.05, defense: 1.05 }
  };
  
  const bonus = bonuses[tactic] || bonuses.balanced;
  
  return {
    attack: Math.floor(baseStats.attack * bonus.attack),
    defense: Math.floor(baseStats.defense * bonus.defense),
    speed: baseStats.speed
  };
}

// NOUVEAU: Gestion des contrats et de la fatigue
function updateContractsAndFatigue() {
  if (!currentUserData || !currentUserData.cards) return;
  
  let updatedCards = { ...currentUserData.cards };
  let needsUpdate = false;
  
  Object.keys(updatedCards).forEach(cardId => {
    const card = updatedCards[cardId];
    
    // Réduire la fatigue avec le temps (1% par heure)
    if (card.fatigue > 0) {
      const lastUpdate = card.lastFatigueUpdate ? new Date(card.lastFatigueUpdate) : new Date();
      const now = new Date();
      const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);
      
      if (hoursPassed >= 1) {
        card.fatigue = Math.max(0, card.fatigue - Math.floor(hoursPassed));
        card.lastFatigueUpdate = now.toISOString();
        needsUpdate = true;
      }
    }
    
    // Gérer l'expiration des contrats
    if (card.contract !== undefined && card.contract <= 0) {
      // Contrat expiré - le joueur ne peut plus être utilisé
      card.contractExpired = true;
      needsUpdate = true;
    }
  });
  
  if (needsUpdate) {
    updateUserData({ cards: updatedCards });
  }
}

// NOUVEAU: Renouveler un contrat
async function renewContract(cardId, cost) {
  const card = currentUserData.cards[cardId];
  if (!card) return;
  
  if ((currentUserData.coins || 0) < cost) {
    showNotification("Pas assez de pièces pour renouveler le contrat", "warning");
    return;
  }
  
  const updatedCards = {
    ...currentUserData.cards,
    [cardId]: {
      ...card,
      contract: 30, // Renouveler pour 30 matchs
      contractExpired: false
    }
  };
  
  const updatedCoins = (currentUserData.coins || 0) - cost;
  
  await updateUserData({
    cards: updatedCards,
    coins: updatedCoins
  });
  
  showNotification(`Contrat de ${card.name} renouvelé pour 30 matchs`, "success");
}

// Suite des fonctions existantes avec intégration des nouvelles fonctionnalités...
// [Le reste du code reste similaire mais avec l'intégration des nouvelles fonctionnalités]

// Gestionnaire d'état d'authentification
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Utilisateur connecté
    currentUserData = await ensureUserProfile(user.uid, user.displayName || 'Joueur', user.email);
    const hdrUser = document.getElementById('hdr-user');
    if (hdrUser) hdrUser.textContent = currentUserData.displayName || 'Joueur';
    
    // Initialiser les systèmes avancés
    await initializeSeasonSystem();
    await loadDailyChallenges();
    updateContractsAndFatigue();
    
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

// CORRECTION: Initialisation complète des événements
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
  
  const navClan = document.getElementById('nav-clan');
  if (navClan) navClan.addEventListener('click', () => showScreen('clan'));
  
  const navMarket = document.getElementById('nav-market');
  if (navMarket) navMarket.addEventListener('click', () => showScreen('market'));
  
  const navBadges = document.getElementById('nav-badges');
  if (navBadges) navBadges.addEventListener('click', () => showScreen('badges'));
  
  const navEvents = document.getElementById('nav-events');
  if (navEvents) navEvents.addEventListener('click', () => showScreen('events'));
  
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
  
  const clanBack = document.getElementById('clan-back');
  if (clanBack) clanBack.addEventListener('click', () => showScreen('dashboard'));
  
  const marketBack = document.getElementById('market-back');
  if (marketBack) marketBack.addEventListener('click', () => showScreen('dashboard'));
  
  const badgesBack = document.getElementById('badges-back');
  if (badgesBack) badgesBack.addEventListener('click', () => showScreen('dashboard'));
  
  const eventsBack = document.getElementById('events-back');
  if (eventsBack) eventsBack.addEventListener('click', () => showScreen('dashboard'));
  
  // Footer navigation
  const ftHome = document.getElementById('ft-home');
  if (ftHome) ftHome.addEventListener('click', () => showScreen('dashboard'));
  
  const ftTeam = document.getElementById('ft-team');
  if (ftTeam) ftTeam.addEventListener('click', () => showScreen('team'));
  
  const ftMatch = document.getElementById('ft-match');
  if (ftMatch) ftMatch.addEventListener('click', () => showScreen('match'));
  
  const ftStore = document.getElementById('ft-store');
  if (ftStore) ftStore.addEventListener('click', () => showScreen('store'));
  
  const ftEvents = document.getElementById('ft-events');
  if (ftEvents) ftEvents.addEventListener('click', () => showScreen('events'));
  
  // NOUVEAUX ÉVÉNEMENTS POUR LES FONCTIONNALITÉS AVANCÉES
  const btnViewBattlePass = document.getElementById('btn-view-battle-pass');
  if (btnViewBattlePass) {
    btnViewBattlePass.addEventListener('click', showBattlePassModal);
  }
  
  const buyBattlePassBtn = document.getElementById('buy-battle-pass');
  if (buyBattlePassBtn) {
    buyBattlePassBtn.addEventListener('click', buyBattlePass);
  }
  
  const btnOpenTraining = document.getElementById('btn-open-training');
  if (btnOpenTraining) {
    btnOpenTraining.addEventListener('click', showTrainingModal);
  }
  
  const btnChangeTactic = document.getElementById('btn-change-tactic');
  if (btnChangeTactic) {
    btnChangeTactic.addEventListener('click', showTacticsModal);
  }
  
  // Fermer les modals
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', function() {
      this.closest('.modal').classList.remove('active');
    });
  });
  
  // Fermer les modals en cliquant à l'extérieur
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });
  });
  
  // [Le reste des événements existants...]
});

// CORRECTION: Masquer le footer au chargement initial
if (footer) footer.classList.remove('visible');