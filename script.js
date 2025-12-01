// script.js - Manager Cards
// État global du jeu
const gameState = {
    user: null,
    coins: 1000,
    gems: 50,
    players: [],
    team: [],
    club: null,
    season: {
        level: 1,
        xp: 0,
        endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000) // 35 jours
    },
    dailyRewardClaimed: false,
    battlePass: {
        free: true,
        vip: false
    }
};

// Données des joueurs
const playersData = [
    { id: 1, name: "Lionel Messi", position: "ATK", rating: 92, value: 5000, fatigue: 0, contract: 20, rarity: "legendary" },
    { id: 2, name: "Kylian Mbappé", position: "ATK", rating: 91, value: 4500, fatigue: 10, contract: 25, rarity: "epic" },
    { id: 3, name: "Kevin De Bruyne", position: "MID", rating: 90, value: 4000, fatigue: 5, contract: 18, rarity: "epic" },
    { id: 4, name: "Virgil van Dijk", position: "DEF", rating: 89, value: 3500, fatigue: 15, contract: 22, rarity: "rare" },
    { id: 5, name: "Thibaut Courtois", position: "GK", rating: 90, value: 3000, fatigue: 0, contract: 30, rarity: "rare" },
    { id: 6, name: "Neymar Jr", position: "ATK", rating: 88, value: 3800, fatigue: 20, contract: 15, rarity: "epic" },
    { id: 7, name: "Karim Benzema", position: "ATK", rating: 89, value: 4200, fatigue: 8, contract: 12, rarity: "rare" },
    { id: 8, name: "Erling Haaland", position: "ATK", rating: 90, value: 5000, fatigue: 5, contract: 28, rarity: "legendary" }
];

// Événements en cours
const currentEvents = [
    { id: 1, name: "Tournoi du Week-end", type: "tournament", timeLeft: "2 jours", prize: "1000 Pièces" },
    { id: 2, name: "Challenge Quotidien", type: "daily", timeLeft: "24h", prize: "500 Pièces" },
    { id: 3, name: "Événement Spécial", type: "special", timeLeft: "3 jours", prize: "Carte Rare" }
];

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', function() {
    loadGameState();
    initNavigation();
    initButtons();
    updateUI();
    showDailyRewardIfNeeded();
});

// Charger l'état du jeu depuis localStorage
function loadGameState() {
    const saved = localStorage.getItem('managerCardsState');
    if (saved) {
        Object.assign(gameState, JSON.parse(saved));
    } else {
        // État initial par défaut
        gameState.players = playersData.slice(0, 3);
        gameState.team = playersData.slice(0, 5);
    }
    
    // Mettre à jour l'affichage de l'utilisateur
    if (gameState.user) {
        document.getElementById('hdr-user').textContent = gameState.user.username;
        document.getElementById('profile-username').textContent = gameState.user.username;
    }
}

// Sauvegarder l'état du jeu
function saveGameState() {
    localStorage.setItem('managerCardsState', JSON.stringify(gameState));
}

// Initialisation de la navigation
function initNavigation() {
    // Navigation mobile
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const screenId = this.getAttribute('data-screen');
            showScreen(screenId);
            
            // Mettre à jour l'état actif
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Navigation entre login et register
    document.getElementById('btn-go-register').addEventListener('click', () => showScreen('screen-register'));
    document.getElementById('btn-go-login').addEventListener('click', () => showScreen('screen-login'));
}

// Afficher un écran spécifique
function showScreen(screenId) {
    // Cacher tous les écrans
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Afficher l'écran demandé
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        
        // Mettre à jour le contenu spécifique à l'écran
        switch(screenId) {
            case 'screen-home':
                updateHomeScreen();
                break;
            case 'screen-team':
                updateTeamScreen();
                break;
            case 'screen-market':
                updateMarketScreen();
                break;
            case 'screen-club':
                updateClubScreen();
                break;
            case 'screen-season':
                updateSeasonScreen();
                break;
            case 'screen-profile':
                updateProfileScreen();
                break;
        }
    }
}

// Mettre à jour l'interface utilisateur
function updateUI() {
    // Mettre à jour les devises dans l'en-tête
    document.getElementById('header-coins').textContent = gameState.coins;
    document.getElementById('header-gems').textContent = gameState.gems;
    
    // Mettre à jour l'écran d'accueil si actif
    if (document.getElementById('screen-home').classList.contains('active')) {
        updateHomeScreen();
    }
}

