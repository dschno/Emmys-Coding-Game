// Emmy's Coding Game — Binary Blaster

// =====================
// CONSTANTS
// =====================

const TOTAL_QUESTIONS = 10;
const POINTS_BASE = 10;
const STREAK_BONUSES = { 3: 5, 4: 10, 5: 15, 6: 20 };
const STREAK_BONUS_MAX = 25;
const AUTO_LEVEL_UP_STREAK = 5;

const LETTERS_CHARSET = {
  easy:   'ABCDEFGHIJ',
  medium: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  hard:   'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
};

const CORRECT_MESSAGES = [
  'Correct! 🎉', 'Amazing! ⭐', 'You got it! 🚀', 'Binary Master! 💡',
  'Brilliant! 🌟', 'Nailed it! ✅', "That's right! 🏆", 'Awesome! 🎊',
];

const WRONG_MESSAGES = [
  "Not quite — keep going! 💪",
  "Keep going, you're learning! 🌱",
  "Binary is tricky — you've got this! 🔍",
  "So close! Keep practicing! ⚡",
];

const STREAK_MESSAGES = {
  3:  "3 in a row! 🔥",
  5:  "ON FIRE! 🔥🔥",
  7:  "UNSTOPPABLE! 🚀🚀🚀",
  10: "LEGENDARY BINARY MASTER! 👑",
};

const RESULTS_MESSAGES = [
  [10, "Perfect score! You're a Binary Master! 🏆"],
  [8,  "Incredible job — almost perfect! ⭐"],
  [6,  "Great work! You're getting the hang of it! 🌟"],
  [4,  "Good effort! Keep practicing and you'll get there! 💪"],
  [0,  "Nice try! Every coder starts somewhere. Keep going! 🌱"],
];

const PARTICLE_COLORS = ['#e94560', '#f5a623', '#2ecc71', '#3498db', '#9b59b6', '#fff'];

// =====================
// STATE
// =====================

const STATE = {
  mode: 'numbers',
  difficulty: 'easy',
  score: 0,
  streak: 0,
  bestStreak: 0,
  level: 1,
  questionIndex: 0,
  correctCount: 0,
  currentQuestion: null,
  answeredThisQuestion: false,
  wrongThisQuestion: false,
  hintUsed: false,
  recentAnswers: [],
  timeoutIds: [],
  particles: [],
  animationFrameId: null,
};

// =====================
// DOM CACHE
// =====================

const DOM = {};

function cacheDOM() {
  DOM.screenHome     = document.getElementById('screen-home');
  DOM.screenGame     = document.getElementById('screen-game');
  DOM.screenResults  = document.getElementById('screen-results');
  DOM.binaryDisplay  = document.getElementById('binary-display');
  DOM.questionPrompt = document.getElementById('question-prompt');
  DOM.answerGrid     = document.getElementById('answer-grid');
  DOM.hudScore       = document.getElementById('hud-score');
  DOM.hudStreak      = document.getElementById('hud-streak');
  DOM.hudLevel       = document.getElementById('hud-level');
  DOM.hudCounter     = document.getElementById('hud-question-counter');
  DOM.progressBar    = document.getElementById('progress-bar');
  DOM.feedbackOverlay  = document.getElementById('feedback-overlay');
  DOM.feedbackMessage  = document.getElementById('feedback-message');
  DOM.hintBtn        = document.getElementById('btn-hint');
  DOM.hintBox        = document.getElementById('hint-box');
  DOM.canvas         = document.getElementById('celebration-canvas');
  DOM.resultsTitle   = document.getElementById('results-title');
  DOM.resultsScore   = document.getElementById('results-score');
  DOM.resultsCorrect = document.getElementById('results-correct');
  DOM.resultsBestStreak = document.getElementById('results-best-streak');
  DOM.resultsMessage = document.getElementById('results-message');
  DOM.highScoreBanner = document.getElementById('high-score-banner');
  DOM.ctx = DOM.canvas.getContext('2d');
}

// =====================
// SCREEN MANAGEMENT
// =====================

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// =====================
// UTILITY
// =====================

