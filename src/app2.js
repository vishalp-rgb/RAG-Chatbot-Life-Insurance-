/* ============ part 2: chat UI + guided flow ============ */
(function(){
'use strict';
const L = window.LIFE;
const {GOALS,GOAL_ORDER,CFG,CATS,P,CO,S,ROWS,COLS,SL,LF,R,F,LOGOS,isAnnuityCat,typeOfCat,rowsOf,money,pct,inrShort} = L;
const LOGO_URL = window.BC_LOGO;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const store = {
  get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
};
const thread=$('#thread'), scroller=$('#scroll'), inp=$('#inp');
let busy=false, sessionId=null, sessions=store.get('lifeai.sessions',[]), userName=store.get('lifeai.name','Advisor');

/* ---------- content ---------- */
const TYPE_INFO = {
  'Term':{icon:'shield_person',t:'Term plan',d:'Pure protection — the highest cover for the lowest premium.'},
  'Non-Par':{icon:'verified',t:'Non-Par (guaranteed)',d:'Every benefit is fixed upfront — nothing depends on markets or bonuses.'},
  'Par':{icon:'redeem',t:'Par (with bonuses)',d:'Guaranteed benefits plus bonuses the insurer may declare — shown at 4% and 8% illustrations.'},
  'ULIP':{icon:'show_chart',t:'ULIP (market-linked)',d:'Invests in market funds for higher growth potential — nothing is guaranteed.'},
  'TULIP':{icon:'monitor_heart',t:'TULIP',d:'A ULIP with life cover built in.'},
  'Annuity':{icon:'currency_rupee',t:'Annuity (lifelong income)',d:'Turns a corpus into a regular income for life.'}
};
const RECO = {
  FAMILY_PROTECTION:{ty:'Term', why:"The aim is to replace the family's income if the unexpected happens — and nothing delivers more cover per rupee of premium than a term plan."},
  SECOND_INCOME:{ty:'Non-Par', why:'A second income should be predictable. Non-Par plans fix the income at the start, so the client knows exactly how much arrives and when. Par plans add bonus potential but the extra is not guaranteed.'},
  WEALTH_CREATION:{ty:'Non-Par', why:'A guaranteed lump sum is the safest base for wealth building. If the client wants more upside and accepts variability, Par (bonuses) or a ULIP (market-linked) are the next steps up.'},
  CHILD:{ty:'Non-Par', why:'Education and marriage are fixed-date, fixed-size expenses. Guaranteed payouts on known dates remove market-timing risk when the money is actually needed.'},
  RETIREMENT:{ty:'Annuity', why:'Retirement planning is about turning savings into an income that cannot be outlived. An annuity pays for life, however long the client lives.'}
};
const GOAL_PROMPT = {
  FAMILY_PROTECTION:'protecting the family’s income',
  SECOND_INCOME:'building a second income',
  WEALTH_CREATION:'creating wealth',
  CHILD:'funding a child’s education or marriage',
  RETIREMENT:'planning retirement income'
};
const CAUTION = {
  'Term':'Premiums are low because there is typically no maturity benefit. Health, habits and income must be disclosed accurately — non-disclosure can lead to claim rejection.',
  'Non-Par':'Benefits are guaranteed only if all premiums are paid on time. Exiting early usually returns less than premiums paid — check the surrender value table.',
  'Par':'Bonuses are not guaranteed — the 4% and 8% columns are illustrations, not promises. Exiting early usually returns less than premiums paid.',
  'ULIP':'Returns depend on fund performance and are not guaranteed. There is a 5-year lock-in and charges reduce returns (see the yield-loss figures).',
  'TULIP':'Returns depend on fund performance and are not guaranteed. Charges reduce returns.',
  'Annuity':'The annuity option is generally irrevocable once bought, and annuity income is generally taxable as per the client’s slab. Compare single-life vs joint-life if there is a spouse.'
};
const GLOSS = {
  par:{t:'Par vs Non-Par', h:`<p><strong>Non-Par (guaranteed)</strong> plans fix every benefit when the policy starts. What the client is shown is what they get, regardless of markets or the insurer’s performance.</p><p><strong>Par (participating)</strong> plans pay guaranteed benefits <em>plus</em> bonuses declared by the insurer from its profits. Bonuses are not guaranteed, so illustrations are shown at 4% and 8%.</p>`},
  ulip:{t:'ULIP vs TULIP', h:`<p><strong>ULIP</strong> (unit-linked) plans invest the premium, after charges, in market-linked funds. The fund value can go up or down and is not guaranteed; there is a 5-year lock-in.</p><p><strong>TULIP</strong> is a ULIP with life cover built into the same policy, so it combines protection and market-linked growth.</p>`},
  irr:{t:'IRR (internal rate of return)', h:`<p>IRR is the single yearly return that makes everything the client pays in equal to everything they get back. It lets very different plans — lump sum, income, term — be compared on one yardstick.</p><p>For a term plan the IRR is calculated on the sum assured paid at the end of the cover, so it is a <em>cost</em> comparison: a higher IRR means cheaper cover.</p>`},
  ppt:{t:'Premium paying term vs policy term', h:`<p><strong>Premium paying term (PPT)</strong> is how many years the client pays. <strong>Policy term</strong> is how long the policy runs. They can differ — for example, pay for 10 years, policy runs 25.</p><p>A shorter PPT means a higher yearly premium but the client is done sooner; a longer PPT spreads the cost into smaller yearly amounts.</p>`},
  rop:{t:'Return of premium (ROP)', h:`<p>In an annuity, <strong>return of premium</strong> means the purchase price is paid back to the nominee after the annuitant’s death. The trade-off is a lower annuity rate than the same plan <em>without</em> ROP.</p>`},
  annuity:{t:'Immediate vs deferred annuity', h:`<p>An <strong>immediate annuity</strong> is bought with a single premium and the income starts straight away — suited to someone retiring now.</p><p>A <strong>deferred annuity</strong> is paid for over several years; income starts after a deferment period — suited to someone still working.</p>`},
  sa:{t:'Sum assured', h:`<p>The sum assured is the amount the nominee receives if the life insured passes away during the cover. A common rule of thumb is 10–15 times annual income, adjusted for loans and existing cover.</p>`},
  income:{t:'Early vs deferred income', h:`<p><strong>Early income</strong> starts soon in the policy’s life and runs for the income period.</p><p><strong>Deferred income</strong> starts after a waiting period; because the money stays invested longer, the yearly income is usually higher.</p>`}
};
const GLOSS_KEYS = ['par','ulip','irr','ppt','rop','annuity','sa','income'];
const GOAL_WHY = {
  FAMILY_PROTECTION:'Cover that replaces income and clears liabilities so the family’s lifestyle and goals stay on track.',
  SECOND_INCOME:'A predictable cash flow that arrives on schedule, independent of salary or markets.',
  WEALTH_CREATION:'A disciplined way to build a corpus for a future milestone while keeping some protection.',
  CHILD:'Money that arrives when the child needs it — fees or marriage — with the payout planned in advance.',
  RETIREMENT:'A lifelong income that starts when regular income stops.'
};

/* ---------- small builders ---------- */
const now = () => new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
const greet = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; };
const markHtml = () => `<span class="bc-mark"><img src="${LOGO_URL}" alt="Bajaj Capital" data-fb="mark"></span>`;
const chips = (list,extra='') => `<div class="chips ${extra}">${list.map(c=>`<button class="chip${c.primary?' primary':''}" data-a="${c.a}" data-v="${esc(c.v==null?'':c.v)}" data-l="${esc(c.l)}">${esc(c.l)}</button>`).join('')}</div>`;
const opts = list => `<div class="chips stack">${list.map(o=>`<button class="opt" data-a="${o.a}" data-v="${esc(o.v)}" data-l="${esc(o.l||o.t)}"><span class="ms fill">${o.icon||'arrow_forward'}</span><span><b>${esc(o.t)}${o.rec?'<span class="rec">Recommended</span>':''}</b><span class="d">${o.d||''}</span></span></button>`).join('')}</div>`;
const bubble = (inner,cls='') => `<div class="bbubble ${cls}">${inner}</div>`;
const lead = (icon,txt) => `<div class="lead"><span class="ms fill">${icon}</span>${txt}</div>`;
const ask = txt => `<div class="ask"><span class="ms fill">help</span><span>${txt}</span></div>`;
const tip = (icon,txt) => `<div class="tip"><span class="ms fill">${icon}</span><span>${txt}</span></div>`;
function sourcesHtml(list){
  if(!list.length) return '';
  return `<div class="sources"><div class="src-head"><span class="ms">menu_book</span>Sources · ${list.length}<span class="ms chev">expand_more</span></div><div class="src-list">${list.map((s,i)=>`<div class="src" data-n="${i+1}"><span class="src-n">${i+1}</span><span><span class="src-p">${esc(s.p)}</span><br><span class="src-f">${esc(s.f)}</span></span></div>`).join('')}</div></div>`;
}
function srcOf(idx){ const r=R[idx]; return {p:P[r[F.prod]]+' — '+CO[r[F.co]], f:`Life Product Selector playbook · ${S[r[F.src]]} · age ${r[F.age]} · ${L.st.ch}`}; }

function hydrate(root){
  root.querySelectorAll('img[data-logo]').forEach(i=>{ const u=LOGOS[i.dataset.logo]; if(u) i.src=u; });
}
document.addEventListener('error',e=>{
  const t=e.target; if(!t||t.tagName!=='IMG'||!t.dataset.fb) return;
  if(t.dataset.fb==='mark') t.parentNode.outerHTML='<span class="ms fill" style="font-size:20px;color:var(--red)">shield_with_heart</span>';
  else if(t.dataset.fb==='head') t.outerHTML='<span class="logo-fallback">BAJAJ CAPITAL</span>';
},true);

function scrollTo(row){
  if(row && row.offsetHeight > scroller.clientHeight-60) scroller.scrollTop = row.offsetTop - 16;
  else scroller.scrollTop = scroller.scrollHeight;
}
function userSay(text){
  const d=document.createElement('div'); d.className='urow';
  d.innerHTML=`<div class="ububble">${esc(text)}</div><div class="umeta"><span>${now()}</span><span class="ms fill">done_all</span></div>`;
  thread.appendChild(d); scroller.scrollTop=scroller.scrollHeight; save(true);
}
async function post(html,delay=550){
  busy=true;
  const t=document.createElement('div'); t.className='brow';
  t.innerHTML=`<div class="bav"><div class="bav-in">${markHtml()}</div></div><div class="bcol"><div class="bbubble"><div class="typing"><span></span><span></span><span></span></div></div></div>`;
  thread.appendChild(t); scroller.scrollTop=scroller.scrollHeight;
  await sleep(delay); t.remove();
  const row=document.createElement('div'); row.className='brow';
  row.innerHTML=`<div class="bav"><div class="bav-in">${markHtml()}</div></div><div class="bcol">${html}<div class="bmeta">${now()}</div></div>`;
  thread.appendChild(row); hydrate(row); scrollTo(row);
  busy=false; save();
  return row;
}

/* ---------- state helpers ---------- */
const st = () => L.st;
function clear(...f){ f.forEach(k=>{ L.st[k]=(k==='x')?'':null; }); L.st.res=null; L.st.shown=0; }
function setCh(){ const c=L.bestChannelFor(L.st.cat); if(c) L.st.ch=c; }
function pillsHtml(){
  const s=L.st, cf=CFG[s.cat]; const a=L.nearestAge(s.cat,s.age);
  const items=[GOALS[s.goal].lbl, 'Age '+s.age, TYPE_INFO[s.ty].t.replace(/ \(.*\)/,'')];
  if(CATS && s.cat!=='TERM' && s.cat!=='ULIP' && s.cat!=='TULIP') items.push(L.catTitle(s.cat));
  if(s.cat==='TERM' && s.x) items.push(sa(s.x));
  if(isAnnuityCat(s.cat) && s.x) items.push(s.x);
  if(s.ppt!=null) items.push('Pay: '+L.pptLabel(s.ppt).t);
  if(s.pt!=null) items.push(cap(L.ptHeading(cf))+': '+L.ptLabel(s.pt,cf).t);
  items.push('Channel: '+s.ch);
  return `<div class="sum">${items.map(i=>`<span class="pill">${esc(i)}</span>`).join('')}</div>`;
}
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
const sa = v => ({'50 Lac':'₹50 Lakh','1 Crore':'₹1 Crore','2 Crore':'₹2 Crore','5 Crore':'₹5 Crore'}[v]||v);
const plural = (n,w) => n+' '+w+(n===1?'':'s');

/* ---------- the guided flow ---------- */
async function nextStep(){
  const s=L.st; inp.placeholder='Ask about a client, a specific plan or a policy term...';
  if(!s.goal) return askGoal();
  if(s.age==null) return askAge();
  if(!s.ty) return askType();
  if(!s.cat) return askCat();
  if((s.cat==='TERM'||isAnnuityCat(s.cat)) && !s.x) return askX();
  if(s.ppt==null) return askPPT();
  if(s.pt==null) return askPT();
  return showResults();
}

function welcome(){
  const nP=new Set(R.map(r=>r[F.prod])).size, nC=new Set(R.map(r=>r[F.co])).size;
  const pill=document.createElement('div'); pill.className='daypill'; pill.textContent='Today';
  thread.appendChild(pill);
  return post(
    bubble(`${lead('waving_hand',`${greet()}, ${esc(userName)}!`)}<p>Hope your client day is going well. I can recommend from the <strong>Life Select List</strong> — ${nP} plans across ${nC} insurers.</p>${ask('What is your client’s <strong>life goal</strong>?')}`)
    + chips(GOAL_ORDER.map(g=>({a:'goal',v:g,l:GOALS[g].lbl})).concat([{a:'askprod',v:'',l:'Ask about a specific plan'},{a:'gloss_menu',v:'',l:'Explain a policy term'}])), 400);
}
function askGoal(){
  return post(bubble(`${lead('flag','Let’s start with the goal')}${ask('What is your client’s <strong>life goal</strong>?')}`)+chips(GOAL_ORDER.map(g=>({a:'goal',v:g,l:GOALS[g].lbl}))));
}
function ageRange(goal){
  const ages=GOALS[goal].cats.flatMap(c=>rowsOf(c).map(r=>r[F.age]));
  return [Math.min(...ages),Math.max(...ages)];
}
function askAge(){
  const g=GOALS[st().goal], [lo,hi]=ageRange(st().goal);
  inp.placeholder='Type the client’s age, e.g. 37';
  return post(
    bubble(`${lead('check_circle',esc(g.lbl))}${ask('How old is the <strong>client</strong>? Type the age below, e.g. <em>37</em>.')}`));
}
function distinctProducts(cats){
  const set=new Set(), cos=new Set();
  cats.forEach(c=>{ const a=L.nearestAge(c,st().age); rowsOf(c).forEach(r=>{ if(r[F.age]===a){ set.add(r[F.prod]); cos.add(r[F.co]); } }); });
  return {n:set.size, c:cos.size};
}
function snapNote(cats){
  const a=L.nearestAge(cats[0],st().age); return '';
}
function askType(){
  const g=st().goal, cats=GOALS[g].cats.filter(c=>rowsOf(c).length);
  const types=[...new Set(cats.map(typeOfCat))];
  const rec=RECO[g].ty;
  const info=t=>{ const d=distinctProducts(cats.filter(c=>typeOfCat(c)===t)); return d; };
  if(types.length===1){
    const t=types[0]; st().ty=t; const d=info(t);
    return post(bubble(`${lead('lightbulb','My recommendation: '+TYPE_INFO[t].t)}<p>${RECO[g].why}</p><p class="sub">${plural(d.n,'plan')} from ${plural(d.c,'insurer')} are available for a ${st().age}-year-old.${snapNote(cats)}</p>`)).then(nextStep);
  }
  const order=[rec,...types.filter(t=>t!==rec)].filter(t=>types.includes(t));
  const d=info(order[0]);
  return post(
    bubble(`${lead('lightbulb','My recommendation: '+TYPE_INFO[order[0]].t)}${ask('Which <strong>type of product</strong> would you like to explore?')}`)
    + opts(order.map((t,i)=>({a:'type',v:t,t:TYPE_INFO[t].t,d:TYPE_INFO[t].d+` · ${plural(info(t).n,'plan')}`,icon:TYPE_INFO[t].icon,rec:i===0}))));
}
function recCat(cats){
  const age=st().age, g=st().goal; let pref;
  if(g==='SECOND_INCOME') pref=age<=40?['DEFERRED_INCOME_NPAR','EARLY_INCOME_NPAR','MONTHLY_INCOME_NPAR','EARLY_INCOME_PAR','DEFERRED_INCOME_PAR']:['EARLY_INCOME_NPAR','MONTHLY_INCOME_NPAR','DEFERRED_INCOME_NPAR','EARLY_INCOME_PAR','DEFERRED_INCOME_PAR'];
  else if(g==='RETIREMENT') pref=age>=55?['ANNUITY_SP_NROP','ANNUITY_SP_ROP']:['ANNUITY_RP_10','ANNUITY_RP_7','ANNUITY_RP_5','ANNUITY_RP_12','ANNUITY_RP_8','ANNUITY_RP_6'];
  else pref=['LUMPSUM_NPAR','LUMPSUM_PAR','EARLY_INCOME_NPAR','EARLY_INCOME_PAR','DEFERRED_INCOME_NPAR','DEFERRED_INCOME_PAR'];
  return pref.find(c=>cats.includes(c))||cats[0];
}
function recWhy(c){
  const age=st().age;
  if(st().goal==='SECOND_INCOME'&&c.startsWith('DEFERRED')) return `At ${age} there is time for the money to stay invested longer, which usually means a higher income later.`;
  if(st().goal==='SECOND_INCOME'&&c.startsWith('EARLY')) return `At ${age} an income that starts sooner is usually the better fit.`;
  if(st().goal==='RETIREMENT'&&c.startsWith('ANNUITY_SP')) return `At ${age}, income that starts right away fits someone retiring soon.`;
  if(st().goal==='RETIREMENT') return `At ${age}, paying during working years and starting income at retirement fits best.`;
  if(c.startsWith('LUMPSUM')) return 'A single, known payout on a known date is the simplest way to fund a milestone.';
  return '';
}
function askCat(){
  const s=st(), cats=GOALS[s.goal].cats.filter(c=>rowsOf(c).length&&typeOfCat(c)===s.ty);
  if(cats.length===1){ s.cat=cats[0]; setCh(); return nextStep(); }
  const rec=recCat(cats);
  const order=[rec,...cats.filter(c=>c!==rec)];
  const heading=s.goal==='RETIREMENT'?'How should the annuity be bought?':'How should the money come back to the client?';
  return post(
    bubble(`${lead('tune','Plan structure')}${ask('<strong>'+heading+'</strong>')}`)
    + opts(order.map((c,i)=>({a:'cat',v:c,t:L.catTitle(c),d:L.catDesc(c)+` · ${plural(distinctProducts([c]).n,'plan')}`,icon:i===0?'star':'arrow_forward',rec:i===0}))));
}
function askX(){
  const s=st(), rows=L.baseRows('ppt'); // ppt/pt not yet chosen so this lists everything at this age/channel
  if(s.cat==='TERM'){
    const vals=[...new Set(rows.map(r=>SL[r[F.sl]]))].filter(Boolean).sort((a,b)=>L.saVal(a)-L.saVal(b));
    if(vals.length===1){ s.x=vals[0]; return nextStep(); }
    const def=vals.includes('1 Crore')?'1 Crore':vals[0];
    return post(bubble(`${lead('shield_person','Sum assured')}${ask('How much <strong>life cover</strong> does the client need?')}`)
      + chips(vals.map(v=>({a:'x',v,l:sa(v),primary:v===def}))));
  }
  const vals=[...new Set(rows.map(r=>LF[r[F.lf]]))].filter(Boolean).sort();
  if(vals.length===1){ s.x=vals[0]; return nextStep(); }
  return post(bubble(`${lead('group','Who is covered?')}${ask('Should the annuity cover a <strong>single life</strong> or a <strong>joint life</strong>?')}`)
    + chips(vals.map(v=>({a:'x',v,l:v,primary:v==='Single Life'}))));
}
function countBy(rows,fn){ const m={}; rows.forEach(r=>{ (m[fn(r)] ||= new Set()).add(r[F.prod]); }); return m; }
function askPPT(){
  const s=st(), rows=L.baseRows('ppt'), cf=CFG[s.cat];
  const cnt=countBy(rows,r=>ROWS[r[F.row]]), vals=Object.keys(cnt).sort(L.axSort);
  if(!vals.length) return noData();
  if(vals.length===1){ s.ppt=vals[0]; return nextStep(); }
  return post(bubble(`${lead('event_repeat','Payment pattern')}${ask('How should the client <strong>pay the premium</strong>?')}`)
    + opts(vals.map(v=>({a:'ppt',v,t:L.pptLabel(v).t,d:`${L.pptLabel(v).d} · ${plural(cnt[v].size,'plan')}`,icon:'payments',l:L.pptLabel(v).t}))));
}
function askPT(){
  const s=st(), rows=L.baseRows('pt'), cf=CFG[s.cat];
  const cnt=countBy(rows,r=>COLS[r[F.col]]), vals=Object.keys(cnt).sort(L.axSort);
  if(!vals.length) return noData();
  if(vals.length===1){ s.pt=vals[0]; return nextStep(); }
  const q={ 'deferment':'How long should the <strong>deferment period</strong> be?', 'income period':'For how long should the <strong>income</strong> be paid?', 'cover duration':'Until when should the <strong>cover</strong> run?'}[cf.basis]||'What <strong>policy term</strong> should the plan run for?';
  return post(bubble(`${lead('schedule',cap(L.ptHeading(cf)))}${ask(q)}`)
    + opts(vals.map(v=>({a:'pt',v,t:L.ptLabel(v,cf).t,d:`${L.ptLabel(v,cf).d} · ${plural(cnt[v].size,'plan')}`,icon:'schedule',l:L.ptLabel(v,cf).t}))));
}
function noData(){
  const s=st(), other=s.ch==='FPC'?'ANG/LAP':'FPC', n=L.chRowsCount(s.cat,other);
  const list=[{a:'change',v:'cat',l:'Pick a different structure'},{a:'change',v:'age',l:'Change age'}];
  if(n) list.unshift({a:'ch',v:other,l:'Try the '+other+' channel',primary:true});
  return post(`<div class="bbubble error"><span class="ms fill">info</span><div><p>No ${esc(CFG[s.cat].lbl)} plans match this combination in the ${esc(s.ch)} playbook.</p></div></div>`+chips(list));
}

/* ---------- results ---------- */
function planCard(idx,rank){
  const r=R[idx], cat=CATS[r[F.cat]], cf=CFG[cat], co=CO[r[F.co]], m=L.coMark(co), v=L.valData(r,cf), stats=L.statsData(r,cat).slice(0,3);
  const logo=m.logo?`<img data-logo="${esc(co)}" alt="${esc(co)}">`:`<span class="badge" style="background:${m.badge.bg};color:${m.badge.fg}">${esc(m.badge.t)}</span>`;
  const tag=rank===1?'<span class="plan-best">Best match</span>':`<span class="plan-best" style="background:var(--red-soft);color:var(--red)">#${rank}</span>`;
  const big=v.dual?`<div class="plan-big"><div class="dual"><div><em>${v.a.lbl}</em><b>${v.a.v}</b></div><div><em>${v.b.lbl}</em><b>${v.b.v}</b></div></div><span>${esc(v.unit)}</span></div>`:`<div class="plan-big"><b>${v.big}</b><span>${esc(v.unit)}</span></div>`;
  return `<div class="plan"><div class="plan-logo">${logo}${tag}</div><div class="plan-body"><div class="plan-name">${esc(P[r[F.prod]])}</div><div class="plan-ins">${esc(co)}</div>${big}${stats.map(x=>`<div class="plan-pt"><span class="ms fill">check_circle</span><span>${esc(x.l)}: <strong>${esc(x.v)}</strong></span></div>`).join('')}<div class="plan-act"><button class="chip sm" data-a="explain" data-v="${idx}" data-l="Explain ${esc(P[r[F.prod]])}">Explain this plan</button></div></div></div>`;
}
function actionChips(extra=[]){
  const s=st(), other=s.ch==='FPC'?'ANG/LAP':'FPC', list=[...extra];
  list.push({a:'change',v:'ppt',l:'Change payment pattern'});
  if(s.cat==='TERM') list.push({a:'change',v:'x',l:'Change sum assured'});
  if(isAnnuityCat(s.cat)) list.push({a:'change',v:'x',l:'Change life covered'});
  list.push({a:'change',v:'cat',l:'Change structure'});
  if(L.chRowsCount(s.cat,other)) list.push({a:'ch',v:other,l:'Switch to '+other});
  list.push({a:'reset',v:'',l:'New query'});
  return chips(list);
}
async function showResults(){
  const s=st(), cf=CFG[s.cat], res=L.rankedPlans();
  if(!res.length) return noData();
  s.res=res; s.shown=Math.min(3,res.length);
  const rows=L.baseRows(), mn=L.metricName(rows,cf);
  const age=L.nearestAge(s.cat,s.age);
  const top=res.slice(0,s.shown);
  const parTip=cf.par?tip('info',`Par plans are ranked on the <strong>${s.rank==='i4'?'4%':'8%'}</strong> illustration.${s.rank==='i4'?'':' Bonuses are not guaranteed.'}`):'';
  const ex=[{a:'explain',v:res[0],l:'Explain '+P[R[res[0]][F.prod]],primary:true}];
  if(res.length>1) ex.push({a:'compare',v:Math.min(3,res.length),l:'Compare top '+Math.min(3,res.length)});
  if(res.length>s.shown) ex.push({a:'more',v:'',l:`Show more plans (${res.length-s.shown})`});
  if(cf.par) ex.push({a:'rank',v:s.rank==='i4'?'i8':'i4',l:'Rank at '+(s.rank==='i4'?'8%':'4%')});
  await post(
    bubble(`${lead('workspace_premium','Top picks for this client')}${pillsHtml()}<p>${plural(res.length,'plan')} matched. Ranked by <strong>${mn}</strong>, best first.${age!==s.age?` Data is closest at age ${age}.`:''}</p>`)
    + `<div class="plans">${top.map((idx,i)=>planCard(idx,i+1)).join('')}</div>`
    + parTip
    + sourcesHtml(top.map(srcOf))
    + actionChips(ex), 650);
}
async function showMore(){
  const s=st(), res=s.res||[]; if(s.shown>=res.length) return;
  const next=res.slice(s.shown,s.shown+3), start=s.shown; s.shown+=next.length;
  const rest=res.length-s.shown;
  const ex=[]; if(rest>0) ex.push({a:'more',v:'',l:`Show more plans (${rest})`});
  ex.push({a:'compare',v:Math.min(3,res.length),l:'Compare top '+Math.min(3,res.length)});
  await post(bubble(`${lead('workspace_premium',`Plans ${start+1}–${s.shown}`)}`)+`<div class="plans more">${next.map((idx,i)=>planCard(idx,start+i+1)).join('')}</div>`+sourcesHtml(next.map(srcOf))+actionChips(ex));
}

/* ---------- explanation of a plan ---------- */
const payText = v => v==='1'?'once (single premium)':/^\d+$/.test(v)?`for ${v} years`:v==='Pay 10'?'for 10 years':v==='Pay till 60'?'till age 60':'every year for the full term';
function sentences(r,cat){
  const cf=CFG[cat], m=money, out=[], prem=r[F.prem], rowV=ROWS[r[F.row]], colV=COLS[r[F.col]];
  const pay=payText(rowV), isNum=/^\d+$/.test(colV);
  if(cat==='TERM'){
    out.push(`Pays <strong>${m(r[F.sa])}</strong> to the nominee if the life insured passes away during the cover.`);
    out.push(`Premium of <strong>${m(prem)}</strong> a year, payable ${pay}.`);
    out.push(`Cover lasts ${/till 85/.test(colV)?'until age 85':'for the whole of life'}.`);
    const t=L.termIRR(r); if(t!==null) out.push(`If the claim comes at the end of the cover, the effective IRR is ${pct(t)} — lower premium for the same cover means a higher number.`);
  } else if(isAnnuityCat(cat)){
    out.push(`Pay <strong>${m(prem)}</strong> ${pay} and receive <strong>${m(r[F.ann])}</strong> every year as income for life — a ${pct(r[F.ar])} first-year annuity rate.`);
    if(LF[r[F.lf]]) out.push(`Covers ${LF[r[F.lf]].toLowerCase()}${LF[r[F.lf]]==='Joint Life'?' — income continues to the surviving spouse':''}.`);
    if(cat==='ANNUITY_SP_ROP') out.push('Return of premium: the purchase price goes back to the nominee after the annuitant’s death.');
    else if(cat==='ANNUITY_SP_NROP') out.push('No return of premium, which typically gives a higher annuity rate than the ROP variant.');
    else if(isNum&&colV!=='0') out.push(`Income starts after a ${colV}-year deferment.`);
  } else if(cat==='ULIP'||cat==='TULIP'){
    out.push(`Premium of <strong>${m(prem)}</strong> a year ${pay}, invested in market-linked funds.`);
    if(r[F.mat]) out.push(`At an 8% illustration the fund value at maturity is about <strong>${m(r[F.mat])}</strong> — not guaranteed.`);
    if(r[F.ylm]) out.push(`Charges reduce the return by about ${pct(r[F.ylm])} a year by maturity (yield loss).`);
  } else if(/^LUMPSUM/.test(cat)){
    out.push(`Pay <strong>${m(prem)}</strong> a year ${pay}${isNum&&ROWS[r[F.row]]!=='1'?` (about ${m(prem*(+rowV||0))} in total)`:''}.`);
    if(r[F.mat4]&&r[F.mat8]) out.push(`After ${colV} years the maturity benefit is illustrated at <strong>${m(r[F.mat4])}</strong> (4%) to <strong>${m(r[F.mat8])}</strong> (8%) — bonuses are not guaranteed.`);
    else out.push(`After ${colV} years you receive a maturity benefit of <strong>${m(r[F.mat]||r[F.mat8])}</strong>.`);
    const i=r[F.i8]||r[F.m]; if(i) out.push(`Effective return (IRR): ${pct(i)}.`);
    if(r[F.lc]) out.push(`Life cover during the term: ${m(r[F.lc])}.`);
  } else {
    const ipn=parseFloat(L.IP[r[F.ip]]||'')||null;
    out.push(`Pay <strong>${m(prem)}</strong> a year ${pay}.`);
    if(r[F.inc]) out.push(`Receive an income of <strong>${m(r[F.inc])}</strong> a year${ipn?` for ${ipn} years`:''}${r[F.istart]?`, starting from policy year ${r[F.istart]}`:''}${cf.par?' (8% illustration)':''}.`);
    if(r[F.mat]) out.push(`A maturity benefit of <strong>${m(r[F.mat])}</strong> is paid at the end.`);
    const i=r[F.i8]||r[F.m]; if(i) out.push(`Effective return (IRR): ${pct(i)}.`);
    if(r[F.lc]) out.push(`Life cover: ${m(r[F.lc])}.`);
  }
  return out;
}
function tableHtml(d){
  return `<table>${d.groups.map(g=>`<tr><th colspan="2">${esc(g.title)}</th></tr>`+g.rows.map(x=>`<tr><td class="k">${esc(x.k)}</td><td${x.hi?' class="hi"':''}>${esc(x.v)}</td></tr>`).join('')).join('')}</table>`;
}
async function explain(idx){
  const r=R[idx], cat=CATS[r[F.cat]], cf=CFG[cat], d=L.detail(idx), ty=typeOfCat(cat), s=st(); s.focus=r[F.prod]; s.focusAge=r[F.age];
  const bullets=sentences(r,cat).map(x=>`<li>${x}</li>`).join('');
  const has=(s.res&&s.res.length>1);
  const ex=[{a:'prod',v:r[F.prod],l:'All details on this plan',primary:true}]; if(has) ex.push({a:'compare',v:Math.min(3,s.res.length),l:'Compare top '+Math.min(3,s.res.length)});
  if(s.res&&s.shown<s.res.length) ex.push({a:'more',v:'',l:'Show more plans'});
  await post(
    bubble(`${lead('lightbulb',esc(d.name))}<div class="sub">${esc(d.co)} · ${esc(L.catTitle(cat))}</div>
      <p><strong>How it works</strong> <span class="cite" data-src="1">1</span></p><ul>${bullets}</ul>
      <p><strong>Why it fits</strong> — ${esc(GOAL_WHY[s.goal]||'')}</p>`)
    + bubble(`${lead('table_chart','Key numbers')}${tableHtml(d)}`,'wide')
    + tip('info',`<span><strong>Keep in mind:</strong> ${esc(CAUTION[ty])}</span>`)
    + bubble(ask('Ask me anything else about <strong>'+esc(d.name)+'</strong> — e.g. <em>premium at age 45</em> or <em>pay terms</em>.'))
    + sourcesHtml([srcOf(idx)])
    + actionChips(ex), 700);
}
async function compare(n){
  const s=st(), idxs=(s.res||[]).slice(0,n); if(idxs.length<2) return noCompare();
  const ds=idxs.map(L.detail), groups=[], seen={};
  ds.forEach(d=>d.groups.forEach(g=>{ if(!seen[g.title]){ seen[g.title]={title:g.title,keys:[]}; groups.push(seen[g.title]); } g.rows.forEach(x=>{ if(!seen[g.title].keys.includes(x.k)) seen[g.title].keys.push(x.k); }); }));
  const val=(d,t,k)=>{ const g=d.groups.find(x=>x.title===t); const x=g&&g.rows.find(y=>y.k===k); return x?x.v:'—'; };
  const head=`<tr><th></th>${ds.map(d=>`<th>${esc(d.name)}<br><span style="font-weight:500;color:var(--muted)">${esc(d.co)}</span></th>`).join('')}</tr>`;
  const body=groups.map(g=>`<tr><th colspan="${ds.length+1}">${esc(g.title)}</th></tr>`+g.keys.map(k=>`<tr><td class="k">${esc(k)}</td>${ds.map(d=>`<td>${esc(val(d,g.title,k))}</td>`).join('')}</tr>`).join('')).join('');
  await post(
    bubble(`${lead('compare_arrows','Side-by-side comparison')}<p class="sub">Same client, same payment pattern — ranked by ${esc(L.metricName(L.baseRows(),CFG[s.cat]))}.</p><table class="cmp">${head}${body}</table>`,'wide')
    + sourcesHtml(idxs.map(srcOf))
    + actionChips(idxs.map(i=>({a:'explain',v:i,l:'Explain '+P[R[i][F.prod]]}))), 750);
}
function noCompare(){
  return post(bubble(`${lead('compare_arrows','Compare plans')}<p>I compare plans for a specific client profile, so let’s get a shortlist first.</p>${ask('What is the client’s <strong>life goal</strong>?')}`)+chips(GOAL_ORDER.map(g=>({a:'goal',v:g,l:GOALS[g].lbl}))));
}

/* ---------- glossary ---------- */
function glossMenu(){
  return post(bubble(`${lead('menu_book','Policy terms')}${ask('Which <strong>term</strong> would you like explained?')}`)+chips(GLOSS_KEYS.map(k=>({a:'gloss',v:k,l:GLOSS[k].t}))));
}
function gloss(k){
  const g=GLOSS[k];
  return post(bubble(`${lead('lightbulb',esc(g.t))}${g.h}`)+chips([{a:'gloss_menu',v:'',l:'Another term'},{a:'goal_menu',v:'',l:'Recommend a plan',primary:true}]));
}


/* ---------- plan lookup: free text → a specific product, answered from its playbook rows ---------- */
const byProd={}; R.forEach((r,i)=>{ (byProd[r[F.prod]] ||= []).push(i); });
const STOP=new Set('plan plans life term par income pension guaranteed wealth savings insurance policy product products lumpsum annuity ulip tulip irr premium cover the a an of for me about explain tell details detail info information what whats is are how does do work works show give specific in on and with please can you i want know more this that it its any all my client regarding describe features feature benefits benefit single'.split(' '));
const normQ=s=>s.toLowerCase().replace(/\bto\b|\btwo\b/g,'2').replace(/[^a-z0-9]+/g,' ').trim();
const PTOK=P.map(n=>normQ(n).split(' ').filter(Boolean));
const EQUIV={bajaj:['balic'],allianz:['balic'],balic:['bajaj'],prudential:['pru'],pru:['prudential'],tata:['tata'],aia:['aia']};
function lev(a,b){ const m=a.length,n=b.length; if(Math.abs(m-n)>2) return 9; const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]); for(let j=1;j<=n;j++) d[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[m][n]; }
function tokMatch(q,t,loose){
  if(q===t) return true;
  if((EQUIV[q]||[]).includes(t)) return true;
  if(q.length>=4&&t.startsWith(q)) return true;
  const d=lev(q,t);
  return (q.length>=5&&d<=1)||(q.length>=9&&d<=2)||(loose&&q.length>=4&&d<=2);
}
/* which query-token positions does product i cover? joined tokens ("e"+"touch" = "etouch") count for all their parts */
function coverage(qt,i,loose){
  const cov=new Set(), pt=PTOK[i];
  for(let s=0;s<qt.length;s++) for(let len=1;len<=3&&s+len<=qt.length;len++){
    const j=qt.slice(s,s+len).join('');
    if(pt.some(t=>tokMatch(j,t,loose))) for(let k=s;k<s+len;k++) cov.add(k);
  }
  return cov;
}
function queryTokens(text){
  const all=normQ(text).split(' ').filter(Boolean), keep=[];
  all.forEach(t=>{ if(!STOP.has(t)&&!/^\d+$/.test(t)) keep.push(t); });
  return keep;
}
function findProducts(text){
  const full=' '+normQ(text)+' '; const exact=P.map((n,i)=>i).filter(i=>full.includes(' '+PTOK[i].join(' ')+' '));
  if(exact.length){ const mx=Math.max(...exact.map(i=>PTOK[i].length)); return exact.filter(i=>PTOK[i].length===mx); }
  const qt=queryTokens(text); if(!qt.length) return [];
  const hits=P.map((n,i)=>({i,h:coverage(qt,i,false).size}));
  const best=Math.max(...hits.map(x=>x.h)); if(best===0) return [];
  const need=qt.length===1?1:Math.max(2,Math.ceil(qt.length*0.6));
  if(best<need) return [];
  let c=hits.filter(x=>x.h===best).map(x=>x.i);
  const nums=normQ(text).split(' ').filter(t=>/^\d+$/.test(t)&&t!=='2');
  if(nums.length){ const w=c.filter(i=>nums.every(n=>PTOK[i].includes(n))); if(w.length) return w; }
  if(qt.length===1&&(qt[0].length<5||c.length>6)) return [];
  if(c.length>1){ // a base plan plus extra variants ("eTouch II" vs "eTouch II (Cover till 99)"): take the base unless the query names the variant
    const minLen=Math.min(...c.map(i=>PTOK[i].length)), base=c.filter(i=>PTOK[i].length===minLen);
    if(base.length===1&&c.every(i=>PTOK[i].slice(0,minLen).join(' ')===PTOK[base[0]].join(' '))) return base;
  }
  return c;
}
function suggestProducts(text){
  const qt=queryTokens(text); if(!qt.length) return [];
  return P.map((n,i)=>({i,h:coverage(qt,i,true).size})).filter(x=>x.h>0).sort((x,y)=>y.h-x.h||PTOK[x.i].length-PTOK[y.i].length).slice(0,5).map(x=>x.i);
}
function siblingsOf(pid){
  const me=PTOK[pid].join(' ');
  return P.map((n,i)=>i).filter(i=>i!==pid&&(PTOK[i].join(' ').startsWith(me+' ')||me.startsWith(PTOK[i].join(' ')+' ')));
}
const rowsAt=(pid,age)=>byProd[pid].filter(i=>R[i][F.age]===age);
function ageOf(pid,want){
  const ages=[...new Set(byProd[pid].map(i=>R[i][F.age]))].sort((a,b)=>a-b);
  return ages.reduce((b,x)=>Math.abs(x-want)<Math.abs(b-want)?x:b,ages[0]);
}
const fmtV=v=>v.dual?`${v.a.lbl} ${v.a.v} · ${v.b.lbl} ${v.b.v}`:`${v.big}`;
function patternTable(pid,age,mode){
  const cat=CATS[R[byProd[pid][0]][F.cat]], cf=CFG[cat];
  const seen={}, list=[];
  rowsAt(pid,age).forEach(i=>{ const r=R[i], k=[ROWS[r[F.row]],COLS[r[F.col]],SL[r[F.sl]],LF[r[F.lf]],r[F.fpc]].join('|'); if(!seen[k]){ seen[k]=1; list.push(i); } });
  list.sort((x,y)=>L.axSort(ROWS[R[x][F.row]],ROWS[R[y][F.row]])||L.axSort(COLS[R[x][F.col]],COLS[R[y][F.col]]));
  const hasX=cat==='TERM'||isAnnuityCat(cat);
  const head=['Pay',cap(L.ptHeading(cf)),hasX?(cat==='TERM'?'Sum assured':'Life'):null,mode==='premium'?'Premium p.a.':L.metricName([R[list[0]]],cf).replace(/^./,c=>c.toUpperCase()),mode==='all'?'Premium p.a.':null].filter(Boolean);
  const body=list.slice(0,14).map(i=>{ const r=R[i], v=L.valData(r,cf);
    const cells=[L.pptLabel(ROWS[r[F.row]]).t, L.ptLabel(COLS[r[F.col]],cf).t, hasX?(cat==='TERM'?sa(SL[r[F.sl]]):LF[r[F.lf]]):null, mode==='premium'?(money(r[F.prem])||'—'):fmtV(v), mode==='all'?(money(r[F.prem])||'—'):null].filter(x=>x!==null);
    return `<tr>${cells.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`; }).join('');
  return `<table><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${body}</table>${list.length>14?`<p class="sub">Showing 14 of ${list.length} combinations.</p>`:''}`;
}
function prodSources(pid,age){
  const sheets=[...new Set(byProd[pid].map(i=>S[R[i][F.src]]))];
  return sourcesHtml(sheets.map(sh=>({p:P[pid]+' — '+CO[R[byProd[pid][0]][F.co]], f:`Life Product Selector playbook · ${sh}${age?' · age '+age:''}`})));
}
async function productChoice(list,q){
  return post(bubble(`${lead('manage_search','I found '+list.length+' matching plans')}<p>Your search “${esc(q)}” matches several variants of the same plan family.</p>${ask('Which <strong>variant</strong> do you mean?')}`)
    + opts(list.slice(0,8).map(pid=>{ const cat=CATS[R[byProd[pid][0]][F.cat]]; return {a:'prod',v:pid,t:P[pid],d:`${CO[R[byProd[pid][0]][F.co]]} · ${L.catTitle(cat)}`,icon:'description',l:P[pid]}; })));
}
async function productOverview(pid,wantAge){
  const s=st(); s.focus=pid;
  const rowsAll=byProd[pid].map(i=>R[i]), cat=CATS[rowsAll[0][F.cat]], cf=CFG[cat], co=CO[rowsAll[0][F.co]], ty=typeOfCat(cat);
  const ages=[...new Set(rowsAll.map(r=>r[F.age]))].sort((a,b)=>a-b);
  const want=wantAge||s.focusAge||s.age||35, age=ageOf(pid,want); s.focusAge=age;
  const bestI=rowsAt(pid,age).slice().sort((x,y)=>L.metricOf(R[y])-L.metricOf(R[x]))[0], best=bestI==null?null:R[bestI];
  const ppts=[...new Set(rowsAll.map(r=>ROWS[r[F.row]]))].sort(L.axSort).map(v=>L.pptLabel(v).t);
  const pts=[...new Set(rowsAll.map(r=>COLS[r[F.col]]))].filter(v=>!(cat==='TERM'&&v==='Cover till 99')).sort(L.axSort).map(v=>L.ptLabel(v,cf).t);
  const chans=[...new Set(rowsAll.map(r=>r[F.fpc]===1?'FPC':'ANG/LAP'))];
  const facts=[
    `<strong>Insurer:</strong> ${esc(co)} · <strong>Type:</strong> ${esc(TYPE_INFO[ty].t)}`,
    `<strong>Entry ages in the playbook:</strong> ${ages[0]}–${ages[ages.length-1]}`,
    `<strong>Premium paying options:</strong> ${esc(ppts.join(', '))}`,
    `<strong>${cap(L.ptHeading(cf))} options:</strong> ${esc(pts.join(', '))}`,
  ];
  if(cat==='TERM') facts.push(`<strong>Sum assured options:</strong> ${esc([...new Set(rowsAll.map(r=>SL[r[F.sl]]))].filter(Boolean).sort((a,b)=>L.saVal(a)-L.saVal(b)).map(sa).join(', '))}`);
  if(isAnnuityCat(cat)) facts.push(`<strong>Life covered:</strong> ${esc([...new Set(rowsAll.map(r=>LF[r[F.lf]]))].filter(Boolean).join(', '))}`);
  facts.push(`<strong>Sold via:</strong> ${esc(chans.join(' and '))} playbook`);
  const ageChips=[];
  await post(
    bubble(`${lead('description',esc(P[pid]))}<div class="sub">${esc(co)} · ${esc(L.catTitle(cat))}</div>
      <p><strong>What it is</strong> <span class="cite" data-src="1">1</span> — ${esc(L.catDesc(cat))}</p>
      <ul>${facts.map(f=>`<li>${f}</li>`).join('')}</ul>
      ${best?`<p><strong>Example at age ${age}</strong> (best-ranked pattern: ${esc(L.pptLabel(ROWS[best[F.row]]).t)} · ${esc(L.ptLabel(COLS[best[F.col]],cf).t)})</p><ul>${sentences(best,cat).map(x=>`<li>${x}</li>`).join('')}</ul>`:''}`)
    + bubble(`${lead('table_chart','All patterns at age '+age)}${patternTable(pid,age,'all')}`,'wide')
    + tip('info',`<span><strong>Keep in mind:</strong> ${esc(CAUTION[ty])}</span>`)
    + prodSources(pid,age)
    + bubble(`${ask('Ask me anything about <strong>'+esc(P[pid])+'</strong> — for example <em>premium at age 40</em>, <em>pay terms</em>, <em>maturity benefit</em> or <em>similar plans</em>.')}`)
    + chips([...ageChips,...siblingsOf(pid).slice(0,3).map(i=>({a:'prod',v:i,l:'View '+P[i]})),{a:'similar',v:pid,l:'Compare with similar plans',primary:true},{a:'askprod',v:'',l:'Ask about another plan'},{a:'reset',v:'',l:'New query'}]), 700);
}
const BROCHURE_RX=/rider|exclusion|surrender|loan|tax|80c|10\(10d\)|claim|waiting|grace|free[- ]?look|eligib|nominee|lock|revival|paid[- ]?up|medical|underwrit|brochure|document|feature|bonus rate|fund option|switch|partial|withdraw|cancel|suicide|critical|accident/;
async function askAbout(t){
  const s=st(), pid=s.focus; if(pid==null) return false;
  const am=t.match(/(?:at|age|aged)\s*(\d{2})|(\d{2})\s*(?:y\.?o|yrs?|years?)/);
  const age=ageOf(pid,am?+(am[1]||am[2]):(s.focusAge||s.age||35)); s.focusAge=age;
  const rowsAll=byProd[pid].map(i=>R[i]), cat=CATS[rowsAll[0][F.cat]], cf=CFG[cat], nm=P[pid];
  const head=txt=>`${lead('description',esc(nm))}<div class="sub">${txt}</div>`;
  const follow=chips([{a:'prod',v:pid,l:'Full overview of this plan',primary:true},{a:'similar',v:pid,l:'Compare with similar plans'},{a:'askprod',v:'',l:'Ask about another plan'}]);
  if(/similar|alternative|compar|better|other plans|competitor/.test(t)){ await similar(pid); return true; }
  if(/overview|explain|about|detail|tell me|how does it work|describe|what is it/.test(t)&&!BROCHURE_RX.test(t)){ await productOverview(pid,age); return true; }
  if(/premium paying|pay term|ppt|how long.*pay|pay for|payment/.test(t)){
    const v=[...new Set(rowsAll.map(r=>ROWS[r[F.row]]))].sort(L.axSort).map(x=>L.pptLabel(x));
    await post(bubble(`${head('Premium paying options')}<ul>${v.map(x=>`<li><strong>${esc(x.t)}</strong> — ${esc(x.d)}</li>`).join('')}</ul>`)+prodSources(pid,null)+follow); return true; }
  if(/policy term|income period|deferment|duration|how long|term options|cover till|tenure/.test(t)){
    const v=[...new Set(rowsAll.map(r=>COLS[r[F.col]]))].filter(x=>!(cat==='TERM'&&x==='Cover till 99')).sort(L.axSort).map(x=>L.ptLabel(x,cf));
    await post(bubble(`${head(cap(L.ptHeading(cf))+' options')}<ul>${v.map(x=>`<li><strong>${esc(x.t)}</strong> — ${esc(x.d)}</li>`).join('')}</ul>`)+prodSources(pid,null)+follow); return true; }
  if(/\bage\b|entry|minimum|maximum|eligible age|how old/.test(t)&&!am){
    const ages=[...new Set(rowsAll.map(r=>r[F.age]))].sort((a,b)=>a-b);
    await post(bubble(`${head('Entry ages')}<p>The playbook has figures for entry ages <strong>${ages[0]} to ${ages[ages.length-1]}</strong>${ages.length<8?` (${ages.join(', ')})`:''}.</p>`)+prodSources(pid,null)+follow); return true; }
  if(/channel|fpc|ang|lap/.test(t)){
    const ch=[...new Set(rowsAll.map(r=>r[F.fpc]===1?'FPC':'ANG/LAP'))];
    await post(bubble(`${head('Channel')}<p>This plan appears in the <strong>${ch.join(' and ')}</strong> playbook.</p>`)+prodSources(pid,null)+follow); return true; }
  if(/insurer|company|who (makes|offers|issues)|which company/.test(t)){
    await post(bubble(`${head('Insurer')}<p>${esc(nm)} is offered by <strong>${esc(CO[rowsAll[0][F.co]])}</strong>.</p>`)+prodSources(pid,null)+follow); return true; }
  if(/premium|cost|how much|price/.test(t)&&!/irr/.test(t)){
    await post(bubble(`${head('Premium at age '+age)}${patternTable(pid,age,'premium')}`,'wide')+prodSources(pid,age)+follow); return true; }
  if(/irr|return|yield|rate/.test(t)){
    await post(bubble(`${head(cap(L.metricName(rowsAt(pid,age).map(i=>R[i]),cf))+' at age '+age)}${patternTable(pid,age,'return')}`,'wide')+prodSources(pid,age)+follow); return true; }
  if(/maturity|income|payout|benefit|sum assured|cover|annuity|corpus|fund value/.test(t)&&!BROCHURE_RX.test(t)){
    const best=rowsAt(pid,age).slice().sort((x,y)=>L.metricOf(R[y])-L.metricOf(R[x]))[0], d=L.detail(best);
    await post(bubble(`${head('Benefits at age '+age+' — best-return pattern')}<ul>${sentences(R[best],cat).map(x=>`<li>${x}</li>`).join('')}</ul>`)+bubble(`${tableHtml(d)}`,'wide')+prodSources(pid,age)+follow); return true; }
  await post(`<div class="bbubble error"><span class="ms fill">info</span><div><p><strong>${esc(nm)}</strong> — that detail isn’t in the playbook data I have loaded. The playbook covers premiums, terms, returns, maturity and income figures by age and pattern.</p><p>Details such as riders, exclusions, surrender value, tax treatment and claim process will come from the product brochures once the knowledge base is connected.</p></div></div>`+follow);
  return true;
}
async function similar(pid){
  const s=st(), rowsAll=byProd[pid].map(i=>R[i]), cat=CATS[rowsAll[0][F.cat]];
  const age=ageOf(pid,s.focusAge||s.age||35), best=rowsAt(pid,age).slice().sort((x,y)=>L.metricOf(R[y])-L.metricOf(R[x]))[0], r=R[best];
  s.age=age; s.cat=cat; s.ty=typeOfCat(cat); s.ch=r[F.fpc]===1?'FPC':'ANG/LAP'; s.ppt=ROWS[r[F.row]]; s.pt=COLS[r[F.col]];
  s.x=cat==='TERM'?SL[r[F.sl]]:isAnnuityCat(cat)?LF[r[F.lf]]:''; s.goal=GOAL_ORDER.find(g=>GOALS[g].cats.includes(cat))||s.goal||'WEALTH_CREATION';
  s.res=null; s.shown=0; return showResults();
}
async function handleProductText(text){
  const c=findProducts(text); if(!c.length) return false;
  if(c.length===1){ await productOverview(c[0]); return true; }
  await productChoice(c,text); return true;
}
function askProductPrompt(){
  const ex=['HDFC Click 2 Achieve','ICICI Pru iProtect Smart Plus','TATA AIA Fortune Guarantee','MAX Smart Wealth Plan','Kotak E-Term'];
  return post(bubble(`${lead('manage_search','Ask about a specific plan')}<p>Type a plan name and I’ll pull up everything the playbook has on it — premiums, pay terms, returns, maturity and income by age. Then you can keep asking about that plan.</p>${ask('Which <strong>plan</strong> would you like to look at?')}`)+chips(ex.map(e=>({a:'prodq',v:e,l:e}))));
}

