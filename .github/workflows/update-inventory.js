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
        const stock = parseInt(tire['FlyerData[AvailableQuantity]']) || 0;

        if (discount >= 15 && stock > 0) {
            tires.push(tire);
        }
    }

    console.log(`✅ Found ${tires.length} qualifying deals from ${lines.length - 1} total rows`);

    return tires.sort((a, b) => {
        const discountA = parseFloat(a['FlyerData[B2B_Discount_Percentage]']) || 0;
        const discountB = parseFloat(b['FlyerData[B2B_Discount_Percentage]']) || 0;
        return discountB - discountA;
    });
}

function generateTireCard(tire) {
    const logoURL = tire['FlyerData[Brand_Logo_URL]'] || '';
    const model = tire['FlyerData[Model]'] || 'TIRE';
    const item = tire['FlyerData[Item]'] || '';
    const discount = parseInt(tire['FlyerData[B2B_Discount_Percentage]']) || 0;
    const salePrice = parseFloat(tire['FlyerData[SalePrice]']) || 0;
    const regularPrice = parseFloat(tire['FlyerData[Net]']) || 0;
    const savings = parseFloat(tire['FlyerData[B2B_Savings_Amount]']) || 0;
    const stock = parseInt(tire['FlyerData[AvailableQuantity]']) || 0;

    let badgeClass = 'discount-sale';
    if (discount >= 99) badgeClass = 'discount-free';
    else if (discount >= 40) badgeClass = 'discount-huge';
    else if (discount >= 30) badgeClass = 'discount-great';
    else if (discount >= 20) badgeClass = 'discount-good';

    let stockClass = 'stock-good';
    let stockText = `✅ ${stock} available`;
    if (stock <= 5) {
        stockClass = 'stock-low';
        stockText = `⚠️ Only ${stock} left`;
    } else if (stock <= 15) {
        stockClass = 'stock-medium';
        stockText = `🔶 ${stock} available`;
    } else if (stock > 50) {
        stockClass = 'stock-excellent';
        stockText = `✅ ${stock}+ in stock`;
    }

    const priceDisplay = discount >= 99 
        ? `<span class="free-price">FREE</span><span class="original-price">$${regularPrice.toFixed(0)}</span>`
        : `<span class="sale-price">$${salePrice.toFixed(0)}</span><span class="original-price">$${regularPrice.toFixed(0)}</span>`;

    return `
        <div class="deal-card">
            <div class="discount-badge ${badgeClass}">${discount}% OFF${discount >= 99 ? ' - FREE!' : ''}</div>
            <div class="card-content">
                <div class="brand-model">
                    ${logoURL ? `<img src="${logoURL}" alt="Logo" style="height:24px;vertical-align:middle;margin-right:10px;">` : ''}
                    ${model}
                </div>
                <div class="tire-details">
                    Item: ${item}<br>
                    Professional grade tire
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
    const totalItems = tires.length;
    const items50Plus = tires.filter(t => parseFloat(t['FlyerData[B2B_Discount_Percentage]']) >= 50).length;
    const avgSavings = Math.round(tires.reduce((sum, t) => sum + parseFloat(t['FlyerData[B2B_Savings_Amount]'] || 0), 0) / totalItems);
    const freeItems = tires.filter(t => parseFloat(t['FlyerData[B2B_Discount_Percentage]']) >= 99).length;
    const maxDiscount = Math.max(...tires.map(t => parseFloat(t['FlyerData[B2B_Discount_Percentage]']) || 0));

    const tireCards = tires.slice(0, 20).map(generateTireCard).join('');
    const currentDate = new Date().toLocaleDateString();

    const template = fs.readFileSync('template.html', 'utf8');
    return template
        .replace('{{cards}}', tireCards)
        .replace('{{maxDiscount}}', maxDiscount)
        .replace('{{totalItems}}', totalItems)
        .replace('{{items50Plus}}', items50Plus)
        .replace('{{avgSavings}}', avgSavings)
        .replace('{{freeItems}}', freeItems > 0 ? freeItems : items50Plus)
        .replace('{{currentDate}}', currentDate);
}

async function main() {
    try {
        console.log('🔄 Reading tire data from repository...');
        const csvData = readLocalCSV();

        console.log('📊 Processing tire deals...');
        const tires = parseCSV(csvData);
        if (tires.length === 0) throw new Error('No qualifying tire deals found');

        console.log('🎨 Generating HTML...');
        const html = generateHTML(tires);

        console.log('💾 Updating website...');
        fs.writeFileSync('index.html', html);
        console.log(`🚀 Website updated successfully! Showing top ${Math.min(tires.length, 20)} deals`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
