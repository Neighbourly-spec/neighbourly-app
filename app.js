const $ = (s,root=document)=>root.querySelector(s);
const app = $('#app');
const toastEl = $('#toast');
const state = {
  route: localStorage.getItem('neighbourly_route') || 'welcome',
  user: JSON.parse(localStorage.getItem('neighbourly_user') || 'null'),
  posts: JSON.parse(localStorage.getItem('neighbourly_posts') || 'null') || [
    {id:'p1',type:'request',name:'Ayesha',area:'Westridge',title:'Need help collecting groceries',desc:'I need someone nearby to collect a small grocery order tomorrow afternoon.',price:'R80',saved:false},
    {id:'p2',type:'offer',name:'Jason',area:'Portlands',title:'Can help with basic garden clean-ups',desc:'Available Saturday morning for light garden tidying and sweeping.',price:'From R120',saved:false},
    {id:'p3',type:'request',name:'Nadia',area:'Lentegeur',title:'Lift needed to local clinic',desc:'Looking for a safe local lift on Wednesday morning. In-app arrangements only.',price:'R100',saved:false}
  ],
  requests: JSON.parse(localStorage.getItem('neighbourly_requests') || '[]'),
  messages: JSON.parse(localStorage.getItem('neighbourly_messages') || '[]')
};

