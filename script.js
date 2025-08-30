// Configuration
const MAIN_FILE = 'main.json';
const EXTRA_FILES = ['extra1.json','extra2.json','extra3.json'];
const TARGET_CHARS = 550;

// Storage for loaded content
const store = {
  main: [],
  extras: {
    'extra1.json': [],
    'extra2.json': [],
    'extra3.json': []
  }
};

// UI refs
const outputEl = document.getElementById('output');
const startBtn = document.getElementById('startBtn');
const toggles = Array.from(document.querySelectorAll('.toggle'));

// Fetch JSON helper
async function fetchJsonSafe(path){
  try{
    const res = await fetch(path, {cache: 'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error('JSON is not an array');
    // flatten and filter only strings
    return data.map(String).filter(Boolean);
  }catch(err){
    console.warn('Could not load',path,err.message);
    return [];
  }
}

// Preload main and extras (best-effort)
async function preloadAll(){
  store.main = await fetchJsonSafe(MAIN_FILE);
  for(const f of EXTRA_FILES){
    store.extras[f] = await fetchJsonSafe(f);
  }
}

// Toggle handling (visual only; loading already attempted above)
toggles.forEach(btn => {
  btn.addEventListener('click', ()=>{
    btn.classList.toggle('active');
    // lazy-load that file if now active and empty
    const file = btn.dataset.file;
    if(btn.classList.contains('active') && store.extras[file].length === 0){
      // try to fetch it now
      fetchJsonSafe(file).then(arr => store.extras[file] = arr);
    }
  });
});

// Utility: pick random item from array
function pickRandom(arr){
  if(!arr || arr.length===0) return null;
  return arr[Math.floor(Math.random()*arr.length)];
}

// Build pool from main + active extras
function buildPool(){
  const pool = [];
  if(Array.isArray(store.main)) pool.push(...store.main);
  toggles.filter(t=>t.classList.contains('active')).forEach(t=>{
    const f = t.dataset.file;
    if(Array.isArray(store.extras[f])) pool.push(...store.extras[f]);
  });
  // final filter
  return pool.filter(s=>typeof s === 'string' && s.trim().length>0);
}

// Generate a text up to ~TARGET_CHARS by concatenating random picks
function generateText(pool){
  if(!pool || pool.length===0) return '';
  let out = '';
  while(out.length < TARGET_CHARS){
    const pick = pickRandom(pool) || '';
    if(out.length>0 && !/[\s]$/.test(out)) out += ' ';
    out += pick;
    // safety: if picks aren't increasing, break
    if(pick.length === 0) break;
    // avoid infinite loop by capping loops
    if(out.length > 10000) break;
  }
  // cut to a nice boundary (don't cut in the middle of surrogate pair)
  return out.slice(0, TARGET_CHARS);
}

// Typewriter effect: types text into outputEl letter by letter
async function typeWriter(text){
  outputEl.textContent = '';
  startBtn.disabled = true;
  startBtn.textContent = 'Generating...';

  for(let i=0;i<text.length;i++){
    outputEl.textContent += text[i];
    // small random typing delay between 12 and 32ms to feel organic
    const delay = 12 + Math.floor(Math.random()*22);
    await new Promise(r=>setTimeout(r, delay));
    // auto-scroll if overflow
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  startBtn.disabled = false;
  startBtn.textContent = 'Start generating';
}

// Start click
startBtn.addEventListener('click', async ()=>{
  // ensure we've at least attempted load
  if(store.main.length === 0){
    // try to reload main if empty
    store.main = await fetchJsonSafe(MAIN_FILE);
  }
  const pool = buildPool();
  if(pool.length === 0){
    outputEl.textContent = '[No content available. Make sure main.json exists and contains an array of strings.]';
    return;
  }

  const full = generateText(pool);
  await typeWriter(full);
});

// attempt preload, but ignore failures
preloadAll();
