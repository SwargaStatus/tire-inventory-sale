// update-inventory.js - GitHub automation script
const fs = require('fs');
const https = require('https');

// Your SharePoint CSV URL (add as GitHub secret)
const CSV_URL = process.env.SHAREPOINT_CSV_URL || 'https://sturgeontire.sharepoint.com/sites/SturgeonTireDistributors/_layouts/15/download.aspx?SourceUrl=/sites/SturgeonTireDistributors/Shared%20Documents/FlyerData/flyer_data.csv';

async function downloadCSV(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const tires = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const tire = {};
        headers.forEach((header, index) => {
            tire[header] = values[index] || '';
        });
        
        // Only include items with good discounts and stock
        const discount = parseFloat(tire['FlyerData[B2B_Discount_Percentage]']) || 0;
        const stock = parseInt(tire['FlyerData[AvailableQuantity]']) || 0;
        
        if (discount >= 15 && stock > 0) {
            tires.push(tire);
        }
    }
    
    // Sort by discount (highest first)
    return tires.sort((a, b) => {
        const discountA = parseFloat(a['FlyerData[B2B_Discount_Percentage]']) || 0;
        const discountB = parseFloat(b['FlyerData[B2B_Discount_Percentage]']) || 0;
        return discountB - discountA;
    });
}

