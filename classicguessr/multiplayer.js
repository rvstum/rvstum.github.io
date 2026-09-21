const FIREBASE_VERSION = "10.12.2";
const LOBBY_COLLECTION = "classicGuessrLobbies";
// Spectator map views stream through the Realtime Database (built for rapid small updates);
// lobbies, players and results stay in Firestore.
const REALTIME_DATABASE_URL = "https://benchmark-5a89f-default-rtdb.firebaseio.com";
const SPECTATE_PATH = "classicGuessrSpectate";
const PRESENCE_PATH = "classicGuessrPresence";
const LOBBY_CODE_LENGTH = 6;
const LOBBY_LIFETIME_MS = 6 * 60 * 60 * 1000;
// Lobbies that were never cleaned up by leaving (closed tab, crash, failed delete) are removed by
// whoever next opens multiplayer. Must match the grace period in firestore.rules.
const STALE_LOBBY_GRACE_MS = 12 * 60 * 60 * 1000;
const STALE_LOBBY_SWEEP_LIMIT = 5;

async function sweepStaleLobbies(backend) {
  try {
    const { fs, db } = backend;
    const stale = await fs.getDocs(fs.query(
      fs.collection(db, LOBBY_COLLECTION),
      fs.where("expiresAtMs", "<", Date.now() - STALE_LOBBY_GRACE_MS),
      fs.limit(STALE_LOBBY_SWEEP_LIMIT),
    ));
    for (const lobbyDoc of stale.docs) {
      const players = await fs.getDocs(fs.collection(db, LOBBY_COLLECTION, lobbyDoc.id, "players"));
      const batch = fs.writeBatch(db);
      players.docs.forEach((entry) => batch.delete(entry.ref));
      batch.delete(lobbyDoc.ref);
      await batch.commit();
    }
  } catch (error) {
    console.warn("Could not clear stale lobbies", error);
  }
}
const CARD_PRESS_MS = 70;
// How often the local map view is sent to spectators; the spectator side glides between updates.
const VIEW_WRITE_MS = 160;
const VIEW_WRITE_REALTIME_MS = 50;
const COMPETITIVE_RESPONSE_MS = 10 * 1000;
const ROUND_CLOCK_LEAD_MS = 750;
const SHARED_COUNTDOWN_MS = 3 * 1000;
// Every client starts the round reveal at the same server-derived instant. The lead has to
// cover Firestore propagation, and the damage lead additionally covers the map focus
// animation that runs first (ANSWER_FOCUS_MP_DURATION_MS in app.js) plus a settle gap.
const ROUND_REVEAL_LEAD_MS = 250;
const ANSWER_FOCUS_MP_DURATION_MS = 1600;
const ROUND_DAMAGE_LEAD_MS = ROUND_REVEAL_LEAD_MS + ANSWER_FOCUS_MP_DURATION_MS + 250;
// Grace after the response countdown ends for the forced locks to land before the round resolves.
const DEADLINE_RESOLVE_GRACE_MS = 250;
const PLAYER_NAME_STORAGE_KEY = "classicguessr-player-name";
// Set while hosting a lobby. A refresh closes the lobby, so the reloaded page returns the host to
// the multiplayer host/join page instead of the main menu.
const HOSTING_STORAGE_KEY = "classicguessr-was-hosting";

function setHostingFlag(isHosting) {
  try {
    if (isHosting) sessionStorage.setItem(HOSTING_STORAGE_KEY, "1");
    else sessionStorage.removeItem(HOSTING_STORAGE_KEY);
  } catch { /* storage unavailable */ }
}
const PRESENCE_HEARTBEAT_MS = 12 * 1000;
// The reaper polls faster than the heartbeat so a disconnect is noticed promptly once the
// timeout lapses. The timeout only needs to tolerate a few missed beats now that false
// "host has left" kicks are handled by the snapshot cache guard rather than a long timeout.
const PRESENCE_REAPER_MS = 5 * 1000;
const SERVER_VERIFY_AFTER_MS = 20 * 1000;
const PRESENCE_TIMEOUT_MS = 45 * 1000;
const PRESENCE_HOST_TIMEOUT_MS = 3 * 60 * 1000;
// Timers reach the game only when the lobby doc changes, so a single dropped dispatch used
// to mean no countdown for the rest of the round. Re-publishing the authoritative state on a
// tick makes every shared timer self-healing instead of depending on one lucky event.
const MATCH_RECONCILE_MS = 1000;
const SPECTATE_START_DELAY_MS = 600;
const DEFAULT_TEAM_HEALTH = 5000;
const TEAM_HEALTH_OPTIONS = [5000, 7500, 10000, 20000];

function lobbyMaxHealth(lobby = session.lobby) {
  const value = Number(lobby?.settings?.health);
  return TEAM_HEALTH_OPTIONS.includes(value) ? value : DEFAULT_TEAM_HEALTH;
}

// A hidden tab throttles setInterval to roughly once a second, then once a minute after a
// few minutes. That stalls presence heartbeats and, on the host, the round resolution that
// every other player is waiting on. Worker timers are exempt from that throttling, so the
// game clock keeps its real cadence while the tab sits in the background.
const backgroundTimers = createBackgroundTimers();

function createBackgroundTimers() {
  const callbacks = new Map();
  const fallbacks = new Map();
  let worker = null;
  let nextId = 1;

  try {
    const source = "const t={};onmessage=(e)=>{const d=e.data||{};"
      + "if(d.type==='start'){clearInterval(t[d.id]);t[d.id]=setInterval(()=>postMessage(d.id),d.interval);}"
      + "else if(d.type==='stop'){clearInterval(t[d.id]);delete t[d.id];}};";
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = (event) => callbacks.get(event.data)?.();
  } catch (error) {
    worker = null;
  }

  return {
    setInterval(callback, intervalMs) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      if (worker) worker.postMessage({ type: "start", id, interval: intervalMs });
      else fallbacks.set(id, window.setInterval(callback, intervalMs));
      return id;
    },
    clearInterval(id) {
      if (!id || !callbacks.has(id)) return;
      callbacks.delete(id);
      if (worker) worker.postMessage({ type: "stop", id });
      if (fallbacks.has(id)) {
        window.clearInterval(fallbacks.get(id));
        fallbacks.delete(id);
      }
    },
  };
}

const firebaseConfig = {
  apiKey: "AIzaSyAiZHVFIXe8LrxGS-TklX-pIqC135IpIbY",
  authDomain: "benchmark-5a89f.firebaseapp.com",
  projectId: "benchmark-5a89f",
  storageBucket: "benchmark-5a89f.appspot.com",
  messagingSenderId: "1001899133728",
  appId: "1:1001899133728:web:73b7dc8f8814533020e545",
  measurementId: "G-CCRXR4PKK2",
};

const dom = {
  hostButton: document.getElementById("hostMultiplayerButton"),
  joinButton: document.getElementById("joinMultiplayerButton"),
  connectionStatus: document.getElementById("multiplayerConnectionStatus"),
  hostView: document.getElementById("multiplayerHostView"),
  hostCode: document.getElementById("hostLobbyCode"),
  hostLink: document.getElementById("hostLobbyLink"),
  copyCodeButton: document.getElementById("copyLobbyCodeButton"),
  copyLinkButton: document.getElementById("copyLobbyLinkButton"),
  guestCode: document.getElementById("guestLobbyCode"),
  guestLink: document.getElementById("guestLobbyLink"),
  copyGuestCodeButton: document.getElementById("copyGuestLobbyCodeButton"),
  copyGuestLinkButton: document.getElementById("copyGuestLobbyLinkButton"),
  visibilityButtons: [...document.querySelectorAll("[data-visibility-target]")],
  hostPlayers: document.getElementById("hostLobbyPlayers"),
  hostPlayerCount: document.getElementById("hostLobbyPlayerCount"),
  hostBackButton: document.getElementById("hostLobbyBackButton"),
  hostStartButton: document.getElementById("hostLobbyStartButton"),
  lobbyTimerSetting: document.getElementById("lobbyTimerSetting"),
  lobbyRoundsSetting: document.getElementById("lobbyRoundsSetting"),
  lobbyHealthSetting: document.getElementById("lobbyHealthSetting"),
  lobbyTimerButtons: [...document.querySelectorAll("[data-lobby-seconds]")],
  lobbyRoundButtons: [...document.querySelectorAll("[data-lobby-rounds]")],
  competitiveSwitch: document.getElementById("competitiveModeSwitch"),
  lobbyHealthButtons: [...document.querySelectorAll("[data-lobby-health]")],
  guestLobbyTimerButtons: [...document.querySelectorAll("[data-guest-lobby-seconds]")],
  guestLobbyRoundButtons: [...document.querySelectorAll("[data-guest-lobby-rounds]")],
  guestLobbyHealthButtons: [...document.querySelectorAll("[data-guest-lobby-health]")],
  guestCompetitiveSwitch: document.getElementById("guestCompetitiveModeSwitch"),
  joinView: document.getElementById("multiplayerJoinView"),
  joinForm: document.getElementById("joinLobbyForm"),
  joinInput: document.getElementById("joinLobbyCodeInput"),
  joinSubmitButton: document.getElementById("joinLobbySubmitButton"),
  joinStatus: document.getElementById("joinLobbyStatus"),
  joinBackButton: document.getElementById("joinLobbyBackButton"),
  guestView: document.getElementById("multiplayerGuestView"),
  guestPlayers: document.getElementById("guestLobbyPlayers"),
  guestPlayerCount: document.getElementById("guestLobbyPlayerCount"),
  guestLeaveButton: document.getElementById("guestLobbyLeaveButton"),
  standings: document.getElementById("multiplayerStandings"),
  removeModal: document.getElementById("lobbyRemoveModal"),
  nameModal: document.getElementById("lobbyNameModal"),
  nameForm: document.getElementById("lobbyNameForm"),
  nameInput: document.getElementById("lobbyNameInput"),
  removePlayerName: document.getElementById("lobbyRemovePlayerName"),
  removeCancelButton: document.getElementById("lobbyRemoveCancelButton"),
  removeConfirmButton: document.getElementById("lobbyRemoveConfirmButton"),
  switchModal: document.getElementById("lobbySwitchModal"),
  switchRequesterName: document.getElementById("lobbySwitchRequesterName"),
  switchNoButton: document.getElementById("lobbySwitchNoButton"),
  switchYesButton: document.getElementById("lobbySwitchYesButton"),
  messageModal: document.getElementById("lobbyMessageModal"),
  messageText: document.getElementById("lobbyMessageText"),
  messageCloseButton: document.getElementById("lobbyMessageCloseButton"),
  usernameInputs: [document.getElementById("hostLobbyUsername"), document.getElementById("guestLobbyUsername")].filter(Boolean),
  usernameButtons: [...document.querySelectorAll("[data-username-target]")],
};

const session = {
  backend: null,
  backendPromise: null,
  lobbyCode: "",
  role: "",
  lobby: null,
  players: [],
  lobbyReady: false,
  unsubscribeLobby: null,
  unsubscribePlayers: null,
  busy: false,
  gameStarted: false,
  waitingForRematch: false,
  suppressModePickerCleanup: false,
  switchBusy: false,
  switchResponseBusy: false,
  currentRound: 0,
  resolvingRound: false,
  removePlayerId: "",
  incomingSwitchRequesterId: "",
  deadlineWriteRound: -1,
  roundClockWriteRound: -1,
  deadlineResolveHandle: 0,
  guessNoticeKeys: new Set(),
  forcedExitHandled: false,
  viewWriteHandle: 0,
  viewStates: {},
  lastServerSnapshotMs: 0,
  serverVerifyBusy: false,
  spectatedOpponent: null,
  spectateEligibleSinceMs: 0,
  spectateStartHandle: 0,
  spectateDeadlineHandle: 0,
  unsubscribeViews: null,
  viewDisconnectSet: false,
  pendingViewState: null,
  lastViewSignature: "",
  serverClockOffsetMs: null,
  presenceHeartbeatHandle: 0,
  presenceReaperHandle: 0,
  matchReconcileHandle: 0,
  idToken: "",
  slotReleased: false,
  rematchReadyWriting: false,
  presenceHostCheckBusy: false,
  departedPlayerIds: new Set(),
};

bindEvents();
openLobbyFromInviteLink();

function getMenuApi() {
  return window.ClassicGuessrMenu;
}

function getGameApi() {
  return window.ClassicGuessrGame;
}