function persist(){
  localStorage.setItem('neighbourly_route',state.route);
  localStorage.setItem('neighbourly_user',JSON.stringify(state.user));
  localStorage.setItem('neighbourly_posts',JSON.stringify(state.posts));
  localStorage.setItem('neighbourly_requests',JSON.stringify(state.requests));
  localStorage.setItem('neighbourly_messages',JSON.stringify(state.messages));
}
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>toastEl.classList.remove('show'),2200)}
function nav(route){state.route=route;persist();render();window.scrollTo({top:0,behavior:'smooth'})}
function initials(name='Neighbour'){return name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function shell(content,active='home'){
  const navItems=[['home','⌂','Home'],['browse','⌕','Browse'],['create','＋','Post'],['messages','✉','Messages'],['profile','☺','Profile']];
  return `<main class="app-shell">${content}<nav class="bottom-nav">${navItems.map(([r,i,l])=>`<button class="nav-btn ${active===r?'active':''}" data-nav="${r}"><span>${i}</span>${l}</button>`).join('')}</nav></main>`
}
function topbar(title='Neighbourly'){
  return `<div class="topbar"><div class="brand-mini"><div class="brand-dot">♥</div>${escapeHtml(title)}</div><button class="icon-btn" data-nav="safety" aria-label="Safety">🛡️</button></div>`
}

function welcome(){
  return `<main class="app-shell"><section class="hero"><img src="neighbourly-brand.png" alt="Neighbourly logo"><h1>For the community, by the community.</h1><p>Find trusted help nearby, support a neighbour, and keep local connections inside one safer community space.</p><div class="stack"><button class="btn primary" data-nav="signup">Get started</button><button class="btn secondary" data-action="learn">Learn more</button></div></section></main>`
}
function signup(){
  return `<main class="app-shell"><section class="screen">${topbar('Create your profile')}<div class="card"><form id="signupForm" class="form" novalidate>
    <div class="field"><label>Full name</label><input name="name" maxlength="60" autocomplete="name" required placeholder="Your name"><div class="error" data-error="name">Please enter your name.</div></div>
    <div class="field"><label>Neighbourhood</label><input name="area" maxlength="50" required placeholder="e.g. Westridge"><div class="error" data-error="area">Please enter your neighbourhood.</div></div>
    <div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required placeholder="you@example.com"><div class="error" data-error="email">Please enter a valid email.</div></div>
    <div class="field"><label>Create password</label><input name="password" type="password" minlength="8" autocomplete="new-password" required placeholder="At least 8 characters"><div class="error" data-error="password">Use at least 8 characters.</div></div>
    <div class="hint">ID verification is part of the planned safety model, but this prototype does not upload or store identity documents yet.</div>
    <button class="btn primary" type="submit">Create account</button><button class="btn ghost" type="button" data-nav="welcome">Back</button>
  </form></div></section></main>`
}
function home(){
 const user=state.user||{name:'Neighbour',area:'Your area'};
 const recent=[...state.posts].slice(0,2);
 return shell(`<section class="screen">${topbar()}<div class="greeting"><h1>Hi, ${escapeHtml(user.name.split(' ')[0])} 👋</h1><p>${escapeHtml(user.area)} · what do you need today?</p></div>
 <div class="quick-grid">
  <button class="quick" data-nav="browse"><div class="emoji">🔎</div><b>Browse help</b><small>See local requests and offers.</small></button>
  <button class="quick" data-nav="create"><div class="emoji">🤝</div><b>Ask for help</b><small>Create a clear local request.</small></button>
  <button class="quick" data-nav="orders"><div class="emoji">📋</div><b>My activity</b><small>Track requests and responses.</small></button>
  <button class="quick" data-nav="safety"><div class="emoji">🛡️</div><b>Safety centre</b><small>Report, block, or get support.</small></button>
 </div>
 <div class="section-title"><h2>Nearby</h2><button data-nav="browse">See all</button></div><div class="feed">${recent.map(listingCard).join('')}</div></section>`,'home')
}
function listingCard(p){
 return `<article class="card listing" data-id="${p.id}"><div class="listing-top"><div class="avatar">${initials(p.name)}</div><div class="meta"><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.area)} · recently</small></div><span class="pill ${p.type==='offer'?'offer':''}">${p.type==='offer'?'Offering help':'Needs help'}</span></div><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.desc)}</p><div class="listing-footer"><span class="price">${escapeHtml(p.price)}</span><div class="tiny-actions"><button data-action="save" data-id="${p.id}">${p.saved?'★':'☆'}</button><button data-action="respond" data-id="${p.id}">Respond</button></div></div></article>`
}
function browse(){
 return shell(`<section class="screen">${topbar('Browse')}<div class="field"><input id="search" placeholder="Search help, area, or neighbour…" aria-label="Search listings"></div><div class="section-title"><h2>Community listings</h2><button data-action="filter">Filter</button></div><div id="feed" class="feed">${state.posts.map(listingCard).join('')}</div></section>`,'browse')
}
function create(){
 return shell(`<section class="screen">${topbar('Create a post')}<div class="card"><form id="postForm" class="form" novalidate>
 <div class="field"><label>Post type</label><select name="type"><option value="request">I need help</option><option value="offer">I can offer help</option></select></div>
 <div class="field"><label>Title</label><input name="title" maxlength="80" required placeholder="What do you need or offer?"><div class="error" data-error="title">Add a short title.</div></div>
 <div class="field"><label>Details</label><textarea name="desc" maxlength="400" required placeholder="Add enough detail for someone to understand the task."></textarea><div class="error" data-error="desc">Please add some details.</div></div>
 <div class="field"><label>Price / contribution</label><input name="price" maxlength="30" placeholder="e.g. R100 or Free"><div class="hint">Keep payment arrangements in-app in the final version.</div></div>
 <button class="btn primary" type="submit">Post to my neighbourhood</button></form></div></section>`,'create')
}
function messages(){
 const rows=state.messages.length?state.messages.map(m=>`<div class="card message-row"><div class="avatar">${initials(m.name)}</div><div class="body"><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.preview)}</small></div>${m.unread?'<span class="badge">1</span>':''}</div>`).join(''):`<div class="card empty"><div class="big">💬</div><h3>No messages yet</h3><p>When you respond to a listing, the conversation will appear here.</p><button class="btn primary" data-nav="browse">Browse neighbours</button></div>`;
 return shell(`<section class="screen">${topbar('Messages')}<div class="stack">${rows}</div></section>`,'messages')
}
function profile(){
 const u=state.user||{name:'Neighbour',area:'Your area',email:''};
 return shell(`<section class="screen">${topbar('Profile')}<div class="card profile-header"><div class="profile-avatar">${initials(u.name)}</div><h2>${escapeHtml(u.name)}</h2><p>${escapeHtml(u.area)}</p><div class="stats"><div class="stat"><b>${state.requests.length}</b><small>Posts</small></div><div class="stat"><b>${state.posts.filter(p=>p.saved).length}</b><small>Saved</small></div><div class="stat"><b>—</b><small>Rating</small></div></div></div>
 <div class="section-title"><h2>Account</h2></div><div class="stack"><button class="btn secondary" data-nav="orders">My activity</button><button class="btn secondary" data-nav="saved">Wishlist / saved</button><button class="btn secondary" data-nav="safety">Safety & support</button><button class="btn secondary" data-action="logout">Sign out</button></div></section>`,'profile')
}
function orders(){
 const mine=state.requests;
 const body=mine.length?mine.map(listingCard).join(''):`<div class="card empty"><div class="big">📋</div><h3>No activity yet</h3><p>Your help requests and offers will show here.</p><button class="btn primary" data-nav="create">Create your first post</button></div>`;
 return shell(`<section class="screen">${topbar('My activity')}<div class="feed">${body}</div></section>`,'profile')
}
function saved(){
 const list=state.posts.filter(p=>p.saved);
 return shell(`<section class="screen">${topbar('Saved')}<div class="feed">${list.length?list.map(listingCard).join(''):`<div class="card empty"><div class="big">☆</div><h3>Nothing saved yet</h3><p>Save useful listings so you can return to them later.</p><button class="btn primary" data-nav="browse">Browse listings</button></div>`}</div></section>`,'profile')
}
function safety(){
 return shell(`<section class="screen">${topbar('Safety centre')}<div class="card safety"><h2>Keep it Neighbourly 🛡️</h2><ul class="safety-list"><li>Keep conversations inside the app.</li><li>Do not post sensitive personal information publicly.</li><li>Meet in appropriate, safe locations where possible.</li><li>Report suspicious behaviour rather than handling it alone.</li><li>For immediate danger, contact local emergency services.</li></ul><button class="emergency" data-action="emergency">Emergency guidance</button></div>
 <div class="section-title"><h2>Support</h2></div><div class="stack"><button class="btn secondary" data-action="report">Report a user or listing</button><button class="btn secondary" data-action="admin">Contact Neighbourly support</button></div></section>`,'home')
}
function render(){
 const routes={welcome,signup,home,browse,create,messages,profile,orders,saved,safety};
 if(state.route!=='welcome'&&state.route!=='signup'&&!state.user) state.route='welcome';
 app.innerHTML=(routes[state.route]||welcome)();
 bind();
}
function bind(){
 document.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',()=>nav(el.dataset.nav)));
 const sf=$('#signupForm'); if(sf) sf.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(sf);const name=fd.get('name').trim(),area=fd.get('area').trim(),email=fd.get('email').trim(),password=fd.get('password');let ok=true;[['name',name],['area',area],['email',/^\S+@\S+\.\S+$/.test(email)],['password',password.length>=8]].forEach(([k,v])=>{const er=$(`[data-error="${k}"]`);const valid=k==='email'||k==='password'?v:Boolean(v);er.classList.toggle('show',!valid);ok=ok&&valid});if(!ok)return;state.user={name,area,email};state.route='home';persist();render();toast('Welcome to Neighbourly!')});
 const pf=$('#postForm'); if(pf) pf.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(pf);const title=fd.get('title').trim(),desc=fd.get('desc').trim();$('.error[data-error="title"]').classList.toggle('show',!title);$('.error[data-error="desc"]').classList.toggle('show',desc.length<10);if(!title||desc.length<10)return;const p={id:'u'+Date.now(),type:fd.get('type'),name:state.user.name,area:state.user.area,title,desc,price:fd.get('price').trim()||'Discuss in app',saved:false};state.posts.unshift(p);state.requests.unshift(p);persist();nav('orders');toast('Your post is live')});
 const search=$('#search'); if(search) search.addEventListener('input',()=>{const q=search.value.toLowerCase().trim();$('#feed').innerHTML=state.posts.filter(p=>[p.name,p.area,p.title,p.desc].join(' ').toLowerCase().includes(q)).map(listingCard).join('')||`<div class="card empty"><div class="big">🔎</div><h3>No matches</h3><p>Try another search.</p></div>`;bindDynamic()});
 bindDynamic();
}
function bindDynamic(){
 document.querySelectorAll('[data-action="save"]').forEach(btn=>btn.onclick=()=>{const p=state.posts.find(x=>x.id===btn.dataset.id);if(!p)return;p.saved=!p.saved;persist();render();toast(p.saved?'Saved to wishlist':'Removed from saved')});
 document.querySelectorAll('[data-action="respond"]').forEach(btn=>btn.onclick=()=>{const p=state.posts.find(x=>x.id===btn.dataset.id);if(!p)return;state.messages.unshift({id:'m'+Date.now(),name:p.name,preview:`You responded to “${p.title}”`,unread:false});persist();toast(`Conversation with ${p.name} started`);setTimeout(()=>nav('messages'),450)});
 const learn=$('[data-action="learn"]');if(learn)learn.onclick=()=>modal('How Neighbourly works','Browse local requests and offers, keep communication inside the app, and use safety/reporting tools whenever something feels wrong. Worker-specific tools are intentionally not included in this MVP.');
 const filter=$('[data-action="filter"]');if(filter)filter.onclick=()=>modal('Filters','The next build will add distance, category, price and request/offer filters. The data model is already separated so these can be added without restructuring posts.');
 const logout=$('[data-action="logout"]');if(logout)logout.onclick=()=>{state.user=null;state.route='welcome';persist();render();toast('Signed out')};
 const emergency=$('[data-action="emergency"]');if(emergency)emergency.onclick=()=>modal('Emergency guidance','Neighbourly is not an emergency service. If there is immediate danger, contact the appropriate local emergency service. The production app should use location-aware emergency links rather than guessing a number.');
 const report=$('[data-action="report"]');if(report)report.onclick=()=>modal('Report something','Reporting flow placeholder: the production version will capture the listing/user, reason, optional notes, evidence permissions, and moderation status.');
 const admin=$('[data-action="admin"]');if(admin)admin.onclick=()=>modal('Contact support','Support chat/contact will be connected after the account and moderation backend are in place.');
}
function modal(title,body){
 const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<div class="modal" role="dialog" aria-modal="true"><div class="close-row"><h2>${escapeHtml(title)}</h2><button aria-label="Close">×</button></div><p style="color:var(--muted);line-height:1.55">${escapeHtml(body)}</p></div>`;document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('.close-row button'))wrap.remove()})
}
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(()=>{}))}
render();
