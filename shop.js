/* Shared shop layer: cart state, floating cart button, cart drawer.
   Reads window.WORKS (data.js). Every piece is one of a kind, so quantity is always 1.
   Cart persists per browser in localStorage (falls back to memory if storage is blocked). */
(() => {
  const KEY = "bruno-cart-v1";
  const WORKS = window.WORKS || [];
  const byId = new Map(WORKS.map(w => [w.id, w]));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = p => (typeof p === "number" ? "$" + p.toLocaleString("en-US", { minimumFractionDigits: p % 1 ? 2 : 0 }) : "Price TBD");
  let mem = [];
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return mem; } };
  const save = ids => { mem = ids; try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) { /* memory only */ } };
  const subs = new Set();
  const valid = ids => ids.filter(id => { const w = byId.get(id); return w && w.status === "Available"; });
  const ids = () => valid(load());
  const emit = () => { const list = ids(); subs.forEach(f => f(list)); };

  const Shop = {
    items: () => ids().map(id => byId.get(id)),
    has: id => ids().includes(id),
    add(id) { const w = byId.get(id); if (!w || w.status !== "Available") return false; const l = ids(); if (!l.includes(id)) { l.push(id); save(l); } emit(); return true; },
    remove(id) { save(ids().filter(x => x !== id)); emit(); },
    clear() { save([]); emit(); },
    count: () => ids().length,
    totals() {
      const items = Shop.items(), priced = items.filter(w => typeof w.price === "number");
      return { items, subtotal: priced.reduce((a, w) => a + w.price, 0), unpriced: items.length - priced.length };
    },
    money, esc, byId,
    pic: w => (w.pole || w),
    onChange: f => { subs.add(f); f(ids()); },
    open: () => openDrawer(), close: () => closeDrawer()
  };
  window.Shop = Shop;
  addEventListener("storage", e => { if (e.key === KEY) emit(); });

  /* ---------- UI: floating cart button + drawer ---------- */
  const css = `
  .shop-fab{position:fixed;z-index:60;top:max(14px,env(safe-area-inset-top,0px));right:max(14px,env(safe-area-inset-right,0px));display:flex;align-items:center;gap:8px;
    height:46px;padding:0 16px 0 13px;border:0;border-radius:23px;background:#16181B;color:#F4EFE2;font:800 14px/1 "Overpass",system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;
    box-shadow:0 8px 22px rgba(0,0,0,.35);cursor:pointer}
  .shop-fab svg{width:20px;height:20px}
  .shop-fab .n{min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#FF7A1F;color:#16181B;display:grid;place-items:center;font:800 12px/1 "Overpass Mono",monospace}
  .shop-fab.bump{animation:shopBump .45s ease}
  @keyframes shopBump{40%{transform:scale(1.12)}}
  .shop-scrim{position:fixed;inset:0;z-index:70;background:rgba(8,10,22,.55);opacity:0;pointer-events:none;transition:opacity .25s}
  .shop-scrim.on{opacity:1;pointer-events:auto}
  .shop-drawer{position:fixed;z-index:71;top:0;right:0;bottom:0;width:min(420px,100vw);display:flex;flex-direction:column;background:#F2EFE6;color:#16181B;
    transform:translateX(100%);transition:transform .3s cubic-bezier(.3,.7,.2,1);box-shadow:-20px 0 50px rgba(0,0,0,.35);font-family:"Overpass",system-ui,sans-serif}
  .shop-drawer.on{transform:none}
  .shop-drawer header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:2px solid #16181B}
  .shop-drawer h2{margin:0;font:800 22px/1 "Overpass",sans-serif;letter-spacing:.02em}
  .shop-x{width:40px;height:40px;border:0;border-radius:20px;background:transparent;font-size:26px;line-height:1;cursor:pointer;color:inherit}
  .shop-list{flex:1;overflow:auto;padding:8px 20px;margin:0;list-style:none}
  .shop-line{display:grid;grid-template-columns:76px 1fr auto;gap:14px;align-items:center;padding:14px 0;border-bottom:1px dashed #b9b3a4}
  .shop-line .th{width:76px;height:76px;border-radius:8px;background:#d9d4c7;display:grid;place-items:center;overflow:hidden}
  .shop-line .th img{max-width:88%;max-height:88%;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))}
  .shop-line b{display:block;font-size:15px;line-height:1.25}
  .shop-line small{display:block;margin-top:4px;font:700 11px/1.2 "Overpass Mono",monospace;letter-spacing:.08em;color:#55595F;text-transform:uppercase}
  .shop-line a{color:inherit;text-decoration:none}
  .shop-line .pr{font:700 14px/1 "Overpass Mono",monospace;text-align:right}
  .shop-line .rm{display:block;margin:8px 0 0 auto;padding:0;border:0;background:none;font:700 11px/1 "Overpass Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:#8a3b12;cursor:pointer;text-decoration:underline}
  .shop-empty{padding:40px 20px;text-align:center;color:#55595F}
  .shop-foot{padding:16px 20px calc(18px + env(safe-area-inset-bottom,0px));border-top:2px solid #16181B;background:#EAE5D8}
  .shop-row{display:flex;justify-content:space-between;font:800 16px/1.2 "Overpass",sans-serif}
  .shop-note{margin:6px 0 12px;font-size:13px;line-height:1.4;color:#55595F}
  .shop-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:50px;border:2px solid #16181B;border-radius:8px;background:#16181B;color:#F4EFE2;
    font:800 15px/1 "Overpass",sans-serif;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;cursor:pointer}
  .shop-btn.ghost{margin-top:8px;background:transparent;color:#16181B}
  .shop-btn.clear{background:transparent;color:#16181B}
  .shop-btn[aria-disabled="true"]{opacity:.45;pointer-events:none}
  @media (prefers-reduced-motion:reduce){.shop-drawer,.shop-scrim{transition:none}.shop-fab.bump{animation:none}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const bag = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`;
  let fab, scrim, drawer, lastFocus;
  function build() {
    if (document.body.dataset.noFab === undefined) {
      fab = document.createElement("button");
      fab.type = "button"; fab.className = "shop-fab"; fab.setAttribute("aria-haspopup", "dialog");
      fab.innerHTML = `${bag}<span>Cart</span><span class="n">0</span>`;
      fab.addEventListener("click", openDrawer);
      document.body.appendChild(fab);
    }
    scrim = document.createElement("div"); scrim.className = "shop-scrim"; scrim.addEventListener("click", closeDrawer);
    drawer = document.createElement("aside"); drawer.className = "shop-drawer"; drawer.setAttribute("role", "dialog"); drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-label", "Your cart"); drawer.hidden = true;
    drawer.innerHTML = `<header><h2>Your cart</h2><button class="shop-x" type="button" aria-label="Close cart">&times;</button></header>
      <ul class="shop-list"></ul><div class="shop-foot"></div>`;
    drawer.querySelector(".shop-x").addEventListener("click", closeDrawer);
    drawer.addEventListener("click", e => { const r = e.target.closest(".rm"); if (r) Shop.remove(r.dataset.id); });
    addEventListener("keydown", e => { if (e.key === "Escape" && drawer.classList.contains("on")) closeDrawer(); });
    document.body.append(scrim, drawer);
    let prev = -1;
    Shop.onChange(list => {
      if (fab) { fab.querySelector(".n").textContent = list.length; fab.setAttribute("aria-label", `Cart, ${list.length} item${list.length === 1 ? "" : "s"}`);
        if (prev >= 0 && list.length > prev) { fab.classList.remove("bump"); void fab.offsetWidth; fab.classList.add("bump"); } }
      prev = list.length; renderDrawer();
    });
  }
  function renderDrawer() {
    const { items, subtotal, unpriced } = Shop.totals();
    const list = drawer.querySelector(".shop-list"), foot = drawer.querySelector(".shop-foot");
    list.innerHTML = items.length ? items.map(w => { const p = Shop.pic(w); return `<li class="shop-line">
        <a class="th" href="item.html?id=${encodeURIComponent(w.id)}"><img src="${esc(p.image)}" alt=""></a>
        <a href="item.html?id=${encodeURIComponent(w.id)}"><b>${esc(w.title)}</b><small>${esc(w.id)} · One of one</small></a>
        <div><div class="pr">${money(w.price)}</div><button class="rm" type="button" data-id="${esc(w.id)}">Remove</button></div></li>`; }).join("")
      : `<li class="shop-empty">Your cart is empty.<br>Every piece is one of a kind.</li>`;
    foot.innerHTML = `<div class="shop-row"><span>Subtotal</span><span>${unpriced && !subtotal ? "TBD" : money(subtotal) + (unpriced ? " + TBD" : "")}</span></div>
      <p class="shop-note">${unpriced ? `${unpriced} piece${unpriced === 1 ? " is" : "s are"} not priced yet. Bruno confirms the price before you pay. ` : ""}Shipping is calculated at checkout.</p>
      <a class="shop-btn clear" href="checkout.html" ${items.length ? "" : 'aria-disabled="true" tabindex="-1"'}>Checkout</a>
      <button class="shop-btn ghost" type="button" data-close>Keep browsing</button>`;
    foot.querySelector("[data-close]").addEventListener("click", closeDrawer);
  }
  function openDrawer() {
    lastFocus = document.activeElement; drawer.hidden = false;
    requestAnimationFrame(() => { scrim.classList.add("on"); drawer.classList.add("on"); drawer.querySelector(".shop-x").focus(); });
    document.documentElement.style.overflow = "hidden";
  }
  function closeDrawer() {
    scrim.classList.remove("on"); drawer.classList.remove("on"); document.documentElement.style.overflow = "";
    setTimeout(() => { if (!drawer.classList.contains("on")) drawer.hidden = true; }, 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", build) : build();
})();