function setStatus(element, message = "", isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function friendlyError(error) {
  const code = String(error?.code || "");
  if (code.includes("auth/operation-not-allowed")) {
    return "Online play needs Anonymous sign-in enabled in Firebase Authentication.";
  }
  if (code.includes("unavailable") || code.includes("network")) {
    return "The lobby service could not be reached. Check your connection and try again.";
  }
  return error?.message || "Something went wrong while connecting to the lobby.";
}

async function ensureBackend() {
  if (session.backend) return session.backend;
  if (session.backendPromise) return session.backendPromise;

  session.backendPromise = (async () => {
    const [appModule, authModule, firestoreModule, realtimeModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
      // Optional: spectating falls back to Firestore if this fails to load.
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-database.js`).catch(() => null),
    ]);
    const app = appModule.getApps().length
      ? appModule.getApp()
      : appModule.initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);
    if (!auth.currentUser) {
      await authModule.signInAnonymously(auth);
    }
    // Auto-detect lets the SDK fall back to long polling when the streaming connection is blocked or
    // flaky (a common cause of very slow joins and listeners that never leave the local cache).
    let db;
    try {
      db = firestoreModule.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    } catch (error) {
      db = firestoreModule.getFirestore(app);
    }
    let rt = null;
    let rtdb = null;
    try {
      if (realtimeModule) {
        rt = realtimeModule;
        rtdb = realtimeModule.getDatabase(app, REALTIME_DATABASE_URL);
        // getDatabase opens its socket straight away. Stay offline until a lobby actually opens
        // (subscribeToLobby goes online), otherwise every visitor holds a connection slot that is
        // only ever released by leaving a lobby they may never have joined.
        realtimeModule.goOffline(rtdb);
      }
    } catch (error) {
      console.error("Realtime Database unavailable, spectating uses Firestore", error);
    }
    session.backend = { auth, db, fs: firestoreModule, rt, rtdb };
    sweepStaleLobbies(session.backend);
    return session.backend;
  })();

  try {
    return await session.backendPromise;
  } finally {
    session.backendPromise = null;
  }
}

function bindEvents() {
  dom.hostButton?.addEventListener("click", () => pressCard(dom.hostButton, createLobby));
  dom.joinButton?.addEventListener("click", () => pressCard(dom.joinButton, showJoinView));
  dom.hostBackButton?.addEventListener("click", async () => {
    await leaveLobby();
    getMenuApi()?.showMultiplayerView();
  });
  dom.joinBackButton?.addEventListener("click", () => {
    setStatus(dom.joinStatus);
    getMenuApi()?.showMultiplayerView();
  });
  dom.guestLeaveButton?.addEventListener("click", async () => {
    await leaveLobby();
    getMenuApi()?.showMultiplayerView();
  });
  dom.joinForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    joinLobby(dom.joinInput.value);
  });
  dom.joinInput?.addEventListener("input", () => {
    dom.joinInput.value = normalizeLobbyCode(dom.joinInput.value);
  });
  dom.copyCodeButton?.addEventListener("click", () => copyInvite(dom.hostCode.value, dom.copyCodeButton));
  dom.copyLinkButton?.addEventListener("click", () => copyInvite(dom.hostLink.value, dom.copyLinkButton));
  dom.copyGuestCodeButton?.addEventListener("click", () => copyInvite(dom.guestCode.value, dom.copyGuestCodeButton));
  dom.copyGuestLinkButton?.addEventListener("click", () => copyInvite(dom.guestLink.value, dom.copyGuestLinkButton));
  dom.visibilityButtons.forEach((button) => {
    button.addEventListener("click", () => setInviteVisibility(button, button.getAttribute("aria-pressed") !== "true"));
  });
  dom.lobbyTimerButtons.forEach((button) => {
    button.addEventListener("click", () => updateLobbySetting("seconds", Number(button.dataset.lobbySeconds), dom.lobbyTimerButtons, button));
  });
  dom.lobbyRoundButtons.forEach((button) => {
    button.addEventListener("click", () => updateLobbySetting("rounds", Number(button.dataset.lobbyRounds), dom.lobbyRoundButtons, button));
  });
  dom.lobbyHealthButtons.forEach((button) => {
    button.addEventListener("click", () => updateLobbySetting("health", Number(button.dataset.lobbyHealth), dom.lobbyHealthButtons, button));
  });
  dom.competitiveSwitch?.addEventListener("click", () => {
    updateCompetitiveMode(!Boolean(session.lobby?.settings?.competitive));
  });
  dom.hostStartButton?.addEventListener("click", startHostedMatch);
  dom.removeCancelButton?.addEventListener("click", closeRemovePlayerPrompt);
  dom.removeConfirmButton?.addEventListener("click", confirmRemovePlayer);
  dom.removeModal?.addEventListener("click", (event) => {
    if (event.target === dom.removeModal) closeRemovePlayerPrompt();
  });
  dom.switchNoButton?.addEventListener("click", () => respondToSwitchRequest(false));
  dom.switchYesButton?.addEventListener("click", () => respondToSwitchRequest(true));
  dom.messageCloseButton?.addEventListener("click", closeLobbyMessage);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.removeModal?.classList.contains("hidden")) closeRemovePlayerPrompt();
  });
  dom.nameForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = dom.nameInput.value.trim();
    if (!name) {
      dom.nameForm.classList.remove("is-invalid");
      void dom.nameForm.offsetWidth;
      dom.nameForm.classList.add("is-invalid");
      dom.nameInput.focus();
      return;
    }
    await commitUsername(name, false);
    dom.nameModal.classList.add("hidden");
  });
  const storedPlayerName = sessionStorage.getItem(PLAYER_NAME_STORAGE_KEY) || "";
  const savedPlayerName = /^Player (?:[1-4]|[A-Z0-9]{4})$/.test(storedPlayerName) ? "" : storedPlayerName;
  dom.usernameInputs.forEach((input) => {
    input.value = savedPlayerName;
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        dom.usernameButtons.find((button) => button.dataset.usernameTarget === input.id)?.click();
      }
    });
  });
  dom.usernameButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.usernameTarget || "");
      if (input) commitUsername(input.value, true);
    });
  });
  window.addEventListener("classicguessr:mode-picker", () => {
    if (session.lobbyCode && !session.suppressModePickerCleanup) leaveLobby();
  });
  window.addEventListener("classicguessr:multiplayer-view", () => setStatus(dom.connectionStatus));
  window.addEventListener("classicguessr:multiplayer-exit", () => leaveLobby());
  window.addEventListener("classicguessr:multiplayer-round-result", (event) => saveRoundResult(event.detail));
  window.addEventListener("classicguessr:multiplayer-finished", (event) => saveFinishedResult(event.detail));
  window.addEventListener("classicguessr:multiplayer-return-lobby", (event) => returnToMultiplayerLobby(event.detail));
  window.addEventListener("classicguessr:multiplayer-round-enter", (event) => enterMultiplayerRound(event.detail));
  window.addEventListener("classicguessr:multiplayer-round-playable", (event) => markMultiplayerRoundPlayable(event.detail));
  window.addEventListener("classicguessr:multiplayer-started", publishMatchState);
  window.addEventListener("classicguessr:multiplayer-guess-preview", (event) => saveGuessState(event.detail, false));
  window.addEventListener("classicguessr:multiplayer-guess-lock", (event) => saveGuessState(event.detail, true));
  window.addEventListener("classicguessr:multiplayer-view-preview", (event) => queueViewState(event.detail));
}

function pressCard(button, callback) {
  if (!button || button.classList.contains("is-selecting")) return;
  button.classList.add("is-selecting");
  window.setTimeout(() => {
    button.classList.remove("is-selecting");
    callback();
  }, CARD_PRESS_MS);
}

function showJoinView() {
  ensureBackend().catch(() => {}); // warm up SDK + sign-in while the user types the code
  getMenuApi()?.showJoinLobbyView();
  setStatus(dom.joinStatus);
  if (dom.joinInput) dom.joinInput.value = "";
  window.setTimeout(() => dom.joinInput?.focus(), 0);
}

async function createLobby() {
  if (session.busy) return;
  session.busy = true;
  setStatus(dom.connectionStatus);
  setCreatingLobbyOverlay(true);
  dom.hostStartButton.disabled = true;
  session.players = [];
  session.lobbyReady = false;
  renderPlayerGrid(dom.hostPlayers, 4, false);
  dom.hostPlayerCount.textContent = "Creating lobby...";
  dom.hostCode.value = "Creating...";
  dom.hostLink.value = "Creating...";
  dom.visibilityButtons.forEach((button) => setInviteVisibility(button, false));

  try {
    await leaveLobby({ preserveView: true });
    const backend = await ensureBackend();
    const code = await createUnusedLobbyCode(backend);
    const now = Date.now();
    const lobbyRef = backend.fs.doc(backend.db, LOBBY_COLLECTION, code);
    const user = backend.auth.currentUser;
    const settings = { seconds: 60, rounds: 5, challengeRevealMs: 0, competitive: false, health: DEFAULT_TEAM_HEALTH };
    const hostPlayerData = buildPlayerData(user, "host", "red", 0, now, 1);
    const lobbyData = {
      code,
      hostUid: user.uid,
      status: "waiting",
      teamMode: "2v2",
      maxPlayers: 4,
      settings,
      roundIds: [],
      redHealth: settings.health,
      blueHealth: settings.health,
      damageMultiplier: 1,
      redMultiplier: 1,
      blueMultiplier: 1,
      awaitingRematch: false,
      roundResolution: null,
      roundDeadline: null,
      roundClock: null,
      createdAt: backend.fs.serverTimestamp(),
      createdAtMs: now,
      updatedAt: backend.fs.serverTimestamp(),
      expiresAtMs: now + LOBBY_LIFETIME_MS,
    };

    session.lobbyCode = code;
    session.role = "host";
    session.lobby = lobbyData;
    session.players = [{ id: user.uid, ...hostPlayerData }];
    session.gameStarted = false;
    session.waitingForRematch = false;
    session.forcedExitHandled = false;
    dom.hostCode.value = code;
    dom.hostLink.value = buildLobbyLink(code);
    setHostingFlag(true);
    renderLobbyPlayers();
    syncUsernameInputs();

    await backend.fs.setDoc(lobbyRef, lobbyData);
    await backend.fs.setDoc(playerRef(backend, code, user.uid), hostPlayerData);

    session.lobbyReady = true;
    setStatus(dom.connectionStatus);
    renderLobbyPlayers();
    subscribeToLobby();
    getMenuApi()?.showHostLobbyView();
    openNamePrompt();
  } catch (error) {
    console.error(error);
    getMenuApi()?.showHostLobbyView();
    session.lobbyReady = false;
    dom.hostPlayerCount.textContent = "Lobby creation failed";
    dom.hostCode.value = "Unavailable";
    dom.hostLink.value = "Unavailable";
    setStatus(dom.connectionStatus, friendlyError(error), true);
  } finally {
    setCreatingLobbyOverlay(false);
    session.busy = false;
  }
}

function setCreatingLobbyOverlay(visible, text = "Creating Lobby...") {
  let overlay = document.getElementById("creatingLobbyOverlay");
  if (!overlay && visible) {
    overlay = document.createElement("div");
    overlay.id = "creatingLobbyOverlay";
    overlay.className = "creating-lobby-overlay";
    overlay.setAttribute("role", "status");
    overlay.innerHTML = '<p class="creating-lobby-text">Creating Lobby...</p><div class="creating-lobby-spinner"></div>';
    document.body.appendChild(overlay);
  }
  if (overlay) {
    const label = overlay.querySelector(".creating-lobby-text");
    if (label) label.textContent = text;
    overlay.hidden = !visible;
  }
}

async function createUnusedLobbyCode(backend) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateLobbyCode();
    const snapshot = await backend.fs.getDoc(backend.fs.doc(backend.db, LOBBY_COLLECTION, code));
    if (!snapshot.exists()) return code;
  }
  throw new Error("Could not reserve a lobby code. Please try again.");
}

function generateLobbyCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(LOBBY_CODE_LENGTH);
  crypto.getRandomValues(values);
  return [...values].map((value) => alphabet[value % alphabet.length]).join("");
}

async function joinLobby(rawCode) {
  if (session.busy) return;
  const code = normalizeLobbyCode(rawCode);
  if (code.length !== LOBBY_CODE_LENGTH) {
    setStatus(dom.joinStatus, "Enter the complete six-character lobby code.", true);
    return;
  }

  session.busy = true;
  dom.joinSubmitButton.disabled = true;
  setStatus(dom.joinStatus, "Joining lobby...");

  try {
    // Only wait on leaving when there is a lobby to leave; load the backend alongside it.
    const [backend] = await Promise.all([
      ensureBackend(),
      session.lobbyCode ? leaveLobby({ preserveView: true }) : Promise.resolve(),
    ]);
    const lobbyRef = backend.fs.doc(backend.db, LOBBY_COLLECTION, code);
    const playersRef = backend.fs.collection(backend.db, LOBBY_COLLECTION, code, "players");
    const [lobbySnapshot, playerSnapshot] = await Promise.all([
      backend.fs.getDoc(lobbyRef),
      backend.fs.getDocs(playersRef),
    ]);
    if (!lobbySnapshot.exists()) throw new Error("That lobby could not be found.");
    const lobby = lobbySnapshot.data();
    if (lobby.status !== "waiting") throw new Error("That match has already started.");
    if (Number(lobby.expiresAtMs) < Date.now()) throw new Error("That lobby invite has expired.");

    const existingPlayers = playerSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    const user = backend.auth.currentUser;
    const alreadyJoined = existingPlayers.some((player) => player.id === user.uid);
    if (!alreadyJoined && existingPlayers.length >= Number(lobby.maxPlayers || 2)) {
      throw new Error("That lobby is full.");
    }

    let confirmedPlayers = existingPlayers;
    if (!alreadyJoined) {
      const occupiedSlots = new Set(existingPlayers.map((player) => Number(player.slot)));
      const slot = [2, 1, 3, 0].find((candidate) => !occupiedSlots.has(candidate));
      const guestPlayerData = buildPlayerData(user, "guest", slot >= 2 ? "blue" : "red", slot, Date.now(), existingPlayers.length + 1);
      guestPlayerData.rematchReady = Boolean(lobby.awaitingRematch);
      await backend.fs.setDoc(playerRef(backend, code, user.uid), guestPlayerData);
      const capacityCheck = await backend.fs.getDocs(playersRef);
      if (capacityCheck.size > Number(lobby.maxPlayers || 2)) {
        await backend.fs.deleteDoc(playerRef(backend, code, user.uid));
        throw new Error("That lobby filled up while you were joining.");
      }
      confirmedPlayers = capacityCheck.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    }

    session.lobbyCode = code;
    session.role = lobby.hostUid === user.uid ? "host" : "guest";
    session.lobby = lobby;
    session.players = confirmedPlayers.sort((left, right) => Number(left.joinedAtMs || 0) - Number(right.joinedAtMs || 0));
    session.lobbyReady = true;
    session.gameStarted = false;
    session.waitingForRematch = false;
    session.forcedExitHandled = false;
    updateAddressBar(code);
    if (session.role === "host") {
      dom.hostCode.value = code;
      dom.hostLink.value = buildLobbyLink(code);
      dom.visibilityButtons.forEach((button) => setInviteVisibility(button, false));
      getMenuApi()?.showHostLobbyView();
    } else {
      dom.guestCode.value = code;
      dom.guestLink.value = buildLobbyLink(code);
      dom.visibilityButtons.forEach((button) => setInviteVisibility(button, false));
      getMenuApi()?.showGuestLobbyView();
    }
    renderLobbyPlayers();
    syncUsernameInputs();
    subscribeToLobby();
    setStatus(dom.joinStatus);
    openNamePrompt();
  } catch (error) {
    console.error(error);
    setStatus(dom.joinStatus, friendlyError(error), true);
  } finally {
    session.busy = false;
    dom.joinSubmitButton.disabled = false;
  }
}

function buildPlayerData(user, role, team, slot, joinedAtMs, playerNumber) {
  return {
    uid: user.uid,
    name: getPlayerName(user, playerNumber),
    role,
    team,
    slot,
    switchRequest: null,
    switchAccepted: null,
    guessState: null,
    viewState: null,
    playableRoundIndex: -1,
    score: 0,
    roundIndex: 0,
    finished: false,
    joinedAtMs,
    updatedAtMs: joinedAtMs,
  };
}

function getPlayerName(user, playerNumber = 1) {
  if (user.displayName?.trim()) return user.displayName.trim().slice(0, 24);
  let name = sessionStorage.getItem(PLAYER_NAME_STORAGE_KEY);
  if (!name || /^Player (?:[1-4]|[A-Z0-9]{4})$/.test(name)) {
    name = `Player ${Math.max(1, Math.min(4, Number(playerNumber) || 1))}`;
    sessionStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
  }
  return name;
}

function openNamePrompt() {
  if (!dom.nameModal) return;
  dom.nameInput.value = "";
  dom.nameForm.classList.remove("is-invalid");
  dom.nameModal.classList.remove("hidden");
  window.setTimeout(() => dom.nameInput.focus(), 50);
}

async function commitUsername(rawName, restoreIfEmpty) {
  const backend = session.backend;
  const uid = backend?.auth.currentUser?.uid;
  const ownPlayer = session.players.find((player) => player.id === uid);
  let name = String(rawName || "").trim().replace(/\s+/g, " ").slice(0, 24);
  if (!name) {
    name = ownPlayer?.name || (backend?.auth.currentUser ? getPlayerName(backend.auth.currentUser) : "");
    if (restoreIfEmpty) dom.usernameInputs.forEach((input) => { input.value = name; });
    return;
  }
  sessionStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
  dom.usernameInputs.forEach((input) => {
    if (input !== document.activeElement) input.value = name;
  });
  if (!backend || !uid || !session.lobbyCode || ownPlayer?.name === name) return;
  try {
    await backend.fs.setDoc(playerRef(backend, session.lobbyCode, uid), {
      name,
      updatedAtMs: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error("Could not update lobby username", error);
  }
}

function syncUsernameInputs() {
  const uid = session.backend?.auth.currentUser?.uid;
  const ownPlayer = session.players.find((player) => player.id === uid);
  if (!ownPlayer?.name) return;
  dom.usernameInputs.forEach((input) => {
    if (input !== document.activeElement) input.value = ownPlayer.name;
  });
}

function playerRef(backend, code, uid) {
  return backend.fs.doc(backend.db, LOBBY_COLLECTION, code, "players", uid);
}

function subscribeToLobby() {
  stopSubscriptions();
  const backend = session.backend;
  const code = session.lobbyCode;
  if (!backend || !code) return;

  const lobbyRef = backend.fs.doc(backend.db, LOBBY_COLLECTION, code);
  const playersRef = backend.fs.collection(backend.db, LOBBY_COLLECTION, code, "players");
  session.unsubscribeLobby = backend.fs.onSnapshot(lobbyRef, (snapshot) => {
    if (!snapshot.exists()) {
      // A cold local cache reports the doc as missing before the server replies.
      // Only a server-confirmed absence means the lobby is really gone.
      if (snapshot.metadata.fromCache) return;
      setCreatingLobbyOverlay(false);
      if (session.role === "guest") handleForcedLobbyExit("Host has left.");
      else leaveLobby({ preserveView: true, preserveRemote: true });
      return;
    }
    if (!snapshot.metadata.fromCache) session.lastServerSnapshotMs = Date.now();
    const previousStatus = session.lobby?.status;
    const nextLobby = snapshot.data();
    updateServerClockOffset(nextLobby.updatedAt);
    session.lobby = nextLobby;
    // The host has pressed Start and is preparing the match: everyone leaves the lobby right away.
    if (session.lobby.status === "starting") {
      setCreatingLobbyOverlay(true, "Waiting for players...");
    } else if (previousStatus === "starting" && session.lobby.status === "waiting") {
      setCreatingLobbyOverlay(false);
    }
    if ((previousStatus === "waiting" || previousStatus === "starting") && session.lobby.status === "playing") {
      session.waitingForRematch = false;
      session.gameStarted = false;
    }
    syncLobbyControls();
    renderStandings();
    if (!snapshot.metadata.hasPendingWrites) {
      publishMatchState();
      if (session.lobby.status === "playing") beginSharedMatch();
    }
  }, (error) => {
    console.error("Could not sync lobby", error);
  });
  session.unsubscribePlayers = backend.fs.onSnapshot(playersRef, (snapshot) => {
    const previousPlayers = session.players;
    const nextPlayers = snapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((left, right) => Number(left.joinedAtMs || 0) - Number(right.joinedAtMs || 0));
    const uid = backend.auth.currentUser?.uid;
    const localHost = session.players.find((player) => player.id === uid && player.role === "host");
    if (session.role === "host" && localHost && !nextPlayers.some((player) => player.id === uid)) {
      nextPlayers.unshift(localHost);
    }
    // Same guard for a guest: a cache-served snapshot must not drop our own card (team/slot).
    const localGuest = session.players.find((player) => player.id === uid);
    if (session.role === "guest" && localGuest && snapshot.metadata.fromCache && !nextPlayers.some((player) => player.id === uid)) {
      nextPlayers.push(localGuest);
    }
    // A snapshot served from the local cache can be empty or partial (it often holds only
    // our own just-written doc), which would look exactly like everyone else disconnecting.
    // Never act on a departure until the server has confirmed it.
    const serverConfirmed = !snapshot.metadata.fromCache;
    if (serverConfirmed) session.lastServerSnapshotMs = Date.now();
    const departedPlayers = serverConfirmed
      ? previousPlayers.filter((player) => !nextPlayers.some((nextPlayer) => nextPlayer.id === player.id))
      : [];
    const hostDeparted = departedPlayers.some((player) => player.role === "host" || player.id === session.lobby?.hostUid);
    const viewOnlyUpdate = playersMatchExceptView(previousPlayers, nextPlayers);
    session.players = nextPlayers;
    if (viewOnlyUpdate) {
      publishSpectatorViews();
      return;
    }
    if (session.role === "guest" && hostDeparted) {
      handleForcedLobbyExit("Host has left.");
      return;
    }
    if (serverConfirmed && session.role === "guest" && uid && !nextPlayers.some((player) => player.id === uid)) {
      leaveLobby();
      getMenuApi()?.showMultiplayerView();
      return;
    }
    if (session.lobby?.status === "playing" && session.gameStarted) {
      const ownPlayer = nextPlayers.find((player) => player.id === uid);
      const departedGuests = departedPlayers.filter((player) => player.role !== "host" && player.id !== session.lobby?.hostUid);
      if (ownPlayer && departedGuests.length) {
        const opponentTeam = ownPlayer.team === "red" ? "blue" : "red";
        const opponentStillPresent = nextPlayers.some((player) => player.team === opponentTeam);
        const opponentWasPresent = previousPlayers.some((player) => player.team === opponentTeam);
        if (opponentWasPresent && !opponentStillPresent && !session.waitingForRematch) {
          // The match is over, but the lobby is not: everyone still here goes back to it (whether
          // they were mid-round or on the results screen) instead of being thrown out to the menu.
          session.players = nextPlayers;
          getMenuApi()?.returnToLobbyFromMatch?.();
          renderLobbyPlayers();
          showLobbyMessage(`${opponentTeam === "red" ? "Red" : "Blue"} team has left the game.`);
          return;
        }
        departedGuests.forEach((player) => publishDepartureNotice(player));
      }
    }
    renderLobbyPlayers();
    syncUsernameInputs();
    renderStandings();
    reconcileSwitchState();
    syncRoundClock();
    publishVisibleMarkers();
    publishSpectatorViews();
    publishGuessProgress();
    resolveRoundIfReady();
    if (session.lobby?.status === "playing") beginSharedMatch();
  }, (error) => {
    console.error("Could not sync lobby players", error);
  });

  if (backend.rtdb) {
    try {
      // The connection only exists while a lobby is open (see leaveLobby), so idle menus use no slot.
      backend.rt.goOnline(backend.rtdb);
      const viewsRef = backend.rt.ref(backend.rtdb, `${SPECTATE_PATH}/${code}`);
      session.unsubscribeViews = backend.rt.onValue(viewsRef, (snapshot) => {
        session.viewStates = snapshot.val() || {};
        publishSpectatorViews();
      }, (error) => {
        console.error("Could not sync spectator views", error);
      });
      startRealtimePresence(backend, code);
    } catch (error) {
      console.error("Could not sync spectator views", error);
    }
  }

  session.lastServerSnapshotMs = Date.now();
  startPresence();
}

// The Realtime Database notices a closed tab the moment its socket drops and runs onDisconnect on
// the server, so each player's presence node vanishes within about a second even when the page
// never got to run any cleanup. The host then frees the Firestore slot of anyone who vanishes.
function startRealtimePresence(backend, code) {
  const uid = backend.auth.currentUser?.uid;
  if (!uid) return;
  const presenceRef = backend.rt.ref(backend.rtdb, `${PRESENCE_PATH}/${code}/${uid}`);
  session.presenceRef = presenceRef;
  session.presenceSeen = new Set();
  const connectedRef = backend.rt.ref(backend.rtdb, ".info/connected");
  const stopConnected = backend.rt.onValue(connectedRef, (snapshot) => {
    if (snapshot.val() !== true) return;
    // Re-armed on every (re)connect, since the server forgets onDisconnect handlers when the socket drops.
    backend.rt.onDisconnect(presenceRef).remove()
      .then(() => backend.rt.set(presenceRef, true))
      .catch((error) => console.error("Could not publish realtime presence", error));
  });
  const stopRoom = backend.rt.onValue(backend.rt.ref(backend.rtdb, `${PRESENCE_PATH}/${code}`), (snapshot) => {
    const online = snapshot.val() || {};
    Object.keys(online).forEach((id) => session.presenceSeen.add(id));
    if (session.role !== "host") return;
    session.presenceSeen.forEach((id) => {
      if (id === uid || online[id] || session.departedPlayerIds.has(id)) return;
      if (!session.players.some((player) => player.id === id)) return;
      session.departedPlayerIds.add(id);
      window.setTimeout(async () => {
        try {
          // Debounce a brief reconnect: only remove if they are still absent and in the lobby.
          const latest = await backend.rt.get(backend.rt.ref(backend.rtdb, `${PRESENCE_PATH}/${code}/${id}`));
          if (session.lobbyCode === code && !latest.val()) {
            session.presenceSeen.delete(id);
            await pruneStalePlayer(id);
          }
        } finally {
          session.departedPlayerIds.delete(id);
        }
      }, 2000);
    });
  }, (error) => console.error("Could not sync realtime presence", error));
  session.stopRealtimePresence = () => { stopConnected(); stopRoom(); };
}

function updateServerClockOffset(serverTimestamp) {
  const serverMs = Number(serverTimestamp?.toMillis?.());
  if (!Number.isFinite(serverMs) || serverMs <= 0) return;
  const sample = serverMs - Date.now();
  if (session.serverClockOffsetMs == null || sample > session.serverClockOffsetMs) {
    session.serverClockOffsetMs = sample;
  }
}

// Shared deadlines are written in server-clock terms by whoever schedules them and read back
// in each client's own clock. Timestamps taken straight from the writer's Date.now() cannot
// be compared against a reader's Date.now(), which is what desynced the round timers.
function toServerClock(localMs) {
  const value = Number(localMs);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value + (session.serverClockOffsetMs ?? 0);
}

function fromServerClock(serverMs, fallbackMs = 0) {
  const value = Number(serverMs);
  if (!Number.isFinite(value) || value <= 0) return Number(fallbackMs) || 0;
  return value - (session.serverClockOffsetMs ?? 0);
}

function resolutionTimeOnLocalClock(resolution, hostTargetMs) {
  const targetMs = Number(hostTargetMs);
  const hostResolvedAtMs = Number(resolution?.resolvedAtMs);
  const serverCommitMs = Number(session.lobby?.updatedAt?.toMillis?.());
  if (
    !Number.isFinite(targetMs)
    || targetMs <= 0
    || !Number.isFinite(hostResolvedAtMs)
    || !Number.isFinite(serverCommitMs)
    || session.serverClockOffsetMs == null
  ) return targetMs || 0;
  const serverTargetMs = serverCommitMs + (targetMs - hostResolvedAtMs);
  return serverTargetMs - session.serverClockOffsetMs;
}

function playersMatchExceptView(previousPlayers, nextPlayers) {
  if (previousPlayers.length !== nextPlayers.length || nextPlayers.length === 0) return false;
  const previousById = new Map(previousPlayers.map((player) => [player.id, player]));
  let viewChanged = false;
  const otherFieldsMatch = nextPlayers.every((player) => {
    const previous = previousById.get(player.id);
    if (!previous) return false;
    const { viewState: previousView, updatedAtMs: previousUpdatedAt, ...previousRest } = previous;
    const { viewState: nextView, updatedAtMs: nextUpdatedAt, ...nextRest } = player;
    if (JSON.stringify(previousRest) !== JSON.stringify(nextRest)) return false;
    if (JSON.stringify(previousView ?? null) !== JSON.stringify(nextView ?? null)) viewChanged = true;
    return true;
  });
  return otherFieldsMatch && viewChanged;
}

function publishDepartureNotice(player) {
  window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-notice", {
    detail: {
      lobbyCode: session.lobbyCode,
      roundIndex: session.currentRound,
      message: `${player.name || "A player"} has left the game.`,
      team: player.team,
    },
  }));
}

async function handleForcedLobbyExit(message) {
  if (session.forcedExitHandled) return;
  session.forcedExitHandled = true;
  setCreatingLobbyOverlay(false);
  await leaveLobby({ preserveView: true, preserveRemote: true });
  getMenuApi()?.exitMultiplayerMatch?.();
  showLobbyMessage(message);
}

function showLobbyMessage(message) {
  if (!dom.messageModal || !dom.messageText) return;
  dom.messageText.textContent = message;
  dom.messageModal.classList.remove("hidden");
  window.setTimeout(() => dom.messageCloseButton?.focus(), 0);
}

function closeLobbyMessage() {
  dom.messageModal?.classList.add("hidden");
}

function stopSubscriptions() {
  session.unsubscribeLobby?.();
  session.unsubscribePlayers?.();
  session.unsubscribeLobby = null;
  session.unsubscribePlayers = null;
  session.unsubscribeViews?.();
  session.unsubscribeViews = null;
  session.viewStates = {};
  session.spectatedOpponent = null;
  session.spectateEligibleSinceMs = 0;
  window.clearTimeout(session.spectateStartHandle);
  session.spectateStartHandle = 0;
  window.clearTimeout(session.spectateDeadlineHandle);
  session.spectateDeadlineHandle = 0;
  stopPresence();
}

function startPresence() {
  stopPresence();
  session.slotReleased = false;
  sendPresenceHeartbeat();
  session.presenceHeartbeatHandle = backgroundTimers.setInterval(sendPresenceHeartbeat, PRESENCE_HEARTBEAT_MS);
  session.presenceReaperHandle = backgroundTimers.setInterval(runPresenceReaper, PRESENCE_REAPER_MS);
  session.matchReconcileHandle = backgroundTimers.setInterval(reconcileMatchState, MATCH_RECONCILE_MS);
}

// Re-asserts the shared timers from the authoritative lobby doc. Every consumer applies an
// absolute target, so repeating it is a no-op once a client is already in step - it only
// matters for the client that missed the original dispatch.
function reconcileMatchState() {
  if (!session.lobbyCode || session.lobby?.status !== "playing") return;
  publishGuessProgress();
  publishMatchState();
}

document.addEventListener("visibilitychange", () => {
  if (session.lobbyCode) sendPresenceHeartbeat();
});

// Closing the tab gives no reliable async window, so this is a best-effort fast path that
// usually frees the slot instantly. The heartbeat reaper stays the actual guarantee for
// crashes, lost connections and anything this misses.
window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  releaseOwnPlayerSlot();
});

function stopPresence() {
  backgroundTimers.clearInterval(session.presenceHeartbeatHandle);
  backgroundTimers.clearInterval(session.presenceReaperHandle);
  backgroundTimers.clearInterval(session.matchReconcileHandle);
  session.presenceHeartbeatHandle = 0;
  session.presenceReaperHandle = 0;
  session.matchReconcileHandle = 0;
  session.departedPlayerIds.clear();
}

// A closing page never waits on a promise, so the SDK's own write is queued and then thrown
// away before it reaches the network - which is why a closed browser used to linger in the
// lobby. A keepalive fetch is the one request browsers promise to deliver while unloading, so
// this hits Firestore's REST endpoint directly and the slot is freed as the tab closes. The
// token has to be ready in advance because there is no time to await one here.
function releaseOwnPlayerSlot() {
  const backend = session.backend;
  const code = session.lobbyCode;
  const uid = backend?.auth.currentUser?.uid;
  if (!backend || !code || !uid || session.slotReleased) return;
  session.slotReleased = true;
  stopPresence();

  if (session.idToken) {
    try {
      const path = `projects/${firebaseConfig.projectId}/databases/(default)/documents`
        + `/${LOBBY_COLLECTION}/${encodeURIComponent(code)}/players/${encodeURIComponent(uid)}`;
      fetch(`https://firestore.googleapis.com/v1/${path}`, {
        method: "DELETE",
        keepalive: true,
        headers: { Authorization: `Bearer ${session.idToken}` },
      }).catch(() => {});
    } catch (error) {}
  }

  // Backup for browsers without keepalive support, and harmless if the fetch already landed.
  try {
    backend.fs.deleteDoc(playerRef(backend, code, uid)).catch(() => {});
  } catch (error) {}
}