/* ---------- dispatcher ---------- */
async function act(a,v,label){
  if(busy) return;
  const s=st();
  switch(a){
    case 'goal': userSay(label); s.goal=v; clear('ty','cat','x','ppt','pt'); return nextStep();
    case 'age': userSay(label); s.age=+v; clear('ppt','pt'); return nextStep();
    case 'type': userSay(label); s.ty=v; clear('cat','x','ppt','pt'); return nextStep();
    case 'cat': userSay(label); s.cat=v; setCh(); clear('x','ppt','pt'); return nextStep();
    case 'x': userSay(label); s.x=v; clear('ppt','pt'); return nextStep();
    case 'ppt': userSay(label); s.ppt=v; clear('pt'); return nextStep();
    case 'pt': userSay(label); s.pt=v; L.st.res=null; return nextStep();
    case 'more': userSay(label); return showMore();
    case 'explain': userSay(label); return explain(+v);
    case 'compare': userSay(label); return compare(+v);
    case 'rank': userSay(label); s.rank=v; return showResults();
    case 'ch': userSay(label); s.ch=v; clear('ppt','pt'); return nextStep();
    case 'change': userSay(label);
      if(v==='ppt'){ clear('ppt','pt'); } else if(v==='x'){ clear('x','ppt','pt'); } else if(v==='cat'){ clear('cat','x','ppt','pt'); } else if(v==='age'){ s.age=null; clear('ppt','pt'); }
      return nextStep();
    case 'goal_menu': userSay(label); s.goal=null; return nextStep();
    case 'gloss_menu': userSay(label); return glossMenu();
    case 'gloss': userSay(label); return gloss(v);
    case 'reset': userSay(label); newQuery(true); return;
    case 'askprod': userSay(label); return askProductPrompt();
    case 'prodq': userSay(label); if(!(await handleProductText(v))) await askProductPrompt(); return;
    case 'prod': userSay(label); return productOverview(+v);
    case 'prodage': { userSay(label); const [p,ag]=v.split('|'); return productOverview(+p,+ag); }
    case 'similar': userSay(label); return similar(+v);
  }
}
thread.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');
  if(b){
    const grp=b.closest('.chips'); if(grp&&grp.classList.contains('used')) return; if(busy) return;
    if(grp){ grp.classList.add('used'); b.classList.add('sel'); }
    act(b.dataset.a,b.dataset.v,b.dataset.l||b.textContent.trim()); return;
  }
  const head=e.target.closest('.src-head'); if(head){ head.parentNode.classList.toggle('open'); return; }
  const c=e.target.closest('.cite'); if(c){
    const row=c.closest('.brow'), box=row&&row.querySelector('.sources'); if(!box) return;
    box.classList.add('open'); const it=box.querySelector(`.src[data-n="${c.dataset.src}"]`); if(it){ it.classList.add('flash'); setTimeout(()=>it.classList.remove('flash'),1400); }
  }
});

