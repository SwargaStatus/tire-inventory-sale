const fs = require('fs');
const path = require('path');

function readLocalCSV() {
  const csvPath = path.join(process.cwd(), 'flyer_data.csv');
  try {
    return fs.readFileSync(csvPath, 'utf8');
  } catch (err) {
    throw new Error('Could not read flyer_data.csv: ' + err.message);
  }
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const parseLine = line => {
    const cols = [];
    let cur = '', inQuotes = false;
    for (let ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => {
    const match = h.match(/FlyerData\[(.+)\]$/);
    return match ? match[1] : h;
  });

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length !== rawHeaders.length) continue;

    const obj = {};
    headers.forEach((fieldName, j) => {
      obj[fieldName] = vals[j] || '';
    });

    const stock = parseInt(obj['AvailableQuantity']) || 0;
    if (stock > 0) {
      rows.push(obj);
    }
  }
  
  return rows;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateHTML(items) {
  const manufacturers = Array.from(new Set(items.map(i => i.manufacturer))).sort();
  const itemsJson = JSON.stringify(items);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sturgeon Tire Bargain Bin</title>
  <link rel="icon" type="image/x-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛞</text></svg>">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-3V20E24FLR"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-3V20E24FLR');
  </script>
  <!-- Microsoft Clarity -->
  <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "rtts9836eo");
  </script>
  
  <!-- Mixpanel -->
  <script type="text/javascript">
  (function (f, b) { if (!b.__SV) { var e, g, i, h; window.mixpanel = b; b._i = []; b.init = function (e, f, c) { function g(a, d) { var b = d.split("."); 2 == b.length && ((a = a[b[0]]), (d = b[1])); a[d] = function () { a.push([d].concat(Array.prototype.slice.call(arguments, 0))); }; } var a = b; "undefined" !== typeof c ? (a = b[c] = []) : (c = "mixpanel"); a.people = a.people || []; a.toString = function (a) { var d = "mixpanel"; "mixpanel" !== c && (d += "." + c); a || (d += " (stub)"); return d; }; a.people.toString = function () { return a.toString(1) + ".people (stub)"; }; i = "disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split( " "); for (h = 0; h < i.length; h++) g(a, i[h]); var j = "set set_once union unset remove delete".split(" "); a.get_group = function () { function b(c) { d[c] = function () { call2_args = arguments; call2 = [c].concat(Array.prototype.slice.call(call2_args, 0)); a.push([e, call2]); }; } for ( var d = {}, e = ["get_group"].concat( Array.prototype.slice.call(arguments, 0)), c = 0; c < j.length; c++) b(j[c]); return d; }; b._i.push([e, f, c]) }; b.__SV = 1.2; e = f.createElement("script"); e.type = "text/javascript"; e.async = !0; e.src = "undefined" !== typeof MIXPANEL_CUSTOM_LIB_URL ? MIXPANEL_CUSTOM_LIB_URL : "file:" === f.location.protocol && "//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//) ? "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js" : "//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js"; g = f.getElementsByTagName("script")[0]; g.parentNode.insertBefore(e, g) } })(document, window.mixpanel || []);
  </script>
  
  <script>
  // Wait for Mixpanel to load before initializing
  function initMixpanel() {
    if (window.mixpanel && window.mixpanel.init) {
      mixpanel.init("e0a9e7e2b021ad4a993df32823d7c0c5", {
        debug: true,
        track_pageview: true,
        persistence: "localStorage",
      });
    } else {
      // Retry after a short delay if not loaded yet
      setTimeout(initMixpanel, 100);
    }
  }
  
  // Start trying to initialize Mixpanel
  initMixpanel();
  </script>
  <style>
    :root{--primary:#2e6fa3;--dark:#182742;--bg:#f0f8ff;--accent:#ffa726}
    body{margin:0;font-family:'Segoe UI',sans-serif;background:var(--bg)}
    .container{max-width:1200px;margin:0 auto;padding:0}
    .header{background:linear-gradient(135deg,var(--primary) 0%,#1e4f72 100%);color:#fff;padding:20px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.1);margin-bottom:0}
    .header h1{margin:0;font-size:1.8rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:6px}
    .company-logo {height: 44px;filter: drop-shadow(0 0 3px white); /* adds subtle outline glow */}
    .update-time{font-size:0.8rem;opacity:0.8;font-weight:400}
    .stats{display:flex;flex-wrap:wrap;justify-content:center;gap:28px;padding:18px;background:#fff;margin:16px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06)}
    .stats div{text-align:center;min-width:100px}
    .stats .num{font-size:2rem;font-weight:800;color:var(--primary);margin-bottom:4px;line-height:1}
    .stats .label{font-size:0.8rem;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
    .filters{display:flex;flex-wrap:wrap;gap:24px;justify-content:center;align-items:center;margin:20px auto;padding:28px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);max-width:1000px;box-sizing:border-box}
    .filter-group{position:relative;display:flex;align-items:center;min-width:220px}
    .filter-label{position:absolute;left:16px;top:-8px;background:#fff;padding:0 8px;font-size:13px;color:#495057;font-weight:600;z-index:1}
    .filters select{width:100%;padding:14px 20px;border-radius:12px;border:1.5px solid #e1e5e9;background:#fff;font-size:15px;transition:all 0.2s;font-weight:500;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%236c757d' d='M6 8L0 0h12z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 20px center;padding-right:48px}
    .filters select:hover{border-color:#c1c7ce}
    .filters select:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(46,111,163,0.08)}
    .search-container{flex:1;min-width:320px;max-width:500px;position:relative}
    .search-label{position:absolute;left:16px;top:-8px;background:#fff;padding:0 8px;font-size:13px;color:#495057;font-weight:600;z-index:1}
    .search-container input{width:100%;padding:14px 20px;border:1.5px solid #e1e5e9;border-radius:12px;font-size:15px;transition:all 0.2s;font-weight:500;background:#fff}
    .search-container input::placeholder{color:#9ca3af;font-weight:400}
    .search-container input:hover{border-color:#c1c7ce}
    .search-container input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(46,111,163,0.08)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px;padding:20px 16px;max-width:1200px;margin:0 auto}
    .card{background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);position:relative;overflow:hidden;transition:all 0.3s ease}
    .card:hover{transform:translateY(-4px);box-shadow:0 8px 25px rgba(0,0,0,0.15)}
    .badge{position:absolute;top:8px;right:8px;padding:6px 10px;border-radius:6px;color:#fff;font-size:0.75rem;font-weight:600;z-index:2}
    .badge-sale{background:var(--accent)}.badge-good{background:var(--primary)}.badge-great{background:#ffb300}.badge-huge{background:#ff6d00}.badge-free{background:var(--dark)}
    .content{padding:16px}
    .logo{height:48px;width:auto;max-width:120px;object-fit:contain;margin-bottom:8px}
    .title{font-size:1.1rem;font-weight:bold;color:var(--dark);margin-bottom:8px;line-height:1.3}
    .details{font-size:0.85rem;color:#666;margin-bottom:12px;line-height:1.4}
    .pricing{margin-bottom:8px}
    .sale-price{color:#27ae60;font-weight:bold;font-size:1.2rem}
    .orig-price{text-decoration:line-through;color:#999;margin-left:8px;font-size:0.9rem}
    .free-price{color:var(--dark);font-weight:bold;font-size:1.2rem}
    .save{color:#e74c3c;font-size:0.9rem;margin-bottom:8px;font-weight:500}
    .stock{font-size:0.8rem;padding:4px 8px;border-radius:4px;display:inline-block;margin-bottom:12px;font-weight:500}
    .stock-low{background:#fdecea;color:#c0392b}.stock-medium{background:#fff8e1;color:#f57c00}.stock-good{background:#e8f5e9;color:#2e7d32}.stock-excellent{background:#e3f2fd;color:#1565c0}
    .btn-add-quote{background:#27ae60;color:white;border:none;padding:12px 16px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;width:100%;transition:background 0.2s}
    .btn-add-quote:hover{background:#229954}
    .quote-counter{position:fixed;top:20px;right:20px;background:#e74c3c;color:white;padding:16px 20px;border-radius:25px;cursor:pointer;font-weight:bold;display:none;z-index:1000;box-shadow:0 4px 15px rgba(231,76,60,0.3);transition:all 0.3s ease;font-size:16px;min-width:120px;text-align:center}
    .quote-counter:hover{background:#c0392b;transform:translateY(-2px);box-shadow:0 6px 20px rgba(231,76,60,0.4)}
    .quote-counter.pulse{animation:pulse 0.6s ease-out}
    .quote-cta{font-size:12px;opacity:0.9;margin-top:4px;font-weight:normal}
    @keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
    .quantity-controls{display:flex;align-items:center;gap:5px;background:#f8f9fa;border-radius:8px;padding:2px}
    .qty-btn{width:28px;height:28px;border:none;background:#007bff;color:white;border-radius:6px;cursor:pointer;font-weight:bold;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s}
    .qty-btn:hover{background:#0056b3;transform:scale(1.1)}
    .qty-btn:active{transform:scale(0.95)}
    .qty-input{width:50px;height:28px;border:1px solid #ddd;border-radius:4px;text-align:center;font-weight:bold;margin:0 2px}
    .notification{position:fixed;top:120px;right:20px;background:linear-gradient(135deg,#27ae60,#2ecc71);color:white;padding:12px 20px;border-radius:8px;z-index:3000;font-weight:500;box-shadow:0 4px 20px rgba(39,174,96,0.3);transform:translateX(400px);transition:all 0.4s cubic-bezier(0.68,-0.55,0.265,1.55);max-width:280px}
    .success-notification{background:linear-gradient(135deg,#3498db,#2980b9);padding:20px 25px;border-radius:12px;box-shadow:0 8px 32px rgba(52,152,219,0.4);position:relative;overflow:hidden}
    .success-notification::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(255,255,255,0.1) 10px,rgba(255,255,255,0.1) 20px);animation:confetti 2s linear infinite}
    @keyframes confetti{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
    .success-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 5000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.5s ease;
    }
    .success-overlay.show {
      opacity: 1;
    }
    .success-message {
      background: linear-gradient(135deg, #27ae60, #2ecc71);
      color: white;
      padding: 40px 50px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(39, 174, 96, 0.4);
      transform: scale(0.8) translateY(50px);
      transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      max-width: 500px;
      margin: 20px;
      position: relative;
      overflow: hidden;
    }
    .success-overlay.show .success-message {
      transform: scale(1) translateY(0);
    }
    .success-message::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        rgba(255, 255, 255, 0.1) 10px,
        rgba(255, 255, 255, 0.1) 20px
      );
      animation: sparkle 3s linear infinite;
    }
    @keyframes sparkle {
      0% { transform: translateX(-100%) translateY(-100%); }
      100% { transform: translateX(100%) translateY(100%); }
    }
    .success-icon {
      font-size: 4rem;
      margin-bottom: 20px;
      display: block;
      animation: bounce 1s ease infinite alternate;
    }
    @keyframes bounce {
      0% { transform: translateY(0); }
      100% { transform: translateY(-10px); }
    }
    .success-title {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 15px;
      position: relative;
      z-index: 1;
    }
    .success-text {
      font-size: 1.2rem;
      line-height: 1.5;
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }
    .success-subtext {
      font-size: 1rem;
      opacity: 0.9;
      position: relative;
      z-index: 1;
    }
    .quote-modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000}
    .quote-modal-content{background:white;margin:5% auto;padding:20px;width:90%;max-width:600px;border-radius:8px;max-height:80vh;overflow-y:auto}
    .quote-item{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee}
    .quote-form{margin-top:20px;padding-top:20px;border-top:2px solid #eee}
    .quote-form input,.quote-form textarea{width:100%;padding:8px;margin-bottom:10px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;font-size:16px}
    .submit-quote{background:#27ae60;color:white;border:none;padding:12px 24px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%}
    .close-modal{float:right;font-size:28px;font-weight:bold;cursor:pointer;color:#aaa}
    .remove-item{background:#e74c3c;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px}
    .footer{text-align:center;padding:20px;background:#fff;margin:16px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05)}
    .footer a{margin:0 15px;color:var(--primary);text-decoration:none;font-weight:bold;padding:10px 20px;border:2px solid var(--primary);border-radius:8px;transition:all 0.2s}
    .footer a:hover{background:var(--primary);color:white}
    @media (max-width:768px){
      .grid{grid-template-columns:1fr;padding:16px}
      .header h1{flex-direction:column;font-size:1.8rem;gap:12px}
      .quote-counter{right:16px;font-size:14px;padding:12px 16px}
      .filters{margin:20px;padding:24px;flex-direction:column;align-items:stretch;gap:24px}
      .search-container{min-width:unset;max-width:unset;width:100%;box-sizing:border-box}
      .search-container input{box-sizing:border-box}
      .filter-group{width:100%;min-width:unset;box-sizing:border-box}
      .filters select{box-sizing:border-box}
      .stats{margin:16px;gap:20px;padding:20px}
      .stats .num{font-size:2rem}
      .stats .label{font-size:0.8rem}
    }
    @media (max-width: 768px) {
      .container{padding-left: 12px;padding-right: 12px;}
    }
    @media (max-width:768px){
      .quote-modal-content{
        width: calc(100% - 24px);
        margin: 5% auto;
        box-sizing:border-box;
        padding-left:12px;
        padding-right:12px;
      }
    }
    #quote-items{
      flex:1 1 auto;
      overflow-y:auto;
      padding-right:4px;
    }
    .quote-item>div:first-child{
      flex:1 1 60%;
      word-break:break-word;
    }
    .quote-item{
      gap:8px;
      align-items:flex-start;
    }
    .quote-form{
      flex:0 0 auto;
      padding-bottom:8px;
      background:#fff;
      box-shadow:0 -2px 6px rgba(0,0,0,.08);
    }
    .submit-quote{
      position:sticky;
      bottom:0;
      width:100%;
      border-radius:0;
    }
    .quantity-controls{
      align-items:center;
    }
    .quantity-controls small{
      font-size:.75rem;
      line-height:1;
      align-self:center;
    }
    body.modal-open{
      overflow:hidden;
    }
  </style>
  <!-- Confetti library -->
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><img src="Logo.png" alt="Sturgeon Tire" class="company-logo" onerror="this.style.display='none'">Sturgeon Tire Bargain Bin</h1>
      <div class="update-time">Updated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Winnipeg', dateStyle: 'short', timeStyle: 'short' })}</div>
    </div>
    
    <div class="stats">
      <div><div class="num">${items.length}</div><div class="label">Deals</div></div>
      <div><div class="num">${items.filter(i => i.disc >= 50).length}</div><div class="label">50%+ Off</div></div>
      <div><div class="num">$${Math.round(items.reduce((sum, i) => sum + i.save, 0) / items.length)}</div><div class="label">Avg Savings</div></div>
    </div>
    
    <div class="filters">
      <div class="search-container">
        <span class="search-label">Search</span>
        <input type="text" id="search-bar" placeholder="Brand, model, size, winter, or item...">
      </div>
      <div class="filter-group">
        <span class="filter-label">Manufacturer</span>
        <select id="filter-manufacturer">
          <option value="">All Manufacturers</option>
          ${manufacturers.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select>
      </div>
    </div>
    
    <div class="grid" id="card-container"></div>
    
    <div class="footer"><a href="tel:+12049854040">Call (204) 985-4040</a><a href="mailto:sales@sturgeontire.com">Get Quote</a></div>
  </div>
  
  <div class="quote-counter" id="quote-counter" onclick="openQuoteModal()">
    <div>Quote (<span id="quote-count">0</span>)</div>
    <div class="quote-cta">Click to Review →</div>
  </div>
  
  <div class="quote-modal" id="quote-modal">
    <div class="quote-modal-content">
      <span class="close-modal" onclick="closeQuoteModal()">&times;</span>
      <h2>Request Quote</h2>
      <div id="quote-items"></div>
      <div class="quote-form">
        <input type="text" id="customer-name" placeholder="Your Name *" required>
        <input type="email" id="customer-email" placeholder="Email *" required>
        <input type="tel" id="customer-phone" placeholder="Phone">
        <input type="text" id="customer-company" placeholder="Company">
        <textarea id="customer-notes" placeholder="Notes..."></textarea>
        <button class="submit-quote" onclick="submitQuote()">Request Quote</button>
      </div>
    </div>
  </div>
  
  <script>
    var items = ${itemsJson};
    var quoteItems = [];

    function renderCard(item) {
      var badgeType = item.disc >= 99 ? 'free' : item.disc >= 40 ? 'huge' : item.disc >= 30 ? 'great' : item.disc >= 20 ? 'good' : 'sale';
      var priceHtml = item.disc >= 99 
        ? '<span class="free-price">FREE</span><span class="orig-price">$' + item.reg + '</span>' 
        : '<span class="sale-price">$' + item.sale + '</span><span class="orig-price">$' + item.reg + '</span>';
      var stockClass = item.stock <= 5 ? 'low' : item.stock <= 15 ? 'medium' : item.stock <= 50 ? 'good' : 'excellent';
      
      var details = 'Item: ' + item.item;
      if (item.tireSize) details += ' • Size: ' + item.tireSize;
      if (item.tireType) details += ' • ' + item.tireType;
      
      return '<div class="card" data-manufacturer="' + escapeHtml(item.manufacturer) + '">' +
        '<div class="badge badge-' + badgeType + '">' + item.disc + '% OFF</div>' +
        '<div class="content">' + 
        (item.logo ? '<img src="' + escapeHtml(item.logo) + '" class="logo" alt="' + escapeHtml(item.manufacturer) + '">' : '') +
        '<div class="title">' + escapeHtml(item.model) + '</div>' +
        '<div class="details">' + escapeHtml(details) + '</div>' +
        '<div class="pricing">' + priceHtml + '</div>' +
        '<div class="save">Save $' + item.save + '</div>' +
        '<div class="stock stock-' + stockClass + '">Qty: ' + item.stock + '</div>' +
        '<button class="btn-add-quote" onclick="addToQuote(\\'' + escapeHtml(item.item) + '\\')">Add to Quote</button>' +
        '</div></div>';
    }

    function escapeHtml(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function render() {
      var searchBar = document.getElementById('search-bar');
      var manufacturerSelect = document.getElementById('filter-manufacturer');
      
      if (!searchBar || !manufacturerSelect) {
        console.error('❌ Filter elements not found!');
        return;
      }
      
      var searchTerm = searchBar.value.toLowerCase();
      var mf = manufacturerSelect.value;
      
      var filtered = items.filter(function(i) {
        var searchableText = [
          i.manufacturer,
          i.model,
          i.item,
          i.tireSize || '',
          i.sizeStripped || '',
          i.tireType || '',
          i.isWinterTire ? 'winter' : ''
        ].join(' ').toLowerCase();
        
        var matchesSearch = !searchTerm || searchableText.indexOf(searchTerm) !== -1;
        var matchesManufacturer = !mf || i.manufacturer === mf;
        
        return matchesSearch && matchesManufacturer;
      });
      
      var cardHTML = filtered.slice(0, 50).map(renderCard).join('');
      var container = document.getElementById('card-container');
      if (!container) {
        console.error('❌ Card container not found!');
        return;
      }
      
      container.innerHTML = cardHTML;
      updateFilteredStats(filtered);
    }

    function updateFilteredStats(filtered) {
      var totalDeals = document.querySelector('.stats .num');
      if (totalDeals && filtered.length !== items.length) {
        totalDeals.textContent = filtered.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Filtered Deals';
      } else if (totalDeals) {
        totalDeals.textContent = items.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Deals';
      }
    }

    function addToQuote(itemCode) {
      var item = items.find(function(i) { return i.item === itemCode; });
      if (!item) return;
      var existingIndex = quoteItems.findIndex(function(q) { return q.item === item.item; });
      if (existingIndex >= 0) {
        quoteItems[existingIndex].quantity += 1;
      } else {
        var newItem = Object.assign({}, item);
        newItem.quantity = 1;
        quoteItems.push(newItem);
      }
      updateQuoteCounter();
      showNotification('✓ Added to quote!');
    }

    function removeFromQuote(itemCode) {
      quoteItems = quoteItems.filter(function(item) { return item.item !== itemCode; });
      updateQuoteCounter();
      updateQuoteModal();
    }

    function updateQuantity(itemCode, newQuantity) {
      var qty = parseInt(newQuantity);
      var itemIndex = quoteItems.findIndex(function(item) { return item.item === itemCode; });
      if (itemIndex === -1) return;
      if (qty <= 0) {
        removeFromQuote(itemCode);
      } else {
        var maxQty = quoteItems[itemIndex].stock;
        quoteItems[itemIndex].quantity = Math.min(Math.max(qty, 1), maxQty);
        updateQuoteModal();
      }
    }

    function updateQuoteCounter() {
      var counter = document.getElementById('quote-counter');
      var count = document.getElementById('quote-count');
      if (quoteItems.length > 0) {
        counter.style.display = 'block';
        counter.classList.add('pulse');
        setTimeout(function() { counter.classList.remove('pulse'); }, 600);
        count.textContent = quoteItems.length;
      } else {
        counter.style.display = 'none';
      }
    }

    function updateQuoteModal() {
      var container = document.getElementById('quote-items');
      if (quoteItems.length === 0) {
        container.innerHTML = '<p>No items in quote yet.</p>';
        return;
      }
      var html = '<h3>Items:</h3>';
      quoteItems.forEach(function(item) {
        html += '<div class="quote-item">' +
          '<div><strong>' + escapeHtml(item.manufacturer) + ' ' + escapeHtml(item.model) + '</strong><br>Item: ' + escapeHtml(item.item) + ' • $' + item.sale + ' each</div>' +
          '<div class="quantity-controls">' +
          '<button class="qty-btn" onclick="updateQuantity(\\'' + escapeHtml(item.item) + '\\', ' + (item.quantity - 1) + ')">−</button>' +
          '<input type="number" class="qty-input" min="1" max="' + item.stock + '" value="' + item.quantity + '" onchange="updateQuantity(\\'' + escapeHtml(item.item) + '\\', this.value)">' +
          '<button class="qty-btn" onclick="updateQuantity(\\'' + escapeHtml(item.item) + '\\', ' + (item.quantity + 1) + ')">+</button>' +
          '<small style="margin-left:8px">/ ' + item.stock + '</small>' +
          '<button class="remove-item" onclick="removeFromQuote(\\'' + escapeHtml(item.item) + '\\')">×</button>' +
          '</div></div>';
      });
      container.innerHTML = html;
    }

    function showNotification(message) {
      var notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(function() { notification.style.transform = 'translateX(0)'; }, 100);
      setTimeout(function() {
        notification.style.transform = 'translateX(400px)';
        setTimeout(function() { document.body.removeChild(notification); }, 400);
      }, 3000);
    }

    function showSuccessNotification(message) {
      var notification = document.createElement('div');
      notification.className = 'notification success-notification';
      notification.innerHTML = '<div style="position:relative;z-index:1">' + message + '</div>';
      document.body.appendChild(notification);
      
      setTimeout(function() { notification.style.transform = 'translateX(0)'; }, 100);
      setTimeout(function() {
        notification.style.transform = 'translateX(400px)';
        setTimeout(function() { document.body.removeChild(notification); }, 500);
      }, 4000);
    }

    function showSuccessOverlay() {
      console.log('🎯 showSuccessOverlay called');
      
      // Remove any existing overlay
      document.querySelectorAll('.success-overlay').forEach(function(el) {
        el.remove();
      });
      
      // Create new overlay
      var overlay = document.createElement('div');
      overlay.className = 'success-overlay';
      
      overlay.innerHTML = 
        '<div class="success-message">' +
          '<div class="success-icon">🎉</div>' +
          '<div class="success-title">Quote Sent Successfully!</div>' +
          '<div class="success-text">Thank you for your quote request!</div>' +
          '<div class="success-subtext">A sales representative will contact you shortly with pricing and availability.</div>' +
        '</div>';
      
      document.body.appendChild(overlay);
      console.log('✅ overlay appended');
      
      // First frame: element exists with opacity:0
      requestAnimationFrame(function() {
        // Second frame: toggle the class - now a real change
        overlay.classList.add('show');
        console.log('✅ .show class added');
      });
      
      // Auto-remove after 4.5 seconds
      setTimeout(function() {
        overlay.remove();
        console.log('🗑️ overlay removed');
      }, 4500);
    }

    function submitQuote() {
      var name = document.getElementById('customer-name').value;
      var email = document.getElementById('customer-email').value;
      var phone = document.getElementById('customer-phone').value;
      var company = document.getElementById('customer-company').value;
      var notes = document.getElementById('customer-notes').value;
      
      if (!name || !email) {
        alert('Please fill in your name and email.');
        return;
      }
      
      var submitBtn = document.querySelector('.submit-quote');
      submitBtn.innerHTML = 'Sending...';
      submitBtn.disabled = true;
      
      var tireDetails = quoteItems.map(function(item, index) {
        return (index + 1) + '. Item: ' + item.item + ' - Qty: ' + item.quantity;
      }).join('\n');
      
      var quoteSummary = 'TIRE QUOTE REQUEST\n\n' +
        'CUSTOMER:\n' +
        'Name: ' + name + '\n' +
        'Email: ' + email + '\n' +
        'Phone: ' + (phone || 'Not provided') + '\n' +
        'Company: ' + (company || 'Not provided') + '\n\n' +
        'ITEMS:\n' + tireDetails + '\n\n' +
        'NOTES: ' + (notes || 'None');
      
      var formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('company', company);
        formData.append('items', tireDetails);
        formData.append('notes', notes);

      fetch('https://formspree.io/f/xdkgqyzr', {
        method: 'POST',
        body: formData,
        headers: {'Accept': 'application/json'}
      })
      .then(function(response) {
        if (response.ok) {
          // Update button text immediately
          submitBtn.innerHTML = 'Quote Sent!';
          
          // Close modal FIRST to avoid stacking context issues
          closeQuoteModal();
          
          // Then show overlay and confetti
          requestAnimationFrame(function() {
            showSuccessOverlay();
          });
          
          // Massive confetti celebration
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, zIndex: 4000 });
          
          // More confetti waves
          setTimeout(function() {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.7 }, zIndex: 4000 });
          }, 300);
          
          setTimeout(function() {
            confetti({ particleCount: 100, spread: 60, origin: { y: 0.5 }, zIndex: 4000 });
          }, 600);
          
          // Clean up after 5 seconds
          setTimeout(function() {
            quoteItems = [];
            updateQuoteCounter();
            closeQuoteModal();
            submitBtn.innerHTML = 'Request Quote';
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 5000);
        } else {
          var subject = 'Tire Quote - ' + name;
          var simpleBody = 'Customer: ' + name + ' (' + email + ')\nItems: ' + tireDetails + (notes ? '\nNotes: ' + notes : '');
          var mailtoLink = 'mailto:sales@sturgeontire.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(simpleBody);
          window.open(mailtoLink, '_blank');
          submitBtn.innerHTML = 'Request Quote';
          submitBtn.disabled = false;
        }
      })
      .catch(function() {
        var subject = 'Tire Quote - ' + name;
        var mailtoLink = 'mailto:sales@sturgeontire.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(quoteSummary);
        window.open(mailtoLink, '_blank');
        submitBtn.innerHTML = 'Request Quote';
        submitBtn.disabled = false;
      });
    }

    function openQuoteModal(){
      updateQuoteModal();
      document.getElementById('quote-modal').style.display='block';
      document.body.classList.add('modal-open');
    }

    function closeQuoteModal(){
      document.getElementById('quote-modal').style.display='none';
      document.body.classList.remove('modal-open');
    }

    function initializeApp() {
      console.log('📊 Initializing with', items.length, 'items');
      
      // Add event listeners
      var searchBar = document.getElementById('search-bar');
      var manufacturerSelect = document.getElementById('filter-manufacturer');
      
      if (searchBar && manufacturerSelect) {
        searchBar.addEventListener('input', render);
        manufacturerSelect.addEventListener('change', render);
        console.log('✅ Event listeners added');
      } else {
        console.error('❌ Could not find filter elements for event listeners');
      }
      
      // Modal click handler
      window.addEventListener('click', function(event) {
        var modal = document.getElementById('quote-modal');
        if (event.target === modal) {
          closeQuoteModal();
        }
      });
      
      // Initial render
      render();
    }

    // Wait for DOM to be ready, then initialize
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 DOM loaded, initializing...');
        initializeApp();
      });
    } else {
      console.log('🚀 DOM already ready, initializing...');
      initializeApp();
    }
  </script>
</body>
</html>`;
}

async function main() {
  try {
    console.log('🔄 Processing tire data...');
    const raw = readLocalCSV();
    const data = parseCSV(raw);

    const items = data.map(d => {
      const disc = Math.round(parseFloat(d['B2B_Discount_Percentage']) || 0);
      const sale = parseFloat(d['SalePrice']) || 0;
      const reg = parseFloat(d['Net']) || 0;
      const save = Math.round(reg - sale);
      const manufacturer = d['Manufacturer'] || 'Unknown';
      
      return {
        manufacturer,
        logo: d['Brand_Logo_URL'] || '',
        model: d['Model'] || 'TIRE',
        item: d['Item'] || '',
        tireSize: d['Size'] || '',
        sizeStripped: d['StrippedSize'] || '',
        tireType: d['TypeDescription'] || '',
        isWinterTire: d['IsWinterTire'] === 'True' || d['IsWinterTire'] === 'true',
        disc, sale, reg, save,
        stock: parseInt(d['AvailableQuantity']) || 0
      };
    }).sort((a, b) => b.disc - a.disc);
    
    if (items.length === 0) throw new Error('No deals found');
    
    const html = generateHTML(items);
    fs.writeFileSync('index.html', html);
    
    console.log('✅ Website updated successfully!');
    console.log(`📈 ${items.length} deals processed`);
    console.log('🎯 Features: search, filters, quote system, responsive design, success overlay');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