async function sendPresenceHeartbeat() {
  const backend = session.backend;
  const code = session.lobbyCode;
  const user = backend?.auth.currentUser;
  const uid = user?.uid;
  if (!backend || !code || !uid) return;
  // Kept fresh here so the unload path always has a usable token on hand. getIdToken serves a
  // cached value until it nears expiry, so this costs nothing on a normal beat.
  user.getIdToken().then((token) => { session.idToken = token; }).catch(() => {});
  try {
    await backend.fs.setDoc(
      playerRef(backend, code, uid),
      { updatedAtMs: Date.now() },
      { merge: true },
    );
  } catch (error) {
    console.error("Could not send multiplayer presence heartbeat", error);
  }
}

// A listener stuck on the local cache (slow or degraded connection) shows a guest only themselves
// and never hears that the host left. If no server-confirmed snapshot has arrived for a while, ask
// the server directly: leave if the lobby or host is gone, otherwise adopt the real player list.
async function verifyGuestViewAgainstServer() {
  const backend = session.backend;
  const code = session.lobbyCode;
  if (!backend || !code || session.serverVerifyBusy || !session.lobby) return;
  if (Date.now() - session.lastServerSnapshotMs < SERVER_VERIFY_AFTER_MS) return;
  session.serverVerifyBusy = true;
  try {
    const lobbySnapshot = await backend.fs.getDocFromServer(backend.fs.doc(backend.db, LOBBY_COLLECTION, code));
    if (session.lobbyCode !== code) return;
    if (!lobbySnapshot.exists()) {
      handleForcedLobbyExit("Host has left.");
      return;
    }
    const playersSnapshot = await backend.fs.getDocsFromServer(backend.fs.collection(backend.db, LOBBY_COLLECTION, code, "players"));
    if (session.lobbyCode !== code) return;
    const serverPlayers = playersSnapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((left, right) => Number(left.joinedAtMs || 0) - Number(right.joinedAtMs || 0));
    const hostUid = lobbySnapshot.data().hostUid;
    if (!serverPlayers.some((player) => player.id === hostUid)) {
      handleForcedLobbyExit("Host has left.");
      return;
    }
    session.lastServerSnapshotMs = Date.now();
    session.lobby = lobbySnapshot.data();
    const changed = serverPlayers.length !== session.players.length
      || serverPlayers.some((player, index) => player.id !== session.players[index]?.id);
    if (changed) {
      session.players = serverPlayers;
      renderLobbyPlayers();
    }
  } catch (error) {
    // Offline or unreachable: nothing verifiable, try again on the next beat.
  } finally {
    session.serverVerifyBusy = false;
  }
}