// Initialiser tous les boutons
function initButtons() {
    // Connexion
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    
    // Inscription
    document.getElementById('btn-register').addEventListener('click', handleRegister);
    
    // Déconnexion
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    
    // Actions rapides
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleQuickAction(action);
        });
    });
    
    // Bouton de récompense quotidienne
    document.getElementById('claim-reward').addEventListener('click', claimDailyReward);
    
    // Bouton d'entraînement d'équipe
    document.getElementById('btn-train-team').addEventListener('click', () => openModal('modal-training'));
    
    // Boutons de club
    document.getElementById('btn-create-club').addEventListener('click', handleCreateClub);
    document.getElementById('btn-join-club').addEventListener('click', handleJoinClub);
    
    // Bouton de passe de combat
    document.getElementById('btn-upgrade-pass').addEventListener('click', handleUpgradePass);
    
    // Boutons de paramètres
    document.getElementById('btn-settings').addEventListener('click', () => showNotification('Paramètres - Fonctionnalité à venir'));
    document.getElementById('btn-help').addEventListener('click', () => showNotification('Aide - Fonctionnalité à venir'));
    document.getElementById('btn-about').addEventListener('click', () => showNotification('Manager Cards v1.0.0\nDéveloppé avec passion'));
    
    // Boutons de modales
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Ouvrir des packs
    document.querySelectorAll('.pack-open').forEach((btn, index) => {
        btn.addEventListener('click', function() {
            handleOpenPack(index === 0 ? 'basic' : 'premium');
        });
    });
    
    // Sélection d'entraînement
    document.querySelectorAll('.training-select').forEach((btn, index) => {
        btn.addEventListener('click', function() {
            handleTrainingSelection(index === 0 ? 'attack' : 'defense');
        });
    });
    
    // Filtres du marché
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateMarketScreen(this.textContent);
        });
    });
    
    // Tabs du battle pass
    document.querySelectorAll('.pass-tab').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.pass-tab').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updatePassTab(this.textContent);
        });
    });
    
    // Gérer le changement de mentalité d'équipe
    document.getElementById('team-mentality').addEventListener('change', function() {
        showNotification(`Mentalité changée: ${this.options[this.selectedIndex].text}`);
    });
    
    // Observer une guerre de clan
    document.querySelector('.war-item .small-btn').addEventListener('click', function() {
        showNotification('Observation de la guerre de clan activée');
    });
    
    // Participer à un événement
    document.querySelector('.event-item .small-btn').addEventListener('click', function() {
        showNotification('Participation enregistrée!');
    });
    
    // Compléter un défi
    document.querySelector('.challenge-item .small-btn').addEventListener('click', function() {
        showNotification('Défi complété! +50 XP');
        gameState.season.xp += 50;
        checkLevelUp();
        saveGameState();
        updateSeasonScreen();
    });
    
    // Gestion des événements spéciaux
    document.querySelector('.special-events .event-card').addEventListener('click', function() {
        showNotification('Inscription à l\'événement spécial confirmée!');
    });
}

// Gestion de la connexion
function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    
    if (!email || !password) {
        showNotification('Veuillez remplir tous les champs');
        return;
    }
    
    // Simuler la connexion
    gameState.user = {
        username: email.split('@')[0],
        email: email,
        joinedDate: new Date()
    };
    
    showScreen('screen-home');
    showNotification('Connexion réussie!');
    updateUI();
    saveGameState();
}

// Gestion de l'inscription
function handleRegister() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-pass').value;
    const confirm = document.getElementById('register-pass-confirm').value;
    
    if (!username || !email || !password || !confirm) {
        showNotification('Veuillez remplir tous les champs');
        return;
    }
    
    if (password !== confirm) {
        showNotification('Les mots de passe ne correspondent pas');
        return;
    }
    
    // Simuler l'inscription
    gameState.user = {
        username: username,
        email: email,
        joinedDate: new Date()
    };
    
    showScreen('screen-home');
    showNotification('Inscription réussie! Bienvenue!');
    updateUI();
    saveGameState();
}

// Gestion de la déconnexion
function handleLogout() {
    gameState.user = null;
    showScreen('screen-login');
    showNotification('Déconnexion réussie');
    saveGameState();
}