function intToBinary(n) {
  return n.toString(2).padStart(8, '0');
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function streakBonus(streak) {
  if (streak >= 6) return STREAK_BONUS_MAX;
  return STREAK_BONUSES[streak] || 0;
}

// =====================
// QUESTION GENERATION
// =====================

function generateWrongChoicesNumbers(correct) {
  const wrong = new Set();
  // One close neighbour
  const delta = Math.floor(Math.random() * 4) + 1;
  const neighbour = correct + (Math.random() < 0.5 ? delta : -delta);
  if (neighbour >= 0 && neighbour <= 255 && neighbour !== correct) wrong.add(neighbour);

  // Fill remaining with random 0-255
  let tries = 0;
  while (wrong.size < 3 && tries < 100) {
    const r = Math.floor(Math.random() * 256);
    if (r !== correct) wrong.add(r);
    tries++;
  }

  return [...wrong].slice(0, 3);
}

function generateWrongChoicesLetters(correct, charset) {
  const pool = charset.split('').filter(c => c !== correct);
  shuffleArray(pool);
  return pool.slice(0, 3);
}

function generateQuestion() {
  const mode = STATE.mode;
  const difficulty = STATE.difficulty;

  let answer, binary, prompt, hint, choices;

  // Retry if answer matches recent history
  let attempts = 0;
  do {
    if (mode === 'numbers') {
      answer = Math.floor(Math.random() * 256); // always 0–255
      binary = intToBinary(answer);
      prompt = 'What decimal number does this binary represent?';
      const wrong = generateWrongChoicesNumbers(answer);
      choices = shuffleArray([String(answer), ...wrong.map(String)]);
      hint = buildHintNumbers(binary, answer);
    } else {
      const charset = LETTERS_CHARSET[difficulty];
      answer = randomFrom(charset.split(''));
      const code = answer.charCodeAt(0);
      binary = intToBinary(code);
      prompt = 'What letter does this binary represent?';
      const wrong = generateWrongChoicesLetters(answer, charset);
      choices = shuffleArray([answer, ...wrong]);
      hint = buildHintLetters(binary, answer, code);
    }
    attempts++;
  } while (STATE.recentAnswers.includes(String(answer)) && attempts < 10);

  return { binary, answer: String(answer), choices, prompt, hint };
}

function buildHintNumbers(binary, decimal) {
  const positions = [128, 64, 32, 16, 8, 4, 2, 1];
  const parts = binary.split('').map((bit, i) => {
    if (bit === '0') return null;
    return `1×${positions[i]}`;
  }).filter(Boolean);
  const sum = parts.length ? parts.join(' + ') + ` = ${decimal}` : `0 = ${decimal}`;
  return `💡 ${sum}`;
}

function buildHintLetters(binary, letter, code) {
  return `💡 "${letter}" has the code ${code}, which in binary is ${binary}`;
}

// =====================
// RENDER
// =====================

function renderBinaryDisplay(binaryStr) {
  DOM.binaryDisplay.innerHTML = '';
  binaryStr.split('').forEach((bit, i) => {
    const span = document.createElement('span');
    span.className = `bit ${bit === '1' ? 'bit-one' : 'bit-zero'} bit-enter`;
    span.style.animationDelay = `${i * 40}ms`;
    span.textContent = bit;
    DOM.binaryDisplay.appendChild(span);
  });
}

function renderAnswerButtons(choices) {
  DOM.answerGrid.innerHTML = '';
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'btn-answer';
    btn.dataset.value = choice;
    btn.textContent = choice;
    DOM.answerGrid.appendChild(btn);
  });
}

function renderQuestion(q) {
  DOM.questionPrompt.textContent = q.prompt;
  renderBinaryDisplay(q.binary);
  renderAnswerButtons(q.choices);

  // Hint visibility based on difficulty
  DOM.hintBox.classList.add('hidden');
  DOM.hintBox.textContent = '';
  if (STATE.difficulty === 'easy') {
    DOM.hintBtn.classList.remove('hidden');
    STATE.hintUsed = false;
  } else if (STATE.difficulty === 'medium') {
    DOM.hintBtn.classList.add('hidden'); // shown after first wrong
    STATE.hintUsed = false;
  } else {
    DOM.hintBtn.classList.add('hidden'); // never shown on hard
  }

  DOM.feedbackOverlay.classList.add('hidden');
  DOM.feedbackOverlay.classList.remove('visible', 'correct-feedback', 'wrong-feedback');
  updateHUD();
  updateProgressBar();
}

function updateHUD() {
  DOM.hudScore.textContent = STATE.score;
  DOM.hudStreak.textContent = (STATE.streak >= 3 ? '🔥 ' : '') + STATE.streak;
  DOM.hudLevel.textContent = STATE.level;
  DOM.hudCounter.textContent = `${STATE.questionIndex + 1}/${TOTAL_QUESTIONS}`;

  if (STATE.streak >= 3) {
    DOM.hudStreak.classList.add('streak-on-fire');
  } else {
    DOM.hudStreak.classList.remove('streak-on-fire');
  }
}

function updateProgressBar() {
  DOM.progressBar.style.width = `${(STATE.questionIndex / TOTAL_QUESTIONS) * 100}%`;
}

// =====================
// GAME FLOW
// =====================

