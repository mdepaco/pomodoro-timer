/* ==============================================================
   CONSTANTES Y CLAVES DE LOCAL STORAGE
================================================================ */
const LS_STATE    = 'pomodoro_state';
const LS_SETTINGS = 'pomodoro_settings';
const LS_THEME    = 'pomodoro_theme';
const LS_HISTORY  = 'pomodoro_history';

/* --------------------------------------------------------------
   VALORES POR DEFECTO
-------------------------------------------------------------- */
const DEFAULT_SETTINGS = {
  workMinutes: 25,
  breakMinutes: 5
};
const LONG_BREAK = 15 * 60;               // 15 min 
const CYCLES_BEFORE_LONG = 4;

/* --------------------------------------------------------------
   VARIABLES DE TIEMPO (se redefinen al cargar la configuración)
-------------------------------------------------------------- */
let WORK_TIME   = DEFAULT_SETTINGS.workMinutes * 60;
let SHORT_BREAK = DEFAULT_SETTINGS.breakMinutes * 60;

/* --------------------------------------------------------------
   ESTADO DEL TEMPORIZADOR
-------------------------------------------------------------- */
let state = {
  remaining: WORK_TIME,
  phase: 'work',          // work | shortBreak | longBreak
  running: false,
  cycle: 0,               // ciclos dentro del bloque actual
  totalCycles: 0
};

/* --------------------------------------------------------------
   HISTORIAL DE SESIONES
-------------------------------------------------------------- */
let history = [];

/* ==============================================================
   FUNCIONES DE CARGA / GUARDADO
================================================================ */
function loadState(){
  const raw = localStorage.getItem(LS_STATE);
  if(raw){
    try{ Object.assign(state, JSON.parse(raw)); }
    catch(e){}
  }
}
function saveState(){ localStorage.setItem(LS_STATE, JSON.stringify(state)); }

function loadSettings(){
  const raw = localStorage.getItem(LS_SETTINGS);
  if(raw){
    try{
      const parsed = JSON.parse(raw);
      return {
        workMinutes : Number(parsed.workMinutes)  || DEFAULT_SETTINGS.workMinutes,
        breakMinutes: Number(parsed.breakMinutes) || DEFAULT_SETTINGS.breakMinutes
      };
    }catch(e){}
  }
  return { ...DEFAULT_SETTINGS };
}
function saveSettings(s){ localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); }

function applySettings(s){
  WORK_TIME   = s.workMinutes  * 60;
  SHORT_BREAK = s.breakMinutes * 60;
  // Si el temporizador está detenido, actualizamos la vista
  if(!state.running){
    state.remaining = getPhaseDuration(state.phase);
    render();
  }
}

/* --------------------------------------------------------------
   HISTORIAL (carga/guarda)
-------------------------------------------------------------- */
function loadHistory(){
  const raw = localStorage.getItem(LS_HISTORY);
  if(raw){
    try{ history = JSON.parse(raw); }
    catch(e){}
  }
}
function saveHistory(){ localStorage.setItem(LS_HISTORY, JSON.stringify(history)); }

function addToHistory(){
  const today = new Date().toISOString().split('T')[0];
  const last = history.find(h=>h.date===today);
  const workSec   = state.phase==='work' ? getPhaseDuration('work') : 0;
  const breakSec  = state.phase!=='work' ? getPhaseDuration(state.phase) : 0;
  const cyclesInc = state.phase==='work' ? 1 : 0;

  if(last){
    last.work   += workSec;
    last.break  += breakSec;
    last.cycles += cyclesInc;
  }else{
    history.push({
      date: today,
      work:   workSec,
      break:  breakSec,
      cycles: cyclesInc
    });
  }
  saveHistory();
}

/* --------------------------------------------------------------
   THEME HANDLING
-------------------------------------------------------------- */
const THEMES = {
  'theme-playful': 'Playful',
  'theme-kiddo'  : 'Kiddo',
  'theme-metro'  : 'Metro'
};

function applyTheme(themeClass){
  document.body.classList.forEach(cls => {
    if (cls.startsWith('theme-')) document.body.classList.remove(cls);
  });
  document.body.classList.add(themeClass);
  localStorage.setItem(LS_THEME, themeClass);
  const sel = document.getElementById('themeSelect');
  if (sel) sel.value = themeClass;
}

function loadTheme(){
  const saved = localStorage.getItem(LS_THEME);
  const defaultTheme = 'theme-playful';
  const themeToApply = saved && THEMES[saved] ? saved : defaultTheme;
  applyTheme(themeToApply);
}