function runPresenceReaper() {
  const backend = session.backend;
  const code = session.lobbyCode;
  const uid = backend?.auth.currentUser?.uid;
  if (!backend || !code || !uid || !session.lobby) return;
  const now = Date.now();
  const staleFor = (player) => now - Number(player.updatedAtMs || player.joinedAtMs || 0);

  // Deliberately asymmetric. Pruning a stale guest just frees a slot they can rejoin, so it
  // should be prompt. Declaring the host gone ejects the entire lobby, so it stays
  // conservative - a host who really closed their tab is caught instantly by the pagehide
  // cleanup anyway, leaving this to cover only hard crashes and dropped connections.
  if (session.role === "guest") verifyGuestViewAgainstServer();
  if (session.role === "guest" && !session.presenceHostCheckBusy) {
    const hostPlayer = session.players.find((player) => player.id === session.lobby.hostUid);
    if (hostPlayer && staleFor(hostPlayer) > PRESENCE_HOST_TIMEOUT_MS) {
      session.presenceHostCheckBusy = true;
      confirmStalePlayer(session.lobby.hostUid, PRESENCE_HOST_TIMEOUT_MS)
        .then((stillStale) => {
          if (stillStale) handleForcedLobbyExit("Host has left.");
        })
        .finally(() => { session.presenceHostCheckBusy = false; });
    }
    return;
  }

  if (session.role !== "host") return;
  session.players
    .filter((player) => player.id !== uid && !session.departedPlayerIds.has(player.id) && staleFor(player) > PRESENCE_TIMEOUT_MS)
    .forEach((player) => {
      session.departedPlayerIds.add(player.id);
      confirmStalePlayer(player.id)
        .then((stillStale) => {
          if (stillStale) return pruneStalePlayer(player.id);
        })
        .finally(() => { session.departedPlayerIds.delete(player.id); });
    });
}

// Local snapshot data can lag or race with a fresh heartbeat write, so before taking the
// destructive step of kicking a player (or ourselves) we re-check directly against Firestore.
async function confirmStalePlayer(playerId, timeoutMs = PRESENCE_TIMEOUT_MS) {
  const backend = session.backend;
  const code = session.lobbyCode;
  if (!backend || !code) return false;
  try {
    const freshDoc = await backend.fs.getDoc(playerRef(backend, code, playerId));
    // If this read fell back to the local cache we could not actually verify anything,
    // so treat it as "still present" rather than kicking someone on stale data.
    if (freshDoc.metadata.fromCache) return false;
    if (!freshDoc.exists()) return true;
    const freshData = freshDoc.data();
    const freshUpdatedAtMs = Number(freshData.updatedAtMs || freshData.joinedAtMs || 0);
    return Date.now() - freshUpdatedAtMs > timeoutMs;
  } catch (error) {
    console.error("Could not verify multiplayer player presence", error);
    return false;
  }
}

async function pruneStalePlayer(playerId) {
  const backend = session.backend;
  const code = session.lobbyCode;
  if (!backend || !code) return;
  try {
    await backend.fs.deleteDoc(playerRef(backend, code, playerId));
  } catch (error) {
    console.error("Could not remove a disconnected multiplayer player", error);
  }
}

function syncLobbyControls() {
  const lobby = session.lobby;
  if (!lobby) return;
  const competitive = Boolean(lobby.settings?.competitive);
  dom.hostView?.classList.add("is-2v2");
  dom.guestView?.classList.add("is-2v2");
  dom.lobbyTimerButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.lobbySeconds) === Number(lobby.settings?.seconds || 0)));
  dom.lobbyRoundButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.lobbyRounds) === Number(lobby.settings?.rounds || 5)));
  [...dom.lobbyTimerButtons, ...dom.lobbyRoundButtons].forEach((button) => { button.disabled = competitive; });
  dom.lobbyTimerSetting?.classList.toggle("is-disabled", competitive);
  dom.lobbyRoundsSetting?.classList.toggle("is-disabled", competitive);
  dom.lobbyTimerSetting?.setAttribute("aria-disabled", String(competitive));
  dom.lobbyRoundsSetting?.setAttribute("aria-disabled", String(competitive));
  dom.competitiveSwitch?.classList.toggle("is-enabled", competitive);
  dom.competitiveSwitch?.setAttribute("aria-checked", String(competitive));
  const maxHealth = lobbyMaxHealth(lobby);
  dom.lobbyHealthButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.lobbyHealth) === maxHealth));
  dom.lobbyHealthSetting?.classList.toggle("is-disabled", !competitive);
  dom.lobbyHealthSetting?.setAttribute("aria-disabled", String(!competitive));
  dom.lobbyHealthButtons.forEach((button) => { button.disabled = !competitive; });
  dom.guestLobbyTimerButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.guestLobbySeconds) === Number(lobby.settings?.seconds || 0)));
  dom.guestLobbyRoundButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.guestLobbyRounds) === Number(lobby.settings?.rounds || 5)));
  dom.guestLobbyHealthButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.guestLobbyHealth) === maxHealth));
  dom.guestCompetitiveSwitch?.classList.toggle("is-enabled", competitive);
  dom.guestCompetitiveSwitch?.setAttribute("aria-checked", String(competitive));
  renderLobbyPlayers();
}

function publishMatchState() {
  if (!session.lobbyCode || !session.lobby) return;
  const resolution = session.lobby.roundResolution;
  const roundClock = session.lobby.roundClock;
  if (
    session.lobby.status === "playing"
    && Number(roundClock?.roundIndex) === session.currentRound
    && Number(roundClock?.startsAtMs) > 0
  ) {
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-round-clock", {
      detail: {
        lobbyCode: session.lobbyCode,
        roundIndex: session.currentRound,
        startsAtMs: fromServerClock(roundClock.startsAtServerMs, roundClock.startsAtMs),
        endsAtMs: fromServerClock(roundClock.endsAtServerMs, roundClock.endsAtMs),
      },
    }));
  }
  window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-health", {
    detail: {
      lobbyCode: session.lobbyCode,
      redHealth: Number(session.lobby.redHealth ?? lobbyMaxHealth()),
      blueHealth: Number(session.lobby.blueHealth ?? lobbyMaxHealth()),
      redMultiplier: Number(session.lobby.redMultiplier ?? session.lobby.damageMultiplier ?? 1),
      blueMultiplier: Number(session.lobby.blueMultiplier ?? session.lobby.damageMultiplier ?? 1),
      multiplier: Number(resolution?.multiplier || 1),
      damagedTeam: resolution?.damagedTeam || "",
      damage: Number(resolution?.damage || 0),
      roundIndex: Number(resolution?.roundIndex),
      competitive: Boolean(session.lobby.settings?.competitive),
    },
  }));
  const deadline = session.lobby.roundDeadline;
  if (
    session.lobby.status === "playing"
    && Boolean(session.lobby.settings?.competitive)
    && Number(deadline?.roundIndex) === session.currentRound
    && Number(deadline?.endsAtMs) > 0
  ) {
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-deadline", {
      detail: {
        lobbyCode: session.lobbyCode,
        roundIndex: session.currentRound,
        endsAtMs: fromServerClock(deadline.endsAtServerMs, deadline.endsAtMs),
      },
    }));
    scheduleDeadlineResolution(deadline);
    window.clearTimeout(session.spectateDeadlineHandle);
    session.spectateDeadlineHandle = window.setTimeout(
      publishSpectatorViews,
      Math.max(0, fromServerClock(deadline.endsAtServerMs, deadline.endsAtMs) - Date.now()) + 20,
    );
  }
  if (session.lobby.status === "playing" && Number(resolution?.roundIndex) === session.currentRound) {
    const nextRoundAtMs = resolutionTimeOnLocalClock(resolution, resolution.nextRoundAtMs);
    const revealAtMs = resolutionTimeOnLocalClock(
      resolution,
      Number(resolution.resolvedAtMs) + ROUND_REVEAL_LEAD_MS,
    );
    const damageSequenceStartsAtMs = resolutionTimeOnLocalClock(
      resolution,
      Number(resolution.resolvedAtMs) + ROUND_DAMAGE_LEAD_MS,
    );
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-round-ready", {
      detail: {
        lobbyCode: session.lobbyCode,
        roundIndex: Number(resolution.roundIndex),
        redHealth: Number(session.lobby.redHealth ?? lobbyMaxHealth()),
        blueHealth: Number(session.lobby.blueHealth ?? lobbyMaxHealth()),
        redMultiplier: Number(session.lobby.redMultiplier ?? session.lobby.damageMultiplier ?? 1),
        blueMultiplier: Number(session.lobby.blueMultiplier ?? session.lobby.damageMultiplier ?? 1),
        multiplier: Number(resolution.multiplier || 1),
        damagedTeam: resolution.damagedTeam || "",
        damage: Number(resolution.damage || 0),
        matchOver: Boolean(resolution.matchOver),
        nextRoundAtMs,
        revealAtMs,
        damageSequenceStartsAtMs,
        forcedByDeadline: Boolean(resolution.forcedByDeadline),
        competitive: Boolean(session.lobby.settings?.competitive),
      },
    }));
  }
}