/* ---------- free text ---------- */
const GLOSS_RX = {par:/\bnon[- ]?par\b|\bpar\b|participating/, ulip:/\bt?ulip\b|unit[- ]linked/, irr:/\birr\b|internal rate/, ppt:/\bppt\b|premium paying|paying term|policy term/, rop:/\brop\b|return of premium/, annuity:/\bannuit|deferred|immediate/, sa:/sum assured|cover amount/, income:/early income|deferred income/};
const GOAL_RX = {FAMILY_PROTECTION:/\bterm\b|protect|family|life cover|death benefit|income replace/, SECOND_INCOME:/second income|passive|monthly income|regular income|guaranteed income|early income|deferred income/, WEALTH_CREATION:/wealth|invest|lump ?sum|ulip|savings|corpus|grow/, CHILD:/child|education|marriage|\bkid|\bson\b|daughter/, RETIREMENT:/retire|pension|annuit/};
async function route(text){
  if(busy) return;
  const t=text.toLowerCase().trim(); if(!t) return;
  userSay(text);
  const s=st();
  const am=t.match(/(?:age|aged)\s*(\d{2})|(\d{2})\s*(?:y\.?o\.?|yrs?|years?)|^(\d{2})$/);
  const age=am?+(am[1]||am[2]||am[3]):null;
  if(s.goal&&s.age==null&&age&&age>=18&&age<=80){ s.age=age; clear('ppt','pt'); return nextStep(); }
  if(await handleProductText(text)) return;
  const refersToFocus=s.focus!=null&&(/\b(this|it|its|the plan|that plan)\b/.test(t)||/premium|pay|ppt|term|irr|return|maturity|income|age|cover|sum assured|channel|insurer|overview|about|detail|similar|compar|rider|exclusion|surrender|tax|claim|benefit|feature|eligib|bonus|loan|grace|free[- ]?look/.test(t));
  const glossHit=GLOSS_KEYS.some(k=>GLOSS_RX[k].test(t))&&!/\b(this|it|its|the plan)\b/.test(t)&&/what is|what’s|what's|explain|meaning|difference|\bvs\b|define/.test(t);
  if(refersToFocus&&!glossHit&&!GOAL_ORDER.some(g=>GOAL_RX[g].test(t)&&!/premium|pay|irr|maturity|age/.test(t))){ if(await askAbout(t)) return; }
  if(/compare/.test(t)){ return s.res&&s.res.length>1?compare(Math.min(3,s.res.length)):noCompare(); }
  if(/what is|what’s|what's|explain|meaning|difference|\bvs\b|define/.test(t)){
    for(const k of GLOSS_KEYS) if(GLOSS_RX[k].test(t)) return gloss(k);
    if(!GOAL_ORDER.some(g=>GOAL_RX[g].test(t))) return glossMenu();
  }
  for(const g of GOAL_ORDER) if(GOAL_RX[g].test(t)){
    s.goal=g; clear('ty','cat','x','ppt','pt'); if(age&&age>=18&&age<=80) s.age=age; return nextStep();
  }
  for(const k of GLOSS_KEYS) if(GLOSS_RX[k].test(t)) return gloss(k);
  const sug=suggestProducts(text);
  if(sug.length) return post(bubble(`${lead('manage_search','Did you mean one of these plans?')}<p>I couldn’t match “${esc(text)}” exactly.</p>${ask('Pick the <strong>plan</strong> you mean, or type the name again.')}`)
    + opts(sug.map(pid=>({a:'prod',v:pid,t:P[pid],d:`${CO[R[byProd[pid][0]][F.co]]} · ${L.catTitle(CATS[R[byProd[pid][0]][F.cat]])}`,icon:'description',l:P[pid]}))));
  if(!s.goal) return post(bubble(`${lead('support_agent','Let’s narrow it down')}<p>I recommend plans by walking through the client’s <strong>goal → product type → payment pattern</strong>. Tell me the goal, or tap one below.</p>`)+chips(GOAL_ORDER.map(g=>({a:'goal',v:g,l:GOALS[g].lbl}))));
  if(s.age==null) return post(bubble(`${lead('cake','Client age')}<p>Please type the client’s age as a number between 18 and 80 — for example <em>“37”</em>.</p>`));
  return post(bubble(`${lead('support_agent','Use the options above')}<p>Pick one of the choices in the last question — or start again with <strong>New query</strong>. Free-form answers from the product documents will arrive with the knowledge-base version.</p>`));
}
$('#send').addEventListener('click',()=>{ const v=inp.value; inp.value=''; route(v); });
inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); const v=inp.value; inp.value=''; route(v); } });

