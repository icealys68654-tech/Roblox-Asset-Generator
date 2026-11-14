const API = '/api';
const palette = [
  { name: 'Citron', hex: '#c2f36b', dark: '#567f2f' }, { name: 'Ultraviolet', hex: '#a98bff', dark: '#56429c' },
  { name: 'Tangerine', hex: '#ff9a61', dark: '#a84d2a' }, { name: 'Glacier', hex: '#77dce8', dark: '#317d8c' },
  { name: 'Rose', hex: '#ff7d9b', dark: '#a53b5a' }, { name: 'Monochrome', hex: '#d9dedb', dark: '#717b75' }
];
const templates = {
  'Pocket companion': { assetClass: 'Companion', style: 'Playful', shapes: ['rounded core', 'orbiting nodes', 'glowing inset'], materials: ['soft-touch polymer', 'polished enamel'] },
  'Arcane artifact': { assetClass: 'Artifact', style: 'Arcane', shapes: ['faceted shell', 'floating ring', 'prism cap', 'glowing inset'], materials: ['iridescent glass', 'weathered stone'] },
  'Retro gadget': { assetClass: 'Tool', style: 'Retro-tech', shapes: ['rounded core', 'offset fins', 'tapered base', 'orbiting nodes'], materials: ['brushed alloy', 'polished enamel'] },
  'Organic bloom': { assetClass: 'Prop', style: 'Organic', shapes: ['rounded core', 'offset fins', 'floating ring'], materials: ['translucent resin', 'soft-touch polymer'] },
  'Modular structure': { assetClass: 'Structure', style: 'Industrial', shapes: ['tapered base', 'faceted shell', 'offset fins'], materials: ['brushed alloy', 'weathered stone'] },
  'Wearable token': { assetClass: 'Wearable', style: 'Minimal', shapes: ['floating ring', 'faceted shell', 'glowing inset'], materials: ['polished enamel', 'iridescent glass'] }
};
const allShapes = ['rounded core', 'faceted shell', 'floating ring', 'offset fins', 'orbiting nodes', 'tapered base', 'prism cap', 'glowing inset'];
const materials = ['polished enamel', 'brushed alloy', 'translucent resin', 'soft-touch polymer', 'weathered stone', 'iridescent glass'];
const state = { stage: 1, asset: null, assets: [], config: { template: 'Pocket companion', assetClass: 'Companion', style: 'Playful', palette: 0, complexity: 3, asymmetry: 42, seed: Math.floor(Math.random() * 900000 + 100000) } };
const $ = (s) => document.querySelector(s);
const stageNames = ['INPUT POOL', 'COMPUTE LAYER', 'LINKING / REASONING', 'EXECUTION LAYER'];
const titles = ['Start with a direction.', 'Let the parts take shape.', 'Give every detail a reason.', 'A concept, ready to take away.'];
const descriptions = ['Choose a category template, visual language, and generation parameters. Templates give the procedural generator a useful starting point.', 'Geometry, proportions, component count, and materials are randomized from your brief. Roll again to explore another direction.', 'Review how the generated components are joined and how the visual properties work together.', 'Review the concept description and CMS-ready record. Save it to SQLite or export structured JSON.'];

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Local server error (${response.status})`);
  return body;
}
function setConnection(online) {
  $('#api-dot').classList.toggle('offline', !online);
  $('#api-status').textContent = online ? 'SQLITE DATABASE CONNECTED' : 'DATABASE OFFLINE';
  $('#db-profile').textContent = online ? 'SQLite · device-local' : 'Start the local server';
}
async function refreshAssets() {
  try { const result = await api('/assets'); state.assets = result.assets || []; setConnection(true); updateCount(); }
  catch (error) { setConnection(false); throw error; }
}
function updateCount() { $('#saved-count').textContent = String(state.assets.length).padStart(2, '0'); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function randomItem(list, rng = Math.random) { return list[Math.floor(rng() * list.length)]; }
function makeRandom(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(list, rng) { const result = [...list]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
function makeCMSRecord(asset) {
  return {
    schema_version: '1.0.0', record_type: 'original_asset_concept', id: asset.id,
    title: asset.name, slug: slug(asset.name), description: asset.description,
    status: 'draft', moderation: { state: 'not_submitted', notes: '' },
    taxonomy: { asset_class: asset.assetClass, style: asset.style, template: asset.template, tags: [asset.assetClass.toLowerCase(), asset.style.toLowerCase(), ...asset.parts.map(p => p.replaceAll(' ', '-'))] },
    visual: { primary_color: { name: asset.color.name, hex: asset.color.hex }, material: asset.material, components: asset.parts, proportions: { body_scale: Number(asset.proportion), asymmetry: asset.asymmetry }, preview_format: 'svg-concept' },
    generation: { generator: 'Forge Studio', seed: asset.seed, created_at: asset.createdAt, parameters: { complexity: asset.complexity, asymmetry: asset.asymmetry, palette: asset.color.name } },
    platform: { intended_for: 'Roblox-inspired creative concept', roblox_catalog_item: false, model_file_included: false, upload_status: 'not_created' }
  };
}
function generateAsset() {
  const seed = Math.max(0, Number(state.config.seed) || Math.floor(Math.random() * 900000 + 100000));
  const rng = makeRandom(seed);
  const template = templates[state.config.template] || templates['Pocket companion'];
  const partCount = Math.min(2 + Number(state.config.complexity), 7);
  const shapePool = [...new Set([...template.shapes, ...allShapes])];
  const parts = shuffle(shapePool, rng).slice(0, partCount);
  const color = palette[state.config.palette];
  const material = randomItem(template.materials, rng) || randomItem(materials, rng);
  const proportion = (0.72 + rng() * 0.66).toFixed(2);
  const asset = {
    id: `forge-${Date.now()}-${seed}`, name: `${randomItem(['Pocket', 'Prismatic', 'Little', 'Orbit', 'Wild', 'Echo'], rng)} ${randomItem(['Relic', 'Sprite', 'Totem', 'Beacon', 'Bloom', 'Gadget'], rng)}`,
    template: state.config.template, assetClass: template.assetClass, style: template.style, color, material, parts, proportion,
    complexity: Number(state.config.complexity), asymmetry: Number(state.config.asymmetry), seed, createdAt: new Date().toISOString()
  };
  asset.description = `${asset.name} is an original ${asset.style.toLowerCase()} ${asset.assetClass.toLowerCase()} concept in ${color.name}, built around a ${parts[0]} with ${parts.slice(1).join(', ')}. Its ${material} finish and ${asset.asymmetry > 65 ? 'deliberately off-center' : 'balanced'} silhouette give it a distinct visual identity.`;
  asset.cms = makeCMSRecord(asset);
  state.config.seed = Math.floor(Math.random() * 900000 + 100000);
  state.asset = asset;
  renderPreview(asset); renderStage();
}
function renderPreview(asset, target = $('#asset-preview')) {
  if (!asset || !target) return;
  const color = asset.color?.hex || '#c2f36b', dark = asset.color?.dark || '#567f2f';
  const cx = 120 + ((Number(asset.asymmetry || 50) / 100) - .5) * 25;
  const partShape = (part, i) => {
    const offset = (i % 3) * 9;
    switch (part) {
      case 'rounded core': return `<g transform="translate(${offset} 0) rotate(${(asset.asymmetry - 50) * .12} ${cx} 114)"><rect x="${cx-31}" y="79" width="62" height="70" rx="18" fill="url(#metal)" stroke="${color}" stroke-width="2"/><path d="M${cx-18} 91q12-12 26-4" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/></g>`;
      case 'faceted shell': return `<path d="M${cx} 57L${cx+39} 86L${cx+31} 140L${cx-27} 151L${cx-42} 91Z" fill="url(#metal)" stroke="${color}" stroke-width="2"/><path d="M${cx} 57L${cx+3} 117L${cx-27} 151M${cx+39} 86L${cx+3} 117L${cx-42} 91" fill="none" stroke="#fff" stroke-opacity=".3"/>`;
      case 'floating ring': return `<ellipse cx="${cx}" cy="112" rx="52" ry="19" fill="none" stroke="${dark}" stroke-width="13" transform="rotate(-22 ${cx} 112)"/><ellipse cx="${cx}" cy="109" rx="52" ry="19" fill="none" stroke="${color}" stroke-width="5" transform="rotate(-22 ${cx} 109)"/>`;
      case 'offset fins': return `<path d="M${cx-17} 73L${cx+15} 67L${cx+39} 144L${cx+8} 152Z" fill="url(#metal)" stroke="${color}" stroke-width="2"/><path d="M${cx-32} 91L${cx-9} 84L${cx+4} 143L${cx-19} 149Z" fill="${dark}" stroke="${color}" stroke-width="1.5"/>`;
      case 'orbiting nodes': return `<path d="M${cx-34} 91L${cx-14} 103M${cx+24} 120L${cx+38} 129" stroke="${color}" stroke-width="3"/><circle cx="${cx-40}" cy="84" r="11" fill="url(#metal)" stroke="${color}" stroke-width="2"/><circle cx="${cx+43}" cy="133" r="13" fill="${dark}" stroke="${color}" stroke-width="2"/><circle cx="${cx}" cy="111" r="24" fill="url(#metal)" stroke="${color}" stroke-width="2"/>`;
      case 'tapered base': return `<path d="M${cx-37} 80L${cx+37} 80L${cx+24} 146L${cx-22} 146Z" fill="url(#metal)" stroke="${color}" stroke-width="2"/><ellipse cx="${cx}" cy="80" rx="37" ry="11" fill="${color}"/><ellipse cx="${cx}" cy="146" rx="23" ry="8" fill="${dark}"/>`;
      case 'prism cap': return `<path d="M${cx-29} 91L${cx} 56L${cx+29} 91L${cx+20} 119L${cx-22} 119Z" fill="${color}" stroke="#fff" stroke-opacity=".55"/><path d="M${cx-22} 119L${cx+20} 119L${cx+31} 145L${cx-31} 145Z" fill="url(#metal)" stroke="${color}" stroke-width="2"/>`;
      default: return `<rect x="${cx-34}" y="78" width="68" height="69" rx="16" fill="url(#metal)" stroke="${color}" stroke-width="2"/><rect x="${cx-17}" y="97" width="34" height="32" rx="10" fill="${color}" opacity=".8" filter="url(#glow)"/><circle cx="${cx}" cy="113" r="7" fill="#fff"/>`;
    }
  };
  const parts = (asset.parts || []).slice(0, 4).map(partShape).join('');
  target.innerHTML = `<svg class="asset-svg" viewBox="0 0 240 210" role="img" aria-label="Procedural concept preview of ${esc(asset.name)}"><defs><linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".92"/><stop offset=".15" stop-color="${color}"/><stop offset="1" stop-color="${dark}"/></linearGradient><radialGradient id="orb"><stop stop-color="#fff" stop-opacity=".65"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="7"/></filter></defs><ellipse cx="120" cy="174" rx="49" ry="9" fill="#050705" opacity=".65"/><ellipse cx="120" cy="170" rx="58" ry="13" fill="url(#orb)" opacity=".3"/>${parts}</svg>`;
}
function selectField(label, key, values, active) { return `<label class="field"><span class="field-label">${label}</span><select data-config="${key}">${values.map(v => `<option value="${esc(v)}" ${active === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`; }
function renderStage() {
  const n = state.stage;
  $('#stage-kicker').textContent = `STAGE 0${n}`; $('#stage-caption').textContent = stageNames[n-1];
  document.querySelectorAll('.stage').forEach((el, i) => { el.classList.toggle('active', i+1 === n); el.classList.toggle('done', i+1 < n); });
  $('#back-btn').disabled = n === 1; $('#next-btn').classList.toggle('hidden', n === 4);
  $('#next-btn').innerHTML = n === 1 ? 'Compute geometry <span>→</span>' : n === 2 ? 'Link components <span>→</span>' : 'Execute concept <span>→</span>';
  let content = `<h2 class="stage-title">${titles[n-1]}</h2><p class="stage-description">${descriptions[n-1]}</p>`;
  if (n === 1) {
    content += `<div class="field-grid">${selectField('ASSET TEMPLATE', 'template', Object.keys(templates), state.config.template)}${selectField('ASSET CLASS', 'assetClass', [...new Set(Object.values(templates).map(t => t.assetClass))], templates[state.config.template].assetClass)}${selectField('STYLE DIRECTION', 'style', [...new Set(Object.values(templates).map(t => t.style))], templates[state.config.template].style)}<div class="field"><span class="field-label">COLOR PALETTE <small>${palette[state.config.palette].name}</small></span><div class="color-options">${palette.map((p,i) => `<button class="color-swatch ${i===state.config.palette?'selected':''}" data-color="${i}" style="background:${p.hex}" title="${p.name}" aria-label="${p.name}"></button>`).join('')}</div></div><label class="field"><span class="field-label">COMPLEXITY <small>2–7 components</small></span><div class="range-row"><input data-config="complexity" type="range" min="1" max="5" value="${state.config.complexity}"><span class="range-value">${state.config.complexity}</span></div></label><label class="field"><span class="field-label">ASYMMETRY <small>silhouette variation</small></span><div class="range-row"><input data-config="asymmetry" type="range" min="0" max="100" value="${state.config.asymmetry}"><span class="range-value">${state.config.asymmetry}</span></div></label><label class="field"><span class="field-label">GENERATION SEED</span><input data-config="seed" type="number" min="0" max="999999" value="${state.config.seed}"></label></div><div class="template-note"><span>✳</span> Templates tune the shape and material pool; your generated asset is still a new concept.</div>`;
  } else if (n === 2) {
    if (!state.asset) return generateAsset();
    content += `<div class="compute-summary"><span class="summary-orb" style="--orb:${state.asset.color.hex}">✳</span><div><b>${esc(state.asset.template)}</b><small>Seed ${state.asset.seed} · body scale ${state.asset.proportion}</small></div><span class="summary-count">${state.asset.parts.length} PARTS</span></div><div class="component-list">${state.asset.parts.map((p,i)=>`<div class="component-card"><span class="component-icon">${['◇','◌','△','✳','◈'][i%5]}</span><div><b>${esc(p)}</b><small>${i===0?'Primary structure · proportion '+state.asset.proportion:'Procedural attachment · '+(i%2?'rotated':'scaled')}</small></div><span class="component-tag">PART 0${i+1}</span></div>`).join('')}</div><div class="reasoning-box"><b>Geometry pass complete.</b> Seed ${state.asset.seed} generated ${state.asset.parts.length} components with ${esc(state.asset.material)}. Reroll to explore another composition.</div>`;
  } else if (n === 3) {
    if (!state.asset) return generateAsset();
    content += `<div class="field-grid"><div class="field"><span class="field-label">MATERIAL ASSIGNMENT</span><div class="component-card"><span class="component-icon">◈</span><div><b>${esc(state.asset.material)}</b><small>Surface · ${esc(state.asset.color.name)} tint</small></div></div></div><div class="field"><span class="field-label">VISUAL LANGUAGE</span><div class="component-card"><span class="component-icon">✳</span><div><b>${esc(state.asset.style)} · ${esc(state.asset.assetClass)}</b><small>${esc(state.asset.template)} template</small></div></div></div></div><div class="reasoning-box"><b>Linking logic.</b> ${state.asset.parts.length} forms share a ${esc(state.asset.material)} finish and a ${state.asset.asymmetry>65?'deliberately asymmetric':'balanced'} silhouette. ${esc(state.asset.parts[0])} anchors the design; the remaining forms reinforce its ${esc(state.asset.style.toLowerCase())} identity.</div><label class="check-row"><input id="catalog-check" type="checkbox"> Open a Roblox catalog search for related existing items <span title="Catalog lookup searches existing items, not generated models.">ⓘ</span></label>`;
  } else {
    if (!state.asset) return generateAsset();
    const a=state.asset;
    content += `<div class="execution-name">${esc(a.name)}</div><p class="description-output">${esc(a.description)}</p><div class="meta-grid"><div class="meta-cell"><span>ASSET CLASS</span><b>${esc(a.assetClass)}</b></div><div class="meta-cell"><span>STYLE / TEMPLATE</span><b>${esc(a.style)} · ${esc(a.template)}</b></div><div class="meta-cell"><span>PRIMARY MATERIAL</span><b>${esc(a.material)}</b></div><div class="meta-cell"><span>COMPONENTS</span><b>${a.parts.length} original forms</b></div><div class="meta-cell"><span>GENERATION SEED</span><b>${a.seed}</b></div><div class="meta-cell"><span>CMS SCHEMA</span><b>Forge · v1.0.0</b></div></div><div class="execution-actions"><button id="save-asset" class="button button-primary" type="button">＋ Save to SQLite</button><button id="export-asset" class="inline-action" type="button">↓ Export CMS JSON</button></div>`;
  }
  $('#stage-content').innerHTML=content; bindStageControls();
}
function bindStageControls() {
  document.querySelectorAll('[data-config]').forEach(el=>el.addEventListener('input',()=>{
    const key=el.dataset.config; state.config[key]=['complexity','asymmetry','seed'].includes(key)?Number(el.value):el.value;
    if(el.type==='range') el.nextElementSibling.textContent=el.value;
    if(key==='template') { const t=templates[el.value]; state.config.assetClass=t.assetClass;state.config.style=t.style;renderStage(); }
  }));
  document.querySelectorAll('[data-color]').forEach(el=>el.addEventListener('click',()=>{state.config.palette=Number(el.dataset.color);document.querySelectorAll('[data-color]').forEach(s=>s.classList.toggle('selected',s===el));$('.color-options').previousElementSibling.querySelector('small').textContent=palette[state.config.palette].name;}));
  $('#save-asset')?.addEventListener('click',saveCurrentAsset);
  $('#export-asset')?.addEventListener('click',()=>state.asset&&downloadJSON(makeCMSRecord(state.asset),`${slug(state.asset.name)}-cms.json`));
}
function slug(text){return text.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
function downloadJSON(data,filename){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('CMS-ready JSON downloaded.');}
async function saveCurrentAsset(){if(!state.asset)return;try{const result=await api('/assets',{method:'POST',body:JSON.stringify(state.asset)});state.asset=result.asset;await refreshAssets();toast('Concept saved to the local SQLite database.');}catch(e){toast(`Save failed: ${e.message}`);setConnection(false);}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2800);}
function navigate(view){const library=view==='library';$('#generator-view').classList.toggle('hidden',library);$('#library-view').classList.toggle('hidden',!library);document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));$('#breadcrumb-page').textContent=library?'ASSET LIBRARY':'GENERATOR';if(library)renderLibrary();}
function renderLibrary(){const query=$('#library-search').value.trim().toLowerCase();const assets=state.assets.filter(a=>`${a.name} ${a.assetClass} ${a.style} ${a.template}`.toLowerCase().includes(query));$('#library-total').textContent=`${assets.length} CONCEPT${assets.length===1?'':'S'}`;if(!assets.length){$('#library-content').innerHTML=`<div class="empty-library"><span>✳</span><strong>${state.assets.length?'No matching concepts.':'Nothing saved. Yet.'}</strong><p>${state.assets.length?'Try another search.':'Generate a concept and save it to start your SQLite library.'}</p></div>`;return;}$('#library-content').innerHTML=`<div class="asset-grid">${assets.map(a=>`<article class="asset-card"><div class="asset-card-art" data-art="${esc(a.id)}"></div><div class="asset-card-body"><div class="asset-card-kicker">${esc(a.assetClass)} · ${esc(a.color?.name||'')}</div><h3>${esc(a.name)}</h3><p>${esc(a.style)} · ${esc(a.template||'Custom')}</p><div class="asset-card-actions"><button class="small-button" data-load="${esc(a.id)}">Open</button><button class="small-button" data-export="${esc(a.id)}">CMS JSON</button><button class="small-button danger" data-delete="${esc(a.id)}">Delete</button></div></div></article>`).join('')}</div>`;assets.forEach(a=>renderPreview(a,document.querySelector(`[data-art="${CSS.escape(a.id)}"]`)));document.querySelectorAll('[data-load]').forEach(el=>el.addEventListener('click',()=>{const a=state.assets.find(item=>item.id===el.dataset.load);if(!a)return;state.asset=a;state.stage=4;renderStage();renderPreview(a);navigate('generator');}));document.querySelectorAll('[data-export]').forEach(el=>el.addEventListener('click',()=>{const a=state.assets.find(item=>item.id===el.dataset.export);if(a)downloadJSON(makeCMSRecord(a),`${slug(a.name)}-cms.json`);}));document.querySelectorAll('[data-delete]').forEach(el=>el.addEventListener('click',async()=>{try{await api(`/assets/${encodeURIComponent(el.dataset.delete)}`,{method:'DELETE'});await refreshAssets();renderLibrary();toast('Concept deleted from SQLite.');}catch(e){toast(`Delete failed: ${e.message}`);}}));}
function nextStage(){if(state.stage===1){generateAsset();state.stage=2;}else if(state.stage===2)state.stage=3;else if(state.stage===3){const lookup=$('#catalog-check')?.checked;state.stage=4;renderStage();if(lookup&&state.asset)window.open(`https://www.roblox.com/catalog?Keyword=${encodeURIComponent(state.asset.assetClass+' '+state.asset.style)}`,'_blank','noopener,noreferrer');return;}renderStage();}
$('#next-btn').addEventListener('click',nextStage);$('#back-btn').addEventListener('click',()=>{if(state.stage>1){state.stage--;renderStage();}});
document.querySelectorAll('.stage').forEach(el=>el.addEventListener('click',()=>{const n=Number(el.dataset.stage);if(n<=state.stage||(n===state.stage+1&&state.asset)){state.stage=n;renderStage();}}));
document.querySelectorAll('.nav-item').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.view)));
$('#randomize-btn').addEventListener('click',()=>{generateAsset();state.stage=Math.max(2,state.stage);renderStage();toast('Fresh concept generated from seed '+state.asset.seed+'.');});
$('#library-search').addEventListener('input',renderLibrary);
$('#export-top').addEventListener('click',()=>state.asset?downloadJSON(makeCMSRecord(state.asset),`${slug(state.asset.name)}-cms.json`):exportLibrary());
$('#library-export').addEventListener('click',exportLibrary);
function exportLibrary(){downloadJSON({schema_version:'1.0.0',record_type:'asset_concept_collection',exported_at:new Date().toISOString(),assets:state.assets.map(makeCMSRecord)},'forge-cms-bundle.json');}
async function init(){renderStage();try{await refreshAssets();}catch{setConnection(false);toast('Start the local app with: python3 server.py');}setInterval(()=>refreshAssets().catch(()=>setConnection(false)),30000);}
init();
