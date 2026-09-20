const GRAAL_MAP_WIDTH = 20696;
const GRAAL_MAP_HEIGHT = 25862;
const DEFAULT_ROUNDS = 5;
const DEFAULT_SECONDS = 60;
const ROUND_COUNTDOWN_SECONDS = 3;
const ONE_SECOND_CHALLENGE_MS = 1000;
const TENTH_SECOND_CHALLENGE_MS = 100;
const MAX_SCORING_DISTANCE_PIXELS = 6500;
const MAX_ROUND_SCORE = 5000;
const DEFAULT_TEAM_HEALTH = 5000;
const MAX_MAP_ZOOM = 80;
const ANSWER_FOCUS_MIN_ZOOM = 6;
const ANSWER_FOCUS_DELAY_MS = 250;
const ANSWER_FOCUS_DURATION_MS = 1100;

// A hidden tab throttles setInterval heavily, which would freeze the shared round timers and
// leave a backgrounded player stuck on a finished round. Worker timers are not throttled, so
// the match keeps advancing in step with everyone else while the tab is in the background.
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
const PERFECT_CELEBRATION_DURATION_MS = 2600;
const ZOOM_BUTTON_FACTOR = 1.5;
const ZOOM_WHEEL_FACTOR = 1.28;
const MAP_DRAG_THRESHOLD = 6;
const MAP_ALIGNMENT_STORAGE_KEY = "graalmapguessr.mapImageOffset.v18";
const CALIBRATION_SAMPLES_STORAGE_KEY = "graalmapguessr.mapCalibrationSamples.v1";
const CAREER_STATS_STORAGE_KEY = "graalmapguessr.careerStats.v1";
const CAREER_STATUS_STORAGE_KEY = "graalmapguessr.careerStatus.v1";
const CAREER_HISTORY_STORAGE_KEY = "graalmapguessr.careerHistory.v1";
const CAREER_ACCOUNT_CREATED_STORAGE_KEY = "graalmapguessr.accountCreatedYear.v1";
const CURSOR_STYLE_STORAGE_KEY = "graalmapguessr.cursorStyle.v1";
const PROFILE_CUSTOMIZATION_STORAGE_KEY = "graalmapguessr.profileCustomization.v1";
const CAREER_XP_PER_LEVEL = 1000;
const CAREER_HISTORY_LIMIT = 15;
const USERNAME_CHANGE_COOLDOWN_DAYS = 30;
const USERNAME_CHANGE_COOLDOWN_MS = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
const PROFILE_PICTURE_MAX_BYTES = 4 * 1024 * 1024;
const CROPPER_OUTPUT_SIZE = 120;
const CROPPER_ZOOM_STEP = 0.01;
const DEFAULT_MAP_IMAGE_OFFSET_X = 8.13;
const DEFAULT_MAP_IMAGE_OFFSET_Y = 9.41;
const DEFAULT_MAP_IMAGE_WIDTH = 22589.66;
const DEFAULT_MAP_IMAGE_HEIGHT = 26240.47;
const DEFAULT_MAP_ALIGNMENT_STEP = 1;
const RESULT_MAP_HINT = " You can still zoom and drag the map.";
const MAP_IMAGE_RETRY_LIMIT = 2;
const MAP_LAYER_REFRESH_NUDGE_PX = 0.001;
const MENU_LOADING_DELAY_MS = 260;
const PAGE_TRANSITION_DURATION_MS = 360;
const MODE_CARD_CLICK_DURATION_MS = 70;

const PROFILE_TITLES = Object.freeze([
  "Local Explorer",
  "Map Scout",
  "Street Scholar",
  "Perfect Hunter",
  "Streak Climber",
  "Grid Runner",
  "Graal Veteran",
]);
const PROFILE_FLAGS = Object.freeze([
  { code: "us", label: "English" },
  { code: "sa", label: "Arabic" },
  { code: "bd", label: "Bangla" },
  { code: "dk", label: "Danish" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "ph", label: "Filipino" },
  { code: "fr", label: "French" },
  { code: "hmn", label: "Hmong" },
  { code: "id", label: "Indonesian" },
  { code: "it", label: "Italian" },
  { code: "hu", label: "Hungarian" },
  { code: "my", label: "Malay" },
  { code: "nl", label: "Dutch" },
  { code: "no", label: "Norwegian" },
  { code: "pl", label: "Polish" },
  { code: "br", label: "Portuguese BR" },
  { code: "pt", label: "Portuguese PT" },
  { code: "fi", label: "Finnish" },
  { code: "se", label: "Swedish" },
  { code: "vn", label: "Vietnamese" },
  { code: "tr", label: "Turkish" },
  { code: "cn", label: "Chinese" },
  { code: "jp", label: "Japanese" },
  { code: "kr", label: "Korean" },
]);
const PROFILE_FLAG_CODES = new Set(PROFILE_FLAGS.map((flag) => flag.code));
const DEFAULT_PROFILE_CUSTOMIZATION = Object.freeze({
  username: "ClassicGuessr",
  usernameChangedAt: 0,
  pfp: "",
  originalPic: "",
  cropState: null,
  title: PROFILE_TITLES[0],
  flag: "",
});

const tileImagePreloads = new Map();
let mapImageRetryCount = 0;
let mapImageRefreshFrame = 0;
let mapRecoveryFrame = 0;
let mapLayerRefreshSign = 1;
let menuLoadingHandle = 0;
let cropState = { x: 0, y: 0, scale: 1 };
let cropperOriginalSource = "";
let pendingRemovedProfilePicture = null;
let isCropDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let activeCropTouchMode = "";
let activeCropTouchId = null;
let cropTouchStartX = 0;
let cropTouchStartY = 0;
let cropTouchOriginX = 0;
let cropTouchOriginY = 0;
let cropPinchStartDistance = 0;
let cropPinchStartCenterX = 0;
let cropPinchStartCenterY = 0;
let cropPinchStartScale = 1;
let cropPinchOriginX = 0;
let cropPinchOriginY = 0;
let isCropSliderDragging = false;
const CURSOR_PRESETS = Object.freeze({
  default: null,
  classic: {
    hotspot: [4, 3],
    svg: buildArrowCursorSvg({
      fill: "#f7fff2",
      stroke: "#071116",
    }),
  },
  wedge: {
    hotspot: [29, 20],
    svg: buildArrowCursorSvg({
      path: "M5 4.2C5 2.7 6.6 1.9 7.8 2.8L29.1 18.6C30.6 19.7 29.8 22.1 28 22.2L15.7 22.9 7.7 30C6.6 31 5 30.2 5 28.7Z",
      fill: "#211e1f",
      stroke: "#070707",
      strokeWidth: 1.5,
    }),
  },
  sharp: {
    hotspot: [4, 3],
    svg: buildArrowCursorSvg({
      path: "M3 1.6 6.1 29 11.2 20.2 14.6 28.4 18 26.9 14.7 18.8 25 18.3 3 1.6Z",
      fill: "#f0c95b",
      stroke: "#071116",
      strokeWidth: 1.8,
    }),
  },
  slim: {
    hotspot: [4, 3],
    svg: buildArrowCursorSvg({
      path: "M4 2 5.4 25.5 10.7 17.9 14.4 26.2 17.1 25 13.4 16.8 22.1 16.4 4 2Z",
      fill: "#f7fff2",
      stroke: "#071116",
      strokeWidth: 1.8,
    }),
  },
  wide: {
    hotspot: [4, 3],
    svg: buildArrowCursorSvg({
      path: "M3 2 4.4 25.7 10.8 18.2 16.3 27.4 19.8 25.2 14.3 16.4 26 15.8 3 2Z",
      fill: "#b8f08f",
      stroke: "#071116",
      strokeWidth: 2.1,
    }),
  },
  stubby: {
    hotspot: [4, 3],
    svg: buildArrowCursorSvg({
      path: "M4 3 5.2 22.2 10 16.8 13.1 24 16.6 22.5 13.4 15.6 21.1 15.2 4 3Z",
      fill: "#f7fff2",
      stroke: "#071116",
      strokeWidth: 2.2,
    }),
  },
  tall: {
    hotspot: [4, 3],
    svg: buildArrowCursorSvg({
      path: "M4 1 4.9 29 11.1 19.7 14.8 28.2 18.1 26.7 14.5 18.1 23.1 18.1 4 1Z",
      fill: "#f7fff2",
      stroke: "#071116",
      strokeWidth: 2,
    }),
  },
  notch: {
    hotspot: [4, 3],
    svg: buildArrowCursorSvg({
      path: "M4 2 5.1 27 10.5 19.5 13 22.2 14.8 28 18.2 26.7 16.1 20.6 21.7 20.5 18.7 15.5 24.2 15.3 4 2Z",
      fill: "#f0c95b",
      stroke: "#071116",
      strokeWidth: 2,
    }),
  },
  hook: {
    hotspot: [4, 3],
    svg: buildArrowCursorSvg({
      path: "M4 2 5.1 26.2 11.6 18.3 15.5 25.8 18.8 24.1 15.1 16.9 23.4 15.6 4 2Z",
      fill: "#b8f08f",
      stroke: "#071116",
      strokeWidth: 2,
    }),
  },
  hollow: {
    hotspot: [4, 3],
    svg: buildArrowCursorSvg({
      path: "M4 2 5.2 26 11 19.1 15 27.4 18.4 25.8 14.4 17.5 23 17.1 4 2Z",
      fill: "none",
      stroke: "#f0c95b",
      strokeWidth: 2.8,
    }),
  },
  pixel: {
    hotspot: [4, 3],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges"><path d="M4 2h4v2h2v2h2v2h2v2h2v2h4v4h-8v2h2v2h2v2h2v4h-4v-2h-2v-2h-2v-2h-2v6H4Z" fill="#f7fff2"/><path d="M4 2h4v2H6v18H4Zm4 2h2v2H8Zm2 2h2v2h-2Zm2 2h2v2h-2Zm2 2h2v2h-2Zm2 2h4v4h-8v2h-2v-4h6Zm-4 6h2v2h-2Zm2 2h2v2h-2Zm2 2h2v4h-4v-2h2Zm-6-2h2v2h-2Zm-2-2h2v2h-2Zm-2 2h2v6H8Z" fill="#071116"/></svg>',
  },
});
const DEFAULT_CAREER_STATS = Object.freeze({
  matchesPlayed: 0,
  totalScore: 0,
  totalGuesses: 0,
  bestRound: 0,
  bestMatchScore: 0,
  coopMatches: 0,
  coopTotalScore: 0,
  coopTotalGuesses: 0,
  coopBestMatchScore: 0,
  coopPerfects: 0,
  coopStreak: 0,
  coopHighestStreak: 0,
  mostPlayedWith: "None",
  perfects: 0,
  streak: 0,
  highestStreak: 0,
});

const dom = {
  menuScreen: document.getElementById("menuScreen"),
  gameScreen: document.getElementById("gameScreen"),
  resultsScreen: document.getElementById("resultsScreen"),
  pageTransition: document.getElementById("classicPageTransition"),
  soloPageBrand: document.querySelector(".solo-page-brand"),
  homeLinks: [...document.querySelectorAll(".solo-menu-home-link")],
  soloModePicker: document.getElementById("soloModePicker"),
  soloModePickerStatus: document.getElementById("soloModePickerStatus"),
  classicDiscordButton: document.getElementById("classicDiscordButton"),
  playMenuView: document.getElementById("playMenuView"),
  soloMultiplayerView: document.getElementById("soloMultiplayerView"),
  multiplayerHostView: document.getElementById("multiplayerHostView"),
  multiplayerJoinView: document.getElementById("multiplayerJoinView"),
  multiplayerGuestView: document.getElementById("multiplayerGuestView"),
  multiplayerStandings: document.getElementById("multiplayerStandings"),
  teamHealthHud: document.getElementById("teamHealthHud"),
  redHealthValue: document.getElementById("redHealthValue"),
  blueHealthValue: document.getElementById("blueHealthValue"),
  redHealthBar: document.getElementById("redHealthBar"),
  blueHealthBar: document.getElementById("blueHealthBar"),
  redDamageMultiplier: document.getElementById("redDamageMultiplier"),
  blueDamageMultiplier: document.getElementById("blueDamageMultiplier"),
  competitiveDamageSequence: document.getElementById("competitiveDamageSequence"),
  competitiveDamageScore: document.getElementById("competitiveDamageScore"),
  competitiveDamageMultiplier: document.getElementById("competitiveDamageMultiplier"),
  multiplayerGuessNotice: document.getElementById("multiplayerGuessNotice"),
  spectatorPanel: document.getElementById("spectatorPanel"),
  spectatorGrid: document.getElementById("spectatorGrid"),
  nextRoundCountdown: document.getElementById("nextRoundCountdown"),
  nextRoundCountdownValue: document.getElementById("nextRoundCountdownValue"),
  singleplayerModeButton: document.getElementById("singleplayerModeButton"),
  singleplayerBackButton: document.getElementById("singleplayerBackButton"),
  multiplayerBackButton: document.getElementById("multiplayerBackButton"),
  startButton: document.getElementById("startButton"),
  multiplayerButton: document.getElementById("multiplayerButton"),
  singleplayerSettingsModal: document.getElementById("singleplayerSettingsModal"),
  closeSingleplayerSettings: document.getElementById("closeSingleplayerSettings"),
  multiplayerSettingsModal: document.getElementById("multiplayerSettingsModal"),
  closeMultiplayerSettings: document.getElementById("closeMultiplayerSettings"),
  menuLoadingOverlay: document.getElementById("menuLoadingOverlay"),
  settingsStartButton: document.getElementById("settingsStartButton"),
  settingsLoadStatus: document.getElementById("settingsLoadStatus"),
  cursorToolbox: document.getElementById("cursorToolbox"),
  cursorToolboxToggle: document.getElementById("cursorToolboxToggle"),
  cursorToolboxPanel: document.getElementById("cursorToolboxPanel"),
  cursorOptions: [...document.querySelectorAll("[data-cursor-option]")],
  playAgainButton: document.getElementById("playAgainButton"),
  loadStatus: document.getElementById("loadStatus"),
  menuTabs: [...document.querySelectorAll("[data-menu-tab]")],
  menuViews: [...document.querySelectorAll("[data-menu-view]")],
  careerStatsPanel: document.getElementById("careerStatsPanel"),
  careerProfilePanel: document.getElementById("careerProfilePanel"),
  careerHistoryPanel: document.getElementById("careerHistoryPanel"),
  careerEditProfileButton: document.getElementById("careerEditProfileButton"),
  careerProfileSaveButton: document.getElementById("careerProfileSaveButton"),
  careerHistoryButton: document.getElementById("careerHistoryButton"),
  careerHistoryBackButton: document.getElementById("careerHistoryBackButton"),
  careerHistoryList: document.getElementById("careerHistoryList"),
  careerRankInfoButton: document.getElementById("careerRankInfoButton"),
  careerRankPopover: document.getElementById("careerRankPopover"),
  careerRankCloseButton: document.getElementById("careerRankCloseButton"),
  profileRailAvatar: document.getElementById("profileRailAvatar"),
  careerAvatar: document.getElementById("careerAvatar"),
  careerFlag: document.getElementById("careerFlag"),
  careerNameValue: document.getElementById("careerNameValue"),
  careerTitleValue: document.getElementById("careerTitleValue"),
  careerStatusInput: document.getElementById("careerStatusInput"),
  careerStatusValue: document.getElementById("careerStatusValue"),
  careerAccountCreatedValue: document.getElementById("careerAccountCreatedValue"),
  careerLevelValue: document.getElementById("careerLevelValue"),
  careerLevelProgressBar: document.getElementById("careerLevelProgressBar"),
  careerLevelProgressValue: document.getElementById("careerLevelProgressValue"),
  careerMatchesValue: document.getElementById("careerMatchesValue"),
  careerStreakValue: document.getElementById("careerStreakValue"),
  careerHighStreakValue: document.getElementById("careerHighStreakValue"),
  careerHighestMatchScoreValue: document.getElementById("careerHighestMatchScoreValue"),
  careerTotalGuessesValue: document.getElementById("careerTotalGuessesValue"),
  careerCoopMatchesValue: document.getElementById("careerCoopMatchesValue"),
  careerCoopStreakValue: document.getElementById("careerCoopStreakValue"),
  careerCoopHighStreakValue: document.getElementById("careerCoopHighStreakValue"),
  careerCoopPerfectsValue: document.getElementById("careerCoopPerfectsValue"),
  careerCoopAvgScoreValue: document.getElementById("careerCoopAvgScoreValue"),
  careerCoopHighestMatchScoreValue: document.getElementById("careerCoopHighestMatchScoreValue"),
  careerCoopTotalGuessesValue: document.getElementById("careerCoopTotalGuessesValue"),
  careerCoopTotalScoreValue: document.getElementById("careerCoopTotalScoreValue"),
  careerMostPlayedWithValue: document.getElementById("careerMostPlayedWithValue"),
  careerPerfectsValue: document.getElementById("careerPerfectsValue"),
  careerAvgScoreValue: document.getElementById("careerAvgScoreValue"),
  careerTotalScoreValue: document.getElementById("careerTotalScoreValue"),
  careerAchievementFirstGuess: document.getElementById("careerAchievementFirstGuess"),
  careerAchievementPerfectFinder: document.getElementById("careerAchievementPerfectFinder"),
  careerAchievementScoreChaser: document.getElementById("careerAchievementScoreChaser"),
  leaderboardAvatar: document.getElementById("leaderboardAvatar"),
  leaderboardAvatarInitials: document.getElementById("leaderboardAvatarInitials"),
  leaderboardEloValue: document.getElementById("leaderboardEloValue"),
  leaderboardLevelValue: document.getElementById("leaderboardLevelValue"),
  leaderboardPerfectsValue: document.getElementById("leaderboardPerfectsValue"),
  leaderboardAvgSpeedValue: document.getElementById("leaderboardAvgSpeedValue"),
  leaderboardPlayerName: document.getElementById("leaderboardPlayerName"),
  leaderboardPlayerTitle: document.getElementById("leaderboardPlayerTitle"),
  leaderboardPageButtons: [...document.querySelectorAll(".leaderboard-page-button")],
  profilePreviewAvatar: document.getElementById("profilePreviewAvatar"),
  profilePreviewInitials: document.getElementById("profilePreviewInitials"),
  profilePreviewFlag: document.getElementById("profilePreviewFlag"),
  profilePreviewName: document.getElementById("profilePreviewName"),
  profilePreviewTitle: document.getElementById("profilePreviewTitle"),
  profilePreviewStatus: document.getElementById("profilePreviewStatus"),
  profileUsernameInput: document.getElementById("profileUsernameInput"),
  profileUsernameCooldown: document.getElementById("profileUsernameCooldown"),
  profileUsernameMessage: document.getElementById("profileUsernameMessage"),
  profileStatusCount: document.getElementById("profileStatusCount"),
  profilePicInput: document.getElementById("profilePicInput"),
  profileUploadPictureButton: document.getElementById("profileUploadPictureButton"),
  profileEditPictureButton: document.getElementById("profileEditPictureButton"),
  profileRemovePictureButton: document.getElementById("profileRemovePictureButton"),
  profileUndoRemovePictureButton: document.getElementById("profileUndoRemovePictureButton"),
  profilePictureMessage: document.getElementById("profilePictureMessage"),
  cropperContainer: document.getElementById("cropperContainer"),
  cropperArea: document.getElementById("cropperArea"),
  cropperImage: document.getElementById("cropperImage"),
  cropperZoom: document.getElementById("cropperZoom"),
  centerImageBtn: document.getElementById("centerImageBtn"),
  cancelImageBtn: document.getElementById("cancelImageBtn"),
  saveImageBtn: document.getElementById("saveImageBtn"),
  profileTitleSelect: document.getElementById("profileTitleSelect"),
  profileClearFlagButton: document.getElementById("profileClearFlagButton"),
  profileFlagPicker: document.getElementById("profileFlagPicker"),
  profileFlagSelectorButton: document.getElementById("profileFlagSelectorButton"),
  profileFlagModal: document.getElementById("profileFlagModal"),
  profileFlagCloseButton: document.getElementById("profileFlagCloseButton"),
  profileSelectedFlagSwatch: document.getElementById("profileSelectedFlagSwatch"),
  profileSelectedFlagLabel: document.getElementById("profileSelectedFlagLabel"),
  profileFlagList: document.getElementById("profileFlagList"),
  singleplayerQueueOptions: [...document.querySelectorAll("[data-singleplayer-queue]")],
  modeOptions: [...document.querySelectorAll("[data-setting-mode]")],
  timerOptions: [...document.querySelectorAll("[data-setting-seconds]")],
  roundOptions: [...document.querySelectorAll("[data-setting-rounds]")],
  oneSecondRuleSwitch: document.getElementById("oneSecondRuleSwitch"),
  tenthSecondRuleSwitch: document.getElementById("tenthSecondRuleSwitch"),
  locationBadgeTexts: [...document.querySelectorAll("[data-location-badge-text]")],
  gameHomeButton: document.getElementById("gameHomeButton"),
  resultsHomeButton: document.getElementById("resultsHomeButton"),
  perfectScoreCelebration: document.getElementById("perfectScoreCelebration"),
  multiplayerModeOptions: [...document.querySelectorAll("[data-multiplayer-mode]")],
  roundLabel: document.getElementById("roundLabel"),
  timerLabel: document.getElementById("timerLabel"),
  scoreLabel: document.getElementById("scoreLabel"),
  tileImage: document.getElementById("tileImage"),
  statusLine: document.getElementById("statusLine"),
  mapShell: document.getElementById("mapShell"),
  mapActions: document.querySelector(".map-actions"),
  mapViewport: document.getElementById("mapViewport"),
  markerLayer: document.getElementById("markerLayer"),
  clueStage: document.getElementById("clueStage"),
  clueOverlay: document.getElementById("clueOverlay"),
  clueCountdownValue: document.getElementById("clueCountdownValue"),
  mapImage: document.getElementById("mapImage"),
  guessMarker: document.getElementById("guessMarker"),
  answerMarker: document.getElementById("answerMarker"),
  guessButton: document.getElementById("guessButton"),
  nextButton: document.getElementById("nextButton"),
  zoomInButton: document.getElementById("zoomInButton"),
  zoomOutButton: document.getElementById("zoomOutButton"),
  zoomResetButton: document.getElementById("zoomResetButton"),
  imageOffsetXInput: document.getElementById("imageOffsetXInput"),
  imageOffsetYInput: document.getElementById("imageOffsetYInput"),
  imageWidthInput: document.getElementById("imageWidthInput"),
  imageHeightInput: document.getElementById("imageHeightInput"),
  imageOffsetStepInput: document.getElementById("imageOffsetStepInput"),
  copyCalibrationButton: document.getElementById("copyCalibrationButton"),
  resetCalibrationButton: document.getElementById("resetCalibrationButton"),
  calibrationPickButton: document.getElementById("calibrationPickButton"),
  calibrationUndoButton: document.getElementById("calibrationUndoButton"),
  calibrationClearButton: document.getElementById("calibrationClearButton"),
  calibrationOutput: document.getElementById("calibrationOutput"),
  calibrationStatus: document.getElementById("calibrationStatus"),
  calibrationSolverStatus: document.getElementById("calibrationSolverStatus"),
  calibrationNudgeButtons: [...document.querySelectorAll("[data-offset-dx][data-offset-dy]")],
  calibrationSizeButtons: [...document.querySelectorAll("[data-size-dw][data-size-dh]")],
  resultsTitle: document.getElementById("resultsTitle"),
  resultsScoreValue: document.getElementById("resultsScoreValue"),
  resultsGrid: document.getElementById("resultsGrid"),
};