// Actions rapides
function handleQuickAction(action) {
    switch(action) {
        case 'open-pack':
            openModal('modal-pack');
            break;
        case 'play-match':
            playMatch();
            break;
        case 'daily-reward':
            showDailyReward();
            break;
        case 'train-players':
            openModal('modal-training');
            break;
        default:
            showNotification('Action non disponible');
    }
}

// Ouvrir un pack
function handleOpenPack(type) {
    let cost = 0;
    let reward = {};
    
    if (type === 'basic') {
        // Pack gratuit
        reward = {
            coins: 100,
            player: getRandomPlayer(70, 85)
        };
        showNotification('Pack de Base ouvert!');
    } else {
        // Pack premium
        cost = 50;
        if (gameState.gems < cost) {
            showNotification('Pas assez de gems!');
            return;
        }
        gameState.gems -= cost;
        reward = {
            coins: 500,
            gems: 10,
            player: getRandomPlayer(85, 95)
        };
        showNotification('Pack Premium ouvert!');
    }
    
    // Appliquer les récompenses
    gameState.coins += reward.coins;
    if (reward.gems) gameState.gems += reward.gems;
    if (reward.player) {
        gameState.players.push(reward.player);
        showNotification(`Nouveau joueur: ${reward.player.name} (${reward.player.rating})`);
    }
    
    updateUI();
    saveGameState();
    document.getElementById('modal-pack').classList.remove('active');
}

// Jouer un match
function playMatch() {
    if (gameState.team.length < 5) {
        showNotification('Équipe incomplète! Minimum 5 joueurs');
        return;
    }
    
    // Simuler un match
    const win = Math.random() > 0.4; // 60% de chance de gagner
    const coins = win ? 200 : 50;
    const xp = win ? 100 : 25;
    
    gameState.coins += coins;
    gameState.season.xp += xp;
    
    // Augmenter la fatigue des joueurs
    gameState.team.forEach(player => {
        if (player.fatigue < 100) player.fatigue += 15;
    });
    
    // Enregistrer le match
    if (!gameState.user.matches) gameState.user.matches = 0;
    if (!gameState.user.wins) gameState.user.wins = 0;
    
    gameState.user.matches++;
    if (win) gameState.user.wins++;
    
    showNotification(win ? `Victoire! +${coins} pièces` : `Défaite! +${coins} pièces`);
    checkLevelUp();
    updateTeamScreen();
    updateUI();
    saveGameState();
}

// Réclamer la récompense quotidienne
function claimDailyReward() {
    gameState.coins += 200;
    gameState.gems += 2;
    gameState.dailyRewardClaimed = true;
    
    showNotification('Récompense quotidienne réclamée!');
    updateUI();
    saveGameState();
    
    document.getElementById('daily-reward').classList.remove('active');
}

// Afficher la récompense quotidienne si nécessaire
function showDailyRewardIfNeeded() {
    if (!gameState.dailyRewardClaimed && gameState.user) {
        setTimeout(() => {
            document.getElementById('daily-reward').classList.add('active');
        }, 1000);
    }
}

function showDailyReward() {
    document.getElementById('daily-reward').classList.add('active');
}

// Mettre à jour l'écran d'accueil
function updateHomeScreen() {
    document.getElementById('home-coins').textContent = gameState.coins;
    document.getElementById('home-gems').textContent = gameState.gems;
    document.getElementById('home-players').textContent = gameState.players.length;
    document.getElementById('home-wins').textContent = gameState.user?.wins || 0;
    
    // Mettre à jour les événements
    const eventsList = document.getElementById('home-events');
    eventsList.innerHTML = '';
    
    currentEvents.forEach(event => {
        const eventHTML = `
            <div class="event-item">
                <div class="event-icon">${getEventIcon(event.type)}</div>
                <div class="event-details">
                    <div class="event-title">${event.name}</div>
                    <div class="event-time">${event.timeLeft}</div>
                </div>
                <button class="small-btn">Participer</button>
            </div>
        `;
        eventsList.innerHTML += eventHTML;
    });
}

