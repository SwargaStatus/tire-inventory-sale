const fs = require('fs');
const path = require('path');

// Read CSV file from repo root
function readLocalCSV() {
  // Try the new file first, then fallback to old one
  const newCsvPath = path.join(process.cwd(), 'flyer_data 4.csv');
  const oldCsvPath = path.join(process.cwd(), 'flyer_data.csv');
  
  try {
    return fs.readFileSync(newCsvPath, 'utf8');
  } catch (err) {
    try {
      return fs.readFileSync(oldCsvPath, 'utf8');
    } catch (err2) {
      throw new Error('Could not read CSV file: ' + err.message + ' (tried both flyer_data 4.csv and flyer_data.csv)');
    }
  }
}

// Parse CSV text into array of objects
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

  // Get headers and strip the FlyerData[] wrapper
  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => {
    const match = h.match(/FlyerData\[(.+)\]$/);
    return match ? match[1] : h;
  });

  console.log('✅ Parsed headers:', headers);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length !== rawHeaders.length) continue;

    // Build object using cleaned header names
    const obj = {};
    headers.forEach((fieldName, j) => {
      obj[fieldName] = vals[j] || '';
    });

    // Only include items with stock > 0
    const stock = parseInt(obj['AvailableQuantity']) || 0;
    if (stock > 0) {
      rows.push(obj);
    }
  }
  
  console.log(`✅ Found ${rows.length} items with stock > 0`);
  return rows;
}

// No need for manufacturer extraction since it's in the CSV now!