const state = {
  tiles: [],
  rounds: [],
  roundIndex: 0,
  score: 0,
  selectedMode: "classic",
  selectedSeconds: DEFAULT_SECONDS,
  selectedRounds: DEFAULT_ROUNDS,
  challengeRevealMs: 0,
  timeLeft: DEFAULT_SECONDS,
  challengeElapsedSeconds: 0,
  challengeTimerStartedAt: 0,
  timerHandle: 0,
  countdownHandle: 0,
  oneSecondBlackoutHandle: 0,
  answerFocusDelayHandle: 0,
  answerFocusHandle: 0,
  revealDelayHandle: 0,
  perfectCelebrationHandle: 0,
  roundInputLocked: false,
  mapNavigationLocked: false,
  loading: false,
  mapZoom: 1,
  mapPanX: 0,
  mapPanY: 0,
  mapImageOffsetX: DEFAULT_MAP_IMAGE_OFFSET_X,
  mapImageOffsetY: DEFAULT_MAP_IMAGE_OFFSET_Y,
  mapImageWidth: DEFAULT_MAP_IMAGE_WIDTH,
  mapImageHeight: DEFAULT_MAP_IMAGE_HEIGHT,
  mapImageOffsetStep: DEFAULT_MAP_ALIGNMENT_STEP,
  calibrationCapture: false,
  calibrationSamples: [],
  mapDrag: null,
  mapTouchPointers: new Map(),
  mapPinch: null,
  pendingGuess: null,
  revealed: false,
  results: [],
  careerStats: { ...DEFAULT_CAREER_STATS },
  careerHistory: [],
  profileCustomization: { ...DEFAULT_PROFILE_CUSTOMIZATION },
  selectedQueue: "casual",
  careerStatsSavedForRun: false,
  multiplayerSession: null,
  multiplayerLockReason: "",
  multiplayerDamageRound: -1,
  pendingDamagePresentation: null,
  displayedRedHealth: 5000,
  displayedBlueHealth: 5000,
  damageSequenceToken: 0,
  damageSequenceFrame: 0,
  competitiveDeadlineMs: 0,
  multiplayerRoundStartedAtMs: 0,
  multiplayerRoundEndsAtMs: 0,
  multiplayerNoticeHandle: 0,
  nextRoundCountdownHandle: 0,
  multiplayerNextRoundAtMs: 0,
};

window.ClassicGuessrGame = Object.freeze({
  createMultiplayerRoundPlan,
  startMultiplayerGame,
});

window.ClassicGuessrMenu = Object.freeze({
  showModePicker,
  showMultiplayerView,
  showHostLobbyView,
  showJoinLobbyView,
  showGuestLobbyView,
  exitMultiplayerMatch,
});

init();

function init() {
  loadMapImageOffset();
  bindSoloEvents();
  bindMultiplayerGameEvents();
  bindDiscordPopup();
  startLocationBadgeAnimation();
  updateMapTransform();
  showModePicker();
  revealPage();
}

function bindDiscordPopup() {
  const openButton = document.getElementById("classicDiscordButton");
  const overlay = document.getElementById("classicDiscordOverlay");
  const closeButton = document.getElementById("classicDiscordClose");
  const copyButton = document.getElementById("classicDiscordCopy");
  const status = document.getElementById("classicDiscordStatus");
  const discordUsername = "rvstu";
  if (!openButton || !overlay || !closeButton || !copyButton || !status) return;

  const openDialog = () => {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    status.textContent = "";
    closeButton.focus();
  };

  const closeDialog = () => {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    status.textContent = "";
    openButton.focus();
  };

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(discordUsername);
    } catch (error) {
      const fallback = document.createElement("textarea");
      fallback.value = discordUsername;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand("copy");
      fallback.remove();
    }

    status.textContent = "Username copied!";
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1600);
  };

  openButton.addEventListener("click", openDialog);
  closeButton.addEventListener("click", closeDialog);
  copyButton.addEventListener("click", copyUsername);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeDialog();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) closeDialog();
  });
}

function bindMultiplayerGameEvents() {
  window.addEventListener("classicguessr:multiplayer-markers", (event) => {
    if (!state.multiplayerSession || event.detail?.lobbyCode !== state.multiplayerSession.lobbyCode) return;
    renderMultiplayerMarkers(event.detail.markers || []);
  });
  window.addEventListener("classicguessr:multiplayer-spectators", (event) => {
    if (!state.multiplayerSession || event.detail?.lobbyCode !== state.multiplayerSession.lobbyCode) return;
    renderSpectatorViews(event.detail.players || [], event.detail.ownMarker || null);
  });
  window.addEventListener("classicguessr:multiplayer-health", (event) => {
    if (!state.multiplayerSession || event.detail?.lobbyCode !== state.multiplayerSession.lobbyCode) return;
    if (!state.multiplayerSession.competitive) return;
    if (!queueCompetitiveDamage(event.detail)) updateTeamHealth(event.detail);
  });
  window.addEventListener("classicguessr:multiplayer-deadline", (event) => {
    if (
      !state.multiplayerSession?.competitive
      || event.detail?.lobbyCode !== state.multiplayerSession.lobbyCode
      || Number(event.detail?.roundIndex) !== state.roundIndex
      || state.revealed
    ) return;
    applyCompetitiveDeadline(Number(event.detail.endsAtMs));
  });
  window.addEventListener("classicguessr:multiplayer-round-clock", (event) => {
    if (
      !state.multiplayerSession
      || event.detail?.lobbyCode !== state.multiplayerSession.lobbyCode
      || Number(event.detail?.roundIndex) !== state.roundIndex
      || state.revealed
      || state.multiplayerLockReason
    ) return;
    applyMultiplayerRoundClock(Number(event.detail.startsAtMs), Number(event.detail.endsAtMs));
  });
  window.addEventListener("classicguessr:multiplayer-notice", (event) => {
    if (
      !state.multiplayerSession
      || event.detail?.lobbyCode !== state.multiplayerSession.lobbyCode
      || Number(event.detail?.roundIndex) !== state.roundIndex
    ) return;
    showMultiplayerGuessNotice(event.detail.message, event.detail.team);
  });
  window.addEventListener("classicguessr:multiplayer-round-ready", (event) => {
    if (
      !state.multiplayerSession
      || event.detail?.lobbyCode !== state.multiplayerSession.lobbyCode
      || Number(event.detail?.roundIndex) !== state.roundIndex
      || state.revealed
    ) return;
    state.multiplayerSession.matchOver = Boolean(event.detail.matchOver);
    state.multiplayerNextRoundAtMs = Number(event.detail.nextRoundAtMs) || 0;
    if (event.detail.forcedByDeadline && !state.roundInputLocked) {
      state.pendingGuess = null;
      state.multiplayerLockReason = "timeout";
    }
    if (!queueCompetitiveDamage(event.detail)) updateTeamHealth(event.detail);
    scheduleSynchronizedReveal(Number(event.detail.revealAtMs) || 0);
  });
}

// The reveal is the first beat of the round-end sequence, so it has to start at the same
// server-derived instant on every client - otherwise each client's focus animation, damage
// sequence and next-round countdown all inherit that client's snapshot-arrival jitter.
function scheduleSynchronizedReveal(revealAtMs) {
  clearSynchronizedReveal();
  const reason = state.multiplayerLockReason || "guess";
  // Cap the wait so a bad clock-offset estimate can never stall the match.
  const delay = Math.min(Math.max(0, revealAtMs - Date.now()), 3000);
  if (delay <= 0) {
    revealRound(reason);
    return;
  }
  state.revealDelayHandle = window.setTimeout(() => {
    state.revealDelayHandle = 0;
    if (!state.revealed) revealRound(state.multiplayerLockReason || reason);
  }, delay);
}

function clearSynchronizedReveal() {
  if (state.revealDelayHandle) window.clearTimeout(state.revealDelayHandle);
  state.revealDelayHandle = 0;
}

function revealPage() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => dom.pageTransition?.classList.remove("is-active"));
  });
}

function navigateWithFade(event) {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
  ) {
    return;
  }

  event.preventDefault();
  const destination = event.currentTarget.href;
  dom.pageTransition?.classList.add("is-active");
  window.setTimeout(() => {
    window.location.href = destination;
  }, PAGE_TRANSITION_DURATION_MS);
}

function showModePicker() {
  show(dom.soloModePicker);
  hide(dom.playMenuView);
  hide(dom.soloMultiplayerView);
  hide(dom.multiplayerHostView);
  hide(dom.multiplayerJoinView);
  hide(dom.multiplayerGuestView);
  show(dom.classicDiscordButton);
  if (dom.soloModePickerStatus) {
    dom.soloModePickerStatus.textContent = "";
  }
  window.dispatchEvent(new CustomEvent("classicguessr:mode-picker"));
  scheduleMobilePageTitlePosition();
}

function fitMobileLobbyToViewport() {
  const lobbyViews = [dom.multiplayerHostView, dom.multiplayerGuestView].filter(Boolean);
  const activeLobby = lobbyViews.find((view) => !view.classList.contains("hidden"));
  const isMobileLobby = Boolean(activeLobby)
    && window.matchMedia("(max-width: 900px)").matches
    && !dom.menuScreen?.classList.contains("hidden");

  lobbyViews.forEach((view) => {
    if (view !== activeLobby || !isMobileLobby) view.style.removeProperty("zoom");
  });
  if (!isMobileLobby || !dom.menuScreen) return;

  const screenStyle = window.getComputedStyle(dom.menuScreen);
  const verticalPadding = (Number.parseFloat(screenStyle.paddingTop) || 0)
    + (Number.parseFloat(screenStyle.paddingBottom) || 0);
  const panelShift = Number.parseFloat(
    activeLobby.style.getPropertyValue("--mobile-title-panel-shift"),
  ) || 0;
  const availableHeight = Math.max(1, dom.menuScreen.clientHeight - verticalPadding - panelShift);
  const naturalHeight = Math.max(1, activeLobby.scrollHeight);
  const fitScale = Math.min(1, availableHeight / naturalHeight);
  const roundedScale = Math.floor(fitScale * 1000) / 1000;
  const currentScale = Number.parseFloat(activeLobby.style.zoom) || 1;

  if (Math.abs(currentScale - roundedScale) > 0.001) {
    activeLobby.style.zoom = String(roundedScale);
  }
}

function positionMobileModeTitle() {
  if (!dom.soloPageBrand || !dom.menuScreen) return;
  const mobileMenuViews = [
    dom.soloModePicker,
    dom.playMenuView,
    dom.soloMultiplayerView,
    dom.multiplayerHostView,
    dom.multiplayerJoinView,
    dom.multiplayerGuestView,
  ].filter(Boolean);
  const isMobileMenu = window.matchMedia("(max-width: 820px)").matches
    && !dom.menuScreen.classList.contains("hidden");
  mobileMenuViews.forEach((view) => view.style.removeProperty("--mobile-title-panel-shift"));
  const activeView = mobileMenuViews.find((view) => !view.classList.contains("hidden"));
  if (!isMobileMenu || !activeView) {
    dom.soloPageBrand.style.removeProperty("--mobile-page-title-center");
    fitMobileLobbyToViewport();
    return;
  }

  const screenRect = dom.menuScreen.getBoundingClientRect();
  const viewRect = activeView.getBoundingClientRect();
  const pageHomeLink = dom.homeLinks.find((link) => link.classList.contains("solo-menu-home-link--page"));
  const homeRect = pageHomeLink?.getBoundingClientRect();
  const homeBottom = homeRect ? Math.max(0, homeRect.bottom - screenRect.top) : 0;
  const titleRect = dom.soloPageBrand.getBoundingClientRect();
  const unshiftedViewTop = Math.max(0, viewRect.top - screenRect.top);
  const requiredViewTop = homeBottom + titleRect.height + 16;
  const panelShift = Math.max(0, requiredViewTop - unshiftedViewTop);
  activeView.style.setProperty("--mobile-title-panel-shift", `${panelShift}px`);

  const availableHeight = unshiftedViewTop + panelShift;
  const idealCenter = homeBottom + (availableHeight - homeBottom) / 2;
  const titleHalfHeight = titleRect.height / 2;
  const homeClearanceCenter = homeBottom + titleHalfHeight + 8;
  const lowestCenterBeforePicker = availableHeight - titleHalfHeight - 8;
  const centeredWithoutOverlap = lowestCenterBeforePicker >= homeClearanceCenter
    ? Math.min(Math.max(idealCenter, homeClearanceCenter), lowestCenterBeforePicker)
    : idealCenter;
  dom.soloPageBrand.style.setProperty("--mobile-page-title-center", `${centeredWithoutOverlap}px`);
  fitMobileLobbyToViewport();
}

function scheduleMobilePageTitlePosition() {
  window.requestAnimationFrame(() => window.requestAnimationFrame(positionMobileModeTitle));
}

function positionMobileGameHeader() {
  if (!dom.gameScreen || !dom.timerLabel || !dom.tileImage) return;

  const timerPill = dom.timerLabel.closest(".hud-pill--timer");
  const hud = dom.timerLabel.closest(".hud");
  const isMobileGame = window.matchMedia("(max-width: 820px)").matches
    && !dom.gameScreen.classList.contains("hidden");

  if (!timerPill || !hud || !isMobileGame) {
    timerPill?.style.removeProperty("top");
    return;
  }

  const screenRect = dom.gameScreen.getBoundingClientRect();
  const clueRect = dom.tileImage.getBoundingClientRect();
  const hudRect = hud.getBoundingClientRect();
  const timerRect = timerPill.getBoundingClientRect();

  if (!screenRect.height || !clueRect.height || !timerRect.height) return;

  const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  const panelGap = rootFontSize * 0.44;
  const timerTop = Math.max(0, clueRect.top - panelGap - timerRect.height - hudRect.top);
  timerPill.style.top = `${timerTop}px`;
}

function positionTeamHealthHud() {
  if (!dom.teamHealthHud || !dom.gameScreen || !dom.tileImage) return;
  const screenRect = dom.gameScreen.getBoundingClientRect();
  const tileRect = dom.tileImage.getBoundingClientRect();
  if (!screenRect.width || !tileRect.width) return;
  const centerX = tileRect.left - screenRect.left + tileRect.width / 2;
  dom.teamHealthHud.style.setProperty("--team-health-center-x", `${centerX}px`);
  dom.teamHealthHud.style.setProperty("--team-health-width", `${tileRect.width}px`);

  if (window.matchMedia("(max-width: 820px)").matches) {
    const timerPill = dom.timerLabel?.closest(".hud-pill--timer");
    const roundScoreGroup = dom.scoreLabel?.closest(".hud-stats");
    const healthRect = dom.teamHealthHud.getBoundingClientRect();
    const timerRect = timerPill?.getBoundingClientRect();
    const roundScoreRect = roundScoreGroup?.getBoundingClientRect();
    if (timerRect && roundScoreRect && healthRect.height) {
      const timerCenterY = timerRect.top + timerRect.height / 2;
      const roundScoreCenterY = roundScoreRect.top + roundScoreRect.height / 2;
      const centerY = (timerCenterY + roundScoreCenterY) / 2;
      if (Math.abs(timerCenterY - roundScoreCenterY) >= healthRect.height + 4) {
        dom.teamHealthHud.style.setProperty(
          "--team-health-top",
          `${Math.max(0, centerY - screenRect.top - healthRect.height / 2)}px`,
        );
      } else {
        dom.teamHealthHud.style.removeProperty("--team-health-top");
      }
    }
  } else {
    dom.teamHealthHud.style.removeProperty("--team-health-top");
  }
}

function scheduleMobileGameHeaderPosition() {
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    positionMobileGameHeader();
    positionTeamHealthHud();
  }));
}

function showSoloSetup() {
  hide(dom.soloModePicker);
  hide(dom.soloMultiplayerView);
  hide(dom.multiplayerHostView);
  hide(dom.multiplayerJoinView);
  hide(dom.multiplayerGuestView);
  hide(dom.classicDiscordButton);
  show(dom.playMenuView);
  scheduleMobilePageTitlePosition();
}

function showMultiplayerView() {
  hide(dom.soloModePicker);
  hide(dom.playMenuView);
  hide(dom.multiplayerHostView);
  hide(dom.multiplayerJoinView);
  hide(dom.multiplayerGuestView);
  hide(dom.classicDiscordButton);
  show(dom.soloMultiplayerView);
  window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-view"));
  scheduleMobilePageTitlePosition();
}

function showHostLobbyView() {
  hide(dom.soloModePicker);
  hide(dom.playMenuView);
  hide(dom.soloMultiplayerView);
  hide(dom.multiplayerJoinView);
  hide(dom.multiplayerGuestView);
  hide(dom.classicDiscordButton);
  show(dom.multiplayerHostView);
  scheduleMobilePageTitlePosition();
}

function showJoinLobbyView() {
  hide(dom.soloModePicker);
  hide(dom.playMenuView);
  hide(dom.soloMultiplayerView);
  hide(dom.multiplayerHostView);
  hide(dom.multiplayerGuestView);
  hide(dom.classicDiscordButton);
  show(dom.multiplayerJoinView);
  scheduleMobilePageTitlePosition();
}

function showGuestLobbyView() {
  hide(dom.soloModePicker);
  hide(dom.playMenuView);
  hide(dom.soloMultiplayerView);
  hide(dom.multiplayerHostView);
  hide(dom.multiplayerJoinView);
  hide(dom.classicDiscordButton);
  show(dom.multiplayerGuestView);
  scheduleMobilePageTitlePosition();
}

function exitMultiplayerMatch() {
  state.multiplayerSession = null;
  state.multiplayerLockReason = "";
  state.multiplayerDamageRound = -1;
  state.pendingDamagePresentation = null;
  state.competitiveDeadlineMs = 0;
  state.multiplayerNextRoundAtMs = 0;
  clearRoundFlowTimers();
  clearMultiplayerGuessNotice();
  setCalibrationCapture(false);
  setMenuView("play");
  hide(dom.gameScreen);
  hide(dom.resultsScreen);
  hide(dom.teamHealthHud);
  clearMultiplayerMarkers();
  clearSpectatorViews();
  dom.gameScreen.classList.remove("is-red-team", "is-blue-team");
  show(dom.menuScreen);
  showMultiplayerView();
}

function selectModeCard(button, callback) {
  if (button.classList.contains("is-selecting")) {
    return;
  }

  button.classList.add("is-selecting");
  window.setTimeout(() => {
    button.classList.remove("is-selecting");
    callback();
  }, MODE_CARD_CLICK_DURATION_MS);
}

function startLocationBadgeAnimation() {
  if (!dom.locationBadgeTexts.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  dom.locationBadgeTexts.forEach((badgeText) => {
    const baseRotation = Number(badgeText.dataset.baseRotation) || -14;
    let rotation = baseRotation;
    let scale = 1;

    const animateNext = () => {
      const nextRotation = baseRotation + (Math.random() - 0.5) * 6;
      const nextScale = 0.98 + Math.random() * 0.08;
      const duration = 1200 + Math.random() * 1000;
      const pause = 180 + Math.random() * 420;

      const animation = badgeText.animate(
        [
          { transform: `rotate(${rotation}deg) scale(${scale})` },
          { transform: `rotate(${nextRotation}deg) scale(${nextScale})` },
        ],
        { duration, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" },
      );

      rotation = nextRotation;
      scale = nextScale;
      animation.finished.then(() => window.setTimeout(animateNext, pause)).catch(() => {});
    };

    animateNext();
  });
}

function bindSoloEvents() {
  dom.singleplayerModeButton?.addEventListener("click", () => {
    selectModeCard(dom.singleplayerModeButton, showSoloSetup);
  });
  dom.multiplayerButton?.addEventListener("click", () => {
    selectModeCard(dom.multiplayerButton, showMultiplayerView);
  });
  dom.singleplayerBackButton?.addEventListener("click", showModePicker);
  dom.multiplayerBackButton?.addEventListener("click", showModePicker);
  dom.soloPageBrand?.addEventListener("click", (event) => {
    if (!dom.menuScreen.classList.contains("hidden")) {
      event.preventDefault();
      showModePicker();
    }
  });
  dom.homeLinks.forEach((link) => link.addEventListener("click", navigateWithFade));
  window.addEventListener("pageshow", () => {
    dom.pageTransition?.classList.remove("is-active");
    positionMobileModeTitle();
  });
  window.addEventListener("resize", () => {
    positionMobileModeTitle();
    scheduleMobileGameHeaderPosition();
  });
  window.visualViewport?.addEventListener("resize", scheduleMobilePageTitlePosition);
  dom.soloPageBrand?.querySelector("img")?.addEventListener("load", positionMobileModeTitle);
  dom.tileImage?.addEventListener("load", scheduleMobileGameHeaderPosition);
  if (typeof ResizeObserver === "function") {
    const mobileTitleLayoutObserver = new ResizeObserver(scheduleMobilePageTitlePosition);
    [
      dom.menuScreen,
      dom.soloModePicker,
      dom.playMenuView,
      dom.soloMultiplayerView,
      dom.multiplayerHostView,
      dom.multiplayerJoinView,
      dom.multiplayerGuestView,
    ].filter(Boolean).forEach((view) => mobileTitleLayoutObserver.observe(view));
  }
  dom.startButton.addEventListener("click", startGame);
  dom.gameHomeButton.addEventListener("click", showMenu);
  dom.resultsHomeButton.addEventListener("click", showMenu);

  dom.playAgainButton.addEventListener("click", handleResultsReturn);
  dom.guessButton.addEventListener("click", submitGuess);
  dom.nextButton.addEventListener("click", nextRound);
  dom.mapShell.addEventListener("pointerdown", handleMapPointer);
  dom.mapShell.addEventListener("pointermove", handleMapPointerMove);
  dom.mapShell.addEventListener("pointerup", handleMapPointerUp);
  dom.mapShell.addEventListener("pointercancel", cancelMapDrag);
  dom.mapShell.addEventListener("wheel", handleMapWheel, { passive: false });
  dom.mapImage.addEventListener("load", handleMapImageLoad);
  dom.mapImage.addEventListener("error", handleMapImageError);
  window.addEventListener("resize", recoverMapRendering);
  window.addEventListener("pageshow", recoverMapRendering);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) recoverMapRendering();
  });

  dom.zoomInButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!state.mapNavigationLocked) zoomMapAtCenter(state.mapZoom * ZOOM_BUTTON_FACTOR);
  });
  dom.zoomOutButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!state.mapNavigationLocked) zoomMapAtCenter(state.mapZoom / ZOOM_BUTTON_FACTOR);
  });
  dom.zoomResetButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!state.mapNavigationLocked) resetMapZoom();
  });

  dom.timerOptions.forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSeconds = Math.max(0, Number(button.dataset.settingSeconds) || 0);
      dom.timerOptions.forEach((option) => option.classList.toggle("is-active", option === button));
    });
  });
  dom.roundOptions.forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRounds = Math.max(1, Number(button.dataset.settingRounds) || DEFAULT_ROUNDS);
      dom.roundOptions.forEach((option) => option.classList.toggle("is-active", option === button));
    });
  });
  dom.oneSecondRuleSwitch.addEventListener("click", () => {
    toggleClueChallenge(ONE_SECOND_CHALLENGE_MS);
  });
  dom.tenthSecondRuleSwitch.addEventListener("click", () => {
    toggleClueChallenge(TENTH_SECOND_CHALLENGE_MS);
  });
}

function toggleClueChallenge(revealMs) {
  state.challengeRevealMs = state.challengeRevealMs === revealMs ? 0 : revealMs;
  syncOneSecondRuleUI();
}

