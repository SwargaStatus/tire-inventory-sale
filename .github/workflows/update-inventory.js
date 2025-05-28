const fs = require('fs');
const path = require('path');

// Read the single CSV file from repo root
function readLocalCSV() {
  const csvPath = path.join(process.cwd(), 'flyer_data.csv');
  try {
    console.log(`📊 Reading flyer_data.csv from: ${csvPath}`);
    return fs.readFileSync(csvPath, 'utf8');
  } catch (err) {
    console.error(`❌ Could not read flyer_data.csv: ${err.message}`);
    throw new Error('Could not read flyer_data.csv: ' + err.message);
  }
}

// Parse CSV text into array of objects
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) throw new Error('CSV file is empty');

  const parseLine = line => {
    const cols = [];
    let cur = '', inQuotes = false;
    for (let ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim().replace(/^"|"$/g, ''));
    return cols;
  };

  // Header row, stripping FlyerData[]
  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => {
    const m = h.match(/FlyerData\[(.+)\]$/);
    return m ? m[1] : h;
  });
  console.log(`📈 Parsed ${headers.length} headers`);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length !== headers.length) continue;
    const obj = {};
    headers.forEach((k, j) => obj[k] = vals[j] || '');
    const stock = parseInt(obj['AvailableQuantity'], 10) || 0;
    if (stock > 0) rows.push(obj);
  }
  console.log(`✅ Found ${rows.length} items with stock > 0`);
  return rows;
}