function renderLobbyPlayers() {
  const maxPlayers = 4;
  const playerCountText = `${session.players.length}/${maxPlayers} Players`;
  dom.hostPlayerCount.textContent = playerCountText;
  dom.guestPlayerCount.textContent = playerCountText;
  renderPlayerGrid(dom.hostPlayers, maxPlayers, session.lobbyReady);
  renderPlayerGrid(dom.guestPlayers, maxPlayers, session.lobbyReady);
  syncSwitchRequestPrompt();
  ensureRematchReady();

  if (session.role === "host") {
    const redCount = session.players.filter((player) => player.team === "red").length;
    const blueCount = session.players.filter((player) => player.team === "blue").length;
    const ready = session.players.length === 2
      ? redCount === 1 && blueCount === 1
      : session.players.length === 4 && redCount === 2 && blueCount === 2;
    const allPlayersReturned = !session.lobby?.awaitingRematch
      || session.players.every((player) => player.rematchReady === true);
    const canStart = ready && allPlayersReturned && session.lobby?.status === "waiting" && !session.busy;
    dom.hostStartButton.disabled = !canStart;
    dom.hostStartButton.textContent = canStart
      ? "Start Match"
      : ready && !allPlayersReturned ? "Waiting for players to return" : "Waiting for players";
  }
}

function renderPlayerGrid(container, maxPlayers, interactive = true) {
  if (!container) return;
  container.innerHTML = "";
  const uid = session.backend?.auth.currentUser?.uid;
  const ownPlayer = session.players.find((entry) => entry.id === uid);
  const playersBySlot = new Map(session.players.map((player, index) => [Number.isInteger(Number(player.slot)) ? Number(player.slot) : index, player]));
  for (let index = 0; index < maxPlayers; index += 1) {
    const player = playersBySlot.get(index);
    const team = index < 2 ? "red" : "blue";
    const card = document.createElement("article");
    const isCurrentPlayer = Boolean(player && uid && player.id === uid);
    card.className = `lobby-player-card is-${team}${player ? "" : " is-empty"}${isCurrentPlayer ? " is-current-player" : ""}${player?.role === "host" ? " is-host" : ""}`;
    if (isCurrentPlayer) card.setAttribute("aria-label", `${player.name || "Player"}, your player`);
    // While the host is starting the match the lobby sits behind the loading overlay: keep the
    // buttons on screen (disabled) instead of letting them vanish.
    const lobbyStatus = session.lobby?.status;
    const lobbyOpen = lobbyStatus === "waiting" || lobbyStatus === "starting";
    const lockAttr = lobbyStatus === "waiting" ? "" : " disabled";
    const requestSent = Boolean(player && ownPlayer?.switchRequest?.targetUid === player.id);
    const canSwitch = interactive && lobbyOpen
      && player?.id !== uid
      && Boolean(player)
      && !requestSent;
    const canJoin = interactive && lobbyOpen && !player;
    const canRemove = interactive && session.role === "host" && lobbyOpen && Boolean(player) && player.id !== uid;
    const actionButtons = [
      canRemove ? `<button class="lobby-remove-corner" type="button" aria-label="Remove player"${lockAttr}><span class="lobby-remove-corner-frame"><img src="./removeicon.png" alt=""></span></button>` : "",
      canJoin ? `<button class="lobby-slot-action" type="button"${lockAttr}>Join</button>` : "",
      requestSent ? '<button class="lobby-slot-action lobby-switch-action is-sent" type="button" disabled>Sent</button>' : "",
      canSwitch ? `<button class="lobby-slot-action lobby-switch-action" type="button"${lockAttr}>Switch</button>` : "",
      isCurrentPlayer ? '<button class="lobby-slot-action is-joined" type="button" disabled>Joined</button>' : "",
    ].filter(Boolean).join("");
    card.innerHTML = `
      <span class="lobby-player-avatar" aria-hidden="true"><img src="./${team === "red" ? "head25.png" : "head122.png"}" alt=""></span>
      <span class="lobby-player-copy">
        <span class="lobby-player-name-row"><strong></strong>${player?.role === "host" ? '<b class="lobby-host-label">(Host)<span class="lobby-host-crown" aria-label="Host"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 4.5 4L12 4l4.5 6L21 6l-2 12H5L3 6Z"></path><path d="M5 18h14v2H5z"></path></svg></span></b>' : ""}</span>
        <span>${team === "red" ? "Red Team" : "Blue Team"}</span>
      </span>
      ${actionButtons ? `<span class="lobby-player-actions">${actionButtons}</span>` : player || !interactive ? "" : "<small>Open</small>"}
    `;
    card.querySelector(".lobby-player-copy strong").textContent = player?.name || "Empty slot";
    card.querySelector(".lobby-slot-action:not(.lobby-switch-action)")?.addEventListener("click", () => joinPlayerSlot(index));
    card.querySelector(".lobby-switch-action:not(.is-sent)")?.addEventListener("click", (event) => requestPlayerSwitch(player, event.currentTarget));
    card.querySelector(".lobby-remove-corner")?.addEventListener("click", () => openRemovePlayerPrompt(player));
    container.appendChild(card);
  }
}

function syncSwitchRequestPrompt() {
  const uid = session.backend?.auth.currentUser?.uid;
  const requester = session.players
    .filter((player) => player.switchRequest?.targetUid === uid)
    .sort((left, right) => Number(right.switchRequest?.requestedAtMs || 0) - Number(left.switchRequest?.requestedAtMs || 0))[0];

  if (!uid || !requester || session.lobby?.status !== "waiting") {
    session.incomingSwitchRequesterId = "";
    session.switchResponseBusy = false;
    dom.switchModal?.classList.add("hidden");
    return;
  }

  const wasHidden = dom.switchModal?.classList.contains("hidden");
  session.incomingSwitchRequesterId = requester.id;
  if (dom.switchRequesterName) dom.switchRequesterName.textContent = requester.name || "A player";
  dom.switchModal?.classList.remove("hidden");
  if (dom.switchNoButton) dom.switchNoButton.disabled = session.switchResponseBusy;
  if (dom.switchYesButton) dom.switchYesButton.disabled = session.switchResponseBusy;
  if (wasHidden) window.setTimeout(() => dom.switchYesButton?.focus(), 0);
}

async function respondToSwitchRequest(accepted) {
  if (session.switchResponseBusy) return;
  const requester = session.players.find((player) => player.id === session.incomingSwitchRequesterId);
  if (!requester) {
    syncSwitchRequestPrompt();
    return;
  }

  session.switchResponseBusy = true;
  if (dom.switchNoButton) dom.switchNoButton.disabled = true;
  if (dom.switchYesButton) dom.switchYesButton.disabled = true;
  try {
    await answerSwitchRequest(requester, accepted);
  } catch (error) {
    console.error("Could not answer team switch request", error);
    session.switchResponseBusy = false;
    if (dom.switchNoButton) dom.switchNoButton.disabled = false;
    if (dom.switchYesButton) dom.switchYesButton.disabled = false;
  }
}

function openRemovePlayerPrompt(player) {
  if (session.role !== "host" || !player || player.id === session.backend?.auth.currentUser?.uid) return;
  session.removePlayerId = player.id;
  dom.removePlayerName.textContent = player.name || "this player";
  dom.removeModal.classList.remove("hidden");
  window.setTimeout(() => dom.removeCancelButton?.focus(), 0);
}

function closeRemovePlayerPrompt() {
  session.removePlayerId = "";
  dom.removeModal?.classList.add("hidden");
  if (dom.removeConfirmButton) {
    dom.removeConfirmButton.disabled = false;
    dom.removeConfirmButton.textContent = "Remove";
  }
}

async function confirmRemovePlayer() {
  const playerId = session.removePlayerId;
  if (
    session.role !== "host"
    || !session.backend
    || !session.lobbyCode
    || !playerId
    || playerId === session.backend.auth.currentUser?.uid
  ) {
    closeRemovePlayerPrompt();
    return;
  }
  dom.removeConfirmButton.disabled = true;
  dom.removeConfirmButton.textContent = "Removing...";
  try {
    await session.backend.fs.deleteDoc(playerRef(session.backend, session.lobbyCode, playerId));
    closeRemovePlayerPrompt();
  } catch (error) {
    console.error("Could not remove player", error);
    dom.removeConfirmButton.disabled = false;
    dom.removeConfirmButton.textContent = "Try again";
  }
}

async function joinPlayerSlot(slot) {
  const backend = session.backend;
  const uid = backend?.auth.currentUser?.uid;
  if (!backend || !uid || session.lobby?.status !== "waiting") return;
  const occupied = session.players.some((player) => Number(player.slot) === slot);
  if (occupied) return;
  await backend.fs.setDoc(playerRef(backend, session.lobbyCode, uid), {
    slot,
    team: slot < 2 ? "red" : "blue",
    switchRequest: null,
    switchAccepted: null,
    updatedAtMs: Date.now(),
  }, { merge: true });
}

async function requestPlayerSwitch(targetPlayer, button) {
  const backend = session.backend;
  const uid = backend?.auth.currentUser?.uid;
  const ownPlayer = session.players.find((player) => player.id === uid);
  if (!backend || !ownPlayer || !targetPlayer) return;
  if (button) {
    button.disabled = true;
    button.classList.add("is-sent");
    button.textContent = "Sent";
  }
  try {
    await backend.fs.setDoc(playerRef(backend, session.lobbyCode, uid), {
      switchRequest: { targetUid: targetPlayer.id, requestedAtMs: Date.now() },
      switchAccepted: null,
      updatedAtMs: Date.now(),
    }, { merge: true });
  } catch (error) {
    if (button) {
      button.disabled = false;
      button.classList.remove("is-sent");
      button.textContent = "Switch";
    }
    throw error;
  }
}

async function answerSwitchRequest(requester, accepted) {
  const backend = session.backend;
  const uid = backend?.auth.currentUser?.uid;
  const ownPlayer = session.players.find((player) => player.id === uid);
  if (!backend || !ownPlayer || !requester?.switchRequest || requester.switchRequest.targetUid !== uid) return;
  if (!accepted) {
    if (session.role === "host") {
      await backend.fs.setDoc(playerRef(backend, session.lobbyCode, requester.id), { switchRequest: null }, { merge: true });
    } else {
      await backend.fs.setDoc(playerRef(backend, session.lobbyCode, uid), { switchAccepted: { requesterUid: requester.id, accepted: false, atMs: Date.now() } }, { merge: true });
    }
    return;
  }
  const batch = backend.fs.writeBatch(backend.db);
  if (session.role === "host") {
    batch.update(playerRef(backend, session.lobbyCode, requester.id), { slot: ownPlayer.slot, team: ownPlayer.team, switchRequest: null, switchAccepted: null });
    batch.update(playerRef(backend, session.lobbyCode, uid), { slot: requester.slot, team: requester.team, switchAccepted: null });
  } else {
    batch.update(playerRef(backend, session.lobbyCode, uid), { slot: requester.slot, team: requester.team, switchAccepted: { requesterUid: requester.id, accepted: true, originalSlot: ownPlayer.slot, originalTeam: ownPlayer.team, atMs: Date.now() } });
  }
  await batch.commit();
}

async function reconcileSwitchState() {
  if (session.switchBusy || !session.backend || session.lobby?.status !== "waiting") return;
  const uid = session.backend.auth.currentUser?.uid;
  const ownPlayer = session.players.find((player) => player.id === uid);
  if (!uid || !ownPlayer) return;
  const backend = session.backend;
  const requestedTarget = ownPlayer.switchRequest?.targetUid
    ? session.players.find((player) => player.id === ownPlayer.switchRequest.targetUid)
    : null;
  const response = requestedTarget?.switchAccepted;

  try {
    session.switchBusy = true;
    if (response?.requesterUid === uid) {
      if (response.accepted) {
        const batch = backend.fs.writeBatch(backend.db);
        batch.update(playerRef(backend, session.lobbyCode, uid), {
          slot: response.originalSlot,
          team: response.originalTeam,
          switchRequest: null,
          switchAccepted: null,
        });
        if (session.role === "host") {
          batch.update(playerRef(backend, session.lobbyCode, requestedTarget.id), { switchAccepted: null });
        }
        await batch.commit();
      } else {
        await backend.fs.setDoc(playerRef(backend, session.lobbyCode, uid), { switchRequest: null }, { merge: true });
      }
    } else if (ownPlayer.switchAccepted) {
      const requester = session.players.find((player) => player.id === ownPlayer.switchAccepted.requesterUid);
      const requestStillOpen = requester?.switchRequest?.targetUid === uid;
      if (!requestStillOpen) {
        await backend.fs.setDoc(playerRef(backend, session.lobbyCode, uid), { switchAccepted: null }, { merge: true });
      }
    }
  } catch (error) {
    console.error("Could not sync team switch", error);
  } finally {
    session.switchBusy = false;
  }
}