function bindEvents() {
  dom.startButton.addEventListener("click", openSingleplayerSettings);
  dom.multiplayerButton.addEventListener("click", openMultiplayerSettings);
  dom.closeSingleplayerSettings.addEventListener("click", closeSingleplayerSettings);
  dom.closeMultiplayerSettings.addEventListener("click", closeMultiplayerSettings);
  dom.settingsStartButton.addEventListener("click", startGame);
  dom.singleplayerSettingsModal.addEventListener("click", (event) => {
    if (event.target === dom.singleplayerSettingsModal) {
      closeSingleplayerSettings();
    }
  });
  dom.multiplayerSettingsModal.addEventListener("click", (event) => {
    if (event.target === dom.multiplayerSettingsModal) {
      closeMultiplayerSettings();
    }
  });
  dom.playAgainButton.addEventListener("click", handleResultsReturn);
  dom.guessButton.addEventListener("click", submitGuess);
  dom.nextButton.addEventListener("click", nextRound);
  dom.menuTabs.forEach((button) => {
    button.addEventListener("click", () => {
      const targetView = button.dataset.menuTab;
      const sameViewActive = dom.menuViews.some((view) => (
        view.dataset.menuView === targetView && view.classList.contains("is-active")
      ));

      loadMenuAction(() => {
        setMenuView(targetView);

        if (targetView === "career") {
          showCareerStatsPanel();
        }
      }, {
        skip: sameViewActive && !(targetView === "career" && (isCareerProfileEditorOpen() || isCareerHistoryOpen())),
      });
    });
  });
  if (dom.careerEditProfileButton) {
    dom.careerEditProfileButton.addEventListener("click", showCareerProfileEditor);
  }
  if (dom.careerProfileSaveButton) {
    dom.careerProfileSaveButton.addEventListener("click", saveCareerProfileEditor);
  }
  if (dom.careerHistoryButton) {
    dom.careerHistoryButton.addEventListener("click", showCareerHistoryPanel);
  }
  if (dom.careerHistoryBackButton) {
    dom.careerHistoryBackButton.addEventListener("click", showCareerStatsPanel);
  }
  if (dom.careerRankInfoButton) {
    dom.careerRankInfoButton.addEventListener("click", toggleCareerRankPopover);
  }
  if (dom.careerRankCloseButton) {
    dom.careerRankCloseButton.addEventListener("click", () => closeCareerRankPopover());
  }
  if (dom.careerRankPopover) {
    dom.careerRankPopover.addEventListener("click", (event) => {
      if (event.target === dom.careerRankPopover) {
        closeCareerRankPopover();
      }
    });
  }
  if (dom.profileRailAvatar) {
    dom.profileRailAvatar.addEventListener("click", () => {
      loadMenuAction(() => {
        setMenuView("career");
        showCareerProfileEditor();
      }, {
        skip: dom.menuViews.some((view) => view.dataset.menuView === "career" && view.classList.contains("is-active"))
          && isCareerProfileEditorOpen(),
      });
    });
  }
  if (dom.profileUsernameInput) {
    dom.profileUsernameInput.addEventListener("input", updateProfileUsernameControl);
    dom.profileUsernameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        saveCareerProfileEditor();
      }
    });
  }
  if (dom.profileUploadPictureButton && dom.profilePicInput) {
    dom.profileUploadPictureButton.addEventListener("click", () => dom.profilePicInput.click());
  }
  if (dom.profilePreviewAvatar && dom.profilePicInput) {
    dom.profilePreviewAvatar.addEventListener("click", () => dom.profilePicInput.click());
  }
  if (dom.profileEditPictureButton) {
    dom.profileEditPictureButton.addEventListener("click", editProfilePicture);
  }
  if (dom.profilePicInput) {
    dom.profilePicInput.addEventListener("change", handleProfilePictureChange);
  }
  if (dom.profileRemovePictureButton) {
    dom.profileRemovePictureButton.addEventListener("click", removeProfilePicture);
  }
  if (dom.profileUndoRemovePictureButton) {
    dom.profileUndoRemovePictureButton.addEventListener("click", undoProfilePictureRemoval);
  }
  bindCropperEvents();
  if (dom.profileTitleSelect) {
    dom.profileTitleSelect.addEventListener("change", updateProfileTitle);
  }
  if (dom.profileClearFlagButton) {
    dom.profileClearFlagButton.addEventListener("click", clearProfileFlag);
  }
  if (dom.profileFlagSelectorButton) {
    dom.profileFlagSelectorButton.addEventListener("click", toggleProfileFlagList);
  }
  if (dom.profileFlagCloseButton) {
    dom.profileFlagCloseButton.addEventListener("click", () => closeProfileFlagList());
  }
  if (dom.profileFlagModal) {
    dom.profileFlagModal.addEventListener("click", (event) => {
      if (event.target === dom.profileFlagModal) {
        closeProfileFlagList();
      }
    });
  }
  if (dom.profileFlagList) {
    dom.profileFlagList.addEventListener("click", handleProfileFlagClick);
  }
  if (dom.careerStatusInput) {
    dom.careerStatusInput.addEventListener("input", saveCareerStatus);
  }
  if (dom.cursorToolboxToggle && dom.cursorToolboxPanel) {
    dom.cursorToolboxToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleCursorToolbox();
    });
  }
  dom.cursorOptions.forEach((button) => {
    button.addEventListener("click", () => {
      applyCursorStyle(button.dataset.cursorOption);
      closeCursorToolbox();
    });
  });
  document.addEventListener("click", (event) => {
    if (!dom.cursorToolbox || dom.cursorToolbox.contains(event.target)) {
      closeProfileFlagList(event.target);
      closeCareerRankPopover(event.target);
      return;
    }

    closeCursorToolbox();
    closeProfileFlagList(event.target);
    closeCareerRankPopover(event.target);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCursorToolbox();
      closeProfileFlagList();
      closeCareerRankPopover();
    }
  });
  dom.mapShell.addEventListener("pointerdown", handleMapPointer);
  dom.mapShell.addEventListener("pointermove", handleMapPointerMove);
  dom.mapShell.addEventListener("pointerup", handleMapPointerUp);
  dom.mapShell.addEventListener("pointercancel", cancelMapDrag);
  dom.mapShell.addEventListener("wheel", handleMapWheel, { passive: false });
  dom.mapImage.addEventListener("load", handleMapImageLoad);
  dom.mapImage.addEventListener("error", handleMapImageError);
  window.addEventListener("resize", recoverMapRendering);
  window.addEventListener("pageshow", recoverMapRendering);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      recoverMapRendering();
    }
  });
  dom.zoomInButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.mapNavigationLocked) return;
    zoomMapAtCenter(state.mapZoom * ZOOM_BUTTON_FACTOR);
  });
  dom.zoomOutButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.mapNavigationLocked) return;
    zoomMapAtCenter(state.mapZoom / ZOOM_BUTTON_FACTOR);
  });
  dom.zoomResetButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.mapNavigationLocked) return;
    resetMapZoom();
  });

  dom.imageOffsetXInput.addEventListener("change", syncMapImageOffsetFromInputs);
  dom.imageOffsetYInput.addEventListener("change", syncMapImageOffsetFromInputs);
  dom.imageWidthInput.addEventListener("change", syncMapImageOffsetFromInputs);
  dom.imageHeightInput.addEventListener("change", syncMapImageOffsetFromInputs);
  dom.imageOffsetStepInput.addEventListener("change", syncMapImageOffsetStepFromInput);
  dom.resetCalibrationButton.addEventListener("click", resetMapImageOffset);
  dom.copyCalibrationButton.addEventListener("click", copyMapImageOffset);
  dom.calibrationPickButton.addEventListener("click", startCalibrationPick);
  dom.calibrationUndoButton.addEventListener("click", undoCalibrationSample);
  dom.calibrationClearButton.addEventListener("click", clearCalibrationSamples);
  dom.calibrationNudgeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const dx = Number(button.dataset.offsetDx) || 0;
      const dy = Number(button.dataset.offsetDy) || 0;
      nudgeMapImageOffset(dx, dy);
    });
  });
  dom.calibrationSizeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const dw = Number(button.dataset.sizeDw) || 0;
      const dh = Number(button.dataset.sizeDh) || 0;
      nudgeMapImageSize(dw, dh);
    });
  });

  dom.singleplayerQueueOptions.forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedQueue = button.dataset.singleplayerQueue === "ranked" ? "ranked" : "casual";
      dom.singleplayerQueueOptions.forEach((option) => {
        const isActive = option === button;
        option.classList.toggle("is-active", isActive);
        option.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    });
  });

  dom.modeOptions.forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedMode = button.dataset.settingMode || "classic";
      dom.modeOptions.forEach((option) => option.classList.toggle("is-active", option === button));
    });
  });

  dom.timerOptions.forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSeconds = Math.max(0, Number(button.dataset.settingSeconds) || 0);
      dom.timerOptions.forEach((option) => option.classList.toggle("is-active", option === button));
    });
  });

  dom.roundOptions.forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRounds = Math.max(1, Number(button.dataset.settingRounds) || DEFAULT_ROUNDS);
      dom.roundOptions.forEach((option) => option.classList.toggle("is-active", option === button));
    });
  });

  if (dom.oneSecondRuleSwitch) {
    dom.oneSecondRuleSwitch.addEventListener("click", () => {
      toggleClueChallenge(ONE_SECOND_CHALLENGE_MS);
    });
  }
  if (dom.tenthSecondRuleSwitch) {
    dom.tenthSecondRuleSwitch.addEventListener("click", () => {
      toggleClueChallenge(TENTH_SECOND_CHALLENGE_MS);
    });
  }

  dom.multiplayerModeOptions.forEach((button) => {
    button.addEventListener("click", () => {
      dom.multiplayerModeOptions.forEach((option) => option.classList.toggle("is-active", option === button));
    });
  });
  dom.leaderboardPageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      dom.leaderboardPageButtons.forEach((option) => {
        const isActive = option === button;
        option.classList.toggle("is-active", isActive);
        if (isActive) {
          option.setAttribute("aria-current", "page");
        } else {
          option.removeAttribute("aria-current");
        }
      });
    });
  });
}

function buildArrowCursorSvg({
  path = "M4 2 5.2 26 11 19.1 15 27.4 18.4 25.8 14.4 17.5 23 17.1 4 2Z",
  fill,
  stroke,
  strokeWidth = 2,
  shadow = false,
}) {
  const shadowPath = shadow
    ? `<path d="${path}" transform="translate(2 2)" fill="#000000" opacity="0.35"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${shadowPath}<path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/></svg>`;
}

function loadCursorStyle() {
  const saved = window.localStorage.getItem(CURSOR_STYLE_STORAGE_KEY) || "default";
  applyCursorStyle(saved);
}

function toggleCursorToolbox() {
  const willOpen = dom.cursorToolboxPanel.classList.contains("hidden");
  dom.cursorToolboxPanel.classList.toggle("hidden", !willOpen);
  dom.cursorToolboxToggle.setAttribute("aria-expanded", String(willOpen));
}

function closeCursorToolbox() {
  if (!dom.cursorToolboxPanel || !dom.cursorToolboxToggle) {
    return;
  }

  dom.cursorToolboxPanel.classList.add("hidden");
  dom.cursorToolboxToggle.setAttribute("aria-expanded", "false");
}

function applyCursorStyle(styleName) {
  const cursorName = Object.prototype.hasOwnProperty.call(CURSOR_PRESETS, styleName)
    ? styleName
    : "default";
  const preset = CURSOR_PRESETS[cursorName];

  dom.cursorOptions.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.cursorOption === cursorName);
  });

  window.localStorage.setItem(CURSOR_STYLE_STORAGE_KEY, cursorName);

  if (!preset) {
    document.body.classList.remove("custom-cursor-enabled");
    document.documentElement.style.removeProperty("--custom-cursor");
    return;
  }

  const [hotspotX, hotspotY] = preset.hotspot;
  const cursorUrl = `url("data:image/svg+xml,${encodeURIComponent(preset.svg)}") ${hotspotX} ${hotspotY}, auto`;
  document.documentElement.style.setProperty("--custom-cursor", cursorUrl);
  document.body.classList.add("custom-cursor-enabled");
}

function loadProfileCustomization() {
  try {
    const savedProfile = JSON.parse(window.localStorage.getItem(PROFILE_CUSTOMIZATION_STORAGE_KEY) || "{}");
    state.profileCustomization = normalizeProfileCustomization(savedProfile);
  } catch (error) {
    state.profileCustomization = { ...DEFAULT_PROFILE_CUSTOMIZATION };
  }
}

function saveProfileCustomization() {
  try {
    window.localStorage.setItem(PROFILE_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(state.profileCustomization));
    return true;
  } catch (error) {
    console.warn("Unable to save profile customization:", error);
    return false;
  }
}

function normalizeProfileCustomization(profile) {
  const safeProfile = profile && typeof profile === "object" ? profile : {};
  const usernameResult = validateProfileUsername(
    typeof safeProfile.username === "string" ? safeProfile.username : DEFAULT_PROFILE_CUSTOMIZATION.username,
  );
  const username = usernameResult.ok ? usernameResult.value : DEFAULT_PROFILE_CUSTOMIZATION.username;
  const usernameChangedAt = Number(safeProfile.usernameChangedAt);
  const title = PROFILE_TITLES.includes(safeProfile.title)
    ? safeProfile.title
    : DEFAULT_PROFILE_CUSTOMIZATION.title;
  const pfp = typeof safeProfile.pfp === "string" && safeProfile.pfp.startsWith("data:image/")
    ? safeProfile.pfp
    : "";
  const originalPic = typeof safeProfile.originalPic === "string" && safeProfile.originalPic.startsWith("data:image/")
    ? safeProfile.originalPic
    : pfp;

  return {
    username,
    usernameChangedAt: Number.isFinite(usernameChangedAt) && usernameChangedAt > 0 ? usernameChangedAt : 0,
    pfp,
    originalPic,
    cropState: safeProfile.cropState && typeof safeProfile.cropState === "object"
      ? parseCropState(safeProfile.cropState)
      : null,
    title,
    flag: normalizeProfileFlag(safeProfile.flag),
  };
}

function parseCropState(stateValue) {
  const raw = stateValue && typeof stateValue === "object" ? stateValue : {};

  return {
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    scale: Number(raw.scale) > 0 ? Number(raw.scale) : 1,
  };
}

function renderProfileFlagList() {
  if (!dom.profileFlagList) {
    return;
  }

  dom.profileFlagList.textContent = "";

  PROFILE_FLAGS.forEach((flag) => {
    const button = document.createElement("button");
    const swatch = document.createElement("span");
    const label = document.createElement("span");

    button.className = "profile-flag-option";
    button.type = "button";
    button.role = "option";
    button.dataset.profileFlag = flag.code;
    button.setAttribute("aria-label", flag.label);
    button.title = flag.label;

    swatch.className = "profile-flag-swatch";
    swatch.style.backgroundImage = cssUrl(getProfileFlagUrl(flag.code));

    label.textContent = flag.label;

    button.append(swatch, label);
    dom.profileFlagList.appendChild(button);
  });
}

function applyProfileCustomization() {
  const profile = state.profileCustomization;
  const initials = getProfileInitials(profile.username);

  if (dom.profileUsernameInput && document.activeElement !== dom.profileUsernameInput) {
    dom.profileUsernameInput.value = profile.username;
  }

  if (dom.profileTitleSelect) {
    dom.profileTitleSelect.value = profile.title;
  }

  setText(dom.profilePreviewName, profile.username);
  setText(dom.profilePreviewTitle, profile.title);
  setText(dom.careerNameValue, profile.username);
  setText(dom.careerTitleValue, profile.title);
  setText(dom.leaderboardPlayerName, profile.username);
  setText(dom.leaderboardPlayerTitle, profile.title);

  setProfileAvatar(dom.profilePreviewAvatar, profile.pfp, initials, dom.profilePreviewInitials);
  setProfileAvatar(dom.careerAvatar, profile.pfp, initials);
  setProfileAvatar(dom.leaderboardAvatar, profile.pfp, initials, dom.leaderboardAvatarInitials);
  setRailProfileAvatar(profile.pfp);
  setProfileFlag(dom.profilePreviewFlag, profile.flag);
  setProfileFlag(dom.careerFlag, profile.flag);
  updateProfileFlagSelector();
  updateProfileFlagSelection();
  updateProfileUsernameControl();

  if (dom.profileUploadPictureButton) {
    dom.profileUploadPictureButton.textContent = profile.pfp ? "Replace" : "Upload";
  }

  if (dom.profileEditPictureButton) {
    dom.profileEditPictureButton.classList.toggle("hidden", !profile.pfp);
  }

  if (dom.profileRemovePictureButton) {
    dom.profileRemovePictureButton.disabled = !profile.pfp;
  }

  updateProfilePictureUndoControl();
}

function setProfileAvatar(element, imageUrl, initials, initialsElement = null) {
  if (!element) {
    return;
  }

  if (imageUrl) {
    element.classList.add("has-image");
    element.style.backgroundImage = cssUrl(imageUrl);
  } else {
    element.classList.remove("has-image");
    element.style.backgroundImage = "";
  }

  if (initialsElement) {
    initialsElement.textContent = initials;
  } else {
    element.textContent = initials;
  }
}

function setRailProfileAvatar(imageUrl) {
  if (!dom.profileRailAvatar) {
    return;
  }

  if (imageUrl) {
    dom.profileRailAvatar.classList.add("has-image");
    dom.profileRailAvatar.style.backgroundImage = cssUrl(imageUrl);
  } else {
    dom.profileRailAvatar.classList.remove("has-image");
    dom.profileRailAvatar.style.backgroundImage = "";
  }
}

function setProfileFlag(element, code) {
  if (!element) {
    return;
  }

  const flag = PROFILE_FLAGS.find((item) => item.code === code);

  if (flag) {
    element.classList.remove("is-empty");
    element.style.backgroundImage = cssUrl(getProfileFlagUrl(flag.code));
    element.setAttribute("aria-label", `${flag.label} flag`);
    element.title = flag.label;
  } else {
    element.classList.add("is-empty");
    element.style.backgroundImage = "";
    element.setAttribute("aria-label", "No country flag");
    element.removeAttribute("title");
  }
}

function updateProfileFlagSelector() {
  const flag = PROFILE_FLAGS.find((item) => item.code === state.profileCustomization.flag);

  if (dom.profileSelectedFlagSwatch) {
    dom.profileSelectedFlagSwatch.classList.toggle("is-empty", !flag);
    dom.profileSelectedFlagSwatch.style.backgroundImage = flag ? cssUrl(getProfileFlagUrl(flag.code)) : "";
  }

  if (dom.profileSelectedFlagLabel) {
    dom.profileSelectedFlagLabel.textContent = flag ? flag.label : "No Flag";
  }
}

function updateProfileFlagSelection() {
  if (!dom.profileFlagList) {
    return;
  }

  dom.profileFlagList.querySelectorAll("[data-profile-flag]").forEach((button) => {
    const isActive = button.dataset.profileFlag === state.profileCustomization.flag;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.setAttribute("aria-selected", String(isActive));
  });

  if (dom.profileClearFlagButton) {
    dom.profileClearFlagButton.disabled = !state.profileCustomization.flag;
  }
}

function toggleProfileFlagList(event) {
  if (event) {
    event.stopPropagation();
  }

  if (!dom.profileFlagList || !dom.profileFlagModal || !dom.profileFlagSelectorButton) {
    return;
  }

  const willOpen = dom.profileFlagModal.classList.contains("hidden");

  if (willOpen && !dom.profileFlagList.children.length) {
    renderProfileFlagList();
    updateProfileFlagSelection();
  }

  dom.profileFlagModal.classList.toggle("hidden", !willOpen);
  dom.profileFlagSelectorButton.setAttribute("aria-expanded", String(willOpen));
  if (willOpen && dom.profileFlagCloseButton) {
    dom.profileFlagCloseButton.focus();
  }
}

function closeProfileFlagList(target = null) {
  if (!dom.profileFlagModal || !dom.profileFlagSelectorButton) {
    return;
  }

  if (target && (
    (dom.profileFlagPicker && dom.profileFlagPicker.contains(target))
    || dom.profileFlagModal.contains(target)
  )) {
    return;
  }

  dom.profileFlagModal.classList.add("hidden");
  dom.profileFlagSelectorButton.setAttribute("aria-expanded", "false");
}

function toggleCareerRankPopover(event) {
  if (event) {
    event.stopPropagation();
  }

  if (!dom.careerRankPopover || !dom.careerRankInfoButton) {
    return;
  }

  const willOpen = dom.careerRankPopover.classList.contains("hidden");
  dom.careerRankPopover.classList.toggle("hidden", !willOpen);
  dom.careerRankInfoButton.setAttribute("aria-expanded", String(willOpen));
  if (willOpen && dom.careerRankCloseButton) {
    dom.careerRankCloseButton.focus();
  }
}

function closeCareerRankPopover(target = null) {
  if (!dom.careerRankPopover || !dom.careerRankInfoButton) {
    return;
  }

  if (target && (dom.careerRankPopover.contains(target) || dom.careerRankInfoButton.contains(target))) {
    return;
  }

  dom.careerRankPopover.classList.add("hidden");
  dom.careerRankInfoButton.setAttribute("aria-expanded", "false");
}

function updateProfileUsernameControl() {
  if (!dom.profileUsernameInput) {
    return;
  }

  const result = validateProfileUsername(dom.profileUsernameInput.value);
  const unchanged = result.ok && result.value === state.profileCustomization.username;
  const remainingMs = getUsernameCooldownRemainingMs();

  if (dom.careerProfileSaveButton) {
    dom.careerProfileSaveButton.disabled = !result.ok || (!unchanged && remainingMs > 0);
  }

  if (dom.profileUsernameCooldown) {
    dom.profileUsernameCooldown.textContent = remainingMs > 0
      ? `Next ${formatProfileDate(new Date(Date.now() + remainingMs))}`
      : "Ready";
  }
}

function saveProfileUsername(options = {}) {
  const quietUnchanged = Boolean(options.quietUnchanged);

  if (!dom.profileUsernameInput) {
    return true;
  }

  const result = validateProfileUsername(dom.profileUsernameInput.value);

  if (!result.ok) {
    setProfileMessage(dom.profileUsernameMessage, result.message, "error");
    return false;
  }

  if (result.value === state.profileCustomization.username) {
    if (!quietUnchanged) {
      setProfileMessage(dom.profileUsernameMessage, "Username unchanged.", "info");
    }
    updateProfileUsernameControl();
    return true;
  }

  const remainingMs = getUsernameCooldownRemainingMs();

  if (remainingMs > 0) {
    setProfileMessage(
      dom.profileUsernameMessage,
      `Username locked until ${formatProfileDate(new Date(Date.now() + remainingMs))}.`,
      "error",
    );
    updateProfileUsernameControl();
    return false;
  }

  state.profileCustomization.username = result.value;
  state.profileCustomization.usernameChangedAt = Date.now();

  if (!saveProfileCustomization()) {
    setProfileMessage(dom.profileUsernameMessage, "Could not save username.", "error");
    return false;
  }

  applyProfileCustomization();
  setProfileMessage(dom.profileUsernameMessage, "Username saved.", "success");
  return true;
}

function updateProfileTitle() {
  if (!dom.profileTitleSelect) {
    return;
  }

  const nextTitle = PROFILE_TITLES.includes(dom.profileTitleSelect.value)
    ? dom.profileTitleSelect.value
    : DEFAULT_PROFILE_CUSTOMIZATION.title;

  state.profileCustomization.title = nextTitle;

  if (saveProfileCustomization()) {
    applyProfileCustomization();
  }
}

function handleProfileFlagClick(event) {
  if (!dom.profileFlagList) {
    return;
  }

  const button = event.target.closest("[data-profile-flag]");

  if (!button || !dom.profileFlagList.contains(button)) {
    return;
  }

  state.profileCustomization.flag = normalizeProfileFlag(button.dataset.profileFlag);

  if (saveProfileCustomization()) {
    applyProfileCustomization();
    closeProfileFlagList();
  }
}

function clearProfileFlag() {
  state.profileCustomization.flag = "";

  if (saveProfileCustomization()) {
    applyProfileCustomization();
    closeProfileFlagList();
  }
}

async function handleProfilePictureChange(event) {
  const input = event.currentTarget;
  const file = input && input.files ? input.files[0] : null;

  if (input) {
    input.value = "";
  }

  if (!file) {
    return;
  }

  if (!file.type || !file.type.startsWith("image/")) {
    setProfileMessage(dom.profilePictureMessage, "Choose an image file.", "error");
    return;
  }

  if (file.size > PROFILE_PICTURE_MAX_BYTES) {
    setProfileMessage(dom.profilePictureMessage, "Image is too large.", "error");
    return;
  }

  setProfileMessage(dom.profilePictureMessage, "Processing image.", "info");

  try {
    const dataUrl = await compressImageFileToDataUrl(file, 1280, 0.9);
    cropperOriginalSource = dataUrl;
    openCropper(dataUrl, { resetPosition: true });
    setProfileMessage(dom.profilePictureMessage, "Drag the image, then save.", "info");
  } catch (error) {
    console.warn("Unable to process profile picture:", error);
    setProfileMessage(dom.profilePictureMessage, "Could not use that image.", "error");
  }
}

function editProfilePicture() {
  const source = state.profileCustomization.originalPic || state.profileCustomization.pfp;

  if (!source) {
    if (dom.profilePicInput) {
      dom.profilePicInput.click();
    }
    return;
  }

  cropperOriginalSource = source;
  openCropper(source, { resetPosition: false });
  setProfileMessage(dom.profilePictureMessage, "Adjust the crop, then save.", "info");
}

function removeProfilePicture() {
  if (!state.profileCustomization.pfp) {
    setProfileMessage(dom.profilePictureMessage, "No profile picture set.", "info");
    return;
  }

  const previousProfilePicture = {
    pfp: state.profileCustomization.pfp,
    originalPic: state.profileCustomization.originalPic,
    cropState: state.profileCustomization.cropState
      ? { ...state.profileCustomization.cropState }
      : null,
  };

  pendingRemovedProfilePicture = previousProfilePicture;
  state.profileCustomization.pfp = "";
  state.profileCustomization.originalPic = "";
  state.profileCustomization.cropState = null;

  if (!saveProfileCustomization()) {
    state.profileCustomization.pfp = previousProfilePicture.pfp;
    state.profileCustomization.originalPic = previousProfilePicture.originalPic;
    state.profileCustomization.cropState = previousProfilePicture.cropState;
    pendingRemovedProfilePicture = null;
    applyProfileCustomization();
    setProfileMessage(dom.profilePictureMessage, "Could not remove profile picture.", "error");
    return;
  }

  closeCropper();
  applyProfileCustomization();
  setProfileMessage(dom.profilePictureMessage, "Profile picture removed. Undo is available until Save.", "success");
}

