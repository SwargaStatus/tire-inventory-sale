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
    .header{background:linear-gradient(135deg,var(--primary) 0%,#1e4f72 100%);color:#fff;padding:24px 20px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
    .header h1{margin:0;font-size:2rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:16px}
    .company-logo{height:48px;width:auto}
    .update-time{font-size:0.85rem;opacity:0.9;margin-top:8px}
    .container{max-width:1200px;margin:0 auto;padding:0}
    .stats{display:flex;flex-wrap:wrap;justify-content:center;gap:24px;padding:20px;background:#fff;margin:16px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05)}
    .stats div{text-align:center;min-width:100px}
    .stats .num{font-size:2rem;font-weight:700;color:var(--primary);margin-bottom:4px}
    .stats .label{font-size:0.85rem;color:#666;font-weight:500}
    .filters{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;align-items:center;margin:20px auto;padding:20px;background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);max-width:1000px}
    .filters label{font-size:0.9rem;font-weight:500;color:#555;display:flex;align-items:center;gap:8px}
    .filters select{padding:8px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;font-size:14px;min-width:120px;transition:border-color 0.2s}
    .filters select:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(46,111,163,0.1)}
    .search-container{flex:1;min-width:280px;max-width:400px}
    .search-container input{width:100%;padding:12px 16px;border:1px solid #ddd;border-radius:8px;font-size:14px;transition:all 0.2s}
    .search-container input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(46,111,163,0.1)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;padding:12px}
    .card{background:#fff;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.1);position:relative;overflow:hidden}
    .badge{position:absolute;top:8px;right:8px;padding:4px 6px;border-radius:4px;color:#fff;font-size:0.75rem}
    .badge-sale{background:var(--accent)}.badge-good{background:var(--primary)}.badge-great{background:#ffb300}.badge-huge{background:#ff6d00}.badge-free{background:var(--dark)}
    .winter-indicator{position:absolute;top:8px;left:8px;width:20px;height:20px;z-index:3}
    .winter-indicator img{width:100%;height:100%;object-fit:contain}
    .content{padding:10px}
    .logo{height:48px;width:auto;max-width:120px;object-fit:contain;vertical-align:middle;margin-right:8px;margin-bottom:8px}
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
    @media (max-width:768px){
      .grid{grid-template-columns:1fr}
      .header h1{flex-direction:column;font-size:1.5rem}
      .quote-counter{right:10px;font-size:14px;padding:12px 16px}
      .filters{margin:16px;padding:16px;flex-direction:column;align-items:stretch}
      .filters label{margin-bottom:8px}
      .search-container{min-width:unset;max-width:unset}
      .stats{margin:16px;gap:16px}
      .stats .num{font-size:1.6rem}
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><img src="Logo.png" alt="Sturgeon Tire" class="company-logo" onerror="this.style.display='none'">Sturgeon Tire Live Deals</h1>
      <div class="update-time">Updated: ${new Date().toLocaleString()}</div>
    </div>
    
    <div class="stats">
      <div><div class="num">${items.length}</div><div class="label">Deals</div></div>
      <div><div class="num">${items.filter(i => i.disc >= 50).length}</div><div class="label">50%+ Off</div></div>
      <div><div class="num">${Math.round(items.reduce((sum, i) => sum + i.save, 0) / items.length)}</div><div class="label">Avg Savings</div></div>
    </div>
    
    <div class="filters">
      <div class="search-container">
        <input type="text" id="search-bar" placeholder="🔍 Search by brand, model, size, winter, or item...">
      </div>
      <label>Manufacturer: <select id="filter-manufacturer"><option value="">All</option>${manufacturers.map(m => `<option value="${m}">${m}</option>`).join('')}</select></label>
      <label>Min Discount: <select id="filter-discount"><option value="0">0%</option><option value="20">20%</option><option value="40">40%</option></select></label>
    </div>
    
    <div class="grid" id="card-container"></div>
    
    <div class="footer"><a href="tel:+12049355559">Call (204) 935-5559</a><a href="mailto:nileshn@sturgeontire.com">Get Quote</a></div>
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
    const items = ${JSON.stringify(items, null, 2)};
    let quoteItems = [];

    function renderCard(i) {
      const badgeType = i.disc >= 99 ? 'free' : i.disc >= 40 ? 'huge' : i.disc >= 30 ? 'great' : i.disc >= 20 ? 'good' : 'sale';
      const priceHtml = i.disc >= 99 
        ? '<span class="free-price">FREE</span><span class="orig-price">

    function render() {
      const searchTerm = document.getElementById('search-bar').value.toLowerCase();
      const mf = document.getElementById('filter-manufacturer').value;
      const md = parseInt(document.getElementById('filter-discount').value);
      
      const filtered = items.filter(i => {
        // Search across multiple fields including winter tire status
        const searchableText = [
          i.manufacturer,
          i.model,
          i.item,
          i.tireSize || '',
          i.sizeStripped || '',
          i.tireType || '',
          i.isWinterTire ? 'winter' : ''
        ].join(' ').toLowerCase();
        
        const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
        const matchesManufacturer = !mf || i.manufacturer === mf;
        const matchesDiscount = i.disc >= md;
        
        return matchesSearch && matchesManufacturer && matchesDiscount;
      });
      
      document.getElementById('card-container').innerHTML = filtered.slice(0, 50).map(renderCard).join('');
      
      // Update stats for filtered results
      updateFilteredStats(filtered);
    }

    function updateFilteredStats(filtered) {
      const totalDeals = document.querySelector('.stats .num');
      if (totalDeals && filtered.length !== items.length) {
        totalDeals.textContent = filtered.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Filtered Deals';
      } else if (totalDeals) {
        totalDeals.textContent = items.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Deals';
      }
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
      showNotification('✓ Added to quote!');
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
        const maxQty = quoteItems[itemIndex].stock;
        quoteItems[itemIndex].quantity = Math.min(Math.max(qty, 1), maxQty);
        updateQuoteModal();
      }
    }

    function updateQuoteCounter() {
      const counter = document.getElementById('quote-counter');
      const count = document.getElementById('quote-count');
      if (quoteItems.length > 0) {
        counter.style.display = 'block';
        counter.classList.add('pulse');
        setTimeout(() => counter.classList.remove('pulse'), 600);
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
        html += '<div class="quote-item">' +
          '<div><strong>' + item.manufacturer + ' ' + item.model + '</strong><br>Item: ' + item.item + ' • $' + item.sale + ' each</div>' +
          '<div class="quantity-controls">' +
          '<button class="qty-btn" onclick="updateQuantity(\'' + item.item + '\', ' + (item.quantity - 1) + ')">−</button>' +
          '<input type="number" class="qty-input" min="1" max="' + item.stock + '" value="' + item.quantity + '" onchange="updateQuantity(\'' + item.item + '\', this.value)">' +
          '<button class="qty-btn" onclick="updateQuantity(\'' + item.item + '\', ' + (item.quantity + 1) + ')">+</button>' +
          '<small style="margin-left:8px">/ ' + item.stock + '</small>' +
          '<button class="remove-item" onclick="removeFromQuote(\'' + item.item + '\')">×</button>' +
          '</div></div>';
      });
      container.innerHTML = html;
    }

    function showNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 400);
      }, 3000);
    }

    function showSuccessNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification success-notification';
      notification.innerHTML = '<div style="position:relative;z-index:1">' + message + '</div>';
      document.body.appendChild(notification);
      
      setTimeout(() => notification.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 500);
      }, 4000);
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
          submitBtn.innerHTML = '🎉 Quote Sent Successfully!';
          submitBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
          showSuccessNotification('🎉 Quote sent successfully! We will contact you soon with pricing and availability.');
          setTimeout(() => {
            quoteItems = [];
            updateQuoteCounter();
            closeQuoteModal();
            submitBtn.innerHTML = 'Request Quote';
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 3000);
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

    document.getElementById('search-bar').addEventListener('input', render);
    document.getElementById('filter-manufacturer').addEventListener('change', render);
    document.getElementById('filter-discount').addEventListener('change', render);
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('quote-modal');
      if (event.target === modal) {
        closeQuoteModal();
      }
    });
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
    
    console.log('✅ Website updated successfully with enhanced features!');
    console.log(`📈 ${items.length} deals processed`);
    console.log('🎯 Features included: search, filters, quote system, responsive design');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main(); + i.reg + '</span>' 
        : '<span class="sale-price">

    function render() {
      const searchTerm = document.getElementById('search-bar').value.toLowerCase();
      const mf = document.getElementById('filter-manufacturer').value;
      const md = parseInt(document.getElementById('filter-discount').value);
      
      const filtered = items.filter(i => {
        // Search across multiple fields including winter tire status
        const searchableText = [
          i.manufacturer,
          i.model,
          i.item,
          i.tireSize || '',
          i.sizeStripped || '',
          i.tireType || '',
          i.isWinterTire ? 'winter' : ''
        ].join(' ').toLowerCase();
        
        const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
        const matchesManufacturer = !mf || i.manufacturer === mf;
        const matchesDiscount = i.disc >= md;
        
        return matchesSearch && matchesManufacturer && matchesDiscount;
      });
      
      document.getElementById('card-container').innerHTML = filtered.slice(0, 50).map(renderCard).join('');
      
      // Update stats for filtered results
      updateFilteredStats(filtered);
    }

    function updateFilteredStats(filtered) {
      const totalDeals = document.querySelector('.stats .num');
      if (totalDeals && filtered.length !== items.length) {
        totalDeals.textContent = filtered.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Filtered Deals';
      } else if (totalDeals) {
        totalDeals.textContent = items.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Deals';
      }
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
      showNotification('✓ Added to quote!');
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
        const maxQty = quoteItems[itemIndex].stock;
        quoteItems[itemIndex].quantity = Math.min(Math.max(qty, 1), maxQty);
        updateQuoteModal();
      }
    }

    function updateQuoteCounter() {
      const counter = document.getElementById('quote-counter');
      const count = document.getElementById('quote-count');
      if (quoteItems.length > 0) {
        counter.style.display = 'block';
        counter.classList.add('pulse');
        setTimeout(() => counter.classList.remove('pulse'), 600);
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
        html += '<div class="quote-item">' +
          '<div><strong>' + item.manufacturer + ' ' + item.model + '</strong><br>Item: ' + item.item + ' • $' + item.sale + ' each</div>' +
          '<div class="quantity-controls">' +
          '<button class="qty-btn" onclick="updateQuantity(\\'\\'' + item.item + '\\'\\'', ' + (item.quantity - 1) + ')">−</button>' +
          '<input type="number" class="qty-input" min="1" max="' + item.stock + '" value="' + item.quantity + '" onchange="updateQuantity(\\'\\'' + item.item + '\\'\\'', this.value)">' +
          '<button class="qty-btn" onclick="updateQuantity(\\'\\'' + item.item + '\\'\\'', ' + (item.quantity + 1) + ')">+</button>' +
          '<small style="margin-left:8px">/ ' + item.stock + '</small>' +
          '<button class="remove-item" onclick="removeFromQuote(\\'\\'' + item.item + '\\'\\'')">×</button>' +
          '</div></div>';
      });
      container.innerHTML = html;
    }

    function showNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 400);
      }, 3000);
    }

    function showSuccessNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification success-notification';
      notification.innerHTML = '<div style="position:relative;z-index:1">' + message + '</div>';
      document.body.appendChild(notification);
      
      setTimeout(() => notification.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 500);
      }, 4000);
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
          submitBtn.innerHTML = '🎉 Quote Sent Successfully!';
          submitBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
          showSuccessNotification('🎉 Quote sent successfully! We will contact you soon with pricing and availability.');
          setTimeout(() => {
            quoteItems = [];
            updateQuoteCounter();
            closeQuoteModal();
            submitBtn.innerHTML = 'Request Quote';
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 3000);
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

    document.getElementById('search-bar').addEventListener('input', render);
    document.getElementById('filter-manufacturer').addEventListener('change', render);
    document.getElementById('filter-discount').addEventListener('change', render);
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('quote-modal');
      if (event.target === modal) {
        closeQuoteModal();
      }
    });
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
    
    console.log('✅ Website updated successfully with enhanced features!');
    console.log(`📈 ${items.length} deals processed`);
    console.log('🎯 Features included: search, filters, quote system, responsive design');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main(); + i.sale + '</span><span class="orig-price">

    function render() {
      const searchTerm = document.getElementById('search-bar').value.toLowerCase();
      const mf = document.getElementById('filter-manufacturer').value;
      const md = parseInt(document.getElementById('filter-discount').value);
      
      const filtered = items.filter(i => {
        // Search across multiple fields including winter tire status
        const searchableText = [
          i.manufacturer,
          i.model,
          i.item,
          i.tireSize || '',
          i.sizeStripped || '',
          i.tireType || '',
          i.isWinterTire ? 'winter' : ''
        ].join(' ').toLowerCase();
        
        const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
        const matchesManufacturer = !mf || i.manufacturer === mf;
        const matchesDiscount = i.disc >= md;
        
        return matchesSearch && matchesManufacturer && matchesDiscount;
      });
      
      document.getElementById('card-container').innerHTML = filtered.slice(0, 50).map(renderCard).join('');
      
      // Update stats for filtered results
      updateFilteredStats(filtered);
    }

    function updateFilteredStats(filtered) {
      const totalDeals = document.querySelector('.stats .num');
      if (totalDeals && filtered.length !== items.length) {
        totalDeals.textContent = filtered.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Filtered Deals';
      } else if (totalDeals) {
        totalDeals.textContent = items.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Deals';
      }
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
      showNotification('✓ Added to quote!');
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
        const maxQty = quoteItems[itemIndex].stock;
        quoteItems[itemIndex].quantity = Math.min(Math.max(qty, 1), maxQty);
        updateQuoteModal();
      }
    }

    function updateQuoteCounter() {
      const counter = document.getElementById('quote-counter');
      const count = document.getElementById('quote-count');
      if (quoteItems.length > 0) {
        counter.style.display = 'block';
        counter.classList.add('pulse');
        setTimeout(() => counter.classList.remove('pulse'), 600);
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
        html += '<div class="quote-item">' +
          '<div><strong>' + item.manufacturer + ' ' + item.model + '</strong><br>Item: ' + item.item + ' • $' + item.sale + ' each</div>' +
          '<div class="quantity-controls">' +
          '<button class="qty-btn" onclick="updateQuantity(\\'\\'' + item.item + '\\'\\'', ' + (item.quantity - 1) + ')">−</button>' +
          '<input type="number" class="qty-input" min="1" max="' + item.stock + '" value="' + item.quantity + '" onchange="updateQuantity(\\'\\'' + item.item + '\\'\\'', this.value)">' +
          '<button class="qty-btn" onclick="updateQuantity(\\'\\'' + item.item + '\\'\\'', ' + (item.quantity + 1) + ')">+</button>' +
          '<small style="margin-left:8px">/ ' + item.stock + '</small>' +
          '<button class="remove-item" onclick="removeFromQuote(\\'\\'' + item.item + '\\'\\'')">×</button>' +
          '</div></div>';
      });
      container.innerHTML = html;
    }

    function showNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 400);
      }, 3000);
    }

    function showSuccessNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification success-notification';
      notification.innerHTML = '<div style="position:relative;z-index:1">' + message + '</div>';
      document.body.appendChild(notification);
      
      setTimeout(() => notification.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 500);
      }, 4000);
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
          submitBtn.innerHTML = '🎉 Quote Sent Successfully!';
          submitBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
          showSuccessNotification('🎉 Quote sent successfully! We will contact you soon with pricing and availability.');
          setTimeout(() => {
            quoteItems = [];
            updateQuoteCounter();
            closeQuoteModal();
            submitBtn.innerHTML = 'Request Quote';
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 3000);
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

    document.getElementById('search-bar').addEventListener('input', render);
    document.getElementById('filter-manufacturer').addEventListener('change', render);
    document.getElementById('filter-discount').addEventListener('change', render);
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('quote-modal');
      if (event.target === modal) {
        closeQuoteModal();
      }
    });
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
    
    console.log('✅ Website updated successfully with enhanced features!');
    console.log(`📈 ${items.length} deals processed`);
    console.log('🎯 Features included: search, filters, quote system, responsive design');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main(); + i.reg + '</span>';
      const stockClass = i.stock <= 5 ? 'low' : i.stock <= 15 ? 'medium' : i.stock <= 50 ? 'good' : 'excellent';
      
      // Build details line with available info
      let details = 'Item: ' + i.item;
      if (i.tireSize) details += ' • Size: ' + i.tireSize;
      if (i.tireType) details += ' • ' + i.tireType;
      
      return '<div class="card" data-manufacturer="' + i.manufacturer + '">' +
        '<div class="badge badge-' + badgeType + '">' + i.disc + '% OFF</div>' +
        '<div class="content">' + 
        (i.logo ? '<img src="' + i.logo + '" class="logo" alt="' + i.manufacturer + '">' : '') +
        '<div class="title">' + i.model + '</div>' +
        '<div class="details">' + details + '</div>' +
        '<div class="pricing">' + priceHtml + '</div>' +
        '<div class="save">Save 

    function render() {
      const searchTerm = document.getElementById('search-bar').value.toLowerCase();
      const mf = document.getElementById('filter-manufacturer').value;
      const md = parseInt(document.getElementById('filter-discount').value);
      
      const filtered = items.filter(i => {
        // Search across multiple fields including winter tire status
        const searchableText = [
          i.manufacturer,
          i.model,
          i.item,
          i.tireSize || '',
          i.sizeStripped || '',
          i.tireType || '',
          i.isWinterTire ? 'winter' : ''
        ].join(' ').toLowerCase();
        
        const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
        const matchesManufacturer = !mf || i.manufacturer === mf;
        const matchesDiscount = i.disc >= md;
        
        return matchesSearch && matchesManufacturer && matchesDiscount;
      });
      
      document.getElementById('card-container').innerHTML = filtered.slice(0, 50).map(renderCard).join('');
      
      // Update stats for filtered results
      updateFilteredStats(filtered);
    }

    function updateFilteredStats(filtered) {
      const totalDeals = document.querySelector('.stats .num');
      if (totalDeals && filtered.length !== items.length) {
        totalDeals.textContent = filtered.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Filtered Deals';
      } else if (totalDeals) {
        totalDeals.textContent = items.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Deals';
      }
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
      showNotification('✓ Added to quote!');
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
        const maxQty = quoteItems[itemIndex].stock;
        quoteItems[itemIndex].quantity = Math.min(Math.max(qty, 1), maxQty);
        updateQuoteModal();
      }
    }

    function updateQuoteCounter() {
      const counter = document.getElementById('quote-counter');
      const count = document.getElementById('quote-count');
      if (quoteItems.length > 0) {
        counter.style.display = 'block';
        counter.classList.add('pulse');
        setTimeout(() => counter.classList.remove('pulse'), 600);
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
        html += '<div class="quote-item">' +
          '<div><strong>' + item.manufacturer + ' ' + item.model + '</strong><br>Item: ' + item.item + ' • $' + item.sale + ' each</div>' +
          '<div class="quantity-controls">' +
          '<button class="qty-btn" onclick="updateQuantity(\\'\\'' + item.item + '\\'\\'', ' + (item.quantity - 1) + ')">−</button>' +
          '<input type="number" class="qty-input" min="1" max="' + item.stock + '" value="' + item.quantity + '" onchange="updateQuantity(\\'\\'' + item.item + '\\'\\'', this.value)">' +
          '<button class="qty-btn" onclick="updateQuantity(\\'\\'' + item.item + '\\'\\'', ' + (item.quantity + 1) + ')">+</button>' +
          '<small style="margin-left:8px">/ ' + item.stock + '</small>' +
          '<button class="remove-item" onclick="removeFromQuote(\\'\\'' + item.item + '\\'\\'')">×</button>' +
          '</div></div>';
      });
      container.innerHTML = html;
    }

    function showNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 400);
      }, 3000);
    }

    function showSuccessNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification success-notification';
      notification.innerHTML = '<div style="position:relative;z-index:1">' + message + '</div>';
      document.body.appendChild(notification);
      
      setTimeout(() => notification.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 500);
      }, 4000);
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
          submitBtn.innerHTML = '🎉 Quote Sent Successfully!';
          submitBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
          showSuccessNotification('🎉 Quote sent successfully! We will contact you soon with pricing and availability.');
          setTimeout(() => {
            quoteItems = [];
            updateQuoteCounter();
            closeQuoteModal();
            submitBtn.innerHTML = 'Request Quote';
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 3000);
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

    document.getElementById('search-bar').addEventListener('input', render);
    document.getElementById('filter-manufacturer').addEventListener('change', render);
    document.getElementById('filter-discount').addEventListener('change', render);
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('quote-modal');
      if (event.target === modal) {
        closeQuoteModal();
      }
    });
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
    
    console.log('✅ Website updated successfully with enhanced features!');
    console.log(`📈 ${items.length} deals processed`);
    console.log('🎯 Features included: search, filters, quote system, responsive design');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main(); + i.save + '</div>' +
        '<div class="stock stock-' + stockClass + '">Qty: ' + i.stock + '</div>' +
        '<button class="btn-add-quote" onclick="addToQuote(\\'' + i.item + '\\')">Add to Quote</button>' +
        '</div></div>';
    }

    function render() {
      const searchTerm = document.getElementById('search-bar').value.toLowerCase();
      const mf = document.getElementById('filter-manufacturer').value;
      const md = parseInt(document.getElementById('filter-discount').value);
      
      const filtered = items.filter(i => {
        // Search across multiple fields including winter tire status
        const searchableText = [
          i.manufacturer,
          i.model,
          i.item,
          i.tireSize || '',
          i.sizeStripped || '',
          i.tireType || '',
          i.isWinterTire ? 'winter' : ''
        ].join(' ').toLowerCase();
        
        const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
        const matchesManufacturer = !mf || i.manufacturer === mf;
        const matchesDiscount = i.disc >= md;
        
        return matchesSearch && matchesManufacturer && matchesDiscount;
      });
      
      document.getElementById('card-container').innerHTML = filtered.slice(0, 50).map(renderCard).join('');
      
      // Update stats for filtered results
      updateFilteredStats(filtered);
    }

    function updateFilteredStats(filtered) {
      const totalDeals = document.querySelector('.stats .num');
      if (totalDeals && filtered.length !== items.length) {
        totalDeals.textContent = filtered.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Filtered Deals';
      } else if (totalDeals) {
        totalDeals.textContent = items.length;
        totalDeals.parentElement.querySelector('.label').textContent = 'Deals';
      }
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
      showNotification('✓ Added to quote!');
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
        const maxQty = quoteItems[itemIndex].stock;
        quoteItems[itemIndex].quantity = Math.min(Math.max(qty, 1), maxQty);
        updateQuoteModal();
      }
    }

    function updateQuoteCounter() {
      const counter = document.getElementById('quote-counter');
      const count = document.getElementById('quote-count');
      if (quoteItems.length > 0) {
        counter.style.display = 'block';
        counter.classList.add('pulse');
        setTimeout(() => counter.classList.remove('pulse'), 600);
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
        html += '<div class="quote-item">' +
          '<div><strong>' + item.manufacturer + ' ' + item.model + '</strong><br>Item: ' + item.item + ' • $' + item.sale + ' each</div>' +
          '<div class="quantity-controls">' +
          '<button class="qty-btn" onclick="updateQuantity(\\'\\'' + item.item + '\\'\\'', ' + (item.quantity - 1) + ')">−</button>' +
          '<input type="number" class="qty-input" min="1" max="' + item.stock + '" value="' + item.quantity + '" onchange="updateQuantity(\\'\\'' + item.item + '\\'\\'', this.value)">' +
          '<button class="qty-btn" onclick="updateQuantity(\\'\\'' + item.item + '\\'\\'', ' + (item.quantity + 1) + ')">+</button>' +
          '<small style="margin-left:8px">/ ' + item.stock + '</small>' +
          '<button class="remove-item" onclick="removeFromQuote(\\'\\'' + item.item + '\\'\\'')">×</button>' +
          '</div></div>';
      });
      container.innerHTML = html;
    }

    function showNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 400);
      }, 3000);
    }

    function showSuccessNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification success-notification';
      notification.innerHTML = '<div style="position:relative;z-index:1">' + message + '</div>';
      document.body.appendChild(notification);
      
      setTimeout(() => notification.style.transform = 'translateX(0)', 100);
      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 500);
      }, 4000);
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
          submitBtn.innerHTML = '🎉 Quote Sent Successfully!';
          submitBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
          showSuccessNotification('🎉 Quote sent successfully! We will contact you soon with pricing and availability.');
          setTimeout(() => {
            quoteItems = [];
            updateQuoteCounter();
            closeQuoteModal();
            submitBtn.innerHTML = 'Request Quote';
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 3000);
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

    document.getElementById('search-bar').addEventListener('input', render);
    document.getElementById('filter-manufacturer').addEventListener('change', render);
    document.getElementById('filter-discount').addEventListener('change', render);
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('quote-modal');
      if (event.target === modal) {
        closeQuoteModal();
      }
    });
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
    
    console.log('✅ Website updated successfully with enhanced features!');
    console.log(`📈 ${items.length} deals processed`);
    console.log('🎯 Features included: search, filters, quote system, responsive design');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
