// script.js - visualizer + advanced controls + theme toggle (polished UI)
let gpIndex = null;
let loopHandle = null;
let runningContinuous = false;

const gpInfo = document.getElementById('gp-info');
const supportInfo = document.getElementById('support-info');
const controls = document.getElementById('controls');

const strong = document.getElementById('strong');
const weak = document.getElementById('weak');
const frequency = document.getElementById('frequency');
const duty = document.getElementById('duty');
const speed = document.getElementById('speed');
const duration = document.getElementById('duration');
const repeats = document.getElementById('repeats');
const motorTarget = document.getElementById('motorTarget');
const patternSelect = document.getElementById('patternSelect');

const strongVal = document.getElementById('strongVal');
const weakVal = document.getElementById('weakVal');
const freqVal = document.getElementById('freqVal');
const dutyVal = document.getElementById('dutyVal');
const speedVal = document.getElementById('speedVal');
const durVal = document.getElementById('durVal');
const repeatsVal = document.getElementById('repeatsVal');

const pulseBtn = document.getElementById('pulseBtn');
const loopBtn = document.getElementById('loopBtn');
const stopBtn = document.getElementById('stopBtn');
const randomBtn = document.getElementById('randomBtn');

const themeToggle = document.getElementById('themeToggle');
const changeEverything = document.getElementById('changeEverything');

const logEl = document.getElementById('log');

const strongBar = document.getElementById('strongBar').querySelector('.fill');
const weakBar = document.getElementById('weakBar').querySelector('.fill');
const strongNum = document.getElementById('strongNum');
const weakNum = document.getElementById('weakNum');
const buttonsContainer = document.getElementById('buttons');
const axesContainer = document.getElementById('axes');

[strong, weak, frequency, duty, speed, duration, repeats].forEach(el => {
  el.addEventListener('input', updateLabels);
});
function updateLabels(){
  strongVal.textContent = strong.value;
  weakVal.textContent = weak.value;
  freqVal.textContent = frequency.value;
  dutyVal.textContent = duty.value;
  speedVal.textContent = speed.value;
  durVal.textContent = duration.value;
  repeatsVal.textContent = repeats.value;
}

window.addEventListener("gamepadconnected", (e) => {
  gpIndex = e.gamepad.index;
  log(`Gamepad connected: ${e.gamepad.id} (index ${gpIndex})`);
  updateUI();
});
window.addEventListener("gamepaddisconnected", (e) => {
  log(`Gamepad disconnected: ${e.gamepad.id}`);
  gpIndex = null;
  updateUI();
});

function scanGamepads() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < gps.length; i++) {
    if (gps[i] && gps[i].connected) {
      if (gpIndex === null) {
        gpIndex = gps[i].index;
        log(`Gamepad detected: ${gps[i].id} (index ${gpIndex})`);
        updateUI();
      }
      return;
    }
  }
  gpIndex = null;
  updateUI();
}

function getGamepad() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  if (gpIndex !== null && gps[gpIndex]) return gps[gpIndex];
  for (let g of gps) if (g && g.connected) return g;
  return null;
}

function updateUI() {
  const gp = getGamepad();
  if (!gp) {
    gpInfo.textContent = 'No gamepad detected. Connect a controller and press any button.';
    controls.classList.add('hidden');
    supportInfo.textContent = '';
    clearVisualizer();
    return;
  }
  gpInfo.textContent = `Detected: ${gp.id}`;
  controls.classList.remove('hidden');

  const hasHaptics = gp.hapticActuators && gp.hapticActuators.length > 0;
  const alt = gp.vibrationActuator && typeof gp.vibrationActuator.playEffect === 'function';
  if (hasHaptics || alt) {
    supportInfo.textContent = `Haptics available (actuators: ${ (gp.hapticActuators || []).length || (alt ? 1 : 0) }).`;
  } else {
    supportInfo.textContent = 'No haptic actuators exposed by this controller in this browser.';
  }
}

// visualizer helpers
function clearVisualizer(){
  strongBar.style.width = '0%';
  weakBar.style.width = '0%';
  strongNum.textContent = '0.00';
  weakNum.textContent = '0.00';
  buttonsContainer.innerHTML = '';
  axesContainer.innerHTML = '';
}

