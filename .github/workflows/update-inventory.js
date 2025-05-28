const fs = require('fs');

function readLocalCSV() {
    try {
        const csvData = fs.readFileSync('flyer_data.csv', 'utf8');
        console.log('✅ Successfully read CSV file from repository');
        return csvData;
    } catch (error) {
        throw new Error('Could not read flyer_data.csv: ' + error.message);
    }
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
    }

    const headers = parseCSVLine(lines[0]);
    console.log('CSV Headers found:', headers.length, 'columns');

    const tires = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;

        const tire = {};
        headers.forEach((header, index) => {
            tire[header] = values[index] || '';
        });

        const discount = parseFloat(tire['FlyerData[B2B_Discount_Percentage]']) || 0;
        const stock    = parseInt(tire['FlyerData[AvailableQuantity]'])       || 0;

        if (discount >= 15 && stock > 0) {
            tires.push(tire);
        }
    }

    console.log(`✅ Found ${tires.length} qualifying deals from ${lines.length - 1} total rows`);

    return tires.sort((a, b) => {
        const da = parseFloat(a['FlyerData[B2B_Discount_Percentage]']) || 0;
        const db = parseFloat(b['FlyerData[B2B_Discount_Percentage]']) || 0;
        return db - da;
    });
}

function generateTireCard(tire) {
    const logoURL     = tire['FlyerData[Brand_Logo_URL]']             || '';
    const model       = tire['FlyerData[Model]']                      || 'TIRE';
    const item        = tire['FlyerData[Item]']                       || '';
    const discount    = parseInt(tire['FlyerData[B2B_Discount_Percentage]']) || 0;
    const salePrice   = parseFloat(tire['FlyerData[SalePrice]'])      || 0;
    const regularPrice= parseFloat(tire['FlyerData[Net]'])           || 0;
    const savings     = parseFloat(tire['FlyerData[B2B_Savings_Amount]'])  || 0;
    const stock       = parseInt(tire['FlyerData[AvailableQuantity]'])     || 0;

    let badgeClass = 'discount-sale';
    if      (discount >= 99) badgeClass = 'discount-free';
    else if (discount >= 40) badgeClass = 'discount-huge';
    else if (discount >= 30) badgeClass = 'discount-great';
    else if (discount >= 20) badgeClass = 'discount-good';

    let stockClass = 'stock-good';
    let stockText  = `✅ ${stock} available`;
    if      (stock <= 5)  { stockClass = 'stock-low';     stockText = `⚠️ Only ${stock} left`;       }
    else if (stock <= 15) { stockClass = 'stock-medium';  stockText = `🔶 ${stock} available`; }
    else if (stock >  50) { stockClass = 'stock-excellent'; stockText = `✅ ${stock}+ in stock`; }

    const priceDisplay = discount >= 99 
        ? `<span class="free-price">FREE</span><span class="original-price">$${regularPrice.toFixed(0)}</span>`
        : `<span class="sale-price">$${salePrice.toFixed(0)}</span><span class="original-price">$${regularPrice.toFixed(0)}</span>`;

    return `
        <div class="deal-card">
            <div class="discount-badge ${badgeClass}">${discount}% OFF${discount >= 99 ? ' - FREE!' : ''}</div>
            <div class="card-content">
                <div class="brand-model">
                    ${logoURL ? `<img src="${logoURL}" alt="Logo" />` : ''}${model}
                </div>
                <div class="tire-details">
                    Item: ${item}<br>Professional grade tire
                </div>
                <div class="pricing">
                    ${priceDisplay}
                </div>
                <div class="savings">💰 Save $${Math.round(savings)} per tire!</div>
                <div class="stock-info ${stockClass}">${stockText}</div>
                <div class="card-actions">
                    <a href="mailto:sales@sturgeontire.com?subject=Quote Request - ${model}" class="btn-quote">${discount >= 99 ? 'Claim FREE Tires!' : 'Add to Quote'}</a>
                    <a href="tel:+12049355559" class="btn-call">📞</a>
                </div>
            </div>
        </div>`;
}

