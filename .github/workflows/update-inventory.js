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

function generateHTML(items) {
  const manufacturers = Array.from(new Set(items.map(i => i.manufacturer))).sort();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sturgeon Tire Live Deals</title>
  <style>
    :root{--primary:#2e6fa3;--dark:#182742;--bg:#f0f8ff;--accent:#ffa726}
    body{margin:0;font-family:'Segoe UI',sans-serif;background:var(--bg)}
    .header{background:var(--primary);color:#fff;padding:16px;text-align:center;position:relative}
    .header h1{margin:0;font-size:1.6rem;display:flex;align-items:center;justify-content:center;gap:12px}
    .company-logo{height:40px;width:auto}
    .update-time{position:absolute;top:8px;right:12px;font-size:0.7rem;opacity:0.8}
    .stats{display:flex;flex-wrap:wrap;justify-content:center;gap:20px;padding:12px;background:#fff;margin:12px 0;border-radius:8px}
    .stats div{text-align:center;min-width:80px}
    .stats .num{font-size:1.4rem;font-weight:bold;color:var(--primary)}
    .stats .label{font-size:0.8rem;color:#666}
    .filters{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:12px}
    .filters select{padding:4px;border-radius:4px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;padding:12px}
    .card{background:#fff;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.1);position:relative;overflow:hidden}
    .badge{position:absolute;top:8px;right:8px;padding:4px 6px;border-radius:4px;color:#fff;font-size:0.75rem}
    .badge-sale{background:var(--accent)}.badge-good{background:var(--primary)}.badge-great{background:#ffb300}.badge-huge{background:#ff6d00}.badge-free{background:var(--dark)}
    .content{padding:10px}
    .logo{height:24px;vertical-align:middle;margin-right:6px}
    .title{font-size:1.1rem;font-weight:bold;color:var(--dark);margin-bottom:6px}
    .details{font-size:0.85rem;color:#555;margin-bottom:6px}
    .pricing{margin-bottom:6px}
    .sale-price{color:#27ae60;font-weight:bold}
    .orig-price{text-decoration:line-through;color:#888;margin-left:6px}
    .free-price{color:var(--dark);font-weight:bold}
    .save{color:#e74c3c;font-size:0.85rem;margin-bottom:6px}
    .stock{font-size:0.8rem;padding:3px 6px;border-radius:4px;display:inline-block;margin-bottom:6px}
    .stock-low{background:#fdecea;color:#c0392b}.stock-medium{background:#fff8e1;color:#f57c00}.stock-good{background:#e8f5e9;color:#2e7d32}.stock-excellent{background:#e3f2fd;color:#1565c0}
    .btn-add-quote{background:#27ae60;color:white;border:none;padding:12px 16px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;width:100%}
    .btn-add-quote:hover{background:#229954}
    .quote-counter{position:fixed;bottom:20px;right:20px;background:#e74c3c;color:white;padding:12px 16px;border-radius:25px;cursor:pointer;font-weight:bold;display:none;z-index:1000}
    .quote-modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000}
    .quote-modal-content{background:white;margin:5% auto;padding:20px;width:90%;max-width:600px;border-radius:8px;max-height:80vh;overflow-y:auto}
    .quote-item{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee}
    .quote-form{margin-top:20px;padding-top:20px;border-top:2px solid #eee}
    .quote-form input,.quote-form textarea{width:100%;padding:8px;margin-bottom:10px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box}
    .submit-quote{background:#27ae60;color:white;border:none;padding:12px 24px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%}
    .close-modal{float:right;font-size:28px;font-weight:bold;cursor:pointer;color:#aaa}
    .remove-item{background:#e74c3c;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px}
    .footer{text-align:center;padding:20px;background:#fff;margin:12px 0;border-radius:8px}
    .footer a{margin:0 15px;color:var(--primary);text-decoration:none;font-weight:bold;padding:8px 16px;border:2px solid var(--primary);border-radius:4px}
    @media (max-width:768px){.grid{grid-template-columns:1fr}.update-time{position:static;text-align:center;margin-top:8px}.header h1{flex-direction:column}}
  </style>
</head>
<body>
  <div class="header">
    <div class="update-time">Updated: ${new Date().toLocaleString()}</div>
    <h1><img src="Logo.png" alt="Sturgeon Tire" class="company-logo" onerror="this.style.display='none'">Sturgeon Tire Live Deals</h1>
  </div>
  
  <div class="stats">
    <div><div class="num">${items.length}</div><div class="label">Deals</div></div>
    <div><div class="num">${items.filter(i => i.disc >= 50).length}</div><div class="label">50%+ Off</div></div>
    <div><div class="num">$${Math.round(items.reduce((sum, i) => sum + i.save, 0) / items.length)}</div><div class="label">Avg Savings</div></div>
  </div>
  
  <div class="filters">
    <label>Manufacturer: <select id="filter-manufacturer"><option value="">All</option>${manufacturers.map(m => `<option value="${m}">${m}</option>`).join('')}</select></label>
    <label>Min Discount: <select id="filter-discount"><option value="0">0%</option><option value="20">20%</option><option value="40">40%</option></select></label>
  </div>
  
  <div class="grid" id="card-container"></div>
  <div class="footer"><a href="tel:+12049355559">Call (204) 935-5559</a><a href="mailto:nileshn@sturgeontire.com">Get Quote</a></div>
  
  <div class="quote-counter" id="quote-counter" onclick="openQuoteModal()">Quote (<span id="quote-count">0</span>)</div>
  
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
    const items = ${JSON.stringify(items, null, 2)};
    let quoteItems = [];

    function renderCard(i) {
      const badgeType = i.disc >= 99 ? 'free' : i.disc >= 40 ? 'huge' : i.disc >= 30 ? 'great' : i.disc >= 20 ? 'good' : 'sale';
      const priceHtml = i.disc >= 99 ? '<span class="free-price">FREE</span><span class="orig-price">$' + i.reg + '</span>' : '<span class="sale-price">$' + i.sale + '</span><span class="orig-price">$' + i.reg + '</span>';
      const stockClass = i.stock <= 5 ? 'low' : i.stock <= 15 ? 'medium' : i.stock <= 50 ? 'good' : 'excellent';
      return '<div class="card"><div class="badge badge-' + badgeType + '">' + i.disc + '% OFF</div><div class="content">' + (i.logo ? '<img src="' + i.logo + '" class="logo">' : '') + '<div class="title">' + i.model + '</div><div class="details">Item: ' + i.item + ' • ' + i.manufacturer + '</div><div class="pricing">' + priceHtml + '</div><div class="save">Save $' + i.save + '</div><div class="stock stock-' + stockClass + '">Qty: ' + i.stock + '</div><button class="btn-add-quote" onclick="addToQuote(\\'' + i.item + '\\')">Add to Quote</button></div></div>';
    }

    function render() {
      const mf = document.getElementById('filter-manufacturer').value;
      const md = parseInt(document.getElementById('filter-discount').value);
      const filtered = items.filter(i => (!mf || i.manufacturer === mf) && i.disc >= md);
      document.getElementById('card-container').innerHTML = filtered.slice(0, 50).map(renderCard).join('');
    }

    function addToQuote(itemCode) {
      const item = items.find(i => i.item === itemCode);
      if (!item) return;
      const existingIndex = quoteItems.findIndex(q => q.item === item.item);
      if (existingIndex >= 0) {
        quoteItems[existingIndex].quantity += 1;
      } else {
        quoteItems.push({...item, quantity: 1});
      }
      updateQuoteCounter();
    }

    function removeFromQuote(itemCode) {
      quoteItems = quoteItems.filter(item => item.item !== itemCode);
      updateQuoteCounter();
      updateQuoteModal();
    }

    function updateQuantity(itemCode, newQuantity) {
      const qty = parseInt(newQuantity);
      const itemIndex = quoteItems.findIndex(item => item.item === itemCode);
      if (itemIndex === -1) return;
      if (qty <= 0) {
        removeFromQuote(itemCode);
      } else {
        quoteItems[itemIndex].quantity = Math.min(qty, quoteItems[itemIndex].stock);
        updateQuoteModal();
      }
    }

    function updateQuoteCounter() {
      const counter = document.getElementById('quote-counter');
      const count = document.getElementById('quote-count');
      if (quoteItems.length > 0) {
        counter.style.display = 'block';
        count.textContent = quoteItems.length;
      } else {
        counter.style.display = 'none';
      }
    }

    function openQuoteModal() {
      updateQuoteModal();
      document.getElementById('quote-modal').style.display = 'block';
    }

    function closeQuoteModal() {
      document.getElementById('quote-modal').style.display = 'none';
    }

    function updateQuoteModal() {
      const container = document.getElementById('quote-items');
      if (quoteItems.length === 0) {
        container.innerHTML = '<p>No items in quote yet.</p>';
        return;
      }
      let html = '<h3>Items:</h3>';
      quoteItems.forEach(item => {
        html += '<div class="quote-item"><div><strong>' + item.manufacturer + ' ' + item.model + '</strong><br>Item: ' + item.item + ' • $' + item.sale + ' each</div><div style="display:flex;align-items:center;gap:10px;"><input type="number" min="1" max="' + item.stock + '" value="' + item.quantity + '" onchange="updateQuantity(\\'' + item.item + '\\', this.value)" style="width:60px;padding:4px;text-align:center;"><small>/ ' + item.stock + '</small><button class="remove-item" onclick="removeFromQuote(\\'' + item.item + '\\')">×</button></div></div>';
      });
      container.innerHTML = html;
    }

    function submitQuote() {
      const name = document.getElementById('customer-name').value;
      const email = document.getElementById('customer-email').value;
      const phone = document.getElementById('customer-phone').value;
      const company = document.getElementById('customer-company').value;
      const notes = document.getElementById('customer-notes').value;
      
      if (!name || !email) {
        alert('Please fill in your name and email.');
        return;
      }
      
      const submitBtn = document.querySelector('.submit-quote');
      submitBtn.innerHTML = 'Sending...';
      submitBtn.disabled = true;
      
      const tireDetails = quoteItems.map((item, index) => \`\${index + 1}. Item: \${item.item} - Qty: \${item.quantity}\`).join('\\n');
      const quoteSummary = \`TIRE QUOTE REQUEST

CUSTOMER:
Name: \${name}
Email: \${email}
Phone: \${phone || 'Not provided'}
Company: \${company || 'Not provided'}

ITEMS:
\${tireDetails}

NOTES: \${notes || 'None'}\`;
      
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('company', company);
      formData.append('items', tireDetails);
      formData.append('message', quoteSummary);
      formData.append('_subject', \`Tire Quote - \${name}\`);
      formData.append('_replyto', email);
      
      fetch('https://formspree.io/f/xdkgqyzr', {
        method: 'POST',
        body: formData,
        headers: {'Accept': 'application/json'}
      })
      .then(response => {
        if (response.ok) {
          submitBtn.innerHTML = 'Quote Sent!';
          setTimeout(() => {
            quoteItems = [];
            updateQuoteCounter();
            closeQuoteModal();
            submitBtn.innerHTML = 'Request Quote';
            submitBtn.disabled = false;
          }, 2000);
        } else {
          const subject = \`Tire Quote - \${name}\`;
          const mailtoLink = \`mailto:nileshn@sturgeontire.com?subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(quoteSummary)}\`;
          window.open(mailtoLink, '_blank');
          submitBtn.innerHTML = 'Request Quote';
          submitBtn.disabled = false;
        }
      })
      .catch(() => {
        const subject = \`Tire Quote - \${name}\`;
        const mailtoLink = \`mailto:nileshn@sturgeontire.com?subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(quoteSummary)}\`;
        window.open(mailtoLink, '_blank');
        submitBtn.innerHTML = 'Request Quote';
        submitBtn.disabled = false;
      });
    }

    document.getElementById('filter-manufacturer').addEventListener('change', render);
    document.getElementById('filter-discount').addEventListener('change', render);
    render();
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
        disc, sale, reg, save,
        stock: parseInt(d['AvailableQuantity']) || 0
      };
    }).sort((a, b) => b.disc - a.disc);
    
    if (items.length === 0) throw new Error('No deals found');
    
    const html = generateHTML(items);
    fs.writeFileSync('index.html', html);
    
    console.log('✅ Website updated successfully!');
    console.log(`📈 ${items.length} deals processed`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