/* Listener del selector */
document.getElementById('themeSelect')
        .addEventListener('change', e => applyTheme(e.target.value));
/* ==============================================================
   UTILIDADES DE TIEMPO
================================================================ */
function formatTime(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = (sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}
function getPhaseDuration(p){
  return p==='work' ? WORK_TIME
       : p==='shortBreak' ? SHORT_BREAK
       : LONG_BREAK;
}

/* ==============================================================
   RENDERING
================================================================ */
const timerEl      = document.getElementById('timerDisplay');
const startBtn     = document.getElementById('startBtn');
const pauseBtn     = document.getElementById('pauseBtn');
const resetBtn     = document.getElementById('resetBtn');
const sessionInfo  = document.getElementById('sessionInfo');
const cycleInfo    = document.getElementById('cycleCount');

function render(){
  timerEl.textContent = formatTime(state.remaining);
  sessionInfo.textContent = {
    work: 'Sesión de trabajo',
    shortBreak: 'Descanso corto',
    longBreak: 'Descanso largo'
  }[state.phase];
  cycleInfo.textContent = `Ciclo: ${state.cycle}/${CYCLES_BEFORE_LONG}`;

  startBtn.classList.toggle('hidden', state.running);
  pauseBtn.classList.toggle('hidden', !state.running);
  resetBtn.classList.toggle('hidden', !state.running && state.remaining===getPhaseDuration(state.phase));

  // Parpadeo al acabar
  if(state.remaining===0) document.body.classList.add('finished');
  else document.body.classList.remove('finished');
}

/* ==============================================================
   LOGICA DEL TEMPORIZADOR
================================================================ */
let interval = null;

function startTimer(){
  if(state.running) return;
  state.running = true;
  render();

  interval = setInterval(()=>{
    if(state.remaining>0){
      state.remaining--;
      render();
    }else{
      playBeep();
      clearInterval(interval);
      state.running = false;
      addToHistory();          // registrar la fase terminada
      nextPhase();             // pasar a la siguiente fase
      render();
      saveState();
    }
    saveState();
  },1000);
}
function pauseTimer(){
  if(!state.running) return;
  clearInterval(interval);
  state.running = false;
  render();
  saveState();
}
function resetTimer(){
  clearInterval(interval);
  state = {
    remaining: WORK_TIME,
    phase: 'work',
    running: false,
    cycle: 0,
    totalCycles: 0
  };
  render();
  saveState();
}

/* --------------------------------------------------------------
   CAMBIO DE FASE
-------------------------------------------------------------- */
function nextPhase(){
  if(state.phase==='work'){
    state.cycle++;
    state.totalCycles++;
    if(state.cycle>=CYCLES_BEFORE_LONG){
      state.phase='longBreak';
      state.cycle=0;
    }else{
      state.phase='shortBreak';
    }
  }else{
    state.phase='work';
  }
  state.remaining = getPhaseDuration(state.phase);
}

/* --------------------------------------------------------------
   NOTIFICACIONES Y SONIDO DE ALERTA
-------------------------------------------------------------- */
function notifyPhaseEnd(){
  if ('Notification' in window && Notification.permission === 'granted'){
    const title = state.phase === 'work' ? '¡Descanso!' : '¡Vuelve al trabajo!';
    const body  = state.phase === 'work'
      ? `Has completado ${state.workMinutes || DEFAULT_SETTINGS.workMinutes} min de foco. Tiempo de descanso.`
      : `Descanso terminado. Empecemos otra sesión de ${state.workMinutes || DEFAULT_SETTINGS.workMinutes} min.`;
    new Notification(title,{body,icon:'/favicon.ico'});
  }
}
function playBeep(){
  const ctx = new (window.AudioContext||window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440,ctx.currentTime);
  gain.gain.setValueAtTime(0.2,ctx.currentTime);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime+0.2);
  notifyPhaseEnd();
}

/* --------------------------------------------------------------
   CONTROL DE MÚSICA DE ENFOQUE
-------------------------------------------------------------- */
const music = document.getElementById('focusMusic');
function controlMusic(){
  if(state.phase === 'work'){
    music.play().catch(()=>{});
  }else{
    music.pause();
  }
}

/* --------------------------------------------------------------
   EVENT LISTENERS DE INTERFAZ
-------------------------------------------------------------- */
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

/* Tema */
document.getElementById('themeSelect').addEventListener('change', e=>{
  applyTheme(e.target.value);
});

/* Configuración de tiempos */
const settingsToggle   = document.getElementById('settingsToggle');
const settingsPanel    = document.getElementById('settingsPanel');
const cancelSettings   = document.getElementById('cancelSettings');
const applySettingsBtn = document.getElementById('applySettings');
const presetSelect     = document.getElementById('presetSelect');
const workInput        = document.getElementById('workInput');
const breakInput       = document.getElementById('breakInput');

