const STORAGE_KEY = 'forge-assets-v1';
const palette = [
  { name: 'Citron', hex: '#c2f36b', dark: '#567f2f' },
  { name: 'Ultraviolet', hex: '#a98bff', dark: '#56429c' },
  { name: 'Tangerine', hex: '#ff9a61', dark: '#a84d2a' },
  { name: 'Glacier', hex: '#77dce8', dark: '#317d8c' },
  { name: 'Rose', hex: '#ff7d9b', dark: '#a53b5a' },
  { name: 'Monochrome', hex: '#d9dedb', dark: '#717b75' }
];
const names = {
  class: ['Artifact', 'Companion', 'Wearable', 'Prop', 'Structure', 'Tool'],
  style: ['Playful', 'Retro-tech', 'Organic', 'Minimal', 'Arcane', 'Industrial'],
  shapes: ['rounded core', 'faceted shell', 'floating ring', 'offset fins', 'orbiting nodes', 'tapered base', 'prism cap', 'glowing inset'],
  materials: ['polished enamel', 'brushed alloy', 'translucent resin', 'soft-touch polymer', 'weathered stone', 'iridescent glass']
};
const state = { stage: 1, asset: null, config: { assetClass: 'Artifact', style: 'Playful', palette: 0, complexity: 3, asymmetry: 42, seed: Math.floor(Math.random() * 900000 + 100000) } };
const $ = (selector) => document.querySelector(selector);
const stageNames = ['INPUT POOL', 'COMPUTE LAYER', 'LINKING / REASONING', 'EXECUTION LAYER'];
const stageTitles = ['Start with a direction.', 'Let the parts take shape.', 'Give every detail a reason.', 'A concept, ready to take away.'];
const stageDescriptions = [
  'Pick an asset class, visual language, and a few generation parameters. The generator uses your choices as a creative brief.',
  'Geometry, proportions, component count, and materials are randomized from your brief. Roll again to explore another direction.',
  'Compatible parts are combined and visual properties are assigned to create a coherent design. Review the logic before execution.',
  'Review the generated concept preview, description, and structured metadata. Save it locally or export its JSON.'
];