async function enterMultiplayerRound(detail = {}) {
  if (detail.lobbyCode !== session.lobbyCode) return;
  if (session.viewWriteHandle) window.clearTimeout(session.viewWriteHandle);
  session.viewWriteHandle = 0;
  session.pendingViewState = null;
  session.lastViewSignature = "";
  clearOwnSpectateView();
  session.currentRound = Math.max(0, Number(detail.roundIndex) || 0);
  session.deadlineWriteRound = -1;
  session.roundClockWriteRound = -1;
  session.guessNoticeKeys.clear();
  clearDeadlineResolutionTimer();
  publishVisibleMarkers();
  publishSpectatorViews();
  publishGuessProgress();
  publishMatchState();
}

function queueViewState(detail = {}) {
  if (
    !session.backend
    || detail.lobbyCode !== session.lobbyCode
    || session.lobby?.status !== "playing"
    || Number(detail.roundIndex) !== session.currentRound
  ) return;
  const zoom = Math.max(1, Math.min(80, Number(detail.zoom) || 1));
  const panX = Math.max(1 - zoom, Math.min(0, Number(detail.panX) || 0));
  const panY = Math.max(1 - zoom, Math.min(0, Number(detail.panY) || 0));
  const signature = `${Number(detail.roundIndex)}:${zoom.toFixed(5)}:${panX.toFixed(5)}:${panY.toFixed(5)}`;
  if (signature === session.lastViewSignature || signature === session.pendingViewState?.signature) return;
  session.pendingViewState = { ...detail, zoom, panX, panY, signature };
  if (session.viewWriteHandle) return;
  session.viewWriteHandle = window.setTimeout(flushViewState, viewWriteInterval());
}

function viewWriteInterval() {
  return session.backend?.rtdb ? VIEW_WRITE_REALTIME_MS : VIEW_WRITE_MS;
}

function ownSpectateRef(backend = session.backend) {
  if (!backend?.rtdb || !session.lobbyCode) return null;
  return backend.rt.ref(backend.rtdb, `${SPECTATE_PATH}/${session.lobbyCode}/${backend.auth.currentUser.uid}`);
}

function clearOwnSpectateView() {
  const ref = ownSpectateRef();
  if (!ref) return;
  session.backend.rt.remove(ref).catch(() => {});
}

async function flushViewState() {
  session.viewWriteHandle = 0;
  const detail = session.pendingViewState;
  session.pendingViewState = null;
  if (
    !detail
    || !session.backend
    || detail.lobbyCode !== session.lobbyCode
    || Number(detail.roundIndex) !== session.currentRound
  ) return;
  const zoom = Number(detail.zoom);
  const panX = Number(detail.panX);
  const panY = Number(detail.panY);
  const viewRef = ownSpectateRef();
  if (viewRef) {
    try {
      if (!session.viewDisconnectSet) {
        session.viewDisconnectSet = true;
        session.backend.rt.onDisconnect(viewRef).remove();
      }
      await session.backend.rt.set(viewRef, {
        roundIndex: Number(detail.roundIndex),
        zoom,
        panX,
        panY,
        updatedAtMs: Date.now(),
      });
      session.lastViewSignature = detail.signature || "";
    } catch (error) {
      console.error("Could not sync multiplayer spectator view", error);
    }
    if (session.pendingViewState && !session.viewWriteHandle) {
      session.viewWriteHandle = window.setTimeout(flushViewState, viewWriteInterval());
    }
    return;
  }
  try {
    await session.backend.fs.setDoc(
      playerRef(session.backend, session.lobbyCode, session.backend.auth.currentUser.uid),
      {
        viewState: {
          roundIndex: Number(detail.roundIndex),
          zoom,
          panX,
          panY,
          updatedAtMs: Date.now(),
        },
        updatedAtMs: Date.now(),
      },
      { merge: true },
    );
    session.lastViewSignature = detail.signature || "";
  } catch (error) {
    console.error("Could not sync multiplayer spectator view", error);
  }
  if (session.pendingViewState && !session.viewWriteHandle) {
    session.viewWriteHandle = window.setTimeout(flushViewState, viewWriteInterval());
  }
}

async function saveGuessState(detail = {}, locked) {
  if (
    !session.backend
    || detail.lobbyCode !== session.lobbyCode
    || session.lobby?.status !== "playing"
    || Number(detail.roundIndex) !== session.currentRound
  ) return;
  if (locked && session.pendingViewState) {
    if (session.viewWriteHandle) window.clearTimeout(session.viewWriteHandle);
    session.viewWriteHandle = 0;
    await flushViewState();
  }
  const x = detail.x == null ? null : Number(detail.x);
  const y = detail.y == null ? null : Number(detail.y);
  try {
    await session.backend.fs.setDoc(
      playerRef(session.backend, session.lobbyCode, session.backend.auth.currentUser.uid),
      {
        guessState: {
          roundIndex: session.currentRound,
          x: Number.isFinite(x) ? x : null,
          y: Number.isFinite(y) ? y : null,
          locked: Boolean(locked),
          roundScore: locked ? Math.max(0, Number(detail.roundScore) || 0) : 0,
          timedOut: Boolean(detail.timedOut),
          updatedAtMs: Date.now(),
        },
        updatedAtMs: Date.now(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Could not sync multiplayer guess", error);
  }
}

async function markMultiplayerRoundPlayable(detail = {}) {
  if (
    !session.backend
    || detail.lobbyCode !== session.lobbyCode
    || session.lobby?.status !== "playing"
    || Number(detail.roundIndex) !== session.currentRound
  ) return;
  try {
    await session.backend.fs.setDoc(
      playerRef(session.backend, session.lobbyCode, session.backend.auth.currentUser.uid),
      { playableRoundIndex: session.currentRound, updatedAtMs: Date.now() },
      { merge: true },
    );
  } catch (error) {
    console.error("Could not sync multiplayer round readiness", error);
  }
}

function syncRoundClock() {
  if (
    session.role !== "host"
    || !session.backend
    || session.lobby?.status !== "playing"
  ) return;

  const existingClock = session.lobby.roundClock;
  if (Number(existingClock?.roundIndex) === session.currentRound && Number(existingClock?.startsAtMs) > 0) {
    publishMatchState();
    return;
  }

  const activePlayers = session.players.filter((player) => player.team === "red" || player.team === "blue");
  const teamsReady = ["red", "blue"].every((team) => {
    const teamPlayers = activePlayers.filter((player) => player.team === team);
    return teamPlayers.length === 0 || teamPlayers.some((player) => Number(player.playableRoundIndex) === session.currentRound);
  });
  const allPlayersReady = activePlayers.length >= 2 && teamsReady;
  if (!allPlayersReady || session.roundClockWriteRound === session.currentRound) return;

  session.roundClockWriteRound = session.currentRound;
  const startsAtMs = Date.now() + ROUND_CLOCK_LEAD_MS + SHARED_COUNTDOWN_MS;
  const durationMs = session.lobby.settings?.competitive
    ? 0
    : Math.max(0, Number(session.lobby.settings?.seconds) || 0) * 1000;
  session.backend.fs.updateDoc(
    session.backend.fs.doc(session.backend.db, LOBBY_COLLECTION, session.lobbyCode),
    {
      roundClock: {
        roundIndex: session.currentRound,
        startsAtMs,
        endsAtMs: durationMs > 0 ? startsAtMs + durationMs : 0,
        startsAtServerMs: toServerClock(startsAtMs),
        endsAtServerMs: durationMs > 0 ? toServerClock(startsAtMs + durationMs) : 0,
      },
      updatedAt: session.backend.fs.serverTimestamp(),
    },
  ).catch((error) => {
    session.roundClockWriteRound = -1;
    console.error("Could not synchronize the multiplayer round timer", error);
  });
}

function publishVisibleMarkers() {
  if (!session.lobbyCode || session.lobby?.status !== "playing") return;
  const uid = session.backend?.auth.currentUser?.uid;
  const ownPlayer = session.players.find((player) => player.id === uid);
  if (!uid || !ownPlayer) return;
  const teammates = session.players.filter((player) => player.team === ownPlayer.team);
  const ownTeamLocked = teammates.length > 0 && teammates.every((player) => (
    Number(player.guessState?.roundIndex) === session.currentRound && player.guessState?.locked === true
  ));
  const markers = session.players
    .filter((player) => player.team === ownPlayer.team || ownTeamLocked)
    .filter((player) => (
      Number(player.guessState?.roundIndex) === session.currentRound
      && player.guessState?.x != null
      && player.guessState?.y != null
      && Number.isFinite(Number(player.guessState?.x))
      && Number.isFinite(Number(player.guessState?.y))
    ))
    .map((player) => ({
      uid: player.id,
      name: player.name || "Player",
      team: player.team === "blue" ? "blue" : "red",
      x: Number(player.guessState.x),
      y: Number(player.guessState.y),
      locked: Boolean(player.guessState.locked),
      isOwn: player.id === uid,
    }));
  window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-markers", {
    detail: { lobbyCode: session.lobbyCode, roundIndex: session.currentRound, markers },
  }));
}

function viewStateOf(player) {
  return session.viewStates?.[player.id] || player.viewState || null;
}

function publishSpectatorViews() {
  if (!session.lobbyCode || session.lobby?.status !== "playing") return;
  const uid = session.backend?.auth.currentUser?.uid;
  const ownPlayer = session.players.find((player) => player.id === uid);
  const teammates = ownPlayer ? session.players.filter((player) => player.team === ownPlayer.team) : [];
  const canSpectate = teammates.length > 0 && teammates.every((player) => playerLockedForRound(player));
  const ownGuess = Number(ownPlayer?.guessState?.roundIndex) === session.currentRound
    && ownPlayer?.guessState?.x != null
    && ownPlayer?.guessState?.y != null
    && Number.isFinite(Number(ownPlayer.guessState.x))
    && Number.isFinite(Number(ownPlayer.guessState.y))
    ? {
      team: ownPlayer.team === "blue" ? "blue" : "red",
      x: Number(ownPlayer.guessState.x),
      y: Number(ownPlayer.guessState.y),
    }
    : null;
  const opposingTeam = ownPlayer
    ? session.players
      .filter((player) => player.team && player.team !== ownPlayer.team)
      .sort((a, b) => Number(a.slot ?? 0) - Number(b.slot ?? 0))
    : [];
  const ownTeamIndex = Math.abs(Number(ownPlayer?.slot ?? 0)) % 2;
  const roundParity = ((session.currentRound % 2) + 2) % 2;
  const assignedOpponent = opposingTeam.length
    ? opposingTeam[(ownTeamIndex + roundParity) % opposingTeam.length]
    : null;
  // An opponent who has already locked in has nothing left to watch - spectating them just
  // flashes a frozen view for the moment before the round resolves, which is what the last
  // player to guess would otherwise see. The alternating assignment is a preference, so if
  // that opponent is finished fall back to one who is still choosing, and to nobody if the
  // whole opposing side is done.
  const decidingOpponents = opposingTeam.filter((player) => !playerLockedForRound(player));
  // Once someone has been spectated this round, keep showing them (frozen on their final view and
  // marker) until the round resolves, rather than snapping back to our own camera.
  const stickyOpponent = session.spectatedOpponent?.round === session.currentRound
    ? opposingTeam.find((player) => player.id === session.spectatedOpponent.id) || null
    : null;
  const spectatedOpponent = assignedOpponent && !playerLockedForRound(assignedOpponent)
    ? assignedOpponent
    : decidingOpponents[0] || stickyOpponent;
  // Starting to spectate swaps our camera for theirs, so our own marker visibly jumps. When the
  // round deadline expires everyone locks within a few milliseconds, but our snapshot can see our
  // side lock before theirs and briefly flip into spectating. Only begin once the opponent has stayed
  // undecided for a moment; an established spectate is never delayed.
  // Once the response countdown has run out (or the round was force-resolved by it) there is nothing
  // left to watch: drop straight back to our own map.
  const deadline = session.lobby.roundDeadline;
  const resolution = session.lobby.roundResolution;
  const countdownOver = (
    Number(deadline?.roundIndex) === session.currentRound
    && Number(deadline?.endsAtMs) > 0
    && Date.now() >= fromServerClock(deadline.endsAtServerMs, deadline.endsAtMs)
  ) || (
    Number(resolution?.roundIndex) === session.currentRound && Boolean(resolution?.forcedByDeadline)
  );
  let spectateAllowed = canSpectate && Boolean(spectatedOpponent) && !countdownOver;
  if (spectateAllowed && session.spectatedOpponent?.round !== session.currentRound) {
    const now = Date.now();
    if (!session.spectateEligibleSinceMs) {
      session.spectateEligibleSinceMs = now;
      window.clearTimeout(session.spectateStartHandle);
      session.spectateStartHandle = window.setTimeout(() => {
        session.spectateStartHandle = 0;
        publishSpectatorViews();
      }, SPECTATE_START_DELAY_MS + 30);
    }
    spectateAllowed = now - session.spectateEligibleSinceMs >= SPECTATE_START_DELAY_MS;
  } else if (!spectateAllowed) {
    session.spectateEligibleSinceMs = 0;
    window.clearTimeout(session.spectateStartHandle);
    session.spectateStartHandle = 0;
  }
  if (spectateAllowed) {
    session.spectatedOpponent = { round: session.currentRound, id: spectatedOpponent.id };
  }
  const players = spectateAllowed
    ? session.players
      .filter((player) => player.id === spectatedOpponent.id)
      .map((player) => {
        // A player who never moved their map has no view for this round: they are on the default view.
        const storedView = viewStateOf(player);
        const view = Number(storedView?.roundIndex) === session.currentRound
          ? storedView
          : { zoom: 1, panX: 0, panY: 0 };
        const hasGuess = Number(player.guessState?.roundIndex) === session.currentRound
          && player.guessState?.x != null
          && player.guessState?.y != null
          && Number.isFinite(Number(player.guessState.x))
          && Number.isFinite(Number(player.guessState.y));
        return {
          uid: player.id,
          name: player.name || "Player",
          team: player.team === "blue" ? "blue" : "red",
          zoom: Number(view.zoom) || 1,
          panX: Number(view.panX) || 0,
          panY: Number(view.panY) || 0,
          x: hasGuess ? Number(player.guessState.x) : null,
          y: hasGuess ? Number(player.guessState.y) : null,
        };
      })
    : [];
  const teammateMarkers = spectateAllowed
    ? teammates
      .filter((player) => player.id !== uid && Number(player.guessState?.roundIndex) === session.currentRound)
      .filter((player) => Number.isFinite(Number(player.guessState?.x)) && player.guessState?.x != null
        && Number.isFinite(Number(player.guessState?.y)) && player.guessState?.y != null)
      .map((player) => ({
        uid: player.id,
        team: player.team === "blue" ? "blue" : "red",
        x: Number(player.guessState.x),
        y: Number(player.guessState.y),
      }))
    : [];
  window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-spectators", {
    detail: {
      lobbyCode: session.lobbyCode,
      roundIndex: session.currentRound,
      players,
      ownMarker: spectateAllowed ? ownGuess : null,
      teammateMarkers,
    },
  }));
}

