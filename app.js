const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const app=$('#app');
const toastEl=$('#toast');
const VERSION='0.2.0';
const STORE_KEY='neighbourly_v02';
const ID_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const seedProviders=[
  {id:'seed-1',providerId:'N4M7QK',name:'Ayesha Jacobs',area:'Westridge',category:'Cleaning',service:'Home cleaning',price:'From R180',rating:4.9,reviews:28,verified:true,about:'Friendly, careful home cleaning with flexible weekday slots.',areas:['Westridge','Portlands','Lentegeur'],availability:'Weekdays',status:'approved'},
  {id:'seed-2',providerId:'N8T5RA',name:'Jason Daniels',area:'Portlands',category:'Handyman',service:'Home repairs & odd jobs',price:'From R150',rating:4.8,reviews:19,verified:true,about:'Small repairs, hanging, fittings and practical household fixes.',areas:['Portlands','Westridge','Woodlands'],availability:'Weekends',status:'approved'},
  {id:'seed-3',providerId:'N3K9LE',name:'Nadia Williams',area:'Lentegeur',category:'Beauty',service:'Mobile hair & beauty',price:'From R120',rating:4.7,reviews:34,verified:true,about:'Neighbourhood-friendly mobile beauty appointments with clear pricing.',areas:['Lentegeur','Westridge','Tafelsig'],availability:'By appointment',status:'approved'},
  {id:'seed-4',providerId:'N6P4YS',name:'Thando Mbeki',area:'Tafelsig',category:'Gardening',service:'Garden tidy-ups',price:'From R140',rating:4.9,reviews:16,verified:true,about:'Reliable garden clean-ups, sweeping, trimming and once-off tidy jobs.',areas:['Tafelsig','Lentegeur','Eastridge'],availability:'Tue–Sat',status:'approved'}
];

const defaultState={
  route:'welcome',role:null,currentAccountId:null,
  accounts:[],providers:seedProviders,
  favourites:{providers:[],customers:[]},
  requests:[],customerNotes:{},reports:[],
  ui:{search:'',category:'All',area:'All'}
};

function clone(v){return JSON.parse(JSON.stringify(v))}
function safeLoad(){
  try{
    const raw=localStorage.getItem(STORE_KEY);
    if(!raw)return clone(defaultState);
    const parsed=JSON.parse(raw);
    return {...clone(defaultState),...parsed,ui:{...defaultState.ui,...(parsed.ui||{})},favourites:{...defaultState.favourites,...(parsed.favourites||{})}};
  }catch(e){return clone(defaultState)}
}
const state=safeLoad();

