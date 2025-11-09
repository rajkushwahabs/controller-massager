// script.js - final simplified controls + controller mapping + presets
let gpIndex = null;
let running = false;
let continuousMode = false;
let runHandle = null;
let lastButtonStates = [];
let holdTimers = {}; // for hold repeats

// UI refs
const gpInfo = document.getElementById('gp-info');
const supportInfo = document.getElementById('support-info');
const controls = document.getElementById('controls');

const repeatsInput = document.getElementById('repeats');
const repDec = document.getElementById('repDec');
const repInc = document.getElementById('repInc');

const frequency = document.getElementById('frequency');
const freqVal = document.getElementById('freqVal');
const freqDec = document.getElementById('freqDec');
const freqInc = document.getElementById('freqInc');

const speed = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
const speedDec = document.getElementById('speedDec');
const speedInc = document.getElementById('speedInc');

const continuousCheckbox = document.getElementById('continuous');
const presetSelect = document.getElementById('presetSelect');

const playBtn = document.getElementById('playBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const emergencyBtn = document.getElementById('emergencyBtn');
const surpriseBtn = document.getElementById('surpriseBtn');

const outBar = document.getElementById('outBar').querySelector('.fill');
const outNum = document.getElementById('outNum');
const buttonsGrid = document.getElementById('buttons');
const logEl = document.getElementById('log');

// default output magnitude (we approximate since many controllers expose single actuator)
let outputMag = 0.6;

// controller button mapping (indexes -> action)
const mapping = {
  0: 'play',            // A
  1: 'toggleStartStop', // B
  2: 'emergency',       // X
  3: 'randomize',       // Y
  4: 'speedDown',       // LB
  5: 'speedUp',         // RB
  12: 'freqUp',         // DPadUp
  13: 'freqDown',       // DPadDown
  14: 'repeatsDown',    // DPadLeft
  15: 'repeatsUp',      // DPadRight
  9: 'toggleContinuous',// Start
  8: 'toggleButtons',   // Back
};

// Build button grid UI (show first 16 buttons by default)
const BUTTON_COUNT = 16;
for(let i=0;i<BUTTON_COUNT;i++){
  const b = document.createElement('div');
  b.className = 'button-dot';
  b.dataset.index = i;
  b.title = 'Button ' + i;
  b.textContent = 'B' + i;
  buttonsGrid.appendChild(b);
  // clickable to simulate press
  b.addEventListener('click', ()=> handleActionForIndex(i));
}

// helper: log
function log(msg){
  const d = document.createElement('div');
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.prepend(d);
}

// UI helpers
freqVal.textContent = frequency.value;
speedVal.textContent = speed.value;
frequency.addEventListener('input', ()=> freqVal.textContent = frequency.value);
speed.addEventListener('input', ()=> speedVal.textContent = speed.value);

repDec.addEventListener('click', ()=> adjustRepeats(-1));
repInc.addEventListener('click', ()=> adjustRepeats(1));
function adjustRepeats(delta){ let v = parseInt(repeatsInput.value||'1'); v = Math.max(1, Math.min(999, v+delta)); repeatsInput.value = v; }

freqDec && freqDec.addEventListener && freqDec.addEventListener('click', ()=> { frequency.value = Math.max(1, parseInt(frequency.value)-1); freqVal.textContent = frequency.value; });
freqInc && freqInc.addEventListener && freqInc.addEventListener('click', ()=> { frequency.value = Math.min(120, parseInt(frequency.value)+1); freqVal.textContent = frequency.value; });

// speed dec/inc placeholders (links may not exist in some DOM variants)
document.getElementById('speedDec')?.addEventListener('click', ()=> { speed.value = Math.max(100, parseInt(speed.value)-50); speedVal.textContent = speed.value; });
document.getElementById('speedInc')?.addEventListener('click', ()=> { speed.value = Math.min(3000, parseInt(speed.value)+50); speedVal.textContent = speed.value; });

continuousCheckbox.addEventListener('change', ()=> { continuousMode = continuousCheckbox.checked; log('Continuous: ' + continuousMode); });

presetSelect.addEventListener('change', ()=> {
  const p = presetSelect.value;
  applyPreset(p);
});

playBtn.addEventListener('click', ()=> playOnce());
startBtn.addEventListener('click', ()=> startRun());
stopBtn.addEventListener('click', ()=> stopRun());
emergencyBtn.addEventListener('click', ()=> emergencyStop());
surpriseBtn.addEventListener('click', ()=> { randomizeControls(); toggleTheme(); log('Surprise!'); });

// theme toggle (simple)
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', ()=> { document.body.classList.toggle('alt'); });

// initial: show controls
controls.classList.remove('hidden');

// Gamepad detection
window.addEventListener('gamepadconnected', (e)=> {
  gpIndex = e.gamepad.index;
  log('Gamepad connected: ' + e.gamepad.id + ' (index ' + gpIndex + ')');
  gpInfo.textContent = 'Detected: ' + e.gamepad.id;
  supportInfo.textContent = '';
  // init last states
  lastButtonStates = new Array(e.gamepad.buttons.length).fill(false);
});

window.addEventListener('gamepaddisconnected', (e)=> {
  log('Gamepad disconnected: ' + e.gamepad.id);
  gpIndex = null;
  gpInfo.textContent = 'No gamepad detected. Connect a controller and press any button.';
});

// Polling loop to read gamepad and update UI, detect presses
function pollGamepad(){
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gps[gpIndex] || gps.find(g=>g && g.connected) || null;
  if(!gp) {
    requestAnimationFrame(pollGamepad);
    return;
  }
  // update buttons UI
  for(let i=0;i<Math.min(BUTTON_COUNT, gp.buttons.length); i++){
    const pressed = gp.buttons[i].pressed;
    const el = buttonsGrid.querySelector('[data-index="'+i+'"]');
    if(el){
      if(pressed) el.classList.add('pressed'); else el.classList.remove('pressed');
    }
    // detect edges
    if(pressed && !lastButtonStates[i]){
      // button just pressed
      handleActionForIndex(i);
      // start hold logic for certain controls (repeats/freq/speed) if needed
      startHoldRepeat(i);
    }
    if(!pressed && lastButtonStates[i]){
      // released
      stopHoldRepeat(i);
    }
    lastButtonStates[i] = pressed;
  }
  // axes ignored here

  requestAnimationFrame(pollGamepad);
}
requestAnimationFrame(pollGamepad);

// Hold-repeat behavior for adjustments
function startHoldRepeat(index){
  const action = mapping[index];
  if(!action) return;
  if(['freqUp','freqDown','repeatsUp','repeatsDown','speedUp','speedDown'].includes(action)){
    // initial delay 300ms then repeat every 120ms
    holdTimers[index] = setTimeout(()=> {
      holdTimers[index] = setInterval(()=> handleActionForIndex(index), 120);
    }, 300);
  }
}
function stopHoldRepeat(index){
  if(holdTimers[index]){
    clearTimeout(holdTimers[index]);
    clearInterval(holdTimers[index]);
    delete holdTimers[index];
  }
}

// Execute mapped action
function handleActionForIndex(index){
  const action = mapping[index];
  if(!action) return;
  switch(action){
    case 'play': playOnce(); break;
    case 'toggleStartStop': toggleStartStop(); break;
    case 'emergency': emergencyStop(); break;
    case 'randomize': randomizeControls(); break;
    case 'speedDown': speed.value = Math.max(100, parseInt(speed.value)-50); speedVal.textContent = speed.value; break;
    case 'speedUp': speed.value = Math.min(3000, parseInt(speed.value)+50); speedVal.textContent = speed.value; break;
    case 'freqUp': frequency.value = Math.min(120, parseInt(frequency.value)+1); freqVal.textContent = frequency.value; break;
    case 'freqDown': frequency.value = Math.max(1, parseInt(frequency.value)-1); freqVal.textContent = frequency.value; break;
    case 'repeatsDown': repeatsInput.value = Math.max(1, parseInt(repeatsInput.value)-1); break;
    case 'repeatsUp': repeatsInput.value = Math.min(999, parseInt(repeatsInput.value)+1); break;
    case 'toggleContinuous': continuousCheckbox.checked = !continuousCheckbox.checked; continuousMode = continuousCheckbox.checked; log('Continuous: ' + continuousMode); break;
    case 'toggleButtons': toggleButtonsPanel(); break;
  }
}

// Toggle buttons panel visibility
function toggleButtonsPanel(){ 
  const panel = document.querySelector('.gamepad-panel');
  panel.style.display = (panel.style.display === 'none') ? '' : 'none';
}

// Presets apply simple settings for continuous mode
function applyPreset(p){
  if(!p) return;
  switch(p){
    case 'gentle':
      frequency.value = 8; freqVal.textContent = frequency.value;
      speed.value = 1200; speedVal.textContent = speed.value;
      repeatsInput.value = 2;
      outputMag = 0.35;
      break;
    case 'medium':
      frequency.value = 18; freqVal.textContent = frequency.value;
      speed.value = 800; speedVal.textContent = speed.value;
      repeatsInput.value = 3;
      outputMag = 0.6;
      break;
    case 'strong':
      frequency.value = 40; freqVal.textContent = frequency.value;
      speed.value = 600; speedVal.textContent = speed.value;
      repeatsInput.value = 4;
      outputMag = 0.9;
      break;
    case 'pulse':
      frequency.value = 20; freqVal.textContent = frequency.value;
      speed.value = 400; speedVal.textContent = speed.value;
      repeatsInput.value = 6;
      outputMag = 0.8;
      break;
    case 'wave':
      frequency.value = 12; freqVal.textContent = frequency.value;
      speed.value = 900; speedVal.textContent = speed.value;
      repeatsInput.value = 3;
      outputMag = 0.6;
      break;
    case 'random':
      randomizeControls();
      break;
  }
  log('Preset applied: ' + p);
}

// Play single sequence (one pattern based on frequency & speed & repeats)
async function playOnce(){
  if(running){ log('Already running'); return; }
  log('Play once');
  await runPatternCycle({freq: parseInt(frequency.value), speedMs: parseInt(speed.value), repeats: 1, mag: outputMag});
  log('Pattern finished.');
}

// Start continuous or finite run
function startRun(){
  if(running){ log('Already running'); return; }
  running = true;
  stopBtn.disabled = false;
  playBtn.disabled = true;
  startBtn.disabled = true;
  log('Start requested. Continuous=' + continuousCheckbox.checked);

  if(continuousCheckbox.checked){
    // continuous loop (run back-to-back until stopped)
    (async function loopContinuous(){
      while(running && continuousCheckbox.checked){
        await runPatternCycle({freq: parseInt(frequency.value), speedMs: parseInt(speed.value), repeats: parseInt(repeatsInput.value), mag: outputMag});
        // tiny pause if needed
        await sleep(80);
      }
      // ended
      running = false;
      stopBtn.disabled = true;
      playBtn.disabled = false;
      startBtn.disabled = false;
      log('Continuous stopped.');
    })();
  } else {
    // finite repeats run
    (async function finiteRun(){
      const reps = parseInt(repeatsInput.value) || 1;
      for(let i=0;i<reps && running;i++){
        await runPatternCycle({freq: parseInt(frequency.value), speedMs: parseInt(speed.value), repeats:1, mag: outputMag});
        await sleep(60);
      }
      running = false;
      stopBtn.disabled = true;
      playBtn.disabled = false;
      startBtn.disabled = false;
      log('Finite run finished.');
    })();
  }
}

// Stop graceful
function stopRun(){
  if(!running){ log('Nothing running'); return; }
  running = false;
  // Let current micro-pulse finish; handlers check running flag
  log('Stop requested (graceful).');
}

// Emergency immediate stop
function emergencyStop(){
  if(!running){ log('Emergency stop — nothing running'); return; }
  running = false;
  // Attempt to cancel any ongoing vibrations by sending a tiny zero-duration (best-effort)
  try{
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gps[gpIndex] || gps.find(g=>g && g.connected) || null;
    if(gp && gp.vibrationActuator && typeof gp.vibrationActuator.playEffect === 'function'){
      gp.vibrationActuator.playEffect('dual-rumble',{duration:1, strongMagnitude:0, weakMagnitude:0});
    } else if(gp && gp.hapticActuators && gp.hapticActuators.length>0){
      gp.hapticActuators[0].pulse(0,1).catch(()=>{});
    }
  }catch(e){}
  stopBtn.disabled = true;
  playBtn.disabled = false;
  startBtn.disabled = false;
  log('Emergency STOP executed.');
}

// Run one pattern cycle: uses frequency to create short bursts for a few cycles
async function runPatternCycle({freq=20, speedMs=800, repeats=1, mag=0.6}={}){
  // We'll perform 'repeats' bursts per call; each burst contains N cycles based on freq and burst length derived from speedMs
  const burstCycles = 6; // number of small on/off in one burst
  const periodMs = Math.max(8, Math.floor(1000 / Math.max(1, freq)));
  const onMs = Math.max(8, Math.floor(periodMs * 0.6));
  const offMs = Math.max(0, periodMs - onMs);

  for(let r=0;r<repeats && running;r++){
    for(let c=0;c<burstCycles && running;c++){
      await sendHaptic(mag, onMs);
      if(offMs>0) await sleep(offMs);
    }
    // gap between bursts influenced by speedMs
    await sleep(Math.max(40, Math.floor(speedMs / Math.max(1, repeats))));
  }
}

// send haptic vibration (best-effort across browser variants)
async function sendHaptic(magnitude=0.6, ms=200){
  updateOutput(magnitude);
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gps[gpIndex] || gps.find(g=>g && g.connected) || null;
  if(!gp) { await sleep(ms); updateOutput(0); return; }

  try{
    if(gp.vibrationActuator && typeof gp.vibrationActuator.playEffect === 'function'){
      // map magnitude to both motors as best-effort
      await gp.vibrationActuator.playEffect('dual-rumble',{duration: ms, strongMagnitude: magnitude, weakMagnitude: magnitude});
    } else if(gp.hapticActuators && gp.hapticActuators.length>0){
      await gp.hapticActuators[0].pulse(magnitude, ms);
    } else {
      // no haptics
      await sleep(ms);
    }
  }catch(e){
    // ignore but log
    log('Haptic error: ' + (e && e.message ? e.message : e));
    await sleep(ms);
  }
  updateOutput(0);
}

// update visual output bar
function updateOutput(v){
  outBar.style.width = Math.round(v*100) + '%';
  outNum.textContent = v.toFixed(2);
}

// simple utils
function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }

// randomize controls (non-destructive)
function randomizeControls(){
  repeatsInput.value = Math.floor(1 + Math.random()*8);
  frequency.value = Math.floor(6 + Math.random()*60); freqVal.textContent = frequency.value;
  speed.value = Math.floor(300 + Math.random()*1200); speedVal.textContent = speed.value;
  log('Controls randomized');
}

// Toggle start/stop convenience
function toggleStartStop(){ if(running) stopRun(); else startRun(); }

// poll for gamepad updates (buttons visual only)
function tick(){
  // update visual highlights already handled by pollGamepad via RAF
  requestAnimationFrame(tick);
}
tick();

// Start polling gamepad read loop
(function(){
  // start pollGamepad earlier function if not already (it was requested via RAF)
  // we'll just ensure mapping available
  if(typeof navigator.getGamepads === 'function') {
    requestAnimationFrame(pollGamepad);
  }
})();

// respond to ESC key as emergency
window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') emergencyStop(); });

log('Ready.');