function loadSaved() { try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } }
function saveSaved(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); updateSavedCount(); }
function updateSavedCount() { $('#saved-count').textContent = String(loadSaved().length).padStart(2, '0'); }
function randomItem(list) { return list[Math.floor(Math.random() * list.length)]; }
function pickDistinct(list, count) { const copy = [...list]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy.slice(0, count); }
function esc(text) { return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function generateAsset() {
  const complexity = Number(state.config.complexity);
  const parts = pickDistinct(names.shapes, Math.min(2 + complexity, 7));
  const color = palette[state.config.palette];
  const material = randomItem(names.materials);
  const proportion = (0.72 + Math.random() * 0.66).toFixed(2);
  const seed = Math.floor(Math.random() * 900000 + 100000);
  state.config.seed = seed;
  const asset = {
    id: `forge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${randomItem(['Pocket', 'Prismatic', 'Little', 'Orbit', 'Wild', 'Echo'])} ${randomItem(['Relic', 'Sprite', 'Totem', 'Beacon', 'Bloom', 'Gadget'])}`,
    assetClass: state.config.assetClass, style: state.config.style, color, material, parts, proportion,
    complexity, asymmetry: Number(state.config.asymmetry), seed, createdAt: new Date().toISOString()
  };
  asset.description = `${asset.name} is an original ${asset.style.toLowerCase()} ${asset.assetClass.toLowerCase()} concept in ${color.name}, built from a ${parts[0]} with ${parts.slice(1).join(', ')}. Its ${material} finish and ${asset.asymmetry > 65 ? 'deliberately off-center' : 'balanced'} silhouette give it a distinct visual identity.`;
  asset.metadata = { title: asset.name, assetClass: asset.assetClass, style: asset.style, primaryColor: color.name, primaryColorHex: color.hex, material: asset.material, components: [...asset.parts], generationSeed: asset.seed, generator: 'Forge Concept Studio', format: 'original-concept-json', robloxCatalogItem: false };
  state.asset = asset;
  renderPreview(asset);
  renderStage();
}
function renderPreview(asset) {
  $('#preview-class').textContent = `${asset.assetClass.toUpperCase()} · ${asset.style.toUpperCase()}`;
  $('#preview-seed').textContent = `SEED ${asset.seed}`;
  const color = asset.color.hex, dark = asset.color.dark;
  const asymmetry = asset.asymmetry / 100;
  const centerX = 120 + (asymmetry - .5) * 22;
  const tilt = (asymmetry - .5) * 18;
  const shapes = {
    'rounded core': `<rect x="${centerX-32}" y="83" width="64" height="68" rx="19" fill="url(#main)" stroke="${color}" stroke-width="2" transform="rotate(${tilt} ${centerX} 117)"/>`,
    'faceted shell': `<path d="M${centerX} 59 L${centerX+42} 91 L${centerX+29} 143 L${centerX-26} 150 L${centerX-42} 95Z" fill="url(#main)" stroke="${color}" stroke-width="2"/><path d="M${centerX} 59 L${centerX+2} 118 L${centerX-26} 150 M${centerX+42} 91 L${centerX+2} 118 L${centerX-42} 95" fill="none" stroke="${color}" stroke-opacity=".48"/>`,
    'floating ring': `<ellipse cx="${centerX}" cy="112" rx="51" ry="17" fill="none" stroke="${color}" stroke-width="10" transform="rotate(-22 ${centerX} 112)"/><ellipse cx="${centerX}" cy="112" rx="51" ry="17" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="2" transform="rotate(-22 ${centerX} 112)"/>`,
    'offset fins': `<path d="M${centerX-16} 77 L${centerX+17} 67 L${centerX+38} 145 L${centerX+7} 152Z" fill="url(#main)" stroke="${color}" stroke-width="2"/><path d="M${centerX-29} 91 L${centerX-8} 84 L${centerX+5} 143 L${centerX-17} 148Z" fill="${dark}" stroke="${color}" stroke-width="1.5"/>`,
    'orbiting nodes': `<circle cx="${centerX}" cy="111" r="24" fill="url(#main)" stroke="${color}" stroke-width="2"/><circle cx="${centerX-43}" cy="84" r="10" fill="${color}"/><circle cx="${centerX+46}" cy="130" r="13" fill="${dark}" stroke="${color}" stroke-width="2"/><path d="M${centerX-34} 90L${centerX-16} 101 M${centerX+21} 119L${centerX+35} 126" stroke="${color}" stroke-opacity=".7" stroke-width="2"/>`,
    'tapered base': `<path d="M${centerX-37} 82 L${centerX+37} 82 L${centerX+24} 145 L${centerX-22} 145Z" fill="url(#main)" stroke="${color}" stroke-width="2"/><ellipse cx="${centerX}" cy="82" rx="37" ry="11" fill="${color}"/><ellipse cx="${centerX}" cy="145" rx="23" ry="8" fill="${dark}"/>`,
    'prism cap': `<path d="M${centerX-27} 91 L${centerX} 61 L${centerX+28} 91 L${centerX+21} 116 L${centerX-22} 116Z" fill="${color}" stroke="#fff" stroke-opacity=".4"/><path d="M${centerX-22} 116 L${centerX+21} 116 L${centerX+31} 145 L${centerX-30} 145Z" fill="url(#main)" stroke="${color}" stroke-width="2"/>`,
    'glowing inset': `<rect x="${centerX-34}" y="79" width="68" height="68" rx="16" fill="url(#main)" stroke="${color}" stroke-width="2"/><rect x="${centerX-17}" y="97" width="34" height="32" rx="10" fill="${color}" opacity=".8" filter="url(#glow)"/><circle cx="${centerX}" cy="113" r="7" fill="#fff"/>`
  };
  let body = shapes[asset.parts[0]] || shapes['rounded core'];
  asset.parts.slice(1, 4).forEach((part, index) => {
    if (part === 'floating ring' && !asset.parts[0].includes('ring')) body += shapes[part];
    else if (part === 'orbiting nodes' && index < 2) body += shapes[part];
    else if (part === 'prism cap') body += shapes[part];
    else if (part === 'glowing inset') body += shapes[part];
  });
  $('#asset-preview').innerHTML = `<svg class="asset-svg" viewBox="0 0 240 210" role="img" aria-label="Stylized concept preview of ${esc(asset.name)}"><defs><linearGradient id="main" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${dark}"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="6"/></filter></defs><ellipse cx="120" cy="174" rx="48" ry="8" fill="#070907" opacity=".65"/>${body}<path d="M${centerX-19} 96 Q${centerX-8} 87 ${centerX+6} 91" fill="none" stroke="#fff" stroke-opacity=".52" stroke-width="3" stroke-linecap="round"/></svg>`;
}
function fieldSelect(label, key, values) { return `<label class="field"><span class="field-label">${label}</span><select data-config="${key}">${values.map(v => `<option ${state.config[key] === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`; }
function renderStage() {
  const n = state.stage;
  $('#stage-kicker').textContent = `STAGE 0${n}`;
  $('#stage-caption').textContent = stageNames[n - 1];
  document.querySelectorAll('.stage').forEach((el, i) => { el.classList.toggle('active', i + 1 === n); el.classList.toggle('done', i + 1 < n); });
  $('#back-btn').disabled = n === 1;
  $('#next-btn').classList.toggle('hidden', n === 4);
  $('#next-btn').innerHTML = n === 1 ? 'Compute geometry <span>→</span>' : n === 2 ? 'Link components <span>→</span>' : 'Execute concept <span>→</span>';
  let content = `<h2 class="stage-title">${stageTitles[n - 1]}</h2><p class="stage-description">${stageDescriptions[n - 1]}</p>`;
  if (n === 1) {
    content += `<div class="field-grid">${fieldSelect('ASSET CLASS', 'assetClass', names.class)}${fieldSelect('STYLE DIRECTION', 'style', names.style)}<div class="field"><span class="field-label">COLOR PALETTE <small>${palette[state.config.palette].name}</small></span><div class="color-options">${palette.map((p, i) => `<button class="color-swatch ${i === state.config.palette ? 'selected' : ''}" data-color="${i}" style="background:${p.hex}" title="${p.name}" aria-label="${p.name} color"></button>`).join('')}</div></div><label class="field"><span class="field-label">COMPLEXITY <small>2–7 components</small></span><div class="range-row"><input data-config="complexity" type="range" min="1" max="5" value="${state.config.complexity}"/><span class="range-value">${state.config.complexity}</span></div></label><label class="field"><span class="field-label">ASYMMETRY <small>silhouette variation</small></span><div class="range-row"><input data-config="asymmetry" type="range" min="0" max="100" value="${state.config.asymmetry}"/><span class="range-value">${state.config.asymmetry}</span></div></label><label class="field"><span class="field-label">GENERATION SEED</span><input data-config="seed" type="number" min="0" max="999999" value="${state.config.seed}"/></label></div>`;
  } else if (n === 2) {
    if (!state.asset) return generateAsset();
    content += `<div class="component-list">${state.asset.parts.map((part, i) => `<div class="component-card"><span class="component-icon">${['◇', '◌', '△', '✳', '◈'][i % 5]}</span><div><b>${esc(part)}</b><small>${i === 0 ? 'Primary structure · proportion ' + state.asset.proportion : 'Procedural attachment · ' + (i % 2 ? 'rotated' : 'scaled')}</small></div><span class="component-tag">PART 0${i + 1}</span></div>`).join('')}</div><div class="reasoning-box"><b>Geometry pass complete.</b> Seed ${state.asset.seed} produced ${state.asset.parts.length} compatible components in ${state.asset.material}. Use the reroll icon to explore a fresh geometry pass.</div>`;
  } else if (n === 3) {
    if (!state.asset) return generateAsset();
    content += `<div class="field-grid"><div class="field"><span class="field-label">MATERIAL ASSIGNMENT</span><div class="component-card"><span class="component-icon">◈</span><div><b>${esc(state.asset.material)}</b><small>Primary surface · ${esc(state.asset.color.name)} tint</small></div></div></div><div class="field"><span class="field-label">VISUAL LANGUAGE</span><div class="component-card"><span class="component-icon">✳</span><div><b>${esc(state.asset.style)} · ${esc(state.asset.assetClass)}</b><small>Matched to your input pool</small></div></div></div></div><div class="reasoning-box"><b>Linking logic.</b> ${state.asset.parts.length} forms share a ${esc(state.asset.material)} finish and a ${state.asset.asymmetry > 65 ? 'deliberately asymmetric' : 'balanced'} silhouette. ${state.asset.parts[0]} anchors the design; ${state.asset.parts.slice(1).join(' and ')} reinforce its ${esc(state.asset.style.toLowerCase())} identity.</div><label class="check-row"><input id="catalog-check" type="checkbox"/> Also look for related items in the Roblox catalog <span title="Catalog lookup searches existing items; it does not generate a model.">ⓘ</span></label>`;
  } else {
    if (!state.asset) return generateAsset();
    const a = state.asset;
    content += `<div class="execution-name">${esc(a.name)}</div><p class="description-output">${esc(a.description)}</p><div class="meta-grid"><div class="meta-cell"><span>ASSET CLASS</span><b>${esc(a.assetClass)}</b></div><div class="meta-cell"><span>STYLE</span><b>${esc(a.style)}</b></div><div class="meta-cell"><span>PRIMARY MATERIAL</span><b>${esc(a.material)}</b></div><div class="meta-cell"><span>COMPONENTS</span><b>${a.parts.length} original forms</b></div><div class="meta-cell"><span>GENERATION SEED</span><b>${a.seed}</b></div><div class="meta-cell"><span>EXPORT FORMAT</span><b>CMS-ready JSON</b></div></div><div class="execution-actions"><button id="save-asset" class="button button-primary" type="button">＋ Save concept</button><button id="export-asset" class="inline-action" type="button">↓ Download JSON</button></div>`;
  }
  $('#stage-content').innerHTML = content;
  bindStageControls();
}
function bindStageControls() {
  document.querySelectorAll('[data-config]').forEach(el => el.addEventListener('input', () => {
    const key = el.dataset.config;
    state.config[key] = el.type === 'range' || el.type === 'number' ? Number(el.value) : el.value;
    if (el.type === 'range') el.nextElementSibling.textContent = el.value;
  }));
  document.querySelectorAll('[data-color]').forEach(el => el.addEventListener('click', () => {
    state.config.palette = Number(el.dataset.color);
    document.querySelectorAll('[data-color]').forEach(s => s.classList.toggle('selected', s === el));
    const label = document.querySelector('.color-options').previousElementSibling.querySelector('small');
    label.textContent = palette[state.config.palette].name;
  }));
  const save = $('#save-asset'); if (save) save.addEventListener('click', saveCurrentAsset);
  const export = $('#export-asset'); if (export) export.addEventListener('click', () => downloadJSON(state.asset, `${slug(state.asset.name)}.json`));
}
function slug(text) { return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); toast('JSON export downloaded.');
}
function saveCurrentAsset() {
  if (!state.asset) return;
  const saved = loadSaved();
  if (saved.some(a => a.id === state.asset.id)) return toast('This concept is already saved.');
  saved.unshift(state.asset); saveSaved(saved); toast('Concept saved to your local library.');
}
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2400); }
function navigate(view) {
  const isLibrary = view === 'library';
  $('#generator-view').classList.toggle('hidden', isLibrary); $('#library-view').classList.toggle('hidden', !isLibrary);
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('#breadcrumb-page').textContent = isLibrary ? 'SAVED ASSETS' : 'GENERATOR';
  if (isLibrary) renderLibrary();
}
function renderLibrary() {
  const saved = loadSaved();
  if (!saved.length) { $('#library-content').innerHTML = '<div class="empty-library"><span>✳</span><strong>Nothing saved. Yet.</strong><p>Generate a concept and save it to start your library.</p></div>'; return; }
  $('#library-content').innerHTML = `<div class="asset-grid">${saved.map(a => `<article class="asset-card"><div class="asset-card-art" data-art="${esc(a.id)}"></div><div class="asset-card-body"><h3>${esc(a.name)}</h3><p>${esc(a.assetClass)} · ${esc(a.style)} · ${esc(a.color.name)}</p><div class="asset-card-actions"><button class="small-button" data-load="${esc(a.id)}">Open concept</button><button class="small-button" data-export="${esc(a.id)}">Export</button><button class="small-button danger" data-delete="${esc(a.id)}">Delete</button></div></div></article>`).join('')}</div>`;
  saved.forEach(a => { const host = document.querySelector(`[data-art="${CSS.escape(a.id)}"]`); if (!host) return; const old = state.asset; renderPreview(a); host.innerHTML = $('#asset-preview').innerHTML; if (old) renderPreview(old); });
  document.querySelectorAll('[data-load]').forEach(el => el.addEventListener('click', () => { const asset = loadSaved().find(a => a.id === el.dataset.load); if (!asset) return; state.asset = asset; state.stage = 4; renderStage(); navigate('generator'); }));
  document.querySelectorAll('[data-export]').forEach(el => el.addEventListener('click', () => { const asset = loadSaved().find(a => a.id === el.dataset.export); if (asset) downloadJSON(asset, `${slug(asset.name)}.json`); }));
  document.querySelectorAll('[data-delete]').forEach(el => el.addEventListener('click', () => { saveSaved(loadSaved().filter(a => a.id !== el.dataset.delete)); renderLibrary(); toast('Concept removed from your library.'); }));
}
function nextStage() {
  if (state.stage === 1) { generateAsset(); state.stage = 2; }
  else if (state.stage === 2) state.stage = 3;
  else if (state.stage === 3) {
    const shouldLookup = $('#catalog-check')?.checked;
    state.stage = 4; renderStage();
    if (shouldLookup && state.asset) window.open(`https://www.roblox.com/catalog?Keyword=${encodeURIComponent(state.asset.assetClass + ' ' + state.asset.style)}`, '_blank', 'noopener,noreferrer');
    return;
  }
  renderStage();
}
$('#next-btn').addEventListener('click', nextStage);
$('#back-btn').addEventListener('click', () => { if (state.stage > 1) { state.stage--; renderStage(); } });
document.querySelectorAll('.stage').forEach(el => el.addEventListener('click', () => { const target = Number(el.dataset.stage); if (target <= state.stage || (target === state.stage + 1 && state.asset)) { state.stage = target; renderStage(); } }));
document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => navigate(el.dataset.view)));
$('#randomize-btn').addEventListener('click', () => { if (state.stage === 1) { generateAsset(); state.stage = 2; } else generateAsset(); renderStage(); toast('Fresh concept generated.'); });
$('#export-top').addEventListener('click', () => state.asset ? downloadJSON(state.asset, `${slug(state.asset.name)}.json`) : downloadJSON({ format: 'forge-asset-library', assets: loadSaved() }, 'forge-library.json'));
$('#library-export').addEventListener('click', () => downloadJSON({ format: 'forge-asset-library', exportedAt: new Date().toISOString(), assets: loadSaved() }, 'forge-library.json'));
updateSavedCount(); renderStage();