function renderGamepadState(){
  const gp = getGamepad();
  if (!gp) return;
  // Buttons
  buttonsContainer.innerHTML = '';
  gp.buttons.forEach((b, i) => {
    const d = document.createElement('span');
    d.className = 'button-dot' + (b.pressed ? ' pressed' : '');
    d.textContent = 'B' + i + (b.pressed ? ' ✓' : '');
    buttonsContainer.appendChild(d);
  });
  // Axes
  axesContainer.innerHTML = '';
  gp.axes.forEach((a, i) => {
    const row = document.createElement('div');
    row.className = 'axis-row';
    const label = document.createElement('div');
    label.className = 'axis-label';
    label.textContent = 'A' + i;
    const bar = document.createElement('div');
    bar.className = 'axis-bar';
    const fill = document.createElement('div');
    fill.className = 'axis-fill';
    const pct = Math.round((a + 1) / 2 * 100);
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    row.appendChild(label);
    row.appendChild(bar);
    axesContainer.appendChild(row);
  });
}

// haptics sending
async function playHaptics({strongMag=0, weakMag=0, ms=200}) {
  const gp = getGamepad();
  if (!gp) { log('No controller available'); return; }

  // update visualizer immediately
  updateBars(strongMag, weakMag);

  if (gp.hapticActuators && gp.hapticActuators.length > 0) {
    try {
      const mag = Math.max(strongMag, weakMag);
      await gp.hapticActuators[0].pulse(parseFloat(mag), parseInt(ms));
      log(`pulse (hapticActuators) mag=${mag} dur=${ms}`);
    } catch (e) {
      log('Error (hapticActuators): ' + e.message);
    }
    setTimeout(()=> updateBars(0,0), Math.max(50, ms));
    return;
  }

  if (gp.vibrationActuator && typeof gp.vibrationActuator.playEffect === 'function') {
    try {
      await gp.vibrationActuator.playEffect('dual-rumble', {
        duration: parseInt(ms),
        strongMagnitude: parseFloat(strongMag),
        weakMagnitude: parseFloat(weakMag)
      });
      log(`playEffect dual-rumble s=${strongMag} w=${weakMag} dur=${ms}`);
    } catch (e) {
      log('Error (vibrationActuator): ' + e.message);
    }
    setTimeout(()=> updateBars(0,0), Math.max(50, ms));
    return;
  }

  log('No supported haptic API exposed by this controller.');
  setTimeout(()=> updateBars(0,0), 120);
}

function updateBars(s,w){
  strongBar.style.width = Math.round(s*100) + '%';
  weakBar.style.width = Math.round(w*100) + '%';
  strongNum.textContent = s.toFixed(2);
  weakNum.textContent = w.toFixed(2);
}

// Patterns
async function singlePatternOnce(opts={}) {
  const rep = opts.repeats || 1;
  for (let r=0; r<rep; r++) {
    await runPatternCycle(opts);
    if (r < rep-1) await sleep(opts.speedMs || 200);
  }
}

async function runPatternCycle({freq=20, duty=0.5, strongMag=0.6, weakMag=0.6, durationOverride=null, motor='both'}={}) {
  let s = strongMag, w = weakMag;
  if (motor === 'strong') w = 0;
  if (motor === 'weak') s = 0;
  if (durationOverride !== null && durationOverride > 0) {
    await playHaptics({strongMag: s, weakMag: w, ms: durationOverride});
    return;
  }
  const periodMs = Math.max(10, Math.floor(1000 / freq));
  const onMs = Math.max(5, Math.floor(periodMs * duty));
  const offMs = Math.max(0, periodMs - onMs);
  const cycles = Math.max(1, Math.floor( (periodMs*6) / periodMs ));
  for (let i=0;i<cycles;i++) {
    await playHaptics({strongMag: s, weakMag: w, ms: onMs});
    if (offMs > 0) await sleep(offMs);
  }
}

// UI handlers
pulseBtn.addEventListener('click', async () => {
  const opts = readOptions();
  log('Sending single pattern...');
  await singlePatternOnce(opts);
  log('Pattern finished.');
});

let continuous = false;
loopBtn.addEventListener('click', () => {
  if (continuous) return;
  continuous = true;
  loopBtn.textContent = 'Running…';
  stopBtn.disabled = false;
  startContinuous();
});
stopBtn.addEventListener('click', () => {
  stopContinuous();
});
randomBtn.addEventListener('click', () => {
  randomizeControls();
});

