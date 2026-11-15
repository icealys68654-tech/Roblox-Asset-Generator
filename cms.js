const API = '/api';
const $ = (selector) => document.querySelector(selector);
let assets = [];
let visibleAssets = [];

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Local server error (${response.status})`);
  return body;
}
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function slug(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function getStatus(asset) {
  const status = asset.cms?.status || asset.status || 'draft';
  return ['draft', 'review', 'approved', 'archived'].includes(status) ? status : 'draft';
}
function cmsRecord(asset) {
  if (asset.cms && asset.cms.schema_version === '1.0.0' && asset.cms.title) {
    return { ...asset.cms, id: asset.id, title: asset.name, slug: slug(asset.name), description: asset.description || '', status: getStatus(asset) };
  }
  const tags = [asset.assetClass, asset.style, asset.template, ...(asset.parts || [])].filter(Boolean).map((tag) => String(tag).toLowerCase().replace(/\s+/g, '-'));
  return {
    schema_version: '1.0.0', record_type: 'original_asset_concept', id: asset.id,
    title: asset.name, slug: slug(asset.name), description: asset.description || '', status: getStatus(asset),
    moderation: { state: getStatus(asset) === 'approved' ? 'approved' : 'not_submitted', notes: '' },
    taxonomy: { asset_class: asset.assetClass || 'Concept', style: asset.style || 'Unspecified', template: asset.template || 'Custom concept', tags: [...new Set(tags)] },
    visual: { primary_color: asset.color || { name: 'Monochrome', hex: '#d9dedb', dark: '#717b75' }, material: asset.material || 'Unassigned', components: asset.parts || [], proportions: { body_scale: Number(asset.proportion || 1), asymmetry: Number(asset.asymmetry || 0) } },
    generation: { generator: 'Forge Studio', seed: asset.seed ?? null, created_at: asset.createdAt || new Date().toISOString(), parameters: { complexity: asset.complexity ?? null, asymmetry: asset.asymmetry ?? null } },
    platform: { intended_for: 'Roblox-inspired creative concept', roblox_catalog_item: false, model_file_included: false, upload_status: 'not_created' }
  };
}
function getTags(asset) {
  const record = cmsRecord(asset);
  return record.taxonomy?.tags || [];
}
function render() {
  const query = $('#search').value.trim().toLowerCase();
  const status = $('#status-filter').value;
  const assetClass = $('#class-filter').value;
  visibleAssets = assets.filter((asset) => {
    const haystack = [asset.name, asset.description, asset.assetClass, asset.style, asset.template, ...getTags(asset)].join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && (status === 'all' || getStatus(asset) === status) && (assetClass === 'all' || (asset.assetClass || 'Concept') === assetClass);
  });
  $('#result-count').textContent = `${visibleAssets.length} ${visibleAssets.length === 1 ? 'concept' : 'concepts'}`;
  $('#stat-total').textContent = assets.length;
  $('#stat-draft').textContent = assets.filter((asset) => getStatus(asset) === 'draft').length;
  $('#stat-review').textContent = assets.filter((asset) => getStatus(asset) === 'review').length;
  $('#stat-approved').textContent = assets.filter((asset) => getStatus(asset) === 'approved').length;
  const classes = [...new Set(assets.map((asset) => asset.assetClass || 'Concept'))].sort();
  const selectedClass = $('#class-filter').value;
  $('#class-filter').innerHTML = '<option value="all">All classes</option>' + classes.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join('');
  $('#class-filter').value = classes.includes(selectedClass) ? selectedClass : 'all';
  if (!assets.length) {
    $('#records').innerHTML = '<div class="empty"><span>✳</span><h2>Your library is ready.</h2><p>Generate and save a concept, or create a CMS record to get started.</p><button class="button primary" data-action="new">＋ New concept</button></div>';
    return;
  }
  if (!visibleAssets.length) {
    $('#records').innerHTML = '<div class="empty"><span>⌕</span><h2>No matching concepts.</h2><p>Try changing your search or filters.</p></div>';
    return;
  }
  $('#records').innerHTML = visibleAssets.map((asset) => {
    const record = cmsRecord(asset);
    const color = record.visual?.primary_color?.hex || '#c2f36b';
    const tags = (record.taxonomy?.tags || []).slice(0, 4).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join('');
    const updated = asset._storage?.updatedAt || asset.updatedAt || asset.createdAt;
    const date = updated ? new Date(updated).toLocaleDateString() : 'Date unavailable';
    return `<article class="record-card"><div class="record-art" style="--accent:${escapeHTML(color)}"><span>✳</span><small>${escapeHTML((asset.assetClass || 'CONCEPT').toUpperCase())}</small></div><div class="record-info"><div class="record-topline"><span class="status ${getStatus(asset)}">${escapeHTML(getStatus(asset).replace('-', ' '))}</span><span class="record-date">UPDATED ${escapeHTML(date)}</span></div><h2>${escapeHTML(asset.name)}</h2><p>${escapeHTML(asset.description || 'No description yet.')}</p><div class="tags">${tags}</div><div class="record-meta"><span>${escapeHTML(asset.style || 'Unspecified style')}</span><span>·</span><span>${escapeHTML(asset.template || 'Custom concept')}</span></div></div><div class="record-actions"><button class="button secondary small" data-action="edit" data-id="${escapeHTML(asset.id)}">Edit</button><button class="button secondary small" data-action="export" data-id="${escapeHTML(asset.id)}">JSON</button><button class="icon-button delete" data-action="delete" data-id="${escapeHTML(asset.id)}" aria-label="Delete ${escapeHTML(asset.name)}">×</button></div></article>`;
  }).join('');
}
async function refresh() {
  $('#result-count').textContent = 'Loading concepts…';
  try {
    const result = await api('/assets');
    assets = Array.isArray(result.assets) ? result.assets : [];
    render();
  } catch (error) {
    $('#records').innerHTML = `<div class="empty error"><span>!</span><h2>Database unavailable</h2><p>${escapeHTML(error.message)}. Start Forge Studio with <code>python3 server.py</code>.</p></div>`;
    $('#result-count').textContent = 'Could not load concepts';
  }
}
function openEditor(asset = null) {
  const isNew = !asset;
  $('#editor-title').textContent = isNew ? 'New concept' : 'Edit concept';
  $('#record-id').value = asset?.id || '';
  $('#record-name').value = asset?.name || '';
  $('#record-description').value = asset?.description || '';
  $('#record-class').value = asset?.assetClass || 'Concept';
  $('#record-style').value = asset?.style || '';
  $('#record-tags').value = getTags(asset || {}).join(', ');
  $('#record-status').value = asset ? getStatus(asset) : 'draft';
  $('#editor').showModal();
  $('#record-name').focus();
}
function makeNewAsset(values) {
  const now = new Date().toISOString();
  return { id: `cms-${crypto.randomUUID()}`, name: values.name, description: values.description, assetClass: values.assetClass || 'Concept', style: values.style || 'Unspecified', template: 'Custom concept', color: { name: 'Monochrome', hex: '#d9dedb', dark: '#717b75' }, material: 'Unassigned', parts: [], proportion: '1.00', complexity: 0, asymmetry: 0, seed: null, createdAt: now, cms: {} };
}
async function saveEditor(event) {
  event.preventDefault();
  const id = $('#record-id').value;
  const current = assets.find((asset) => asset.id === id);
  const values = { name: $('#record-name').value.trim(), description: $('#record-description').value.trim(), assetClass: $('#record-class').value.trim(), style: $('#record-style').value.trim(), tags: $('#record-tags').value.split(',').map((tag) => tag.trim()).filter(Boolean), status: $('#record-status').value };
  if (!values.name) return;
  const asset = current ? { ...current } : makeNewAsset(values);
  asset.name = values.name;
  asset.description = values.description;
  asset.assetClass = values.assetClass || 'Concept';
  asset.style = values.style || 'Unspecified';
  const record = cmsRecord(asset);
  record.title = asset.name;
  record.slug = slug(asset.name);
  record.description = asset.description;
  record.status = values.status;
  record.taxonomy = { ...(record.taxonomy || {}), asset_class: asset.assetClass, style: asset.style, tags: [...new Set(values.tags)] };
  record.moderation = { ...(record.moderation || {}), state: values.status === 'approved' ? 'approved' : (values.status === 'review' ? 'in_review' : 'not_submitted') };
  asset.cms = record;
  try {
    await api('/assets', { method: 'POST', body: JSON.stringify(asset) });
    $('#editor').close();
    await refresh();
    toast('Concept saved to the local library.');
  } catch (error) { toast(error.message); }
}
function download(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}
function exportRecords(rows) {
  const now = new Date().toISOString();
  download({ schema_version: '1.0.0', record_type: 'asset_concept_collection', exported_at: now, assets: rows.map(cmsRecord) }, 'forge-cms-library.json');
}
function fromCMSRecord(record) {
  if (record && typeof record.name === 'string' && record.id) return record;
  if (!record || typeof record !== 'object' || typeof (record.title || record.name) !== 'string') throw new Error('Each imported asset needs a title or name.');
  const taxonomy = record.taxonomy || {};
  const visual = record.visual || {};
  const generation = record.generation || {};
  const params = generation.parameters || {};
  const color = visual.primary_color || {};
  const asset = {
    id: String(record.id || `cms-${crypto.randomUUID()}`), name: String(record.title || record.name).slice(0, 160), description: String(record.description || '').slice(0, 4000),
    assetClass: String(taxonomy.asset_class || 'Concept'), style: String(taxonomy.style || 'Unspecified'), template: String(taxonomy.template || 'Imported concept'),
    color: { name: String(color.name || 'Monochrome'), hex: /^#[0-9a-f]{6}$/i.test(color.hex || '') ? color.hex : '#d9dedb', dark: '#717b75' },
    material: String(visual.material || 'Unassigned'), parts: Array.isArray(visual.components) ? visual.components : [], proportion: String(visual.proportions?.body_scale || 1),
    complexity: Number(params.complexity || 0), asymmetry: Number(params.asymmetry || visual.proportions?.asymmetry || 0), seed: generation.seed ?? null,
    createdAt: generation.created_at || new Date().toISOString(), cms: record
  };
  asset.cms = { ...record, id: asset.id, title: asset.name, status: ['draft', 'review', 'approved', 'archived'].includes(record.status) ? record.status : 'draft' };
  return asset;
}
async function importFile(file) {
  try {
    const payload = JSON.parse(await file.text());
    const records = Array.isArray(payload) ? payload : (Array.isArray(payload.assets) ? payload.assets : [payload]);
    if (!records.length) throw new Error('The JSON file contains no asset records.');
    for (const record of records) {
      const asset = fromCMSRecord(record);
      await api('/assets', { method: 'POST', body: JSON.stringify(asset) });
    }
    await refresh();
    toast(`Imported ${records.length} ${records.length === 1 ? 'record' : 'records'}.`);
  } catch (error) { toast(`Import failed: ${error.message}`); }
  finally { $('#import-file').value = ''; }
}
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
}
$('#records').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'new') return openEditor();
  const asset = assets.find((item) => item.id === button.dataset.id);
  if (!asset) return;
  if (action === 'edit') openEditor(asset);
  if (action === 'export') download(cmsRecord(asset), `${slug(asset.name) || 'concept'}-cms.json`);
  if (action === 'delete' && window.confirm(`Delete “${asset.name}” from the local library? This cannot be undone.`)) {
    try { await api(`/assets/${encodeURIComponent(asset.id)}`, { method: 'DELETE' }); await refresh(); toast('Concept deleted.'); }
    catch (error) { toast(error.message); }
  }
});
$('#editor-form').addEventListener('submit', saveEditor);
$('#new-record').addEventListener('click', () => openEditor());
$('#close-editor').addEventListener('click', () => $('#editor').close());
$('#cancel-editor').addEventListener('click', () => $('#editor').close());
$('#search').addEventListener('input', render);
$('#status-filter').addEventListener('change', render);
$('#class-filter').addEventListener('change', render);
$('#refresh-button').addEventListener('click', refresh);
$('#export-button').addEventListener('click', () => exportRecords(visibleAssets.length ? visibleAssets : assets));
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', (event) => { if (event.target.files?.[0]) importFile(event.target.files[0]); });
refresh();
