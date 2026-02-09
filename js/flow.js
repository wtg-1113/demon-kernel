const svg = document.getElementById("flowSvg");
if (!svg) {
  console.error("找不到 #flowSvg：檢查 flow.html 是否有 <svg id='flowSvg'>");
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  children.forEach(c => n.appendChild(c));
  return n;
}

function node(x, y, w, h, title, subtitle, key) {
  const g = el("g", { "data-key": key });
  g.style.cursor = "pointer";

  const r = el("rect", {
    x, y, width: w, height: h, rx: 14,
    fill: "#141414", stroke: "#cfcfcf", "stroke-width": "2"
  });

  /*const t1 = el("text", { x: x + 16, y: y + 30, fill: "#fff", "font-size": "18", "font-weight": "700" });*/
  const t1 = el("text", { x: x + 16, y: y + 46, fill: "#fff", "font-size": "18", "font-weight": "700" });
  t1.textContent = title;

  /*const t2 = el("text", { x: x + 16, y: y + 56, fill: "#bdbdbd", "font-size": "13" });*/
  t2 = el("text", { x: x + 16, y: y + 72, fill: "#bdbdbd", "font-size": "13" });
  t2.textContent = subtitle;


  g.appendChild(r);
  g.appendChild(t1);
  g.appendChild(t2);

  g.addEventListener("click", () => {
    console.log("clicked:", key);
    // 之後你要整合 UI，就在這裡呼叫 openPanel(key)
  });

  return g;
}

function arrow(x1, y1, x2, y2) {
  return el("line", {
    x1, y1, x2, y2,
    stroke: "#cfcfcf", "stroke-width": "2.5",
    "marker-end": "url(#arrowHead)"
  });
}

// arrow head
const defs = el("defs");
defs.appendChild(
  el("marker", {
    id: "arrowHead", markerWidth: "10", markerHeight: "10",
    refX: "9", refY: "3", orient: "auto", markerUnits: "strokeWidth"
  }, [el("path", { d: "M0,0 L10,3 L0,6 Z", fill: "#cfcfcf" })])
);
svg.appendChild(defs);

// nodes
svg.appendChild(node(60, 90, 220, 80, "① 輸入模型", "使用者選擇/上傳模型", "model"));
svg.appendChild(node(60, 220, 220, 80, "② 制定規則", "條件、限制、工具權限", "rules"));
svg.appendChild(node(320, 90, 220, 80, "③ LLM 模型", "選擇 LLM、參數、溫度", "llm"));
svg.appendChild(node(580, 40, 280, 420, "④ 已勾選資料", "顯示勾選資料清單", "selected"));

// arrows (照你的流程)
svg.appendChild(arrow(280, 130, 320, 130)); // 1 -> 3
svg.appendChild(arrow(170, 170, 170, 220)); // 1 -> 2
svg.appendChild(arrow(540, 130, 580, 130)); // 3 -> 4
svg.appendChild(arrow(280, 260, 580, 260)); // 2 -> 4

// ====== overlay: 對齊 ①/④ 的位置（用 viewBox 座標換算成螢幕像素）======
const flowWrap = document.getElementById("flowWrap");
const dropModel = document.getElementById("dropModel");
const dropSelected = document.getElementById("dropSelected");
const selectedList = document.getElementById("selectedList");
const modelInfo = document.getElementById("modelInfo");

// 這兩組座標要跟你 node(...) 畫的一樣
const BOX1 = { x: 60,  y: 98,  w: 220, h: 80  };   // ①
const BOX4 = { x: 580, y: 40,  w: 280, h: 420 };   // ④

function placeOverlay(el, box){
  const vb = svg.viewBox.baseVal;               // 900 x 520
  const rect = svg.getBoundingClientRect();     // SVG 在畫面上的實際大小

  const sx = rect.width / vb.width;
  const sy = rect.height / vb.height;

  el.style.left   = (box.x * sx) + "px";
  el.style.top    = (box.y * sy) + "px";
  el.style.width  = (box.w * sx) + "px";
  el.style.height = (box.h * sy) + "px";
}

