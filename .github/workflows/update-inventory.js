const fs = require('fs');

function readLocalCSV() {
    try {
        const csvData = fs.readFileSync('flyer_data.csv', 'utf8');
        console.log('✅ Successfully read CSV file');
        return csvData;
    } catch (error) {
        throw new Error('Could not read flyer_data.csv: ' + error.message);
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    function parseLine(line) {
        const cols = [];
        let cur = '';
        let inQuotes = false;
        for (let c of line) {
            if (c === '"') inQuotes = !inQuotes;
            else if (c === ',' && !inQuotes) { cols.push(cur.trim().replace(/^"|"$/g, '')); cur = ''; }
            else cur += c;
        }
        cols.push(cur.trim().replace(/^"|"$/g, ''));
        return cols;
    }

    const headers = parseLine(lines[0]);
    console.log(`CSV Headers: ${headers.length}`);

    const deals = [];
    for (let i = 1; i < lines.length; i++) {
        const vals = parseLine(lines[i]);
        if (vals.length < headers.length) continue;
        const row = {};
        headers.forEach((h, idx) => row[h] = vals[idx] || '');
        const disc = parseFloat(row['FlyerData[B2B_Discount_Percentage]']) || 0;
        const qty  = parseInt(row['FlyerData[AvailableQuantity]']) || 0;
        if (qty > 0 && disc >= 15) deals.push(row);
    }
    console.log(`✅ ${deals.length} deals found`);
    return deals.sort((a,b) => parseFloat(b['FlyerData[B2B_Discount_Percentage]']) - parseFloat(a['FlyerData[B2B_Discount_Percentage]']));
}

function generateCard(d) {
    const logo = d['FlyerData[Brand_Logo_URL]'] || '';
    const model = d['FlyerData[Model]'] || 'TIRE';
    const item  = d['FlyerData[Item]']  || '';
    const disc  = Math.round(parseFloat(d['FlyerData[B2B_Discount_Percentage]']) || 0);
    const sale  = parseFloat(d['FlyerData[SalePrice]']) || 0;
    const reg   = parseFloat(d['FlyerData[Net]'])       || 0;
    const save  = Math.round(reg - sale);
    const qty   = parseInt(d['FlyerData[AvailableQuantity]']) || 0;

    let badge = 'sale';
    if (disc >= 99) badge = 'free';
    else if (disc >= 40) badge = 'huge';
    else if (disc >= 30) badge = 'great';
    else if (disc >= 20) badge = 'good';

    let stockClass = 'excellent', stockText = `✅ ${qty}+ in stock`;
    if (qty <= 5)  { stockClass = 'low';    stockText = `⚠️ Only ${qty} left`; }
    else if (qty <=15) { stockClass = 'medium'; stockText = `🔶 ${qty} available`; }
    else if (qty <=50) { stockClass = 'good'; stockText = `✅ ${qty} available`; }

    const priceHtml = disc >= 99
      ? `<span class="free-price">FREE</span><span class="orig-price">$${reg.toFixed(0)}</span>`
      : `<span class="sale-price">$${sale.toFixed(0)}</span><span class="orig-price">$${reg.toFixed(0)}</span>`;

    return `<div class="card">
        <div class="badge badge-${badge}">${disc}% OFF</div>
        <div class="content">
            <div class="title">${logo?`<img src="${logo}" alt="logo" class="logo">`:''}${model}</div>
            <div class="details">Item: ${item}</div>
            <div class="pricing">${priceHtml}</div>
            <div class="save">💰 Save $${save}</div>
            <div class="stock stock-${stockClass}">${stockText}</div>
        </div>
    </div>`;
}

function generateHTML(deals) {
    const total = deals.length;
    const over50 = deals.filter(d=> parseFloat(d['FlyerData[B2B_Discount_Percentage]'])>=50).length;
    const avgSav = Math.round(deals.reduce((s,d)=> s + (parseFloat(d['FlyerData[Net]'])-parseFloat(d['FlyerData[SalePrice]'])),0)/total);
    const freeCt = deals.filter(d=> parseFloat(d['FlyerData[B2B_Discount_Percentage]'])>=99).length;
    const now = new Date().toLocaleString();
    const cards = deals.map(generateCard).join('');

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Sturgeon Tire Deals</title>
    <style>
    :root { --brand: #2e6fa3; --dark: #182742; --light-bg: #f0f8ff; --accent: #ffa726; }
    body { margin:0; font-family:'Segoe UI',sans-serif; background:var(--light-bg); }
    .header { background: var(--brand); color:white; padding:20px; text-align:center; }
    .header h1 { margin:0; }
    .stats { display:flex; justify-content:center; gap:20px; padding:15px; background:white; }
    .stats div { text-align:center; }
    .stats .num { font-size:20px; font-weight:bold; color:var(--brand); }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:15px; padding:15px; }
    .card { background:white; border-radius:6px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.1); position:relative; }
    .badge { position:absolute; top:10px; right:10px; padding:4px 8px; border-radius:4px; color:white; font-size:12px; }
    .badge-sale  { background:var(--accent); }
    .badge-good  { background:var(--brand); }
    .badge-great { background:#ffb300; }
    .badge-huge  { background:#ff6d00; }
    .badge-free  { background:var(--dark); }
    .logo { height:24px; vertical-align:middle; margin-right:6px; }
    .content { padding:12px; }
    .title { font-size:16px; font-weight:bold; color:var(--dark); margin-bottom:6px; }
    .details { font-size:13px; color:#555; margin-bottom:6px; }
    .sale-price { color:#27ae60; font-weight:bold; }
    .orig-price { text-decoration:line-through; color:#888; margin-left:6px; }
    .free-price { color:var(--dark); font-weight:bold; }
    .pricing { margin-bottom:6px; }
    .save { color:#e74c3c; font-size:13px; margin-bottom:6px; }
    .stock { font-size:12px; padding:4px 6px; border-radius:4px; display:inline-block; margin-bottom:6px; }
    .stock-low { background:#fdecea; color:#c0392b; }
    .stock-medium { background:#fff8e1; color:#f57c00; }
    .stock-good { background:#e8f5e9; color:#2e7d32; }
    .stock-excellent { background:#e3f2fd; color:#1565c0; }
    .footer { text-align:center; padding:15px; background:white; }
    .footer a { margin:0 10px; color:var(--brand); text-decoration:none; font-weight:bold; }
    </style>
</head><body>
    <div class="header"><h1>🚗 Sturgeon Tire Live Deals</h1><p>Updated: ${now}</p></div>
    <div class="stats">
        <div><div class="num">${total}</div><div>Deals</div></div>
        <div><div class="num">${over50}</div><div>50%+ Off</div></div>
        <div><div class="num">$${avgSav}</div><div>Avg Savings</div></div>
        <div><div class="num">${freeCt||over50}</div><div>${freeCt?'Free':'Hot'} Items</div></div>
    </div>
    <div class="grid">${cards}</div>
    <div class="footer">
        <a href="tel:+12049854040">📞 (204) 985-4040</a>
        <a href="mailto:sales@sturgeontire.com">✉️ Quote</a>
    </div>
</body></html>`;
}

(async ()=>{
    try {
        console.log('Dir:', process.cwd());
        const data = readLocalCSV();
        const deals = parseCSV(data);
        const html = generateHTML(deals);
        fs.writeFileSync('index.html', html, 'utf8');
        console.log('✅ index.html generated with', deals.length, 'items');
    } catch(e) { console.error('Error:', e.message); process.exit(1);}    
})();
