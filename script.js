//TEMP CONFIG//
const WORK_TIME   = 25 * 60;
const SHORT_BREAK = 5  * 60;
const LONG_BREAK  = 15 * 60;
const CYCLES_BEFORE_LONG = 4;
const LS_STATE = 'pomodoro_state';
const LS_THEME = 'pomodoro_theme';

let state = {
  remaining: WORK_TIME,
  phase: 'work',
  running: false,
  cycle: 0,
  totalCycles: 0
};

/* ---------- Utilities ---------- */
function formatTime(s){ const m=Math.floor(s/60).toString().padStart(2,'0'); const sec=(s%60).toString().padStart(2,'0'); return `${m}:${sec}`; }
function saveState(){ localStorage.setItem(LS_STATE, JSON.stringify(state)); }
function loadState(){ const saved=localStorage.getItem(LS_STATE); if(saved){ try{ Object.assign(state, JSON.parse(saved)); }catch(e){} } }

/* ---------- Interface ---------- */
const timerEl   = document.getElementById('timerDisplay');
const startBtn  = document.getElementById('startBtn');
const pauseBtn  = document.getElementById('pauseBtn');
const resetBtn  = document.getElementById('resetBtn');
const sessionInfo = document.getElementById('sessionInfo');
const cycleInfo   = document.getElementById('cycleCount');
const body = document.body;

/* Render */
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

  // Change theme (background) 
  body.classList.remove('bg-work','bg-short','bg-long');
  if(state.phase==='work') body.classList.add('bg-work');
  else if(state.phase==='shortBreak') body.classList.add('bg-short');
  else body.classList.add('bg-long');
  
  if(state.remaining===0) body.classList.add('finished');
  else body.classList.remove('finished');
}

/* Duración de cada fase */
function getPhaseDuration(p){
  return p==='work'?WORK_TIME:p==='shortBreak'?SHORT_BREAK:LONG_BREAK;
}

/* Cambio de fase */
function nextPhase(){
  if(state.phase==='work'){
    state.cycle++; state.totalCycles++;
    if(state.cycle>=CYCLES_BEFORE_LONG){
      state.phase='longBreak'; state.cycle=0;
    }else{
      state.phase='shortBreak';
    }
  }else{
    state.phase='work';
  }
  state.remaining=getPhaseDuration(state.phase);
}

/* Temporizador */
let interval=null;
function startTimer(){
  if(state.running) return;
  state.running=true; render();
  interval=setInterval(()=>{
    if(state.remaining>0){
      state.remaining--; render();
    }else{
      playBeep();
      clearInterval(interval);
      state.running=false;
      nextPhase(); render(); saveState();
    }
    saveState();
  },1000);
}
function pauseTimer(){ if(!state.running) return; clearInterval(interval); state.running=false; render(); saveState();}
function resetTimer(){ clearInterval(interval); state={remaining:WORK_TIME,phase:'work',running:false,cycle:0,totalCycles:0}; render(); saveState();}

/* Sonido */
function playBeep(){
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  const osc=ctx.createOscillator(); const gain=ctx.createGain();
  osc.frequency.value=440; osc.type='sine';
  osc.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.2,ctx.currentTime);
  osc.start(); osc.stop(ctx.currentTime+0.2);
}

/* ---------- EVENT LISTENERS ---------- */
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

/* ==============================================================
   GESTIÓN DEL TEMA (selector + persistencia)
================================================================ */

/* Definimos los nombres legibles (para el <select>) */
const themes = {
  'theme-a': 'Minimalista (A)',
  'theme-b': 'Retro Dark (B)',
  'theme-c': 'Playful (C)'
};

/* Aplicar tema guardado o predeterminado */
function applyTheme(themeClass){
  // Quitamos cualquier tema previo
  document.body.classList.remove(...Object.keys(themes));
  document.body.classList.add(themeClass);
  // Guardamos la preferencia
  localStorage.setItem(LS_THEME, themeClass);
  // Sincronizamos el <select>
  const sel=document.getElementById('themeSelect');
  if(sel) sel.value = themeClass;
}

/* Cargar tema al iniciar */
function loadTheme(){
  const saved = localStorage.getItem(LS_THEME);
  const defaultTheme = 'theme-c';           // Cambia aquí el fallback si lo deseas
  const themeToApply = saved && themes[saved] ? saved : defaultTheme;
  applyTheme(themeToApply);
}

/* Listener del <select> */
document.getElementById('themeSelect').addEventListener('change', (e)=>{
  applyTheme(e.target.value);
});

/* ==============================================================
   INICIALIZACIÓN
================================================================ */
loadState();
loadTheme();
render();