function generateHTML(tires) {
    const totalItems  = tires.length;
    const items50Plus = tires.filter(t => parseFloat(t['FlyerData[B2B_Discount_Percentage]']) >= 50).length;
    const avgSavings  = Math.round(
        tires.reduce((sum, t) => sum + parseFloat(t['FlyerData[B2B_Savings_Amount]'] || 0), 0)
        / totalItems
    );
    const freeItems   = tires.filter(t => parseFloat(t['FlyerData[B2B_Discount_Percentage]']) >= 99).length;
    const maxDiscount = Math.max(...tires.map(t => parseFloat(t['FlyerData[B2B_Discount_Percentage]']) || 0));
    const tireCards   = tires.slice(0, 20).map(generateTireCard).join('');
    const currentDate = new Date().toLocaleDateString();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sturgeon Tire Live Clearance</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI', Tahoma, sans-serif; background:#fafafa; }
        .container { max-width:1200px; margin:20px auto; padding:20px; }
        .header { background:linear-gradient(135deg,#ff6b35 0%,#ff9f43 100%); color:white; padding:30px; border-radius:8px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
        .header h1 { font-size:32px; margin-bottom:10px; }
        .header p  { font-size:18px; }
        .stats-bar { display:flex; flex-wrap:wrap; justify-content:space-around; background:white; margin:20px 0; padding:20px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
        .stat { text-align:center; margin:10px; }
        .stat-number { font-size:24px; font-weight:bold; color:#ff6b35; }
        .stat-label  { font-size:14px; color:#555; }
        .deals-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; }
        .deal-card { background:white; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1); position:relative; }
        .discount-badge { position:absolute; top:12px; right:12px; padding:6px 10px; border-radius:4px; color:white; font-weight:bold; font-size:12px; }
        .discount-free     { background:#8e44ad; }
        .discount-huge     { background:#e74c3c; }
        .discount-great    { background:#f39c12; }
        .discount-good     { background:#3498db; }
        .discount-sale     { background:#95a5a6; }
        .card-content      { padding:16px; }
        .brand-model       { font-size:18px; font-weight:bold; color:#333; margin-bottom:10px; }
        .brand-model img   { height:24px; vertical-align:middle; margin-right:8px; }
        .tire-details      { font-size:14px; color:#666; margin-bottom:12px; }
        .pricing           { margin-bottom:12px; }
        .sale-price        { font-size:20px; font-weight:bold; color:#27ae60; }
        .original-price    { text-decoration:line-through; color:#999; margin-left:8px; }
        .free-price        { font-size:20px; font-weight:bold; color:#8e44ad; }
        .savings           { font-size:14px; color:#e74c3c; margin-bottom:12px; }
        .stock-info        { font-size:13px; margin-bottom:12px; padding:6px 10px; border-radius:4px; display:inline-block; font-weight:bold; }
        .stock-low         { background:#fdecea; color:#c0392b; }
        .stock-medium      { background:#fff5e6; color:#e67e22; }
        .stock-good        { background:#eafaf1; color:#27ae60; }
        .stock-excellent   { background:#e8f8f5; color:#16a085; }
        .card-actions      { display:flex; gap:10px; }
        .btn-quote         { flex:1; text-align:center; background:#ff6b35; color:white; padding:10px; text-decoration:none; border-radius:4px; font-weight:bold; }
        .btn-call          { width:48px; text-align:center; background:#27ae60; color:white; padding:10px; border-radius:4px; font-weight:bold; }
        @media (max-width:600px) { .stats-bar { flex-direction:column; align-items:center; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📢 Sturgeon Tire Live Clearance</h1>
            <p>Friendly deals for mom & pop garages – updated ${currentDate}</p>
        </div>
        <div class="stats-bar">
            <div class="stat"><span class="stat-number">${totalItems}</span><br><span class="stat-label">Items on Sale</span></div>
            <div class="stat"><span class="stat-number">${items50Plus}</span><br><span class="stat-label">50%+ Off</span></div>
            <div class="stat"><span class="stat-number">$${avgSavings}</span><br><span class="stat-label">Avg Savings</span></div>
            <div class="stat"><span class="stat-number">${freeItems>0?freeItems:items50Plus}</span><br><span class="stat-label">${freeItems>0?'FREE Items':'Hot Deals'}</span></div>
        </div>
        <div class="deals-grid">
            ${tireCards}
        </div>
        <div class="stats-bar">
            <a href="tel:+12049355559" class="btn-quote">📞 Call (204) 935-5559</a>
            <a href="mailto:sales@sturgeontire.com" class="btn-call">✉️</a>
        </div>
    </div>
</body>
</html>`;
}

async function main() {
    try {
        console.log('🔄 Reading tire data from repository...');
        console.log('📂 Current directory:', process.cwd());

        const csvData = readLocalCSV();
        console.log('📊 Processing tire deals...');
        const tires   = parseCSV(csvData);
        if (tires.length === 0) throw new Error('No qualifying tire deals found');

        console.log('🎨 Generating HTML...');
        const html = generateHTML(tires);

        console.log('💾 Updating website...');
        fs.writeFileSync('index.html', html, 'utf8');
        console.log(`🚀 Website updated successfully! Showing top ${Math.min(tires.length,20)} deals`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