function startGame() {
  // Clear any pending timers
  STATE.timeoutIds.forEach(id => clearTimeout(id));
  STATE.timeoutIds = [];
  stopParticles();

  // Reset state (preserve mode, difficulty)
  STATE.score = 0;
  STATE.streak = 0;
  STATE.bestStreak = 0;
  STATE.level = 1;
  STATE.questionIndex = 0;
  STATE.correctCount = 0;
  STATE.recentAnswers = [];
  STATE.currentQuestion = null;
  STATE.answeredThisQuestion = false;
  STATE.wrongThisQuestion = false;
  STATE.hintUsed = false;

  showScreen('screen-game');
  loadQuestion();
}

function loadQuestion() {
  STATE.answeredThisQuestion = false;
  STATE.wrongThisQuestion = false;
  STATE.currentQuestion = generateQuestion();
  renderQuestion(STATE.currentQuestion);
}

function advanceQuestion() {
  DOM.feedbackOverlay.classList.add('hidden');
  DOM.feedbackOverlay.classList.remove('visible', 'correct-feedback', 'wrong-feedback');

  STATE.questionIndex++;
  if (STATE.questionIndex >= TOTAL_QUESTIONS) {
    endGame();
  } else {
    loadQuestion();
  }
}

function endGame() {
  showScreen('screen-results');

  DOM.resultsScore.textContent = STATE.score;
  DOM.resultsCorrect.textContent = `${STATE.correctCount}/${TOTAL_QUESTIONS}`;
  DOM.resultsBestStreak.textContent = STATE.bestStreak;

  const msg = RESULTS_MESSAGES.find(([min]) => STATE.correctCount >= min);
  DOM.resultsMessage.textContent = msg ? msg[1] : '';

  const prevHigh = loadHighScore();
  if (STATE.score > prevHigh) {
    saveHighScore(STATE.score);
    DOM.highScoreBanner.classList.remove('hidden');
    DOM.resultsTitle.textContent = '🏆 New High Score!';
  } else {
    DOM.highScoreBanner.classList.add('hidden');
    DOM.resultsTitle.textContent = 'Round Complete! 🎉';
  }

  triggerCelebration(40);
}

// =====================
// ANSWER HANDLING
// =====================

function handleAnswer(chosenValue) {
  if (STATE.answeredThisQuestion) return;
  STATE.answeredThisQuestion = true;

  const correct = STATE.currentQuestion.answer;
  const buttons = DOM.answerGrid.querySelectorAll('.btn-answer');

  // Disable all buttons
  buttons.forEach(btn => { btn.disabled = true; });

  // Mark correct and chosen
  buttons.forEach(btn => {
    if (btn.dataset.value === correct) btn.classList.add('correct');
    else if (btn.dataset.value === chosenValue) btn.classList.add('wrong');
  });

  if (chosenValue === correct) {
    handleCorrect();
  } else {
    handleWrong();
  }

  const tid = setTimeout(advanceQuestion, 1600);
  STATE.timeoutIds.push(tid);
}

function handleCorrect() {
  STATE.streak++;
  if (STATE.streak > STATE.bestStreak) STATE.bestStreak = STATE.streak;
  STATE.correctCount++;

  const bonus = streakBonus(STATE.streak);
  STATE.score += POINTS_BASE + bonus;

  // Track recent answers to avoid repeats
  STATE.recentAnswers.push(STATE.currentQuestion.answer);
  if (STATE.recentAnswers.length > 3) STATE.recentAnswers.shift();

  updateHUD();

  const milestoneMsg = STREAK_MESSAGES[STATE.streak];
  showFeedback('correct', milestoneMsg || randomFrom(CORRECT_MESSAGES));

  triggerCelebration(STATE.streak >= 5 ? 60 : 20);
  checkAutoLevelUp();
}

function handleWrong() {
  STATE.streak = 0;
  updateHUD();
  showFeedback('wrong', randomFrom(WRONG_MESSAGES));

  // Show hint button if medium difficulty (and not already used)
  if (STATE.difficulty === 'medium' && !STATE.hintUsed) {
    DOM.hintBtn.classList.remove('hidden');
  }
  STATE.wrongThisQuestion = true;
}

function checkAutoLevelUp() {
  if (STATE.streak === AUTO_LEVEL_UP_STREAK && STATE.level < 3) {
    STATE.level++;
    updateHUD();
    // Brief level-up flash via feedback slot
    const tid = setTimeout(() => {
      showFeedback('correct', `⬆️ Level Up! Now Level ${STATE.level}!`);
    }, 50);
    STATE.timeoutIds.push(tid);
  }
}

// =====================
// FEEDBACK
// =====================