function playerPlacedGuess(player, roundIndex = session.currentRound) {
  const guess = player?.guessState;
  return Number(guess?.roundIndex) === roundIndex
    && guess?.x != null && guess?.y != null
    && Number.isFinite(Number(guess.x)) && Number.isFinite(Number(guess.y));
}

function playerLockedForRound(player, roundIndex = session.currentRound) {
  return Number(player?.guessState?.roundIndex) === roundIndex && player?.guessState?.locked === true;
}

function publishGuessProgress() {
  if (!session.lobbyCode || session.lobby?.status !== "playing") return;
  if (Number(session.lobby.roundResolution?.roundIndex) === session.currentRound) return;
  const activePlayers = session.players.filter((player) => player.team === "red" || player.team === "blue");
  if (activePlayers.length < 2) return;

  const completedTeams = ["red", "blue"].filter((team) => {
    const teamPlayers = activePlayers.filter((player) => player.team === team);
    return teamPlayers.length > 0 && teamPlayers.every((player) => playerLockedForRound(player));
  });

  completedTeams.forEach((team) => {
    const noticeKey = `${session.currentRound}:${team}`;
    if (session.guessNoticeKeys.has(noticeKey)) return;
    const teamPlayers = activePlayers.filter((player) => player.team === team);
    // A team the countdown timed out without a single marker did not lock in anything.
    if (!teamPlayers.some((player) => playerPlacedGuess(player))) return;
    session.guessNoticeKeys.add(noticeKey);
    const message = teamPlayers.length > 1
      ? `${team === "red" ? "Red" : "Blue"} Team has locked in!`
      : `${teamPlayers[0]?.name || "A player"} has locked in!`;
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-notice", {
      detail: { lobbyCode: session.lobbyCode, roundIndex: session.currentRound, message, team },
    }));
  });

  if (!session.lobby.settings?.competitive) return;
  const anyPlayerLocked = activePlayers.some((player) => playerLockedForRound(player));
  if (!anyPlayerLocked) return;
  const allPlayersLocked = activePlayers.every((player) => playerLockedForRound(player));
  if (allPlayersLocked) return;
  const allPlayersReady = activePlayers.every((player) => Number(player.playableRoundIndex) === session.currentRound);
  if (!allPlayersReady) return;
  const deadline = session.lobby.roundDeadline;
  if (Number(deadline?.roundIndex) === session.currentRound && Number(deadline?.endsAtMs) > 0) {
    scheduleDeadlineResolution(deadline);
    return;
  }
  if (session.role !== "host" || session.deadlineWriteRound === session.currentRound) return;
  session.deadlineWriteRound = session.currentRound;
  const deadlineEndsAtMs = Date.now() + COMPETITIVE_RESPONSE_MS;
  session.backend.fs.updateDoc(
    session.backend.fs.doc(session.backend.db, LOBBY_COLLECTION, session.lobbyCode),
    {
      roundDeadline: {
        roundIndex: session.currentRound,
        endsAtMs: deadlineEndsAtMs,
        endsAtServerMs: toServerClock(deadlineEndsAtMs),
      },
      updatedAt: session.backend.fs.serverTimestamp(),
    },
  ).catch((error) => {
    session.deadlineWriteRound = -1;
    console.error("Could not start the competitive response timer", error);
  });
}

function scheduleDeadlineResolution(deadline) {
  if (session.role !== "host" || Number(deadline?.roundIndex) !== session.currentRound) return;
  clearDeadlineResolutionTimer();
  const delay = Math.max(0, Number(deadline.endsAtMs) - Date.now()) + DEADLINE_RESOLVE_GRACE_MS;
  session.deadlineResolveHandle = window.setTimeout(() => {
    session.deadlineResolveHandle = 0;
    resolveRoundIfReady();
  }, delay);
}

function clearDeadlineResolutionTimer() {
  if (!session.deadlineResolveHandle) return;
  window.clearTimeout(session.deadlineResolveHandle);
  session.deadlineResolveHandle = 0;
}

async function resolveRoundIfReady() {
  if (
    session.role !== "host"
    || session.resolvingRound
    || !session.backend
    || session.lobby?.status !== "playing"
    || Number(session.lobby.roundResolution?.roundIndex) === session.currentRound
  ) return;
  const activePlayers = session.players.filter((player) => player.team === "red" || player.team === "blue");
  const allPlayersLocked = activePlayers.every((player) => playerLockedForRound(player));
  const deadline = session.lobby.roundDeadline;
  const deadlineExpired = Boolean(session.lobby.settings?.competitive)
    && Number(deadline?.roundIndex) === session.currentRound
    && Number(deadline?.endsAtMs) > 0
    && Date.now() >= Number(deadline.endsAtMs);
  if (activePlayers.length < 2 || (!allPlayersLocked && !deadlineExpired)) return;

  session.resolvingRound = true;
  try {
    const backend = session.backend;
    const lobbyRef = backend.fs.doc(backend.db, LOBBY_COLLECTION, session.lobbyCode);
    await backend.fs.runTransaction(backend.db, async (transaction) => {
      const snapshot = await transaction.get(lobbyRef);
      if (!snapshot.exists()) return;
      const lobby = snapshot.data();
      if (Number(lobby.roundResolution?.roundIndex) === session.currentRound) return;
      const playerSnapshots = [];
      for (const player of activePlayers) {
        playerSnapshots.push(await transaction.get(playerRef(backend, session.lobbyCode, player.id)));
      }
      const resolvedPlayers = playerSnapshots
        .filter((playerSnapshot) => playerSnapshot.exists())
        .map((playerSnapshot) => ({ id: playerSnapshot.id, ...playerSnapshot.data() }));
      const redPlayers = resolvedPlayers.filter((player) => player.team === "red");
      const bluePlayers = resolvedPlayers.filter((player) => player.team === "blue");
      if (!redPlayers.length || !bluePlayers.length) return;
      const competitive = Boolean(lobby.settings?.competitive);
      const transactionAllLocked = resolvedPlayers.every((player) => playerLockedForRound(player));
      const transactionDeadline = lobby.roundDeadline;
      const transactionDeadlineExpired = competitive
        && Number(transactionDeadline?.roundIndex) === session.currentRound
        && Number(transactionDeadline?.endsAtMs) > 0
        && Date.now() >= Number(transactionDeadline.endsAtMs);
      if (!transactionAllLocked && !transactionDeadlineExpired) return;
      const averageScore = (players) => Math.round(players.reduce((sum, player) => (
        sum + (playerLockedForRound(player) ? Number(player.guessState?.roundScore || 0) : 0)
      ), 0) / players.length);
      const redScore = averageScore(redPlayers);
      const blueScore = averageScore(bluePlayers);
      const redMultiplier = Math.max(1, Number(lobby.redMultiplier ?? lobby.damageMultiplier ?? 1));
      const blueMultiplier = Math.max(1, Number(lobby.blueMultiplier ?? lobby.damageMultiplier ?? 1));
      const winningTeam = !competitive || redScore === blueScore ? "" : redScore > blueScore ? "red" : "blue";
      const multiplier = winningTeam === "red" ? redMultiplier : winningTeam === "blue" ? blueMultiplier : 1;
      const damage = competitive ? Math.round(Math.abs(redScore - blueScore) * multiplier) : 0;
      const damagedTeam = winningTeam === "red" ? "blue" : winningTeam === "blue" ? "red" : "";
      const redHealth = Math.max(0, Number(lobby.redHealth ?? lobbyMaxHealth(lobby)) - (damagedTeam === "red" ? damage : 0));
      const blueHealth = Math.max(0, Number(lobby.blueHealth ?? lobbyMaxHealth(lobby)) - (damagedTeam === "blue" ? damage : 0));
      const matchOver = competitive
        ? redHealth === 0 || blueHealth === 0
        : session.currentRound + 1 >= Math.max(1, Number(lobby.settings?.rounds) || 5);
      const resolvedAtMs = Date.now();
      const damagePresentationMs = competitive && damage > 0 ? 5000 : 0;
      transaction.update(lobbyRef, {
        redHealth,
        blueHealth,
        damageMultiplier: competitive ? Math.max(redMultiplier, blueMultiplier) : 1,
        redMultiplier: competitive && winningTeam === "red" ? redMultiplier + 0.5 : redMultiplier,
        blueMultiplier: competitive && winningTeam === "blue" ? blueMultiplier + 0.5 : blueMultiplier,
        roundDeadline: null,
        roundResolution: {
          roundIndex: session.currentRound,
          redScore,
          blueScore,
          multiplier,
          damage,
          damagedTeam,
          matchOver,
          forcedByDeadline: transactionDeadlineExpired,
          resolvedAtMs,
          nextRoundAtMs: matchOver ? 0 : resolvedAtMs + damagePresentationMs + 5000,
        },
        updatedAt: backend.fs.serverTimestamp(),
      });
    });
  } catch (error) {
    console.error("Could not resolve multiplayer round", error);
  } finally {
    session.resolvingRound = false;
  }
}

async function updateLobbySetting(field, value, buttons, activeButton) {
  if (session.role !== "host" || !session.backend || !session.lobbyCode) return;
  if (session.lobby?.settings?.competitive && (field === "seconds" || field === "rounds")) return;
  const previousValue = session.lobby?.settings?.[field];
  session.lobby.settings = { ...session.lobby.settings, [field]: value };
  buttons.forEach((button) => button.classList.toggle("is-active", button === activeButton));
  try {
    await session.backend.fs.updateDoc(
      session.backend.fs.doc(session.backend.db, LOBBY_COLLECTION, session.lobbyCode),
      { [`settings.${field}`]: value, updatedAt: session.backend.fs.serverTimestamp() },
    );
  } catch (error) {
    console.error("Could not update lobby settings", error);
    session.lobby.settings = { ...session.lobby.settings, [field]: previousValue };
    syncLobbyControls();
  }
}

async function updateCompetitiveMode(enabled) {
  if (session.role !== "host" || !session.backend || !session.lobbyCode || session.lobby?.status !== "waiting") return;
  const competitive = Boolean(enabled);
  const previousValue = Boolean(session.lobby.settings?.competitive);
  session.lobby.settings = { ...session.lobby.settings, competitive };
  syncLobbyControls();
  try {
    await session.backend.fs.updateDoc(
      session.backend.fs.doc(session.backend.db, LOBBY_COLLECTION, session.lobbyCode),
      { "settings.competitive": competitive, updatedAt: session.backend.fs.serverTimestamp() },
    );
  } catch (error) {
    console.error("Could not update Competitive Mode", error);
    session.lobby.settings = { ...session.lobby.settings, competitive: previousValue };
    syncLobbyControls();
  }
}