function undoProfilePictureRemoval() {
  if (!pendingRemovedProfilePicture) {
    setProfileMessage(dom.profilePictureMessage, "Nothing to undo.", "info");
    updateProfilePictureUndoControl();
    return;
  }

  state.profileCustomization.pfp = pendingRemovedProfilePicture.pfp;
  state.profileCustomization.originalPic = pendingRemovedProfilePicture.originalPic;
  state.profileCustomization.cropState = pendingRemovedProfilePicture.cropState
    ? { ...pendingRemovedProfilePicture.cropState }
    : null;

  if (!saveProfileCustomization()) {
    setProfileMessage(dom.profilePictureMessage, "Could not restore profile picture.", "error");
    return;
  }

  pendingRemovedProfilePicture = null;
  closeCropper();
  applyProfileCustomization();
  setProfileMessage(dom.profilePictureMessage, "Profile picture restored.", "success");
}

function forgetRemovedProfilePictureUndo() {
  pendingRemovedProfilePicture = null;
  updateProfilePictureUndoControl();
}

function updateProfilePictureUndoControl() {
  if (dom.profileUndoRemovePictureButton) {
    dom.profileUndoRemovePictureButton.classList.toggle("hidden", !pendingRemovedProfilePicture);
    dom.profileUndoRemovePictureButton.disabled = !pendingRemovedProfilePicture;
  }
}

function bindCropperEvents() {
  if (dom.cropperZoom) {
    dom.cropperZoom.step = String(CROPPER_ZOOM_STEP);
    const syncCropperZoom = () => {
      setCropSliderValue(dom.cropperZoom.value);
    };

    dom.cropperZoom.addEventListener("input", syncCropperZoom);
    dom.cropperZoom.addEventListener("change", syncCropperZoom);
    dom.cropperZoom.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch") return;
      isCropSliderDragging = true;
      updateCropSliderFromClientX(event.clientX);
      if (event.cancelable) event.preventDefault();
    });
    dom.cropperZoom.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "touch" || !isCropSliderDragging) return;
      updateCropSliderFromClientX(event.clientX);
      if (event.cancelable) event.preventDefault();
    });
    const stopCropSliderPointerDrag = (event) => {
      if (event.pointerType !== "touch") return;
      isCropSliderDragging = false;
    };
    dom.cropperZoom.addEventListener("pointerup", stopCropSliderPointerDrag);
    dom.cropperZoom.addEventListener("pointercancel", stopCropSliderPointerDrag);
    dom.cropperZoom.addEventListener("touchstart", (event) => {
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      isCropSliderDragging = true;
      updateCropSliderFromClientX(touch.clientX);
      if (event.cancelable) event.preventDefault();
    }, { passive: false });
    dom.cropperZoom.addEventListener("touchmove", (event) => {
      if (!isCropSliderDragging) return;
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      updateCropSliderFromClientX(touch.clientX);
      if (event.cancelable) event.preventDefault();
    }, { passive: false });
    const stopCropSliderTouchDrag = () => {
      isCropSliderDragging = false;
    };
    dom.cropperZoom.addEventListener("touchend", stopCropSliderTouchDrag, { passive: true });
    dom.cropperZoom.addEventListener("touchcancel", stopCropSliderTouchDrag, { passive: true });
  }

  if (dom.centerImageBtn) {
    dom.centerImageBtn.addEventListener("click", () => {
      cropState.x = 0;
      cropState.y = 0;
      applyCropTransform();
    });
  }

  if (dom.cancelImageBtn) {
    dom.cancelImageBtn.addEventListener("click", () => {
      closeCropper();
      setProfileMessage(dom.profilePictureMessage, "", "info");
    });
  }

  if (dom.saveImageBtn) {
    dom.saveImageBtn.addEventListener("click", saveCroppedProfilePicture);
  }

  if (!dom.cropperArea) {
    return;
  }

  dom.cropperArea.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });

  if (dom.cropperImage) {
    dom.cropperImage.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });
  }

  dom.cropperArea.addEventListener("wheel", (event) => {
    if (!dom.cropperImage || !dom.cropperImage.getAttribute("src")) return;
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    setCropScale(cropState.scale * factor, true);
  }, { passive: false });

  dom.cropperArea.addEventListener("pointerdown", (event) => {
    if (!dom.cropperImage || !dom.cropperImage.getAttribute("src") || event.pointerType === "touch") return;
    isCropDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = cropState.x;
    dragOriginY = cropState.y;
    try {
      dom.cropperArea.setPointerCapture(event.pointerId);
    } catch (error) {}
  });

  dom.cropperArea.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || !isCropDragging) return;
    cropState.x = dragOriginX + (event.clientX - dragStartX);
    cropState.y = dragOriginY + (event.clientY - dragStartY);
    applyCropTransform();
  });

  const stopDragging = (event) => {
    if (event.pointerType === "touch" || !isCropDragging) return;
    isCropDragging = false;
    try {
      dom.cropperArea.releasePointerCapture(event.pointerId);
    } catch (error) {}
  };

  dom.cropperArea.addEventListener("pointerup", stopDragging);
  dom.cropperArea.addEventListener("pointercancel", stopDragging);
  dom.cropperArea.addEventListener("touchstart", (event) => {
    if (!dom.cropperImage || !dom.cropperImage.getAttribute("src")) return;
    const touches = getCropTouchList(event);
    if (!touches.length) return;
    if (event.cancelable) event.preventDefault();

    if (touches.length >= 2) {
      beginCropTouchPinch(touches[0], touches[1]);
      updateCropTouchPinch(touches[0], touches[1]);
      return;
    }

    beginCropTouchDrag(touches[0]);
  }, { passive: false });

  dom.cropperArea.addEventListener("touchmove", (event) => {
    if (!dom.cropperImage || !dom.cropperImage.getAttribute("src")) return;
    const touches = getCropTouchList(event);
    if (!touches.length) return;
    if (event.cancelable) event.preventDefault();

    if (touches.length >= 2) {
      if (activeCropTouchMode !== "pinch" || !(cropPinchStartDistance > 0)) {
        beginCropTouchPinch(touches[0], touches[1]);
      }
      updateCropTouchPinch(touches[0], touches[1]);
      return;
    }

    const touch = touches[0];
    if (activeCropTouchMode !== "drag" || activeCropTouchId !== touch.identifier) {
      beginCropTouchDrag(touch);
    }
    updateCropTouchDrag(touch);
  }, { passive: false });

  const handleCropTouchEnd = (event) => {
    const touches = getCropTouchList(event);

    if (touches.length >= 2) {
      beginCropTouchPinch(touches[0], touches[1]);
      return;
    }

    if (touches.length === 1) {
      beginCropTouchDrag(touches[0]);
      return;
    }

    resetCropTouchGesture();
  };

  dom.cropperArea.addEventListener("touchend", handleCropTouchEnd, { passive: true });
  dom.cropperArea.addEventListener("touchcancel", handleCropTouchEnd, { passive: true });
}

function applyCropTransform() {
  if (!dom.cropperImage) return;
  dom.cropperImage.style.transform = `translate3d(${cropState.x}px, ${cropState.y}px, 0) scale(${cropState.scale})`;
}

function getCropScaleBounds() {
  const min = dom.cropperZoom ? Number(dom.cropperZoom.min) : 0.05;
  const max = dom.cropperZoom ? Number(dom.cropperZoom.max) : 3;

  return {
    min: Number.isFinite(min) && min > 0 ? min : 0.05,
    max: Number.isFinite(max) && max > 0 ? max : 3,
  };
}

function resetCropTouchGesture() {
  activeCropTouchMode = "";
  activeCropTouchId = null;
  cropPinchStartDistance = 0;
}

function getCropTouchList(event) {
  if (!event || !dom.cropperArea) return [];
  return Array.from(event.touches || []).filter((touch) => dom.cropperArea.contains(touch.target));
}

function getTouchDistance(touchA, touchB) {
  if (!touchA || !touchB) return 0;
  return Math.hypot(touchB.clientX - touchA.clientX, touchB.clientY - touchA.clientY);
}

function getTouchCenter(touchA, touchB) {
  if (!touchA || !touchB) {
    return { x: 0, y: 0 };
  }

  return {
    x: (touchA.clientX + touchB.clientX) / 2,
    y: (touchA.clientY + touchB.clientY) / 2,
  };
}

function normalizeCropSliderValue(rawValue) {
  const { min, max } = getCropScaleBounds();
  const numeric = Number(rawValue);
  const fallback = Number(cropState.scale) > 0 ? Number(cropState.scale) : min;
  const clamped = Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : fallback));
  const step = dom.cropperZoom ? Number(dom.cropperZoom.step) : 0;

  if (!Number.isFinite(step) || step <= 0) {
    return clamped;
  }

  const stepped = Math.round((clamped - min) / step) * step + min;
  return Math.max(min, Math.min(max, Number(stepped.toFixed(4))));
}

function setCropSliderValue(rawValue) {
  const normalized = normalizeCropSliderValue(rawValue);

  if (dom.cropperZoom) {
    dom.cropperZoom.value = String(normalized);
  }

  setCropScale(normalized, true);
}

function updateCropSliderFromClientX(clientX) {
  if (!dom.cropperZoom || !Number.isFinite(clientX)) return;
  const rect = dom.cropperZoom.getBoundingClientRect();
  if (!rect || rect.width <= 0) return;
  const { min, max } = getCropScaleBounds();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const nextValue = min + ((max - min) * ratio);
  setCropSliderValue(nextValue);
}

function beginCropTouchDrag(touch) {
  if (!touch) return;
  activeCropTouchMode = "drag";
  activeCropTouchId = touch.identifier;
  cropTouchStartX = touch.clientX;
  cropTouchStartY = touch.clientY;
  cropTouchOriginX = cropState.x;
  cropTouchOriginY = cropState.y;
  cropPinchStartDistance = 0;
}

function updateCropTouchDrag(touch) {
  if (!touch) return;
  cropState.x = cropTouchOriginX + (touch.clientX - cropTouchStartX);
  cropState.y = cropTouchOriginY + (touch.clientY - cropTouchStartY);
  applyCropTransform();
}

function beginCropTouchPinch(touchA, touchB) {
  if (!touchA || !touchB) return;
  const center = getTouchCenter(touchA, touchB);
  activeCropTouchMode = "pinch";
  activeCropTouchId = null;
  cropPinchStartDistance = getTouchDistance(touchA, touchB);
  cropPinchStartCenterX = center.x;
  cropPinchStartCenterY = center.y;
  cropPinchStartScale = cropState.scale;
  cropPinchOriginX = cropState.x;
  cropPinchOriginY = cropState.y;
}

function updateCropTouchPinch(touchA, touchB) {
  if (!touchA || !touchB || !(cropPinchStartDistance > 0)) return;
  const { min, max } = getCropScaleBounds();
  const distance = getTouchDistance(touchA, touchB);
  const center = getTouchCenter(touchA, touchB);
  const nextScale = Math.max(min, Math.min(max, cropPinchStartScale * (distance / cropPinchStartDistance)));
  const scaleRatio = cropPinchStartScale > 0 ? nextScale / cropPinchStartScale : 1;
  cropState.scale = nextScale;
  cropState.x = (cropPinchOriginX * scaleRatio) + (center.x - cropPinchStartCenterX);
  cropState.y = (cropPinchOriginY * scaleRatio) + (center.y - cropPinchStartCenterY);

  if (dom.cropperZoom) {
    dom.cropperZoom.value = String(nextScale);
  }

  applyCropTransform();
}

function setCropScale(nextScale, anchorToCrosshair = true) {
  const { min, max } = getCropScaleBounds();
  const currentScale = Number(cropState.scale) > 0 ? Number(cropState.scale) : 1;
  const clamped = Math.max(min, Math.min(max, Number(nextScale) || currentScale));

  if (!Number.isFinite(clamped) || clamped <= 0) return;

  if (anchorToCrosshair && currentScale > 0 && clamped !== currentScale) {
    const ratio = clamped / currentScale;
    cropState.x *= ratio;
    cropState.y *= ratio;
  }

  cropState.scale = clamped;

  if (dom.cropperZoom) {
    dom.cropperZoom.value = String(clamped);
  }

  applyCropTransform();
}

function openCropper(sourceUrl, options = {}) {
  if (!dom.cropperContainer || !dom.cropperImage || !sourceUrl) return;
  const resetPosition = options.resetPosition !== false;
  resetCropTouchGesture();
  isCropDragging = false;

  dom.cropperImage.src = sourceUrl;
  dom.cropperImage.dataset.originalSrc = sourceUrl;
  dom.cropperImage.draggable = false;

  if (resetPosition) {
    cropState = { x: 0, y: 0, scale: 1 };
  } else {
    cropState = state.profileCustomization.cropState
      ? parseCropState(state.profileCustomization.cropState)
      : { x: 0, y: 0, scale: 1 };
  }

  if (dom.cropperZoom) {
    dom.cropperZoom.value = String(cropState.scale);
  }

  applyCropTransform();
  show(dom.cropperContainer);
}

function closeCropper() {
  if (!dom.cropperContainer || !dom.cropperImage) return;
  resetCropTouchGesture();
  isCropDragging = false;
  cropperOriginalSource = "";
  hide(dom.cropperContainer);
  dom.cropperImage.removeAttribute("src");
  delete dom.cropperImage.dataset.originalSrc;
}

function getCroppedImageDataUrl() {
  if (!dom.cropperImage || !dom.cropperImage.src || !dom.cropperImage.naturalWidth || !dom.cropperImage.naturalHeight) {
    return "";
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  canvas.width = CROPPER_OUTPUT_SIZE;
  canvas.height = CROPPER_OUTPUT_SIZE;
  context.fillStyle = "#0a0a0a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.translate(cropState.x, cropState.y);
  context.scale(cropState.scale, cropState.scale);
  context.drawImage(dom.cropperImage, -dom.cropperImage.naturalWidth / 2, -dom.cropperImage.naturalHeight / 2);
  return canvas.toDataURL("image/png");
}

function saveCroppedProfilePicture() {
  const cropped = getCroppedImageDataUrl();

  if (!cropped) {
    setProfileMessage(dom.profilePictureMessage, "Could not save that crop.", "error");
    return;
  }

  const originalPic = cropperOriginalSource
    || (dom.cropperImage && dom.cropperImage.dataset ? dom.cropperImage.dataset.originalSrc : "")
    || state.profileCustomization.originalPic
    || cropped;

  state.profileCustomization.pfp = cropped;
  state.profileCustomization.originalPic = originalPic;
  state.profileCustomization.cropState = { ...cropState };

  if (!saveProfileCustomization()) {
    setProfileMessage(dom.profilePictureMessage, "Could not save profile picture.", "error");
    return;
  }

  forgetRemovedProfilePictureUndo();
  closeCropper();
  applyProfileCustomization();
  setProfileMessage(dom.profilePictureMessage, "Profile picture saved.", "success");
}

function compressImageFileToDataUrl(file, maxDimension = 640, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      reject(new Error("Invalid image file"));
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", (event) => {
      const image = new Image();

      image.addEventListener("load", () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Canvas unsupported"));
          return;
        }

        let width = image.width;
        let height = image.height;
        const aspectRatio = width / height;

        if (width > maxDimension || height > maxDimension) {
          if (aspectRatio > 1) {
            width = maxDimension;
            height = Math.round(maxDimension / aspectRatio);
          } else {
            height = maxDimension;
            width = Math.round(maxDimension * aspectRatio);
          }
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      }, { once: true });

      image.addEventListener("error", () => reject(new Error("Image decode failed")), { once: true });
      image.src = event.target.result;
    });

    reader.addEventListener("error", () => reject(new Error("File read failed")));
    reader.readAsDataURL(file);
  });
}

function validateProfileUsername(value) {
  if (globalThis.ClassicGuessrNameFilter && typeof globalThis.ClassicGuessrNameFilter.validateUsername === "function") {
    return globalThis.ClassicGuessrNameFilter.validateUsername(value);
  }

  const normalizedValue = normalizeProfileName(value);
  const length = [...normalizedValue].length;

  if (!normalizedValue) {
    return getProfileValidationResult(false, "empty", "Enter a username.", normalizedValue);
  }

  if (length < 3) {
    return getProfileValidationResult(false, "too_short", "That username is too short.", normalizedValue);
  }

  if (length > 24) {
    return getProfileValidationResult(false, "too_long", "That username is too long.", normalizedValue);
  }

  return getProfileValidationResult(true, "ok", "OK", normalizedValue);
}

function getProfileValidationResult(ok, code, message, value) {
  return Object.freeze({
    ok,
    code,
    message,
    value,
  });
}

function normalizeProfileName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProfileFlag(value) {
  const code = String(value || "").toLowerCase().trim();
  return PROFILE_FLAG_CODES.has(code) ? code : "";
}

function getUsernameCooldownRemainingMs() {
  const changedAt = Number(state.profileCustomization.usernameChangedAt);

  if (!Number.isFinite(changedAt) || changedAt <= 0) {
    return 0;
  }

  return Math.max(0, changedAt + USERNAME_CHANGE_COOLDOWN_MS - Date.now());
}

function getProfileInitials(username) {
  const words = normalizeProfileName(username).split(" ").filter(Boolean);

  if (!words.length) {
    return "CG";
  }

  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join("").toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toUpperCase();
}

function getProfileFlagUrl(code) {
  const normalizedCode = normalizeProfileFlag(code);

  if (normalizedCode === "hmn") {
    return "https://upload.wikimedia.org/wikipedia/commons/2/27/Hmong_flag.svg";
  }

  return normalizedCode ? `https://flagcdn.com/w80/${normalizedCode}.png` : "";
}