function showFeedback(type, message) {
  DOM.feedbackMessage.textContent = message;
  DOM.feedbackOverlay.classList.remove('hidden', 'correct-feedback', 'wrong-feedback');
  DOM.feedbackOverlay.classList.add('visible', type === 'correct' ? 'correct-feedback' : 'wrong-feedback');

  const tid = setTimeout(() => {
    DOM.feedbackOverlay.classList.remove('visible');
    const tid2 = setTimeout(() => {
      DOM.feedbackOverlay.classList.add('hidden');
    }, 200);
    STATE.timeoutIds.push(tid2);
  }, 1100);
  STATE.timeoutIds.push(tid);
}

// =====================
// HINT
// =====================

function showHint() {
  DOM.hintBox.textContent = STATE.currentQuestion.hint;
  DOM.hintBox.classList.remove('hidden');
  DOM.hintBtn.classList.add('hidden');
  STATE.hintUsed = true;
}

// =====================
// CELEBRATION PARTICLES
// =====================

function triggerCelebration(count) {
  stopParticles();
  startParticles(count);
}

function startParticles(count) {
  DOM.canvas.width  = window.innerWidth;
  DOM.canvas.height = window.innerHeight;
  DOM.canvas.classList.add('active');

  STATE.particles = [];
  for (let i = 0; i < count; i++) {
    STATE.particles.push({
      x:     Math.random() * DOM.canvas.width,
      y:     Math.random() * DOM.canvas.height * 0.5,
      vx:    (Math.random() - 0.5) * 6,
      vy:    Math.random() * -4 - 1,
      radius: Math.random() * 5 + 3,
      color:  randomFrom(PARTICLE_COLORS),
      alpha:  1,
      decay:  Math.random() * 0.015 + 0.008,
    });
  }

  animateParticles();
}

function animateParticles() {
  const ctx = DOM.ctx;
  ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);

  STATE.particles = STATE.particles.filter(p => p.alpha > 0);

  STATE.particles.forEach(p => {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.12; // gravity
    p.alpha -= p.decay;

    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;

  if (STATE.particles.length > 0) {
    STATE.animationFrameId = requestAnimationFrame(animateParticles);
  } else {
    stopParticles();
  }
}

function stopParticles() {
  if (STATE.animationFrameId) {
    cancelAnimationFrame(STATE.animationFrameId);
    STATE.animationFrameId = null;
  }
  DOM.ctx && DOM.ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
  DOM.canvas && DOM.canvas.classList.remove('active');
  STATE.particles = [];
}

// =====================
// PERSISTENCE
// =====================

function saveHighScore(score) {
  localStorage.setItem('binaryBlaster_highScore', score);
}

function loadHighScore() {
  return parseInt(localStorage.getItem('binaryBlaster_highScore') || '0', 10);
}

function saveLastMode(mode) {
  localStorage.setItem('binaryBlaster_lastMode', mode);
}

function loadLastMode() {
  return localStorage.getItem('binaryBlaster_lastMode') || 'numbers';
}

// =====================
// EVENT LISTENERS
// =====================

function attachHomeListeners() {
  // Mode buttons
  document.querySelectorAll('.btn-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      STATE.mode = btn.dataset.mode;
      saveLastMode(STATE.mode);
    });
  });

  // Difficulty buttons
  document.querySelectorAll('.btn-difficulty').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-difficulty').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.difficulty = btn.dataset.difficulty;
    });
  });

  // Start
  document.getElementById('btn-start').addEventListener('click', startGame);
}

function attachGameListeners() {
  // Answer delegation
  DOM.answerGrid.addEventListener('click', e => {
    const btn = e.target.closest('.btn-answer');
    if (btn && !btn.disabled) handleAnswer(btn.dataset.value);
  });

  // Hint
  DOM.hintBtn.addEventListener('click', showHint);

  // Quit
  document.getElementById('btn-quit').addEventListener('click', () => {
    stopParticles();
    STATE.timeoutIds.forEach(id => clearTimeout(id));
    STATE.timeoutIds = [];
    showScreen('screen-home');
  });
}

function attachResultsListeners() {
  document.getElementById('btn-play-again').addEventListener('click', startGame);
  document.getElementById('btn-home').addEventListener('click', () => showScreen('screen-home'));
}

// =====================
// INIT
// =====================

function init() {
  cacheDOM();

  // Restore last mode
  const lastMode = loadLastMode();
  STATE.mode = lastMode;
  document.querySelectorAll('.btn-mode').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.mode === lastMode);
  });

  // Show high score on home screen if one exists
  const best = loadHighScore();
  if (best > 0) {
    const banner = document.getElementById('home-high-score');
    const val    = document.getElementById('home-high-score-value');
    if (banner && val) {
      val.textContent = best;
      banner.classList.remove('hidden');
    }
  }

  attachHomeListeners();
  attachGameListeners();
  attachResultsListeners();

  showScreen('screen-home');
}

document.addEventListener('DOMContentLoaded', init);
