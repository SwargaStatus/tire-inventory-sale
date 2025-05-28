const fs = require('fs');

// Read the CSV file
function readLocalCSV() {
  try {
    const csv = fs.readFileSync('flyer_data.csv', 'utf8');
    console.log('✅ Read flyer_data.csv');
    return csv;
  } catch (e) {
    throw new Error('Could not read flyer_data.csv: ' + e.message);
  }
}

// Parse CSV into rows
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const parseLine = line => {
    const cols = [];
    let cur = '', inQuotes = false;
    for (let ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) { cols.push(cur); cur = ''; }
      else cur += ch;
    }
    cols.push(cur);
    return cols;
  };
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length !== headers.length) continue;
    const obj = {};
    headers.forEach((h, j) => obj[h] = vals[j]);
    // Show any item with stock > 0
    const stock = parseInt(obj['FlyerData[AvailableQuantity]']) || 0;
    if (stock > 0) rows.push(obj);
  }
  console.log(`✅ Parsed ${rows.length} items with stock > 0`);
  return rows;
}

// Build each card
function generateCard(d) {
  const logo = d['FlyerData[Brand_Logo_URL]'] || '';
  const model = d['FlyerData[Model]'] || 'TIRE';
  const item  = d['FlyerData[Item]']  || '';
  const disc  = Math.round(parseFloat(d['FlyerData[B2B_Discount_Percentage]']) || 0);
  const sale  = parseFloat(d['FlyerData[SalePrice]']) || 0;
  const reg   = parseFloat(d['FlyerData[Net]'])       || 0;
  const save  = Math.round(reg - sale);
  const stock = parseInt(d['FlyerData[AvailableQuantity]']) || 0;

  let badge = 'sale';
  if      (disc >= 99) badge = 'free';
  else if (disc >= 40) badge = 'huge';
  else if (disc >= 30) badge = 'great';
  else if (disc >= 20) badge = 'good';

  let stockClass = 'excellent', stockText = `✅ ${stock}+ in stock`;
  if      (stock <= 5)  { stockClass = 'low';    stockText = `⚠️ Only ${stock} left`; }
  else if (stock <=15) { stockClass = 'medium'; stockText = `🔶 ${stock} available`; }
  else if (stock <=50) { stockClass = 'good';   stockText = `✅ ${stock} available`; }

  const priceHtml = disc >= 99
    ? `<span class="free-price">FREE</span><span class="orig-price">$${reg.toFixed(0)}</span>`
    : `<span class="sale-price">$${sale.toFixed(0)}</span><span class="orig-price">$${reg.toFixed(0)}</span>`;

  return `<div class="card">
    <div class="badge badge-${badge}">${disc}% OFF</div>
    <div class="content">
      <div class="title">${logo?`<img src="${logo}" class="logo">`:''}${model}</div>
      <div class="details">Item: ${item}</div>
      <div class="pricing">${priceHtml}</div>
      <div class="save">💰 Save $${save}</div>
      <div class="stock stock-${stockClass}">${stockText}</div>
    </div>
  </div>`;
}

// Generate the HTML page
function generateHTML(items) {
  const total = items.length;
  const over50 = items.filter(d=> parseFloat(d['FlyerData[B2B_Discount_Percentage]'])>=50).length;
  const avgSav = Math.round(items.reduce((s,d)=> s + (parseFloat(d['FlyerData[Net]']) - parseFloat(d['FlyerData[SalePrice]'])),0)/total);
  const freeCt = items.filter(d=> parseFloat(d['FlyerData[B2B_Discount_Percentage]'])>=99).length;
  const now = new Date().toLocaleString();
  const cards = items.map(generateCard).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Sturgeon Tire Live Deals</title>
<style>
:root { --primary:#2e6fa3; --dark:#182742; --light-bg:#f0f8ff; --accent:#ffa726; }
body { margin:0; font-family:'Segoe UI',sans-serif; background:var(--light-bg); }
.header { background:var(--primary); color:#fff; padding:20px; text-align:center; }
.header h1 { margin:0; font-size:1.8rem; }
.header p  { margin:5px 0 0; font-size:1rem; }
.stats { display:flex; flex-wrap:wrap; justify-content:center; gap:30px; padding:15px; background:#fff; }
.stats div { text-align:center; min-width:100px; }
.stats .num { font-size:1.2rem; font-weight:bold; color:var(--primary); }
.grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; padding:15px; }
@media (max-width:768px) { .grid { grid-template-columns:1fr; } .header h1 { font-size:1.5rem;} }
.card { background:#fff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1); position:relative; overflow:hidden; }
.badge { position:absolute; top:10px; right:10px; padding:4px 8px; border-radius:4px; color:#fff; font-size:0.8rem; }
.badge-sale  { background:var(--accent);} .badge-good { background:var(--primary);} .badge-great{ background:#ffb300;} .badge-huge{ background:#ff6d00;} .badge-free { background:var(--dark);} 
.content { padding:16px; }
.logo { height:28px; vertical-align:middle; margin-right:8px; }
.title { font-size:1.1rem; font-weight:bold; color:var(--dark); margin-bottom:6px; }
.details{ font-size:0.9rem; color:#555; margin-bottom:6px; }
.pricing{ margin-bottom:6px; }
.sale-price{ color:#27ae60; font-weight:bold; }
.orig-price{ text-decoration:line-through; color:#888; margin-left:6px; }
.free-price{ color:var(--dark); font-weight:bold; }
.save{ color:#e74c3c; font-size:0.9rem; margin-bottom:6px; }
.stock{ font-size:0.8rem; padding:4px 6px; border-radius:4px; display:inline-block; margin-bottom:6px; }
.stock-low{ background:#fdecea; color:#c0392b;} .stock-medium{ background:#fff8e1; color:#f57c00;} .stock-good{ background:#e8f5e9; color:#2e7d32;} .stock-excellent{ background:#e3f2fd; color:#1565c0;}
.footer{ text-align:center; padding:15px; background:#fff; }
.footer a{ margin:0 10px; color:var(--primary); text-decoration:none; font-weight:bold; }
</style>
</head>
<body>
  <div class="header"><h1>🚗 Sturgeon Tire Live Deals</h1><p>Updated: ${now}</p></div>
  <div class="stats">
    <div><div class="num">${total}</div>Deals</div>
    <div><div class="num">${over50}</div>50%+ Off</div>
    <div><div class="num">$${avgSav}</div>Avg Savings</div>
    <div><div class="num">${freeCt||over50}</div>${freeCt?'Free':'Hot'} Items</div>
  </div>
  <div class="grid">${cards}</div>
  <div class="footer"><a href="tel:+12049355559">📞 (204) 935-5559</a><a href="mailto:sales@sturgeontire.com">✉️ Quote</a></div>
</body>
</html>`;
}

(async()=>{
  try {
    console.log('Dir:', process.cwd());
    const data = readLocalCSV();
    const items = parseCSV(data);
    const html = generateHTML(items);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log(`✅ Generated index.html with ${items.length} items`);
  } catch (e) { console.error(e); process.exit(1); }
})();
