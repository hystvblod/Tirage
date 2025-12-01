(function () {
  const STORAGE_KEY = "fdjGrids_v1";

  const hasLocalStorage = (function () {
    try {
      const testKey = "__fdj_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  })();

  const defaultHistory = {
    euromillions: [],
    eurodreams: [],
    keno: [],
    crescendo: [],
    loto: []
  };

  function loadHistory() {
    if (!hasLocalStorage) return { ...defaultHistory };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultHistory };
      const parsed = JSON.parse(raw);
      return {
        ...defaultHistory,
        ...parsed
      };
    } catch (e) {
      console.warn("Impossible de charger l'historique :", e);
      return { ...defaultHistory };
    }
  }

  function saveHistory(history) {
    if (!hasLocalStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("Impossible d'enregistrer l'historique :", e);
    }
  }

  function generateUniqueNumbers(count, min, max) {
    const nums = [];
    const range = max - min + 1;
    if (count > range) {
      throw new Error("Impossible de générer autant de numéros uniques sur cette plage.");
    }
    while (nums.length < count) {
      const n = Math.floor(Math.random() * range) + min;
      if (!nums.includes(n)) {
        nums.push(n);
      }
    }
    nums.sort(function (a, b) { return a - b; });
    return nums;
  }

  const GAMES = {
    euromillions: {
      id: "euromillions",
      name: "EuroMillions",
      logo: "asset/euromillions.png",
      description: "5 numéros de 1 à 50 + 2 étoiles de 1 à 12.",
      rulesText: "Tu cochais normalement 5 numéros parmi 50 et 2 étoiles parmi 12.",
      infoMain: "5 numéros · 1 à 50",
      infoSpecial: "2 étoiles · 1 à 12",
      generateGrid: function () {
        const numbers = generateUniqueNumbers(5, 1, 50);
        const stars = generateUniqueNumbers(2, 1, 12);
        return { numbers: numbers, stars: stars };
      },
      formatGrid: function (g) {
        const main = (g.numbers || []).join(" - ");
        const stars = (g.stars || []).join(" - ");
        return '<span class="main">' + main + '</span> <span class="special">★ ' + stars + '</span>';
      }
    },
    eurodreams: {
      id: "eurodreams",
      name: "EuroDreams",
      logo: "asset/eurodreams.png",
      description: "6 numéros de 1 à 40 + 1 N°Dream de 1 à 5.",
      rulesText: "Tu choisis 6 numéros parmi 40 et 1 numéro Dream parmi 5.",
      infoMain: "6 numéros · 1 à 40",
      infoSpecial: "1 N°Dream · 1 à 5",
      generateGrid: function () {
        const numbers = generateUniqueNumbers(6, 1, 40);
        const dream = generateUniqueNumbers(1, 1, 5)[0];
        return { numbers: numbers, dream: dream };
      },
      formatGrid: function (g) {
        const main = (g.numbers || []).join(" - ");
        const dream = g.dream;
        return '<span class="main">' + main + '</span> <span class="special">Dream ' + dream + '</span>';
      }
    },
    keno: {
      id: "keno",
      name: "Keno",
      logo: "asset/keno.png",
      description: "10 numéros de 1 à 56 (nouvelle grille Keno, ici on fixe à 10 numéros).",
      rulesText: "Nouvelle formule : grille de 56 numéros, tu peux cocher de 4 à 10 numéros. Ici on génère toujours 10 numéros.",
      infoMain: "10 numéros · 1 à 56",
      infoSpecial: "Pas de numéro spécial dans ce générateur.",
      generateGrid: function () {
        const numbers = generateUniqueNumbers(10, 1, 56);
        return { numbers: numbers };
      },
      formatGrid: function (g) {
        const main = (g.numbers || []).join(" - ");
        return '<span class="main">' + main + '</span>';
      }
    },
    crescendo: {
      id: "crescendo",
      name: "Crescendo",
      logo: "asset/crescendo.png",
      description: "10 numéros de 1 à 25.",
      rulesText: "Grille simple : 10 numéros de 1 à 25.",
      infoMain: "10 numéros · 1 à 25",
      infoSpecial: "Pas de lettre gérée ici.",
      generateGrid: function () {
        const numbers = generateUniqueNumbers(10, 1, 25);
        return { numbers: numbers };
      },
      formatGrid: function (g) {
        const main = (g.numbers || []).join(" - ");
        return '<span class="main">' + main + '</span>';
      }
    },
    loto: {
      id: "loto",
      name: "Loto",
      logo: "asset/loto.png",
      description: "5 numéros de 1 à 49 + 1 numéro Chance de 1 à 10.",
      rulesText: "Grille simple : 5 numéros parmi 49 + 1 numéro Chance parmi 10.",
      infoMain: "5 numéros · 1 à 49",
      infoSpecial: "1 n° Chance · 1 à 10",
      generateGrid: function () {
        const numbers = generateUniqueNumbers(5, 1, 49);
        const chance = generateUniqueNumbers(1, 1, 10)[0];
        return { numbers: numbers, chance: chance };
      },
      formatGrid: function (g) {
        const main = (g.numbers || []).join(" - ");
        const chance = g.chance;
        return '<span class="main">' + main + '</span> <span class="special">Chance ' + chance + '</span>';
      }
    }
  };

  let currentGameId = "euromillions";
  let history = loadHistory();

  // ---------- FIRESTORE : synchro  ----------
  const FIREBASE_ENABLED = (typeof window !== "undefined") && (typeof db !== "undefined");

  function syncGridToFirestore(gameId, grid) {
    if (!FIREBASE_ENABLED) return;
    try {
      db.collection("grilles")
        .add({
          gameId: gameId,
            createdAt: firebase.firestore.Timestamp.fromMillis(grid.createdAt || Date.now()),
          numbers: grid.numbers || [],
          stars: grid.stars ? grid.stars : null,
          dream: (typeof grid.dream !== "undefined") ? grid.dream : null,
          chance: (typeof grid.chance !== "undefined") ? grid.chance : null
        })
        .then(function () {
          grid.synced = true;
          saveHistory(history);
        })
        .catch(function (error) {
          console.error("Erreur Firestore (addDoc) :", error);
        });
    } catch (e) {
      console.error("Erreur Firestore (exception) :", e);
    }
  }

  function syncExistingHistory() {
    if (!FIREBASE_ENABLED) return;
    try {
      Object.keys(history).forEach(function (gameId) {
        (history[gameId] || []).forEach(function (grid) {
          if (!grid.synced) {
            syncGridToFirestore(gameId, grid);
          }
        });
      });
    } catch (e) {
      console.warn("Sync historique Firestore impossible :", e);
    }
  }
  // ---------- FIN FIRESTORE ----------

  // DOM
  const gameTabs = document.getElementById("gameTabs");
  const gameTitle = document.getElementById("gameTitle");
  const gameLogo = document.getElementById("gameLogo");
  const gameDescription = document.getElementById("gameDescription");
  const rulesText = document.getElementById("rulesText");
  const infoMain = document.getElementById("infoMain");
  const infoSpecial = document.getElementById("infoSpecial");
  const hintText = document.getElementById("hintText");

  const gridCountInput = document.getElementById("gridCount");
  const generateBtn = document.getElementById("generateBtn");
  const currentGridsContainer = document.getElementById("currentGrids");
  const historyGridsContainer = document.getElementById("historyGrids");

  function setActiveGame(gameId) {
    if (!GAMES[gameId]) {
      console.warn("Jeu inconnu :", gameId);
      return;
    }
    currentGameId = gameId;

    const buttons = gameTabs.querySelectorAll(".game-tab");
    buttons.forEach(function (btn) {
      const id = btn.getAttribute("data-game");
      btn.classList.toggle("active", id === currentGameId);
    });

    const game = GAMES[currentGameId];
    gameTitle.textContent = game.name;
    if (gameLogo && game.logo) {
      gameLogo.src = game.logo;
      gameLogo.alt = game.name;
    }
    gameDescription.textContent = game.description;
    rulesText.textContent = game.rulesText;
    infoMain.textContent = game.infoMain;
    infoSpecial.textContent = game.infoSpecial;

    if (currentGameId === "keno") {
      hintText.textContent = "Ici on génère toujours 10 numéros sur 56, comme dans la config maximale de la nouvelle grille Keno.";
    } else if (currentGameId === "crescendo") {
      hintText.textContent = "Ici on ne gère que les 10 numéros. La lettre éventuelle du ticket réel n’est pas prise en compte.";
    } else {
      hintText.textContent = "Les grilles sont générées au hasard, sans stratégie, juste pour t’éviter de remplir à la main.";
    }

    renderCurrentGrids([]);
    renderHistory();
  }

  function renderCurrentGrids(grids) {
    currentGridsContainer.innerHTML = "";
    if (!grids || grids.length === 0) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Pas encore de grille générée pour ce jeu.";
      currentGridsContainer.appendChild(p);
      return;
    }

    grids.forEach(function (entry, index) {
      const game = GAMES[currentGameId];
      const card = document.createElement("div");
      card.className = "grid-card";

      const label = document.createElement("span");
      label.className = "grid-label";
      label.textContent = "#" + (index + 1);

      const text = document.createElement("span");
      text.className = "grid-text";
      text.innerHTML = game.formatGrid(entry);

      const dateSpan = document.createElement("span");
      dateSpan.className = "grid-date";
      const date = new Date(entry.createdAt || Date.now());
      dateSpan.textContent = date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      card.appendChild(label);
      card.appendChild(text);
      card.appendChild(dateSpan);

      currentGridsContainer.appendChild(card);
    });
  }

  function renderHistory() {
    historyGridsContainer.innerHTML = "";
    const list = history[currentGameId] || [];
    if (list.length === 0) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Aucun historique enregistré pour ce jeu pour l’instant.";
      historyGridsContainer.appendChild(p);
      return;
    }

    const last = list.slice(-20).reverse();

    last.forEach(function (entry, index) {
      const game = GAMES[currentGameId];
      const card = document.createElement("div");
      card.className = "grid-card small";

      const label = document.createElement("span");
      label.className = "grid-label";
      label.textContent = "H-" + (last.length - index);

      const text = document.createElement("span");
      text.className = "grid-text";
      text.innerHTML = game.formatGrid(entry);

      const dateSpan = document.createElement("span");
      dateSpan.className = "grid-date";
      if (entry.createdAt) {
        const date = new Date(entry.createdAt);
        dateSpan.textContent = date.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      } else {
        dateSpan.textContent = "";
      }

      card.appendChild(label);
      card.appendChild(text);
      card.appendChild(dateSpan);

      historyGridsContainer.appendChild(card);
    });
  }

  function handleGenerate() {
    const game = GAMES[currentGameId];
    if (!game) return;

    let count = parseInt(gridCountInput.value, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > 20) count = 20;
    gridCountInput.value = String(count);

    const now = Date.now();
    const newGrids = [];

    for (let i = 0; i < count; i++) {
      const gridData = game.generateGrid();
      const entry = {
        numbers: gridData.numbers || [],
        stars: gridData.stars,
        dream: gridData.dream,
        chance: gridData.chance,
        createdAt: now + i,
        synced: false
      };
      newGrids.push(entry);
    }

    if (!history[currentGameId]) {
      history[currentGameId] = [];
    }
    history[currentGameId].push.apply(history[currentGameId], newGrids);

    if (history[currentGameId].length > 300) {
      history[currentGameId] = history[currentGameId].slice(-300);
    }

    saveHistory(history);

    newGrids.forEach(function (entry) {
      syncGridToFirestore(currentGameId, entry);
    });

    renderCurrentGrids(newGrids);
    renderHistory();
  }

  function initEvents() {
    gameTabs.addEventListener("click", function (evt) {
      const btn = evt.target.closest(".game-tab");
      if (!btn) return;
      const gameId = btn.getAttribute("data-game");
      if (!gameId) return;
      setActiveGame(gameId);
    });

    generateBtn.addEventListener("click", handleGenerate);

    gridCountInput.addEventListener("keydown", function (evt) {
      if (evt.key === "Enter") {
        handleGenerate();
      }
    });
  }

  function init() {
    initEvents();
    setActiveGame(currentGameId);
    // envoie les anciennes grilles non encore synchronisées vers Firestore
    syncExistingHistory();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