// Theme toggling
function applyTheme(theme){
  if(theme === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  try { localStorage.setItem('chm_theme', theme); } catch(e){}
}
function toggleTheme(){
  const cur = document.body.classList.contains('dark') ? 'dark' : 'light';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}
themeToggle.addEventListener('click', toggleTheme);

// "Change Everything" button: toggle theme + randomize controls
changeEverything.addEventListener('click', () => {
  toggleTheme();
  randomizeControls();
  log('Change Everything: theme toggled + controls randomized');
});

// On load, restore theme (we default to dark here)
(function(){
  try {
    const saved = localStorage.getItem('chm_theme') || 'dark';
    applyTheme(saved);
    if(saved === 'dark') document.body.classList.add('dark');
  } catch(e){}
})();

function readOptions() {
  return {
    strong: parseFloat(strong.value),
    weak: parseFloat(weak.value),
    freq: parseFloat(frequency.value),
    duty: parseFloat(duty.value)/100.0,
    speedMs: parseInt(speed.value),
    durationOverride: parseInt(duration.value) || null,
    repeats: parseInt(repeats.value),
    motor: motorTarget.value,
    pattern: patternSelect.value
  };
}

async function startContinuous(){
  const opts = readOptions();
  runningContinuous = true;
  log('Started continuous run');
  loopHandle = setInterval(async () => {
    if (!runningContinuous) return;
    const o = readOptions();
    if (o.pattern === 'single') {
      await singlePatternOnce(o);
    } else if (o.pattern === 'buzz' || o.pattern === 'staccato') {
      const periodMs = Math.max(10, Math.floor(1000 / o.freq));
      const onMs = Math.max(5, Math.floor(periodMs * o.duty));
      const offMs = Math.max(0, periodMs - onMs);
      for (let r=0;r<o.repeats;r++) {
        await playHaptics({
          strongMag: (o.motor==='weak')?0:o.strong,
          weakMag: (o.motor==='strong')?0:o.weak,
          ms: onMs
        });
        if (offMs>0) await sleep(offMs);
      }
    } else if (o.pattern === 'wave') {
      const steps = 5;
      for (let i=1;i<=steps;i++){
        const scale = i/steps;
        await playHaptics({
          strongMag: ((o.motor==='weak')?0:o.strong)*scale,
          weakMag: ((o.motor==='strong')?0:o.weak)*scale,
          ms: Math.max(20, Math.floor(o.speedMs/ (steps*1.5)))
        });
        await sleep(40);
      }
      for (let i=steps;i>=1;i--){
        const scale = i/steps;
        await playHaptics({
          strongMag: ((o.motor==='weak')?0:o.strong)*scale,
          weakMag: ((o.motor==='strong')?0:o.weak)*scale,
          ms: Math.max(20, Math.floor(o.speedMs/ (steps*1.5)))
        });
        await sleep(40);
      }
    }
  }, Math.max(60, opts.speedMs || 500));
}

function stopContinuous(){
  runningContinuous = false;
  if (loopHandle) {
    clearInterval(loopHandle);
    loopHandle = null;
  }
  loopBtn.textContent = 'Start';
  stopBtn.disabled = true;
  log('Stopped continuous run');
}

function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }

function randomizeControls(){
  strong.value = (Math.random()*0.9).toFixed(2);
  weak.value = (Math.random()*0.9).toFixed(2);
  frequency.value = Math.floor(5 + Math.random()*70);
  duty.value = Math.floor(10 + Math.random()*80);
  speed.value = Math.floor(200 + Math.random()*2000);
  duration.value = Math.floor(50 + Math.random()*800);
  repeats.value = Math.floor(1 + Math.random()*8);
  patternSelect.selectedIndex = Math.floor(Math.random()*patternSelect.options.length);
  motorTarget.selectedIndex = Math.floor(Math.random()*motorTarget.options.length);
  updateLabels();
  log('Randomized controls');
}

function log(msg) {
  const t = document.createElement('div');
  t.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.prepend(t);
}

// poll and render gamepad state frequently
function tick(){
  renderGamepadState();
  requestAnimationFrame(tick);
}

scanGamepads();
setInterval(scanGamepads, 2000);
setInterval(updateUI, 1000);
updateLabels();
tick();