function syncOverlays(){
  if (!flowWrap || !dropModel || !dropSelected) return;
  placeOverlay(dropModel, BOX1);
  placeOverlay(dropSelected, BOX4);
}

window.addEventListener("resize", syncOverlays);
syncOverlays();

// ====== 拖曳：丟進① → 在④由上到下列出 ======
let imported = []; // [{id,name,count,paths[]}]

setupDropZone(dropModel, async (files) => {
  const pack = buildPack(files);

  // ✅ ①：把「放入的資料」顯示在第一格框框中
  renderModelBox(pack);

  // ✅ ④：如果你也要同步顯示到④（已勾選資料）就保留
  imported.unshift(pack);
  renderSelected();
});


function setupDropZone(el, onFilesReady){
  el.addEventListener("dragenter", e => { e.preventDefault(); el.classList.add("dragover"); });
  el.addEventListener("dragover",  e => { e.preventDefault(); });
  el.addEventListener("dragleave", () => el.classList.remove("dragover"));
  el.addEventListener("drop", async (e) => {
    e.preventDefault();
    el.classList.remove("dragover");
    const files = await extractFilesFromDrop(e.dataTransfer);
    if (files.length) await onFilesReady(files);
  });
}

async function extractFilesFromDrop(dt){
  const items = dt.items;
  const out = [];

  if (items && items.length){
    for (const item of items){
      const entry = item.webkitGetAsEntry?.();
      if (entry) await traverseEntry(entry, out, "");
      else {
        const f = item.getAsFile?.();
        if (f) out.push({ file: f, path: f.name });
      }
    }
  } else {
    for (const f of dt.files) out.push({ file: f, path: f.name });
  }

  out.sort((a,b)=>a.path.localeCompare(b.path, "zh-Hant"));
  return out;
}

function traverseEntry(entry, out, parentPath){
  return new Promise((resolve) => {
    if (entry.isFile){
      entry.file((file) => {
        out.push({ file, path: parentPath + entry.name });
        resolve();
      });
    } else if (entry.isDirectory){
      const reader = entry.createReader();
      const dirPath = parentPath + entry.name + "/";

      const readAll = () => reader.readEntries(async (entries) => {
        if (!entries || entries.length === 0) return resolve();
        for (const ent of entries) await traverseEntry(ent, out, dirPath);
        readAll();
      });
      readAll();
    } else resolve();
  });
}

function buildPack(files){
  const top = files[0]?.path.split("/")[0] || files[0]?.path || "import";
  return {
    id: crypto.randomUUID(),
    name: top,
    count: files.length,
    paths: files.map(f => f.path)
  };
}

function renderSelected(){
  selectedList.innerHTML = imported.map(pack => `
    <div class="selected-item">
      <div class="name">${escapeHtml(pack.name)}</div>
      <div class="meta">files: ${pack.count}</div>
      <div class="meta">${escapeHtml(pack.paths.slice(0,6).join(" | "))}${pack.paths.length>6 ? " ..." : ""}</div>
      <button onclick="removePack('${pack.id}')">移除</button>
    </div>
  `).join("");
}

window.removePack = function(id){
  imported = imported.filter(p => p.id !== id);
  renderSelected();
}

function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
function renderModelBox(pack){
  if (!modelInfo) return;

  // 顯示：名稱 + 檔案數 + 前幾個路徑（或你也可以只顯示資料夾名）
  modelInfo.innerHTML = `
    <div><b>已放入：</b>${escapeHtml(pack.name)}</div>
    <div style="opacity:.85;">檔案數：${pack.count}</div>
    <div style="margin-top:6px;">
      ${pack.paths.slice(0,3).map(p => `<span class="model-pill">${escapeHtml(p)}</span>`).join("")}
      ${pack.paths.length > 3 ? `<span class="model-pill">... +${pack.paths.length-3}</span>` : ""}
    </div>
  `;
}
