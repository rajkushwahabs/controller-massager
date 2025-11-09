// script.js — Modes: Preset / Basic / Advanced / Renzy
let gpIndex = null;
let running = false;
let untilStopped = false;
let outputMag = 0.6;
let lastButtonStates = [];
let holdTimers = {};
const controls = document.getElementById('controls');
const gpInfo = document.getElementById('gp-info');
const supportInfo = document.getElementById('support-info');
const modeSelect = document.getElementById('modeSelect');
const modeStatus = document.getElementById('modeStatus');
const runningStatus = document.getElementById('runningStatus');
const logEl = document.getElementById('log');
const presetPanel = document.getElementById('presetPanel');
const basicPanel = document.getElementById('basicPanel');
const advancedPanel = document.getElementById('advancedPanel');
const renzyPanel = document.getElementById('renzyPanel');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const playBtn = document.getElementById('playBtn');
const emergencyBtn = document.getElementById('emergencyBtn');
const outBar = document.getElementById('outBar').querySelector('.fill');
const outNum = document.getElementById('outNum');
const durMin = document.getElementById('durMin');
const durSec = document.getElementById('durSec');
const untilStoppedCheckbox = document.getElementById('untilStopped');
const presetList = document.getElementById('presetList');
const basicIntensity = document.getElementById('basicIntensity');
const basicFreq = document.getElementById('basicFreq');
const basicSpeed = document.getElementById('basicSpeed');
const basicIntensityVal = document.getElementById('basicIntensityVal');
const basicFreqVal = document.getElementById('basicFreqVal');
const basicSpeedVal = document.getElementById('basicSpeedVal');
const advLeft = document.getElementById('advLeft');
const advRight = document.getElementById('advRight');
const advFreq = document.getElementById('advFreq');
const advPulse = document.getElementById('advPulse');
const advRepeats = document.getElementById('advRepeats');
const advLeftVal = document.getElementById('advLeftVal');
const advRightVal = document.getElementById('advRightVal');
const advFreqVal = document.getElementById('advFreqVal');
const advPulseVal = document.getElementById('advPulseVal');
const mapping = {0:'play',1:'toggleStartStop',2:'emergency',3:'randomize',4:'speedDown',5:'speedUp',12:'freqUp',13:'freqDown',14:'repeatsDown',15:'repeatsUp',9:'toggleContinuous',8:'noop'};
controls.classList.remove('hidden');
modeSelect.addEventListener('change', ()=> switchMode(modeSelect.value));
untilStoppedCheckbox.addEventListener('change', ()=> untilStopped = untilStoppedCheckbox.checked);
startBtn.addEventListener('click', ()=> startRun());
stopBtn.addEventListener('click', ()=> stopRun());
playBtn.addEventListener('click', ()=> playOnce());
emergencyBtn.addEventListener('click', ()=> emergencyStop());
basicIntensity.addEventListener('input', ()=> basicIntensityVal.textContent = parseFloat(basicIntensity.value).toFixed(2));
basicFreq.addEventListener('input', ()=> basicFreqVal.textContent = basicFreq.value);
basicSpeed.addEventListener('input', ()=> basicSpeedVal.textContent = basicSpeed.value);
advLeft.addEventListener('input', ()=> advLeftVal.textContent = parseFloat(advLeft.value).toFixed(2));
advRight.addEventListener('input', ()=> advRightVal.textContent = parseFloat(advRight.value).toFixed(2));
advFreq.addEventListener('input', ()=> advFreqVal.textContent = advFreq.value);
advPulse.addEventListener('input', ()=> advPulseVal.textContent = advPulse.value);
function applyPresetKey(key){
  switch(key){
    case 'gentle_swell': basicIntensity.value=0.35; basicFreq.value=8; basicSpeed.value=1200; basicIntensityVal.textContent='0.35'; basicFreqVal.textContent='8'; basicSpeedVal.textContent='1200'; outputMag=0.35; break;
    case 'short_buzz': basicIntensity.value=0.6; basicFreq.value=28; basicSpeed.value=300; basicIntensityVal.textContent='0.6'; basicFreqVal.textContent='28'; basicSpeedVal.textContent='300'; outputMag=0.7; break;
    case 'long_wave': basicIntensity.value=0.5; basicFreq.value=12; basicSpeed.value=1000; basicIntensityVal.textContent='0.5'; basicFreqVal.textContent='12'; basicSpeedVal.textContent='1000'; outputMag=0.5; break;
    case 'pulse_rapid': basicIntensity.value=0.8; basicFreq.value=40; basicSpeed.value=200; basicIntensityVal.textContent='0.8'; basicFreqVal.textContent='40'; basicSpeedVal.textContent='200'; outputMag=0.85; break;
    case 'slow_pulse': basicIntensity.value=0.4; basicFreq.value=6; basicSpeed.value=900; basicIntensityVal.textContent='0.4'; basicFreqVal.textContent='6'; basicSpeedVal.textContent='900'; outputMag=0.4; break;
    case 'random_mix': randomizeControls(); break;
    case 'strong_burst': basicIntensity.value=0.95; basicFreq.value=50; basicSpeed.value=500; basicIntensityVal.textContent='0.95'; basicFreqVal.textContent='50'; basicSpeedVal.textContent='500'; outputMag=0.95; break;
    case 'heartbeat': basicIntensity.value=0.7; basicFreq.value=10; basicSpeed.value=700; basicIntensityVal.textContent='0.7'; basicFreqVal.textContent='10'; basicSpeedVal.textContent='700'; outputMag=0.7; break;
    case 'tingle': basicIntensity.value=0.45; basicFreq.value=24; basicSpeed.value=300; basicIntensityVal.textContent='0.45'; basicFreqVal.textContent='24'; basicSpeedVal.textContent='300'; outputMag=0.45; break;
    case 'relax': basicIntensity.value=0.3; basicFreq.value=6; basicSpeed.value=1400; basicIntensityVal.textContent='0.3'; basicFreqVal.textContent='6'; basicSpeedVal.textContent='1400'; outputMag=0.3; break;
    default: break;
  }
}
function switchMode(mode){
  presetPanel.classList.add('hidden'); basicPanel.classList.add('hidden'); advancedPanel.classList.add('hidden'); renzyPanel.classList.add('hidden');
  modeStatus.textContent = 'Mode: ' + (mode.charAt(0).toUpperCase() + mode.slice(1));
  if(mode==='preset') presetPanel.classList.remove('hidden');
  if(mode==='basic') basicPanel.classList.remove('hidden');
  if(mode==='advanced') advancedPanel.classList.remove('hidden');
  if(mode==='renzy') renzyPanel.classList.remove('hidden');
}
function robustScan(){
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for(let i=0;i<gps.length;i++){ const g=gps[i]; if(g && g.connected){ if(gpIndex===null||gpIndex!==g.index){ gpIndex=g.index; lastButtonStates=new Array(g.buttons.length).fill(false); log('Gamepad detected: '+g.id); gpInfo.textContent='Detected: '+g.id; } controls.classList.remove('hidden'); supportInfo.textContent=''; return; } }
  gpIndex=null; gpInfo.textContent='No gamepad detected. Connect a controller and press any button.'; controls.classList.add('hidden');
}
async function playOnce(){
  if(running){ log('Already running'); return; }
  log('Test vibration (one pattern)');
  if(modeSelect.value === 'renzy'){ await runRenzyOnce(); }
  else if(modeSelect.value === 'preset'){ const p = presetList.value || 'gentle_swell'; applyPresetKey(p); await runPattern({mag: outputMag, freq: parseInt(basicFreq.value), speed: parseInt(basicSpeed.value), repeats: 1}); }
  else if(modeSelect.value === 'basic'){ await runPattern({mag: parseFloat(basicIntensity.value), freq: parseInt(basicFreq.value), speed: parseInt(basicSpeed.value), repeats:1}); }
  else { await runPattern({mag: Math.max(parseFloat(advLeft.value), parseFloat(advRight.value)), freq: parseInt(advFreq.value), speed: parseInt(advPulse.value), repeats: parseInt(advRepeats.value)}); }
  log('Test finished');
}
function startRun(){
  if(running){ log('Already running'); return; }
  running = true; runningStatus.textContent = 'Running'; stopBtn.disabled = false; startBtn.disabled = true; playBtn.disabled = true;
  untilStopped = untilStoppedCheckbox.checked;
  const totalSecs = untilStopped ? Infinity : (parseInt(durMin.value||0)*60 + parseInt(durSec.value||0));
  const mode = modeSelect.value;
  if(mode === 'renzy'){ runRenzyLoop(totalSecs); return; }
  (async function loop(){ const startTs=Date.now(); while(running){ if(!untilStopped){ const elapsed=Math.floor((Date.now()-startTs)/1000); if(elapsed>=totalSecs) break; }
    if(mode==='preset'){ const p=presetList.value||'gentle_swell'; applyPresetKey(p); await runPattern({mag: outputMag, freq: parseInt(basicFreq.value), speed: parseInt(basicSpeed.value), repeats:1}); }
    else if(mode==='basic'){ await runPattern({mag: parseFloat(basicIntensity.value), freq: parseInt(basicFreq.value), speed: parseInt(basicSpeed.value), repeats:1}); }
    else if(mode==='advanced'){ await runPattern({mag: Math.max(parseFloat(advLeft.value), parseFloat(advRight.value)), freq: parseInt(advFreq.value), speed: parseInt(advPulse.value), repeats: parseInt(advRepeats.value)}); }
    await sleep(80); }
    running=false; runningStatus.textContent='Stopped'; stopBtn.disabled=true; startBtn.disabled=false; playBtn.disabled=false; log('Run finished'); })();
}
async function runRenzyLoop(totalSecs){
  log('Renzy mode engaged: MAX intensity nonstop (use Emergency to stop)');
  const startTs=Date.now();
  while(running){ if(!untilStopped){ const elapsed=Math.floor((Date.now()-startTs)/1000); if(elapsed>=totalSecs) break; }
    await sendHaptic(1.0, 200); await sleep(40); }
  running=false; runningStatus.textContent='Stopped'; stopBtn.disabled=true; startBtn.disabled=false; playBtn.disabled=false; log('Renzy finished');
}
function stopRun(){ if(!running){ log('Nothing running'); return; } running=false; runningStatus.textContent='Stopping...'; log('Stop requested'); }
function emergencyStop(){ running=false; runningStatus.textContent='Emergency STOP'; try{ const gps=navigator.getGamepads?navigator.getGamepads():[]; const gp=(gpIndex!==null && gps[gpIndex])?gps[gpIndex]:(gps.find(g=>g && g.connected)||null); if(gp){ if(gp.vibrationActuator && typeof gp.vibrationActuator.playEffect==='function'){ gp.vibrationActuator.playEffect('dual-rumble',{duration:1, strongMagnitude:0, weakMagnitude:0}); } else if(gp.hapticActuators && gp.hapticActuators.length>0){ gp.hapticActuators[0].pulse(0,1).catch(()=>{}); } } }catch(e){} stopBtn.disabled=true; startBtn.disabled=false; playBtn.disabled=false; log('Emergency STOP executed'); }
async function runPattern({mag=0.6, freq=20, speed=800, repeats=1} = {}){ const burstCycles=6; const periodMs=Math.max(8, Math.floor(1000/Math.max(1,freq))); const onMs=Math.max(8, Math.floor(periodMs*0.6)); const offMs=Math.max(0, periodMs-onMs); for(let r=0;r<repeats && running;r++){ for(let c=0;c<burstCycles && running;c++){ await sendHaptic(mag, onMs); if(offMs>0) await sleep(offMs); } await sleep(Math.max(40, Math.floor(speed/Math.max(1,repeats)))); } }
async function sendHaptic(magnitude=0.6, ms=200){ updateOutput(magnitude); const gps=navigator.getGamepads?navigator.getGamepads():[]; const gp=(gpIndex!==null && gps[gpIndex])?gps[gpIndex]:(gps.find(g=>g && g.connected)||null); if(!gp){ await sleep(ms); updateOutput(0); return; } try{ if(gp.vibrationActuator && typeof gp.vibrationActuator.playEffect==='function'){ await gp.vibrationActuator.playEffect('dual-rumble',{duration:ms, strongMagnitude:magnitude, weakMagnitude:magnitude}); } else if(gp.hapticActuators && gp.hapticActuators.length>0){ await gp.hapticActuators[0].pulse(magnitude, ms); } else { await sleep(ms); } }catch(e){ log('Haptic error: '+(e && e.message?e.message:e)); await sleep(ms); } updateOutput(0); }
function updateOutput(v){ outBar.style.width = Math.round(v*100) + '%'; outNum.textContent = v.toFixed(2); }
function randomizeControls(){ basicIntensity.value=(0.2+Math.random()*0.7).toFixed(2); basicFreq.value=Math.floor(6+Math.random()*60); basicSpeed.value=Math.floor(300+Math.random()*1200); basicIntensityVal.textContent=basicIntensity.value; basicFreqVal.textContent=basicFreq.value; basicSpeedVal.textContent=basicSpeed.value; log('Randomized controls'); }
function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }
function log(msg){ const d=document.createElement('div'); d.textContent='['+new Date().toLocaleTimeString()+'] '+msg; logEl.prepend(d); }
function robustScan(){ const gps=navigator.getGamepads?navigator.getGamepads():[]; for(let i=0;i<gps.length;i++){ const g=gps[i]; if(g && g.connected){ if(gpIndex===null||gpIndex!==g.index){ gpIndex=g.index; lastButtonStates=new Array(g.buttons.length).fill(false); log('Gamepad detected: '+g.id); gpInfo.textContent='Detected: '+g.id; } controls.classList.remove('hidden'); supportInfo.textContent=''; return; } } gpIndex=null; gpInfo.textContent='No gamepad detected. Connect a controller and press any button.'; controls.classList.add('hidden'); }
function pollLoop(){ const gps=navigator.getGamepads?navigator.getGamepads():[]; const gp=(gpIndex!==null && gps[gpIndex])?gps[gpIndex]:(gps.find(g=>g && g.connected)||null); if(gp){ if(gpIndex===null){ gpIndex=gp.index; lastButtonStates=new Array(gp.buttons.length).fill(false); log('Gamepad now index: '+gpIndex); } for(let i=0;i<gp.buttons.length;i++){ const pressed=!!gp.buttons[i].pressed; const prev=!!lastButtonStates[i]; if(pressed && !prev){ handleActionForIndex(i); startHoldRepeat(i); } if(!pressed && prev){ stopHoldRepeat(i); } lastButtonStates[i]=pressed; } } requestAnimationFrame(pollLoop); }
function startHoldRepeat(index){ const action=mapping[index]; if(!action) return; if(['freqUp','freqDown','repeatsUp','repeatsDown','speedUp','speedDown'].includes(action)){ holdTimers[index]=setTimeout(()=>{ holdTimers[index]=setInterval(()=>handleActionForIndex(index),120); },300); } }
function stopHoldRepeat(index){ if(holdTimers[index]){ clearTimeout(holdTimers[index]); clearInterval(holdTimers[index]); delete holdTimers[index]; } }
function handleActionForIndex(index){ const action=mapping[index]; if(!action) return; switch(action){ case 'play': playOnce(); break; case 'toggleStartStop': if(running) stopRun(); else startRun(); break; case 'emergency': emergencyStop(); break; case 'randomize': randomizeControls(); break; case 'speedDown': basicSpeed.value=Math.max(100,parseInt(basicSpeed.value)-50); basicSpeedVal.textContent=basicSpeed.value; break; case 'speedUp': basicSpeed.value=Math.min(3000,parseInt(basicSpeed.value)+50); basicSpeedVal.textContent=basicSpeed.value; break; case 'freqUp': basicFreq.value=Math.min(120,parseInt(basicFreq.value)+1); basicFreqVal.textContent=basicFreq.value; break; case 'freqDown': basicFreq.value=Math.max(1,parseInt(basicFreq.value)-1); basicFreqVal.textContent=basicFreq.value; break; case 'repeatsDown': advRepeats.value=Math.max(1,parseInt(advRepeats.value)-1); break; case 'repeatsUp': advRepeats.value=Math.min(100,parseInt(advRepeats.value)+1); break; case 'toggleContinuous': untilStoppedCheckbox.checked = !untilStoppedCheckbox.checked; untilStopped = untilStoppedCheckbox.checked; log('Until stopped: '+untilStopped); break; default: break; } }
robustScan(); setInterval(robustScan,1200); requestAnimationFrame(pollLoop); window.addEventListener('gamepadconnected',robustScan); window.addEventListener('gamepaddisconnected',robustScan); window.addEventListener('keydown',(e)=>{ if(e.key==='Escape') emergencyStop(); }); log('Modes script loaded.');