(async () => {
  try {
    console.log('🔄 Reading tire data...');
    
    // Load and parse data
    const raw = readLocalCSV();
    const data = parseCSV(raw);

    // Map to clean objects using the CSV manufacturer data
    const items = data.map(d => {
      const disc = Math.round(parseFloat(d['B2B_Discount_Percentage']) || 0);
      const sale = parseFloat(d['SalePrice']) || 0;
      const reg  = parseFloat(d['Net']) || 0;
      const save = Math.round(reg - sale);
      const manufacturer = d['Manufacturer'] || 'Unknown'; // Use actual CSV data!
      
      return {
        manufacturer,
        logo:         d['Brand_Logo_URL']     || '',
        model:        d['Model']              || 'TIRE',
        item:         d['Item']               || '',
        disc, sale, reg, save,
        stock:        parseInt(d['AvailableQuantity']) || 0
      };
    });

    // Sort by discount (highest first)
    items.sort((a, b) => b.disc - a.disc);

    // Get unique manufacturers for filter
    const manufacturers = Array.from(new Set(items.map(i => i.manufacturer))).sort();
    
    console.log(`✅ Processing ${items.length} items from ${manufacturers.length} manufacturers`);

    // Build HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sturgeon Tire Live Deals</title>
  <style>
    :root { --primary:#2e6fa3; --dark:#182742; --bg:#f0f8ff; --accent:#ffa726; }
    body { margin:0; font-family:'Segoe UI',sans-serif; background:var(--bg); }
    .header { background:var(--primary); color:#fff; padding:16px; text-align:center; }
    .header h1 { margin:0; font-size:1.6rem; }
    .stats { display:flex; flex-wrap:wrap; justify-content:center; gap:20px; padding:12px; background:#fff; margin:12px 0; border-radius:8px; }
    .stats div { text-align:center; min-width:80px; }
    .stats .num { font-size:1.4rem; font-weight:bold; color:var(--primary); }
    .stats .label { font-size:0.8rem; color:#666; }
    .filters { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; margin:12px; }
    .filters label { font-size:0.9rem; }
    .filters select { padding:4px; border-radius:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px; padding:12px; }
    @media (max-width:768px) { .grid { grid-template-columns:1fr; } }
    .card { background:#fff; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.1); position:relative; overflow:hidden; }
    .badge { position:absolute; top:8px; right:8px; padding:4px 6px; border-radius:4px; color:#fff; font-size:0.75rem; }
    .badge-sale  { background:var(--accent); }
    .badge-good  { background:var(--primary); }
    .badge-great { background:#ffb300; }
    .badge-huge  { background:#ff6d00; }
    .badge-free  { background:var(--dark); }
    .content { padding:10px; }
    .logo { height:24px; vertical-align:middle; margin-right:6px; }
    .title { font-size:1.1rem; font-weight:bold; color:var(--dark); margin-bottom:6px; }
    .details  { font-size:0.85rem; color:#555; margin-bottom:6px; }
    .pricing  { margin-bottom:6px; }
    .sale-price { color:#27ae60; font-weight:bold; }
    .orig-price { text-decoration:line-through; color:#888; margin-left:6px; }
    .free-price { color:var(--dark); font-weight:bold; }
    .save     { color:#e74c3c; font-size:0.85rem; margin-bottom:6px; }
    .stock    { font-size:0.8rem; padding:3px 6px; border-radius:4px; display:inline-block; margin-bottom:6px; }
    .stock-low       { background:#fdecea; color:#c0392b; }
    .stock-medium    { background:#fff8e1; color:#f57c00; }
    .stock-good      { background:#e8f5e9; color:#2e7d32; }
    .stock-excellent { background:#e3f2fd; color:#1565c0; }
    .pagination { text-align:center; margin:12px; }
    .pagination button { margin:0 4px; padding:6px 10px; border:none; background:var(--primary); color:#fff; border-radius:4px; cursor:pointer; }
    .pagination button[disabled] { opacity:0.6; cursor:default; }
    .footer { text-align:center; padding:20px; background:#fff; margin:12px 0; border-radius:8px; }
    .footer a { margin:0 15px; color:var(--primary); text-decoration:none; font-weight:bold; padding:8px 16px; border:2px solid var(--primary); border-radius:4px; }
    .footer a:hover { background:var(--primary); color:#fff; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚗 Sturgeon Tire Live Deals</h1>
    <p>Updated: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="stats">
    <div><div class="num">${items.length}</div><div class="label">Deals</div></div>
    <div><div class="num">${items.filter(i => i.disc >= 50).length}</div><div class="label">50%+ Off</div></div>
    <div><div class="num">$${Math.round(items.reduce((sum, i) => sum + i.save, 0) / items.length)}</div><div class="label">Avg Savings</div></div>
    <div><div class="num">${items.filter(i => i.disc >= 99).length || items.filter(i => i.disc >= 40).length}</div><div class="label">${items.filter(i => i.disc >= 99).length ? 'Free' : 'Hot'} Items</div></div>
  </div>
  
  <div class="filters">
    <label>Manufacturer:
      <select id="filter-manufacturer">
        <option value="">All</option>
        ${manufacturers.map(m => `<option value="${m}">${m}</option>`).join('')}
      </select>
    </label>
    <label>Min Discount:
      <select id="filter-discount">
        <option value="0">0%</option>
        <option value="10">10%</option>
        <option value="20">20%</option>
        <option value="30">30%</option>
        <option value="40">40%</option>
      </select>
    </label>
  </div>
  
  <div class="grid" id="card-container"></div>
  <div class="pagination" id="pagination"></div>
  
  <div class="footer">
    <a href="tel:+12049355559">📞 Call (204) 935-5559</a>
    <a href="mailto:sales@sturgeontire.com">✉️ Get Quote</a>
  </div>
  
  <script>
    const items = ${JSON.stringify(items, null, 2)};
    let currentPage = 1, pageSize = 20;

    function renderCard(i) {
      const badgeType = i.disc >= 99 ? 'free'
        : i.disc >= 40 ? 'huge'
        : i.disc >= 30 ? 'great'
        : i.disc >= 20 ? 'good'
        : 'sale';
      const priceHtml = i.disc >= 99
        ? '<span class="free-price">FREE</span><span class="orig-price">$' + i.reg + '</span>'
        : '<span class="sale-price">$' + i.sale + '</span><span class="orig-price">$' + i.reg + '</span>';
      let stockClass = 'excellent';
      if (i.stock <= 5) stockClass = 'low';
      else if (i.stock <= 15) stockClass = 'medium';
      else if (i.stock <= 50) stockClass = 'good';

      return '<div class="card">'
        + '<div class="badge badge-' + badgeType + '">' + i.disc + '% OFF</div>'
        + '<div class="content">'
        + (i.logo ? '<img src="' + i.logo + '" class="logo" onerror="this.style.display=\\'none\\'">' : '')
        + '<div class="title">' + i.model + '</div>'
        + '<div class="details">Item: ' + i.item + ' • ' + i.manufacturer + '</div>'
        + '<div class="pricing">' + priceHtml + '</div>'
        + '<div class="save">💰 Save $' + i.save + '</div>'
        + '<div class="stock stock-' + stockClass + '">Qty: ' + i.stock + '</div>'
        + '</div>'
        + '</div>';
    }

    function render() {
      const mf = document.getElementById('filter-manufacturer').value;
      const md = parseInt(document.getElementById('filter-discount').value);
      const filtered = items.filter(i => (!mf || i.manufacturer === mf) && i.disc >= md);
      const totalPages = Math.ceil(filtered.length / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);
      document.getElementById('card-container').innerHTML = pageItems.map(renderCard).join('');
      const pg = document.getElementById('pagination'); pg.innerHTML = '';
      for (let p = 1; p <= totalPages; p++) {
        const btn = document.createElement('button'); btn.textContent = p;
        if (p === currentPage) btn.disabled = true;
        btn.onclick = () => { currentPage = p; render(); };
        pg.appendChild(btn);
      }
    }

    document.getElementById('filter-manufacturer').onchange = () => { currentPage = 1; render(); };
    document.getElementById('filter-discount').onchange = () => { currentPage = 1; render(); };
    render();
  </script>
</body>
</html>`;

    // Write output
    const outPath = path.join(process.cwd(), 'index.html');
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`✅ Generated index.html with ${items.length} items`);
    console.log(`📊 Manufacturers: ${manufacturers.join(', ')}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
