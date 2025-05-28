const fs = require('fs');
const path = require('path');

// Read the single CSV file from repo root
function readLocalCSV() {
  const csvPath = path.join(process.cwd(), 'flyer_data.csv');
  try {
    console.log(`✅ Reading flyer_data.csv`);
    return fs.readFileSync(csvPath, 'utf8');
  } catch (err) {
    throw new Error('Could not read flyer_data.csv: ' + err.message);
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

  console.log(`✅ Parsed ${headers.length} headers`);

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
    });

    // Sort by discount (highest first)
    items.sort((a, b) => b.disc - a.disc);

    // Get unique manufacturers for filter
    const manufacturers = Array.from(new Set(items.map(i => i.manufacturer))).sort();
    
    console.log(`✅ Processing ${items.length} items from ${manufacturers.length} manufacturers`);
    console.log(`📊 Manufacturers: ${manufacturers.join(', ')}`);

    // Build HTML with all requested changes
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sturgeon Tire Live Deals</title>
  <style>
    :root { --primary:#2e6fa3; --dark:#182742; --bg:#f0f8ff; --accent:#ffa726; }
    body { margin:0; font-family:'Segoe UI',sans-serif; background:var(--bg); }
    .header { 
      background:var(--primary); 
      color:#fff; 
      padding:16px; 
      text-align:center; 
      position:relative;
    }
    .header h1 { 
      margin:0; 
      font-size:1.6rem; 
      display:flex; 
      align-items:center; 
      justify-content:center; 
      gap:12px;
    }
    .header .company-logo {
      height:40px;
      width:auto;
    }
    .update-time {
      position:absolute;
      top:8px;
      right:12px;
      font-size:0.7rem;
      opacity:0.8;
      color:#fff;
    }
    .stats { display:flex; flex-wrap:wrap; justify-content:center; gap:20px; padding:12px; background:#fff; margin:12px 0; border-radius:8px; }
    .stats div { text-align:center; min-width:80px; }
    .stats .num { font-size:1.4rem; font-weight:bold; color:var(--primary); }
    .stats .label { font-size:0.8rem; color:#666; }
    .filters { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; margin:12px; }
    .filters label { font-size:0.9rem; }
    .filters select { padding:4px; border-radius:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px; padding:12px; }
    @media (max-width:768px) { 
      .grid { grid-template-columns:1fr; }
      .update-time { position:static; text-align:center; margin-top:8px; }
      .header h1 { flex-direction:column; }
    }
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
    
    /* Quote System Styles */
    .card-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    
    .btn-add-quote {
      flex: 1;
      background: #27ae60;
      color: white;
      border: none;
      padding: 12px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
      transition: background 0.3s;
    }
    
    .btn-add-quote:hover {
      background: #229954;
    }
    
    .quote-counter {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #e74c3c;
      color: white;
      padding: 12px 16px;
      border-radius: 25px;
      cursor: pointer;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 1000;
      display: none;
    }
    
    .quote-counter:hover {
      background: #c0392b;
    }
    
    .quote-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 2000;
    }
    
    .quote-modal-content {
      background: white;
      margin: 5% auto;
      padding: 20px;
      width: 90%;
      max-width: 600px;
      border-radius: 8px;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    .quote-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .quote-item:last-child {
      border-bottom: none;
    }
    
    .remove-item {
      background: #e74c3c;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .quote-form {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #eee;
    }
    
    .quote-form input, .quote-form textarea {
      width: 100%;
      padding: 8px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }
    
    .quote-form textarea {
      height: 60px;
      resize: vertical;
    }
    
    .submit-quote {
      background: #27ae60;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 16px;
      width: 100%;
    }
    
    .submit-quote:hover {
      background: #229954;
    }
    
    .close-modal {
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
      color: #aaa;
    }
    
    .close-modal:hover {
      color: #000;
    }
    
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #27ae60;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 3000;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="update-time">Updated: ${new Date().toLocaleString()}</div>
    <h1>
      <img src="Logo.png" alt="Sturgeon Tire" class="company-logo" onerror="this.style.display='none'">
      Sturgeon Tire Live Deals
    </h1>
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
  
  <!-- Quote System -->
  <div class="quote-counter" id="quote-counter" onclick="openQuoteModal()">
    Quote (<span id="quote-count">0</span>)
  </div>
  
  <div class="quote-modal" id="quote-modal">
    <div class="quote-modal-content">
      <span class="close-modal" onclick="closeQuoteModal()">&times;</span>
      <h2>Request Quote</h2>
      <div id="quote-items"></div>
      
      <div class="quote-form">
        <h3>Your Information</h3>
        <input type="text" id="customer-name" placeholder="Your Name *" required>
        <input type="email" id="customer-email" placeholder="Email Address *" required>
        <input type="tel" id="customer-phone" placeholder="Phone Number">
        <input type="text" id="customer-company" placeholder="Company Name">
        <textarea id="customer-notes" placeholder="Additional notes or questions..."></textarea>
        <button class="submit-quote" onclick="submitQuote()">Request Quote</button>
      </div>
    </div>
  </div>
  
  <script>
    const items = ${JSON.stringify(items, null, 2)};
    let currentPage = 1, pageSize = 20;
    let quoteItems = [];

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
        + '<div class="card-actions">'
        + '<button class="btn-add-quote" onclick="addToQuote(' + "'" + i.item + "'" + ')">Add to Quote</button>'
        + '</div>'
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

    // Quote System Functions
    function addToQuote(itemCode) {
      const item = items.find(i => i.item === itemCode);
      if (!item) return;
      
      // Check if item already in quote
      const existingIndex = quoteItems.findIndex(q => q.item === item.item);
      
      if (existingIndex >= 0) {
        // Increase quantity
        quoteItems[existingIndex].quantity += 1;
      } else {
        // Add new item
        quoteItems.push({
          ...item,
          quantity: 1
        });
      }
      
      updateQuoteCounter();
      showNotification('Added to quote!');
    }

    function removeFromQuote(itemCode) {
      quoteItems = quoteItems.filter(item => item.item !== itemCode);
      updateQuoteCounter();
      updateQuoteModal();
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
        container.innerHTML = '<p>No items in quote yet. Browse our deals and click "Add to Quote"!</p>';
        return;
      }
      
      let html = '<h3>Items in Quote:</h3>';
      let totalSavings = 0;
      
      quoteItems.forEach(item => {
        totalSavings += item.save * item.quantity;
        html += '<div class="quote-item">'
          + '<div>'
          + '<strong>' + item.manufacturer + ' ' + item.model + '</strong><br>'
          + 'Item: ' + item.item + ' • Qty: ' + item.quantity + '<br>'
          + '<small>$' + item.sale + ' each (save $' + item.save + ' per tire)</small>'
          + '</div>'
          + '<button class="remove-item" onclick="removeFromQuote(\\''+item.item+'\\')">Remove</button>'
          + '</div>';
      });
      
      html += '<div style="margin-top:15px; padding:10px; background:#f8f9fa; border-radius:4px;">'
        + '<strong>Total Savings: $' + totalSavings + '</strong>'
        + '</div>';
      
      container.innerHTML = html;
    }

    function submitQuote() {
      const name = document.getElementById('customer-name').value;
      const email = document.getElementById('customer-email').value;
      const phone = document.getElementById('customer-phone').value;
      const company = document.getElementById('customer-company').value;
      const notes = document.getElementById('customer-notes').value;
      
      if (!name || !email) {
        alert('Please fill in your name and email address.');
        return;
      }
      
      // Build tire summary for the "Requested Tires" field
      let tiresSummary = '';
      let totalSavings = 0;
      let totalValue = 0;
      
      quoteItems.forEach((item, index) => {
        totalSavings += item.save * item.quantity;
        totalValue += item.sale * item.quantity;
        
        tiresSummary += \`\${index + 1}. \${item.manufacturer} \${item.model}\\n\`;
        tiresSummary += \`   Item: \${item.item} | Qty: \${item.quantity} | $\${item.sale} each\\n\`;
        tiresSummary += \`   You Save: $\${item.save} per tire | Stock: \${item.stock}\\n\\n\`;
      });
      
      tiresSummary += \`💰 TOTAL: $\${totalValue.toFixed(2)} (Save $\${totalSavings})\\n\`;
      tiresSummary += \`📅 Quote Generated: \${new Date().toLocaleString()}\`;
      
      // Build additional notes section
      let additionalNotes = '🚨 URGENT QUOTE REQUEST\\n\\n';
      additionalNotes += '📞 Expected Response: Within 2 hours\\n';
      additionalNotes += '🌐 Source: Sturgeon Tire Website\\n\\n';
      if (notes) {
        additionalNotes += '💬 Customer Notes:\\n' + notes + '\\n\\n';
      }
      additionalNotes += '⚡ Priority: High (Online lead ready to purchase)';
      
      // Microsoft Forms URL
      const formUrl = 'https://forms.microsoft.com/Pages/ResponsePage.aspx?id=eM04piGZL0isZNcn1SSs5ch5YkMaJNtDm1ZUYFnG3m9UMzcxRjM1Q09RT1lZQjFZUFlUMDJTMUdPQS4u';
      
      // Try to copy tires summary to clipboard
      const tempTires = document.createElement('textarea');
      tempTires.value = tiresSummary;
      document.body.appendChild(tempTires);
      
      try {
        // Copy tires summary to clipboard
        tempTires.select();
        document.execCommand('copy');
        document.body.removeChild(tempTires);
        
        // Open the form
        const formWindow = window.open(formUrl, 'TireQuoteForm', 'width=900,height=800,scrollbars=yes,resizable=yes');
        
        if (formWindow) {
          // Show detailed instructions matching your form fields
          const instructions = \`✅ Quote copied to clipboard!\\n\\n📝 FORM INSTRUCTIONS:\\n\\n\` +
            \`1. Customer Name: \${name}\\n\` +
            \`2. Email Address: \${email}\\n\` +
            \`3. Phone Number: \${phone || '(leave blank)'}\\n\` +
            \`4. Company Name: \${company || '(leave blank)'}\\n\` +
            \`5. Requested Tires: PASTE HERE (Ctrl+V)\\n\` +
            \`6. Additional Notes: Copy this text:\\n\\n\${additionalNotes}\\n\\n\` +
            \`💡 The tire details are already copied - just paste into "Requested Tires"!\\n\\n\` +
            \`📞 We'll contact you within 2 hours!\`;
          
          alert(instructions);
          
          // Clear quote after successful submission
          quoteItems = [];
          updateQuoteCounter();
          closeQuoteModal();
          showNotification('Form opened! Follow the instructions to complete your quote.');
          
        } else {
          // Popup blocked - show fallback options
          showQuoteFallbackOptions(name, email, phone, company, tiresSummary, additionalNotes, totalValue);
        }
        
      } catch (err) {
        // Clipboard copy failed
        document.body.removeChild(tempTires);
        
        // Try to open form anyway
        const formWindow = window.open(formUrl, 'TireQuoteForm', 'width=900,height=800,scrollbars=yes,resizable=yes');
        
        if (formWindow) {
          alert(\`Microsoft Forms opened!\\n\\nPlease fill out:\\n1. Your contact info\\n2. Copy this for "Requested Tires":\\n\\n\${tiresSummary}\\n\\n3. Copy this for "Additional Notes":\\n\\n\${additionalNotes}\`);
          
          quoteItems = [];
          updateQuoteCounter();
          closeQuoteModal();
          
        } else {
          showQuoteFallbackOptions(name, email, phone, company, tiresSummary, additionalNotes, totalValue);
        }
      }
    }

    function showQuoteFallbackOptions(name, email, phone, company, tiresSummary, additionalNotes, totalValue) {
      const emailBody = \`NEW QUOTE REQUEST - Sturgeon Tire Website\\n\\n\` +
        \`Customer Name: \${name}\\n\` +
        \`Email Address: \${email}\\n\` +
        \`Phone Number: \${phone || 'Not provided'}\\n\` +
        \`Company Name: \${company || 'Not provided'}\\n\\n\` +
        \`REQUESTED TIRES:\\n\${tiresSummary}\\n\\n\` +
        \`ADDITIONAL NOTES:\\n\${additionalNotes}\`;
      
      const subject = '🚨 URGENT: Tire Quote Request - $' + totalValue.toFixed(0) + ' - ' + name;
      const mailtoLink = 'mailto:sales@sturgeontire.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(emailBody);
      
      // Show options modal with better instructions
      const optionsHtml = \`
        <div style="text-align:center; padding:20px;">
          <h3>⚠️ Form Popup Blocked</h3>
          <p>Choose how you'd like to send your quote request:</p>
          <div style="margin:20px 0;">
            <button onclick="openFormManually()" 
                    style="background:#27ae60; color:white; padding:12px 20px; border:none; border-radius:6px; margin:10px; cursor:pointer; font-weight:bold; display:block; width:100%;">
              📝 Open Microsoft Form
            </button>
            <button onclick="window.location.href='\${mailtoLink}'" 
                    style="background:#3498db; color:white; padding:12px 20px; border:none; border-radius:6px; margin:10px; cursor:pointer; font-weight:bold; display:block; width:100%;">
              📧 Send via Email Instead
            </button>
            <button onclick="copyQuoteData()" 
                    style="background:#f39c12; color:white; padding:12px 20px; border:none; border-radius:6px; margin:10px; cursor:pointer; font-weight:bold; display:block; width:100%;">
              📋 Copy Quote Data
            </button>
          </div>
          <div style="font-size:12px; color:#666; text-align:left; background:#f8f9fa; padding:15px; border-radius:6px; margin:10px 0;">
            <strong>📝 Form Field Guide:</strong><br>
            • <strong>Customer Name:</strong> \${name}<br>
            • <strong>Email:</strong> \${email}<br>
            • <strong>Phone:</strong> \${phone || 'Leave blank'}<br>
            • <strong>Company:</strong> \${company || 'Leave blank'}<br>
            • <strong>Requested Tires:</strong> Paste tire details<br>
            • <strong>Additional Notes:</strong> Paste additional info
          </div>
        </div>
      \`;
      
      const container = document.getElementById('quote-items');
      container.innerHTML = optionsHtml;
      
      // Add helper functions to window scope
      window.openFormManually = function() {
        window.open('https://forms.microsoft.com/Pages/ResponsePage.aspx?id=eM04piGZL0isZNcn1SSs5ch5YkMaJNtDm1ZUYFnG3m9UMzcxRjM1Q09RT1lZQjFZUFlUMDJTMUdPQS4u', '_blank');
        alert(\`Form opened!\\n\\nFill out the form with:\\n\\n📋 REQUESTED TIRES:\\n\${tiresSummary}\\n\\n📝 ADDITIONAL NOTES:\\n\${additionalNotes}\`);
      };
      
      window.copyQuoteData = function() {
        const fullQuote = \`REQUESTED TIRES:\\n\${tiresSummary}\\n\\nADDITIONAL NOTES:\\n\${additionalNotes}\`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(fullQuote).then(() => {
            alert('✅ Quote data copied to clipboard!\\n\\nNow open the form and paste into the appropriate fields.');
          }).catch(() => {
            alert(\`Please copy this manually:\\n\\n\${fullQuote}\`);
          });
        } else {
          alert(\`Please copy this manually:\\n\\n\${fullQuote}\`);
        }
      };
    }

    function showNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
      const modal = document.getElementById('quote-modal');
      if (event.target === modal) {
        closeQuoteModal();
      }
    }

    // Initialize
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