function generateHTML(items) {
  const manufacturers = Array.from(new Set(items.map(i => i.manufacturer))).sort();
  console.log(`🏭 Processing ${items.length} items from ${manufacturers.length} manufacturers`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sturgeon Tire Live Deals</title>
  <style>
    :root { --primary:#2e6fa3; --dark:#182742; --bg:#f0f8ff; --accent:#ffa726; }
    body { margin:0; font-family:'Segoe UI',sans-serif; background:var(--bg); }
    .header { background:var(--primary); color:#fff; padding:16px; text-align:center; position:relative; }
    .header h1 { margin:0; font-size:1.6rem; display:flex; align-items:center; justify-content:center; gap:12px; }
    .company-logo { height:40px; width:auto; }
    .update-time { position:absolute; top:8px; right:12px; font-size:0.7rem; opacity:0.8; color:#fff; }
    .stats { display:flex; flex-wrap:wrap; justify-content:center; gap:20px; padding:12px; background:#fff; margin:12px 0; border-radius:8px; }
    .stats div { text-align:center; min-width:80px; }
    .num { font-size:1.4rem; font-weight:bold; color:var(--primary); }
    .label { font-size:0.8rem; color:#666; }
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
    .details { font-size:0.85rem; color:#555; margin-bottom:6px; }
    .stock { font-size:0.8rem; padding:3px 6px; border-radius:4px; display:inline-block; margin-bottom:6px; }
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
    .card-actions { display:flex; gap:8px; margin-top:12px; }
    .btn-add-quote { flex:1; background:#27ae60; color:white; border:none; padding:12px 16px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px; transition:background 0.3s; }
    .btn-add-quote:hover { background:#229954; }
    .quote-counter { position:fixed; bottom:20px; right:20px; background:#e74c3c; color:white; padding:12px 16px; border-radius:25px; cursor:pointer; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,0.2); z-index:1000; display:none; }
    .quote-counter:hover { background:#c0392b; }
    .quote-modal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2000; }
    .quote-modal-content { background:white; margin:5% auto; padding:20px; width:90%; max-width:600px; border-radius:8px; max-height:80vh; overflow-y:auto; }
    .quote-item { display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #eee; }
    .quote-item:last-child { border-bottom:none; }
    .quantity-controls { display:flex; align-items:center; gap:8px; }
    .quantity-controls button { background:#3498db; color:white; border:none; width:28px; height:28px; border-radius:4px; cursor:pointer; font-weight:bold; }
    .quantity-controls input { width:60px; text-align:center; padding:4px; border:1px solid #ddd; border-radius:4px; font-size:14px; }
    .quote-form { margin-top:20px; padding-top:20px; border-top:2px solid #eee; }
    .quote-form input, .quote-form textarea { width:100%; padding:8px; margin-bottom:10px; border:1px solid #ddd; border-radius:4px; font-size:14px; box-sizing:border-box; }
    .quote-form textarea { height:60px; resize:vertical; }
    .submit-quote { background:#27ae60; color:white; border:none; padding:12px 24px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:16px; width:100%; }
    .submit-quote:hover { background:#229954; }
    .close-modal { float:right; font-size:28px; font-weight:bold; cursor:pointer; color:#aaa; }
    .close-modal:hover { color:#000; }
    .notification { position:fixed; top:20px; right:20px; background:#3498db; color:white; padding:15px 20px; border-radius:8px; z-index:3000; font-weight:500; box-shadow:0 4px 20px rgba(52,152,219,0.3); transform:translateX(400px); transition:all 0.4s cubic-bezier(0.68,-0.55,0.265,1.55); max-width:350px; }
    .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top:2px solid white; border-radius:50%; animation:spin 1s linear infinite; }
    @keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
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
    <div><div class="num">$${Math.round(items.reduce((sum, i) => sum + i.save, 0) / items.length) || 0}</div><div class="label">Avg Savings</div></div>
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
    <a href="tel:+12049355559">Call (204) 935-5559</a>
    <a href="mailto:nileshn@sturgeontire.com">Get Quote</a>
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
        <textarea id="customer-notes" placeholder="Additional notes..."></textarea>
        <button class="submit-quote" onclick="submitQuote()">Request Quote</button>
      </div>
    </div>
  </div>

  <script>
    const items = ${JSON.stringify(items, null, 2)};
    let currentPage = 1, pageSize = 20, quoteItems = [];

    function renderCard(i) {
      const badgeType = i.disc >= 99 ? 'free' : i.disc >= 40 ? 'huge' : i.disc >= 30 ? 'great' : i.disc >= 20 ? 'good' : 'sale';
      const stockClass = i.stock <= 5 ? 'low' : i.stock <= 15 ? 'medium' : i.stock <= 50 ? 'good' : 'excellent';
      return \`
      <div class="card">
        <div class="badge badge-\${badgeType}">\${i.disc}% OFF</div>
        <div class="content">
          \${i.logo ? '<img src="'+i.logo+'" class="logo" onerror="this.style.display=\\'none\\'">' : ''}
          <div class="title">\${i.model}</div>
          <div class="details">Item: \${i.item} • \${i.manufacturer}</div>
          <div class="stock stock-\${stockClass}">Qty: \${i.stock}</div>
          <div class="card-actions">
            <button class="btn-add-quote" onclick="addToQuote('\${i.item}')">Add to Quote</button>
          </div>
        </div>
      </div>\`;
    }

    function render() {
      const mf = document.getElementById('filter-manufacturer').value;
      const md = parseInt(document.getElementById('filter-discount').value);
      const filtered = items.filter(i => (!mf||i.manufacturer===mf) && i.disc>=md);
      const totalPages = Math.ceil(filtered.length/pageSize)||1;
      if (currentPage>totalPages) currentPage=totalPages;
      const start=(currentPage-1)*pageSize;
      const pageItems=filtered.slice(start,start+pageSize);
      document.getElementById('card-container').innerHTML=pageItems.map(renderCard).join('');
      const pg=document.getElementById('pagination'); pg.innerHTML='';
      for(let p=1;p<=totalPages;p++){
        const b=document.createElement('button'); b.textContent=p;
        if(p===currentPage)b.disabled=true;
        b.onclick=()=>{currentPage=p;render();};
        pg.appendChild(b);
      }
    }

    function addToQuote(code) {
      const itm=items.find(x=>x.item===code);
      if(!itm) return;
      const idx=quoteItems.findIndex(x=>x.item===code);
      if(idx>=0){
        if(quoteItems[idx].quantity<itm.stock) quoteItems[idx].quantity++;
        else return showNotification('Max '+itm.stock+' available');
      } else quoteItems.push({...itm,quantity:1});
      updateQuoteCounter(); showNotification('Added to quote!');
    }

    function changeQuantity(code,delta){
      const itm=quoteItems.find(x=>x.item===code);
      if(!itm) return;
      itm.quantity+=delta;
      if(itm.quantity<1) removeFromQuote(code);
      else if(itm.quantity>itm.stock){ itm.quantity=itm.stock; showNotification('Max '+itm.stock+' available'); }
      updateQuoteModal(); updateQuoteCounter();
    }

    function setQuantity(code,val){
      const itm=quoteItems.find(x=>x.item===code);
      if(!itm) return;
      const v=parseInt(val)||0;
      if(v<1) removeFromQuote(code);
      else if(v>itm.stock){ itm.quantity=itm.stock; showNotification('Max '+itm.stock+' available'); }
      else itm.quantity=v;
      updateQuoteModal(); updateQuoteCounter();
    }

    function removeFromQuote(code){
      quoteItems=quoteItems.filter(x=>x.item!==code);
      updateQuoteCounter(); updateQuoteModal();
    }

    function updateQuoteCounter(){
      const ctr=document.getElementById('quote-counter');
      const cnt=document.getElementById('quote-count');
      if(quoteItems.length){
        ctr.style.display='block'; cnt.textContent=quoteItems.length;
      } else ctr.style.display='none';
    }

    function openQuoteModal(){ updateQuoteModal(); document.getElementById('quote-modal').style.display='block'; }
    function closeQuoteModal(){ document.getElementById('quote-modal').style.display='none'; }

    function updateQuoteModal(){
      const c=document.getElementById('quote-items');
      if(!quoteItems.length) return c.innerHTML='<p>No items in quote yet.</p>';
      let html='<h3>Items in Quote:</h3>';
      quoteItems.forEach(it=>{
        html+=\`
        <div class="quote-item">
          <div><strong>\${it.manufacturer} \${it.model}</strong><br>Item: \${it.item}</div>
          <div class="quantity-controls">
            <button onclick="changeQuantity('\${it.item}',-1)">-</button>
            <input type="number" value="\${it.quantity}" min="1" max="\${it.stock}" onchange="setQuantity('\${it.item}',this.value)">
            <button onclick="changeQuantity('\${it.item}',1)">+</button>
          </div>
        </div>\`;
      });
      c.innerHTML=html;
    }

    function showNotification(msg){
      const n=document.createElement('div');
      n.className='notification'; n.textContent=msg;
      document.body.appendChild(n);
      setTimeout(()=>n.style.transform='translateX(0)',100);
      setTimeout(()=>{
        n.style.transform='translateX(400px)';
        setTimeout(()=>n.remove(),500);
      },3000);
    }

    function submitQuote(){
      const name=document.getElementById('customer-name').value;
      const email=document.getElementById('customer-email').value;
      if(!name||!email) return showNotification('Name & email required');
      const phone=document.getElementById('customer-phone').value||'';
      const company=document.getElementById('customer-company').value||'';
      const notes=document.getElementById('customer-notes').value||'None';
      const totalItems=quoteItems.reduce((sum,x)=>sum+x.quantity,0);

      const summary=\`TIRE QUOTE REQUEST

CUSTOMER:
Name: \${name}
Email: \${email}
Phone: \${phone}
Company: \${company}

ITEMS:
\${quoteItems.map(x=>\`\${x.item} - Qty: \${x.quantity}\`).join('\n')}

Total Items: \${totalItems}
Date: \${new Date().toLocaleString()}

Notes: \${notes}\`;

      const btn=document.querySelector('.submit-quote');
      const orig=btn.innerHTML; btn.innerHTML='<div class="spinner"></div>Sending...'; btn.disabled=true;

      const fd=new FormData();
      fd.append('name',name);
      fd.append('email',email);
      fd.append('phone',phone);
      fd.append('company',company);
      fd.append('notes',notes);
      fd.append('total_items',totalItems);
      fd.append('quote_date',new Date().toLocaleString());
      fd.append('message',summary);
      fd.append('_subject',\`Tire Quote - \${name}\`);
      fd.append('_replyto',email);

      fetch('https://formspree.io/f/xdkgqyzr',{method:'POST',body:fd,headers:{'Accept':'application/json'}})
        .then(r=>{
          if(r.ok){
            btn.innerHTML='Sent!';
            setTimeout(()=>{
              quoteItems=[]; updateQuoteCounter(); closeQuoteModal();
              showNotification('Quote sent! We’ll be in touch.');
              btn.innerHTML=orig; btn.disabled=false;
            },1500);
          } else throw new Error('Formspree '+r.status);
        })
        .catch(()=>{
          btn.innerHTML='Open Email';
          setTimeout(()=>{
            window.open(\`mailto:nileshn@sturgeontire.com?subject=\${encodeURIComponent('Tire Quote - '+name)}&body=\${encodeURIComponent(summary)}\`);
            btn.innerHTML=orig; btn.disabled=false;
            showNotification('Email client opened, please send.');
          },500);
        });
    }

    document.getElementById('filter-manufacturer').addEventListener('change',()=>{
      currentPage=1; render();
    });
    document.getElementById('filter-discount').addEventListener('change',()=>{
      currentPage=1; render();
    });
    window.addEventListener('click',e=>{
      if(e.target===document.getElementById('quote-modal')) closeQuoteModal();
    });

    render();
  </script>
</body>
</html>`;
}

async function main() {
  try {
    console.log('🔄 Processing tire data from local CSV...');
    const raw = readLocalCSV();
    const data = parseCSV(raw);
    if (!data.length) throw new Error('No tire data with stock > 0');

    const items = data.map(d => {
      const disc = Math.round(parseFloat(d['B2B_Discount_Percentage'])||0);
      const sale = parseFloat(d['SalePrice'])||0;
      const reg  = parseFloat(d['Net'])||0;
      const save = Math.round(reg - sale);
      return {
        manufacturer: d['Manufacturer']||'Unknown',
        logo: d['Brand_Logo_URL']||'',
        model: d['Model']||'TIRE',
        item: d['Item']||'',
        disc, sale, reg, save,
        stock: parseInt(d['AvailableQuantity'],10)||0
      };
    });

    // Sort: highest discount first, then highest savings
    items.sort((a,b)=>b.disc - a.disc || b.save - a.save);

    console.log('🎨 Generating HTML...');
    const html = generateHTML(items);

    console.log('💾 Writing index.html...');
    fs.writeFileSync('index.html', html);

    console.log('🚀 Done! Published', items.length, 'deals.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
