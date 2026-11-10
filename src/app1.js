/* ============ Life Insurance AI Assistant — part 1: data + product logic ============
   Logic ported from the Life Product Selector (CFG / select / metricOf / detail …). */
(function(){
'use strict';
const D = window.LPS_DATA;
const {CATS,P,CO,S,ROWS,COLS,SL,LF,VR,IP,R,FI,LOGOS} = D;
const F = FI;

const CFG = {
  LUMPSUM_NPAR:{lbl:'Lumpsum — Non-Par',par:0,colL:'Policy term',basis:'policy term',metric:'irr'},
  LUMPSUM_PAR:{lbl:'Lumpsum — Par',par:1,colL:'Policy term',basis:'policy term',metric:'irr'},
  DEFERRED_INCOME_NPAR:{lbl:'Deferred income — Non-Par',par:0,colL:'Policy term',basis:'income period',metric:'irr'},
  DEFERRED_INCOME_PAR:{lbl:'Deferred income — Par',par:1,colL:'Policy term',basis:'income period',metric:'irr'},
  EARLY_INCOME_NPAR:{lbl:'Early income — Non-Par',par:0,colL:'Policy term',basis:'income period',metric:'irr'},
  EARLY_INCOME_PAR:{lbl:'Early income — Par',par:1,colL:'Policy term',basis:'income period',metric:'irr'},
  SHORT_INCOME_NPAR:{lbl:'Short income — Non-Par',par:0,colL:'Policy term',basis:'income period',metric:'irr'},
  MONTHLY_INCOME_NPAR:{lbl:'Monthly income — Non-Par',par:0,colL:'Policy term',basis:'income period',metric:'irr'},
  WHOLELIFE_INCOME_NPAR:{lbl:'Whole life income — Non-Par',par:0,colL:'Policy term',basis:'income period',metric:'irr'},
  TERM:{lbl:'Term',par:0,colL:'Policy term',basis:'cover duration',metric:'prem'},
  ANNUITY_SP_NROP:{lbl:'Single Pay Immediate Annuity — Without ROP',par:0,colL:'Deferment',basis:'deferment',metric:'ar'},
  ANNUITY_SP_ROP:{lbl:'Single Pay Immediate Annuity — With ROP',par:0,colL:'Deferment',basis:'deferment',metric:'ar'},
  ANNUITY_RP_5:{lbl:'Regular Pay Deferred Annuity — 5 year PPT',par:0,colL:'Deferment',basis:'deferment',metric:'ar'},
  ANNUITY_RP_6:{lbl:'Regular Pay Deferred Annuity — 6 year PPT',par:0,colL:'Deferment',basis:'deferment',metric:'ar'},
  ANNUITY_RP_7:{lbl:'Regular Pay Deferred Annuity — 7 year PPT',par:0,colL:'Deferment',basis:'deferment',metric:'ar'},
  ANNUITY_RP_8:{lbl:'Regular Pay Deferred Annuity — 8 year PPT',par:0,colL:'Deferment',basis:'deferment',metric:'ar'},
  ANNUITY_RP_10:{lbl:'Regular Pay Deferred Annuity — 10 year PPT',par:0,colL:'Deferment',basis:'deferment',metric:'ar'},
  ANNUITY_RP_12:{lbl:'Regular Pay Deferred Annuity — 12 year PPT',par:0,colL:'Deferment',basis:'deferment',metric:'ar'},
  ULIP:{lbl:'ULIP',par:0,colL:'Policy term',basis:'policy term',metric:'irr'},
  TULIP:{lbl:'TULIP',par:0,colL:'Policy term',basis:'policy term',metric:'irr'},
};
const isAnnuityCat = c => typeof c==='string' && c.indexOf('ANNUITY_')===0;
const typeOfCat = c => c==='ULIP'?'ULIP':c==='TULIP'?'TULIP':c==='TERM'?'Term':isAnnuityCat(c)?'Annuity':(CFG[c]&&CFG[c].par?'Par':'Non-Par');

/* Goals → product categories (same mapping as the selector; Second Income also carries the
   monthly / short / whole-life income categories that only showed under "All goals" there). */
const GOALS = {
  FAMILY_PROTECTION:{lbl:'Family Protection', icon:'shield_person', cats:['TERM']},
  SECOND_INCOME:{lbl:'Second Income', icon:'payments', cats:['EARLY_INCOME_NPAR','DEFERRED_INCOME_NPAR','MONTHLY_INCOME_NPAR','SHORT_INCOME_NPAR','WHOLELIFE_INCOME_NPAR','EARLY_INCOME_PAR','DEFERRED_INCOME_PAR']},
  WEALTH_CREATION:{lbl:'Wealth Creation', icon:'trending_up', cats:['LUMPSUM_NPAR','LUMPSUM_PAR','ULIP','TULIP']},
  CHILD:{lbl:'Child Education / Marriage', icon:'school', cats:['LUMPSUM_NPAR','LUMPSUM_PAR','EARLY_INCOME_NPAR','EARLY_INCOME_PAR','DEFERRED_INCOME_NPAR','DEFERRED_INCOME_PAR']},
  RETIREMENT:{lbl:'Retirement', icon:'beach_access', cats:['ANNUITY_SP_NROP','ANNUITY_SP_ROP','ANNUITY_RP_5','ANNUITY_RP_6','ANNUITY_RP_7','ANNUITY_RP_8','ANNUITY_RP_10','ANNUITY_RP_12']},
};
const GOAL_ORDER = ['FAMILY_PROTECTION','SECOND_INCOME','WEALTH_CREATION','CHILD','RETIREMENT'];
const AXES = {'FPC':{ppt:['6','8','10','12'],pt:['15','18','20','25']},'ANG/LAP':{ppt:['5','7','10'],pt:['15','20','30']}};
const BADGES = {'Axis Max Life':{t:'AXIS MAX',bg:'#97144d',fg:'#ffffff'},'ABSL Life':{t:'ABSLI',bg:'#c8102e',fg:'#ffffff'},'LIC':{t:'LIC',bg:'#f8d346',fg:'#7a1c1c'},'Other':{t:'',bg:'#3d5060',fg:'#ffffff'}};

const byCat = {}; R.forEach(r=>{ (byCat[CATS[r[F.cat]]] ||= []).push(r); });
const rowsOf = c => byCat[c] || [];
const axSort=(a,b)=>{const x=+a,y=+b; return (isNaN(x)||isNaN(y))?String(a).localeCompare(b):x-y};
const inr = new Intl.NumberFormat('en-IN',{maximumFractionDigits:0});
const pct = v => (v*100).toFixed(2)+'%';
const money = v => v==null||v===0?null:'₹ '+inr.format(v);
const saVal = s => ({'50 Lac':5e6,'1 Crore':1e7,'2 Crore':2e7,'5 Crore':5e7}[s]||0);
function inrShort(v){
  if(v==null||isNaN(v)) return '—';
  const n=Math.round(Number(v)); if(n===0) return '₹0';
  if(n>=1e7){const x=n/1e7; return '₹'+(x>=100?Math.round(x):x.toFixed(x>=10?1:2))+' Cr'}
  if(n>=1e5){const x=n/1e5; return '₹'+(x>=100?Math.round(x):x.toFixed(x>=10?1:2))+' L'}
  return '₹'+inr.format(n);
}

/* ---------- session state (the client "profile" being built up by the chat) ---------- */
let st = newState();
function newState(){ return {focus:null, focusAge:null, ch:'ANG/LAP', goal:null, age:null, ty:null, cat:null, x:'', ppt:null, pt:null, rank:'i8', res:null, shown:0}; }

const chOk = r => st.ch==='FPC' ? r[F.fpc]===1 : r[F.fpc]!==1;

function axesFor(c){
  if(c==='ULIP'||c==='TULIP'||c==='TERM'||isAnnuityCat(c)){
    const rs=rowsOf(c);
    if(rs.length) return {ppt:[...new Set(rs.map(r=>ROWS[r[F.row]]))].sort(axSort), pt:[...new Set(rs.map(r=>COLS[r[F.col]]))].sort(axSort)};
  }
  return AXES[st.ch]||AXES['ANG/LAP'];
}
const currentAxes = () => axesFor(st.cat);
/* nearest age that actually has usable rows (right channel, on the playbook grid) for this category */
function nearestAge(cat,age){
  const ax=axesFor(cat);
  const usable=rowsOf(cat).filter(r=>chOk(r) && ax.ppt.includes(ROWS[r[F.row]]) && ax.pt.includes(COLS[r[F.col]]) && !(cat==='TERM'&&COLS[r[F.col]]==='Cover till 99'));
  let ages=[...new Set(usable.map(r=>r[F.age]))];
  if(!ages.length) ages=[...new Set(rowsOf(cat).map(r=>r[F.age]))];
  ages.sort((a,b)=>a-b);
  if(!ages.length) return null;
  if(ages.includes(age)) return age;
  return ages.reduce((b,a)=>Math.abs(a-age)<Math.abs(b-age)?a:b, ages[0]);
}
/* rows that satisfy everything chosen so far; `skip` leaves one axis open so we can list its options */
function baseRows(skip){
  const cat=st.cat, cf=CFG[cat]; if(!cat) return [];
  const age=nearestAge(cat,st.age), ax=currentAxes();
  return rowsOf(cat).filter(r=>{
    if(r[F.age]!==age) return false;
    if(!chOk(r)) return false;
    if(cat==='TERM' && st.x && SL[r[F.sl]]!==st.x) return false;
    if(cat==='TERM' && COLS[r[F.col]]==='Cover till 99') return false;
    if(isAnnuityCat(cat) && st.x && LF[r[F.lf]]!==st.x) return false;
    if(cf.par && st.rank==='i4' && !r[F.i4]) return false;
    if(!ax.ppt.includes(ROWS[r[F.row]])) return false;
    if(!ax.pt.includes(COLS[r[F.col]])) return false;
    if(skip!=='ppt' && st.ppt!=null && ROWS[r[F.row]]!==st.ppt) return false;
    if(skip!=='pt' && st.pt!=null && COLS[r[F.col]]!==st.pt) return false;
    return true;
  });
}
/* any-channel rows for a category at the nearest age (used to suggest the channel switch) */
function chRowsCount(cat,ch){ const old=st.ch; st.ch=ch; const a=nearestAge(cat,st.age); const n=rowsOf(cat).filter(r=>r[F.age]===a&&chOk(r)).length; st.ch=old; return n; }
function bestChannelFor(cat){
  const rs=rowsOf(cat); if(!rs.length) return null;
  const nF=rs.filter(r=>r[F.fpc]===1).length, nO=rs.length-nF;
  if(nF>0&&nO===0) return 'FPC'; if(nO>0&&nF===0) return 'ANG/LAP'; return null;
}

/* ---------- ranking metric (identical to selector) ---------- */
function irrFlows(pt,ppt,prem,sa){
  if(pt<=0||ppt<=0) return null;
  const cfs=Array(pt).fill(0).map((_,t)=>t<ppt?-prem:0); cfs[pt-1]+=sa;
  let r0=0.05;
  for(let i=0;i<300;i++){
    let f=0,df=0;
    for(let t=0;t<pt;t++){ const d=Math.pow(1+r0,t+1); f+=cfs[t]/d; df-=(t+1)*cfs[t]/(d*(1+r0)); }
    if(Math.abs(df)<1e-12) break;
    const r1=r0-f/df; if(Math.abs(r1-r0)<1e-9){r0=r1;break;} r0=r1;
  }
  return (r0>-1&&r0<2)?r0:null;
}
function termIRR(r){
  const col=COLS[r[F.col]], row=ROWS[r[F.row]], age=r[F.age], sa=r[F.sa]||0, prem=r[F.prem]||0;
  if(!sa||!prem) return null;
  let pt; if(col.includes('till 85')) pt=85-age; else if(col.includes('Whole')) pt=100-age; else return null;
  let ppt; if(row.includes('Pay 10')) ppt=10; else if(row.includes('till 60')) ppt=Math.max(1,60-age); else ppt=pt;
  return irrFlows(pt,ppt,prem,sa);
}
function metricOf(r){
  const cf=CFG[CATS[r[F.cat]]];
  if(cf.metric==='prem'){ const v=termIRR(r); return v!==null?v:-r[F.prem]; }
  if(cf.metric==='ar') return r[F.ar];
  if(r[F.nir]) return r[F.mat8]||r[F.mat]||0;
  if(cf.par && st.rank==='i4') return r[F.i4]||0;
  return r[F.i8]||r[F.m]||0;
}
function valData(r,cf){
  if(cf.metric==='prem'){ const v=termIRR(r); return v!==null?{big:(v*100).toFixed(2)+'%',unit:'IRR'}:{big:'₹'+inr.format(r[F.prem]),unit:'per year'}; }
  if(cf.metric==='ar') return {big:pct(r[F.ar]), unit:'annuity rate'};
  if(r[F.nir]){
    if(r[F.mat4]&&r[F.mat8]) return {dual:true,a:{lbl:'@4%',v:inrShort(r[F.mat4])},b:{lbl:'@8%',v:inrShort(r[F.mat8])},unit:'Maturity'};
    return {big:inrShort(r[F.mat]||r[F.mat8]),unit:'Maturity'};
  }
  if(cf.par&&r[F.i4]&&r[F.i8]) return {dual:true,a:{lbl:'@4%',v:pct(r[F.i4])},b:{lbl:'@8%',v:pct(r[F.i8])},unit:'IRR'};
  return {big:pct(r[F.i8]||r[F.m]),unit:'IRR'};
}
function statsData(r,cat){
  const lumpish={LUMPSUM_NPAR:1,LUMPSUM_PAR:1,ULIP:1,TULIP:1};
  const incomeCats={DEFERRED_INCOME_NPAR:1,DEFERRED_INCOME_PAR:1,EARLY_INCOME_NPAR:1,EARLY_INCOME_PAR:1,SHORT_INCOME_NPAR:1,MONTHLY_INCOME_NPAR:1,WHOLELIFE_INCOME_NPAR:1};
  const premRaw=r[F.prem]||null, ppt=+ROWS[r[F.row]]||r[F.ppt]||0, tot=(ppt&&premRaw)?premRaw*ppt:null;
  const S2=(l,v)=>({l,v});
  if(lumpish[cat]) return [S2('Premium p.a.',inrShort(premRaw)),S2('Maturity',inrShort(r[F.mat]||null))];
  if(incomeCats[cat]){
    const inc=r[F.inc]||0, ipn=parseFloat(IP[r[F.ip]]||'')||0, ti=(inc&&ipn)?inc*ipn:0, mat=r[F.mat]||0, tv=(ti||mat)?ti+mat:null;
    return [S2('Premium p.a.',inrShort(premRaw)),S2('Income p.a.',inrShort(inc||null)),S2('Maturity',inrShort(mat||null)),S2('Total value',inrShort(tv))];
  }
  if(cat==='TERM'){
    const col=COLS[r[F.col]], row=ROWS[r[F.row]], age=r[F.age];
    const pt=col.includes('till 85')?85-age:col.includes('Whole')?100-age:null;
    const p2=row.includes('Pay 10')?10:row.includes('till 60')?Math.max(1,60-age):pt;
    const t2=(p2&&premRaw)?premRaw*p2:null;
    return [S2('Premium p.a.',inrShort(premRaw)),S2('Total premium',inrShort(t2)),S2('Sum assured',inrShort(r[F.sa]||null))];
  }
  if(isAnnuityCat(cat)) return [S2('Premium',inrShort(premRaw)),S2('Annuity p.a.',inrShort(r[F.ann]||null))];
  return [];
}
function coMark(name){
  if(LOGOS[name]) return {logo:name, badge:null};
  const b=BADGES[name]||BADGES.Other;
  return {logo:null, badge:{t:(b.t||name.split(' ').map(w=>w[0]).join('').slice(0,3)).toUpperCase(), bg:b.bg, fg:b.fg}};
}
function metricName(rows,cf){
  const allNoIrr=rows.every(r=>r[F.nir]);
  return cf.metric==='prem'?'IRR':cf.metric==='ar'?'annuity rate':allNoIrr?'maturity benefit':(cf.par?'IRR at '+(st.rank==='i4'?'4%':'8%'):'IRR');
}

/* ---------- ranked plans for the chosen pattern: best row per product, best first ---------- */
function rankedPlans(){
  const rows=baseRows();
  rows.sort((a,b)=>metricOf(b)-metricOf(a));
  const seen=new Set(), out=[];
  rows.forEach(r=>{ const k=r[F.prod]; if(seen.has(k)) return; seen.add(k); out.push(R.indexOf(r)); });
  return out;
}

/* ---------- full detail of one row (ported from selector) ---------- */
function detail(idx){
  const r=R[idx], cat=CATS[r[F.cat]], cf=CFG[cat], groups=[];
  const g=(title,rows)=>{ const kept=rows.filter(x=>x&&x[1]!=null&&x[1]!==''&&x[1]!==0); if(kept.length) groups.push({title, rows:kept.map(([k,v,hi])=>({k,v:String(v),hi:!!hi}))}); };
  const yrs=v=>v==null||v===0?null:v+(v===1?' year':' years');
  const ppt=r[F.ppt]||+ROWS[r[F.row]]||null;
  const totPrem=(ppt&&r[F.prem])?ppt*r[F.prem]:null;
  const ipn=parseFloat(IP[r[F.ip]]||'')||null;
  const totInc=(ipn&&r[F.inc])?ipn*r[F.inc]:null, totInc4=(ipn&&r[F.inc4])?ipn*r[F.inc4]:null;
  const totVal=(totInc||r[F.mat])?(totInc||0)+(r[F.mat]||0):null;
  const ret=[];
  if(cf.metric==='prem'){
    const t=termIRR(r); if(t!==null) ret.push(['IRR (claim at cover end)',pct(t),1]);
    ret.push(['Annual premium',money(r[F.prem])]); ret.push(['Sum assured',money(r[F.sa])]);
    if(r[F.prem]&&r[F.sa]) ret.push(['Cost per ₹1 lakh cover','₹ '+inr.format(r[F.prem]/(r[F.sa]/1e5))]);
  } else if(cf.metric==='ar'){
    ret.push(['First-year annuity rate',pct(r[F.ar]),1]); ret.push(['Annual annuity',money(r[F.ann])]); ret.push(['Life covered',LF[r[F.lf]]]);
  } else if(cat==='ULIP'||cat==='TULIP'){
    ret.push(['Net IRR (illustration 8% − yield loss)',pct(r[F.i8]||r[F.m]),1]); if(r[F.ylm]) ret.push(['Yield loss at maturity',pct(r[F.ylm])]);
  } else if(r[F.nir]){
    if(r[F.mat4]&&r[F.mat8]){ ret.push(['Maturity benefit @ 8%',money(r[F.mat8]),1]); ret.push(['Maturity benefit @ 4%',money(r[F.mat4])]); }
    else ret.push(['Maturity benefit',money(r[F.mat]||r[F.mat8]),1]);
    if(r[F.matGtd]) ret.push(['Guaranteed maturity',money(r[F.matGtd])]);
  } else if(r[F.i4]&&r[F.i8]){
    ret.push([cf.par?'IRR at 8%':'IRR',pct(r[F.i8]),1]); ret.push([cf.par?'IRR at 4%':'IRR (alternate scenario)',pct(r[F.i4])]);
  } else ret.push(['IRR',pct(r[F.i8]||r[F.m]),1]);
  g('Returns',ret);
  const ipAxis=cf.basis==='income period', colV=COLS[r[F.col]]+(/^\d+$/.test(COLS[r[F.col]])?' years':'');
  g('Cash flow',[
    ['Annual premium',money(r[F.prem])], ['Total premium paid',money(totPrem)],
    ppt?['Premium paying term',ppt+' years']:null,
    ipAxis?(r[F.pt]?['Policy term',r[F.pt]+' years']:null):[cf.colL,colV],
    ipAxis?['Income period',colV]:null,
    r[F.def]?['Deferment period',r[F.def]+' years']:null,
    ['Age at entry',r[F.age]+' years'],
    r[F.inc4]?['Income p.a. at 4%',money(r[F.inc4])]:null,
    (cf.par&&r[F.inc])?['Income p.a. at 8%',money(r[F.inc])]:(r[F.inc]?['Annual income',money(r[F.inc])]:null),
    (ipn&&!ipAxis)?['Income period',yrs(ipn)]:null,
    r[F.istart]?['Income starts from year',r[F.istart]]:null,
    totInc4?['Total income @ 4%',money(totInc4)]:null,
    totInc?[cf.par?'Total income @ 8%':'Total income received',money(totInc)]:null,
    VR[r[F.vr]]?['Variant',VR[r[F.vr]]]:null,
    r[F.ropAmt]?['Return of premium amount',money(r[F.ropAmt])]:null,
  ]);
  g('Maturity',[
    r[F.mat4]?['Maturity benefit @ 4%',money(r[F.mat4])]:null,
    r[F.mat8]?['Maturity benefit @ 8%',money(r[F.mat8])]:(r[F.mat]?['Maturity benefit',money(r[F.mat])]:null),
    r[F.lyinc]?['Value at last income year',money(r[F.lyinc])]:null,
    totVal?['Total maturity value',money(totVal),1]:null,
  ]);
  g('Protection',[
    r[F.lc]?['Life cover',money(r[F.lc])]:null,
    r[F.sa]&&cf.metric!=='prem'?['Sum assured',money(r[F.sa])]:null,
    r[F.addDB]?['Additional / inbuilt death benefit',money(r[F.addDB])]:null,
  ]);
  if(cat==='ULIP'||cat==='TULIP'){
    g('Illustrated fund value (at 8%)',[r[F.um10]?['Value at 10th year',money(r[F.um10])]:null,r[F.um20]?['Value at 20th year',money(r[F.um20])]:null,r[F.um30]?['Value at 30th year',money(r[F.um30])]:null,r[F.mat]?['Value at maturity',money(r[F.mat]),1]:null]);
    g('Yield loss (fund charge drag)',[r[F.yl10]?['10th year',pct(r[F.yl10])]:null,r[F.yl20]?['20th year',pct(r[F.yl20])]:null,r[F.yl30]?['30th year',pct(r[F.yl30])]:null,r[F.ylm]?['At maturity',pct(r[F.ylm])]:null]);
  }
  if(cat==='TERM'){
    const col2=COLS[r[F.col]], row2=ROWS[r[F.row]], age2=r[F.age];
    let ppt2; if(row2.includes('Pay 10')) ppt2=10; else if(row2.includes('till 60')) ppt2=Math.max(1,60-age2); else ppt2=col2.includes('till 85')?85-age2:100-age2;
    const end=col2.includes('till 85')?85:99;
    const ages=[60,80,end].filter((a,i,arr)=>arr.indexOf(a)===i&&a>age2+ppt2);
    g('IRR at claim age', ages.map(ca=>{ const pt2=ca-age2; if(pt2<ppt2) return null; const v=irrFlows(pt2,ppt2,r[F.prem],r[F.sa]); return v!==null?[`IRR on claim at age ${ca}`,pct(v)]:null; }).filter(Boolean));
  }
  const co=CO[r[F.co]];
  return {name:P[r[F.prod]], co, cat:cf.lbl, ...coMark(co), groups};
}

/* ---------- plain-language labels for the payment-pattern chips ---------- */
function pptLabel(v){
  if(v==='1') return {t:'Single premium', d:'Pay once, up front.'};
  if(/^\d+$/.test(v)) return {t:v+' years', d:`Pay premiums for ${v} years, then you're done.`};
  if(v==='Pay 10') return {t:'Pay for 10 years', d:'Limited pay — premiums stop after 10 years, cover continues.'};
  if(v==='Pay till 60') return {t:'Pay till age 60', d:'Premiums stop at 60 — cover continues after retirement.'};
  if(v==='Regular Pay') return {t:'Regular pay', d:'Pay every year for the whole cover period — lowest yearly premium.'};
  return {t:v, d:''};
}
function ptLabel(v,cf){
  const kind=cf.basis;
  if(v==='0') return {t:'Immediate', d:'Income starts straight away.'};
  if(/^\d+$/.test(v)){
    if(kind==='deferment') return {t:v+' years', d:`Income starts after a ${v}-year deferment.`};
    if(kind==='income period') return {t:v+' years', d:`Income is paid for ${v} years.`};
    return {t:v+' years', d:`Policy runs for ${v} years.`};
  }
  if(v==='Cover till 85') return {t:'Cover till age 85', d:'Protection until the life insured turns 85.'};
  if(v==='Whole Life'||v==='Whole Life Cover') return {t:'Whole life', d:'Protection for life (typically to age 99–100).'};
  return {t:v, d:''};
}
const ptHeading = cf => cf.basis==='deferment'?'deferment period':cf.basis==='income period'?'income period':cf.basis==='cover duration'?'cover duration':'policy term';
const catTitle = c => ({
  LUMPSUM_NPAR:'Guaranteed lump sum', LUMPSUM_PAR:'Lump sum with bonuses',
  EARLY_INCOME_NPAR:'Early guaranteed income', DEFERRED_INCOME_NPAR:'Deferred guaranteed income',
  MONTHLY_INCOME_NPAR:'Monthly guaranteed income', SHORT_INCOME_NPAR:'Short-term income', WHOLELIFE_INCOME_NPAR:'Whole-life income',
  EARLY_INCOME_PAR:'Early income with bonuses', DEFERRED_INCOME_PAR:'Deferred income with bonuses',
  TERM:'Term cover', ULIP:'ULIP (market-linked)', TULIP:'TULIP (ULIP + life cover)',
  ANNUITY_SP_NROP:'Single premium — immediate annuity', ANNUITY_SP_ROP:'Single premium — immediate annuity with return of premium',
}[c] || (isAnnuityCat(c)? `Regular pay — ${c.split('_').pop()} years, deferred annuity` : CFG[c].lbl));
const catDesc = c => ({
  LUMPSUM_NPAR:'Pay for a few years and receive a pre-defined lump sum at maturity.',
  LUMPSUM_PAR:'A lump sum at maturity that includes bonuses declared by the insurer (illustrated at 4% / 8%).',
  EARLY_INCOME_NPAR:'A fixed income that begins early in the policy and keeps coming for the income period.',
  DEFERRED_INCOME_NPAR:'Income starts after a waiting (deferment) period — usually a higher income later on.',
  MONTHLY_INCOME_NPAR:'Guaranteed income paid out monthly — works like a regular salary top-up.',
  SHORT_INCOME_NPAR:'A guaranteed income for a short, fixed stretch — good for a defined cash-flow need.',
  WHOLELIFE_INCOME_NPAR:'A guaranteed income that continues for the whole of life.',
  EARLY_INCOME_PAR:'Income that begins early, with bonuses on top (not guaranteed).',
  DEFERRED_INCOME_PAR:'Income that begins after a deferment period, with bonuses on top (not guaranteed).',
  TERM:'Pure life cover — the nominee receives the sum assured if the life insured passes away during the cover.',
  ULIP:'Premium goes into market-linked funds. Value is not guaranteed.',
  TULIP:'A ULIP with life cover built in.',
  ANNUITY_SP_NROP:'Pay once, receive income for life starting right away. No premium returned after death — usually the highest annuity rate.',
  ANNUITY_SP_ROP:'Pay once, receive income for life starting right away. The purchase price goes back to the nominee after death.',
}[c] || (isAnnuityCat(c)? `Pay premiums for ${c.split('_').pop()} years; lifelong income starts after a deferment period.` : ''));

window.LIFE = {D,CFG,GOALS,GOAL_ORDER,CATS,P,CO,S,ROWS,COLS,SL,LF,VR,IP,R,F,LOGOS,
  get st(){return st}, set st(v){st=v}, newState,
  isAnnuityCat,typeOfCat,rowsOf,axSort,inr,pct,money,saVal,inrShort,
  chOk,currentAxes,nearestAge,baseRows,chRowsCount,bestChannelFor,metricOf,valData,statsData,coMark,metricName,rankedPlans,detail,
  pptLabel,ptLabel,ptHeading,catTitle,catDesc,termIRR,irrFlows};
})();