/* voice */
(function(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition, mic=$('#mic'), box=$('#box');
  if(!SR){ mic.style.display='none'; return; }
  let rec=null;
  mic.addEventListener('click',()=>{
    if(rec){ rec.stop(); return; }
    rec=new SR(); rec.lang='en-IN'; rec.interimResults=true;
    rec.onresult=e=>{ inp.value=[...e.results].map(r=>r[0].transcript).join(''); };
    rec.onend=()=>{ rec=null; mic.classList.remove('on'); box.classList.remove('listening'); if(inp.value.trim()){ const v=inp.value; inp.value=''; route(v); } };
    rec.onerror=()=>{};
    mic.classList.add('on'); box.classList.add('listening'); rec.start();
  });
})();

/* ---------- sessions / sidebar ---------- */
function title(){
  const s=st(); if(!s.goal) return 'New query';
  return GOALS[s.goal].lbl+(s.age?` · age ${s.age}`:'')+(s.ty?` · ${s.ty}`:'');
}
function save(userTouched){
  if(!thread.querySelector('.urow')) return;
  if(!sessionId) sessionId='s'+Date.now();
  let cur=sessions.find(x=>x.id===sessionId);
  if(!cur){ cur={id:sessionId,ts:Date.now(),title:title(),custom:false}; sessions.unshift(cur); }
  if(!cur.custom) cur.title=title();
  cur.ts=Date.now(); cur.state=L.st; cur.html=thread.innerHTML.replace(/ src="data:[^"]*"/g,'');
  sessions=sessions.slice(0,30);
  store.set('lifeai.sessions',sessions); renderRecent();
}
let showAll=false;
function renderRecent(){
  const host=$('#recent'); const list=sessions.slice().sort((a,b)=>b.ts-a.ts);
  if(!list.length){ host.innerHTML='<div class="empty-note">Your queries will appear here.</div>'; return; }
  const vis=showAll?list:list.slice(0,3);
  host.innerHTML=vis.map(x=>`<div class="item recent${x.id===sessionId?' active':''}" role="button" tabindex="0" data-sid="${x.id}" title="${esc(x.title)}"><span class="ms">chat</span><div class="tx"><div class="t1">${esc(x.title)}</div><div class="t2">${new Date(x.ts).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div></div><button class="rename" data-ren="${x.id}" title="Rename"><span class="ms">edit</span></button><button class="rename delete" data-del="${x.id}" title="Delete"><span class="ms">delete</span></button></div>`).join('')
    + (list.length>3?`<button class="show-more" id="moreBtn"><span class="ms">${showAll?'expand_less':'expand_more'}</span>${showAll?'Show less':`Show more (${list.length-3})`}</button>`:'');
}
$('#recent').addEventListener('click',e=>{
  const mb=e.target.closest('#moreBtn'); if(mb){ showAll=!showAll; renderRecent(); return; }
  const del=e.target.closest('[data-del]'); if(del){ e.stopPropagation(); const id=del.dataset.del; sessions=sessions.filter(x=>x.id!==id); store.set('lifeai.sessions',sessions); if(id===sessionId) newQuery(false); else renderRecent(); return; }
  const ren=e.target.closest('[data-ren]'); if(ren){
    e.stopPropagation(); const id=ren.dataset.ren, it=ren.closest('.item'), t1=it.querySelector('.t1'), cur=sessions.find(x=>x.id===id);
    it.classList.add('editing'); const i=document.createElement('input'); i.className='rename-input'; i.value=cur.title; t1.replaceWith(i); i.focus(); i.select();
    const done=ok=>{ if(ok&&i.value.trim()){ cur.title=i.value.trim(); cur.custom=true; store.set('lifeai.sessions',sessions); } renderRecent(); };
    i.addEventListener('keydown',ev=>{ if(ev.key==='Enter') done(true); if(ev.key==='Escape') done(false); }); i.addEventListener('blur',()=>done(true)); i.addEventListener('click',ev=>ev.stopPropagation()); return;
  }
  const it=e.target.closest('[data-sid]'); if(it){ openSession(it.dataset.sid); closeMenu(); }
});
function openSession(id){
  const x=sessions.find(s=>s.id===id); if(!x) return;
  sessionId=id; L.st=Object.assign(L.newState(),x.state); thread.innerHTML=x.html; hydrate(thread); busy=false; renderRecent(); scroller.scrollTop=scroller.scrollHeight;
}
function newQuery(keepOld){
  sessionId=null; L.st=L.newState(); thread.innerHTML=''; busy=false; renderRecent(); welcome();
}
$('#newBtn').addEventListener('click',()=>{ closeMenu(); newQuery(true); });
function closeMenu(){ $('#sidebar').classList.remove('open'); }
$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
function quick(){
  const q=[['manage_search','Ask about a specific plan','askprod',''],['compare_arrows','Compare plans','compare',''],['menu_book','Explain a policy term','gloss_menu',''],['percent','Par vs Non-Par','gloss','par'],['show_chart','ULIP vs TULIP','gloss','ulip'],['calculate','What is IRR?','gloss','irr']];
  $('#quick').innerHTML=q.map(x=>`<button class="item" data-qa="${x[2]}" data-qv="${x[3]}" data-ql="${x[1]}"><span class="ms">${x[0]}</span><span>${x[1]}</span></button>`).join('');
  $('#cats').innerHTML=GOAL_ORDER.map(g=>`<button class="item" data-qa="goal" data-qv="${g}" data-ql="${GOALS[g].lbl}"><span class="ms">${GOALS[g].icon}</span><span>${GOALS[g].lbl}</span></button>`).join('');
}
document.querySelector('aside').addEventListener('click',e=>{
  const b=e.target.closest('[data-qa]'); if(!b) return; closeMenu(); if(busy) return;
  if(b.dataset.qa==='compare'){ userSay(b.dataset.ql); return L.st.res&&L.st.res.length>1?compare(Math.min(3,L.st.res.length)):noCompare(); }
  act(b.dataset.qa,b.dataset.qv,b.dataset.ql);
});