async function startHostedMatch() {
  if (session.role !== "host" || session.busy || !session.lobby) return;
  const redCount = session.players.filter((player) => player.team === "red").length;
  const blueCount = session.players.filter((player) => player.team === "blue").length;
  const ready = session.players.length === 2
    ? redCount === 1 && blueCount === 1
    : session.players.length === 4 && redCount === 2 && blueCount === 2;
  const allPlayersReturned = !session.lobby.awaitingRematch
    || session.players.every((player) => player.rematchReady === true);
  if (!ready || !allPlayersReturned || session.lobby.status !== "waiting") {
    return;
  }

  session.busy = true;
  dom.hostStartButton.disabled = true;
  dom.hostStartButton.textContent = "Preparing match...";
  const lobbyRef = session.backend.fs.doc(session.backend.db, LOBBY_COLLECTION, session.lobbyCode);
  try {
    await session.backend.fs.updateDoc(lobbyRef, {
      status: "starting",
      updatedAt: session.backend.fs.serverTimestamp(),
    });
    const roundIds = await getGameApi().createMultiplayerRoundPlan(session.lobby.settings);
    const batch = session.backend.fs.writeBatch(session.backend.db);
    session.players.forEach((player) => {
      batch.set(playerRef(session.backend, session.lobbyCode, player.id), {
        score: 0,
        roundIndex: 0,
        roundScores: {},
        finished: false,
        rematchReady: false,
        playableRoundIndex: -1,
        guessState: null,
        viewState: null,
        updatedAtMs: Date.now(),
      }, { merge: true });
    });
    batch.update(lobbyRef, {
        roundIds,
        status: "playing",
        awaitingRematch: false,
        redHealth: lobbyMaxHealth(),
        blueHealth: lobbyMaxHealth(),
        damageMultiplier: 1,
        redMultiplier: 1,
        blueMultiplier: 1,
        roundResolution: null,
        roundDeadline: null,
        roundClock: null,
        startedAt: session.backend.fs.serverTimestamp(),
        updatedAt: session.backend.fs.serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    console.error(error);
    session.backend.fs.updateDoc(lobbyRef, {
      status: "waiting",
      updatedAt: session.backend.fs.serverTimestamp(),
    }).catch(() => {});
    dom.hostStartButton.disabled = false;
    dom.hostStartButton.textContent = "Start Match";
  } finally {
    session.busy = false;
  }
}

async function beginSharedMatch() {
  if (session.gameStarted || session.waitingForRematch || !session.lobby?.roundIds?.length) return;
  const uid = session.backend?.auth.currentUser?.uid;
  const ownPlayer = session.players.find((player) => player.id === uid);
  if (!uid || !ownPlayer) return;
  session.gameStarted = true;
  // The moment the host starts, everyone leaves the lobby for a waiting screen while the match loads.
  setCreatingLobbyOverlay(true, "Waiting for players...");
  try {
    await getGameApi().startMultiplayerGame({
      lobbyCode: session.lobbyCode,
      roundIds: session.lobby.roundIds,
      settings: session.lobby.settings,
      teamMode: session.lobby.teamMode,
      uid,
      team: ownPlayer?.team,
      redHealth: Number(session.lobby.redHealth ?? lobbyMaxHealth()),
      blueHealth: Number(session.lobby.blueHealth ?? lobbyMaxHealth()),
      redMultiplier: Number(session.lobby.redMultiplier ?? session.lobby.damageMultiplier ?? 1),
      blueMultiplier: Number(session.lobby.blueMultiplier ?? session.lobby.damageMultiplier ?? 1),
      competitive: Boolean(session.lobby.settings?.competitive),
    });
  } catch (error) {
    session.gameStarted = false;
    console.error("Could not start multiplayer match", error);
  } finally {
    setCreatingLobbyOverlay(false);
  }
}

async function saveRoundResult(detail = {}) {
  if (!session.backend || !session.lobbyCode || detail.lobbyCode !== session.lobbyCode) return;
  const user = session.backend.auth.currentUser;
  const ownPlayer = session.players.find((player) => player.id === user.uid);
  const roundKey = String(Math.max(0, Number(detail.roundIndex) || 0));
  const roundScores = {
    ...(ownPlayer?.roundScores || {}),
    [roundKey]: Math.max(0, Number(detail.roundScore) || 0),
  };
  try {
    await session.backend.fs.setDoc(playerRef(session.backend, session.lobbyCode, user.uid), {
      score: Math.max(0, Number(detail.totalScore) || 0),
      roundIndex: Math.max(0, Number(detail.roundIndex) + 1 || 0),
      roundScores,
      updatedAtMs: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error("Could not sync multiplayer score", error);
  }
}

async function saveFinishedResult(detail = {}) {
  if (!session.backend || !session.lobbyCode || detail.lobbyCode !== session.lobbyCode) return;
  const user = session.backend.auth.currentUser;
  try {
    await session.backend.fs.setDoc(playerRef(session.backend, session.lobbyCode, user.uid), {
      score: Math.max(0, Number(detail.score) || 0),
      roundIndex: Math.max(0, Number(detail.rounds) || 0),
      finished: true,
      updatedAtMs: Date.now(),
    }, { merge: true });
  } catch (error) {
    console.error("Could not sync multiplayer result", error);
  }
}

async function returnToMultiplayerLobby(detail = {}) {
  if (!session.backend || !session.lobbyCode || detail.lobbyCode !== session.lobbyCode) return;
  const user = session.backend.auth.currentUser;
  session.waitingForRematch = true;
  session.currentRound = 0;
  session.resolvingRound = false;
  session.deadlineWriteRound = -1;
  session.roundClockWriteRound = -1;
  session.guessNoticeKeys.clear();
  if (session.viewWriteHandle) window.clearTimeout(session.viewWriteHandle);
  session.viewWriteHandle = 0;
  session.pendingViewState = null;
  session.lastViewSignature = "";
  clearDeadlineResolutionTimer();

  if (session.role === "host") getMenuApi()?.showHostLobbyView();
  else getMenuApi()?.showGuestLobbyView();

  try {
    await session.backend.fs.setDoc(playerRef(session.backend, session.lobbyCode, user.uid), {
      rematchReady: true,
      updatedAtMs: Date.now(),
    }, { merge: true });
    if (session.role === "host") {
      await session.backend.fs.updateDoc(
        session.backend.fs.doc(session.backend.db, LOBBY_COLLECTION, session.lobbyCode),
        {
          status: "waiting",
          awaitingRematch: true,
          roundClock: null,
          roundDeadline: null,
          updatedAt: session.backend.fs.serverTimestamp(),
        },
      );
    }
  } catch (error) {
    console.error("Could not return to the multiplayer lobby", error);
  }
}

// The host can only start once every player is back from the results screen. A player could
// reach the lobby with rematchReady still false - most often by rejoining before the host had
// returned, which stamps it from a stale awaitingRematch - and nothing ever corrected it,
// blocking the start for everyone. Any client genuinely in the lobby re-asserts it here.
function ensureRematchReady() {
  const backend = session.backend;
  const code = session.lobbyCode;
  const uid = backend?.auth.currentUser?.uid;
  if (!backend || !code || !uid || session.rematchReadyWriting) return;
  if (session.lobby?.status !== "waiting" || !session.lobby?.awaitingRematch) return;
  // Still on the results screen: the match started for this client and it has not returned.
  if (session.gameStarted && !session.waitingForRematch) return;
  const ownPlayer = session.players.find((player) => player.id === uid);
  if (!ownPlayer || ownPlayer.rematchReady === true) return;
  session.rematchReadyWriting = true;
  backend.fs.setDoc(playerRef(backend, code, uid), { rematchReady: true, updatedAtMs: Date.now() }, { merge: true })
    .catch((error) => console.error("Could not mark this player back in the lobby", error))
    .finally(() => { session.rematchReadyWriting = false; });
}

function renderStandings() {
  if (!dom.standings || !session.lobbyCode) return;
  dom.standings.innerHTML = "";
  const uid = session.backend?.auth.currentUser?.uid;
  const ownPlayer = session.players.find((player) => player.id === uid);
  const redPlayers = session.players.filter((player) => player.team === "red").sort((a, b) => Number(a.slot) - Number(b.slot));
  const bluePlayers = session.players.filter((player) => player.team === "blue").sort((a, b) => Number(a.slot) - Number(b.slot));
  const redScore = redPlayers.reduce((sum, player) => sum + Number(player.score || 0), 0);
  const blueScore = bluePlayers.reduce((sum, player) => sum + Number(player.score || 0), 0);
  const competitive = Boolean(session.lobby?.settings?.competitive);
  const redHealth = Number(session.lobby?.redHealth ?? lobbyMaxHealth());
  const blueHealth = Number(session.lobby?.blueHealth ?? lobbyMaxHealth());
  const isTie = competitive ? redHealth === blueHealth : redScore === blueScore;
  const winningTeam = isTie ? "" : competitive
    ? (redHealth > blueHealth ? "red" : "blue")
    : (redScore > blueScore ? "red" : "blue");

  const outcome = document.createElement("h2");
  outcome.className = `multiplayer-result-outcome ${isTie ? "is-tie" : ownPlayer?.team === winningTeam ? "is-win" : "is-loss"}`;
  outcome.textContent = isTie ? "Tie Game!" : ownPlayer?.team === winningTeam ? "You Win!" : "You Lost!";
  dom.standings.appendChild(outcome);

  const teams = document.createElement("div");
  teams.className = "multiplayer-result-teams";
  [
    { team: "red", label: "Red Team", players: redPlayers, score: redScore },
    { team: "blue", label: "Blue Team", players: bluePlayers, score: blueScore },
  ].forEach((entry) => {
    const section = document.createElement("section");
    section.className = `multiplayer-result-team is-${entry.team}${winningTeam === entry.team ? " is-winner" : ""}`;
    const header = document.createElement("header");
    const teamName = document.createElement("strong");
    const teamScore = document.createElement("span");
    teamName.textContent = entry.label;
    teamScore.textContent = new Intl.NumberFormat("en-US").format(entry.score);
    header.append(teamName, teamScore);
    section.appendChild(header);

    entry.players.forEach((player) => {
      const playerRow = document.createElement("article");
      playerRow.className = `multiplayer-result-player${player.id === uid ? " is-you" : ""}`;
      const playerHeader = document.createElement("div");
      const playerName = document.createElement("strong");
      const playerTotal = document.createElement("span");
      playerName.textContent = player.name || "Player";
      playerTotal.textContent = `${new Intl.NumberFormat("en-US").format(Number(player.score || 0))} pts`;
      playerHeader.append(playerName, playerTotal);
      playerRow.appendChild(playerHeader);

      const rounds = document.createElement("div");
      rounds.className = "multiplayer-result-rounds";
      const roundScores = player.roundScores || {};
      Object.keys(roundScores).sort((a, b) => Number(a) - Number(b)).forEach((roundKey) => {
        const score = document.createElement("span");
        const label = document.createElement("small");
        const value = document.createElement("strong");
        label.textContent = `R${Number(roundKey) + 1}`;
        const roundScore = Number(roundScores[roundKey]) || 0;
        value.textContent = new Intl.NumberFormat("en-US").format(roundScore);
        value.classList.toggle("is-perfect", roundScore === 5000);
        score.append(label, value);
        rounds.appendChild(score);
      });
      playerRow.appendChild(rounds);
      section.appendChild(playerRow);
    });
    teams.appendChild(section);
  });
  dom.standings.appendChild(teams);
}

async function leaveLobby(options = {}) {
  const code = session.lobbyCode;
  const role = session.role;
  const backend = session.backend;
  closeRemovePlayerPrompt();
  session.incomingSwitchRequesterId = "";
  session.switchResponseBusy = false;
  dom.switchModal?.classList.add("hidden");
  if (session.viewWriteHandle) window.clearTimeout(session.viewWriteHandle);
  session.viewWriteHandle = 0;
  session.pendingViewState = null;
  session.lastViewSignature = "";
  if (code && backend?.rtdb) {
    const removals = [];
    if (backend.auth.currentUser) {
      removals.push(backend.rt.remove(backend.rt.ref(backend.rtdb, `${SPECTATE_PATH}/${code}/${backend.auth.currentUser.uid}`)));
      removals.push(backend.rt.remove(backend.rt.ref(backend.rtdb, `${PRESENCE_PATH}/${code}/${backend.auth.currentUser.uid}`)));
      // Only our own entry can be removed here: the database rules allow writes per player (/<code>/<uid>), so
      // removing the whole /<code> node as host was always denied. Every other player clears their own entry when
      // they leave, and their onDisconnect handler covers a crash or closed tab.
    }
    // Once our data is cleared, close the Realtime Database connection so it stops counting against
    // the connection limit. Skipped if another lobby was opened in the meantime.
    Promise.race([
      Promise.allSettled(removals),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ]).then(() => {
      if (!session.lobbyCode) backend.rt.goOffline(backend.rtdb);
    });
  }
  session.viewDisconnectSet = false;
  session.stopRealtimePresence?.();
  session.stopRealtimePresence = null;
  stopSubscriptions();
  session.lobbyCode = "";
  session.role = "";
  session.lobby = null;
  session.players = [];
  session.lobbyReady = false;
  session.gameStarted = false;
  session.waitingForRematch = false;
  session.switchBusy = false;
  session.currentRound = 0;
  session.resolvingRound = false;
  session.deadlineWriteRound = -1;
  session.roundClockWriteRound = -1;
  session.guessNoticeKeys.clear();
  clearDeadlineResolutionTimer();
  if (!options.preserveUrl) updateAddressBar("");
  if (role === "host") setHostingFlag(false);
  if (!code || !backend?.auth.currentUser) return;

  try {
    if (role === "host" && !options.preserveRemote) {
      const playersRef = backend.fs.collection(backend.db, LOBBY_COLLECTION, code, "players");
      const players = await backend.fs.getDocs(playersRef);
      const batch = backend.fs.writeBatch(backend.db);
      players.docs.forEach((entry) => batch.delete(entry.ref));
      batch.delete(backend.fs.doc(backend.db, LOBBY_COLLECTION, code));
      await batch.commit();
    } else {
      // Always clean up our own player doc, even when preserving the rest of the
      // lobby (e.g. a forced exit) - only we (or the host) are allowed to delete it,
      // so skipping this would leave a ghost entry behind for everyone else.
      await backend.fs.deleteDoc(playerRef(backend, code, backend.auth.currentUser.uid));
    }
  } catch (error) {
    console.error("Could not cleanly leave multiplayer lobby", error);
  }
}

async function copyInvite(value, button) {
  if (!value || value === "Creating...") return;
  const original = button.innerHTML;
  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  button.innerHTML = "<span>Copied</span>";
  window.setTimeout(() => { button.innerHTML = original; }, 900);
}

function setInviteVisibility(button, isVisible) {
  const input = document.getElementById(button?.dataset.visibilityTarget || "");
  if (!button || !input) return;
  input.type = isVisible ? "text" : "password";
  button.setAttribute("aria-pressed", String(isVisible));
  const fieldName = input === dom.hostCode || input === dom.guestCode ? "lobby code" : "invite link";
  button.setAttribute("aria-label", `${isVisible ? "Hide" : "Show"} ${fieldName}`);
  button.title = `${isVisible ? "Hide" : "Show"} ${fieldName}`;
}

function normalizeLobbyCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, LOBBY_CODE_LENGTH);
}

function buildLobbyLink(code) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("lobby", code);
  return url.toString();
}

function updateAddressBar(code) {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set("lobby", code);
  else url.searchParams.delete("lobby");
  window.history.replaceState({}, "", url);
}

function openLobbyFromInviteLink() {
  const code = normalizeLobbyCode(new URLSearchParams(window.location.search).get("lobby"));
  if (!code) {
    let wasHosting = false;
    try { wasHosting = sessionStorage.getItem(HOSTING_STORAGE_KEY) === "1"; } catch { /* ignore */ }
    if (wasHosting) {
      setHostingFlag(false);
      window.setTimeout(() => getMenuApi()?.showMultiplayerView(), 0);
    }
    return;
  }
  window.setTimeout(() => {
    getMenuApi()?.showMultiplayerView();
    showJoinView();
    dom.joinInput.value = code;
    joinLobby(code);
  }, 0);
}