// Mettre à jour l'écran d'équipe
function updateTeamScreen() {
    const teamStrength = gameState.team.reduce((sum, player) => sum + player.rating, 0);
    const teamFatigue = gameState.team.reduce((sum, player) => sum + player.fatigue, 0) / gameState.team.length || 0;
    
    document.getElementById('team-total-strength').textContent = teamStrength;
    document.getElementById('team-fatigue').textContent = Math.round(teamFatigue) + '%';
    
    const playersList = document.getElementById('team-players-list');
    playersList.innerHTML = '';
    
    gameState.team.forEach(player => {
        const playerHTML = `
            <div class="player-card">
                <div class="player-icon" style="background: ${getRarityColor(player.rarity)}">
                    ${getPositionIcon(player.position)}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${player.name}</div>
                    <div style="display: flex; gap: 12px; font-size: 14px; margin-top: 4px;">
                        <span>${player.position}</span>
                        <span>Note: ${player.rating}</span>
                        <span>Fatigue: ${player.fatigue}%</span>
                    </div>
                </div>
                <button class="small-btn train-btn" data-id="${player.id}">Entraîner</button>
            </div>
        `;
        playersList.innerHTML += playerHTML;
    });
    
    // Ajouter les événements aux boutons d'entraînement
    document.querySelectorAll('.train-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const playerId = parseInt(this.getAttribute('data-id'));
            trainPlayer(playerId);
        });
    });
}

// Mettre à jour le marché
function updateMarketScreen(filter = 'Tous') {
    const marketList = document.getElementById('market-players');
    marketList.innerHTML = '';
    
    const filteredPlayers = playersData.filter(player => {
        if (filter === 'Tous') return true;
        if (filter === 'Attaquants') return player.position === 'ATK';
        if (filter === 'Milieux') return player.position === 'MID';
        if (filter === 'Défenseurs') return player.position === 'DEF';
        if (filter === 'Gardiens') return player.position === 'GK';
        return true;
    });
    
    filteredPlayers.forEach(player => {
        const isOwned = gameState.players.some(p => p.id === player.id);
        const marketHTML = `
            <div class="market-item">
                <div class="player-icon" style="background: ${getRarityColor(player.rarity)}">
                    ${getPositionIcon(player.position)}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${player.name}</div>
                    <div style="display: flex; gap: 12px; font-size: 14px; margin-top: 4px;">
                        <span>${player.position}</span>
                        <span>Note: ${player.rating}</span>
                        <span>Valeur: ${player.value}</span>
                    </div>
                </div>
                <button class="small-btn buy-btn" data-id="${player.id}" ${isOwned ? 'disabled' : ''}>
                    ${isOwned ? 'Possédé' : `Acheter ${player.value}`}
                </button>
            </div>
        `;
        marketList.innerHTML += marketHTML;
    });
    
    // Ajouter les événements aux boutons d'achat
    document.querySelectorAll('.buy-btn').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', function() {
                const playerId = parseInt(this.getAttribute('data-id'));
                buyPlayer(playerId);
            });
        }
    });
}

// Mettre à jour l'écran du club
function updateClubScreen() {
    const clubInfo = document.getElementById('club-info');
    
    if (gameState.club) {
        clubInfo.innerHTML = `
            <div class="club-header">
                <div class="club-icon">${gameState.club.icon}</div>
                <div class="club-details">
                    <div class="club-name">${gameState.club.name}</div>
                    <div class="club-members">${gameState.club.members}/50 membres</div>
                    <div class="club-level">Niveau ${gameState.club.level}</div>
                </div>
            </div>
        `;
    } else {
        clubInfo.innerHTML = `
            <div class="club-header">
                <div class="club-icon">🛡️</div>
                <div class="club-details">
                    <div class="club-name">Aucun club</div>
                    <div class="club-members">Rejoignez ou créez un club</div>
                </div>
            </div>
        `;
    }
}

// Mettre à jour l'écran de saison
function updateSeasonScreen() {
    const daysLeft = Math.ceil((gameState.season.endDate - new Date()) / (1000 * 60 * 60 * 24));
    document.querySelector('.season-time').textContent = `${daysLeft} jours restants`;
    document.querySelector('.season-level').textContent = `Niveau ${gameState.season.level}/50`;
    
    // Calculer le pourcentage de progression
    const xpForNextLevel = gameState.season.level * 100;
    const progressPercent = Math.min(100, (gameState.season.xp / xpForNextLevel) * 100);
    document.querySelector('.progress-fill').style.width = `${progressPercent}%`;
    
    // Mettre à jour l'état du battle pass
    if (gameState.battlePass.vip) {
        document.querySelector('.pass-tab:nth-child(2)').click();
    }
}