function cssUrl(value) {
  return `url("${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

function formatProfileDate(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setProfileMessage(element, message, type) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

function openSingleplayerSettings() {
  if (state.loading) {
    return;
  }

  resetSingleplayerSettings();
  hide(dom.settingsLoadStatus);
  show(dom.singleplayerSettingsModal);
}

function closeSingleplayerSettings() {
  if (state.loading) {
    return;
  }

  hide(dom.singleplayerSettingsModal);
  resetSingleplayerSettings();
}

function openMultiplayerSettings() {
  loadMenuAction(() => {
    show(dom.multiplayerSettingsModal);
  });
}

function closeMultiplayerSettings() {
  hide(dom.multiplayerSettingsModal);
}

function resetSingleplayerSettings() {
  state.selectedQueue = "casual";
  state.selectedMode = "classic";
  state.selectedSeconds = DEFAULT_SECONDS;
  state.selectedRounds = DEFAULT_ROUNDS;
  state.challengeRevealMs = 0;

  dom.singleplayerQueueOptions.forEach((option) => {
    const isActive = option.dataset.singleplayerQueue === "casual";
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  dom.modeOptions.forEach((option) => {
    option.classList.toggle("is-active", option.dataset.settingMode === "classic");
  });

  dom.timerOptions.forEach((option) => {
    option.classList.toggle("is-active", Number(option.dataset.settingSeconds) === DEFAULT_SECONDS);
  });

  dom.roundOptions.forEach((option) => {
    option.classList.toggle("is-active", Number(option.dataset.settingRounds) === DEFAULT_ROUNDS);
  });

  syncOneSecondRuleUI();
}

function syncOneSecondRuleUI() {
  if (dom.oneSecondRuleSwitch) {
    const isEnabled = state.challengeRevealMs === ONE_SECOND_CHALLENGE_MS;
    dom.oneSecondRuleSwitch.classList.toggle("is-enabled", isEnabled);
    dom.oneSecondRuleSwitch.setAttribute("aria-checked", String(isEnabled));
  }
  if (dom.tenthSecondRuleSwitch) {
    const isEnabled = state.challengeRevealMs === TENTH_SECOND_CHALLENGE_MS;
    dom.tenthSecondRuleSwitch.classList.toggle("is-enabled", isEnabled);
    dom.tenthSecondRuleSwitch.setAttribute("aria-checked", String(isEnabled));
  }

  dom.timerOptions.forEach((option) => {
    option.disabled = state.challengeRevealMs > 0;
  });
}

function loadOverviewMapImage(forceReload = false, refreshIfReady = false) {
  const source = dom.mapImage.dataset.src;
  let sourceChanged = false;

  if (!source) {
    return false;
  }

  if (forceReload && dom.mapImage.getAttribute("src") === source) {
    dom.mapImage.removeAttribute("src");
  }

  if (dom.mapImage.getAttribute("src") !== source) {
    dom.mapImage.src = source;
    sourceChanged = true;
  }

  if ((sourceChanged || refreshIfReady) && dom.mapImage.complete && dom.mapImage.naturalWidth) {
    refreshMapImageLayer();
  }

  return true;
}

function handleMapImageLoad() {
  mapImageRetryCount = 0;
  refreshMapImageLayer();
}

function handleMapImageError() {
  if (mapImageRetryCount >= MAP_IMAGE_RETRY_LIMIT) {
    return;
  }

  mapImageRetryCount += 1;
  window.setTimeout(() => {
    loadOverviewMapImage(true);
  }, mapImageRetryCount * 250);
}

function recoverMapRendering() {
  if (mapRecoveryFrame) {
    return;
  }

  mapRecoveryFrame = window.requestAnimationFrame(() => {
    mapRecoveryFrame = 0;

    if (!dom.mapShell.clientWidth || !dom.mapShell.clientHeight) {
      return;
    }

    loadOverviewMapImage();
    clampMapPan();
    updateMapTransform();
    refreshMapImageLayer();
  });
}

function refreshMapImageLayer() {
  if (!dom.mapImage.getAttribute("src")) {
    return;
  }

  if (mapImageRefreshFrame) {
    window.cancelAnimationFrame(mapImageRefreshFrame);
  }

  mapLayerRefreshSign *= -1;
  // Force a tiny transform change to recover rare stale image layers after resize/tab restore.
  dom.mapImage.style.setProperty("--map-layer-refresh", `${mapLayerRefreshSign * MAP_LAYER_REFRESH_NUDGE_PX}px`);

  mapImageRefreshFrame = window.requestAnimationFrame(() => {
    dom.mapImage.style.setProperty("--map-layer-refresh", "0px");
    mapImageRefreshFrame = 0;
  });
}

function loadMenuAction(callback, options = {}) {
  if (options.skip) {
    return;
  }

  window.clearTimeout(menuLoadingHandle);
  show(dom.menuLoadingOverlay);

  menuLoadingHandle = window.setTimeout(() => {
    callback();
    hide(dom.menuLoadingOverlay);
  }, MENU_LOADING_DELAY_MS);
}

function setMenuView(viewName) {
  const nextView = dom.menuViews.find((view) => view.dataset.menuView === viewName);

  if (!nextView) {
    return;
  }

  dom.menuTabs.forEach((tab) => {
    const isActive = tab.dataset.menuTab === viewName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  dom.menuViews.forEach((view) => {
    const isActive = view === nextView;
    view.classList.toggle("is-active", isActive);
    view.classList.toggle("hidden", !isActive);
  });
}

function isCareerProfileEditorOpen() {
  return Boolean(dom.careerProfilePanel && !dom.careerProfilePanel.classList.contains("hidden"));
}

function isCareerHistoryOpen() {
  return Boolean(dom.careerHistoryPanel && !dom.careerHistoryPanel.classList.contains("hidden"));
}

function showCareerProfileEditor() {
  if (!dom.careerStatsPanel || !dom.careerProfilePanel) {
    return;
  }

  hide(dom.careerStatsPanel);
  if (dom.careerHistoryPanel) {
    hide(dom.careerHistoryPanel);
  }
  show(dom.careerProfilePanel);
  closeProfileFlagList();
  closeCareerRankPopover();

  if (dom.careerEditProfileButton) {
    dom.careerEditProfileButton.setAttribute("aria-expanded", "true");
  }
  if (dom.careerHistoryButton) {
    dom.careerHistoryButton.setAttribute("aria-expanded", "false");
  }

  if (dom.profileUsernameInput && document.activeElement !== dom.profileUsernameInput) {
    dom.profileUsernameInput.focus({ preventScroll: true });
  }
}

function showCareerStatsPanel() {
  if (!dom.careerStatsPanel || !dom.careerProfilePanel) {
    return;
  }

  show(dom.careerStatsPanel);
  hide(dom.careerProfilePanel);
  if (dom.careerHistoryPanel) {
    hide(dom.careerHistoryPanel);
  }
  closeProfileFlagList();
  closeCareerRankPopover();

  if (dom.careerEditProfileButton) {
    dom.careerEditProfileButton.setAttribute("aria-expanded", "false");
  }
  if (dom.careerHistoryButton) {
    dom.careerHistoryButton.setAttribute("aria-expanded", "false");
  }
}

function saveCareerProfileEditor() {
  if (!saveProfileUsername({ quietUnchanged: true })) {
    return;
  }

  forgetRemovedProfilePictureUndo();
  showCareerStatsPanel();
}

function showCareerHistoryPanel() {
  if (!dom.careerStatsPanel || !dom.careerHistoryPanel) {
    return;
  }

  hide(dom.careerStatsPanel);
  if (dom.careerProfilePanel) {
    hide(dom.careerProfilePanel);
  }
  show(dom.careerHistoryPanel);
  renderCareerHistoryUI();
  closeProfileFlagList();
  closeCareerRankPopover();

  if (dom.careerEditProfileButton) {
    dom.careerEditProfileButton.setAttribute("aria-expanded", "false");
  }
  if (dom.careerHistoryButton) {
    dom.careerHistoryButton.setAttribute("aria-expanded", "true");
  }
}

async function loadTiles() {
  const [locationsResponse, excludeResponse] = await Promise.all([
    fetch("./tile_locations.json"),
    fetch("./exclude_tile_locations.txt"),
  ]);

  if (!locationsResponse.ok) {
    throw new Error(`tile_locations.json returned ${locationsResponse.status}`);
  }

  const locations = await locationsResponse.json();
  const excludedIds = excludeResponse.ok
    ? parseExcludedIds(await excludeResponse.text())
    : new Set();

  return Object.entries(locations)
    .map(([fileName, location], index) => buildTile(fileName, location, index))
    .filter(Boolean)
    .filter((tile) => !excludedIds.has(tile.id))
    .sort((left, right) => left.number - right.number);
}

function parseExcludedIds(text) {
  return new Set(
    text
      .replace(/^\uFEFF?\s*exclude\s*:/i, "")
      .split(/[,\s]+/)
      .map(normalizeTileId)
      .filter(Boolean),
  );
}

function buildTile(fileName, location, index) {
  if (!/^tile_\d+\.png$/i.test(fileName)) {
    return null;
  }

  const id = normalizeTileId(fileName);
  const centerX = Number(location.centerX);
  const centerY = Number(location.centerY);
  const x = Number(location.x);
  const y = Number(location.y);
  const width = Number(location.width);
  const height = Number(location.height);

  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  const left = clamp(x, 0, GRAAL_MAP_WIDTH);
  const top = clamp(y, 0, GRAAL_MAP_HEIGHT);
  const right = clamp(x + width, 0, GRAAL_MAP_WIDTH);
  const bottom = clamp(y + height, 0, GRAAL_MAP_HEIGHT);

  return {
    id,
    number: Number(id),
    fileName,
    label: `Location ${id.padStart(4, "0")}`,
    src: `./tiles/${fileName}`,
    mapX: clamp(centerX, 0, GRAAL_MAP_WIDTH),
    mapY: clamp(centerY, 0, GRAAL_MAP_HEIGHT),
    bounds: {
      left: Math.min(left, right),
      top: Math.min(top, bottom),
      right: Math.max(left, right),
      bottom: Math.max(top, bottom),
    },
    deckId: `${fileName}-${index}`,
  };
}

function preloadTileImage(tile) {
  if (!tile) {
    return Promise.resolve(false);
  }

  const cached = tileImagePreloads.get(tile.src);

  if (cached) {
    return cached.promise;
  }

  const image = new Image();
  image.decoding = "async";

  const promise = new Promise((resolve) => {
    let settled = false;
    const finish = async (loaded) => {
      if (settled) {
        return;
      }

      settled = true;

      if (loaded && image.decode) {
        try {
          await image.decode();
        } catch (error) {
          // Loaded images can still reject decode in some browsers; cache is still warm.
        }
      }

      resolve(loaded);
    };

    image.addEventListener("load", () => finish(true), { once: true });
    image.addEventListener("error", () => finish(false), { once: true });
    image.src = tile.src;

    if (image.complete) {
      finish(Boolean(image.naturalWidth));
    }
  });

  tileImagePreloads.set(tile.src, { image, promise });
  return promise;
}

function selectRoundCandidates(tiles, roundCount) {
  return shuffle([...tiles]).slice(0, Math.min(roundCount, tiles.length));
}

async function ensurePlayableRound(roundIndex) {
  const rejectedDeckIds = new Set();

  while (state.rounds[roundIndex]) {
    const tile = state.rounds[roundIndex];

    if (await preloadTileImage(tile)) {
      return true;
    }

    rejectedDeckIds.add(tile.deckId);
    state.rounds.splice(roundIndex, 1);

    const scheduledDeckIds = new Set(state.rounds.map((round) => round.deckId));
    const replacement = shuffle(state.tiles).find(
      (candidate) =>
        !scheduledDeckIds.has(candidate.deckId) &&
        !rejectedDeckIds.has(candidate.deckId),
    );

    if (replacement) {
      state.rounds.push(replacement);
    }
  }

  return false;
}

async function ensureMultiplayerTilesLoaded() {
  if (!state.tiles.length) {
    state.tiles = await loadTiles();
  }

  if (!state.tiles.length) {
    throw new Error("No available location images were found.");
  }
}

async function createMultiplayerRoundPlan(settings = {}) {
  await ensureMultiplayerTilesLoaded();
  const requestedRounds = clamp(
    settings.competitive ? 20 : Math.round(Number(settings.rounds) || DEFAULT_ROUNDS),
    1,
    Math.min(20, state.tiles.length),
  );
  const candidates = shuffle([...state.tiles]);
  const playableIds = [];

  for (const tile of candidates) {
    if (await preloadTileImage(tile)) {
      playableIds.push(tile.id);
    }
    if (playableIds.length >= requestedRounds) {
      break;
    }
  }

  if (playableIds.length < requestedRounds) {
    throw new Error("There are not enough playable location images for this match.");
  }

  return playableIds;
}

async function startMultiplayerGame(match = {}) {
  const lobbyCode = String(match.lobbyCode || "").toUpperCase();
  if (
    state.multiplayerSession?.lobbyCode === lobbyCode
    && !dom.gameScreen.classList.contains("hidden")
  ) {
    return true;
  }
  if (state.loading) {
    return false;
  }

  state.loading = true;

  try {
    await ensureMultiplayerTilesLoaded();
    const tileById = new Map(state.tiles.map((tile) => [tile.id, tile]));
    const requestedIds = Array.isArray(match.roundIds)
      ? match.roundIds.map(normalizeTileId).filter(Boolean)
      : [];
    const sharedRounds = requestedIds.map((id) => tileById.get(id)).filter(Boolean);

    if (!requestedIds.length || sharedRounds.length !== requestedIds.length) {
      throw new Error("The shared match contains unavailable locations.");
    }

    const playable = await Promise.all(sharedRounds.map(preloadTileImage));
    if (playable.some((loaded) => !loaded)) {
      throw new Error("A shared match location image could not be loaded.");
    }

    const settings = match.settings && typeof match.settings === "object" ? match.settings : {};
    state.selectedSeconds = Math.max(0, Number(settings.seconds) || 0);
    state.selectedRounds = sharedRounds.length;
    state.challengeRevealMs = Math.max(0, Number(settings.challengeRevealMs) || 0);
    state.rounds = sharedRounds;
    state.roundIndex = 0;
    state.score = 0;
    state.results = [];
    state.careerStatsSavedForRun = false;
    state.multiplayerSession = {
      lobbyCode,
      teamMode: match.teamMode === "2v2" ? "2v2" : "1v1",
      uid: String(match.uid || ""),
      team: match.team === "blue" ? "blue" : "red",
      competitive: Boolean(settings.competitive),
      maxHealth: Math.max(1, Number(settings.health) || DEFAULT_TEAM_HEALTH),
      matchOver: false,
    };
    state.multiplayerLockReason = "";
    state.multiplayerDamageRound = -1;
    state.competitiveDeadlineMs = 0;
    state.multiplayerRoundStartedAtMs = 0;
    state.multiplayerRoundEndsAtMs = 0;
    state.multiplayerNextRoundAtMs = 0;

    loadOverviewMapImage(false, true);
    hide(dom.multiplayerStandings);
    if (state.multiplayerSession.competitive) show(dom.teamHealthHud);
    else hide(dom.teamHealthHud);
    dom.gameScreen.classList.toggle("is-red-team", state.multiplayerSession.team === "red");
    dom.gameScreen.classList.toggle("is-blue-team", state.multiplayerSession.team === "blue");
    updateTeamHealth({
      redHealth: Number(match.redHealth ?? getMaxTeamHealth()),
      blueHealth: Number(match.blueHealth ?? getMaxTeamHealth()),
      redMultiplier: Number(match.redMultiplier ?? match.damageMultiplier ?? 1),
      blueMultiplier: Number(match.blueMultiplier ?? match.damageMultiplier ?? 1),
    });
    hide(dom.menuScreen);
    hide(dom.resultsScreen);
    show(dom.gameScreen);
    renderRound();
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-started", {
      detail: { lobbyCode },
    }));
    return true;
  } finally {
    state.loading = false;
  }
}

async function startGame() {
  if (state.loading) {
    return;
  }

  state.loading = true;
  dom.startButton.disabled = true;
  dom.startButton.textContent = "Loading...";
  dom.settingsLoadStatus.textContent = "";
  dom.settingsLoadStatus.classList.add("hidden");

  if (!state.tiles.length) {
    try {
      state.tiles = await loadTiles();
    } catch (error) {
      console.error(error);
      dom.settingsLoadStatus.textContent = "Could not load tile_locations.json.";
      dom.startButton.disabled = false;
      dom.startButton.textContent = "Start Game";
      state.loading = false;
      return;
    }
  }

  state.rounds = selectRoundCandidates(state.tiles, state.selectedRounds);
  state.roundIndex = 0;
  state.score = 0;
  state.results = [];
  state.careerStatsSavedForRun = false;
  state.multiplayerSession = null;
  state.multiplayerLockReason = "";
  state.multiplayerDamageRound = -1;
  hide(dom.multiplayerStandings);
  hide(dom.teamHealthHud);
  dom.gameScreen.classList.remove("is-red-team", "is-blue-team");

  if (!(await ensurePlayableRound(0))) {
    dom.settingsLoadStatus.textContent = "No available location images were found.";
    dom.settingsLoadStatus.classList.remove("hidden");
    dom.startButton.disabled = false;
    dom.startButton.textContent = "Start Game";
    state.loading = false;
    return;
  }

  loadOverviewMapImage(false, true);

  state.loading = false;
  dom.startButton.disabled = false;
  dom.startButton.textContent = "Start Game";
  dom.settingsLoadStatus.classList.add("hidden");
  hide(dom.menuScreen);
  hide(dom.resultsScreen);
  show(dom.gameScreen);
  renderRound();
}

function showMenu() {
  if (state.multiplayerSession) {
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-exit", {
      detail: { ...state.multiplayerSession },
    }));
    state.multiplayerSession = null;
    state.multiplayerLockReason = "";
    state.multiplayerDamageRound = -1;
    state.competitiveDeadlineMs = 0;
    state.multiplayerNextRoundAtMs = 0;
  }
  clearRoundFlowTimers();
  clearMultiplayerGuessNotice();
  setCalibrationCapture(false);
  setMenuView("play");
  showModePicker();
  hide(dom.gameScreen);
  hide(dom.resultsScreen);
  hide(dom.teamHealthHud);
  clearMultiplayerMarkers();
  clearSpectatorViews();
  dom.gameScreen.classList.remove("is-red-team", "is-blue-team");
  show(dom.menuScreen);
}

function handleResultsReturn() {
  if (!state.multiplayerSession) {
    showMenu();
    return;
  }

  clearRoundFlowTimers();
  clearMultiplayerGuessNotice();
  setCalibrationCapture(false);
  hide(dom.gameScreen);
  hide(dom.resultsScreen);
  hide(dom.teamHealthHud);
  clearMultiplayerMarkers();
  clearSpectatorViews();
  dom.gameScreen.classList.remove("is-red-team", "is-blue-team");
  show(dom.menuScreen);
  window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-return-lobby", {
    detail: { lobbyCode: state.multiplayerSession.lobbyCode },
  }));
}

function renderRound() {
  clearRoundFlowTimers();
  clearMultiplayerGuessNotice();
  state.pendingDamagePresentation = null;
  const tile = getCurrentTile();

  if (!tile) {
    renderResults();
    return;
  }

  state.pendingGuess = null;
  state.revealed = false;
  state.multiplayerLockReason = "";
  state.competitiveDeadlineMs = 0;
  state.multiplayerRoundStartedAtMs = 0;
  state.multiplayerRoundEndsAtMs = 0;
  state.multiplayerNextRoundAtMs = 0;
  state.roundInputLocked = true;
  state.mapNavigationLocked = true;
  state.timeLeft = getRoundSeconds();
  state.challengeElapsedSeconds = 0;
  state.challengeTimerStartedAt = 0;
  setCalibrationCapture(false);
  cancelMapDrag();
  resetMapZoom();
  setClueBlackout(false);
  setCountdownClueHidden(true);

  dom.tileImage.src = tile.src;
  dom.tileImage.alt = `${tile.label} clue`;
  scheduleMobileGameHeaderPosition();
  dom.roundLabel.textContent = state.multiplayerSession?.competitive
    ? `${state.roundIndex + 1}`
    : `${state.roundIndex + 1} / ${getTotalRounds()}`;
  dom.scoreLabel.textContent = formatNumber(state.score);
  dom.statusLine.textContent = "Get ready. The round starts after the countdown.";
  dom.timerLabel.classList.remove("is-guess-first", "is-competitive-timer");
  dom.timerLabel.classList.toggle("is-competitive-timer", Boolean(state.multiplayerSession?.competitive));
  dom.timerLabel.textContent = "Ready";
  dom.guessButton.textContent = "Place a pin";
  dom.guessButton.disabled = true;
  dom.nextButton.disabled = false;
  show(dom.guessButton);
  hide(dom.nextButton);
  dom.mapActions?.classList.remove("is-collapsed");
  hide(dom.guessMarker);
  hide(dom.answerMarker);
  clearMultiplayerMarkers();
  clearSpectatorViews();
  if (state.multiplayerSession) {
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-round-enter", {
      detail: { lobbyCode: state.multiplayerSession.lobbyCode, roundIndex: state.roundIndex },
    }));
  }
  startRoundCountdown();
}

function handleMapPointer(event) {
  if (state.mapNavigationLocked) {
    event.preventDefault();
    return;
  }

  if (event.target instanceof Element && event.target.closest(".zoom-controls")) {
    return;
  }

  event.preventDefault();
  if (event.pointerType === "touch") {
    state.mapTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  try {
    dom.mapShell.setPointerCapture(event.pointerId);
  } catch (error) {}

  if (event.pointerType === "touch" && state.mapTouchPointers.size >= 2) {
    state.mapDrag = null;
    startMapPinch();
    dom.mapShell.classList.add("is-dragging");
    return;
  }

  state.mapDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false,
  };
  dom.mapShell.classList.add("is-dragging");
}

function handleMapPointerMove(event) {
  if (event.pointerType === "touch" && state.mapTouchPointers.has(event.pointerId)) {
    state.mapTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (state.mapTouchPointers.size >= 2) {
      event.preventDefault();
      if (!state.mapPinch) startMapPinch();
      updateMapPinch();
      return;
    }
  }

  const drag = state.mapDrag;

  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  const rect = dom.mapShell.getBoundingClientRect();
  const scaleX = dom.mapShell.clientWidth / rect.width;
  const scaleY = dom.mapShell.clientHeight / rect.height;
  const deltaX = event.clientX - drag.lastX;
  const deltaY = event.clientY - drag.lastY;
  const totalMove = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);

  drag.lastX = event.clientX;
  drag.lastY = event.clientY;

  if (totalMove > MAP_DRAG_THRESHOLD) {
    drag.moved = true;
  }

  if (drag.moved && state.mapZoom > 1) {
    state.mapPanX += deltaX * scaleX;
    state.mapPanY += deltaY * scaleY;
    clampMapPan();
    updateMapTransform();
  }
}

function handleMapPointerUp(event) {
  const drag = state.mapDrag;

  if (event.pointerType === "touch" && state.mapTouchPointers.has(event.pointerId)) {
    const wasPinching = Boolean(state.mapPinch) || state.mapTouchPointers.size >= 2;
    state.mapTouchPointers.delete(event.pointerId);
    if (wasPinching) {
      event.preventDefault();
      state.mapPinch = null;
      state.mapDrag = null;
      const remainingPointer = [...state.mapTouchPointers.entries()][0];
      if (remainingPointer) {
        const [pointerId, point] = remainingPointer;
        state.mapDrag = {
          pointerId,
          startX: point.x,
          startY: point.y,
          lastX: point.x,
          lastY: point.y,
          moved: true,
        };
      } else {
        dom.mapShell.classList.remove("is-dragging");
      }
      releaseMapPointerCapture(event.pointerId);
      return;
    }
  }

  if (!drag || drag.pointerId !== event.pointerId) {
    releaseMapPointerCapture(event.pointerId);
    return;
  }

  event.preventDefault();
  state.mapDrag = null;
  dom.mapShell.classList.remove("is-dragging");

  releaseMapPointerCapture(event.pointerId);

  if (!drag.moved && state.calibrationCapture) {
    addCalibrationSampleAtClient(event.clientX, event.clientY);
    return;
  }

  if (!drag.moved && !state.revealed && !state.roundInputLocked) {
    placeGuessAtClient(event.clientX, event.clientY);
  }
}

function cancelMapDrag(event) {
  if (event?.pointerId !== undefined) {
    state.mapTouchPointers.delete(event.pointerId);
    releaseMapPointerCapture(event.pointerId);
  } else {
    state.mapTouchPointers.clear();
  }
  state.mapPinch = null;
  state.mapDrag = null;
  dom.mapShell.classList.remove("is-dragging");
}

function releaseMapPointerCapture(pointerId) {
  try {
    if (dom.mapShell.hasPointerCapture(pointerId)) {
      dom.mapShell.releasePointerCapture(pointerId);
    }
  } catch (error) {}
}

function getMapPinchPoints() {
  return [...state.mapTouchPointers.values()].slice(0, 2);
}

function startMapPinch() {
  const points = getMapPinchPoints();
  if (points.length < 2 || !loadOverviewMapImage()) {
    state.mapPinch = null;
    return;
  }

  const midpointX = (points[0].x + points[1].x) / 2;
  const midpointY = (points[0].y + points[1].y) / 2;
  const anchor = getVisualPointFromClient(midpointX, midpointY);
  state.mapPinch = {
    startDistance: Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)),
    startZoom: state.mapZoom,
    anchorX: anchor?.x ?? 0.5,
    anchorY: anchor?.y ?? 0.5,
  };
}

function updateMapPinch() {
  const points = getMapPinchPoints();
  const pinch = state.mapPinch;
  if (!pinch || points.length < 2) return;

  const rect = dom.mapShell.getBoundingClientRect();
  const width = dom.mapShell.clientWidth;
  const height = dom.mapShell.clientHeight;
  if (!rect.width || !rect.height || !width || !height) return;

  const distance = Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y));
  const midpointX = (points[0].x + points[1].x) / 2;
  const midpointY = (points[0].y + points[1].y) / 2;
  const shellX = ((midpointX - rect.left) / rect.width) * width;
  const shellY = ((midpointY - rect.top) / rect.height) * height;
  const nextZoom = clamp(pinch.startZoom * (distance / pinch.startDistance), 1, MAX_MAP_ZOOM);

  state.mapZoom = nextZoom;
  state.mapPanX = shellX - pinch.anchorX * width * nextZoom;
  state.mapPanY = shellY - pinch.anchorY * height * nextZoom;
  clampMapPan();
  updateMapTransform();
}

function placeGuessAtClient(clientX, clientY) {
  const point = getMapPointFromClient(clientX, clientY);
  const x = point.x;
  const y = point.y;

  state.pendingGuess = {
    x,
    y,
    mapX: x * GRAAL_MAP_WIDTH,
    mapY: y * GRAAL_MAP_HEIGHT,
  };

  positionMarker(dom.guessMarker, x, y);
  dom.guessButton.textContent = "Guess";
  dom.guessButton.disabled = false;
  dom.statusLine.textContent = "Pin placed. Press Guess to lock it in.";
  if (state.multiplayerSession) {
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-guess-preview", {
      detail: {
        lobbyCode: state.multiplayerSession.lobbyCode,
        roundIndex: state.roundIndex,
        x,
        y,
      },
    }));
  }
}

function handleMapWheel(event) {
  event.preventDefault();

  if (state.mapNavigationLocked) {
    return;
  }

  if (!loadOverviewMapImage()) {
    return;
  }

  const direction = event.deltaY < 0 ? 1 : -1;
  const factor = direction > 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR;
  setMapZoom(state.mapZoom * factor, event.clientX, event.clientY);
}

function submitGuess() {
  if (state.roundInputLocked || state.revealed || !state.pendingGuess) {
    return;
  }

  if (state.multiplayerSession) {
    lockMultiplayerGuess("guess");
    return;
  }

  revealRound("guess");
}

function lockMultiplayerGuess(reason) {
  if (!state.multiplayerSession || state.revealed || state.roundInputLocked) return;
  const tile = getCurrentTile();
  const guess = state.pendingGuess;
  const distance = guess ? distanceToTileBounds(guess, tile) : null;
  const roundScore = guess ? scoreForDistance(distance) : 0;
  state.multiplayerLockReason = reason;
  state.roundInputLocked = true;
  clearTimer();
  dom.guessButton.disabled = true;
  dom.guessButton.textContent = "Locked in";
  dom.statusLine.textContent = "Guess locked. Waiting for the other players.";
  window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-guess-lock", {
    detail: {
      lobbyCode: state.multiplayerSession.lobbyCode,
      roundIndex: state.roundIndex,
      x: guess?.x ?? null,
      y: guess?.y ?? null,
      roundScore,
      timedOut: reason === "timeout",
    },
  }));
}

function revealRound(reason) {
  if (state.revealed) {
    return;
  }

  clearRoundFlowTimers();
  clearSpectatorViews();
  setClueBlackout(false);
  state.revealed = true;
  state.roundInputLocked = false;
  state.mapNavigationLocked = false;

  const tile = getCurrentTile();
  const guess = state.pendingGuess;
  const distance = guess ? distanceToTileBounds(guess, tile) : null;
  const perfect = guess ? distance === 0 : false;
  const roundScore = guess ? scoreForDistance(distance) : 0;

  state.score += roundScore;
  state.results.push({
    tile,
    distance,
    perfect,
    score: roundScore,
    timedOut: reason === "timeout",
  });

  if (state.multiplayerSession) {
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-round-result", {
      detail: {
        lobbyCode: state.multiplayerSession.lobbyCode,
        roundIndex: state.roundIndex,
        roundScore,
        totalScore: state.score,
      },
    }));
  }

  positionMarker(dom.answerMarker, tile.mapX / GRAAL_MAP_WIDTH, tile.mapY / GRAAL_MAP_HEIGHT);
  dom.scoreLabel.textContent = formatNumber(state.score);
  dom.guessButton.disabled = true;
  hide(dom.guessButton);
  const hasAnotherMultiplayerRound = Boolean(
    state.multiplayerSession
    && !state.multiplayerSession.matchOver
    && (state.multiplayerSession.competitive || state.roundIndex + 1 < getTotalRounds())
  );
  if (hasAnotherMultiplayerRound) hide(dom.nextButton);
  else show(dom.nextButton);
  dom.mapActions?.classList.toggle("is-collapsed", hasAnotherMultiplayerRound);
  dom.nextButton.textContent = state.multiplayerSession?.matchOver
    || (!state.multiplayerSession?.competitive && state.roundIndex + 1 >= getTotalRounds())
    ? "View results"
    : "Next round";
  updateMapCalibrationControls();
  const damagePresentation = state.multiplayerSession?.competitive
    && Number(state.pendingDamagePresentation?.roundIndex) === state.roundIndex
    && Number(state.pendingDamagePresentation?.damage) > 0
    ? state.pendingDamagePresentation
    : null;
  focusMapOnAnswer(
    tile,
    reason === "guess" && !state.multiplayerSession ? ANSWER_FOCUS_DELAY_MS : 0,
    () => {
      if (damagePresentation) {
        void playCompetitiveDamageSequence(damagePresentation, hasAnotherMultiplayerRound);
      } else if (hasAnotherMultiplayerRound) {
        startNextRoundCountdown();
      }
    },
  );

  if (roundScore === MAX_ROUND_SCORE && !damagePresentation) {
    showPerfectScoreCelebration();
  }

  if (!guess) {
    hide(dom.guessMarker);
    dom.statusLine.textContent = `Time expired. The correct spot was ${tile.label}.${RESULT_MAP_HINT}`;
    return;
  }

  if (perfect) {
    dom.statusLine.textContent = `Perfect. ${formatNumber(roundScore)} points.${RESULT_MAP_HINT}`;
    return;
  }

  dom.statusLine.textContent = `${formatNumber(distance)} px away. ${formatNumber(roundScore)} points.${RESULT_MAP_HINT}`;
}

async function nextRound() {
  clearNextRoundCountdown();
  dom.nextButton.disabled = true;
  if (state.multiplayerSession?.matchOver) {
    renderResults();
    return;
  }
  state.roundIndex += 1;

  if (state.multiplayerSession?.competitive) {
    renderRound();
    return;
  }

  if (getCurrentTile() && !(await ensurePlayableRound(state.roundIndex))) {
    renderResults();
    return;
  }

  renderRound();
}

function renderResults() {
  clearRoundFlowTimers();
  setClueBlackout(false);
  setCalibrationCapture(false);
  hide(dom.gameScreen);
  show(dom.resultsScreen);
  dom.resultsScoreValue.textContent = formatNumber(state.score);
  dom.resultsGrid.innerHTML = "";

  const isMultiplayerResult = Boolean(state.multiplayerSession);
  dom.resultsScreen.classList.toggle("is-multiplayer-result", isMultiplayerResult);
  dom.resultsTitle.classList.toggle("is-multiplayer", isMultiplayerResult);
  if (dom.resultsTitle.firstChild) {
    dom.resultsTitle.firstChild.textContent = isMultiplayerResult ? "Match Results" : "Final score: ";
  }
  dom.resultsScoreValue.classList.toggle("hidden", isMultiplayerResult);
  dom.resultsGrid.classList.toggle("hidden", isMultiplayerResult);

  if (!isMultiplayerResult) state.results.forEach((result, index) => {
    const row = document.createElement("article");
    row.className = "result-row";
    row.innerHTML = `
      <span class="result-index">${index + 1}</span>
      <div>
        <strong>${result.tile.label}</strong>
        <span class="result-distance${result.perfect ? " result-distance--perfect" : ""}">${formatResultDistance(result)}</span>
      </div>
      <span class="result-score">${formatNumber(result.score)}</span>
    `;
    dom.resultsGrid.appendChild(row);
  });

  if (state.multiplayerSession) {
    show(dom.multiplayerStandings);
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-finished", {
      detail: {
        lobbyCode: state.multiplayerSession.lobbyCode,
        score: state.score,
        rounds: state.results.length,
      },
    }));
  } else {
    hide(dom.multiplayerStandings);
  }
}

function recordCareerRun() {
  if (state.careerStatsSavedForRun || !state.results.length) {
    return;
  }

  const runScore = state.results.reduce((sum, result) => sum + result.score, 0);
  const bestRound = Math.max(0, ...state.results.map((result) => result.score));
  const perfects = state.results.filter((result) => result.perfect).length;
  let streak = state.careerStats.streak;
  let highestStreak = state.careerStats.highestStreak;

  state.results.forEach((result) => {
    streak = result.perfect ? streak + 1 : 0;
    highestStreak = Math.max(highestStreak, streak);
  });

  state.careerStats = normalizeCareerStats({
    matchesPlayed: state.careerStats.matchesPlayed + 1,
    totalScore: state.careerStats.totalScore + runScore,
    totalGuesses: state.careerStats.totalGuesses + state.results.length,
    bestRound: Math.max(state.careerStats.bestRound, bestRound),
    bestMatchScore: Math.max(state.careerStats.bestMatchScore, runScore),
    perfects: state.careerStats.perfects + perfects,
    streak,
    highestStreak,
  });
  state.careerStatsSavedForRun = true;
  saveCareerStats();
  recordCareerHistoryRun({ runScore, bestRound, perfects });
  updateCareerStatsUI();
}

function recordCareerHistoryRun({ runScore, bestRound, perfects }) {
  const entry = normalizeCareerHistoryEntry({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playedAt: Date.now(),
    queue: state.selectedQueue,
    mode: state.selectedMode,
    rounds: state.results.length,
    score: runScore,
    bestRound,
    perfects,
  });

  state.careerHistory = normalizeCareerHistory([entry, ...state.careerHistory]);
  saveCareerHistory();
  renderCareerHistoryUI();
}

function renderCareerHistoryUI() {
  if (!dom.careerHistoryList) {
    return;
  }

  dom.careerHistoryList.textContent = "";

  if (!state.careerHistory.length) {
    const empty = document.createElement("div");
    empty.className = "career-history-empty";
    empty.textContent = "No games recorded yet.";
    dom.careerHistoryList.appendChild(empty);
    return;
  }

  state.careerHistory.forEach((entry, index) => {
    const row = document.createElement("article");
    const place = document.createElement("span");
    const summary = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const score = document.createElement("strong");

    row.className = "career-history-entry";
    place.className = "career-history-index";
    summary.className = "career-history-summary";
    score.className = "career-history-score";

    place.textContent = String(index + 1);
    title.textContent = `${formatNumber(entry.score)} points`;
    meta.textContent = `${formatHistoryDate(entry.playedAt)} | ${formatCareerQueue(entry.queue)} | ${formatCareerMode(entry.mode)} | ${formatNumber(entry.rounds)} rounds | ${formatNumber(entry.perfects)} perfect`;
    score.textContent = `Best ${formatNumber(entry.bestRound)}`;

    summary.append(title, meta);
    row.append(place, summary, score);
    dom.careerHistoryList.appendChild(row);
  });
}

function startRoundCountdown() {
  if (state.multiplayerSession) {
    dom.gameScreen.classList.add("is-counting-down");
    showMultiplayerWaitingState();
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-round-playable", {
      detail: { lobbyCode: state.multiplayerSession.lobbyCode, roundIndex: state.roundIndex },
    }));
    return;
  }

  let remaining = ROUND_COUNTDOWN_SECONDS;
  dom.gameScreen.classList.add("is-counting-down");
  showCountdownValue(remaining);
  show(dom.clueOverlay);

  state.countdownHandle = backgroundTimers.setInterval(() => {
    remaining -= 1;

    if (remaining <= 0) {
      clearCountdown();
      hide(dom.clueOverlay);
      dom.gameScreen.classList.remove("is-counting-down");
      startPlayableRound();
      return;
    }

    showCountdownValue(remaining);
  }, 1000);
}

function showMultiplayerWaitingState() {
  dom.clueCountdownValue.textContent = "Waiting for players";
  dom.clueCountdownValue.classList.remove("is-animating");
  dom.clueCountdownValue.classList.add("is-waiting");
  show(dom.clueOverlay);
}

function showCountdownValue(value) {
  dom.clueCountdownValue.textContent = String(value);
  dom.clueCountdownValue.classList.remove("is-waiting");
  dom.clueCountdownValue.classList.remove("is-animating");
  void dom.clueCountdownValue.offsetWidth;
  dom.clueCountdownValue.classList.add("is-animating");
}

function startPlayableRound() {
  setCountdownClueHidden(false);
  const waitsForSharedClock = Boolean(
    state.multiplayerSession
    && !state.multiplayerSession.competitive
    && state.multiplayerRoundStartedAtMs <= 0
  );
  state.roundInputLocked = waitsForSharedClock;
  state.mapNavigationLocked = waitsForSharedClock;
  state.timeLeft = getRoundSeconds();
  state.challengeElapsedSeconds = 0;
  dom.statusLine.textContent = "Click to place a marker. Zoom in, then hold and drag to move the map.";
  updateTimerLabel();

  if (state.multiplayerSession) {
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-round-playable", {
      detail: { lobbyCode: state.multiplayerSession.lobbyCode, roundIndex: state.roundIndex },
    }));
    updateMapTransform();
  }

  if (state.multiplayerSession?.competitive) {
    startCompetitiveDeadlineTimer();
    return;
  }

  if (waitsForSharedClock) {
    dom.guessButton.disabled = true;
    dom.statusLine.textContent = "Waiting for every player to enter the round.";
    return;
  }

  if (state.challengeRevealMs > 0) {
    startTimer();
    state.oneSecondBlackoutHandle = window.setTimeout(() => {
      state.oneSecondBlackoutHandle = 0;
      setClueBlackout(true);
      dom.statusLine.textContent = "The clue is hidden. Take your time and place your guess.";
    }, state.challengeRevealMs);
    return;
  }

  startTimer();
}

function setClueBlackout(isBlackout) {
  dom.tileImage.classList.toggle("is-blackout", isBlackout);
}

function setCountdownClueHidden(isHidden) {
  dom.tileImage.classList.toggle("is-countdown-hidden", isHidden);
}

function focusMapOnAnswer(tile, delayMs = 0, onComplete = null) {
  const width = dom.mapShell.clientWidth;
  const height = dom.mapShell.clientHeight;

  if (!width || !height || !tile) {
    dom.nextButton.disabled = false;
    onComplete?.();
    return;
  }

  const answerPoint = getVisualMapPoint(tile.mapX / GRAAL_MAP_WIDTH, tile.mapY / GRAAL_MAP_HEIGHT);
  const safeAnswerX = clamp(answerPoint.x, 0.0001, 0.9999);
  const safeAnswerY = clamp(answerPoint.y, 0.0001, 0.9999);
  const targetScreenX = 0.5;
  const targetScreenY = 0.5;
  const zoomNeededToCenter = Math.max(
    targetScreenX / safeAnswerX,
    (1 - targetScreenX) / (1 - safeAnswerX),
    targetScreenY / safeAnswerY,
    (1 - targetScreenY) / (1 - safeAnswerY),
  );
  const requiredZoom = clamp(
    Math.max(ANSWER_FOCUS_MIN_ZOOM, zoomNeededToCenter),
    1,
    MAX_MAP_ZOOM,
  );
  // Once the player is already close enough, preserve their zoom. Forcing an
  // additional zoom here makes a nearby answer appear to dip away and return.
  const targetZoom = state.mapZoom >= requiredZoom ? state.mapZoom : requiredZoom;
  const targetPanX = targetZoom <= 1
    ? 0
    : clamp(width * targetScreenX - safeAnswerX * width * targetZoom, width - width * targetZoom, 0);
  const targetPanY = targetZoom <= 1
    ? 0
    : clamp(height * targetScreenY - safeAnswerY * height * targetZoom, height - height * targetZoom, 0);
  const startZoom = state.mapZoom;
  const startPanX = state.mapPanX;
  const startPanY = state.mapPanY;
  const isAlreadyFocused = Math.abs(targetZoom - startZoom) < 0.001
    && Math.abs(targetPanX - startPanX) < 1
    && Math.abs(targetPanY - startPanY) < 1;

  state.roundInputLocked = true;
  state.mapNavigationLocked = true;
  dom.nextButton.disabled = true;

  const finishAnswerFocus = (done) => {
    dom.mapShell.classList.remove("is-answer-focusing");
    state.roundInputLocked = false;
    state.mapNavigationLocked = false;
    dom.nextButton.disabled = false;
    done?.();
  };

  const beginAnswerFocus = () => {
    state.answerFocusDelayHandle = 0;

    if (isAlreadyFocused) {
      state.mapZoom = targetZoom;
      state.mapPanX = targetPanX;
      state.mapPanY = targetPanY;
      updateMapTransform();
      const synchronizedRevealDelay = state.multiplayerSession ? ANSWER_FOCUS_DURATION_MS : 0;
      if (synchronizedRevealDelay > 0) {
        state.answerFocusDelayHandle = window.setTimeout(() => {
          state.answerFocusDelayHandle = 0;
          state.roundInputLocked = false;
          state.mapNavigationLocked = false;
          dom.nextButton.disabled = false;
          onComplete?.();
        }, synchronizedRevealDelay);
      } else {
        state.roundInputLocked = false;
        state.mapNavigationLocked = false;
        dom.nextButton.disabled = false;
        onComplete?.();
      }
      return;
    }

    const animationStartedAt = performance.now();
    dom.mapShell.classList.add("is-answer-focusing");

    const animateAnswerFocus = (timestamp) => {
      const progress = clamp((timestamp - animationStartedAt) / ANSWER_FOCUS_DURATION_MS, 0, 1);
      const easedProgress = progress * progress * progress * (progress * (progress * 6 - 15) + 10);

      state.mapZoom = startZoom + (targetZoom - startZoom) * easedProgress;
      state.mapPanX = startPanX + (targetPanX - startPanX) * easedProgress;
      state.mapPanY = startPanY + (targetPanY - startPanY) * easedProgress;
      updateMapTransform(width, height);

      if (progress < 1) {
        state.answerFocusHandle = window.requestAnimationFrame(animateAnswerFocus);
        return;
      }

      state.answerFocusHandle = 0;
      finishAnswerFocus(onComplete);
    };

    // No animation frames arrive while the tab is hidden, and this animation's completion is
    // what starts the damage sequence and next-round countdown. Snap straight to the focused
    // camera so a backgrounded player stays on the same round as everyone else.
    if (document.hidden) {
      state.mapZoom = targetZoom;
      state.mapPanX = targetPanX;
      state.mapPanY = targetPanY;
      updateMapTransform(width, height);
      finishAnswerFocus(onComplete);
      return;
    }

    state.answerFocusHandle = window.requestAnimationFrame(animateAnswerFocus);
  };

  if (delayMs > 0 && !document.hidden) {
    state.answerFocusDelayHandle = window.setTimeout(beginAnswerFocus, delayMs);
  } else {
    beginAnswerFocus();
  }
}

function showPerfectScoreCelebration() {
  window.clearTimeout(state.perfectCelebrationHandle);
  dom.perfectScoreCelebration.classList.remove("is-active");
  dom.perfectScoreCelebration.setAttribute("aria-hidden", "false");
  void dom.perfectScoreCelebration.offsetWidth;
  dom.perfectScoreCelebration.classList.add("is-active");

  state.perfectCelebrationHandle = window.setTimeout(() => {
    state.perfectCelebrationHandle = 0;
    dom.perfectScoreCelebration.classList.remove("is-active");
    dom.perfectScoreCelebration.setAttribute("aria-hidden", "true");
  }, PERFECT_CELEBRATION_DURATION_MS);
}

function clearRevealEffects() {
  if (state.answerFocusDelayHandle) {
    window.clearTimeout(state.answerFocusDelayHandle);
    state.answerFocusDelayHandle = 0;
  }
  if (state.answerFocusHandle) {
    window.cancelAnimationFrame(state.answerFocusHandle);
    state.answerFocusHandle = 0;
  }
  if (state.perfectCelebrationHandle) {
    window.clearTimeout(state.perfectCelebrationHandle);
    state.perfectCelebrationHandle = 0;
  }

  dom.mapShell.classList.remove("is-answer-focusing");
  dom.perfectScoreCelebration.classList.remove("is-active");
  dom.perfectScoreCelebration.setAttribute("aria-hidden", "true");
  clearCompetitiveDamageSequence();
}

function clearRoundFlowTimers() {
  clearTimer();
  clearCountdown();
  clearNextRoundCountdown();
  clearSynchronizedReveal();
  clearRevealEffects();
  setCountdownClueHidden(false);

  if (state.oneSecondBlackoutHandle) {
    window.clearTimeout(state.oneSecondBlackoutHandle);
    state.oneSecondBlackoutHandle = 0;
  }

  state.roundInputLocked = false;
  state.mapNavigationLocked = false;
  dom.gameScreen.classList.remove("is-counting-down");
  hide(dom.clueOverlay);
}

function startNextRoundCountdown() {
  clearNextRoundCountdown();
  if (!dom.nextRoundCountdown || !dom.nextRoundCountdownValue || !state.multiplayerSession) return;

  // A missed anchor must never become a fresh per-client 5s timer - that would hand every
  // client its own next-round time and desync every round that follows. Late clients
  // converge back onto the shared schedule with a short grace instead.
  const anchoredMs = Number(state.multiplayerNextRoundAtMs) || 0;
  const endsAtMs = anchoredMs > 0
    ? Math.max(anchoredMs, Date.now() + 250)
    : Date.now() + 5000;
  let displayedValue = 0;

  const tick = () => {
    const remainingMs = endsAtMs - Date.now();
    if (remainingMs <= 0) {
      clearNextRoundCountdown();
      nextRound();
      return;
    }

    const nextValue = clamp(Math.ceil(remainingMs / 1000), 1, 5);
    if (nextValue !== displayedValue) {
      displayedValue = nextValue;
      dom.nextRoundCountdownValue.textContent = String(nextValue);
      dom.nextRoundCountdownValue.classList.remove("is-ticking");
      void dom.nextRoundCountdownValue.offsetWidth;
      dom.nextRoundCountdownValue.classList.add("is-ticking");
    }
  };

  show(dom.nextRoundCountdown);
  tick();
  state.nextRoundCountdownHandle = backgroundTimers.setInterval(tick, 50);
}

function clearNextRoundCountdown() {
  if (state.nextRoundCountdownHandle) {
    backgroundTimers.clearInterval(state.nextRoundCountdownHandle);
    state.nextRoundCountdownHandle = 0;
  }
  dom.nextRoundCountdown?.classList.add("hidden");
  dom.nextRoundCountdownValue?.classList.remove("is-ticking");
}

function clearCountdown() {
  if (state.countdownHandle) {
    backgroundTimers.clearInterval(state.countdownHandle);
    state.countdownHandle = 0;
  }
}

function startTimer() {
  clearTimer();

  if (state.multiplayerSession?.competitive) {
    startCompetitiveDeadlineTimer();
    return;
  }

  if (state.multiplayerSession && state.multiplayerRoundStartedAtMs > 0) {
    startMultiplayerRoundClockTimer();
    return;
  }

  if (state.challengeRevealMs > 0 || getRoundSeconds() <= 0) {
    state.challengeElapsedSeconds = 0;
    state.challengeTimerStartedAt = performance.now();
    updateTimerLabel();
    state.timerHandle = backgroundTimers.setInterval(() => {
      state.challengeElapsedSeconds = Math.floor((performance.now() - state.challengeTimerStartedAt) / 1000);
      updateTimerLabel();
    }, 200);
    return;
  }

  state.timerHandle = backgroundTimers.setInterval(() => {
    state.timeLeft -= 1;
    updateTimerLabel();

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateTimerLabel();
      if (state.multiplayerSession) {
        lockMultiplayerGuess("timeout");
      } else {
        revealRound("timeout");
      }
    }
  }, 1000);
}

function applyMultiplayerRoundClock(startsAtMs, endsAtMs) {
  if (!Number.isFinite(startsAtMs) || startsAtMs <= 0) return;
  if (
    state.multiplayerRoundStartedAtMs === startsAtMs
    && state.multiplayerRoundEndsAtMs === endsAtMs
    && (state.timerHandle || state.countdownHandle)
  ) return;

  state.multiplayerRoundStartedAtMs = startsAtMs;
  state.multiplayerRoundEndsAtMs = Number.isFinite(endsAtMs) ? endsAtMs : 0;
  clearTimer();

  if (dom.gameScreen.classList.contains("is-counting-down")) {
    startSynchronizedMultiplayerCountdown();
    return;
  }

  if (!state.multiplayerSession?.competitive) startMultiplayerRoundClockTimer();
}

function startSynchronizedMultiplayerCountdown() {
  clearCountdown();
  let displayedValue = 0;

  const tick = () => {
    const remainingMs = state.multiplayerRoundStartedAtMs - Date.now();
    const countdownWindowMs = ROUND_COUNTDOWN_SECONDS * 1000;

    if (remainingMs > countdownWindowMs) {
      showMultiplayerWaitingState();
      return;
    }

    if (remainingMs <= 0) {
      clearCountdown();
      hide(dom.clueOverlay);
      dom.gameScreen.classList.remove("is-counting-down");
      startPlayableRound();
      return;
    }

    const nextValue = clamp(Math.ceil(remainingMs / 1000), 1, ROUND_COUNTDOWN_SECONDS);
    show(dom.clueOverlay);
    if (nextValue !== displayedValue) {
      displayedValue = nextValue;
      showCountdownValue(nextValue);
    }
  };

  tick();
  if (state.multiplayerRoundStartedAtMs > Date.now()) {
    state.countdownHandle = backgroundTimers.setInterval(tick, 50);
  }
}

function startMultiplayerRoundClockTimer() {
  clearTimer();

  const tick = () => {
    const now = Date.now();
    updateTimerLabel();

    if (now < state.multiplayerRoundStartedAtMs) {
      state.roundInputLocked = true;
      state.mapNavigationLocked = true;
      dom.guessButton.disabled = true;
      return;
    }

    if (!state.multiplayerLockReason && !state.revealed) {
      state.roundInputLocked = false;
      state.mapNavigationLocked = false;
      dom.guessButton.disabled = !state.pendingGuess;
      dom.statusLine.textContent = "Click to place a marker. Zoom in, then hold and drag to move the map.";
    }

    if (state.multiplayerRoundEndsAtMs <= 0 || now < state.multiplayerRoundEndsAtMs) return;
    state.timeLeft = 0;
    clearTimer();
    if (!state.roundInputLocked) lockMultiplayerGuess("timeout");
  };

  tick();
  if (!state.revealed && (Date.now() < state.multiplayerRoundStartedAtMs || state.multiplayerRoundEndsAtMs <= 0 || Date.now() < state.multiplayerRoundEndsAtMs)) {
    state.timerHandle = backgroundTimers.setInterval(tick, 100);
  }
}

function applyCompetitiveDeadline(endsAtMs) {
  if (!state.multiplayerSession?.competitive || !Number.isFinite(endsAtMs) || endsAtMs <= 0) return;
  // The deadline is re-asserted on a tick so a client that missed the original dispatch still
  // gets it, which means an unchanged value with a live timer must not restart anything.
  if (state.competitiveDeadlineMs === endsAtMs && state.timerHandle) return;
  state.competitiveDeadlineMs = endsAtMs;
  if (!state.revealed) startCompetitiveDeadlineTimer();
}

function startCompetitiveDeadlineTimer() {
  clearTimer();
  updateTimerLabel();
  if (!state.competitiveDeadlineMs || state.revealed) return;

  const tick = () => {
    updateTimerLabel();
    if (Date.now() < state.competitiveDeadlineMs) return;
    state.timeLeft = 0;
    clearTimer();
    if (!state.roundInputLocked) lockMultiplayerGuess("timeout");
  };
  tick();
  if (!state.revealed && Date.now() < state.competitiveDeadlineMs) {
    state.timerHandle = backgroundTimers.setInterval(tick, 200);
  }
}

function showMultiplayerGuessNotice(message, team) {
  if (!dom.multiplayerGuessNotice || !message) return;
  window.clearTimeout(state.multiplayerNoticeHandle);
  dom.multiplayerGuessNotice.textContent = String(message);
  dom.multiplayerGuessNotice.classList.remove("hidden", "is-active", "is-red", "is-blue");
  dom.multiplayerGuessNotice.classList.add(team === "blue" ? "is-blue" : "is-red");
  void dom.multiplayerGuessNotice.offsetWidth;
  dom.multiplayerGuessNotice.classList.add("is-active");
  state.multiplayerNoticeHandle = window.setTimeout(() => {
    dom.multiplayerGuessNotice.classList.remove("is-active");
    dom.multiplayerGuessNotice.classList.add("hidden");
    state.multiplayerNoticeHandle = 0;
  }, 2200);
}

function clearMultiplayerGuessNotice() {
  window.clearTimeout(state.multiplayerNoticeHandle);
  state.multiplayerNoticeHandle = 0;
  dom.multiplayerGuessNotice?.classList.remove("is-active", "is-red", "is-blue");
  dom.multiplayerGuessNotice?.classList.add("hidden");
}

function clearTimer() {
  if (state.timerHandle) {
    backgroundTimers.clearInterval(state.timerHandle);
    state.timerHandle = 0;
  }

  if (state.challengeTimerStartedAt > 0) {
    state.challengeElapsedSeconds = Math.floor((performance.now() - state.challengeTimerStartedAt) / 1000);
    state.challengeTimerStartedAt = 0;
    updateTimerLabel();
  }
}

function updateTimerLabel() {
  dom.timerLabel.classList.remove("is-guess-first", "is-competitive-timer");
  if (state.multiplayerSession?.competitive) {
    dom.timerLabel.classList.add("is-competitive-timer");
    if (!state.competitiveDeadlineMs) {
      dom.timerLabel.textContent = "Guess first!";
      dom.timerLabel.classList.add("is-guess-first");
      return;
    }
    const remaining = Math.max(0, Math.ceil((state.competitiveDeadlineMs - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = String(remaining % 60).padStart(2, "0");
    dom.timerLabel.textContent = `${minutes}:${seconds}`;
    return;
  }

  if (state.multiplayerSession && state.multiplayerRoundStartedAtMs > 0) {
    if (state.multiplayerRoundEndsAtMs > 0) {
      const remaining = Math.max(0, Math.ceil((state.multiplayerRoundEndsAtMs - Math.max(Date.now(), state.multiplayerRoundStartedAtMs)) / 1000));
      state.timeLeft = remaining;
      const minutes = Math.floor(remaining / 60);
      const seconds = String(remaining % 60).padStart(2, "0");
      dom.timerLabel.textContent = `${minutes}:${seconds}`;
    } else {
      const elapsed = Math.max(0, Math.floor((Date.now() - state.multiplayerRoundStartedAtMs) / 1000));
      dom.timerLabel.textContent = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
    }
    return;
  }

  if (state.challengeRevealMs > 0 || getRoundSeconds() <= 0) {
    const elapsed = Math.max(0, state.challengeElapsedSeconds);
    const elapsedMinutes = Math.floor(elapsed / 60);
    const elapsedSeconds = String(elapsed % 60).padStart(2, "0");
    dom.timerLabel.textContent = `${elapsedMinutes}:${elapsedSeconds}`;
    return;
  }

  const safeTime = Math.max(0, state.timeLeft);
  const minutes = Math.floor(safeTime / 60);
  const seconds = String(safeTime % 60).padStart(2, "0");
  dom.timerLabel.textContent = `${minutes}:${seconds}`;
}

function getRoundSeconds() {
  if (state.multiplayerSession?.competitive) return 0;
  return state.challengeRevealMs > 0 ? 0 : state.selectedSeconds;
}

function getTotalRounds() {
  return state.rounds.length || state.selectedRounds;
}

function getCurrentTile() {
  if (state.multiplayerSession?.competitive && state.rounds.length) {
    return state.rounds[state.roundIndex % state.rounds.length];
  }
  return state.rounds[state.roundIndex];
}

function scoreForDistance(distance) {
  if (distance <= 0) {
    return MAX_ROUND_SCORE;
  }

  const closeness = clamp(1 - distance / MAX_SCORING_DISTANCE_PIXELS, 0, 1);
  return Math.round(closeness * 3200);
}

function distanceToTileBounds(point, tile) {
  const bounds = tile.bounds;

  if (!bounds) {
    return Math.hypot(point.mapX - tile.mapX, point.mapY - tile.mapY);
  }

  const dx = point.mapX < bounds.left ? bounds.left - point.mapX : Math.max(point.mapX - bounds.right, 0);
  const dy = point.mapY < bounds.top ? bounds.top - point.mapY : Math.max(point.mapY - bounds.bottom, 0);

  return Math.hypot(dx, dy);
}

function positionMarker(marker, x, y) {
  marker.dataset.mapPointX = String(x);
  marker.dataset.mapPointY = String(y);
  updateMarkerVisualPosition(marker);
  show(marker);
}

function renderMultiplayerMarkers(markers) {
  const visibleIds = new Set();
  for (const markerData of markers) {
    if (markerData.isOwn || !Number.isFinite(Number(markerData.x)) || !Number.isFinite(Number(markerData.y))) continue;
    const id = String(markerData.uid || "");
    if (!id) continue;
    visibleIds.add(id);
    let marker = dom.markerLayer.querySelector(`.multiplayer-map-marker[data-player-id="${CSS.escape(id)}"]`);
    if (!marker) {
      marker = document.createElement("span");
      marker.className = "map-marker multiplayer-map-marker";
      marker.dataset.playerId = id;
      const label = document.createElement("i");
      label.className = "multiplayer-map-marker-label";
      marker.appendChild(label);
      dom.markerLayer.appendChild(marker);
    }
    marker.classList.toggle("is-red", markerData.team === "red");
    marker.classList.toggle("is-blue", markerData.team === "blue");
    marker.classList.toggle("is-locked", Boolean(markerData.locked));
    const name = markerData.name || "Player";
    marker.setAttribute("aria-label", `${name} (${markerData.team === "blue" ? "Blue" : "Red"} team) marker`);
    marker.querySelector(".multiplayer-map-marker-label").textContent = name;
    positionMarker(marker, Number(markerData.x), Number(markerData.y));
  }
  dom.markerLayer.querySelectorAll(".multiplayer-map-marker").forEach((marker) => {
    if (!visibleIds.has(marker.dataset.playerId || "")) marker.remove();
  });
}

function renderSpectatorViews(players, ownMarkerData) {
  if (!dom.spectatorPanel || !dom.spectatorGrid) return;
  if (state.revealed) {
    clearSpectatorViews();
    return;
  }
  const mapSource = dom.mapImage.currentSrc || dom.mapImage.src || dom.mapImage.dataset.src || "";
  const visibleIds = new Set();

  if (players.length > 0) dom.spectatorPanel.classList.remove("hidden");
  dom.mapShell.classList.toggle("is-spectating", players.length > 0);

  players.forEach((player) => {
    const playerId = String(player.uid || "");
    if (!playerId) return;
    visibleIds.add(playerId);
    const zoom = clamp(Number(player.zoom) || 1, 1, MAX_MAP_ZOOM);
    const panX = clamp(Number(player.panX) || 0, 1 - zoom, 0);
    const panY = clamp(Number(player.panY) || 0, 1 - zoom, 0);
    let card = Array.from(dom.spectatorGrid.children).find((entry) => entry.dataset.playerId === playerId);
    if (!card) {
      card = document.createElement("article");
      card.dataset.playerId = playerId;
      const label = document.createElement("span");
      const viewport = document.createElement("div");
      viewport.className = "spectator-viewport";
      const image = document.createElement("img");
      image.alt = "";
      image.draggable = false;
      viewport.appendChild(image);
      card.append(label, viewport);
      dom.spectatorGrid.appendChild(card);
    }
    card.className = `spectator-card is-${player.team === "blue" ? "blue" : "red"}`;
    const label = card.querySelector(":scope > span");
    label.textContent = `Spectating ${player.name || "Player"}`;
    const viewport = card.querySelector(".spectator-viewport");
    const image = viewport.querySelector("img");
    if (image.src !== mapSource) image.src = mapSource;
    image.style.setProperty("--spectator-zoom", String(zoom));
    image.style.setProperty("--spectator-pan-x", `${panX * 100}%`);
    image.style.setProperty("--spectator-pan-y", `${panY * 100}%`);

    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;

    if (player.x != null && player.y != null && Number.isFinite(Number(player.x)) && Number.isFinite(Number(player.y))) {
      const visualPoint = getVisualMapPoint(Number(player.x), Number(player.y));
      let marker = viewport.querySelector(".spectator-marker");
      if (!marker) {
        marker = document.createElement("i");
        marker.className = "spectator-marker";
        const markerLabel = document.createElement("b");
        markerLabel.className = "spectator-marker-label";
        marker.appendChild(markerLabel);
        viewport.appendChild(marker);
      }
      marker.querySelector(".spectator-marker-label").textContent = player.name || "Player";
      marker.style.setProperty("--marker-x", `${(panX + visualPoint.x * zoom) * viewportWidth}px`);
      marker.style.setProperty("--marker-y", `${(panY + visualPoint.y * zoom) * viewportHeight}px`);
    } else {
      viewport.querySelector(".spectator-marker")?.remove();
    }

    if (
      ownMarkerData?.x != null
      && ownMarkerData?.y != null
      && Number.isFinite(Number(ownMarkerData.x))
      && Number.isFinite(Number(ownMarkerData.y))
    ) {
      const ownVisualPoint = getVisualMapPoint(Number(ownMarkerData.x), Number(ownMarkerData.y));
      let ownMarker = viewport.querySelector(".spectator-own-marker");
      if (!ownMarker) {
        ownMarker = document.createElement("i");
        viewport.appendChild(ownMarker);
      }
      ownMarker.className = `spectator-own-marker is-${ownMarkerData.team === "blue" ? "blue" : "red"}`;
      ownMarker.style.setProperty("--marker-x", `${(panX + ownVisualPoint.x * zoom) * viewportWidth}px`);
      ownMarker.style.setProperty("--marker-y", `${(panY + ownVisualPoint.y * zoom) * viewportHeight}px`);
    } else {
      viewport.querySelector(".spectator-own-marker")?.remove();
    }

    dom.spectatorGrid.appendChild(card);
  });

  Array.from(dom.spectatorGrid.children).forEach((card) => {
    if (!visibleIds.has(card.dataset.playerId || "")) card.remove();
  });

  dom.spectatorPanel.dataset.playerCount = String(players.length);
  dom.spectatorPanel.classList.toggle("hidden", players.length === 0);
  dom.mapShell.classList.toggle("is-spectating", players.length > 0);
}

function clearSpectatorViews() {
  if (dom.spectatorGrid) dom.spectatorGrid.innerHTML = "";
  if (dom.spectatorPanel) {
    dom.spectatorPanel.classList.add("hidden");
    dom.spectatorPanel.removeAttribute("data-player-count");
  }
  dom.mapShell?.classList.remove("is-spectating");
}

function clearMultiplayerMarkers() {
  dom.markerLayer.querySelectorAll(".multiplayer-map-marker").forEach((marker) => marker.remove());
}

function queueCompetitiveDamage(detail = {}) {
  const damageRound = Number(detail.roundIndex);
  if (
    !state.multiplayerSession?.competitive
    || !Number.isInteger(damageRound)
    || damageRound === state.multiplayerDamageRound
    || Number(detail.damage) <= 0
    || (detail.damagedTeam !== "red" && detail.damagedTeam !== "blue")
  ) return false;
  state.pendingDamagePresentation = { ...detail };
  return true;
}

function updateTeamMultiplierLabels(detail = {}) {
  const redMultiplier = Math.max(1, Number(detail.redMultiplier ?? detail.multiplier ?? 1));
  const blueMultiplier = Math.max(1, Number(detail.blueMultiplier ?? detail.multiplier ?? 1));
  dom.redDamageMultiplier.textContent = `${Number.isInteger(redMultiplier) ? redMultiplier : redMultiplier.toFixed(1)}×`;
  dom.blueDamageMultiplier.textContent = `${Number.isInteger(blueMultiplier) ? blueMultiplier : blueMultiplier.toFixed(1)}×`;
}

function getMaxTeamHealth() {
  return Math.max(1, Number(state.multiplayerSession?.maxHealth) || DEFAULT_TEAM_HEALTH);
}

function updateTeamHealth(detail = {}) {
  const maxHealth = getMaxTeamHealth();
  const redHealth = Math.max(0, Math.min(maxHealth, Number(detail.redHealth ?? maxHealth)));
  const blueHealth = Math.max(0, Math.min(maxHealth, Number(detail.blueHealth ?? maxHealth)));
  state.displayedRedHealth = redHealth;
  state.displayedBlueHealth = blueHealth;
  dom.redHealthValue.textContent = formatNumber(redHealth);
  dom.blueHealthValue.textContent = formatNumber(blueHealth);
  dom.redHealthBar.style.width = `${(redHealth / maxHealth) * 100}%`;
  dom.blueHealthBar.style.width = `${(blueHealth / maxHealth) * 100}%`;
  updateTeamMultiplierLabels(detail);
  const damageRound = Number(detail.roundIndex);
  if (Number.isInteger(damageRound) && damageRound !== state.multiplayerDamageRound && Number(detail.damage) > 0) {
    state.multiplayerDamageRound = damageRound;
    dom.teamHealthHud.classList.remove("is-red-hit", "is-blue-hit");
    void dom.teamHealthHud.offsetWidth;
    dom.teamHealthHud.classList.toggle("is-red-hit", detail.damagedTeam === "red");
    dom.teamHealthHud.classList.toggle("is-blue-hit", detail.damagedTeam === "blue");
  }
}

// Waits until an absolute wall-clock deadline. A client that is already past it continues
// immediately, which is what lets a lagging client rejoin the shared schedule.
function waitForDamagePhase(targetMs, token) {
  return waitForDamageSequence(Math.max(0, targetMs - Date.now()), token);
}

function waitForDamageSequence(durationMs, token) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(token === state.damageSequenceToken), durationMs);
  });
}

function animateDamageNumber(fromValue, toValue, durationMs, token) {
  return new Promise((resolve) => {
    // requestAnimationFrame never fires while the tab is hidden, which would leave the
    // damage sequence awaiting forever and stall this client on a finished round. Nobody is
    // watching the tween anyway, so settle on the final value and keep the match moving.
    if (document.hidden) {
      dom.competitiveDamageScore.textContent = formatNumber(toValue);
      resolve(token === state.damageSequenceToken);
      return;
    }
    const startedAt = performance.now();
    const tick = (timestamp) => {
      if (token !== state.damageSequenceToken) {
        state.damageSequenceFrame = 0;
        resolve(false);
        return;
      }
      const progress = clamp((timestamp - startedAt) / durationMs, 0, 1);
      const eased = 1 - ((1 - progress) ** 3);
      dom.competitiveDamageScore.textContent = formatNumber(Math.round(fromValue + (toValue - fromValue) * eased));
      if (progress < 1) {
        state.damageSequenceFrame = window.requestAnimationFrame(tick);
        return;
      }
      state.damageSequenceFrame = 0;
      resolve(true);
    };
    state.damageSequenceFrame = window.requestAnimationFrame(tick);
  });
}

function animateDamagedHealth(detail, token) {
  return new Promise((resolve) => {
    const maxHealth = getMaxTeamHealth();
    const damagedTeam = detail.damagedTeam === "blue" ? "blue" : "red";
    const startHealth = damagedTeam === "red" ? state.displayedRedHealth : state.displayedBlueHealth;
    const targetHealth = Math.max(0, Math.min(maxHealth, Number(
      damagedTeam === "red" ? detail.redHealth : detail.blueHealth,
    )));
    const valueElement = damagedTeam === "red" ? dom.redHealthValue : dom.blueHealthValue;
    const barElement = damagedTeam === "red" ? dom.redHealthBar : dom.blueHealthBar;
    const startedAt = performance.now();
    const durationMs = 720;

    updateTeamMultiplierLabels(detail);
    dom.teamHealthHud.classList.remove("is-red-hit", "is-blue-hit");
    void dom.teamHealthHud.offsetWidth;
    dom.teamHealthHud.classList.add(`is-${damagedTeam}-hit`);
    barElement.style.width = `${(targetHealth / maxHealth) * 100}%`;

    const tick = (timestamp) => {
      if (token !== state.damageSequenceToken) {
        state.damageSequenceFrame = 0;
        resolve(false);
        return;
      }
      const progress = clamp((timestamp - startedAt) / durationMs, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      valueElement.textContent = formatNumber(Math.round(startHealth + (targetHealth - startHealth) * eased));
      if (progress < 1) {
        state.damageSequenceFrame = window.requestAnimationFrame(tick);
        return;
      }
      state.damageSequenceFrame = 0;
      settleDamagedHealth(detail);
      resolve(true);
    };
    // A hidden tab gets no animation frames, so apply the authoritative health immediately
    // rather than leaving the sequence (and this client's next round) blocked on a tween.
    if (document.hidden) {
      settleDamagedHealth(detail);
      resolve(token === state.damageSequenceToken);
      return;
    }
    state.damageSequenceFrame = window.requestAnimationFrame(tick);
  });
}

function settleDamagedHealth(detail) {
  const maxHealth = getMaxTeamHealth();
  state.displayedRedHealth = Math.max(0, Math.min(maxHealth, Number(detail.redHealth ?? state.displayedRedHealth)));
  state.displayedBlueHealth = Math.max(0, Math.min(maxHealth, Number(detail.blueHealth ?? state.displayedBlueHealth)));
  dom.redHealthValue.textContent = formatNumber(state.displayedRedHealth);
  dom.blueHealthValue.textContent = formatNumber(state.displayedBlueHealth);
  dom.redHealthBar.style.width = `${(state.displayedRedHealth / maxHealth) * 100}%`;
  dom.blueHealthBar.style.width = `${(state.displayedBlueHealth / maxHealth) * 100}%`;
  state.multiplayerDamageRound = Number(detail.roundIndex);
}

async function playCompetitiveDamageSequence(detail, startFollowingRound) {
  if (!dom.competitiveDamageSequence || !dom.competitiveDamageScore || !dom.competitiveDamageMultiplier) return;
  const token = ++state.damageSequenceToken;
  if (state.damageSequenceFrame) window.cancelAnimationFrame(state.damageSequenceFrame);
  state.damageSequenceFrame = 0;
  const multiplier = Math.max(1, Number(detail.multiplier) || 1);
  const finalDamage = Math.max(0, Math.round(Number(detail.damage) || 0));
  const baseDamage = Math.max(0, Math.round(finalDamage / multiplier));
  const damagedHealth = detail.damagedTeam === "blue"
    ? dom.teamHealthHud.querySelector(".team-health--blue > i")
    : dom.teamHealthHud.querySelector(".team-health--red > i");

  // Every beat is pinned to an absolute, server-derived time rather than chained relative
  // sleeps, so a hitch on one client makes it catch up to the shared schedule instead of
  // pushing every later beat back and drifting further out of sync with everyone else.
  const syncStart = Number(detail.damageSequenceStartsAtMs) || Date.now();
  const phaseAt = (offsetMs) => syncStart + offsetMs;

  if (!(await waitForDamagePhase(phaseAt(0), token))) return;

  dom.nextButton.disabled = true;
  dom.competitiveDamageSequence.className = `competitive-damage-sequence is-${detail.damagedTeam}`;
  dom.competitiveDamageSequence.style.removeProperty("--damage-target-x");
  dom.competitiveDamageSequence.style.removeProperty("--damage-target-y");
  dom.competitiveDamageSequence.setAttribute("aria-hidden", "false");
  dom.competitiveDamageScore.textContent = formatNumber(baseDamage);
  dom.competitiveDamageMultiplier.textContent = `×${Number.isInteger(multiplier) ? multiplier : multiplier.toFixed(1)}`;
  void dom.competitiveDamageSequence.offsetWidth;
  dom.competitiveDamageSequence.classList.add("is-counting");

  if (!(await animateDamageNumber(baseDamage, finalDamage, 760, token))) return;
  if (!(await waitForDamagePhase(phaseAt(1080), token))) return;
  dom.competitiveDamageSequence.classList.add("is-multiplier-hidden");
  if (!(await waitForDamagePhase(phaseAt(1340), token))) return;

  if (damagedHealth) {
    const targetRect = damagedHealth.getBoundingClientRect();
    dom.competitiveDamageSequence.style.setProperty("--damage-target-x", `${targetRect.left + targetRect.width / 2 - window.innerWidth / 2}px`);
    dom.competitiveDamageSequence.style.setProperty("--damage-target-y", `${targetRect.top + targetRect.height / 2 - window.innerHeight / 2}px`);
  }
  dom.competitiveDamageSequence.classList.add("is-flying");
  if (!(await waitForDamagePhase(phaseAt(2020), token))) return;
  if (!(await animateDamagedHealth(detail, token))) return;
  if (!(await waitForDamagePhase(phaseAt(2860), token))) return;

  dom.competitiveDamageSequence.classList.add("hidden");
  dom.competitiveDamageSequence.setAttribute("aria-hidden", "true");
  state.pendingDamagePresentation = null;
  dom.nextButton.disabled = false;
  if (startFollowingRound) startNextRoundCountdown();
}

function clearCompetitiveDamageSequence() {
  state.damageSequenceToken += 1;
  if (state.damageSequenceFrame) window.cancelAnimationFrame(state.damageSequenceFrame);
  state.damageSequenceFrame = 0;
  if (!dom.competitiveDamageSequence) return;
  dom.competitiveDamageSequence.className = "competitive-damage-sequence hidden";
  dom.competitiveDamageSequence.setAttribute("aria-hidden", "true");
  dom.competitiveDamageSequence.style.removeProperty("--damage-target-x");
  dom.competitiveDamageSequence.style.removeProperty("--damage-target-y");
}

function getRenderedMapPan() {
  return {
    x: getFiniteNumber(state.mapPanX, 0),
    y: getFiniteNumber(state.mapPanY, 0),
  };
}

function updateMarkerVisualPosition(marker, mapWidth = dom.mapShell.clientWidth, mapHeight = dom.mapShell.clientHeight) {
  const x = Number(marker.dataset.mapPointX);
  const y = Number(marker.dataset.mapPointY);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }

  const visualPoint = getVisualMapPoint(x, y);
  const pan = getRenderedMapPan();
  // Apply zoom before rendering, avoiding magnified percentage-layout rounding.
  const screenX = pan.x + visualPoint.x * mapWidth * state.mapZoom;
  const screenY = pan.y + visualPoint.y * mapHeight * state.mapZoom;
  marker.style.setProperty("--marker-x", `${screenX}px`);
  marker.style.setProperty("--marker-y", `${screenY}px`);
}

function updateMarkerVisualPositions(mapWidth = dom.mapShell.clientWidth, mapHeight = dom.mapShell.clientHeight) {
  updateMarkerVisualPosition(dom.guessMarker, mapWidth, mapHeight);
  updateMarkerVisualPosition(dom.answerMarker, mapWidth, mapHeight);
  dom.markerLayer.querySelectorAll(".multiplayer-map-marker").forEach((marker) => {
    updateMarkerVisualPosition(marker, mapWidth, mapHeight);
  });
}

function loadMapImageOffset() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(MAP_ALIGNMENT_STORAGE_KEY) || "{}");
    state.mapImageOffsetX = getFiniteNumber(saved.imageOffsetX, DEFAULT_MAP_IMAGE_OFFSET_X);
    state.mapImageOffsetY = getFiniteNumber(saved.imageOffsetY, DEFAULT_MAP_IMAGE_OFFSET_Y);
    state.mapImageWidth = Math.max(1, getFiniteNumber(saved.imageWidth, DEFAULT_MAP_IMAGE_WIDTH));
    state.mapImageHeight = Math.max(1, getFiniteNumber(saved.imageHeight, DEFAULT_MAP_IMAGE_HEIGHT));
    state.mapImageOffsetStep = Math.max(0.01, getFiniteNumber(saved.step, DEFAULT_MAP_ALIGNMENT_STEP));
  } catch (error) {
    state.mapImageOffsetX = DEFAULT_MAP_IMAGE_OFFSET_X;
    state.mapImageOffsetY = DEFAULT_MAP_IMAGE_OFFSET_Y;
    state.mapImageWidth = DEFAULT_MAP_IMAGE_WIDTH;
    state.mapImageHeight = DEFAULT_MAP_IMAGE_HEIGHT;
    state.mapImageOffsetStep = DEFAULT_MAP_ALIGNMENT_STEP;
  }
}

function saveMapImageOffset() {
  window.localStorage.setItem(
    MAP_ALIGNMENT_STORAGE_KEY,
    JSON.stringify({
      imageOffsetX: state.mapImageOffsetX,
      imageOffsetY: state.mapImageOffsetY,
      imageWidth: state.mapImageWidth,
      imageHeight: state.mapImageHeight,
      step: state.mapImageOffsetStep,
    }),
  );
}

function loadCareerStats() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CAREER_STATS_STORAGE_KEY) || "{}");
    state.careerStats = normalizeCareerStats(saved);
  } catch (error) {
    state.careerStats = { ...DEFAULT_CAREER_STATS };
  }
}

function saveCareerStats() {
  window.localStorage.setItem(CAREER_STATS_STORAGE_KEY, JSON.stringify(state.careerStats));
}

function loadCareerHistory() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CAREER_HISTORY_STORAGE_KEY) || "[]");
    state.careerHistory = normalizeCareerHistory(saved);
  } catch (error) {
    state.careerHistory = [];
  }
}

function saveCareerHistory() {
  window.localStorage.setItem(CAREER_HISTORY_STORAGE_KEY, JSON.stringify(state.careerHistory));
}

function loadCareerStatus() {
  const savedStatus = window.localStorage.getItem(CAREER_STATUS_STORAGE_KEY);
  const status = savedStatus !== null ? savedStatus.slice(0, getCareerStatusMaxLength()) : "";

  if (dom.careerStatusInput) {
    dom.careerStatusInput.value = status;
  }

  updateCareerStatusUI(status);
}

function saveCareerStatus() {
  if (!dom.careerStatusInput) {
    return;
  }

  const status = dom.careerStatusInput.value.slice(0, getCareerStatusMaxLength());

  if (dom.careerStatusInput.value !== status) {
    dom.careerStatusInput.value = status;
  }

  window.localStorage.setItem(CAREER_STATUS_STORAGE_KEY, status);
  updateCareerStatusUI(status);
}

function updateCareerStatusUI(statusValue = "") {
  const maxLength = getCareerStatusMaxLength();
  const status = String(statusValue || "").slice(0, maxLength);
  const displayStatus = status.trim() || "No status set";

  setText(dom.careerStatusValue, displayStatus);
  setText(dom.profilePreviewStatus, displayStatus);

  if (dom.profileStatusCount) {
    dom.profileStatusCount.textContent = `${status.length}/${maxLength}`;
  }
}

function getCareerStatusMaxLength() {
  return dom.careerStatusInput && dom.careerStatusInput.maxLength > 0
    ? dom.careerStatusInput.maxLength
    : 42;
}

function updateCareerStatsUI() {
  const stats = state.careerStats;
  const level = Math.floor(stats.totalScore / CAREER_XP_PER_LEVEL) + 1;
  const averageScore = stats.matchesPlayed ? stats.totalScore / stats.matchesPlayed : 0;
  const levelProgress = stats.totalScore % CAREER_XP_PER_LEVEL;
  const levelProgressPercent = (levelProgress / CAREER_XP_PER_LEVEL) * 100;
  const coopAverageScore = stats.coopMatches ? stats.coopTotalScore / stats.coopMatches : 0;

  if (dom.careerAccountCreatedValue) {
    dom.careerAccountCreatedValue.textContent = getCareerAccountCreatedYear();
  }

  dom.careerLevelValue.textContent = formatNumber(level);
  dom.careerLevelProgressBar.style.width = `${levelProgressPercent}%`;
  dom.careerLevelProgressValue.textContent = `${formatNumber(levelProgress)} / ${formatNumber(CAREER_XP_PER_LEVEL)} XP`;
  dom.careerMatchesValue.textContent = formatNumber(stats.matchesPlayed);
  dom.careerStreakValue.textContent = formatNumber(stats.streak);
  dom.careerHighStreakValue.textContent = formatNumber(stats.highestStreak);
  dom.careerPerfectsValue.textContent = formatNumber(stats.perfects);
  dom.careerAvgScoreValue.textContent = formatNumber(averageScore);
  dom.careerHighestMatchScoreValue.textContent = formatNumber(stats.bestMatchScore);
  dom.careerTotalGuessesValue.textContent = formatNumber(stats.totalGuesses);
  dom.careerTotalScoreValue.textContent = formatNumber(stats.totalScore);
  dom.careerCoopMatchesValue.textContent = formatNumber(stats.coopMatches);
  dom.careerCoopStreakValue.textContent = formatNumber(stats.coopStreak);
  dom.careerCoopHighStreakValue.textContent = formatNumber(stats.coopHighestStreak);
  dom.careerCoopPerfectsValue.textContent = formatNumber(stats.coopPerfects);
  dom.careerCoopAvgScoreValue.textContent = formatNumber(coopAverageScore);
  dom.careerCoopHighestMatchScoreValue.textContent = formatNumber(stats.coopBestMatchScore);
  dom.careerCoopTotalGuessesValue.textContent = formatNumber(stats.coopTotalGuesses);
  dom.careerCoopTotalScoreValue.textContent = formatNumber(stats.coopTotalScore);
  dom.careerMostPlayedWithValue.textContent = stats.mostPlayedWith;
  dom.leaderboardEloValue.textContent = "0 Elo";
  dom.leaderboardLevelValue.textContent = formatNumber(level);
  dom.leaderboardPerfectsValue.textContent = formatNumber(stats.perfects);
  dom.leaderboardAvgSpeedValue.textContent = "0s";
  setText(dom.careerAchievementFirstGuess, stats.totalGuesses > 0 ? "Unlocked" : "Locked");
  setText(dom.careerAchievementPerfectFinder, stats.perfects > 0 ? "Unlocked" : "Locked");
  setText(dom.careerAchievementScoreChaser, stats.bestMatchScore >= MAX_ROUND_SCORE ? "Unlocked" : "Locked");
}

function getCareerAccountCreatedYear() {
  const savedYear = window.localStorage.getItem(CAREER_ACCOUNT_CREATED_STORAGE_KEY);

  if (/^\d{4}$/.test(savedYear || "")) {
    return savedYear;
  }

  const createdYear = String(new Date().getFullYear());
  window.localStorage.setItem(CAREER_ACCOUNT_CREATED_STORAGE_KEY, createdYear);
  return createdYear;
}

function loadCalibrationSamples() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CALIBRATION_SAMPLES_STORAGE_KEY) || "[]");
    state.calibrationSamples = Array.isArray(saved)
      ? saved.map(normalizeCalibrationSample).filter(Boolean)
      : [];
  } catch (error) {
    state.calibrationSamples = [];
  }
}

function saveCalibrationSamples() {
  window.localStorage.setItem(
    CALIBRATION_SAMPLES_STORAGE_KEY,
    JSON.stringify(state.calibrationSamples),
  );
}

function syncMapImageOffsetFromInputs() {
  setMapImageBounds(
    getFiniteNumber(dom.imageOffsetXInput.value, state.mapImageOffsetX),
    getFiniteNumber(dom.imageOffsetYInput.value, state.mapImageOffsetY),
    getFiniteNumber(dom.imageWidthInput.value, state.mapImageWidth),
    getFiniteNumber(dom.imageHeightInput.value, state.mapImageHeight),
  );
}

function syncMapImageOffsetStepFromInput() {
  state.mapImageOffsetStep = Math.max(
    0.01,
    getFiniteNumber(dom.imageOffsetStepInput.value, DEFAULT_MAP_ALIGNMENT_STEP),
  );
  saveMapImageOffset();
  updateMapCalibrationControls();
}

function nudgeMapImageOffset(directionX, directionY) {
  setMapImageBounds(
    state.mapImageOffsetX + directionX * state.mapImageOffsetStep,
    state.mapImageOffsetY + directionY * state.mapImageOffsetStep,
    state.mapImageWidth,
    state.mapImageHeight,
  );
}

function nudgeMapImageSize(directionWidth, directionHeight) {
  setMapImageBounds(
    state.mapImageOffsetX,
    state.mapImageOffsetY,
    state.mapImageWidth + directionWidth * state.mapImageOffsetStep,
    state.mapImageHeight + directionHeight * state.mapImageOffsetStep,
  );
}

function resetMapImageOffset() {
  setCalibrationCapture(false);
  setMapImageBounds(
    DEFAULT_MAP_IMAGE_OFFSET_X,
    DEFAULT_MAP_IMAGE_OFFSET_Y,
    DEFAULT_MAP_IMAGE_WIDTH,
    DEFAULT_MAP_IMAGE_HEIGHT,
  );
}

function startCalibrationPick() {
  const tile = getCurrentTile();

  if (!state.revealed || !tile) {
    flashCalibrationStatus("Reveal a round first");
    return;
  }

  setCalibrationCapture(!state.calibrationCapture);
  flashCalibrationStatus(state.calibrationCapture ? `Pick ${tile.label}` : "Pick cancelled");
}

function addCalibrationSampleAtClient(clientX, clientY) {
  const tile = getCurrentTile();
  const visualPoint = getVisualPointFromClient(clientX, clientY);

  if (!state.revealed || !tile || !visualPoint) {
    setCalibrationCapture(false);
    flashCalibrationStatus("No revealed answer");
    return;
  }

  state.calibrationSamples = state.calibrationSamples.filter((sample) => sample.tileId !== tile.id);
  state.calibrationSamples.push({
    tileId: tile.id,
    mapX: tile.mapX,
    mapY: tile.mapY,
    visualX: visualPoint.x,
    visualY: visualPoint.y,
  });

  setCalibrationCapture(false);
  saveCalibrationSamples();
  applyCalibrationSamples();
  flashCalibrationStatus("Anchor saved");
}

function undoCalibrationSample() {
  if (!state.calibrationSamples.length) {
    flashCalibrationStatus("No anchors");
    return;
  }

  state.calibrationSamples.pop();
  saveCalibrationSamples();

  if (state.calibrationSamples.length) {
    applyCalibrationSamples();
  }

  updateMapCalibrationControls();
  flashCalibrationStatus("Anchor removed");
}

function clearCalibrationSamples() {
  if (!state.calibrationSamples.length) {
    flashCalibrationStatus("No anchors");
    return;
  }

  state.calibrationSamples = [];
  saveCalibrationSamples();
  setCalibrationCapture(false);
  updateMapCalibrationControls();
  flashCalibrationStatus("Anchors cleared");
}

function setCalibrationCapture(active) {
  state.calibrationCapture = Boolean(active);
  dom.mapShell.classList.toggle("is-calibrating", state.calibrationCapture);
  if (dom.calibrationPickButton) {
    dom.calibrationPickButton.classList.toggle("is-active", state.calibrationCapture);
  }
}

function applyCalibrationSamples() {
  if (!state.calibrationSamples.length) {
    updateMapCalibrationControls();
    return;
  }

  const latest = state.calibrationSamples[state.calibrationSamples.length - 1];
  const xFit = solveCalibrationAxis(
    "visualX",
    "mapX",
    state.mapImageWidth,
    latest.mapX - latest.visualX * state.mapImageWidth,
  );
  const yFit = solveCalibrationAxis(
    "visualY",
    "mapY",
    state.mapImageHeight,
    latest.mapY - latest.visualY * state.mapImageHeight,
  );

  setMapImageBounds(xFit.offset, yFit.offset, xFit.size, yFit.size);
}

function getCalibrationError() {
  if (!state.calibrationSamples.length) {
    return null;
  }

  const distances = state.calibrationSamples.map((sample) => {
    const predictedMapX = sample.visualX * state.mapImageWidth + state.mapImageOffsetX;
    const predictedMapY = sample.visualY * state.mapImageHeight + state.mapImageOffsetY;
    return Math.hypot(sample.mapX - predictedMapX, sample.mapY - predictedMapY);
  });
  const total = distances.reduce((sum, distance) => sum + distance, 0);

  return {
    average: total / distances.length,
    max: Math.max(...distances),
  };
}

function solveCalibrationAxis(visualKey, mapKey, fallbackSize, fallbackOffset) {
  const count = state.calibrationSamples.length;

  if (count < 2) {
    return {
      offset: fallbackOffset,
      size: fallbackSize,
    };
  }

  let sumVisual = 0;
  let sumMap = 0;
  let sumVisualSquared = 0;
  let sumVisualMap = 0;

  state.calibrationSamples.forEach((sample) => {
    const visualValue = sample[visualKey];
    const mapValue = sample[mapKey];

    sumVisual += visualValue;
    sumMap += mapValue;
    sumVisualSquared += visualValue * visualValue;
    sumVisualMap += visualValue * mapValue;
  });

  const denominator = count * sumVisualSquared - sumVisual * sumVisual;

  if (Math.abs(denominator) < 0.0000001) {
    return {
      offset: fallbackOffset,
      size: fallbackSize,
    };
  }

  const size = (count * sumVisualMap - sumVisual * sumMap) / denominator;
  const offset = (sumMap - size * sumVisual) / count;

  if (!Number.isFinite(offset) || !Number.isFinite(size) || size <= 0) {
    return {
      offset: fallbackOffset,
      size: fallbackSize,
    };
  }

  return { offset, size };
}

function updateCalibrationSampleStatus() {
  const count = state.calibrationSamples.length;
  const error = getCalibrationError();

  if (!count || !error) {
    dom.calibrationSolverStatus.textContent = "Anchors: 0";
    return;
  }

  dom.calibrationSolverStatus.textContent = `Anchors: ${count} | avg ${formatOffset(error.average)} | max ${formatOffset(error.max)}`;
}

function setMapImageBounds(offsetX, offsetY, imageWidth, imageHeight) {
  state.mapImageOffsetX = clamp(offsetX, -GRAAL_MAP_WIDTH, GRAAL_MAP_WIDTH);
  state.mapImageOffsetY = clamp(offsetY, -GRAAL_MAP_HEIGHT, GRAAL_MAP_HEIGHT);
  state.mapImageWidth = clamp(imageWidth, 1, GRAAL_MAP_WIDTH * 2);
  state.mapImageHeight = clamp(imageHeight, 1, GRAAL_MAP_HEIGHT * 2);
  saveMapImageOffset();
  updateMapTransform();
  updateMarkerVisualPositions();
}

function flashCalibrationStatus(message) {
  dom.calibrationStatus.textContent = message;
  window.clearTimeout(flashCalibrationStatus.statusTimer);
  flashCalibrationStatus.statusTimer = window.setTimeout(() => {
    dom.calibrationStatus.textContent = "";
  }, 1800);
}

function copyMapImageOffset() {
  const value = getMapImageOffsetText();
  const setStatus = (message) => {
    dom.calibrationStatus.textContent = message;
    window.clearTimeout(copyMapImageOffset.statusTimer);
    copyMapImageOffset.statusTimer = window.setTimeout(() => {
      dom.calibrationStatus.textContent = "";
    }, 1800);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value).then(
      () => setStatus("Copied"),
      () => setStatus(value),
    );
    return;
  }

  setStatus(value);
}

function getMapImageOffsetText() {
  return `imageOffsetX: ${formatOffset(state.mapImageOffsetX)}, imageOffsetY: ${formatOffset(state.mapImageOffsetY)}, imageWidth: ${formatOffset(state.mapImageWidth)}, imageHeight: ${formatOffset(state.mapImageHeight)}`;
}

function zoomMapAtCenter(nextZoom) {
  const rect = dom.mapShell.getBoundingClientRect();
  setMapZoom(nextZoom, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function setMapZoom(nextZoom, clientX, clientY) {
  const rect = dom.mapShell.getBoundingClientRect();
  const width = dom.mapShell.clientWidth;
  const height = dom.mapShell.clientHeight;

  if (!rect.width || !rect.height || !width || !height) {
    return;
  }

  const oldZoom = clamp(getFiniteNumber(state.mapZoom, 1), 1, MAX_MAP_ZOOM);
  const zoom = clamp(getFiniteNumber(nextZoom, oldZoom), 1, MAX_MAP_ZOOM);
  const shellX = ((clientX - rect.left) / rect.width) * width;
  const shellY = ((clientY - rect.top) / rect.height) * height;
  const renderedPan = getRenderedMapPan();
  const mapX = clamp((shellX - renderedPan.x) / (width * oldZoom), 0, 1);
  const mapY = clamp((shellY - renderedPan.y) / (height * oldZoom), 0, 1);

  state.mapZoom = zoom;
  state.mapPanX = shellX - mapX * width * zoom;
  state.mapPanY = shellY - mapY * height * zoom;
  clampMapPan();
  updateMapTransform();
}

function resetMapZoom() {
  state.mapZoom = 1;
  state.mapPanX = 0;
  state.mapPanY = 0;
  updateMapTransform();
}

function clampMapPan() {
  state.mapZoom = clamp(getFiniteNumber(state.mapZoom, 1), 1, MAX_MAP_ZOOM);
  state.mapPanX = getFiniteNumber(state.mapPanX, 0);
  state.mapPanY = getFiniteNumber(state.mapPanY, 0);

  const width = dom.mapShell.clientWidth;
  const height = dom.mapShell.clientHeight;

  if (!width || !height) {
    if (state.mapZoom <= 1) {
      state.mapPanX = 0;
      state.mapPanY = 0;
    }

    return;
  }

  const minX = width - width * state.mapZoom;
  const minY = height - height * state.mapZoom;

  state.mapPanX = state.mapZoom <= 1 ? 0 : clamp(state.mapPanX, minX, 0);
  state.mapPanY = state.mapZoom <= 1 ? 0 : clamp(state.mapPanY, minY, 0);
}

function updateMapTransform(mapWidth = dom.mapShell.clientWidth, mapHeight = dom.mapShell.clientHeight) {
  state.mapZoom = clamp(getFiniteNumber(state.mapZoom, 1), 1, MAX_MAP_ZOOM);
  state.mapPanX = getFiniteNumber(state.mapPanX, 0);
  state.mapPanY = getFiniteNumber(state.mapPanY, 0);
  const renderedPan = getRenderedMapPan();
  dom.mapImage.style.setProperty("--map-zoom", String(state.mapZoom));
  dom.mapImage.style.setProperty("--map-pan-x", `${renderedPan.x}px`);
  dom.mapImage.style.setProperty("--map-pan-y", `${renderedPan.y}px`);
  dom.zoomResetButton.textContent = `${state.mapZoom.toFixed(1)}x`;
  updateMapCalibrationControls();
  updateMarkerVisualPositions(mapWidth, mapHeight);
  if (
    state.multiplayerSession
    && !state.roundInputLocked
    && !state.revealed
    && mapWidth > 0
    && mapHeight > 0
  ) {
    window.dispatchEvent(new CustomEvent("classicguessr:multiplayer-view-preview", {
      detail: {
        lobbyCode: state.multiplayerSession.lobbyCode,
        roundIndex: state.roundIndex,
        zoom: state.mapZoom,
        panX: state.mapPanX / mapWidth,
        panY: state.mapPanY / mapHeight,
      },
    }));
  }
}

function updateMapCalibrationControls() {
  if (!dom.imageOffsetXInput) {
    return;
  }

  const canPickCalibrationSpot = state.revealed && Boolean(getCurrentTile());

  dom.imageOffsetXInput.value = formatOffset(state.mapImageOffsetX);
  dom.imageOffsetYInput.value = formatOffset(state.mapImageOffsetY);
  dom.imageWidthInput.value = formatOffset(state.mapImageWidth);
  dom.imageHeightInput.value = formatOffset(state.mapImageHeight);
  dom.imageOffsetStepInput.value = formatOffset(state.mapImageOffsetStep);
  dom.calibrationOutput.value = `${formatOffset(state.mapImageOffsetX)}, ${formatOffset(state.mapImageOffsetY)}, ${formatOffset(state.mapImageWidth)} x ${formatOffset(state.mapImageHeight)}`;
  dom.calibrationPickButton.disabled = !canPickCalibrationSpot;
  dom.calibrationUndoButton.disabled = !state.calibrationSamples.length;
  dom.calibrationClearButton.disabled = !state.calibrationSamples.length;
  updateCalibrationSampleStatus();
}

function getMapPointFromClient(clientX, clientY) {
  const visualPoint = getVisualPointFromClient(clientX, clientY);

  if (!visualPoint) {
    return {
      x: 0,
      y: 0,
    };
  }

  return {
    x: clamp((visualPoint.x * state.mapImageWidth + state.mapImageOffsetX) / GRAAL_MAP_WIDTH, 0, 1),
    y: clamp((visualPoint.y * state.mapImageHeight + state.mapImageOffsetY) / GRAAL_MAP_HEIGHT, 0, 1),
  };
}

function getVisualPointFromClient(clientX, clientY) {
  const rect = dom.mapShell.getBoundingClientRect();
  const width = dom.mapShell.clientWidth;
  const height = dom.mapShell.clientHeight;

  if (!rect.width || !rect.height || !width || !height) {
    return null;
  }

  const shellX = ((clientX - rect.left) / rect.width) * width;
  const shellY = ((clientY - rect.top) / rect.height) * height;
  const renderedPan = getRenderedMapPan();
  const visualX = (shellX - renderedPan.x) / (width * state.mapZoom);
  const visualY = (shellY - renderedPan.y) / (height * state.mapZoom);

  return {
    x: clamp(visualX, 0, 1),
    y: clamp(visualY, 0, 1),
  };
}

function getVisualMapPoint(x, y) {
  return {
    x: (x * GRAAL_MAP_WIDTH - state.mapImageOffsetX) / state.mapImageWidth,
    y: (y * GRAAL_MAP_HEIGHT - state.mapImageOffsetY) / state.mapImageHeight,
  };
}

function show(element) {
  element.classList.remove("hidden");
}

function hide(element) {
  element.classList.add("hidden");
}

function normalizeTileId(value) {
  const match = String(value || "").match(/(\d+)/);
  return match ? String(Number.parseInt(match[1], 10)) : "";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
}

function formatResultDistance(result) {
  if (result.distance === null) {
    return "Timed out";
  }

  if (result.perfect) {
    return "Perfect";
  }

  return `${formatNumber(result.distance)} px away`;
}

function formatHistoryDate(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatCareerQueue(queue) {
  if (queue === "ranked") {
    return "Ranked";
  }

  return "Casual";
}

function formatCareerMode(mode) {
  if (mode === "expert") {
    return "Expert";
  }

  return "Classic";
}

function normalizeCareerHistory(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeCareerHistoryEntry)
    .filter(Boolean)
    .sort((a, b) => b.playedAt - a.playedAt)
    .slice(0, CAREER_HISTORY_LIMIT);
}

function normalizeCareerHistoryEntry(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const playedAt = Math.max(0, Math.round(getFiniteNumber(value.playedAt, 0)));
  const rounds = Math.max(1, Math.round(getFiniteNumber(value.rounds, DEFAULT_ROUNDS)));

  if (!playedAt) {
    return null;
  }

  return {
    id: typeof value.id === "string" && value.id ? value.id : String(playedAt),
    playedAt,
    queue: value.queue === "ranked" ? "ranked" : "casual",
    mode: value.mode === "expert" ? "expert" : "classic",
    rounds,
    score: Math.max(0, Math.round(getFiniteNumber(value.score, 0))),
    bestRound: Math.max(0, Math.round(getFiniteNumber(value.bestRound, 0))),
    perfects: Math.max(0, Math.round(getFiniteNumber(value.perfects, 0))),
  };
}

function normalizeCareerStats(value) {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_CAREER_STATS };
  }

  const streak = Math.max(0, Math.round(getFiniteNumber(value.streak, 0)));
  const highestStreak = Math.max(streak, Math.round(getFiniteNumber(value.highestStreak, 0)));
  const bestRound = Math.max(0, Math.round(getFiniteNumber(value.bestRound, 0)));
  const coopStreak = Math.max(0, Math.round(getFiniteNumber(value.coopStreak, 0)));
  const coopHighestStreak = Math.max(coopStreak, Math.round(getFiniteNumber(value.coopHighestStreak, 0)));

  return {
    matchesPlayed: Math.max(0, Math.round(getFiniteNumber(value.matchesPlayed, 0))),
    totalScore: Math.max(0, Math.round(getFiniteNumber(value.totalScore, 0))),
    totalGuesses: Math.max(0, Math.round(getFiniteNumber(value.totalGuesses, 0))),
    bestRound,
    bestMatchScore: Math.max(bestRound, Math.round(getFiniteNumber(value.bestMatchScore, 0))),
    coopMatches: Math.max(0, Math.round(getFiniteNumber(value.coopMatches, 0))),
    coopTotalScore: Math.max(0, Math.round(getFiniteNumber(value.coopTotalScore, 0))),
    coopTotalGuesses: Math.max(0, Math.round(getFiniteNumber(value.coopTotalGuesses, 0))),
    coopBestMatchScore: Math.max(0, Math.round(getFiniteNumber(value.coopBestMatchScore, 0))),
    coopPerfects: Math.max(0, Math.round(getFiniteNumber(value.coopPerfects, 0))),
    coopStreak,
    coopHighestStreak,
    mostPlayedWith: typeof value.mostPlayedWith === "string" && value.mostPlayedWith.trim()
      ? value.mostPlayedWith.trim().slice(0, 32)
      : DEFAULT_CAREER_STATS.mostPlayedWith,
    perfects: Math.max(0, Math.round(getFiniteNumber(value.perfects, 0))),
    streak,
    highestStreak,
  };
}

function formatOffset(value) {
  return Number(value.toFixed(2)).toString();
}

function normalizeCalibrationSample(sample) {
  if (!sample || typeof sample !== "object") {
    return null;
  }

  const tileId = normalizeTileId(sample.tileId);
  const mapX = Number(sample.mapX);
  const mapY = Number(sample.mapY);
  const visualX = Number(sample.visualX);
  const visualY = Number(sample.visualY);

  if (
    !tileId ||
    !Number.isFinite(mapX) ||
    !Number.isFinite(mapY) ||
    !Number.isFinite(visualX) ||
    !Number.isFinite(visualY)
  ) {
    return null;
  }

  return {
    tileId,
    mapX: clamp(mapX, 0, GRAAL_MAP_WIDTH),
    mapY: clamp(mapY, 0, GRAAL_MAP_HEIGHT),
    visualX: clamp(visualX, 0, 1),
    visualY: clamp(visualY, 0, 1),
  };
}

function getFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}