settingsToggle.addEventListener('click', ()=>{
  const cur = loadSettings();
  workInput.value  = cur.workMinutes;
  breakInput.value = cur.breakMinutes;
  presetSelect.value = '';
  settingsPanel.classList.add('show');
});
cancelSettings.addEventListener('click', ()=> settingsPanel.classList.remove('show'));

presetSelect.addEventListener('change', e=>{
  const val = e.target.value;
  if(val){
    const [w,b] = val.split('-').map(Number);
    workInput.value  = w;
    breakInput.value = b;
  }
});

applySettingsBtn.addEventListener('click', ()=>{
  const w = Number(workInput.value);
  const b = Number(breakInput.value);
  if(isNaN(w)||w<=0){ alert('Minutos de trabajo inválidos'); return; }
  if(isNaN(b)||b<=0){ alert('Minutos de descanso inválidos'); return; }
  const newSet = {workMinutes:w, breakMinutes:b};
  saveSettings(newSet);
  applySettings(newSet);
  settingsPanel.classList.remove('show');
});

/* Estadísticas */
const statsToggle   = document.getElementById('statsToggle');
const statsPanel    = document.getElementById('statsPanel');
const closeStats    = document.getElementById('closeStats');
const exportCsvBtn  = document.getElementById('exportCsv');
const historyBody   = document.getElementById('historyBody');

statsToggle.addEventListener('click', ()=>{
  renderHistoryTable();
  statsPanel.classList.remove('hidden');
});
closeStats.addEventListener('click', ()=> statsPanel.classList.add('hidden'));

function renderHistoryTable(){
  historyBody.innerHTML = '';
  history.sort((a,b)=> b.date.localeCompare(a.date))
         .forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="py-1">${r.date}</td>
      <td class="py-1 text-right">${Math.round(r.work/60)}</td>
      <td class="py-1 text-right">${Math.round(r.break/60)}</td>
      <td class="py-1 text-right">${r.cycles}</td>`;
    historyBody.appendChild(tr);
  });
}

exportCsvBtn.addEventListener('click', ()=>{
  const header = ['Fecha','Trabajo (min)','Descanso (min)','Ciclos'];
  const rows = history.map(r=>[
    r.date,
    Math.round(r.work/60),
    Math.round(r.break/60),
    r.cycles
  ]);
  const csv = [header, ...rows].map(e=>e.join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pomodoro_historial.csv';
  a.click();
  URL.revokeObjectURL(url);
});

/* Export / Import Configuración */
const exportConfigBtn = document.getElementById('exportConfig');
const importFileInput = document.getElementById('importFile');

exportConfigBtn.addEventListener('click', ()=>{
  const data = {
    settings: loadSettings(),
    theme: localStorage.getItem(LS_THEME) || 'theme-c',
    history
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pomodoro_config.json';
  a.click();
  URL.revokeObjectURL(url);
});

importFileInput.addEventListener('change', async e=>{
  const file = e.target.files[0];
  if(!file) return;
  const txt = await file.text();
  try{
    const obj = JSON.parse(txt);
    if(obj.settings){ saveSettings(obj.settings); applySettings(obj.settings); }
    if(obj.theme){ applyTheme(obj.theme); }
    if(obj.history){ history = obj.history; saveHistory(); }
    alert('Configuración importada correctamente.');
    render();
  }catch(err){
    alert('Error al leer el archivo: '+err);
  }
});

/* --------------------------------------------------------------
   INICIALIZACIÓN
-------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Inicialización de tema
  loadTheme();
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', e => applyTheme(e.target.value));
  }

  // Inicialización de estado y settings
  loadState();
  loadHistory();
  applySettings(loadSettings());
  render();

  // Botones principales
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  if (startBtn && pauseBtn && resetBtn) {
    startBtn.addEventListener('click', startTimerWithMusic);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
  }

  // Solicitar permiso de notificaciones
  if ('Notification' in window && Notification.permission !== 'granted'){
    Notification.requestPermission();
  }

  // Aquí puedes agregar el resto de listeners SOLO si los elementos existen
  // Por ejemplo:
  // const settingsToggle = document.getElementById('settingsToggle');
  // if (settingsToggle) { ... }
});

/* Control automático de música al cambiar de fase */
function nextPhaseWithMusic(){
  nextPhase();
  controlMusic();
}
function startTimerWithMusic(){
  startTimer();
  controlMusic();
}
