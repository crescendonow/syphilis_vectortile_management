// ═══════════════════════════════════════════════════════
//  Syphilis — Vector Tile Manager v2
//  Main Application JavaScript
// ═══════════════════════════════════════════════════════

const API = location.origin;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ── Utility ──
async function api(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `${r.status}`);
  }
  return r.json();
}

function toast(m, t = "success") {
  const c = {
    success: "border-emerald-500 text-emerald-400",
    error: "border-red-500 text-red-400",
    info: "border-blue-500 text-blue-400",
  };
  const el = document.createElement("div");
  el.className = `toast bg-slate-900 border ${c[t]} rounded-lg px-4 py-3 text-sm font-medium shadow-lg`;
  el.textContent = m;
  $("#toastBox").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function openModal(html, w = "520px") {
  $("#modalContent").innerHTML = html;
  $("#modalContent").style.width = w;
  $("#modalOverlay").classList.remove("hidden");
  $("#modalOverlay").classList.add("flex");
}

function closeModal() {
  $("#modalOverlay").classList.add("hidden");
  $("#modalOverlay").classList.remove("flex");
}

// ── Type Color Map ──
const TC = {
  pipe: "text-blue-400 bg-blue-500/10",
  valve: "text-emerald-400 bg-emerald-500/10",
  firehydrant: "text-red-400 bg-red-500/10",
  meter: "text-amber-400 bg-amber-500/10",
  leakpoint: "text-pink-400 bg-pink-500/10",
  bldg: "text-violet-400 bg-violet-500/10",
  pwa_waterworks: "text-cyan-400 bg-cyan-500/10",
  struct: "text-orange-400 bg-orange-500/10",
  pipe_serv: "text-teal-400 bg-teal-500/10",
};

function badge(t) {
  const c = TC[t] || "text-slate-400 bg-slate-500/10";
  return `<span class="px-2 py-0.5 rounded text-xs font-mono font-semibold ${c}">${t}</span>`;
}

// ═══════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════
const pages = [
  { id: "dashboard",   icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z", label: "Dashboard" },
  { id: "collections", icon: "M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M8 12h8", label: "Collections" },
  { id: "sources",     icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", label: "Tile Sources" },
  { id: "styles",      icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01", label: "Map Styles" },
  { id: "preview",     icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z", label: "Map Preview" },
];

function initNav() {
  $("#navContainer").innerHTML = pages
    .map(
      (p) => `
    <button onclick="nav('${p.id}')" data-p="${p.id}" class="sb-item w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-400">
      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="${p.icon}"/></svg>${p.label}
    </button>`
    )
    .join("");
}

function nav(id) {
  $$("[data-p]").forEach((b) => b.classList.toggle("active", b.dataset.p === id));
  const render = {
    dashboard: renderDashboard,
    collections: renderCollections,
    sources: renderSources,
    styles: renderStyles,
    preview: renderPreview,
  };
  (render[id] || render.dashboard)();
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════
async function renderDashboard() {
  let s = { total_collections: 0, registered_sources: 0, total_styles: 0, database: "" };
  try {
    s = await api("/api/stats");
  } catch (e) {
    $("#dbDot").className = "w-2 h-2 rounded-full bg-red-500";
    $("#dbTxt").textContent = "Error";
  }
  $("#dbName").textContent = s.database || "";
  $("#mainContent").innerHTML = `<div class="p-6 fade-in">
    <h1 class="text-2xl font-bold text-white mb-1">Dashboard</h1>
    <p class="text-sm text-slate-400 mb-6">Syphilis — ระบบจัดการ Vector Tiles สำหรับ PWA GIS Online</p>
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${[
        { l: "Collections", v: s.total_collections, c: "blue", p: "collections" },
        { l: "Tile Sources", v: s.registered_sources, c: "indigo", p: "sources" },
        { l: "Map Styles", v: s.total_styles, c: "violet", p: "styles" },
      ]
        .map(
          (x) => `
        <div onclick="nav('${x.p}')" class="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-${x.c}-500/30 transition">
          <div class="text-sm text-slate-400 mb-2">${x.l}</div>
          <div class="text-3xl font-bold text-white font-mono">${x.v.toLocaleString()}</div>
        </div>`
        )
        .join("")}
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 class="font-bold text-white mb-3">Tile URL Patterns</h3>
      <div class="space-y-2 text-xs font-mono">
        <div class="p-2 bg-slate-950 rounded"><span class="text-slate-500">Registered:</span> <span class="text-emerald-400">/tiles/{source_id}/{z}/{x}/{y}.pbf</span></div>
        <div class="p-2 bg-slate-950 rounded"><span class="text-slate-500">Direct:</span> <span class="text-cyan-400">/tiles/direct/{pwa_code}/{feature_type}/{z}/{x}/{y}.pbf</span></div>
        <div class="p-2 bg-slate-950 rounded"><span class="text-slate-500">With filter:</span> <span class="text-amber-400">...pbf?f_pipe_type=PVC&columns=pipe_type,pipe_size</span></div>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
//  COLLECTIONS
// ═══════════════════════════════════════════════════════
let colSkip = 0;

async function renderCollections() {
  $("#mainContent").innerHTML = `<div class="p-6 fade-in">
    <h1 class="text-2xl font-bold text-white mb-1">MongoDB Collections</h1>
    <p class="text-sm text-slate-400 mb-4">เรียกดู collections จาก <span class="font-mono text-cyan-400">vallaris_feature</span></p>
    <div class="flex gap-3 mb-4">
      <input id="cSrch" type="text" placeholder="ค้นหา alias เช่น b5531011 หรือ pipe ..." class="flex-1 pl-3 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:border-blue-500 focus:outline-none" onkeydown="if(event.key==='Enter')searchCol()">
      <select id="cType" class="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm" onchange="searchCol()">
        <option value="">All Types</option>
        ${["pipe", "valve", "firehydrant", "meter", "leakpoint", "bldg", "pwa_waterworks", "struct", "pipe_serv"].map((t) => `<option>${t}</option>`).join("")}
      </select>
      <button onclick="searchCol()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Search</button>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <table class="w-full text-sm"><thead><tr class="border-b border-slate-800">
        <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Alias</th>
        <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">PWA Code</th>
        <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
        <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Features</th>
        <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
      </tr></thead><tbody id="cBody"><tr><td colspan="5" class="px-4 py-12 text-center text-slate-500">กด Search เพื่อค้นหา...</td></tr></tbody></table>
    </div>
    <div id="cPag" class="flex justify-between items-center mt-3 text-xs text-slate-500"></div>
  </div>`;
}

async function searchCol(skip = 0) {
  colSkip = skip;
  const s = $("#cSrch").value,
    t = $("#cType").value;
  let q = `?skip=${skip}&limit=50`;
  if (s) q += `&search=${encodeURIComponent(s)}`;
  if (t) q += `&feature_type=${t}`;
  try {
    const d = await api(`/api/collections${q}`);
    $("#cBody").innerHTML =
      d.collections.length === 0
        ? '<tr><td colspan="5" class="px-4 py-12 text-center text-slate-500">ไม่พบ</td></tr>'
        : d.collections
            .map(
              (c) => `<tr class="hover:bg-slate-800/30">
        <td class="px-4 py-2.5 font-mono text-xs text-slate-300">${c.alias}</td>
        <td class="px-4 py-2.5 font-mono text-xs text-cyan-400">${c.pwa_code}</td>
        <td class="px-4 py-2.5">${badge(c.feature_type)}</td>
        <td class="px-4 py-2.5 text-right font-mono text-xs">${c.feature_count.toLocaleString()}</td>
        <td class="px-4 py-2.5 text-right space-x-2">
          <button onclick="openRegModal('${c.pwa_code}','${c.feature_type}','${c.alias}')" class="text-xs text-blue-400 hover:text-blue-300">+Register</button>
          <button onclick="openColumnBrowser('${c.pwa_code}','${c.feature_type}')" class="text-xs text-amber-400 hover:text-amber-300">Columns</button>
          <button onclick="nav('preview');setTimeout(()=>directPreview('${c.pwa_code}','${c.feature_type}'),300)" class="text-xs text-emerald-400 hover:text-emerald-300">Preview</button>
        </td></tr>`
            )
            .join("");
    $("#cPag").innerHTML = `<span>${skip + 1}–${Math.min(skip + 50, d.total)} of ${d.total}</span><div class="flex gap-2">
      ${skip > 0 ? `<button onclick="searchCol(${skip - 50})" class="px-3 py-1 bg-slate-800 rounded hover:bg-slate-700">← Prev</button>` : ""}
      ${skip + 50 < d.total ? `<button onclick="searchCol(${skip + 50})" class="px-3 py-1 bg-slate-800 rounded hover:bg-slate-700">Next →</button>` : ""}
    </div>`;
  } catch (e) {
    toast(e.message, "error");
  }
}

// ═══════════════════════════════════════════════════════
//  COLUMN BROWSER
// ═══════════════════════════════════════════════════════
async function openColumnBrowser(pwa, ftype) {
  openModal('<div class="text-center py-8 text-slate-400">Loading columns...</div>', "640px");
  try {
    const d = await api(`/api/columns/${pwa}/${ftype}`);
    const rows = d.columns
      .map(
        (c, i) => `<tr class="hover:bg-slate-800/30 ${c.found ? "" : "opacity-40"}">
      <td class="px-3 py-2 font-mono text-xs ${c.unmapped ? "text-orange-400" : "text-emerald-400"}">${c.key}</td>
      <td class="px-3 py-2 font-mono text-xs text-slate-500">${c.mongo_key}</td>
      <td class="px-3 py-2 text-xs">${c.found ? '<span class="text-emerald-400">✓</span>' : '<span class="text-slate-600">✗</span>'}</td>
      <td class="px-3 py-2 font-mono text-xs text-slate-500 truncate max-w-[200px]">${c.sample || "—"}</td>
      <td class="px-3 py-2 text-right"><button onclick="openValuesBrowser('${pwa}','${ftype}','${c.key}')" class="text-xs text-blue-400 hover:text-blue-300">Values</button></td>
    </tr>`
      )
      .join("");
    openModal(
      `
      <div class="flex justify-between items-center mb-4">
        <div><h3 class="text-lg font-bold text-white">Columns: ${d.alias}</h3>
        <p class="text-xs text-slate-500">${d.columns.length} columns discovered (${d.total_raw_keys} raw keys)</p></div>
        <button onclick="closeModal()" class="text-slate-500 hover:text-white text-xl">&times;</button>
      </div>
      <table class="w-full text-sm"><thead><tr class="border-b border-slate-800">
        <th class="text-left px-3 py-2 text-xs text-slate-500 uppercase">Column (PG)</th>
        <th class="text-left px-3 py-2 text-xs text-slate-500 uppercase">MongoDB Key</th>
        <th class="px-3 py-2 text-xs text-slate-500 uppercase">Found</th>
        <th class="text-left px-3 py-2 text-xs text-slate-500 uppercase">Sample Value</th>
        <th class="px-3 py-2"></th>
      </tr></thead><tbody>${rows}</tbody></table>
    `,
      "700px"
    );
  } catch (e) {
    toast(e.message, "error");
    closeModal();
  }
}

async function openValuesBrowser(pwa, ftype, field) {
  try {
    const d = await api(`/api/values/${pwa}/${ftype}/${field}`);
    openModal(
      `
      <div class="flex justify-between items-center mb-4">
        <div><h3 class="text-lg font-bold text-white">Unique Values: ${field}</h3>
        <p class="text-xs text-slate-500">mongo: ${d.mongo_field} | ${d.values.length} values</p></div>
        <button onclick="closeModal()" class="text-slate-500 hover:text-white text-xl">&times;</button>
      </div>
      <div class="max-h-[50vh] overflow-auto space-y-1">
        ${d.values.map((v) => `<div class="px-3 py-1.5 bg-slate-950 rounded font-mono text-xs text-slate-300">${v}</div>`).join("")}
      </div>
      <button onclick="openColumnBrowser('${pwa}','${ftype}')" class="mt-4 text-xs text-blue-400 hover:text-blue-300">← Back to columns</button>
    `,
      "480px"
    );
  } catch (e) {
    toast(e.message, "error");
  }
}

// ═══════════════════════════════════════════════════════
//  TILE SOURCES
// ═══════════════════════════════════════════════════════
async function renderSources() {
  let data;
  try {
    data = await api("/api/sources");
  } catch (e) {
    toast(e.message, "error");
    return;
  }
  const list =
    data.sources.length === 0
      ? '<div class="text-center py-16 text-slate-500 text-sm">ยังไม่มี tile source</div>'
      : data.sources
          .map(
            (s) => `
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="font-semibold text-white text-sm">${s.display_name || s.alias}</span>${badge(s.feature_type)}
              <span class="text-xs text-slate-500 font-mono">z${s.min_zoom}–${s.max_zoom}</span>
            </div>
            <div class="flex items-center gap-2 mt-1.5">
              <code class="text-[11px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded truncate">/tiles/${s.source_id}/{z}/{x}/{y}.pbf</code>
              <button onclick="navigator.clipboard.writeText('${API}/tiles/${s.source_id}/{z}/{x}/{y}.pbf');toast('Copied!','info')" class="text-xs text-slate-500 hover:text-white flex-shrink-0">📋</button>
            </div>
          </div>
          <div class="flex gap-1 ml-3 flex-shrink-0">
            <button onclick="nav('preview');setTimeout(()=>srcPreview('${s.source_id}','${s.alias}'),300)" class="p-1.5 rounded hover:bg-slate-800 text-emerald-400" title="Preview">👁</button>
            <button onclick="deleteSrc('${s.source_id}')" class="p-1.5 rounded hover:bg-slate-800 text-red-400" title="Delete">🗑</button>
          </div>
        </div>
      </div>`
          )
          .join("");
  $("#mainContent").innerHTML = `<div class="p-6 fade-in">
    <div class="flex justify-between items-center mb-6">
      <div><h1 class="text-2xl font-bold text-white mb-1">Tile Sources</h1><p class="text-sm text-slate-400">Collections ที่ register เป็น tile source</p></div>
      <button onclick="openRegModal()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">+ Register Source</button>
    </div>
    <div class="space-y-3">${list}</div>
  </div>`;
}

function openRegModal(pwa = "", ft = "pipe", dn = "") {
  openModal(`
    <div class="flex justify-between items-center mb-4"><h3 class="text-lg font-bold text-white">Register Tile Source</h3><button onclick="closeModal()" class="text-slate-500 hover:text-white text-xl">&times;</button></div>
    <div class="space-y-3">
      <div><label class="block text-xs font-semibold text-slate-400 uppercase mb-1">PWA Code</label><input id="rPwa" value="${pwa}" placeholder="b55310001" class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none"></div>
      <div><label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Feature Type</label>
        <select id="rFt" class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-none">
          ${["pipe", "valve", "firehydrant", "meter", "leakpoint", "bldg", "pwa_waterworks", "struct", "pipe_serv"].map((t) => `<option ${t === ft ? "selected" : ""}>${t}</option>`).join("")}
        </select></div>
      <div><label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Display Name</label><input id="rDn" value="${dn}" class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-none"></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Min Zoom</label><input id="rZmin" type="number" value="0" class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono focus:outline-none"></div>
        <div><label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Max Zoom</label><input id="rZmax" type="number" value="18" class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono focus:outline-none"></div>
      </div>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick="closeModal()" class="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800">Cancel</button>
      <button onclick="doRegister()" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">Register</button>
    </div>`);
}

async function doRegister() {
  const p = $("#rPwa").value.trim();
  if (!p) { toast("กรุณาระบุ PWA Code", "error"); return; }
  try {
    await api("/api/sources", {
      method: "POST",
      body: JSON.stringify({
        pwa_code: p,
        feature_type: $("#rFt").value,
        display_name: $("#rDn").value || `${p}_${$("#rFt").value}`,
        min_zoom: +$("#rZmin").value,
        max_zoom: +$("#rZmax").value,
      }),
    });
    toast("Registered!");
    closeModal();
    renderSources();
  } catch (e) {
    toast(e.message, "error");
  }
}

async function deleteSrc(id) {
  if (!confirm("ลบ?")) return;
  try {
    await api(`/api/sources/${id}`, { method: "DELETE" });
    toast("Deleted");
    renderSources();
  } catch (e) {
    toast(e.message, "error");
  }
}

// ═══════════════════════════════════════════════════════
//  MAP STYLES — Full Visual Editor
// ═══════════════════════════════════════════════════════
let editStyleId = null;
let seLayers = [];
let seSources = [];

async function renderStyles() {
  let d;
  try { d = await api("/api/styles"); } catch (e) { toast(e.message, "error"); return; }
  const list =
    d.styles.length === 0
      ? '<div class="col-span-2 text-center py-16 text-slate-500 text-sm">ยังไม่มี style</div>'
      : d.styles
          .map(
            (s) => `
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-violet-500/30 transition">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1"><div class="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-pink-500"></div>
              <span class="font-semibold text-white text-sm">${s.name}</span></div>
            <p class="text-xs text-slate-500 mb-2">${s.description || ""}</p>
            <span class="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 text-xs font-mono">${s.layer_count} layers</span>
          </div>
          <div class="flex gap-1">
            <button onclick="viewJson('${s.style_id}')" class="p-1.5 rounded hover:bg-slate-800 text-cyan-400" title="JSON">{ }</button>
            <button onclick="openStyleEditor('${s.style_id}')" class="p-1.5 rounded hover:bg-slate-800 text-amber-400" title="Edit">✏️</button>
            <button onclick="delStyle('${s.style_id}')" class="p-1.5 rounded hover:bg-slate-800 text-red-400" title="Delete">🗑</button>
          </div>
        </div>
      </div>`
          )
          .join("");
  $("#mainContent").innerHTML = `<div class="p-6 fade-in">
    <div class="flex justify-between items-center mb-6">
      <div><h1 class="text-2xl font-bold text-white mb-1">Map Styles</h1><p class="text-sm text-slate-400">สร้างและจัดการ MapLibre styles — แก้ไข layers, filters, columns</p></div>
      <button onclick="openStyleEditor()" class="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg">+ New Style</button>
    </div>
    <div class="grid grid-cols-2 gap-4">${list}</div>
  </div>`;
}

async function openStyleEditor(id) {
  editStyleId = id || null;
  try { seSources = (await api("/api/sources")).sources; } catch { seSources = []; }
  let name = "", desc = "";
  seLayers = [];
  if (id) {
    const d = await api(`/api/styles/${id}`);
    name = d.name;
    desc = d.description || "";
    const sj = d.style_json || {};
    seLayers = (sj.layers || []).filter((l) => l.type !== "raster").map((l, i) => ({ ...l, _k: i }));
  }
  renderStyleEditorModal(name, desc);
}

function renderStyleEditorModal(name, desc) {
  const srcOpts = seSources.map((s) => `<option value="${s.alias || s.source_id}">${s.display_name || s.alias} (${s.feature_type})</option>`).join("");
  const types = ["circle", "line", "fill", "fill-extrusion", "symbol"];

  const layerHtml = seLayers
    .map((l, i) => {
      const p = l.paint || {};
      let paintUI = "";
      if (l.type === "circle")
        paintUI = `<div class="flex gap-2 items-center flex-wrap">
        <label class="text-[10px] text-slate-500 w-14">color</label><input type="color" value="${p["circle-color"] || "#e74c3c"}" onchange="seLayers[${i}].paint['circle-color']=this.value" class="w-7 h-6 border-0 bg-transparent cursor-pointer">
        <label class="text-[10px] text-slate-500 w-14">radius</label><input type="range" min="1" max="20" value="${p["circle-radius"] || 5}" onchange="seLayers[${i}].paint['circle-radius']=+this.value;this.nextElementSibling.textContent=this.value" class="w-20"><span class="text-xs font-mono text-slate-400 w-4">${p["circle-radius"] || 5}</span>
        <label class="text-[10px] text-slate-500 w-14">stroke</label><input type="color" value="${p["circle-stroke-color"] || "#ffffff"}" onchange="seLayers[${i}].paint['circle-stroke-color']=this.value" class="w-7 h-6 border-0 bg-transparent cursor-pointer">
        <label class="text-[10px] text-slate-500 w-14">stroke-w</label><input type="number" min="0" max="5" step="0.5" value="${p["circle-stroke-width"] || 1}" onchange="seLayers[${i}].paint['circle-stroke-width']=+this.value" class="w-12 px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-center">
        <label class="text-[10px] text-slate-500 w-14">opacity</label><input type="range" min="0" max="1" step="0.1" value="${p["circle-opacity"] || 1}" onchange="seLayers[${i}].paint['circle-opacity']=+this.value;this.nextElementSibling.textContent=this.value" class="w-16"><span class="text-xs font-mono text-slate-400 w-6">${p["circle-opacity"] || 1}</span>
      </div>`;
      else if (l.type === "line")
        paintUI = `<div class="flex gap-2 items-center flex-wrap">
        <label class="text-[10px] text-slate-500 w-14">color</label><input type="color" value="${p["line-color"] || "#3498db"}" onchange="seLayers[${i}].paint['line-color']=this.value" class="w-7 h-6 border-0 bg-transparent cursor-pointer">
        <label class="text-[10px] text-slate-500 w-14">width</label><input type="range" min="0.5" max="10" step="0.5" value="${p["line-width"] || 2}" onchange="seLayers[${i}].paint['line-width']=+this.value;this.nextElementSibling.textContent=this.value" class="w-20"><span class="text-xs font-mono text-slate-400 w-4">${p["line-width"] || 2}</span>
        <label class="text-[10px] text-slate-500 w-14">opacity</label><input type="range" min="0" max="1" step="0.1" value="${p["line-opacity"] || 1}" onchange="seLayers[${i}].paint['line-opacity']=+this.value;this.nextElementSibling.textContent=this.value" class="w-16"><span class="text-xs font-mono text-slate-400 w-6">${p["line-opacity"] || 1}</span>
      </div>`;
      else if (l.type === "fill")
        paintUI = `<div class="flex gap-2 items-center flex-wrap">
        <label class="text-[10px] text-slate-500 w-14">color</label><input type="color" value="${p["fill-color"] || "#2ecc71"}" onchange="seLayers[${i}].paint['fill-color']=this.value" class="w-7 h-6 border-0 bg-transparent cursor-pointer">
        <label class="text-[10px] text-slate-500 w-14">opacity</label><input type="range" min="0" max="1" step="0.05" value="${p["fill-opacity"] || 0.4}" onchange="seLayers[${i}].paint['fill-opacity']=+this.value;this.nextElementSibling.textContent=this.value" class="w-20"><span class="text-xs font-mono text-slate-400 w-6">${p["fill-opacity"] || 0.4}</span>
        <label class="text-[10px] text-slate-500 w-14">outline</label><input type="color" value="${p["fill-outline-color"] || "#27ae60"}" onchange="seLayers[${i}].paint['fill-outline-color']=this.value" class="w-7 h-6 border-0 bg-transparent cursor-pointer">
      </div>`;
      else if (l.type === "fill-extrusion")
        paintUI = `<div class="flex gap-2 items-center flex-wrap">
        <label class="text-[10px] text-slate-500 w-14">color</label><input type="color" value="${p["fill-extrusion-color"] || "#6c5ce7"}" onchange="seLayers[${i}].paint['fill-extrusion-color']=this.value" class="w-7 h-6 border-0 bg-transparent cursor-pointer">
        <label class="text-[10px] text-slate-500 w-14">height</label><input type="number" min="0" max="200" value="${p["fill-extrusion-height"] || 30}" onchange="seLayers[${i}].paint['fill-extrusion-height']=+this.value" class="w-14 px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-mono">
        <label class="text-[10px] text-slate-500 w-14">opacity</label><input type="range" min="0" max="1" step="0.1" value="${p["fill-extrusion-opacity"] || 0.8}" onchange="seLayers[${i}].paint['fill-extrusion-opacity']=+this.value;this.nextElementSibling.textContent=this.value" class="w-16"><span class="text-xs font-mono text-slate-400 w-6">${p["fill-extrusion-opacity"] || 0.8}</span>
      </div>`;
      else paintUI = '<div class="text-xs text-slate-500">Edit paint via JSON below</div>';

      const filterStr = l.filter ? JSON.stringify(l.filter) : "";

      return `<div class="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
      <div class="flex gap-2 items-center">
        <input value="${l.id || ""}" onchange="seLayers[${i}].id=this.value" placeholder="layer-id" class="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono focus:outline-none">
        <select onchange="seLayers[${i}].type=this.value;seLayers[${i}].paint=getDefaultPaint(this.value);renderStyleEditorModal($('#seName').value,$('#seDesc').value)" class="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono">
          ${types.map((t) => `<option ${t === l.type ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <select onchange="seLayers[${i}].source=this.value;seLayers[${i}]['source-layer']=this.value" class="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono max-w-[120px]">
          ${srcOpts}
        </select>
        <button onclick="seLayers.splice(${i},1);renderStyleEditorModal($('#seName').value,$('#seDesc').value)" class="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
      </div>
      <div class="text-[10px] text-slate-500 uppercase font-semibold">Paint</div>
      ${paintUI}
      <details class="text-xs"><summary class="text-slate-500 cursor-pointer hover:text-slate-300">Filter & Columns</summary>
        <div class="mt-2 space-y-2">
          <div><label class="text-[10px] text-slate-500">Filter (MapLibre expression JSON):</label>
            <input value='${filterStr.replace(/'/g, "&#39;")}' onchange="try{seLayers[${i}].filter=JSON.parse(this.value)}catch{}" placeholder='["==","$type","Point"] or ["==",["get","pipe_type"],"PVC"]' class="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono focus:outline-none">
          </div>
          <div><label class="text-[10px] text-slate-500">Visible Columns (comma-separated, tile URL ?columns=):</label>
            <input id="seCols${i}" value="${l._columns || ""}" onchange="seLayers[${i}]._columns=this.value" placeholder="pipe_type,pipe_size,pwa_code" class="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono focus:outline-none">
            <button onclick="loadColsForLayer(${i})" class="mt-1 text-[10px] text-blue-400 hover:text-blue-300">↓ Load available columns</button>
          </div>
        </div>
      </details>
    </div>`;
    })
    .join("");

  openModal(
    `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold text-white">${editStyleId ? "Edit" : "New"} Map Style</h3>
      <button onclick="closeModal()" class="text-slate-500 hover:text-white text-xl">&times;</button>
    </div>
    <div class="space-y-3">
      <input id="seName" value="${name}" placeholder="Style name" class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:border-violet-500 focus:outline-none">
      <input id="seDesc" value="${desc}" placeholder="Description" class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-none">
      <div class="flex justify-between items-center">
        <span class="text-xs font-semibold text-slate-400 uppercase">Layers (${seLayers.length})</span>
        <div class="flex gap-2">
          <button onclick="addSeLayer('circle')" class="text-xs bg-slate-800 px-2 py-1 rounded text-blue-400 hover:bg-slate-700">+ Circle</button>
          <button onclick="addSeLayer('line')" class="text-xs bg-slate-800 px-2 py-1 rounded text-cyan-400 hover:bg-slate-700">+ Line</button>
          <button onclick="addSeLayer('fill')" class="text-xs bg-slate-800 px-2 py-1 rounded text-emerald-400 hover:bg-slate-700">+ Fill</button>
        </div>
      </div>
      <div class="max-h-[45vh] overflow-auto space-y-2">${layerHtml || '<div class="text-center py-6 text-slate-600 text-xs">Add layers above</div>'}</div>
    </div>
    <div class="flex justify-between mt-5">
      <button onclick="previewStyleDraft()" class="text-xs text-emerald-400 hover:text-emerald-300">👁 Preview draft</button>
      <div class="flex gap-2">
        <button onclick="closeModal()" class="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800">Cancel</button>
        <button onclick="saveStyleEditor()" class="px-4 py-2 text-sm text-white bg-violet-600 rounded-lg hover:bg-violet-700">Save Style</button>
      </div>
    </div>
  `,
    "720px"
  );
}

function getDefaultPaint(type) {
  const dp = {
    circle: { "circle-radius": 5, "circle-color": "#e74c3c", "circle-stroke-width": 1, "circle-stroke-color": "#ffffff", "circle-opacity": 1 },
    line: { "line-color": "#3498db", "line-width": 2, "line-opacity": 1 },
    fill: { "fill-color": "#2ecc71", "fill-opacity": 0.4, "fill-outline-color": "#27ae60" },
    "fill-extrusion": { "fill-extrusion-color": "#6c5ce7", "fill-extrusion-height": 30, "fill-extrusion-opacity": 0.8 },
    symbol: {},
  };
  return dp[type] || {};
}

function addSeLayer(type) {
  const src = seSources[0];
  seLayers.push({
    _k: Date.now(),
    id: `layer-${seLayers.length + 1}`,
    type,
    source: src?.alias || "",
    "source-layer": src?.alias || "",
    paint: getDefaultPaint(type),
    _columns: "",
  });
  renderStyleEditorModal($("#seName").value, $("#seDesc").value);
}

async function loadColsForLayer(idx) {
  const l = seLayers[idx];
  const src = seSources.find((s) => (s.alias || s.source_id) === l.source);
  if (!src) { toast("Source not found", "error"); return; }
  try {
    const d = await api(`/api/columns/${src.pwa_code}/${src.feature_type}`);
    const keys = d.columns.filter((c) => c.found).map((c) => c.key).join(",");
    seLayers[idx]._columns = keys;
    const el = document.getElementById(`seCols${idx}`);
    if (el) el.value = keys;
    toast(`Loaded ${d.columns.filter((c) => c.found).length} columns`, "info");
  } catch (e) {
    toast(e.message, "error");
  }
}

function buildStyleJson() {
  const sources = { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256 } };
  seSources.forEach((s) => {
    sources[s.alias || s.source_id] = { type: "vector", tiles: [`${API}/tiles/${s.source_id}/{z}/{x}/{y}.pbf`], minzoom: s.min_zoom || 0, maxzoom: s.max_zoom || 18 };
  });
  const layers = [{ id: "osm-base", type: "raster", source: "osm" }];
  seLayers.forEach((l) => {
    const { _k, _columns, ...layer } = l;
    if (_columns) {
      const src = sources[layer.source];
      if (src && src.tiles) {
        src.tiles = src.tiles.map((t) => (t.includes("?") ? t : `${t}?columns=${_columns}`));
      }
    }
    layers.push(layer);
  });
  return { version: 8, name: $("#seName").value, sources, layers };
}

async function saveStyleEditor() {
  const name = $("#seName").value.trim();
  if (!name) { toast("ระบุชื่อ", "error"); return; }
  const sj = buildStyleJson();
  try {
    if (editStyleId) {
      await api(`/api/styles/${editStyleId}`, { method: "PUT", body: JSON.stringify({ name, description: $("#seDesc").value, style_json: sj }) });
      toast("Updated");
    } else {
      await api("/api/styles", { method: "POST", body: JSON.stringify({ name, description: $("#seDesc").value, style_json: sj }) });
      toast("Created");
    }
    closeModal();
    renderStyles();
  } catch (e) {
    toast(e.message, "error");
  }
}

function previewStyleDraft() {
  const sj = buildStyleJson();
  closeModal();
  nav("preview");
  setTimeout(() => initMapWith(sj), 300);
}

async function viewJson(id) {
  const d = await api(`/api/styles/${id}`);
  openModal(
    `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold text-white">Style JSON</h3>
      <div class="flex gap-2"><button onclick="navigator.clipboard.writeText(document.getElementById('jv').textContent);toast('Copied!','info')" class="text-xs px-3 py-1 bg-slate-800 rounded text-slate-400 hover:text-white">Copy</button>
      <button onclick="closeModal()" class="text-slate-500 hover:text-white text-xl">&times;</button></div>
    </div>
    <pre id="jv" class="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-cyan-400 overflow-auto max-h-[60vh] whitespace-pre-wrap">${JSON.stringify(d.style_json, null, 2)}</pre>
  `,
    "660px"
  );
}

async function delStyle(id) {
  if (!confirm("ลบ?")) return;
  try {
    await api(`/api/styles/${id}`, { method: "DELETE" });
    toast("Deleted");
    renderStyles();
  } catch (e) {
    toast(e.message, "error");
  }
}

// ═══════════════════════════════════════════════════════
//  MAP PREVIEW
// ═══════════════════════════════════════════════════════
let pMap = null;

async function renderPreview() {
  let srcs = [], stys = [];
  try {
    [srcs, stys] = await Promise.all([api("/api/sources").then((d) => d.sources), api("/api/styles").then((d) => d.styles)]);
  } catch {}

  const srcList = srcs.length
    ? srcs
        .map(
          (s) => `<button onclick="srcPreview('${s.source_id}','${s.alias}')" class="w-full text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition text-xs">
    <div class="font-semibold text-white truncate">${s.display_name || s.alias}</div><div class="text-slate-500 font-mono mt-0.5">${s.feature_type}</div></button>`
        )
        .join("")
    : '<div class="text-xs text-slate-600">No sources</div>';
  const styList = stys.length
    ? stys
        .map(
          (s) => `<button onclick="styPreview('${s.style_id}')" class="w-full text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition text-xs">
    <div class="font-semibold text-white truncate">${s.name}</div><div class="text-slate-500 font-mono mt-0.5">${s.layer_count} layers</div></button>`
        )
        .join("")
    : '<div class="text-xs text-slate-600">No styles</div>';

  $("#mainContent").innerHTML = `<div class="flex h-full">
    <div class="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 p-4 overflow-auto">
      <h2 class="font-bold text-white text-sm mb-3">Map Preview</h2>
      <div class="text-xs text-slate-500 uppercase font-semibold mb-2">Tile Sources</div>
      <div class="space-y-1.5 mb-4">${srcList}</div>
      <div class="text-xs text-slate-500 uppercase font-semibold mb-2">Saved Styles</div>
      <div class="space-y-1.5">${styList}</div>
    </div>
    <div class="flex-1 relative">
      <div id="pMap" class="w-full h-full"></div>
      <div id="pEmpty" class="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-950">
        <svg class="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
        <span class="text-sm">เลือก source หรือ style เพื่อแสดงผล</span>
      </div>
    </div>
  </div>`;
}

function initMapWith(style) {
  const pe = $("#pEmpty");
  if (pe) pe.style.display = "none";
  if (pMap) { pMap.remove(); pMap = null; }
  pMap = new maplibregl.Map({ container: "pMap", style, center: [100.5, 13.75], zoom: 10 });
  pMap.addControl(new maplibregl.NavigationControl(), "top-right");

  pMap.on("load", () => {
    pMap.on("click", (e) => {
      const fs = pMap.queryRenderedFeatures(e.point);
      if (!fs.length) return;
      const f = fs[0];
      const p = f.properties;
      if (!p || !Object.keys(p).length) return;
      const html = Object.entries(p)
        .map(([k, v]) => `<tr><td class="pr-2 font-semibold text-slate-600">${k}</td><td>${v}</td></tr>`)
        .join("");
      new maplibregl.Popup({ maxWidth: "320px" }).setLngLat(e.lngLat).setHTML(`<table style="font-size:12px">${html}</table>`).addTo(pMap);
    });
  });
}

function srcPreview(id, layer) {
  initMapWith({
    version: 8,
    sources: {
      osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256 },
      d: { type: "vector", tiles: [`${API}/tiles/${id}/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: 18 },
    },
    layers: [
      { id: "osm", type: "raster", source: "osm" },
      { id: "p", type: "circle", source: "d", "source-layer": layer, filter: ["==", "$type", "Point"], paint: { "circle-radius": 6, "circle-color": "#e74c3c", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } },
      { id: "l", type: "line", source: "d", "source-layer": layer, filter: ["==", "$type", "LineString"], paint: { "line-color": "#3498db", "line-width": 3 } },
      { id: "f", type: "fill", source: "d", "source-layer": layer, filter: ["==", "$type", "Polygon"], paint: { "fill-color": "#2ecc71", "fill-opacity": 0.35, "fill-outline-color": "#27ae60" } },
    ],
  });
}

function directPreview(pwa, ft) {
  initMapWith({
    version: 8,
    sources: {
      osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256 },
      d: { type: "vector", tiles: [`${API}/tiles/direct/${pwa}/${ft}/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: 18 },
    },
    layers: [
      { id: "osm", type: "raster", source: "osm" },
      { id: "p", type: "circle", source: "d", "source-layer": ft, filter: ["==", "$type", "Point"], paint: { "circle-radius": 6, "circle-color": "#e74c3c", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } },
      { id: "l", type: "line", source: "d", "source-layer": ft, filter: ["==", "$type", "LineString"], paint: { "line-color": "#3498db", "line-width": 3 } },
      { id: "f", type: "fill", source: "d", "source-layer": ft, filter: ["==", "$type", "Polygon"], paint: { "fill-color": "#2ecc71", "fill-opacity": 0.35 } },
    ],
  });
}

async function styPreview(id) {
  try {
    const s = await api(`/api/styles/${id}/style.json`);
    initMapWith(s);
  } catch (e) {
    toast(e.message, "error");
  }
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
initNav();
nav("dashboard");