// Mettre à jour l'écran de profil
function updateProfileScreen() {
    if (gameState.user) {
        document.getElementById('profile-username').textContent = gameState.user.username;
        document.getElementById('profile-matches').textContent = gameState.user.matches || 0;
        document.getElementById('profile-wins').textContent = gameState.user.wins || 0;
        
        const ratio = gameState.user.matches ? ((gameState.user.wins || 0) / gameState.user.matches * 100).toFixed(1) : 0;
        document.getElementById('profile-ratio').textContent = `${ratio}%`;
        document.getElementById('profile-level').textContent = gameState.season.level;
        
        // Déterminer le rang
        let rank = 'Novice';
        if (gameState.season.level >= 10) rank = 'Expert';
        if (gameState.season.level >= 25) rank = 'Maître';
        if (gameState.season.level >= 40) rank = 'Légende';
        document.getElementById('profile-rank').textContent = rank;
    }
}

// Gestion de la création de club
function handleCreateClub() {
    const clubName = prompt('Nom du club:');
    if (clubName) {
        gameState.club = {
            name: clubName,
            icon: '🛡️',
            level: 1,
            members: 1
        };
        showNotification(`Club "${clubName}" créé!`);
        updateClubScreen();
        saveGameState();
    }
}

// Gestion de la recherche de club
function handleJoinClub() {
    showNotification('Recherche de clubs disponibles...');
    // Simuler des clubs disponibles
    const clubs = [
        { name: 'Dragons FC', members: 45, level: 3 },
        { name: 'Tigres United', members: 32, level: 2 },
        { name: 'Aigles Royal', members: 28, level: 2 }
    ];
    
    const clubList = clubs.map(c => `${c.name} (${c.members} membres, Niv.${c.level})`).join('\n');
    const choice = prompt(`Clubs disponibles:\n${clubList}\n\nEntrez le nom du club à rejoindre:`);
    
    if (choice) {
        gameState.club = {
            name: choice,
            icon: '🛡️',
            level: 2,
            members: 46
        };
        showNotification(`Vous avez rejoint ${choice}!`);
        updateClubScreen();
        saveGameState();
    }
}

// Améliorer le passe de combat
function handleUpgradePass() {
    if (gameState.battlePass.vip) {
        showNotification('Vous avez déjà le Pass VIP!');
        return;
    }
    
    if (gameState.gems < 500) {
        showNotification('500 gems requis pour le Pass VIP');
        return;
    }
    
    gameState.gems -= 500;
    gameState.battlePass.vip = true;
    showNotification('Pass VIP activé! Bonus exclusifs débloqués!');
    updateUI();
    saveGameState();
}

// Sélection d'entraînement
function handleTrainingSelection(type) {
    const cost = 1000;
    
    if (gameState.coins < cost) {
        showNotification(`Pas assez de pièces! ${cost} requis`);
        return;
    }
    
    gameState.coins -= cost;
    
    // Améliorer tous les joueurs de l'équipe
    gameState.team.forEach(player => {
        if (type === 'attack' && player.position === 'ATK') {
            player.rating += 1;
        } else if (type === 'defense' && (player.position === 'DEF' || player.position === 'GK')) {
            player.rating += 1;
        }
    });
    
    showNotification(`Entraînement ${type === 'attack' ? 'offensif' : 'défensif'} réussi!`);
    updateTeamScreen();
    updateUI();
    saveGameState();
    document.getElementById('modal-training').classList.remove('active');
}

// Acheter un joueur
function buyPlayer(playerId) {
    const player = playersData.find(p => p.id === playerId);
    if (!player) return;
    
    if (gameState.coins < player.value) {
        showNotification(`Pas assez de pièces! ${player.value} requis`);
        return;
    }
    
    if (gameState.players.some(p => p.id === playerId)) {
        showNotification('Vous possédez déjà ce joueur!');
        return;
    }
    
    gameState.coins -= player.value;
    gameState.players.push(player);
    
    showNotification(`${player.name} acheté pour ${player.value} pièces!`);
    updateMarketScreen();
    updateUI();
    saveGameState();
}