/* ---------- profile name ---------- */
function paintName(){ $('#whoName').textContent=userName; $('#avatar').textContent=(userName[0]||'A').toUpperCase(); const m=$('#meName'); if(m) m.textContent=userName; }
function nameDialog(){
  const w=document.createElement('div'); w.className='code-wrap';
  w.innerHTML=`<div class="code-box"><div class="code-title"><span class="ms fill">badge</span>Change your name</div><div class="code-sub">Used for the greeting. Stored only in this browser.</div><input id="nameInp" maxlength="30" value="${esc(userName)}"><div class="code-err" id="nameErr"></div><div class="chips"><button class="chip primary" id="nameOk">Save</button><button class="chip" id="nameNo">Cancel</button></div></div>`;
  document.body.appendChild(w); const i=w.querySelector('#nameInp'); i.focus(); i.select();
  const ok=()=>{ const v=i.value.trim(); if(!v){ w.querySelector('#nameErr').textContent='Please enter a name.'; return; } userName=v; store.set('lifeai.name',v); paintName(); w.remove(); };
  w.querySelector('#nameOk').onclick=ok; w.querySelector('#nameNo').onclick=()=>w.remove();
  i.addEventListener('keydown',e=>{ if(e.key==='Enter') ok(); if(e.key==='Escape') w.remove(); });
  w.addEventListener('click',e=>{ if(e.target===w) w.remove(); });
}
$('#whoBtn').addEventListener('click',nameDialog); $('#meBtn').addEventListener('click',()=>{ closeMenu(); nameDialog(); });

/* ---------- background icon pattern ---------- */
function pattern(){
  const icons=['shield','favorite','family_restroom','savings','school','elderly','account_balance','trending_up','health_and_safety','volunteer_activism','payments','beach_access','shield_person','currency_rupee','home','child_care','umbrella','verified_user'];
  const host=$('#pattern'), w=host.parentNode.clientWidth+80, h=host.parentNode.clientHeight+80;
  const n=Math.ceil(w/92)*Math.ceil(h/92); let seed=7; const rnd=()=>(seed=(seed*9301+49297)%233280)/233280;
  host.innerHTML=Array.from({length:n},()=>`<div><span class="ms" style="font-size:${26+Math.floor(rnd()*14)}px;transform:rotate(${Math.floor(rnd()*50-25)}deg)">${icons[Math.floor(rnd()*icons.length)]}</span></div>`).join('');
}

/* ---------- boot ---------- */
document.querySelectorAll('header img[data-fb="head"]').forEach(i=>i.src=LOGO_URL);
paintName(); quick(); renderRecent(); pattern(); window.addEventListener('resize',pattern);
window.__life={act,route,L};
welcome();
})();