function generateTireCard(tire) {
    const brand = tire['FlyerData[Brand_Display]'] || 'QUALITY';
    const model = tire['FlyerData[Model]'] || 'TIRE';
    const item = tire['FlyerData[Item]'] || '';
    const discount = parseInt(tire['FlyerData[B2B_Discount_Percentage]']) || 0;
    const salePrice = parseFloat(tire['FlyerData[SalePrice]']) || 0;
    const regularPrice = parseFloat(tire['FlyerData[Net]']) || 0;
    const savings = parseFloat(tire['FlyerData[B2B_Savings_Amount]']) || 0;
    const stock = parseInt(tire['FlyerData[AvailableQuantity]']) || 0;
    
    // Determine badge class
    let badgeClass = 'discount-sale';
    if (discount >= 99) badgeClass = 'discount-free';
    else if (discount >= 40) badgeClass = 'discount-huge';
    else if (discount >= 30) badgeClass = 'discount-great';
    else if (discount >= 20) badgeClass = 'discount-good';
    
    // Stock status
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
                <div class="brand-model">${brand} ${model}</div>
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
                    <a href="mailto:sales@sturgeontire.com?subject=Quote Request - ${brand} ${model}" class="btn-quote">${discount >= 99 ? 'Claim FREE Tires!' : 'Add to Quote'}</a>
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
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sturgeon Tire - Live Inventory Sale</title>
    <meta name="description" content="Live tire clearance sale - up to ${maxDiscount}% off! Professional wholesale prices updated daily.">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f7fa;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .header p {
            font-size: 18px;
            margin-bottom: 25px;
            opacity: 0.9;
        }
        
        .cta-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 15px 30px;
            border: none;
            border-radius: 25px;
            font-weight: bold;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
            cursor: pointer;
            font-size: 16px;
        }
        
        .btn-primary {
            background: #ff6b35;
            color: white;
        }
        
        .btn-secondary {
            background: transparent;
            color: white;
            border: 2px solid white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        
        .stats-bar {
            background: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .stat {
            padding: 15px;
        }
        
        .stat-number {
            font-size: 28px;
            font-weight: bold;
            color: #e74c3c;
            display: block;
        }
        
        .stat-label {
            color: #6c757d;
            font-size: 14px;
            margin-top: 5px;
        }
        
        .update-info {
            background: #e8f5e8;
            border: 1px solid #4caf50;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            color: #2e7d32;
        }
        
        .deals-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 25px;
            margin-top: 30px;
        }
        
        .deal-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: all 0.3s ease;
            position: relative;
            border: 1px solid #e9ecef;
        }
        
        .deal-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }
        
        .discount-badge {
            position: absolute;
            top: 15px;
            right: 15px;
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            z-index: 2;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .discount-free { background: #8e44ad; }
        .discount-huge { background: #e74c3c; }
        .discount-great { background: #f39c12; }
        .discount-good { background: #3498db; }
        .discount-sale { background: #95a5a6; }
        
        .card-content {
            padding: 25px;
        }
        
        .brand-model {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
            line-height: 1.3;
        }
        
        .tire-details {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 18px;
            line-height: 1.4;
        }
        
        .pricing {
            margin-bottom: 18px;
        }
        
        .sale-price {
            font-size: 28px;
            font-weight: bold;
            color: #27ae60;
            margin-right: 12px;
        }
        
        .original-price {
            text-decoration: line-through;
            color: #6c757d;
            font-size: 18px;
        }
        
        .free-price {
            font-size: 28px;
            font-weight: bold;
            color: #8e44ad;
            margin-right: 12px;
        }
        
        .savings {
            color: #e74c3c;
            font-weight: bold;
            font-size: 16px;
            margin-top: 8px;
        }
        
        .stock-info {
            font-size: 13px;
            margin-bottom: 18px;
            font-weight: 500;
            padding: 8px 12px;
            border-radius: 6px;
            display: inline-block;
        }
        
        .stock-low { background: #ffeaa7; color: #d63031; }
        .stock-medium { background: #fab1a0; color: #e17055; }
        .stock-good { background: #a8e6cf; color: #00b894; }
        .stock-excellent { background: #74b9ff; color: #0984e3; }
        
        .card-actions {
            display: flex;
            gap: 12px;
        }
        
        .btn-quote {
            flex: 1;
            background: #3498db;
            color: white;
            padding: 14px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            text-align: center;
            text-decoration: none;
            transition: background 0.3s;
            font-size: 15px;
        }
        
        .btn-quote:hover {
            background: #2980b9;
        }
        
        .btn-call {
            background: #27ae60;
            color: white;
            padding: 14px 18px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            transition: background 0.3s;
            font-size: 16px;
        }
        
        .btn-call:hover {
            background: #229954;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .deals-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .cta-buttons {
                flex-direction: column;
                align-items: center;
            }
            
            .btn {
                width: 100%;
                max-width: 280px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔥 Live Inventory Clearance - Up to ${maxDiscount}% Off!</h1>
            <p>Professional wholesale tires - Updated daily from our live system!</p>
            <div class="cta-buttons">
                <a href="tel:+12049355559" class="btn btn-primary">📞 Call Now: (204) 935-5559</a>
                <a href="mailto:sales@sturgeontire.com" class="btn btn-secondary">Get Custom Quote</a>
            </div>
        </div>
        
        <div class="stats-bar">
            <div class="stats-grid">
                <div class="stat">
                    <span class="stat-number">${totalItems}</span>
                    <div class="stat-label">Items on Sale</div>
                </div>
                <div class="stat">
                    <span class="stat-number">${items50Plus}</span>
                    <div class="stat-label">Items 50%+ Off</div>
                </div>
                <div class="stat">
                    <span class="stat-number">$${avgSavings}</span>
                    <div class="stat-label">Average Savings</div>
                </div>
                <div class="stat">
                    <span class="stat-number">${freeItems > 0 ? freeItems : items50Plus}</span>
                    <div class="stat-label">${freeItems > 0 ? 'FREE Items' : 'Hot Deals'}</div>
                </div>
            </div>
        </div>
        
        <div class="update-info">
            🤖 <strong>Auto-Updated Daily!</strong> Fresh deals from our live inventory system.<br>
            <small>Last updated: ${currentDate} • Showing top ${Math.min(totalItems, 20)} deals</small>
        </div>
        
        <div class="deals-grid">
            ${tireCards}
        </div>
        
        <div class="update-info">
            <strong>📞 Call (204) 935-5559 now</strong> to reserve your tires or get a custom quote for your fleet!
        </div>
    </div>
</body>
</html>`;
}

async function main() {
    try {
        console.log('🔄 Downloading tire data...');
        const csvData = await downloadCSV(CSV_URL);
        
        console.log('📊 Processing tire deals...');
        const tires = parseCSV(csvData);
        
        console.log(`✅ Found ${tires.length} qualifying deals`);
        
        console.log('🎨 Generating HTML...');
        const html = generateHTML(tires);
        
        console.log('💾 Updating website...');
        fs.writeFileSync('index.html', html);
        
        console.log('🚀 Website updated successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