// Entraîner un joueur spécifique
function trainPlayer(playerId) {
    const player = gameState.team.find(p => p.id === playerId);
    if (!player) return;
    
    if (player.fatigue >= 80) {
        showNotification('Joueur trop fatigué! Repos nécessaire');
        return;
    }
    
    const cost = 500;
    if (gameState.coins < cost) {
        showNotification(`Pas assez de pièces! ${cost} requis`);
        return;
    }
    
    gameState.coins -= cost;
    player.rating += 1;
    player.fatigue += 20;
    
    showNotification(`${player.name} entraîné! +1 note`);
    updateTeamScreen();
    updateUI();
    saveGameState();
}

// Vérifier le niveau supérieur
function checkLevelUp() {
    const xpForNextLevel = gameState.season.level * 100;
    if (gameState.season.xp >= xpForNextLevel) {
        gameState.season.level++;
        gameState.season.xp -= xpForNextLevel;
        showNotification(`Niveau ${gameState.season.level} atteint! Récompenses débloquées!`);
        
        // Récompenses de niveau
        gameState.coins += 500;
        gameState.gems += 10;
        
        updateUI();
        saveGameState();
    }
}

// Ouvrir une modale
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// Mettre à jour l'onglet du battle pass
function updatePassTab(tabName) {
    const isVIP = tabName === 'VIP';
    document.getElementById('btn-upgrade-pass').style.display = isVIP && !gameState.battlePass.vip ? 'block' : 'none';
}

// Obtenir un joueur aléatoire
function getRandomPlayer(min, max) {
    const rating = Math.floor(Math.random() * (max - min + 1)) + min;
    const positions = ['ATK', 'MID', 'DEF', 'GK'];
    const names = ['Joueur Recrue', 'Talent Prometteur', 'Espoir Local', 'Vétéran Expérimenté'];
    
    return {
        id: Date.now(),
        name: names[Math.floor(Math.random() * names.length)],
        position: positions[Math.floor(Math.random() * positions.length)],
        rating: rating,
        value: rating * 50,
        fatigue: 0,
        contract: 20,
        rarity: rating >= 90 ? 'legendary' : rating >= 85 ? 'epic' : 'rare'
    };
}

// Obtenir l'icône de position
function getPositionIcon(position) {
    switch(position) {
        case 'ATK': return '⚽';
        case 'MID': return '🎯';
        case 'DEF': return '🛡️';
        case 'GK': return '🧤';
        default: return '👤';
    }
}

// Obtenir la couleur de rareté
function getRarityColor(rarity) {
    switch(rarity) {
        case 'legendary': return 'rgba(255, 215, 0, 0.2)';
        case 'epic': return 'rgba(168, 85, 247, 0.2)';
        case 'rare': return 'rgba(56, 189, 248, 0.2)';
        default: return 'rgba(148, 163, 184, 0.2)';
    }
}

// Obtenir l'icône d'événement
function getEventIcon(type) {
    switch(type) {
        case 'tournament': return '🏆';
        case 'daily': return '📅';
        case 'special': return '🎯';
        default: return '📢';
    }
}

// Afficher une notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.querySelector('.notification-content').textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Simuler un marché dynamique (rafraîchir les prix)
setInterval(() => {
    // Changer aléatoirement la valeur de certains joueurs
    playersData.forEach(player => {
        if (Math.random() > 0.7) {
            const change = Math.random() > 0.5 ? 1 : -1;
            const amount = Math.floor(Math.random() * 100) + 50;
            player.value = Math.max(1000, player.value + (change * amount));
        }
    });
    
    // Mettre à jour l'affichage du marché si visible
    if (document.getElementById('screen-market').classList.contains('active')) {
        updateMarketScreen(document.querySelector('.filter-btn.active').textContent);
    }
}, 30000); // Toutes les 30 secondes

// Réduire la fatigue des joueurs avec le temps
setInterval(() => {
    gameState.team.forEach(player => {
        if (player.fatigue > 0) {
            player.fatigue = Math.max(0, player.fatigue - 5);
        }
    });
    
    if (document.getElementById('screen-team').classList.contains('active')) {
        updateTeamScreen();
    }
    
    saveGameState();
}, 60000); // Toutes les minutes