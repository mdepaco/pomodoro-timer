/* ---------- CONFIGURACIÓN ---------- */
// Duraciones en segundos
const WORK_TIME   = 25 * 60;   // 25 min
const SHORT_BREAK = 5  * 60;   // 5 min
const LONG_BREAK  = 15 * 60;   // 15 min
const CYCLES_BEFORE_LONG = 4; // Después de 4 bloques de trabajo -> break largo

// Claves de localStorage para persistir estado
const LS_STATE = 'pomodoro_state';

/* ---------- ESTADO ---------- */
let state = {
  remaining: WORK_TIME,   // segundos que quedan en la fase actual
  phase: 'work',          // 'work' | 'shortBreak' | 'longBreak'
  running: false,
  cycle: 0,               // cuántos bloques de trabajo completados en esta ronda
  totalCycles: 0          // cuántos bloques de trabajo completados en total (histórico)
};

/* ---------- UTILIDADES ---------- */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function saveState() {
  localStorage.setItem(LS_STATE, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(LS_STATE);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Sólo restauramos valores válidos
      if (typeof parsed.remaining === 'number' && typeof parsed.phase === 'string') {
        Object.assign(state, parsed);
      }
    } catch (_) {}
  }
}

/* ---------- INTERFAZ ---------- */
const timerEl   = document.getElementById('timerDisplay');
const startBtn  = document.getElementById('startBtn');
const pauseBtn  = document.getElementById('pauseBtn');
const resetBtn  = document.getElementById('resetBtn');
const sessionInfo = document.getElementById('sessionInfo');
const cycleInfo   = document.getElementById('cycleCount');
const body       = document.body;

/* Actualiza la UI según el estado interno */
function render() {
  timerEl.textContent = formatTime(state.remaining);
  sessionInfo.textContent = {
    work: 'Sesión de trabajo',
    shortBreak: 'Descanso corto',
    longBreak: 'Descanso largo'
  }[state.phase];

  cycleInfo.textContent = `Ciclo: ${state.cycle}/${CYCLES_BEFORE_LONG}`;

  // Botones visibles
  startBtn.classList.toggle('hidden', state.running);
  pauseBtn.classList.toggle('hidden', !state.running);
  resetBtn.classList.toggle('hidden', !state.running && state.remaining === getPhaseDuration(state.phase));

  // Cambiar color de fondo según fase
  body.className = ''; // reset
  if (state.phase === 'work') body.classList.add('bg-blue-50');
  else if (state.phase === 'shortBreak') body.classList.add('bg-green-50');
  else body.classList.add('bg-purple-50');

  // Parpadeo al terminar
  if (state.remaining === 0) {
    body.classList.add('finished');
  } else {
    body.classList.remove('finished');
  }
}

/* Devuelve la duración (segundos) de la fase actual */
function getPhaseDuration(phase) {
  switch (phase) {
    case 'work': return WORK_TIME;
    case 'shortBreak': return SHORT_BREAK;
    case 'longBreak': return LONG_BREAK;
    default: return WORK_TIME;
  }
}

/* Cambia a la siguiente fase */
function nextPhase() {
  if (state.phase === 'work') {
    state.cycle += 1;
    state.totalCycles += 1;
    // Después de N ciclos, pasa a break largo
    if (state.cycle >= CYCLES_BEFORE_LONG) {
      state.phase = 'longBreak';
      state.cycle = 0; // reinicia contador de ciclo
    } else {
      state.phase = 'shortBreak';
    }
  } else {
    // De cualquier break volvemos a trabajar
    state.phase = 'work';
  }
  state.remaining = getPhaseDuration(state.phase);
}

/* ---------- TIMER LOGIC ---------- */
let tickInterval = null;

function startTimer() {
  if (state.running) return;
  state.running = true;
  render();

  tickInterval = setInterval(() => {
    if (state.remaining > 0) {
      state.remaining -= 1;
      render();
    } else {
      // Sonido opcional al terminar la fase
      playBeep();
      clearInterval(tickInterval);
      state.running = false;
      nextPhase();
      render();
      // Auto‑restart: si quieres que continúe automáticamente, descomenta:
      // startTimer();
    }
    saveState();
  }, 1000);
}

function pauseTimer() {
  if (!state.running) return;
  clearInterval(tickInterval);
  state.running = false;
  render();
  saveState();
}

function resetTimer() {
  clearInterval(tickInterval);
  state.running = false;
  state.phase = 'work';
  state.remaining = WORK_TIME;
  state.cycle = 0;
  render();
  saveState();
}

/* ---------- SONIDO DE ALERTA (opcional) ---------- */
function playBeep() {
  // Usa la API Web Audio para generar un beep corto
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.value = 440; // A4
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

/* ---------- EVENT LISTENERS ---------- */
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

/* ---------- INICIALIZACIÓN ---------- */
loadState();
render();