function persist(){
  try{localStorage.setItem(STORE_KEY,JSON.stringify(state));return true}
  catch(e){toast('We could not save that on this device. Try again.');return false}
}
function toast(msg){
  toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>toastEl.classList.remove('show'),2400);
}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function initials(name='Neighbour'){return name.trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function uid(prefix='id'){return `${prefix}-${(crypto.randomUUID?crypto.randomUUID():Date.now()+Math.random().toString(16).slice(2))}`}
function currentAccount(){return state.accounts.find(a=>a.id===state.currentAccountId)||null}
function currentProvider(){const a=currentAccount();return a?.providerId?state.providers.find(p=>p.providerId===a.providerId):null}
function moneySafe(v){return esc(v||'Ask for a quote')}
function titleCase(v=''){return v.replace(/\b\w/g,m=>m.toUpperCase())}
async function hashText(text){
  if(crypto.subtle){const data=new TextEncoder().encode(text);const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  return btoa(unescape(encodeURIComponent(text)));
}
function uniqueProviderId(){
  let id;
  do{id='N'+Array.from({length:5},()=>ID_ALPHABET[Math.floor(Math.random()*ID_ALPHABET.length)]).join('')}
  while(state.providers.some(p=>p.providerId===id)||state.accounts.some(a=>a.providerId===id));
  return id;
}
function nav(route){state.route=route;persist();render();window.scrollTo({top:0,behavior:'smooth'})}
function signOut(){state.role=null;state.currentAccountId=null;state.route='welcome';persist();render();toast('Signed out — see you soon 👋')}

function roleNav(){
  if(state.role==='customer')return [['customerHome','⌂','Home'],['findHelp','⌕','Find Help'],['customerFavourites','♡','Favourites'],['customerServices','✓','My Services'],['profile','☺','Profile']];
  if(state.role==='provider')return [['providerHome','⌂','Today'],['providerRequests','✉','Requests'],['providerCustomers','♡','Customers'],['providerServices','✦','My Services'],['profile','☺','Profile']];
  if(state.role==='admin')return [['adminHome','⌂','Desk'],['adminApplications','✓','Applications'],['adminReports','⚑','Reports'],['adminPeople','☺','People'],['adminSettings','⚙','Settings']];
  return [];
}
function shell(content,active){
  const items=roleNav();
  return `<main class="app-shell role-${esc(state.role||'guest')}"><div class="page-wrap">${content}</div>${items.length?`<nav class="bottom-nav" aria-label="Primary">${items.map(([r,i,l])=>`<button type="button" class="nav-btn ${active===r?'active':''}" data-nav="${r}"><span>${i}</span><b>${l}</b></button>`).join('')}</nav>`:''}</main>`;
}
function topbar(title='Neighbourly',subtitle=''){
  return `<header class="topbar"><div><div class="brand-row"><span class="brand-mark">♥</span><span>${esc(title)}</span></div>${subtitle?`<small>${esc(subtitle)}</small>`:''}</div><button type="button" class="icon-btn" data-action="how">?</button></header>`;
}
function communityStrip(){return `<div class="community-strip"><span>🌱</span><div><b>Local help. Local income. Stronger neighbourhoods.</b><small>Neighbourly exists to make trusted local services easier to find — and easier to grow.</small></div></div>`}
function connectionNote(compact=false){return `<div class="connection-note ${compact?'compact':''}"><b>Neighbourly connects you — your service agreement is with each other.</b><span>If something goes wrong, report it in-app. The Neighbourly Sisters Desk reviews every case and can take action on the platform.</span></div>`}

function welcome(){
  return shell(`<section class="hero"><img src="neighbourly-brand.png" alt="Neighbourly logo"><span class="eyebrow">LOCAL SERVICES, MADE NEIGHBOURLY</span><h1>Good help should feel close to home.</h1><p>Find trusted people nearby, support local service providers, and keep everything easier to manage in one friendly place.</p>${communityStrip()}<div class="cta-grid"><button class="btn primary" data-nav="joinCustomer">I’m looking for a service</button><button class="btn secondary" data-nav="joinProvider">I provide a service</button><button class="btn ghost" data-nav="login">Already joined? Log in</button></div><div class="soft-note">Customers browse and request services. Public job posts are coming in a later Neighbourly phase.</div></section>`);
}
function baseSignup(role){
  const provider=role==='provider';
  return shell(`<section class="screen narrow">${topbar(provider?'Join as a service provider':'Create your Neighbourly account',provider?'Same simple account, with a provider profile added after signup.':'A quick hello, then you’re in.')}<div class="card"><form id="signupForm" class="form" data-role="${role}" novalidate>
    <div class="field two"><label>First name<input name="first" maxlength="35" autocomplete="given-name" required placeholder="First name"></label><label>Surname<input name="last" maxlength="35" autocomplete="family-name" required placeholder="Surname"></label></div>
    <div class="field"><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label></div>
    <div class="field"><label>Mobile number<input name="phone" inputmode="tel" autocomplete="tel" required placeholder="e.g. 072 123 4567"></label></div>
    <div class="field"><label>Neighbourhood<input name="area" maxlength="50" required placeholder="e.g. Westridge"></label></div>
    <div class="field"><label>Password<input name="password" type="password" minlength="8" autocomplete="new-password" required placeholder="At least 8 characters"></label><small>Use something you don’t use elsewhere.</small></div>
    <div class="form-error" id="signupError"></div>
    <button class="btn primary" type="submit">${provider?'Create provider account':'Create my account'}</button>
    <button class="btn ghost" type="button" data-nav="welcome">Back</button>
  </form></div>${connectionNote(true)}</section>`);
}
function login(){
  return shell(`<section class="screen narrow">${topbar('Welcome back','Customers use email. Providers can use email or their Neighbourly Provider ID.')}<div class="card"><form id="loginForm" class="form" novalidate><div class="field"><label>Email or Provider ID<input name="identifier" autocomplete="username" required placeholder="you@example.com or N4M7QK"></label></div><div class="field"><label>Password<input name="password" type="password" autocomplete="current-password" required></label></div><div class="form-error" id="loginError"></div><button class="btn primary" type="submit">Log in</button><button class="btn ghost" type="button" data-nav="welcome">Back</button></form></div><div class="soft-note">Forgot your provider email? Your 6-character Provider ID works too.</div></section>`);
}

function providerCard(p){
  const account=currentAccount();
  const fav=!!account&&state.favourites.providers.some(x=>x.customerId===account.id&&x.providerId===p.providerId);
  return `<article class="card provider-card" data-provider="${esc(p.providerId)}"><div class="provider-top"><div class="avatar lg">${initials(p.name)}</div><div class="grow"><div class="name-line"><h3>${esc(p.name)}</h3>${p.verified?'<span class="verified">✓ Verified</span>':''}</div><p>${esc(p.category)} · ${esc(p.area)}</p></div><button type="button" class="heart ${fav?'on':''}" data-action="toggleProviderFav" data-id="${esc(p.providerId)}" aria-label="Favourite">${fav?'♥':'♡'}</button></div><div class="service-title">${esc(p.service)}</div><p class="muted">${esc(p.about)}</p><div class="provider-meta"><span>★ ${esc(p.rating)} <small>(${esc(p.reviews)})</small></span><span>${moneySafe(p.price)}</span><span>${esc(p.availability)}</span></div><div class="card-actions"><button class="btn secondary small" data-action="viewProvider" data-id="${esc(p.providerId)}">View profile</button><button class="btn primary small" data-action="requestService" data-id="${esc(p.providerId)}">Request service</button></div></article>`;
}
function approvedProviders(){return state.providers.filter(p=>p.status==='approved')}
function customerHome(){
  const a=currentAccount();const fav=approvedProviders().filter(p=>state.favourites.providers.some(x=>x.customerId===a?.id&&x.providerId===p.providerId)).slice(0,2);
  return shell(`<section class="screen">${topbar('Neighbourly',`${a?.area||'Your neighbourhood'} · nice to see you`)}<div class="welcome-card"><span>👋</span><div><h1>Hi, ${esc(a?.first||'Neighbour')}.</h1><p>Who can we help you find today?</p></div></div><div class="search-launch" data-nav="findHelp"><span>⌕</span><div><b>Find local help</b><small>Search cleaning, repairs, beauty, gardening and more.</small></div><span>›</span></div><div class="category-grid">${['Cleaning','Handyman','Beauty','Gardening'].map(c=>`<button data-action="quickCategory" data-category="${c}"><span>${({Cleaning:'🧽',Handyman:'🛠️',Beauty:'✨',Gardening:'🌿'})[c]}</span>${c}</button>`).join('')}</div>${communityStrip()}<div class="section-title"><h2>${fav.length?'Your favourites':'Neighbourhood favourites'}</h2><button data-nav="findHelp">See all</button></div><div class="grid-cards">${(fav.length?fav:approvedProviders().slice(0,2)).map(providerCard).join('')}</div>${connectionNote(true)}</section>`,'customerHome');
}
function findHelp(){
  const cats=['All',...new Set(approvedProviders().map(p=>p.category))];
  const areas=['All',...new Set(approvedProviders().flatMap(p=>p.areas||[p.area]))];
  return shell(`<section class="screen">${topbar('Find Help','Browse people, not ads.')}<div class="filter-card"><div class="field"><label>What do you need?<input id="providerSearch" value="${esc(state.ui.search)}" placeholder="Try “cleaning” or a provider name"></label></div><div class="filter-row"><select id="categoryFilter" aria-label="Category">${cats.map(c=>`<option ${state.ui.category===c?'selected':''}>${esc(c)}</option>`).join('')}</select><select id="areaFilter" aria-label="Area">${areas.map(c=>`<option ${state.ui.area===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div></div><div class="section-title"><h2>Local service providers</h2><span id="resultCount" class="count-pill"></span></div><div id="providerResults" class="grid-cards"></div></section>`,'findHelp');
}
function customerFavourites(){
  const a=currentAccount();const list=approvedProviders().filter(p=>state.favourites.providers.some(x=>x.customerId===a?.id&&x.providerId===p.providerId));
  return shell(`<section class="screen">${topbar('Your favourites','The good ones, one tap away.')}<div class="grid-cards">${list.length?list.map(providerCard).join(''):`<div class="card empty"><div class="big">♡</div><h3>No favourites yet</h3><p>When you find someone you’d happily call again, tap the heart.</p><button class="btn primary" data-nav="findHelp">Find local help</button></div>`}</div></section>`,'customerFavourites');
}
function statusPill(s){const label={awaiting:'Awaiting provider',accepted:'Booked',completed:'Completed',cancelled:'Cancelled'}[s]||titleCase(s);return `<span class="status status-${esc(s)}">${esc(label)}</span>`}
function customerServices(){
  const a=currentAccount();const list=state.requests.filter(r=>r.customerId===a?.id).sort((x,y)=>y.createdAt-x.createdAt);
  return shell(`<section class="screen">${topbar('My Services','Everything you’ve requested, in one place.')}<div class="stack">${list.length?list.map(r=>{const p=state.providers.find(x=>x.providerId===r.providerId);return `<article class="card request-card"><div class="request-head"><div><h3>${esc(r.service)}</h3><p>${esc(p?.name||r.providerName)}</p></div>${statusPill(r.status)}</div><div class="request-details"><span>📅 ${esc(r.date||'Date to confirm')}</span><span>📍 ${esc(a?.area||'')}</span></div>${r.note?`<p class="muted">“${esc(r.note)}”</p>`:''}<div class="card-actions">${r.status==='awaiting'?`<button class="btn secondary small" data-action="cancelRequest" data-id="${esc(r.id)}">Cancel request</button>`:''}${r.status==='accepted'?`<button class="btn primary small" data-action="confirmComplete" data-id="${esc(r.id)}">Service completed</button>`:''}${r.status==='completed'&&!r.customerRating?`<button class="btn primary small" data-action="rateProvider" data-id="${esc(r.id)}">How did it go?</button>`:''}${r.customerRating?`<span class="rating-done">★ ${r.customerRating} · Thanks for reviewing</span>`:''}</div></article>`}).join(''):`<div class="card empty"><div class="big">🧰</div><h3>Nothing booked yet</h3><p>Find someone local and send your first service request.</p><button class="btn primary" data-nav="findHelp">Find a service</button></div>`}</div></section>`,'customerServices');
}

function providerHow(){
  const p=currentProvider();
  return shell(`<section class="screen narrow">${topbar('How Neighbourly works','A simple path from local skill to local work.')}<div class="steps"><div><b>1</b><span><strong>Build your profile</strong><small>Tell neighbours what you do, where you work and what you charge.</small></span></div><div><b>2</b><span><strong>We review your application</strong><small>The Neighbourly Sisters Desk checks every provider before they go live.</small></span></div><div><b>3</b><span><strong>Customers find you</strong><small>They browse services and send requests directly through Neighbourly.</small></span></div><div><b>4</b><span><strong>Do great work, grow locally</strong><small>Build ratings, favourites and repeat customers over time.</small></span></div></div><div class="provider-id-card"><small>Your Provider ID</small><strong>${esc(p?.providerId||'')}</strong><span>Keep this somewhere safe — you can use it instead of your email when logging in.</span></div>${communityStrip()}<button class="btn primary" data-nav="providerApplication">Start my application</button></section>`,'providerHome');
}
function providerApplication(){
  const p=currentProvider();
  if(p?.applicationStatus==='submitted'||p?.status==='approved')return providerHome();
  return shell(`<section class="screen narrow">${topbar('Provider application','Clear, simple, and reviewed by people.')}<div class="progress"><span class="on"></span><span class="on"></span><span></span><span></span></div><form id="providerApplicationForm" class="card form" novalidate><div class="field"><label>Main service category<select name="category" required><option value="">Choose one</option>${['Cleaning','Handyman','Beauty','Gardening','Transport','Tutoring','Childcare','Pet care','Other'].map(x=>`<option>${x}</option>`).join('')}</select></label></div><div class="field"><label>Service name<input name="service" maxlength="70" required placeholder="e.g. Home cleaning"></label></div><div class="field"><label>Tell neighbours what you do<textarea name="about" maxlength="350" required placeholder="A short, friendly description of your service."></textarea></label></div><div class="field"><label>Starting price<input name="price" maxlength="35" placeholder="e.g. From R180 or Ask for a quote"></label></div><div class="field"><label>Areas you serve<input name="areas" maxlength="160" required placeholder="e.g. Westridge, Portlands, Lentegeur"></label></div><div class="field"><label>Availability<input name="availability" maxlength="80" required placeholder="e.g. Weekdays after 9am"></label></div><div class="field"><label>Your experience<textarea name="experience" maxlength="350" required placeholder="Tell us how long you’ve done this work and anything customers should know."></textarea></label></div><label class="check"><input name="agree" type="checkbox" required><span>I understand that Neighbourly connects me with customers, but the service agreement and work are between me and the customer.</span></label><div class="form-error" id="applicationError"></div><button class="btn primary" type="submit">Send to the Sisters Desk</button></form></section>`,'providerHome');
}
function onboardingChecklist(p){
  const items=[['Account created',true],['How it works',true],['Application sent',p.applicationStatus==='submitted'||p.status==='approved'],['Sisters Desk review',p.status==='approved'],['Profile live',p.status==='approved']];
  return `<div class="checklist">${items.map(([t,on])=>`<div class="${on?'done':''}"><span>${on?'✓':'○'}</span>${esc(t)}</div>`).join('')}</div>`;
}
function providerHome(){
  const p=currentProvider();const a=currentAccount();
  if(!p)return welcome();
  if(!p.applicationStatus&&!p.status?.includes('approved'))return providerHow();
  const mine=state.requests.filter(r=>r.providerId===p.providerId);const awaiting=mine.filter(r=>r.status==='awaiting').length;const booked=mine.filter(r=>r.status==='accepted').length;
  return shell(`<section class="screen">${topbar('Provider Today',`${p.providerId} · ${a?.area||''}`)}<div class="welcome-card provider"><span>🌟</span><div><h1>${p.status==='approved'?'You’re live, '+esc(a?.first||'Neighbour')+'!':'Application received'}</h1><p>${p.status==='approved'?'Let’s keep the good work moving.':'The Neighbourly Sisters Desk will review it before your profile goes public.'}</p></div></div>${p.status!=='approved'?`<div class="card"><h3>Your onboarding</h3>${onboardingChecklist(p)}<div class="soft-note">${p.status==='changes'?'The Sisters Desk asked for a few changes. Update your application and send it back when you’re ready.':'You’ll be able to manage customer requests once your application is approved.'}</div>${p.status==='changes'?'<button class="btn primary small" data-nav="providerApplication">Update application</button>':''}</div>`:`<><div class="stat-grid"><div class="stat-card"><b>${awaiting}</b><span>New requests</span></div><div class="stat-card"><b>${booked}</b><span>Booked</span></div><div class="stat-card"><b>${state.favourites.customers.filter(x=>x.providerId===p.providerId).length}</b><span>Favourite customers</span></div></div><div class="section-title"><h2>Next up</h2><button data-nav="providerRequests">See requests</button></div>${mine.filter(r=>r.status==='awaiting'||r.status==='accepted').slice(0,2).map(providerRequestCard).join('')||`<div class="card empty mini"><p>No active requests right now. Your profile is ready for neighbours to find.</p></div>`}<div class="membership-card"><span>🌱</span><div><b>Community-first membership</b><p>Neighbourly will keep provider pricing intentionally affordable in launch areas, with fair area-based pricing as we expand. Final membership tiers will be agreed before launch.</p></div></div></>`}${connectionNote(true)}</section>`,'providerHome');
}
function providerRequestCard(r){
  const c=state.accounts.find(a=>a.id===r.customerId);return `<article class="card request-card"><div class="request-head"><div><h3>${esc(r.service)}</h3><p>${esc(c?`${c.first} ${c.last}`:r.customerName)} · ${esc(c?.area||'')}</p></div>${statusPill(r.status)}</div><div class="request-details"><span>📅 ${esc(r.date||'Date to confirm')}</span></div>${r.note?`<p class="muted">“${esc(r.note)}”</p>`:''}<div class="card-actions">${r.status==='awaiting'?`<button class="btn primary small" data-action="acceptRequest" data-id="${esc(r.id)}">Accept request</button><button class="btn secondary small" data-action="declineRequest" data-id="${esc(r.id)}">Decline</button>`:''}${r.status==='accepted'?`<button class="btn secondary small" data-action="providerComplete" data-id="${esc(r.id)}">Mark done</button>`:''}</div></article>`}
function providerRequests(){
  const p=currentProvider();const list=state.requests.filter(r=>r.providerId===p?.providerId).sort((a,b)=>b.createdAt-a.createdAt);
  return shell(`<section class="screen">${topbar('Customer requests','Simple, clear and easy to action.')}<div class="stack">${list.length?list.map(providerRequestCard).join(''):`<div class="card empty"><div class="big">✉</div><h3>No requests yet</h3><p>When a customer requests one of your services, it’ll appear here.</p></div>`}</div></section>`,'providerRequests');
}
function providerCustomers(){
  const p=currentProvider();const ids=[...new Set(state.requests.filter(r=>r.providerId===p?.providerId).map(r=>r.customerId))];
  return shell(`<section class="screen">${topbar('Your customers','A little private memory, just for you.')}<div class="privacy-banner"><b>Private to you</b><span>Favourite customers, work-again ratings and notes are never shown to customers or other providers.</span></div><div class="stack">${ids.length?ids.map(id=>{const c=state.accounts.find(a=>a.id===id);if(!c)return'';const key=`${p.providerId}:${id}`,note=state.customerNotes[key]||{};const fav=state.favourites.customers.some(x=>x.providerId===p.providerId&&x.customerId===id);return `<article class="card customer-card"><div class="provider-top"><div class="avatar">${initials(`${c.first} ${c.last}`)}</div><div class="grow"><h3>${esc(c.first+' '+c.last)}</h3><p>${esc(c.area)}</p></div><button class="heart ${fav?'on':''}" data-action="toggleCustomerFav" data-id="${esc(id)}">${fav?'♥':'♡'}</button></div><div class="customer-memory"><span>Work again: ${note.rating?`★ ${note.rating}/5`:'Not rated yet'}</span>${note.note?`<p>“${esc(note.note)}”</p>`:''}</div><button class="btn secondary small" data-action="customerNote" data-id="${esc(id)}">${note.note||note.rating?'Edit private note':'Add private note'}</button></article>`}).join(''):`<div class="card empty"><div class="big">♡</div><h3>Your customer book is empty</h3><p>After customers request your service, you can privately favourite them and leave notes for yourself.</p></div>`}</div><div class="soft-note">Keep notes factual and service-related. Do not record sensitive personal characteristics or use notes for discriminatory decisions.</div></section>`,'providerCustomers');
}
function providerServices(){
  const p=currentProvider();
  return shell(`<section class="screen">${topbar('My Services','What neighbours see when they find you.')}<article class="card provider-profile-preview"><div class="provider-top"><div class="avatar lg">${initials(p?.name||'Provider')}</div><div><h2>${esc(p?.name||'Your profile')}</h2><p>${esc(p?.category||'Application pending')}</p></div></div><h3>${esc(p?.service||'Your service will appear here')}</h3><p class="muted">${esc(p?.about||'Complete your application to build your public profile.')}</p><div class="provider-meta"><span>${moneySafe(p?.price)}</span><span>${esc(p?.availability||'')}</span></div></article><div class="membership-card"><span>🤝</span><div><b>Membership that grows with the neighbourhood</b><p>Lower-income launch areas should stay genuinely affordable. As Neighbourly expands into higher-cost areas, pricing can reflect local market conditions while protecting the community mission.</p><button class="btn secondary small" data-action="membershipInfo">Preview membership principles</button></div></div></section>`,'providerServices');
}

function profile(){
  const a=currentAccount();const p=currentProvider();
  return shell(`<section class="screen narrow">${topbar('Profile','Your Neighbourly details.')}<div class="card profile-header"><div class="profile-avatar">${initials(a?`${a.first} ${a.last}`:'Neighbour')}</div><h2>${esc(a?`${a.first} ${a.last}`:'Neighbour')}</h2><p>${esc(a?.area||'')}</p>${p?`<div class="provider-id-inline"><small>Provider ID</small><b>${esc(p.providerId)}</b></div>`:''}</div><div class="stack"><button class="btn secondary" data-action="how">How Neighbourly works</button><button class="btn secondary" data-action="reportGeneral">Report a problem</button><button class="btn secondary" data-action="signout">Sign out</button></div>${connectionNote(true)}</section>`,'profile');
}

function adminLogin(){
  return shell(`<section class="screen narrow admin-login">${topbar('The Neighbourly Sisters Desk','Private admin access')}<div class="admin-hero">👭</div><div class="card"><form id="adminLoginForm" class="form"><div class="field"><label>Desk login<input name="user" autocomplete="username" placeholder="Desk username"></label></div><div class="field"><label>Password<input name="password" type="password" autocomplete="current-password"></label></div><div class="form-error" id="adminError"></div><button class="btn primary" type="submit">Open the Sisters Desk</button></form></div><div class="soft-note">Prototype only: production admin access will use real server-side roles and stronger authentication.</div></section>`);
}
function adminHome(){
  const pending=state.providers.filter(p=>p.applicationStatus==='submitted'&&p.status!=='approved').length;const open=state.reports.filter(r=>r.status!=='closed').length;const live=state.providers.filter(p=>p.status==='approved').length;
  return shell(`<section class="screen admin">${topbar('The Neighbourly Sisters Desk','Keeping the neighbourhood running smoothly.')}<div class="stat-grid admin-stats"><div class="stat-card"><b>${pending}</b><span>Applications waiting</span></div><div class="stat-card"><b>${open}</b><span>Open reports</span></div><div class="stat-card"><b>${live}</b><span>Live providers</span></div><div class="stat-card"><b>${state.requests.length}</b><span>Service requests</span></div></div><div class="section-title"><h2>Needs a sister’s eye</h2></div><div class="stack">${pending?`<button class="attention-card" data-nav="adminApplications"><span>📝</span><div><b>${pending} provider application${pending>1?'s':''}</b><small>Review before they go live.</small></div><span>›</span></button>`:''}${open?`<button class="attention-card" data-nav="adminReports"><span>⚑</span><div><b>${open} open report${open>1?'s':''}</b><small>Every reported case gets reviewed.</small></div><span>›</span></button>`:''}${!pending&&!open?`<div class="card empty mini"><p>All clear for now ✨</p></div>`:''}</div><div class="admin-principle"><b>Community first</b><p>Protect trust, keep provider membership fair, and never sell verification or ratings.</p></div></section>`,'adminHome');
}
function adminApplications(){
  const apps=state.providers.filter(p=>p.applicationStatus==='submitted'||(p.status==='approved'&&!p.id.startsWith('seed-')));
  return shell(`<section class="screen admin">${topbar('Provider applications','People first, paperwork second.')}<div class="stack">${apps.length?apps.map(p=>`<article class="card"><div class="request-head"><div><h3>${esc(p.name)}</h3><p>${esc(p.providerId)} · ${esc(p.area)}</p></div>${statusPill(p.status==='approved'?'completed':'awaiting')}</div><div class="application-summary"><b>${esc(p.service||'')}</b><span>${esc(p.category||'')} · ${moneySafe(p.price)}</span><p>${esc(p.about||'')}</p><small>Areas: ${esc((p.areas||[]).join(', '))}</small></div>${p.status!=='approved'?`<div class="card-actions"><button class="btn primary small" data-action="approveProvider" data-id="${esc(p.providerId)}">Approve & go live</button><button class="btn secondary small" data-action="changesProvider" data-id="${esc(p.providerId)}">Needs changes</button></div>`:`<span class="verified">✓ Live on Neighbourly</span>`}</article>`).join(''):`<div class="card empty"><div class="big">✓</div><h3>No applications waiting</h3><p>New provider applications will appear here.</p></div>`}</div></section>`,'adminApplications');
}
function adminReports(){
  return shell(`<section class="screen admin">${topbar('Reports & cases','Every report gets a human review.')}<div class="stack">${state.reports.length?state.reports.map(r=>`<article class="card"><div class="request-head"><div><h3>${esc(r.reason)}</h3><p>${esc(r.fromName||'Neighbour')} · ${new Date(r.createdAt).toLocaleDateString()}</p></div>${statusPill(r.status||'awaiting')}</div><p class="muted">${esc(r.details)}</p>${r.status!=='closed'?`<button class="btn primary small" data-action="closeReport" data-id="${esc(r.id)}">Mark reviewed</button>`:''}</article>`).join(''):`<div class="card empty"><div class="big">🛡️</div><h3>No reports right now</h3><p>That’s a good neighbourhood day.</p></div>`}</div>${connectionNote(true)}</section>`,'adminReports');
}
function adminPeople(){
  const customers=state.accounts.filter(a=>a.role==='customer');const providers=state.providers.filter(p=>!p.id.startsWith('seed-'));
  return shell(`<section class="screen admin">${topbar('People','Customers, providers and platform status.')}<div class="section-title"><h2>Customers</h2><span class="count-pill">${customers.length}</span></div><div class="stack">${customers.map(c=>`<div class="card person-row"><div class="avatar">${initials(`${c.first} ${c.last}`)}</div><div><b>${esc(c.first+' '+c.last)}</b><small>${esc(c.area)} · ${esc(c.email)}</small></div></div>`).join('')||'<div class="soft-note">No customer accounts created in this prototype yet.</div>'}</div><div class="section-title"><h2>Provider accounts</h2><span class="count-pill">${providers.length}</span></div><div class="stack">${providers.map(p=>`<div class="card person-row"><div class="avatar">${initials(p.name)}</div><div><b>${esc(p.name)}</b><small>${esc(p.providerId)} · ${esc(p.status||'pending')}</small></div></div>`).join('')||'<div class="soft-note">No provider accounts created in this prototype yet.</div>'}</div></section>`,'adminPeople');
}
function adminSettings(){
  return shell(`<section class="screen admin narrow">${topbar('Desk settings','Prototype policy & launch principles.')}<div class="card"><h3>Membership principle</h3><p class="muted">Keep launch-area provider fees affordable enough to support low-income service providers while covering responsible platform operations. Area pricing can adjust as Neighbourly expands, but trust features are never for sale.</p></div><div class="card"><h3>Platform role</h3>${connectionNote(true)}<p class="muted">Final customer/provider terms, consumer-law wording and limitation-of-liability clauses should be reviewed by a South African lawyer before commercial launch.</p></div><button class="btn secondary" data-action="signout">Close Sisters Desk</button></section>`,'adminSettings');
}

function renderFindResults(){
  const q=(state.ui.search||'').toLowerCase().trim();
  const list=approvedProviders().filter(p=>{
    const matchesQ=!q||[p.name,p.category,p.service,p.about,p.area,...(p.areas||[])].join(' ').toLowerCase().includes(q);
    const matchesC=state.ui.category==='All'||p.category===state.ui.category;
    const matchesA=state.ui.area==='All'||(p.areas||[p.area]).includes(state.ui.area);
    return matchesQ&&matchesC&&matchesA;
  });
  const target=$('#providerResults');if(target)target.innerHTML=list.length?list.map(providerCard).join(''):`<div class="card empty"><div class="big">⌕</div><h3>No exact matches</h3><p>Try another category or nearby area.</p></div>`;
  if($('#resultCount'))$('#resultCount').textContent=`${list.length} found`;
  bindDynamic();
}

function render(){
  const query=new URLSearchParams(location.search);
  if(query.get('admin')==='sisters'&&state.role!=='admin'&&state.route==='welcome')state.route='adminLogin';
  const routes={welcome,joinCustomer:()=>baseSignup('customer'),joinProvider:()=>baseSignup('provider'),login,customerHome,findHelp,customerFavourites,customerServices,providerHome,providerHow,providerApplication,providerRequests,providerCustomers,providerServices,profile,adminLogin,adminHome,adminApplications,adminReports,adminPeople,adminSettings};
  const customerRoutes=new Set(['customerHome','findHelp','customerFavourites','customerServices']);
  const providerRoutes=new Set(['providerHome','providerHow','providerApplication','providerRequests','providerCustomers','providerServices']);
  const adminRoutes=new Set(['adminHome','adminApplications','adminReports','adminPeople','adminSettings']);
  if(customerRoutes.has(state.route)&&state.role!=='customer')state.route='welcome';
  if(providerRoutes.has(state.route)&&state.role!=='provider')state.route='welcome';
  if(adminRoutes.has(state.route)&&state.role!=='admin')state.route='adminLogin';
  if(state.route==='profile'&&!state.role)state.route='welcome';
  app.innerHTML=(routes[state.route]||welcome)();
  bind();
  if(state.route==='findHelp')renderFindResults();
}

function bind(){
  $$('[data-nav]').forEach(el=>el.addEventListener('click',()=>nav(el.dataset.nav)));
  $('#signupForm')?.addEventListener('submit',handleSignup);
  $('#loginForm')?.addEventListener('submit',handleLogin);
  $('#providerApplicationForm')?.addEventListener('submit',handleProviderApplication);
  $('#adminLoginForm')?.addEventListener('submit',handleAdminLogin);
  $('#providerSearch')?.addEventListener('input',e=>{state.ui.search=e.target.value;persist();renderFindResults()});
  $('#categoryFilter')?.addEventListener('change',e=>{state.ui.category=e.target.value;persist();renderFindResults()});
  $('#areaFilter')?.addEventListener('change',e=>{state.ui.area=e.target.value;persist();renderFindResults()});
  bindDynamic();
}

async function handleSignup(e){
  e.preventDefault();const form=e.currentTarget,role=form.dataset.role,fd=new FormData(form);
  const first=fd.get('first').trim(),last=fd.get('last').trim(),email=fd.get('email').trim().toLowerCase(),phone=fd.get('phone').trim(),area=fd.get('area').trim(),password=fd.get('password');
  const err=$('#signupError');
  if(!first||!last||!/^\S+@\S+\.\S+$/.test(email)||phone.replace(/\D/g,'').length<9||!area||password.length<8){err.textContent='Almost there — please complete every field and use an 8+ character password.';err.classList.add('show');return}
  if(state.accounts.some(a=>a.email===email)){err.textContent='That email is already part of Neighbourly. Try logging in instead.';err.classList.add('show');return}
  const passwordHash=await hashText(password);const id=uid('acct');
  const account={id,role,first,last,email,phone,area,passwordHash,createdAt:Date.now()};
  if(role==='provider'){
    account.providerId=uniqueProviderId();
    state.providers.push({id:uid('prov'),providerId:account.providerId,name:`${first} ${last}`,area,category:'',service:'',price:'Ask for a quote',rating:0,reviews:0,verified:false,about:'',areas:[area],availability:'',status:'pending',applicationStatus:null});
  }
  state.accounts.push(account);state.currentAccountId=id;state.role=role;state.route=role==='provider'?'providerHow':'customerHome';persist();render();toast(role==='provider'?'Provider account created ✨':'Welcome to the neighbourhood ♥');
}
async function handleLogin(e){
  e.preventDefault();const fd=new FormData(e.currentTarget),identifier=fd.get('identifier').trim().toLowerCase(),password=fd.get('password');const hash=await hashText(password);
  const account=state.accounts.find(a=>a.email===identifier||(a.providerId&&a.providerId.toLowerCase()===identifier));
  if(!account||account.passwordHash!==hash){$('#loginError').textContent='We couldn’t match those details. Check them and try again.';$('#loginError').classList.add('show');return}
  state.currentAccountId=account.id;state.role=account.role;state.route=account.role==='provider'?'providerHome':'customerHome';persist();render();toast(`Welcome back, ${account.first} 👋`);
}
function handleProviderApplication(e){
  e.preventDefault();const p=currentProvider(),fd=new FormData(e.currentTarget);const required=['category','service','about','areas','availability','experience'];
  if(required.some(k=>!fd.get(k)?.trim())||!fd.get('agree')){$('#applicationError').textContent='Please complete each section and tick the agreement before sending.';$('#applicationError').classList.add('show');return}
  Object.assign(p,{category:fd.get('category'),service:fd.get('service').trim(),about:fd.get('about').trim(),price:fd.get('price').trim()||'Ask for a quote',areas:fd.get('areas').split(',').map(x=>x.trim()).filter(Boolean),availability:fd.get('availability').trim(),experience:fd.get('experience').trim(),applicationStatus:'submitted',status:'pending'});
  persist();nav('providerHome');toast('Application sent to the Sisters Desk ✨');
}
function handleAdminLogin(e){
  e.preventDefault();const fd=new FormData(e.currentTarget);
  if(fd.get('user').trim().toLowerCase()!=='sisters'||fd.get('password')!=='neighbourly-demo'){$('#adminError').textContent='That desk login did not match.';$('#adminError').classList.add('show');return}
  state.role='admin';state.currentAccountId=null;state.route='adminHome';persist();render();toast('Sisters Desk open 👭');
}

function bindDynamic(){
  $$('[data-action="signout"]').forEach(b=>b.onclick=signOut);
  $$('[data-action="how"]').forEach(b=>b.onclick=()=>modal('How Neighbourly works',`Neighbourly helps neighbours find local service providers, manage service requests and build trusted repeat connections. Customers do not post public jobs in this launch phase. Neighbourly connects people; the actual service agreement is between customer and provider. If something goes wrong, report it in-app and the Neighbourly Sisters Desk reviews the case.`));
  $$('[data-action="quickCategory"]').forEach(b=>b.onclick=()=>{state.ui.category=b.dataset.category;state.ui.search='';state.ui.area='All';nav('findHelp')});
  $$('[data-action="toggleProviderFav"]').forEach(b=>b.onclick=()=>{const id=b.dataset.id,a=currentAccount();if(!a)return;const i=state.favourites.providers.findIndex(x=>x.customerId===a.id&&x.providerId===id);if(i>=0)state.favourites.providers.splice(i,1);else state.favourites.providers.push({customerId:a.id,providerId:id});persist();render();toast(i>=0?'Removed from favourites':'Saved for next time ♥')});
  $$('[data-action="viewProvider"]').forEach(b=>b.onclick=()=>showProvider(b.dataset.id));
  $$('[data-action="requestService"]').forEach(b=>b.onclick=()=>requestModal(b.dataset.id));
  $$('[data-action="cancelRequest"]').forEach(b=>b.onclick=()=>{const r=state.requests.find(x=>x.id===b.dataset.id);if(r){r.status='cancelled';persist();render();toast('Request cancelled')}});
  $$('[data-action="acceptRequest"]').forEach(b=>b.onclick=()=>{const r=state.requests.find(x=>x.id===b.dataset.id);if(r){r.status='accepted';persist();render();toast('Booked — customer updated ✓')}});
  $$('[data-action="declineRequest"]').forEach(b=>b.onclick=()=>{const r=state.requests.find(x=>x.id===b.dataset.id);if(r){r.status='cancelled';persist();render();toast('Request declined')}});
  $$('[data-action="providerComplete"]').forEach(b=>b.onclick=()=>{const r=state.requests.find(x=>x.id===b.dataset.id);if(r){r.status='accepted';r.providerMarkedDone=true;persist();toast('Marked done — waiting for customer confirmation')}});
  $$('[data-action="confirmComplete"]').forEach(b=>b.onclick=()=>{const r=state.requests.find(x=>x.id===b.dataset.id);if(r){r.status='completed';persist();render();toast('Service completed 🎉')}});
  $$('[data-action="rateProvider"]').forEach(b=>b.onclick=()=>ratingModal(b.dataset.id));
  $$('[data-action="toggleCustomerFav"]').forEach(b=>b.onclick=()=>toggleCustomerFav(b.dataset.id));
  $$('[data-action="customerNote"]').forEach(b=>b.onclick=()=>customerNoteModal(b.dataset.id));
  $$('[data-action="approveProvider"]').forEach(b=>b.onclick=()=>{const p=state.providers.find(x=>x.providerId===b.dataset.id);if(p){p.status='approved';p.verified=true;p.applicationStatus='approved';persist();render();toast(`${p.name} is now live ✓`)}});
  $$('[data-action="changesProvider"]').forEach(b=>b.onclick=()=>{const p=state.providers.find(x=>x.providerId===b.dataset.id);if(p){p.status='changes';p.applicationStatus='changes';persist();render();toast('Marked as needing changes')}});
  $$('[data-action="closeReport"]').forEach(b=>b.onclick=()=>{const r=state.reports.find(x=>x.id===b.dataset.id);if(r){r.status='closed';persist();render();toast('Case marked reviewed')}});
  $$('[data-action="reportGeneral"]').forEach(b=>b.onclick=reportModal);
  $$('[data-action="membershipInfo"]').forEach(b=>b.onclick=()=>modal('Membership principles','Keep entry affordable in lower-income launch areas. Offer clear value rather than selling leads one-by-one. Let prices adjust fairly by area as Neighbourly expands. Never sell verification, ratings or trust. We’ll set the actual tiers and prices together before launch.'));
}
function showProvider(id){const p=state.providers.find(x=>x.providerId===id);if(!p)return;modal(`${p.name} · ${p.service}`,`${p.about}\n\nAreas: ${(p.areas||[]).join(', ')}\nAvailability: ${p.availability}\nStarting price: ${p.price}\nRating: ★ ${p.rating} (${p.reviews} reviews)`,'Request service',()=>requestModal(id))}
function requestModal(providerId){
  const p=state.providers.find(x=>x.providerId===providerId),a=currentAccount();if(!p||!a)return;
  formModal('Request a service',`<p class="muted">You’re requesting <b>${esc(p.service)}</b> from ${esc(p.name)}.</p><div class="field"><label>Preferred date<input name="date" type="date" required></label></div><div class="field"><label>Anything they should know?<textarea name="note" maxlength="300" placeholder="Keep it short and useful."></textarea></label></div>${connectionNote(true)}<button class="btn primary" type="submit">Send request</button>`,fd=>{
    state.requests.push({id:uid('req'),providerId,providerName:p.name,customerId:a.id,customerName:`${a.first} ${a.last}`,service:p.service,date:fd.get('date'),note:fd.get('note').trim(),status:'awaiting',createdAt:Date.now(),customerRating:null});persist();closeModal();toast('Request sent — fingers crossed 🤝');setTimeout(()=>nav('customerServices'),350)
  });
}
function ratingModal(requestId){
  formModal('How did it go?',`<p class="muted">A quick rating helps good local providers grow.</p><div class="field"><label>Rating<select name="rating" required><option value="">Choose stars</option>${[5,4,3,2,1].map(n=>`<option value="${n}">${'★'.repeat(n)} ${n}/5</option>`).join('')}</select></label></div><div class="field"><label>Short review<textarea name="review" maxlength="280" placeholder="Friendly, useful and honest."></textarea></label></div><div class="tag-row"><span>On time</span><span>Friendly</span><span>Great work</span><span>Good value</span></div><button class="btn primary" type="submit">Share my review</button>`,fd=>{const r=state.requests.find(x=>x.id===requestId);if(!r||!fd.get('rating'))return;r.customerRating=Number(fd.get('rating'));r.review=fd.get('review').trim();const p=state.providers.find(x=>x.providerId===r.providerId);if(p){const total=p.rating*p.reviews+r.customerRating;p.reviews+=1;p.rating=Math.round((total/p.reviews)*10)/10}persist();closeModal();render();toast('Thanks — review shared ♥')});
}
function toggleCustomerFav(customerId){const p=currentProvider();if(!p)return;const i=state.favourites.customers.findIndex(x=>x.providerId===p.providerId&&x.customerId===customerId);if(i>=0)state.favourites.customers.splice(i,1);else state.favourites.customers.push({providerId:p.providerId,customerId});persist();render();toast(i>=0?'Removed from favourites':'Favourite customer saved ♥')}
function customerNoteModal(customerId){
  const p=currentProvider(),c=state.accounts.find(a=>a.id===customerId);if(!p||!c)return;const key=`${p.providerId}:${customerId}`,existing=state.customerNotes[key]||{};
  formModal(`Private note · ${c.first}`,`<div class="privacy-banner"><b>Only you can see this</b><span>Keep notes factual and related to working together.</span></div><div class="field"><label>Would you work with this customer again?<select name="rating"><option value="">Not rated</option>${[5,4,3,2,1].map(n=>`<option value="${n}" ${Number(existing.rating)===n?'selected':''}>${n}/5</option>`).join('')}</select></label></div><div class="field"><label>Private note<textarea name="note" maxlength="300" placeholder="e.g. Confirm parking before travelling.">${esc(existing.note||'')}</textarea></label></div><button class="btn primary" type="submit">Save private note</button>`,fd=>{state.customerNotes[key]={rating:Number(fd.get('rating'))||null,note:fd.get('note').trim(),updatedAt:Date.now()};persist();closeModal();render();toast('Private customer note saved')});
}
function reportModal(){
  formModal('Tell the Sisters Desk',`<p class="muted">Every report is reviewed by admin.</p><div class="field"><label>What happened?<select name="reason" required><option value="">Choose a reason</option><option>Safety concern</option><option>Service dispute</option><option>Payment disagreement</option><option>Inappropriate behaviour</option><option>Something else</option></select></label></div><div class="field"><label>Details<textarea name="details" required maxlength="500" placeholder="Tell us what we need to understand."></textarea></label></div>${connectionNote(true)}<button class="btn primary" type="submit">Send report</button>`,fd=>{const a=currentAccount();if(!fd.get('reason')||!fd.get('details').trim())return;state.reports.push({id:uid('rep'),reason:fd.get('reason'),details:fd.get('details').trim(),fromName:a?`${a.first} ${a.last}`:'Neighbour',fromId:a?.id||null,status:'awaiting',createdAt:Date.now()});persist();closeModal();toast('Report sent to the Sisters Desk')});
}

function closeModal(){document.querySelector('.modal-backdrop')?.remove();document.removeEventListener('keydown',escapeModal)}
function escapeModal(e){if(e.key==='Escape')closeModal()}
function modal(title,body,actionLabel=null,action=null){
  closeModal();const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="close-row"><h2>${esc(title)}</h2><button type="button" aria-label="Close">×</button></div><div class="modal-copy">${esc(body).replace(/\n/g,'<br>')}</div>${actionLabel?`<button class="btn primary" id="modalAction">${esc(actionLabel)}</button>`:''}</div>`;document.body.appendChild(wrap);wrap.querySelector('.close-row button').onclick=closeModal;wrap.onclick=e=>{if(e.target===wrap)closeModal()};if(actionLabel)$('#modalAction',wrap).onclick=()=>{closeModal();action?.()};document.addEventListener('keydown',escapeModal);wrap.querySelector('button')?.focus();
}
function formModal(title,html,onSubmit){
  closeModal();const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<div class="modal" role="dialog" aria-modal="true"><div class="close-row"><h2>${esc(title)}</h2><button type="button" aria-label="Close">×</button></div><form class="form modal-form">${html}</form></div>`;document.body.appendChild(wrap);wrap.querySelector('.close-row button').onclick=closeModal;wrap.onclick=e=>{if(e.target===wrap)closeModal()};wrap.querySelector('form').onsubmit=e=>{e.preventDefault();onSubmit(new FormData(e.currentTarget))};document.addEventListener('keydown',escapeModal);wrap.querySelector('input,select,textarea,button')?.focus();
}

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(()=>{}));
render();
