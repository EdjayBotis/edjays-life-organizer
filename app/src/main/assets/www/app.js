(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-'+Date.now()+'-'+Math.random().toString(16).slice(2));
  const nowDateKey = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const peso = n => `₱${Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2})}`;
  const esc = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const formatTime = t => {
    if(!t) return '';
    const [h,m] = t.split(':').map(Number); const ap=h>=12?'PM':'AM'; const hh=h%12||12;
    return `${hh}:${String(m||0).padStart(2,'0')} ${ap}`;
  };
  const parseMinutes = t => { if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };
  const fmtDate = (key, opts={weekday:'short',month:'short',day:'numeric'}) => {
    const [y,m,d]=key.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('en-US',opts);
  };
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const deepCopy=o=>JSON.parse(JSON.stringify(o));

  // Level progression is intentionally kept outside app.js so it is easy to rebalance.
  // Edit level-config.js to change rank caps or common XP values.
  const LEVEL_CONFIG = window.EDJAY_LEVEL_CONFIG || {};
  const LEVELS = (LEVEL_CONFIG.levels || [
    {name:'Spoiled',min:0},{name:'Messy',min:1500},{name:'Drifter',min:3500},{name:'Getting Serious',min:6000},{name:'Responsible',min:9500},
    {name:'Organized',min:14000},{name:'Consistent',min:20000},{name:'Disciplined',min:28000},{name:'Dependable',min:38000},{name:'Self-Mastered',min:50000}
  ]).map(x=>[x.name,x.min]);
  const XP_CONFIG = LEVEL_CONFIG.xp || {task:{Small:10,Normal:20,Important:40},miss:{Small:5,Normal:10,Important:20},routine:30,workout:50,perfect:50,thesis:100,schedule:10,unexpected:10};

  const thesisBOM = [
    {cat:'Sensors & Electronics',name:'Raspberry Pi 3 Model B',qty:1,unit:'pc',cost:2390},
    {cat:'Sensors & Electronics',name:'LAFVIN 7-inch DSI touchscreen',qty:1,unit:'set',cost:2199},
    {cat:'Sensors & Electronics',name:'ESP32 DevKit V1 CP2102 USB-C',qty:1,unit:'pc',cost:404},
    {cat:'Sensors & Electronics',name:'ADS1115 ADC',qty:1,unit:'pc',cost:149},
    {cat:'Sensors & Electronics',name:'DFRobot Gravity waterproof DS18B20 KIT0021',qty:1,unit:'set',cost:571},
    {cat:'Sensors & Electronics',name:'DFRobot SEN0169 industrial pH kit V1',qty:1,unit:'set',cost:4389},
    {cat:'Sensors & Electronics',name:'DFRobot SEN0244 TDS kit',qty:1,unit:'set',cost:1261},
    {cat:'Sensors & Electronics',name:'SanDisk Ultra A1 microSD 32 GB',qty:1,unit:'pc',cost:990},
    {cat:'Sensors & Electronics',name:'Pi 3 power adapter 5 V 3 A micro-USB',qty:1,unit:'pc',cost:150},
    {cat:'Sensors & Electronics',name:'USB-A to USB-C data cable',qty:1,unit:'pc',cost:259},
    {cat:'Installation & Assembly',name:'Universal perfboard 5×7 cm',qty:2,unit:'packs',cost:85},
    {cat:'Installation & Assembly',name:'Protective enclosure 300×250×120 mm',qty:1,unit:'pc',cost:310},
    {cat:'Installation & Assembly',name:'PETG filament 1 kg',qty:1,unit:'spool',cost:599},
    {cat:'Installation & Assembly',name:'Metal mounting brackets + bolts/nuts/washers',qty:1,unit:'set',cost:150},
    {cat:'Installation & Assembly',name:'Hookup wires / pin headers / connectors',qty:1,unit:'lot',cost:200},
    {cat:'Installation & Assembly',name:'Cable sleeve / conduit / clips / cable ties',qty:1,unit:'lot',cost:150},
    {cat:'Installation & Assembly',name:'Heat-shrink / solder / electrical tape',qty:1,unit:'lot',cost:120},
    {cat:'Installation & Assembly',name:'Terminal connectors / fuse holder / fuses',qty:1,unit:'lot',cost:100},
    {cat:'Installation & Assembly',name:'Power extension cord 3 m',qty:1,unit:'set',cost:250},
    {cat:'Calibration & Testing',name:'pH buffer set',qty:1,unit:'set',cost:989},
    {cat:'Calibration & Testing',name:'Conductivity standard 1413 µS/cm',qty:1,unit:'bottle',cost:1958},
    {cat:'Calibration & Testing',name:'pH probe storage solution 120 mL KCl',qty:1,unit:'bottle',cost:1252},
  ].map(x=>({...x,id:uid(),actual:null,purchased:false}));

  const defaultState = () => ({
    version:3,
    profile:{name:'Edjay',xp:0,xpEvents:[],dailyLoss:{},created:nowDateKey()},
    settings:{theme:'light',autoNoMin:3,vibration:true,notifications:true,dayTemplate:'home'},
    scheduleTemplates:{
      home:[
        ['Wake up','07:00','fixed'],['Make bed','07:05','flex'],['Skin Care AM','07:15','flex'],['Prep and Breakfast','07:30','flex'],['Thesis','08:50','flex'],['Cook rice','10:30','fixed'],['Lunch prep','11:30','fixed'],['Lunch','12:00','fixed'],['Thesis','12:30','flex'],['Workout','17:00','flex'],['Wash and Skin Care PM','18:30','flex'],['Dinner prep','19:00','fixed'],['Dinner','20:00','fixed'],['Sleep','23:00','fixed']
      ].map(([title,time,flex])=>({id:uid(),title,time,flex,status:'pending'})),
      out:[
        ['Wake up','07:00','fixed'],['Make bed','07:05','flex'],['Prep and Breakfast','07:30','flex'],['Wash and Skin Care','08:30','flex'],['Prepare to Go Out • Clothes + Essentials','09:30','flex'],['Lunch prep','11:30','flex'],['Lunch','12:00','flex'],['Thesis','12:30','flex'],['Workout','17:00','flex'],['Dinner prep','19:00','flex'],['Dinner','20:00','flex'],['Sleep','23:00','fixed']
      ].map(([title,time,flex])=>({id:uid(),title,time,flex,status:'pending'}))
    },
    daily:{},
    tasks:[
      {id:uid(),title:'Buy shampoo',category:'Shopping',importance:'small',due:'',status:'pending'},
      {id:uid(),title:'Buy deodorant',category:'Shopping',importance:'small',due:'',status:'pending'},
      {id:uid(),title:'Buy conditioner',category:'Shopping',importance:'small',due:'',status:'pending'},
    ],
    reminders:[],
    routines:[
      {id:uid(),name:'Morning',items:['Make bed','Drink water','Brush teeth','Breakfast'].map(title=>({id:uid(),title,schedule:'daily'}))},
      {id:uid(),name:'Skin Care AM',items:['Cleanser','Serum','Moisturizer','Sunscreen'].map(title=>({id:uid(),title,schedule:'daily'}))},
      {id:uid(),name:'Chores',items:[
        {id:uid(),title:'Sweep / walis',schedule:'daily'},{id:uid(),title:'Clean desk',schedule:'daily'},{id:uid(),title:'Organize files before sleep',schedule:'daily'},
        {id:uid(),title:'Clean drawer',schedule:'manual'},{id:uid(),title:'Laundry',schedule:'weekly'},{id:uid(),title:'Change bedsheets',schedule:'weekly'}]},
      {id:uid(),name:'Skin Care PM',items:['Cleanser','Serum','Moisturizer'].map(title=>({id:uid(),title,schedule:'daily'}))},
      {id:uid(),name:'Night',items:['Prepare tomorrow’s clothes','Check tomorrow’s schedule','Charge devices','Sleep by 11:00 PM'].map(title=>({id:uid(),title,schedule:'daily'}))},
    ],
    routineDaily:{},
    workouts:{library:[
      {id:uid(),name:'Starter Workout',exercises:[
        {id:uid(),name:'Warm-up',mode:'time',target:30,unit:'sec',sets:1,rest:0},
        {id:uid(),name:'Curl-ups',mode:'reps',target:10,unit:'reps',sets:1,rest:30},
        {id:uid(),name:'Push-ups',mode:'reps',target:10,unit:'reps',sets:1,rest:30},
        {id:uid(),name:'Rest',mode:'time',target:30,unit:'sec',sets:1,rest:0},
      ]}
    ],assignments:{},statuses:{}},
    thesis:{
      stages:[
        {id:uid(),name:'Chapter 1',items:['Topic / Title','Introduction','Statement of the Problem','Objectives','Significance of the Study','Scope and Limitations','Theoretical Framework','Conceptual Framework','Definition of Terms'].map(title=>({id:uid(),title,status:'not-started'}))},
        {id:uid(),name:'Chapter 2 / Methodology',items:['Research Design','Study Area / Setup','Materials and Equipment','System Design','Sensor / Device Installation','Calibration','Testing / Evaluation','Data Gathering Procedure','Data Analysis','Bill of Materials','Schedule of Activities'].map(title=>({id:uid(),title,status:'not-started'}))},
        {id:uid(),name:'Proposal Preparation',items:['Complete proposal manuscript','Adviser checking','Apply adviser corrections','Final adviser approval','Submit proposal paper','Schedule proposal defense','Prepare presentation','Pre-defense','Apply pre-defense corrections'].map(title=>({id:uid(),title,status:'not-started'}))},
        {id:uid(),name:'Proposal Defense',items:['Defend proposal','Record panel comments','Apply revisions','Obtain approval to conduct'].map(title=>({id:uid(),title,status:'not-started'}))},
        {id:uid(),name:'Conduct',items:['Purchase / prepare materials','Build monitoring system','Install system','Calibrate sensors','Preliminary testing','Conduct actual testing','Gather data','Troubleshoot / retest if needed'].map(title=>({id:uid(),title,status:'not-started'}))},
        {id:uid(),name:'Results',items:['Organize data','Analyze data','Create tables / graphs','Chapter 4','Interpret results'].map(title=>({id:uid(),title,status:'not-started'}))},
        {id:uid(),name:'Completion',items:['Chapter 5','Conclusions','Recommendations','References','Appendices','Adviser checking','Final revisions','Final defense','Post-defense corrections','Final manuscript submission'].map(title=>({id:uid(),title,status:'not-started'}))},
      ],
      bom:thesisBOM,
      otherCosts:[{id:uid(),name:'Proposal / Panel Defense',planned:900,actual:null,paid:false},{id:uid(),name:'Panel Food',planned:500,actual:null,paid:false}],
    },
    money:{
      allowance:{weekly:1000,savingsRate:0.30,emergencyShare:0.70,galaShare:0.30},
      income:[{id:uid(),name:'Scholarship',amount:10000,frequency:'per semester'}],
      bills:[{id:uid(),name:'Rent',budget:1000,type:'fixed'},{id:uid(),name:'Wi-Fi',budget:94,type:'fixed'},{id:uid(),name:'Electricity',budget:200,type:'max'},{id:uid(),name:'Water',budget:200,type:'max'}],
      accounts:[{id:uid(),name:'LandBank',balance:0},{id:uid(),name:'GCash',balance:0},{id:uid(),name:'MariBank',balance:0}],
      credits:[{id:uid(),name:'ShopeePay Later',balance:0,due:'',fees:0},{id:uid(),name:'MariBank Credit',balance:0,due:'',fees:0}],
      savings:{emergency:0,gala:0},
      transactions:[],
      goals:[{id:uid(),name:'Emergency Fund',target:2000,saved:0},{id:uid(),name:'Replace Phone',target:6000,saved:0},{id:uid(),name:'Glasses',target:0,saved:0}],
    },
    inventory:[
      ['Personal Care','Cleanser','have'],['Personal Care','Serum','have'],['Personal Care','Moisturizer','have'],['Personal Care','Sunscreen','have'],['Personal Care','Toothpaste','have'],['Personal Care','Shampoo','need'],['Personal Care','Soap / Body Wash','low'],['Personal Care','Deodorant','need'],['Personal Care','Conditioner','need'],['Personal Care','Razor','have'],['Personal Care','Hair Product','dont-use'],['Personal Care','Perfume','have'],['Personal Care','Cotton Buds','need'],['Personal Care','Tissue / Wipes','have'],['Personal Care','Nail Clipper','replace'],['Personal Care','Comb','need'],['Personal Care','Towel','replace'],
      ['Clothes','Shirts','have'],['Clothes','Shorts','have'],['Clothes','Underwear','have'],['Clothes','Socks','low'],['Clothes','Shoes','low'],['Clothes','Jackets','have'],['Clothes','Formal Clothes','have'],['Clothes','Bags','low'],
      ['Electronics','Phone','replace'],['Electronics','Laptop','have'],['Electronics','Power Bank','dont-use'],['Electronics','Earphones','have'],['Electronics','Mouse','have'],['Electronics','Flash Drive','need'],['Electronics','Cable','unset'],
      ['Room / Household','Bedsheet','have'],['Room / Household','Pillowcase','have'],['Room / Household','Laundry Basket','have'],['Room / Household','Fan','have'],['Room / Household','Hangers','dont-use'],['Room / Household','Cleaning Supplies','low'],['Room / Household','Storage Boxes','dont-use'],
      ['School / Thesis','Notebook','have'],['School / Thesis','Pens','have'],['School / Thesis','Calculator','have'],['School / Thesis','USB','have'],['School / Thesis','Printing Supplies','low'],['School / Thesis','Tools','have'],['School / Thesis','Thesis Materials','need'],
      ['Food / Groceries','Rice','have'],['Food / Groceries','Coffee','dont-use'],['Food / Groceries','Eggs','low'],['Food / Groceries','Canned Food','dont-use'],['Food / Groceries','Water','have'],['Food / Groceries','Condiments','low'],['Food / Groceries','Snacks','need'],
    ].map(([category,name,status])=>({id:uid(),category,name,status,qty:1,price:0,note:''})),
    goals:[
      {id:uid(),name:'Finish Thesis Proposal',target:'Oct 26 – Nov 7, 2026',kind:'thesis',progress:0},
      {id:uid(),name:'Build Emergency Fund',target:'₱1,000–₱2,000',kind:'money',progress:0},
      {id:uid(),name:'Replace Phone',target:'₱6,000',kind:'money',progress:0},
      {id:uid(),name:'Finish Thesis',target:'Last week of February 2027',kind:'thesis',progress:0},
      {id:uid(),name:'Graduate',target:'June 2027',kind:'life',progress:0},
      {id:uid(),name:'Fix Sleep Schedule',target:'By November 2026',kind:'routine',progress:0},
      {id:uid(),name:'Become More Organized',target:'By January 2027',kind:'growth',progress:0},
    ],
    notes:[],
    interruptions:[],
    mindmap:{nodes:[
      {id:'life',label:'My Life',parent:null,x:500,y:350},
      {id:'thesis',label:'Thesis',parent:'life',x:500,y:100},{id:'health',label:'Health',parent:'life',x:230,y:210},{id:'money',label:'Money',parent:'life',x:770,y:210},{id:'personal',label:'Personal',parent:'life',x:210,y:500},{id:'routine',label:'Routine',parent:'life',x:790,y:500},{id:'goals',label:'Goals',parent:'life',x:500,y:620},{id:'buy',label:'Things to Buy',parent:'personal',x:65,y:650},
      {id:'proposal',label:'Proposal',parent:'thesis',x:350,y:30},{id:'conduct',label:'Conduct',parent:'thesis',x:500,y:25},{id:'defense',label:'Final Defense',parent:'thesis',x:650,y:30}
    ]}
  });

  const STORAGE='edjay-life-organizer-v3';
  let state;
  try{ state=JSON.parse(localStorage.getItem(STORAGE)) || defaultState(); }catch{ state=defaultState(); }
  // Small additive migration: preserve existing V3 data while adding newer fields.
  state.workouts ||= {library:[],assignments:{}};
  state.workouts.library ||= [];
  state.workouts.assignments ||= {};
  state.workouts.statuses ||= {};
  state.interruptions ||= [];
  state.settings ||= {};
  if(state.settings.autoNoMin === undefined) state.settings.autoNoMin=3;
  if(state.settings.vibration === undefined) state.settings.vibration=true;
  const save=()=>{ localStorage.setItem(STORAGE,JSON.stringify(state)); applyTheme(); };
  const reset=()=>{ state=defaultState(); save(); render(); };
  const todayKey=()=>nowDateKey();
  const dayState=()=> state.daily[todayKey()] ||= {schedule:{},template:state.settings.dayTemplate||'home',interruption:null};
  const routineDay=()=> state.routineDaily[todayKey()] ||= {};

  function levelInfo(){
    const xp=Math.max(0,state.profile.xp||0); let idx=0;
    for(let i=0;i<LEVELS.length;i++) if(xp>=LEVELS[i][1]) idx=i;
    const cur=LEVELS[idx], next=LEVELS[idx+1];
    const pct=next? clamp((xp-cur[1])/(next[1]-cur[1])*100,0,100):100;
    return {idx,level:idx+1,title:cur[0],xp,next,pct};
  }
  function addXP(amount,reason){
    amount=Number(amount)||0; const key=todayKey();
    if(amount<0){ const used=Math.abs(state.profile.dailyLoss[key]||0); const allowed=Math.max(0,60-used); const actual=Math.max(-allowed,amount); amount=actual; state.profile.dailyLoss[key]=(state.profile.dailyLoss[key]||0)+Math.abs(actual); }
    state.profile.xp=Math.max(0,(state.profile.xp||0)+amount);
    state.profile.xpEvents.unshift({id:uid(),date:new Date().toISOString(),amount,reason}); state.profile.xpEvents=state.profile.xpEvents.slice(0,300); save();
  }
  function undoReward(amount,reason){
    const value=Math.max(0,Number(amount)||0); if(!value)return;
    state.profile.xp=Math.max(0,(state.profile.xp||0)-value);
    state.profile.xpEvents.unshift({id:uid(),date:new Date().toISOString(),amount:-value,reason,correction:true}); state.profile.xpEvents=state.profile.xpEvents.slice(0,300); save();
  }
  const taskXP=t=>XP_CONFIG.task?.[String(t.importance||'normal').replace(/^./,c=>c.toUpperCase())] ?? 20;
  const missXP=t=>-(XP_CONFIG.miss?.[String(t.importance||'normal').replace(/^./,c=>c.toUpperCase())] ?? 10);

  function thesisStats(){
    const all=state.thesis.stages.flatMap(s=>s.items); if(!all.length)return {done:0,total:0,pct:0};
    const weights={'not-started':0,'in-progress':.35,'for-checking':.7,'needs-revision':.55,'done':1};
    const score=all.reduce((a,x)=>a+(weights[x.status]??0),0); return {done:all.filter(x=>x.status==='done').length,total:all.length,pct:Math.round(score/all.length*100)};
  }
  function dailyProgress(){
    const ds=dayState(); const sched=state.scheduleTemplates[ds.template]||[]; const vals=sched.map(x=>ds.schedule[x.id]?.status||'pending');
    const active=vals.filter(v=>!['excused','not-today','rescheduled'].includes(v)); const done=active.filter(v=>v==='done').length;
    return active.length?Math.round(done/active.length*100):0;
  }
  function thesisCostStats(){
    const bomPlanned=state.thesis.bom.reduce((z,x)=>z+Number(x.qty||0)*Number(x.cost||0),0);
    const otherPlanned=state.thesis.otherCosts.reduce((z,x)=>z+Number(x.planned||0),0);
    const bomSpent=state.thesis.bom.reduce((z,x)=>{
      const planned=Number(x.qty||0)*Number(x.cost||0);
      if(x.actual!=null && x.actual!=='') return z+Number(x.actual||0);
      return z+(x.purchased?planned:0);
    },0);
    const otherSpent=state.thesis.otherCosts.reduce((z,x)=>z+(x.actual==null?0:Number(x.actual||0)),0);
    const planned=bomPlanned+otherPlanned, spent=bomSpent+otherSpent;
    return {bomPlanned,otherPlanned,planned,bomSpent,otherSpent,spent,remaining:Math.max(0,planned-spent),pct:planned?clamp(Math.round(spent/planned*100),0,100):0,purchased:state.thesis.bom.filter(x=>x.purchased).length,totalItems:state.thesis.bom.length};
  }
  function dashboardStats(){
    const ds=dayState(), sched=state.scheduleTemplates[ds.template]||[];
    const schedStates=sched.map(x=>ds.schedule[x.id]?.status||'pending');
    const scheduleDone=schedStates.filter(x=>x==='done').length;
    const schedulePending=schedStates.filter(x=>x==='pending').length;
    const tasksToday=state.tasks.filter(t=>!t.due||t.due===todayKey());
    const tasksDone=tasksToday.filter(t=>t.status==='done').length;
    const tasksPending=tasksToday.filter(t=>t.status==='pending').length;
    const rd=routineDay(), routineItems=state.routines.flatMap(g=>g.items);
    const routineDone=routineItems.filter(i=>rd[i.id]==='done').length;
    const routineActive=routineItems.filter(i=>!['not-today','excused'].includes(rd[i.id]||'pending')).length;
    const thesis=thesisStats();
    const balance=state.money.accounts.reduce((a,x)=>a+Number(x.balance||0),0);
    const savings=Number(state.money.savings?.emergency||0)+Number(state.money.savings?.gala||0);
    const credit=state.money.credits.reduce((a,x)=>a+Number(x.balance||0),0);
    const inventoryNeed=state.inventory.filter(x=>['need','low','replace'].includes(x.status)).length;
    const workoutAssignment=state.workouts.assignments[todayKey()];
    const workoutStatus=state.workouts.statuses?.[todayKey()] || (workoutAssignment==='REST'?'Rest Day':workoutAssignment?'Pending':'Not planned');
    const goalsDone=state.goals.filter(g=>Number(g.progress||0)>=100).length;
    return {scheduleDone,schedulePending,tasksDone,tasksPending,routineDone,routineActive,thesis,balance,savings,credit,inventoryNeed,workoutStatus,goalsDone,goalsTotal:state.goals.length};
  }
  function applyTheme(){ document.body.classList.toggle('dark',state.settings.theme==='dark'); }

  const view=$('#view'); let currentView='today'; let scheduleExpanded=false;
  function setView(v){currentView=v; $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===v)); render(); window.scrollTo({top:0,behavior:'smooth'});}
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('#profileBtn').addEventListener('click',()=>renderProfile());
  $('#fab').addEventListener('click',()=>quickAdd());
  $('#closeSheet').addEventListener('click',closeSheet); $('#sheetBackdrop').addEventListener('click',closeSheet);
  function openSheet(title,html){$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=html;$('#sheet').classList.remove('hidden');$('#sheetBackdrop').classList.remove('hidden');}
  function closeSheet(){ $('#sheet').classList.add('hidden');$('#sheetBackdrop').classList.add('hidden'); }
  function openFull(html){$('#fullscreenBody').innerHTML=html;$('#fullscreen').classList.remove('hidden');}
  function closeFull(){ $('#fullscreen').classList.add('hidden'); $('#fullscreenBody').innerHTML=''; }

  function render(){ applyTheme(); if(currentView==='today')renderToday(); else if(currentView==='tasks')renderTasks(); else if(currentView==='plan')renderPlan(); else renderLife(); }

  function renderToday(){
    const li=levelInfo(), ds=dayState(), sched=state.scheduleTemplates[ds.template]||[], prog=dailyProgress();
    const activeInt=state.interruptions.find(x=>x.active);
    const assign=state.workouts.assignments[todayKey()]; const workout=state.workouts.library.find(w=>w.id===assign);
    view.innerHTML=`
      <div class="today-hero page-head"><div><div class="today-is">Today is</div><h1>${fmtDate(todayKey(),{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</h1><p>My day, without the clutter.</p></div><button class="date-chip" id="templateBtn">${ds.template==='home'?'Home Day':'Going Out Day'} ▾</button></div>

      <section class="card level-card level-feature">
        <div class="level-feature-top">
          <button class="level-btn" id="levelOpen"><div class="eyebrow">LEVEL ${li.level}</div><div class="title-rank">${esc(li.title)}</div><div class="subtle">Tap to open my full level path</div></button>
          <div class="level-orb">${li.level}</div>
        </div>
        <div class="progress level-progress"><span style="width:${li.pct}%"></span></div>
        <div class="progress-meta"><span>${li.xp.toLocaleString()} XP</span><span>${li.next?`${(li.next[1]-li.xp).toLocaleString()} XP to Lv. ${li.level+1}`:'MAX LEVEL'}</span></div>
        <div class="level-preview">${levelPreviewHtml(li)}</div>
      </section>

      <section class="card progress-feature"><div class="card-head"><div class="row"><span class="section-icon green">◎</span><div><h2>Daily Progress</h2><div class="subtle">Keep the day moving</div></div></div><span class="progress-callout">${prog>=100?'Complete!':prog>=70?'Doing great!':prog>=35?'Keep going':'Start strong'}</span></div><div class="progress-layout"><div class="big-value">${prog}%</div><div class="progress grow"><span style="width:${prog}%"></span></div></div></section>
      ${(()=>{const st=dashboardStats();return `<section class="card"><div class="card-head"><div><h2>Today at a Glance</h2><div class="subtle">Tap a stat to open it</div></div></div><div class="stat-grid glance-grid"><button class="stat stat-link" data-jump="schedule"><b>${st.scheduleDone}/${st.scheduleDone+st.schedulePending}</b><span>Schedule done</span></button><button class="stat stat-link" data-jump="tasks"><b>${st.tasksPending}</b><span>Tasks pending</span></button><button class="stat stat-link" data-jump="routine"><b>${st.routineDone}/${st.routineActive}</b><span>Routine done</span></button><button class="stat stat-link" data-jump="workout"><b>${esc(st.workoutStatus)}</b><span>Workout</span></button></div></section>`;})()}

      ${activeInt?`<section class="card interruption"><div class="card-head"><div><div class="eyebrow">Unexpected / Emergency</div><h2>${esc(activeInt.title)}</h2></div><span class="pill warn">${esc(activeInt.kind)}</span></div><div class="subtle">Started ${formatTime(activeInt.time)} • Flexible plans can move without unfair XP loss.</div><div class="mini-actions"><button class="btn small primary" data-int-action="resume" data-id="${activeInt.id}">Resume Plan</button><button class="btn small" data-int-action="shift" data-id="${activeInt.id}">Shift Flexible</button><button class="btn small" data-int-action="excuse" data-id="${activeInt.id}">Excuse Affected</button><button class="btn small" data-int-action="not-today" data-id="${activeInt.id}">Not Today</button><button class="btn small" data-int-action="resolve" data-id="${activeInt.id}">Resolve</button></div></section>`:''}

      <div class="dashboard-pair">
        <section class="card"><div class="card-head"><div class="row"><span class="section-icon green">☑</span><h2>Today</h2></div><button class="btn small" data-qa="task">+ Task</button></div><div class="list">${todayTasksHtml()}</div></section>
        <section class="card"><div class="card-head"><div class="row"><span class="section-icon blue">◷</span><h2>Up Next</h2></div><span class="subtle">Schedule</span></div><div class="timeline-list">${upNextHtml(sched,ds)}</div></section>
      </div>

      <section class="card quick-card"><div class="card-head"><div class="row"><span class="section-icon green">ϟ</span><h2>Quick Actions</h2></div></div><div class="quick-grid primary-actions"><button class="quick q-green" data-qa="task"><span>＋</span>Task</button><button class="quick q-blue" data-open="timer"><span>◷</span>Timer</button><button class="quick q-coral" data-open="workouts"><span>⌁</span>Workout</button><button class="quick q-purple" data-open="mindmap"><span>⌘</span>Mind Map</button></div><div class="mini-actions quick-secondary"><button class="btn small" data-qa="unexpected">⚡ Unexpected</button><button class="btn small" data-qa="reminder">⏰ Reminder</button><button class="btn small" data-qa="note">✎ Note</button></div></section>

      <section class="card" id="todayWorkout"><div class="card-head"><div class="row"><span class="section-icon coral">⌁</span><h2>Workout</h2></div><button class="btn small" data-open="workouts">Library</button></div>${assign==='REST'?`<div class="workout-today rest"><div><div class="row-title">REST DAY</div><div class="row-sub">Recovery is part of the plan • no XP penalty</div></div><span class="pill good">Rest</span></div>`:workout?`<div class="workout-today"><div><div class="row-title">${esc(workout.name)}</div><div class="row-sub">${workout.exercises.length} exercises • scheduled today</div></div><button class="btn primary" data-start-workout="${workout.id}">Start Workout</button></div>`:`<div class="empty soft-empty">No workout assigned today. Add one from Plan → Workout Calendar.</div>`}</section>

      <section class="card" id="todayRoutine"><div class="card-head"><div class="row"><span class="section-icon amber">☀</span><h2>Routine</h2></div><button class="btn small" data-open="routine-manage">Manage</button></div>${routineOverview()}</section>

      <details class="card schedule-details" id="fullSchedule" ${scheduleExpanded?'open':''}><summary><div class="row"><span class="section-icon blue">◫</span><div><b>Full Schedule</b><div class="subtle">Tap to expand my whole day</div></div></div><span class="schedule-chevron" aria-hidden="true"></span></summary><div class="card-head schedule-tools"><span></span><button class="btn small" id="runningLate">Running Late</button></div><div class="list">${sched.map(x=>scheduleRow(x,ds)).join('')}</div></details>`;

    $('#templateBtn')?.addEventListener('click',templateSheet);
    $('#levelOpen')?.addEventListener('click',renderProfile);
    $('#runningLate')?.addEventListener('click',runningLateSheet);
  }

  function levelPreviewHtml(li){
    const start=Math.max(0,li.idx-1), end=Math.min(LEVELS.length,start+4);
    return LEVELS.slice(start,end).map((r,j)=>{const i=start+j;return `<button class="level-mini ${i===li.idx?'current':''} ${i>li.idx?'locked':''}" data-level-preview="${i}"><span>Lv. ${i+1}</span><b>${esc(r[0])}</b><small>${i<li.idx?'✓ Unlocked':i===li.idx?'Current':'🔒 Locked'}</small></button>`;}).join('')+`<button class="level-mini more" id="allLevels"><span>•••</span><b>All Levels</b><small>View path</small></button>`;
  }

  function upNextHtml(sched,ds){
    const now=new Date(), mins=now.getHours()*60+now.getMinutes();
    let list=sched.filter(x=>(ds.schedule[x.id]?.status||'pending')==='pending');
    const future=list.filter(x=>parseMinutes(x.time)>=mins);
    list=(future.length?future:list).slice(0,4);
    if(!list.length)return '<div class="empty">Nothing else scheduled today.</div>';
    return list.map((x,i)=>`<button class="timeline-row" data-sched-status="${x.id}"><span class="timeline-time">${formatTime(x.time)}</span><span class="timeline-dot dot-${i%4}"></span><span class="timeline-copy"><b>${esc(x.title)}</b><small>${x.flex==='fixed'?'Fixed':'Flexible'}</small></span></button>`).join('');
  }

  function scheduleRow(x,ds){ const st=ds.schedule[x.id]?.status||'pending'; const cls=st==='done'?'done':st==='missed'?'missed':(['not-today','excused','rescheduled'].includes(st))?'skip':''; const mark=st==='done'?'✓':st==='missed'?'✕':(['not-today','excused','rescheduled'].includes(st))?'–':''; return `<div class="list-row"><button class="check ${cls}" data-sched-status="${x.id}" aria-label="Update ${esc(x.title)}">${mark}</button><div><div class="row-title">${esc(x.title)}</div><div class="row-sub">${x.flex==='fixed'?'Fixed time':'Flexible'}${st!=='pending'?` • ${esc(st.replace('-',' '))}`:''}</div></div><div class="time">${formatTime(x.time)}</div></div>`; }
  function todayTasksHtml(){ const list=state.tasks.filter(t=>!t.due||t.due===todayKey()).slice(0,8); return list.length?list.map(t=>`<div class="list-row"><button class="check ${t.status==='done'?'done':t.status==='missed'?'missed':t.status==='excused'?'skip':''}" data-task-toggle="${t.id}">${t.status==='done'?'✓':t.status==='missed'?'✕':t.status==='excused'?'–':''}</button><div><div class="row-title">${esc(t.title)}</div><div class="row-sub">${esc(t.category)} • ${esc(t.importance)}</div></div><span class="pill">${t.due?fmtDate(t.due):'Anytime'}</span></div>`).join(''):`<div class="empty">No tasks yet.</div>`; }
  function routineOverview(){ const rd=routineDay(); return state.routines.map(g=>{ const vals=g.items.map(i=>rd[i.id]||'pending'); const done=vals.filter(x=>x==='done').length; return `<div class="row between" style="padding:9px 0;border-bottom:1px solid var(--line)"><div><div class="row-title">${esc(g.name)}</div><div class="row-sub">${done}/${g.items.length} done</div></div><button class="btn small" data-routine="${g.id}">Open</button></div>`; }).join(''); }

  function renderTasks(){ const ts=thesisStats(); view.innerHTML=`
    <div class="page-head"><div><h1>Tasks</h1><p>Universal inbox + thesis progress</p></div><span class="date-chip">${state.tasks.filter(t=>t.status!=='done').length} open</span></div>
    <div class="search"><input id="taskSearch" placeholder="Search tasks or thesis…"></div>
    <div class="chip-row" style="margin:10px 0"><button class="chip active" data-filter="all">All</button><button class="chip" data-filter="Thesis">Thesis</button><button class="chip" data-filter="Personal">Personal</button><button class="chip" data-filter="Chores">Chores</button><button class="chip" data-filter="Shopping">Shopping</button><button class="chip" data-filter="done">Done</button></div>
    <section class="card"><div class="card-head"><div><div class="eyebrow">THESIS</div><div class="big-value">${ts.pct}%</div></div><span class="pill blue">${ts.done}/${ts.total} sections done</span></div><div class="progress"><span style="width:${ts.pct}%"></span></div><button class="btn full soft" style="margin-top:12px" data-open="thesis">Open Thesis Roadmap</button></section>
    <section class="card"><div class="card-head"><h2>All Tasks</h2><button class="btn small" data-qa="task">+ Add</button></div><div id="taskList" class="list">${taskListHtml(state.tasks)}</div></section>`;
    $('#taskSearch').addEventListener('input',e=>filterTasks(e.target.value,$('.chip.active')?.dataset.filter||'all'));
    $$('.chip[data-filter]').forEach(c=>c.addEventListener('click',()=>{$$('.chip[data-filter]').forEach(x=>x.classList.remove('active'));c.classList.add('active');filterTasks($('#taskSearch').value,c.dataset.filter);}));
  }
  function taskListHtml(list){ return list.length?list.map(t=>`<div class="list-row"><button class="check ${t.status==='done'?'done':t.status==='missed'?'missed':t.status==='excused'?'skip':''}" data-task-toggle="${t.id}">${t.status==='done'?'✓':t.status==='missed'?'✕':t.status==='excused'?'–':''}</button><div><div class="row-title">${esc(t.title)}</div><div class="row-sub">${esc(t.category)} • ${esc(t.importance)}${t.due?` • ${fmtDate(t.due)}`:''}</div></div><button class="btn small" data-task-more="${t.id}">•••</button></div>`).join(''):`<div class="empty">No matching tasks.</div>`; }
  function filterTasks(q,filter){ q=(q||'').toLowerCase(); let list=state.tasks.filter(t=>t.title.toLowerCase().includes(q)); if(filter==='done')list=list.filter(t=>t.status==='done'); else if(filter!=='all')list=list.filter(t=>t.category===filter); $('#taskList').innerHTML=taskListHtml(list); }

  function renderPlan(){
    const d=new Date(), y=d.getFullYear(),m=d.getMonth(); view.innerHTML=`
      <div class="page-head plan-head"><div><h1>Plan</h1><p>Goals, calendar, thesis roadmap and mind map</p></div></div>
      <section class="card week-strip-card">${weekStripHtml()}</section>
      <section class="card mind-preview-card"><div class="card-head"><div class="row"><span class="section-icon purple">⌘</span><div><h2>Mind Map</h2><div class="subtle">My life at a glance</div></div></div><button class="btn small" data-open="mindmap">See full map</button></div>${mindMapPreviewHtml()}</section>
      <section class="card"><div class="card-head"><div class="row"><span class="section-icon blue">🎓</span><h2>Thesis Roadmap</h2></div><button class="btn small" data-open="thesis">Open</button></div>${thesisMini()}</section>
      <section class="card"><div class="card-head"><div class="row"><span class="section-icon green">◎</span><h2>Goals</h2></div><button class="btn small" data-qa="goal">+ Goal</button></div>${goalsHtml()}</section>
      <section class="card"><div class="card-head"><div class="row"><span class="section-icon coral">⌁</span><h2>Workout Calendar</h2></div><span class="subtle">Drag or tap to assign</span></div><div id="workoutPicker" class="workout-picker">${workoutPickerHtml()}</div><div class="row between calendar-title"><button class="btn small" id="prevMonth">‹</button><b id="monthTitle"></b><button class="btn small" id="nextMonth">›</button></div><div id="calendar"></div></section>
      <section class="card focus-preview"><div class="card-head"><div class="row"><span class="section-icon blue">◷</span><div><h2>Focus Timer</h2><div class="subtle">Quick thesis / study session</div></div></div><button class="btn primary small" data-open="timer">Start Timer</button></div></section>`;
    let calDate=new Date(y,m,1); let selectedWorkout=null;
    const redraw=()=>{ $('#monthTitle').textContent=calDate.toLocaleDateString('en-US',{month:'long',year:'numeric'}); $('#calendar').innerHTML=calendarHtml(calDate,selectedWorkout); bindCalendar(); };
    const bindCalendar=()=>{
      $$('.workout-card[data-wid]').forEach(w=>w.addEventListener('click',()=>{selectedWorkout=w.dataset.wid; $$('.workout-card[data-wid]').forEach(x=>x.classList.toggle('selected',x.dataset.wid===selectedWorkout)); redraw();}));
      $$('.day[data-date]').forEach(day=>{day.addEventListener('click',()=>{if(selectedWorkout){state.workouts.assignments[day.dataset.date]=selectedWorkout;save();redraw();}else dayAssignSheet(day.dataset.date);}); day.addEventListener('dragover',e=>e.preventDefault()); day.addEventListener('drop',e=>{e.preventDefault();const wid=e.dataTransfer.getData('text/workout');if(wid){state.workouts.assignments[day.dataset.date]=wid;save();redraw();}});});
      $$('.workout-card[draggable="true"]').forEach(w=>w.addEventListener('dragstart',e=>e.dataTransfer.setData('text/workout',w.dataset.wid)));
    };
    $('#prevMonth').addEventListener('click',()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()-1,1);redraw();}); $('#nextMonth').addEventListener('click',()=>{calDate=new Date(calDate.getFullYear(),calDate.getMonth()+1,1);redraw();}); redraw();
  }

  function weekStripHtml(){
    const now=new Date(), sun=new Date(now); sun.setDate(now.getDate()-now.getDay());
    const days=[]; for(let i=0;i<7;i++){const x=new Date(sun);x.setDate(sun.getDate()+i);const key=`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;days.push(`<div class="week-day ${key===todayKey()?'active':''}"><small>${x.toLocaleDateString('en-US',{weekday:'short'})}</small><b>${x.getDate()}</b>${state.workouts.assignments[key]?'<i></i>':''}</div>`);}return `<div class="row between week-title"><div><div class="eyebrow">THIS WEEK</div><b>${now.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</b></div><span class="pill good">Today ${now.getDate()}</span></div><div class="week-strip">${days.join('')}</div>`;
  }

  function mindMapPreviewHtml(){
    const st=dashboardStats();
    return `<button class="mini-mindmap" data-open="mindmap" aria-label="Open live mind map"><svg viewBox="0 0 320 210" aria-hidden="true"><line x1="160" y1="105" x2="160" y2="35"/><line x1="160" y1="105" x2="62" y2="76"/><line x1="160" y1="105" x2="258" y2="76"/><line x1="160" y1="105" x2="70" y2="165"/><line x1="160" y1="105" x2="250" y2="165"/></svg><span class="map-node map-center">◎<b>My Life</b></span><span class="map-node map-top">🎓<b>Thesis ${st.thesis.pct}%</b></span><span class="map-node map-left">⌁<b>${esc(st.workoutStatus)}</b></span><span class="map-node map-right">☀<b>Routine ${st.routineDone}/${st.routineActive}</b></span><span class="map-node map-bl">₱<b>${peso(st.balance)}</b></span><span class="map-node map-br">☺<b>${st.inventoryNeed} need attention</b></span></button>`;
  }

  function workoutPickerHtml(){const rest=`<div class="workout-card" draggable="true" data-wid="REST"><div class="row between"><div><div class="row-title">REST DAY</div><div class="row-sub">Recovery / no workout</div></div><span class="pill good">drag / tap</span></div></div>`;return rest+state.workouts.library.map(w=>`<div class="workout-card" draggable="true" data-wid="${w.id}"><div class="row between"><div><div class="row-title">${esc(w.name)}</div><div class="row-sub">${w.exercises.length} exercises</div></div><span class="pill">drag / tap</span></div></div>`).join('');}
  function calendarHtml(base){const y=base.getFullYear(),m=base.getMonth();const first=new Date(y,m,1),start=new Date(y,m,1-first.getDay());let html='<div class="calendar">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="cal-head">${x}</div>`).join('');for(let i=0;i<42;i++){const dt=new Date(start);dt.setDate(start.getDate()+i);const key=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;const wid=state.workouts.assignments[key],w=state.workouts.library.find(x=>x.id===wid);html+=`<button class="day ${dt.getMonth()!==m?'other':''} ${key===todayKey()?'today':''}" data-date="${key}"><div class="day-num">${dt.getDate()}</div>${wid==='REST'?`<div class="cal-chip">REST DAY</div>`:w?`<div class="cal-chip">${esc(w.name)}</div>`:''}${state.workouts.statuses?.[key]&&state.workouts.statuses[key]!=='Pending'?`<small class="cal-status">${esc(state.workouts.statuses[key])}</small>`:''}</button>`;}return html+'</div>';}
  function dayAssignSheet(date){
    const wid=state.workouts.assignments[date], currentStatus=state.workouts.statuses?.[date]||'Pending';
    openSheet(`Workout • ${fmtDate(date,{month:'short',day:'numeric',year:'numeric'})}`,`<div class="form">
      <div class="field"><label>Workout</label><select id="assignWorkout"><option value="">None</option><option value="REST" ${wid==='REST'?'selected':''}>REST DAY</option>${state.workouts.library.map(w=>`<option value="${w.id}" ${w.id===wid?'selected':''}>${esc(w.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select id="workoutStatus">${['Pending','Completed','Rescheduled','Excused','Not Today','Missed'].map(x=>`<option ${x===currentStatus?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="help">Only a true Missed workout deducts XP. REST DAY, Rescheduled, Excused and Not Today do not.</div>
      <button class="btn primary" id="saveAssign">Save</button>
    </div>`);
    $('#saveAssign').onclick=()=>{
      const v=$('#assignWorkout').value, nextStatus=$('#workoutStatus').value, prevStatus=state.workouts.statuses?.[date]||'Pending';
      if(v) state.workouts.assignments[date]=v; else delete state.workouts.assignments[date];
      state.workouts.statuses ||= {}; state.workouts.statuses[date]=nextStatus;
      if(prevStatus!=='Completed'&&nextStatus==='Completed'&&v&&v!=='REST') addXP(XP_CONFIG.workout||50,'Workout completed');
      if(prevStatus!=='Missed'&&nextStatus==='Missed'&&v&&v!=='REST') addXP(-20,'Missed workout');
      save(); closeSheet(); renderPlan();
    };
  }
  function thesisMini(){return state.thesis.stages.slice(0,4).map(s=>{const done=s.items.filter(i=>i.status==='done').length,p=Math.round(done/s.items.length*100);return `<div style="padding:7px 0"><div class="row between"><span class="row-title">${esc(s.name)}</span><span class="subtle">${p}%</span></div><div class="progress small"><span style="width:${p}%"></span></div></div>`;}).join('');}
  function goalsHtml(){return state.goals.map(g=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="row between"><div><div class="row-title">${esc(g.name)}</div><div class="row-sub">${esc(g.target)}</div></div><span class="pill">${g.progress||0}%</span></div><div class="progress small" style="margin-top:7px"><span style="width:${clamp(g.progress||0,0,100)}%"></span></div></div>`).join('');}

  function renderLife(){
    const allowance=state.money.allowance, saved=allowance.weekly*allowance.savingsRate, spend=allowance.weekly-saved;
    const acctTotal=state.money.accounts.reduce((a,x)=>a+Number(x.balance||0),0);
    const thesisCost=thesisCostStats();
    const thesisPlanned=thesisCost.planned, thesisActual=thesisCost.spent, thesisPct=thesisCost.pct;
    const summary=(cat)=>{const arr=state.inventory.filter(x=>x.category===cat);return {total:arr.length,need:arr.filter(x=>['need','replace'].includes(x.status)).length,low:arr.filter(x=>x.status==='low').length};};
    const pc=summary('Personal Care'), clothes=summary('Clothes'), food=summary('Food / Groceries'), elec=summary('Electronics'), room=summary('Room / Household'), school=summary('School / Thesis');
    view.innerHTML=`
      <div class="page-head life-head"><div><h1>Life</h1><p>Everything I manage outside the task list</p></div><span class="date-chip">Offline • Saved</span></div>
      <section class="life-hero card"><div><div class="eyebrow">MY LIFE</div><div class="big-value">My personal systems</div><p class="subtle">Care, clothes, food, money, belongings, health and habits.</p></div><div class="life-hero-badge">E</div></section>
      <div class="life-grid">
        <button class="life-tile tone-pink" data-life-cat="Personal Care"><span class="life-icon">✿</span><span><b>Personal Care</b><small>${pc.need} need/replace • ${pc.low} low</small></span></button>
        <button class="life-tile tone-purple" data-life-cat="Clothes"><span class="life-icon">👕</span><span><b>Clothes</b><small>${clothes.need} need/replace • ${clothes.low} low</small></span></button>
        <button class="life-tile tone-amber" data-life-cat="Food / Groceries"><span class="life-icon">🍎</span><span><b>Food & Groceries</b><small>${food.need} need • ${food.low} low</small></span></button>
        <button class="life-tile tone-blue" data-open="money"><span class="life-icon">₱</span><span><b>Money</b><small>${peso(spend)} spendable / week</small></span></button>
        <button class="life-tile tone-cyan" data-life-group="belongings"><span class="life-icon">▣</span><span><b>Belongings</b><small>${elec.total+room.total+school.total} tracked items</small></span></button>
        <button class="life-tile tone-green" data-open="workouts"><span class="life-icon">✚</span><span><b>Health & Workout</b><small>${state.workouts.library.length} workout template${state.workouts.library.length===1?'':'s'}</small></span></button>
        <button class="life-tile tone-mint" data-open="routine-manage"><span class="life-icon">✓</span><span><b>Habits & Routine</b><small>${state.routines.length} routine groups</small></span></button>
        <button class="life-tile tone-indigo" data-open="inventory"><span class="life-icon">⌕</span><span><b>All Inventory</b><small>Browse every item</small></span></button>
      </div>
      <section class="card"><div class="card-head"><div class="row"><span class="section-icon blue">₱</span><h2>Money Snapshot</h2></div><button class="btn small" data-open="money">Open Money</button></div><div class="stat-grid"><div class="stat pastel-stat"><b class="money">${peso(acctTotal)}</b><span>Across LandBank, GCash & MariBank</span></div><div class="stat pastel-stat"><b class="money">${peso(saved)}</b><span>Weekly savings target</span></div></div></section>
      <section class="card"><div class="card-head"><div class="row"><span class="section-icon purple">🎓</span><h2>Thesis Cost</h2></div><button class="btn small" data-open="bom">Open Budget</button></div><div class="row between"><div><div class="big-value money">${peso(thesisPlanned)}</div><div class="subtle">BOM + proposal/panel costs</div></div><span class="pill blue">${thesisPct}% used</span></div><div class="progress" style="margin-top:10px"><span style="width:${thesisPct}%"></span></div><div class="progress-meta"><span>${peso(thesisActual)} actual</span><span>${peso(Math.max(0,thesisPlanned-thesisActual))} remaining</span></div></section>
      ${(()=>{const st=dashboardStats();const buyTotal=state.inventory.length;const okay=Math.max(0,buyTotal-st.inventoryNeed);const invPct=buyTotal?Math.round(okay/buyTotal*100):100;return `<section class="card"><div class="card-head"><div><h2>My Stats</h2><div class="subtle">Automatically calculated from my app data</div></div></div><div class="stat-grid"><button class="stat stat-link" data-stat-open="thesis"><b>${st.thesis.pct}%</b><span>Thesis progress</span></button><button class="stat stat-link" data-stat-open="money"><b>${peso(st.balance)}</b><span>Current money</span></button><button class="stat stat-link" data-stat-open="tasks"><b>${st.tasksPending}</b><span>Pending tasks today</span></button><button class="stat stat-link" data-stat-open="attention"><b>${st.inventoryNeed}</b><span>Items needing attention</span></button></div><button class="stats-progress-link" data-stat-open="inventory"><div class="section-title">Inventory readiness</div><div class="progress small"><span style="width:${invPct}%"></span></div><div class="progress-meta"><span>${okay} okay</span><span>${st.inventoryNeed} need/low/replace</span></div></button><div class="section-title">Goals completed</div><div class="progress small"><span style="width:${st.goalsTotal?Math.round(st.goalsDone/st.goalsTotal*100):0}%"></span></div><div class="progress-meta"><span>${st.goalsDone} completed</span><span>${st.goalsTotal-st.goalsDone} active</span></div></section>`;})()}
      <section class="card"><div class="card-head"><div class="row"><span class="section-icon amber">!</span><h2>Need Attention</h2></div><button class="btn small" data-open="inventory">See all</button></div>${inventorySummary()}</section>
      <section class="card"><div class="card-head"><div class="row"><span class="section-icon purple">✎</span><h2>Notes</h2></div><button class="btn small" data-qa="note">+ Note</button></div>${state.notes.slice(0,3).map(n=>`<div class="note-row"><div class="row-title">${esc(n.title||'Note')}</div><div class="row-sub">${esc((n.text||'').slice(0,100))}</div></div>`).join('')||'<div class="empty soft-empty">Notes stay secondary, but they are always available here.</div>'}</section>`;
  }

  function inventorySummary(){const need=state.inventory.filter(x=>x.status==='need').length,low=state.inventory.filter(x=>x.status==='low').length,rep=state.inventory.filter(x=>x.status==='replace').length;return `<div class="grid3"><div class="stat"><b>${need}</b><span>Need to buy</span></div><div class="stat"><b>${low}</b><span>Low</span></div><div class="stat"><b>${rep}</b><span>Replace</span></div></div>`;}

  function quickAdd(kind){ if(!kind){openSheet('Quick Add',`<div class="quick-grid"><button class="quick" data-qa="unexpected"><span>⚡</span>Unexpected</button><button class="quick" data-qa="task"><span>✓</span>Task</button><button class="quick" data-qa="reminder"><span>⏰</span>Reminder</button><button class="quick" data-qa="expense"><span>₱</span>Expense</button><button class="quick" data-qa="inventory"><span>□</span>Item</button><button class="quick" data-qa="goal"><span>◎</span>Goal</button><button class="quick" data-qa="note"><span>✎</span>Note</button><button class="quick" data-open="workouts"><span>🏋</span>Workout</button></div>`);return; }
    if(kind==='task') taskForm(); else if(kind==='unexpected') unexpectedForm(); else if(kind==='reminder') reminderForm(); else if(kind==='expense') expenseForm(); else if(kind==='inventory') inventoryForm(); else if(kind==='goal') goalForm(); else if(kind==='note') noteForm();
  }
  function taskForm(t){openSheet(t?'Edit Task':'Add Task',`<form class="form" id="taskForm"><div class="field"><label>Task</label><input id="tTitle" required value="${esc(t?.title||'')}"></div><div class="grid2"><div class="field"><label>Category</label><select id="tCat">${['Thesis','Personal','Chores','Shopping','Other'].map(x=>`<option ${t?.category===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Importance</label><select id="tImp">${['small','normal','important'].map(x=>`<option ${t?.importance===x?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="field"><label>Due date (optional)</label><input id="tDue" type="date" value="${t?.due||''}"></div><button class="btn primary">Save Task</button>${t?'<button type="button" class="btn danger" id="deleteTask">Delete</button>':''}</form>`);$('#taskForm').onsubmit=e=>{e.preventDefault();if(t){t.title=$('#tTitle').value.trim();t.category=$('#tCat').value;t.importance=$('#tImp').value;t.due=$('#tDue').value;}else state.tasks.unshift({id:uid(),title:$('#tTitle').value.trim(),category:$('#tCat').value,importance:$('#tImp').value,due:$('#tDue').value,status:'pending'});save();closeSheet();render();};if(t)$('#deleteTask').onclick=()=>{state.tasks=state.tasks.filter(x=>x.id!==t.id);save();closeSheet();render();};}
  function unexpectedForm(){openSheet('Unexpected / Emergency',`<form class="form" id="intForm"><div class="field"><label>What happened?</label><input id="intTitle" required placeholder="Unexpected visitors, urgent work, fold clothes…"></div><div class="field"><label>Type</label><select id="intKind"><option>Urgent</option><option>Important but flexible</option><option>Quick task</option><option>Event / interruption</option></select></div><div class="field"><label>Start time</label><input id="intTime" type="time" value="${new Date().toTimeString().slice(0,5)}"></div><button class="btn primary">Start Interruption</button></form>`);$('#intForm').onsubmit=e=>{e.preventDefault();state.interruptions.forEach(x=>x.active=false);state.interruptions.unshift({id:uid(),title:$('#intTitle').value.trim(),kind:$('#intKind').value,time:$('#intTime').value,active:true,date:todayKey()});save();closeSheet();render();};}
  function reminderForm(){openSheet('Add Reminder',`<form class="form" id="remForm"><div class="field"><label>Reminder</label><input id="rTitle" required></div><div class="grid2"><div class="field"><label>Date</label><input id="rDate" type="date" value="${todayKey()}"></div><div class="field"><label>Time</label><input id="rTime" type="time"></div></div><button class="btn primary">Save Reminder</button></form>`);$('#remForm').onsubmit=e=>{e.preventDefault();state.reminders.push({id:uid(),title:$('#rTitle').value,date:$('#rDate').value,time:$('#rTime').value,status:'pending'});save();scheduleNotifications();closeSheet();render();};}
  function expenseForm(){openSheet('Add Expense',`<form class="form" id="expForm"><div class="field"><label>Description</label><input id="eTitle" required></div><div class="grid2"><div class="field"><label>Amount</label><input id="eAmt" type="number" min="0" step="0.01" required></div><div class="field"><label>Category</label><select id="eCat"><option>Food</option><option>Transport</option><option>Personal Care</option><option>Thesis</option><option>Gala</option><option>Bill</option><option>Other</option></select></div></div><div class="field"><label>Paid from</label><select id="eAcct">${state.money.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div><button class="btn primary">Record Expense</button></form>`);$('#expForm').onsubmit=e=>{e.preventDefault();const amt=Number($('#eAmt').value);const a=state.money.accounts.find(x=>x.id===$('#eAcct').value);if(a)a.balance-=amt;state.money.transactions.unshift({id:uid(),type:'expense',name:$('#eTitle').value,amount:amt,category:$('#eCat').value,account:a?.name||'',date:new Date().toISOString()});save();closeSheet();render();};}
  function inventoryForm(item){openSheet(item?'Edit Item':'Add Inventory Item',`<form class="form" id="invForm"><div class="field"><label>Item</label><input id="iName" required value="${esc(item?.name||'')}"></div><div class="field"><label>Category</label><input id="iCat" required value="${esc(item?.category||'Personal Care')}"></div><div class="field"><label>Status</label><select id="iStatus">${[['have','Have'],['low','Low'],['need','Need to Buy'],['replace','Replace'],['dont-use','Don’t Use'],['unset','Unset']].map(([v,l])=>`<option value="${v}" ${item?.status===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="grid2"><div class="field"><label>Qty</label><input id="iQty" type="number" min="0" value="${item?.qty??1}"></div><div class="field"><label>Est. price</label><input id="iPrice" type="number" min="0" value="${item?.price??0}"></div></div><button class="btn primary">Save Item</button>${item?'<button type="button" class="btn danger" id="deleteInv">Delete</button>':''}</form>`);$('#invForm').onsubmit=e=>{e.preventDefault();if(item){item.name=$('#iName').value;item.category=$('#iCat').value;item.status=$('#iStatus').value;item.qty=Number($('#iQty').value);item.price=Number($('#iPrice').value);}else state.inventory.push({id:uid(),name:$('#iName').value,category:$('#iCat').value,status:$('#iStatus').value,qty:Number($('#iQty').value),price:Number($('#iPrice').value),note:''});save();closeSheet();render();};if(item)$('#deleteInv').onclick=()=>{state.inventory=state.inventory.filter(x=>x.id!==item.id);save();closeSheet();render();};}
  function goalForm(){openSheet('Add Goal',`<form class="form" id="goalForm"><div class="field"><label>Goal</label><input id="gName" required></div><div class="field"><label>Target / target window</label><input id="gTarget" placeholder="e.g. January 2027"></div><button class="btn primary">Save Goal</button></form>`);$('#goalForm').onsubmit=e=>{e.preventDefault();state.goals.push({id:uid(),name:$('#gName').value,target:$('#gTarget').value,kind:'custom',progress:0});save();closeSheet();render();};}
  function noteForm(){openSheet('Quick Note',`<form class="form" id="noteForm"><div class="field"><label>Title</label><input id="nTitle"></div><div class="field"><label>Note</label><textarea id="nText" required></textarea></div><button class="btn primary">Save Note</button></form>`);$('#noteForm').onsubmit=e=>{e.preventDefault();state.notes.unshift({id:uid(),title:$('#nTitle').value,text:$('#nText').value,date:new Date().toISOString()});save();closeSheet();render();};}

  function templateSheet(){const ds=dayState();openSheet('Choose Today Template',`<div class="stack"><button class="btn ${ds.template==='home'?'primary':''}" data-template="home">Home Day</button><button class="btn ${ds.template==='out'?'primary':''}" data-template="out">Going Out Day</button><div class="help">Changing template does not erase my tasks, money or thesis data.</div></div>`);$$('[data-template]').forEach(b=>b.onclick=()=>{ds.template=b.dataset.template;state.settings.dayTemplate=b.dataset.template;save();closeSheet();renderToday();});}
  function runningLateSheet(){openSheet('Running Late',`<div class="stack"><button class="btn" data-late="shift">Shift remaining flexible activities</button><button class="btn" data-late="keep">Keep original times</button><button class="btn" data-late="manual">Choose manually</button><div class="help">Fixed activities stay in place unless you change them. Excused delays do not need an XP penalty.</div></div>`);$$('[data-late]').forEach(b=>b.onclick=()=>{if(b.dataset.late==='shift')shiftFlexible(30);closeSheet();render();});}
  function shiftFlexible(mins){const ds=dayState(), sched=state.scheduleTemplates[ds.template]||[]; const now=new Date(); const cur=now.getHours()*60+now.getMinutes(); sched.forEach(x=>{if(x.flex==='flex'&&parseMinutes(x.time)>=cur){const n=parseMinutes(x.time)+mins;x.time=`${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}});save();}
  function markAffectedFlexible(status){
    const ds=dayState(), sched=state.scheduleTemplates[ds.template]||[], now=new Date(), cur=now.getHours()*60+now.getMinutes();
    sched.forEach(x=>{const current=ds.schedule[x.id]?.status||'pending';if(x.flex==='flex'&&parseMinutes(x.time)>=cur&&current==='pending')ds.schedule[x.id]={status,at:new Date().toISOString(),reason:'unexpected'};});
    save();
  }

  function statusSheetSchedule(id){const ds=dayState(), item=(state.scheduleTemplates[ds.template]||[]).find(x=>x.id===id);if(!item)return;const current=ds.schedule[id]?.status||'pending';openSheet(item.title,`<div class="grid2">${current==='done'?'<button class="btn soft" data-sst="pending">↶ Undo</button>':'<button class="btn primary" data-sst="done">✓ Done</button>'}<button class="btn" data-sst="not-today">– Not Today</button><button class="btn" data-sst="excused">Excused</button><button class="btn" data-sst="rescheduled">Rescheduled</button><button class="btn danger" data-sst="missed">✕ Missed</button></div><div class="help" style="margin-top:10px">If I tap Done by mistake, open this again and use Undo. Not Today / Excused avoids unfair penalties.</div>`);$$('[data-sst]').forEach(b=>b.onclick=()=>{const prev=ds.schedule[id]?.status||'pending', next=b.dataset.sst; ds.schedule[id]={status:next,at:new Date().toISOString()}; const reward=item.title==='Workout'?(XP_CONFIG.workout||50):(XP_CONFIG.schedule||10); if(prev!=='done'&&next==='done')addXP(reward,`Completed: ${item.title}`); if(prev==='done'&&next==='pending')undoReward(reward,`Undo: ${item.title}`); if(prev!=='missed'&&next==='missed')addXP(-5,`Missed: ${item.title}`); save();if(nativeAndroid()){const tag=`schedule:${id}`;if(next==='pending')scheduleNotifications();else window.AndroidApp.cancelNotification(tag);}closeSheet();render(); if(next==='done')setTimeout(()=>finishEarlyPrompt(item),40);});}
  function finishEarlyPrompt(item){const ds=dayState(),sched=state.scheduleTemplates[ds.template]||[],idx=sched.findIndex(x=>x.id===item.id),next=sched[idx+1];if(!next)return;const n=new Date(),minsNow=n.getHours()*60+n.getMinutes(),gap=parseMinutes(next.time)-minsNow;if(gap<10)return;const canMove=next.flex==='flex';openSheet('Finished Early',`<div class="card compact" style="box-shadow:none"><div class="eyebrow">${gap} MINUTES AHEAD</div><div class="row-title" style="margin-top:5px">Next: ${esc(next.title)} at ${formatTime(next.time)}</div></div><div class="stack">${canMove?`<button class="btn primary" id="startNextNow">Start next flexible task now</button>`:''}<button class="btn" id="keepSchedule">Keep original schedule</button><button class="btn" id="freeTime">Use as free time</button></div><div class="help" style="margin-top:10px">Finishing early does not give bonus XP, so there is no reason to rush.</div>`);if(canMove)$('#startNextNow').onclick=()=>{next.time=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;save();closeSheet();render();};$('#keepSchedule').onclick=()=>closeSheet();$('#freeTime').onclick=()=>{state.interruptions.unshift({id:uid(),title:'Free time',kind:'Planned free time',time:`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`,active:false,date:todayKey(),resolved:new Date().toISOString()});save();closeSheet();};}

  function toggleTask(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;if(t.status==='done'){t.status='pending';undoReward(taskXP(t),`Undo: ${t.title}`);}else{t.status='done';addXP(taskXP(t),`Task: ${t.title}`);}save();render();}
  function taskMore(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;openSheet(t.title,`<div class="stack"><button class="btn" data-tact="edit">Edit</button><button class="btn" data-tact="excused">Excused / Rescheduled</button><button class="btn danger" data-tact="missed">Missed</button></div>`);$$('[data-tact]').forEach(b=>b.onclick=()=>{if(b.dataset.tact==='edit'){taskForm(t);return;}if(b.dataset.tact==='excused')t.status='excused';if(b.dataset.tact==='missed'){t.status='missed';addXP(missXP(t),`Missed: ${t.title}`);}save();closeSheet();render();});}

  function routineSheet(gid){const g=state.routines.find(x=>x.id===gid),rd=routineDay();if(!g)return;openSheet(g.name,`<div class="list">${g.items.map(i=>{const st=rd[i.id]||'pending';return `<div class="list-row"><button class="check ${st==='done'?'done':st==='missed'?'missed':st==='not-today'?'skip':''}" data-routine-toggle="${i.id}" aria-label="${st==='done'?'Undo':'Mark done'} ${esc(i.title)}">${st==='done'?'✓':st==='missed'?'✕':st==='not-today'?'–':''}</button><div><div class="row-title">${esc(i.title)}</div><div class="row-sub">${esc(i.schedule)}</div></div><button class="btn small" data-routine-item="${i.id}">Status</button></div>`;}).join('')}</div><button class="btn full" id="editRoutine" style="margin-top:10px">Edit Routine</button>`);$$('[data-routine-toggle]').forEach(b=>b.onclick=()=>{const iid=b.dataset.routineToggle,prev=rd[iid]||'pending';rd[iid]=prev==='done'?'pending':'done';if(prev!=='done')addXP(2,`Routine: ${g.items.find(x=>x.id===iid)?.title||'item'}`);else undoReward(2,`Undo routine: ${g.items.find(x=>x.id===iid)?.title||'item'}`);save();render();routineSheet(gid);});$$('[data-routine-item]').forEach(b=>b.onclick=()=>routineItemStatus(g,b.dataset.routineItem));$('#editRoutine').onclick=()=>manageRoutine(g);}
  function routineItemStatus(g,iid){const i=g.items.find(x=>x.id===iid),rd=routineDay();openSheet(i.title,`<div class="grid2"><button class="btn primary" data-ris="done">Done</button><button class="btn" data-ris="not-today">Not Today</button><button class="btn danger" data-ris="missed">Missed</button><button class="btn" data-ris="pending">Pending</button></div>`);$$('[data-ris]').forEach(b=>b.onclick=()=>{const prev=rd[iid]||'pending',n=b.dataset.ris;rd[iid]=n;if(prev!=='done'&&n==='done')addXP(2,`Routine: ${i.title}`);if(prev!=='missed'&&n==='missed')addXP(-2,`Missed routine: ${i.title}`);save();closeSheet();render();});}
  function manageRoutine(g){openSheet(`Edit ${g.name}`,`<div class="list">${g.items.map(i=>`<div class="list-row"><span>•</span><div class="row-title">${esc(i.title)}</div><button class="btn small danger" data-rdel="${i.id}">Remove</button></div>`).join('')}</div><form class="form" id="addRoutineItem" style="margin-top:12px"><div class="field"><label>Add item</label><input id="riName" required></div><div class="field"><label>Schedule</label><select id="riSched"><option>daily</option><option>weekly</option><option>manual</option></select></div><button class="btn primary">Add</button></form>`);$$('[data-rdel]').forEach(b=>b.onclick=()=>{g.items=g.items.filter(x=>x.id!==b.dataset.rdel);save();manageRoutine(g);});$('#addRoutineItem').onsubmit=e=>{e.preventDefault();g.items.push({id:uid(),title:$('#riName').value,schedule:$('#riSched').value});save();manageRoutine(g);};}
  function routineManageAll(){openSheet('Manage Routines',`<div class="stack">${state.routines.map(g=>`<button class="btn" data-rmanage="${g.id}">${esc(g.name)} (${g.items.length})</button>`).join('')}<button class="btn primary" id="addGroup">+ Routine Group</button></div>`);$$('[data-rmanage]').forEach(b=>b.onclick=()=>manageRoutine(state.routines.find(g=>g.id===b.dataset.rmanage)));$('#addGroup').onclick=()=>{const n=prompt('Routine group name');if(n){state.routines.push({id:uid(),name:n,items:[]});save();routineManageAll();}};}

  function workoutsFull(){openFull(`<div class="fullbar"><div><div class="eyebrow">WORKOUT LIBRARY</div><h2>Create once, assign to calendar</h2></div><button class="icon-btn" id="closeFull">✕</button></div><button class="btn primary" id="newWorkout">+ Create Workout</button><div style="margin-top:12px">${state.workouts.library.map(w=>`<section class="card"><div class="card-head"><div><h3>${esc(w.name)}</h3><div class="subtle">${w.exercises.length} exercises</div></div><div class="actions"><button class="btn small" data-wedit="${w.id}">Edit</button><button class="btn small primary" data-start-workout="${w.id}">Start</button></div></div>${w.exercises.map(e=>`<div class="exercise"><span>${esc(e.name)} × ${e.sets}</span><b>${e.mode==='time'?`${e.target} sec`:`${e.target} reps`}</b></div>`).join('')}</section>`).join('')}</div>`);$('#closeFull').onclick=closeFull;$('#newWorkout').onclick=()=>workoutEdit();$$('[data-wedit]').forEach(b=>b.onclick=()=>workoutEdit(state.workouts.library.find(w=>w.id===b.dataset.wedit)));}
  function workoutEdit(w){openSheet(w?'Edit Workout':'Create Workout',`<form class="form" id="wForm"><div class="field"><label>Workout name</label><input id="wName" required value="${esc(w?.name||'')}"></div><button class="btn primary">${w?'Save Name':'Create'}</button></form>${w?`<div class="section-title">Exercises</div><div>${w.exercises.map(e=>`<div class="list-row"><span>↕</span><div><div class="row-title">${esc(e.name)}</div><div class="row-sub">${e.sets} set(s) • ${e.target} ${e.mode==='time'?'sec':'reps'} • rest ${e.rest||0}s</div></div><button class="btn small danger" data-exdel="${e.id}">Remove</button></div>`).join('')}</div><button class="btn full" id="addExercise">+ Add Exercise</button><button class="btn full danger" id="deleteWorkout" style="margin-top:8px">Delete Workout</button>`:''}`);$('#wForm').onsubmit=e=>{e.preventDefault();if(w){w.name=$('#wName').value;save();workoutEdit(w);}else{const nw={id:uid(),name:$('#wName').value,exercises:[]};state.workouts.library.push(nw);save();workoutEdit(nw);}};if(w){$$('[data-exdel]').forEach(b=>b.onclick=()=>{w.exercises=w.exercises.filter(x=>x.id!==b.dataset.exdel);save();workoutEdit(w);});$('#addExercise').onclick=()=>exerciseForm(w);$('#deleteWorkout').onclick=()=>{state.workouts.library=state.workouts.library.filter(x=>x.id!==w.id);Object.keys(state.workouts.assignments).forEach(k=>{if(state.workouts.assignments[k]===w.id)delete state.workouts.assignments[k]});save();closeSheet();workoutsFull();};}}
  function exerciseForm(w){openSheet('Add Exercise',`<form class="form" id="exForm"><div class="field"><label>Exercise</label><input id="exName" required></div><div class="grid2"><div class="field"><label>Type</label><select id="exMode"><option value="reps">Reps</option><option value="time">Timer</option></select></div><div class="field"><label>Target</label><input id="exTarget" type="number" min="1" value="10"></div></div><div class="grid2"><div class="field"><label>Sets</label><input id="exSets" type="number" min="1" value="1"></div><div class="field"><label>Rest after (sec)</label><input id="exRest" type="number" min="0" value="30"></div></div><button class="btn primary">Add Exercise</button></form>`);$('#exForm').onsubmit=e=>{e.preventDefault();w.exercises.push({id:uid(),name:$('#exName').value,mode:$('#exMode').value,target:Number($('#exTarget').value),sets:Number($('#exSets').value),rest:Number($('#exRest').value),unit:$('#exMode').value==='time'?'sec':'reps'});save();workoutEdit(w);};}
  function startWorkout(id){const w=state.workouts.library.find(x=>x.id===id);if(!w)return;let idx=0,set=1,remaining=0,timer=null;const draw=()=>{const ex=w.exercises[idx];openFull(`<div class="fullbar"><div><div class="eyebrow">WORKOUT</div><h2>${esc(w.name)}</h2></div><button class="icon-btn" id="closeFull">✕</button></div>${ex?`<section class="card"><div class="eyebrow">Exercise ${idx+1} of ${w.exercises.length} • Set ${set}/${ex.sets}</div><div class="big-value" style="margin:10px 0">${esc(ex.name)}</div><div class="title-rank">${ex.mode==='time'?`${remaining||ex.target} SEC`:`${ex.target} REPS`}</div><div class="progress" style="margin-top:16px"><span style="width:${((idx+(set-1)/ex.sets)/w.exercises.length)*100}%"></span></div><div class="actions" style="margin-top:16px"><button class="btn primary" id="workNext">${ex.mode==='time'?'Start / Done':'Done / Next'}</button><button class="btn" id="workSkip">Skip</button></div></section>`:`<section class="card"><div class="big-value">Workout Complete ✓</div><div class="subtle">+${XP_CONFIG.workout||50} XP</div><button class="btn primary full" id="finishWorkout" style="margin-top:14px">Finish</button></section>`}`);$('#closeFull').onclick=()=>{if(timer)clearInterval(timer);closeFull();};if(!ex){$('#finishWorkout').onclick=()=>{addXP(XP_CONFIG.workout||50,`Workout: ${w.name}`);closeFull();render();};return;}$('#workSkip').onclick=()=>{if(timer)clearInterval(timer);advance();};$('#workNext').onclick=()=>{if(ex.mode==='time'&&!remaining){remaining=ex.target;$('#workNext').disabled=true;timer=setInterval(()=>{remaining--;const val=$('.title-rank');if(val)val.textContent=`${remaining} SEC`;if(remaining<=0){clearInterval(timer);timer=null;$('#workNext').disabled=false;$('#workNext').textContent='Done / Next';navigator.vibrate?.([120,80,120]);}},1000);}else advance();};};const advance=()=>{remaining=0;const ex=w.exercises[idx];if(set<ex.sets)set++;else{set=1;idx++;}draw();};draw();}

  function focusTimerFull(){
    let total=25*60, remaining=total, timer=null, running=false;
    const draw=()=>{const mm=Math.floor(remaining/60),ss=remaining%60;openFull(`<div class="fullbar"><div><div class="eyebrow">FOCUS TIMER</div><h2>Stay with one thing</h2></div><button class="icon-btn" id="closeFull">✕</button></div><section class="card timer-card"><div class="timer-ring"><div><span id="timerValue">${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}</span><small>minutes</small></div></div><div class="chip-row timer-presets"><button class="chip" data-min="10">10 min</button><button class="chip active" data-min="25">25 min</button><button class="chip" data-min="45">45 min</button><button class="chip" data-min="60">60 min</button></div><div class="actions timer-actions"><button class="btn primary" id="timerStart">Start</button><button class="btn" id="timerReset">Reset</button></div><div class="help">Use this for thesis or any focus session. Workout timers remain inside each workout.</div></section>`);$('#closeFull').onclick=()=>{if(timer)clearInterval(timer);closeFull();};$$('[data-min]').forEach(b=>b.onclick=()=>{if(timer)clearInterval(timer);running=false;total=Number(b.dataset.min)*60;remaining=total;draw();});$('#timerReset').onclick=()=>{if(timer)clearInterval(timer);running=false;remaining=total;draw();};$('#timerStart').onclick=()=>{if(running)return;running=true;$('#timerStart').textContent='Running…';timer=setInterval(()=>{remaining=Math.max(0,remaining-1);const mm=Math.floor(remaining/60),ss=remaining%60,val=$('#timerValue');if(val)val.textContent=`${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;if(remaining<=0){clearInterval(timer);timer=null;running=false;navigator.vibrate?.([180,100,180]);const b=$('#timerStart');if(b){b.textContent='Complete ✓';b.disabled=true;}addXP(10,'Focus timer completed');}},1000);};};
    draw();
  }

  function thesisFull(){const stats=thesisStats();openFull(`<div class="fullbar"><div><div class="eyebrow">THESIS ROADMAP</div><h2>${stats.pct}% overall progress</h2></div><button class="icon-btn" id="closeFull">✕</button></div><div class="progress"><span style="width:${stats.pct}%"></span></div><div style="margin-top:12px">${state.thesis.stages.map(s=>`<section class="stage"><div class="stage-head"><div><b>${esc(s.name)}</b><div class="subtle">${s.items.filter(i=>i.status==='done').length}/${s.items.length} done</div></div><button class="btn small" data-stage-add="${s.id}">+ Section</button></div><div class="stage-items">${s.items.map(i=>`<div class="stage-item"><span>${esc(i.title)}</span><select data-thesis-status="${i.id}" data-stage="${s.id}">${[['not-started','Not Started'],['in-progress','In Progress'],['for-checking','For Checking'],['needs-revision','Needs Revision'],['done','Done']].map(([v,l])=>`<option value="${v}" ${i.status===v?'selected':''}>${l}</option>`).join('')}</select></div>`).join('')}</div></section>`).join('')}</div>`);$('#closeFull').onclick=closeFull;$$('[data-thesis-status]').forEach(sel=>sel.onchange=()=>{const s=state.thesis.stages.find(x=>x.id===sel.dataset.stage),i=s.items.find(x=>x.id===sel.dataset.thesisStatus),prev=i.status;i.status=sel.value;if(prev!=='done'&&i.status==='done')addXP(40,`Thesis: ${i.title}`);save();render();thesisFull();});$$('[data-stage-add]').forEach(b=>b.onclick=()=>{const s=state.thesis.stages.find(x=>x.id===b.dataset.stageAdd),name=prompt('Section / milestone name');if(name){s.items.push({id:uid(),title:name,status:'not-started'});save();thesisFull();}});}

  function moneyFull(){const a=state.money.allowance,s=a.weekly*a.savingsRate,sp=a.weekly-s,bom=state.thesis.bom.reduce((z,x)=>z+x.qty*x.cost,0),other=state.thesis.otherCosts.reduce((z,x)=>z+x.planned,0);openFull(`<div class="fullbar"><div><div class="eyebrow">MONEY</div><h2>Budget, accounts, thesis & credit</h2></div><button class="icon-btn" id="closeFull">✕</button></div>
    <section class="card"><div class="card-head"><h3>Weekly Allowance</h3><button class="btn small" id="editAllowance">Edit</button></div><div class="stat-grid"><div class="stat"><b>${peso(a.weekly)}</b><span>Income / week</span></div><div class="stat"><b>${peso(sp)}</b><span>Spendable 70%</span></div><div class="stat"><b>${peso(s)}</b><span>Savings 30%</span></div><div class="stat"><b>${peso(s*a.emergencyShare)} / ${peso(s*a.galaShare)}</b><span>Emergency / Gala</span></div></div><div class="subtle" style="margin-top:8px">Food is included in personal spendable allowance.</div><button class="btn full soft" id="receiveAllowance" style="margin-top:10px">Receive ${peso(a.weekly)} Weekly Allowance</button></section>
    <section class="card"><div class="card-head"><h3>Accounts / Wallets</h3><button class="btn small" id="addAccount">+ Account</button></div>${state.money.accounts.map(x=>`<div class="list-row"><span>◉</span><div class="row-title">${esc(x.name)}</div><button class="btn small money" data-acct="${x.id}">${peso(x.balance)}</button></div>`).join('')}<button class="btn full" id="transferBtn" style="margin-top:8px">Transfer Between Accounts</button></section>
    <section class="card"><div class="card-head"><h3>Income</h3></div>${state.money.income.map(x=>`<div class="row between" style="padding:7px 0"><span>${esc(x.name)} <small class="subtle">${esc(x.frequency)}</small></span><b>${peso(x.amount)}</b></div>`).join('')}</section>
    <section class="card"><div class="card-head"><h3>Bills</h3><button class="btn small" id="addBill">+ Bill</button></div>${state.money.bills.map(x=>`<div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line)"><div><div class="row-title">${esc(x.name)}</div><div class="row-sub">${x.type==='max'?'Variable • max budget':'Fixed'}</div></div><b>${peso(x.budget)}</b></div>`).join('')}</section>
    <section class="card"><div class="card-head"><h3>Thesis Budget</h3><span class="pill blue">${peso(bom+other)}</span></div>${bomCategoriesHtml()}<div class="section-title">Other Thesis Costs</div>${state.thesis.otherCosts.map(x=>`<div class="row between" style="padding:7px 0"><span>${esc(x.name)}</span><b>${peso(x.planned)}</b></div>`).join('')}<button class="btn full" id="editBom" style="margin-top:10px">Open Full BOM</button></section>
    <section class="card"><div class="card-head"><h3>Credit / Payables</h3></div>${state.money.credits.map(x=>`<div class="list-row"><span>↗</span><div><div class="row-title">${esc(x.name)}</div><div class="row-sub">Due ${x.due?fmtDate(x.due):'not set'} • fees ${peso(x.fees)}</div></div><button class="btn small" data-credit="${x.id}">${peso(x.balance)}</button></div>`).join('')}</section>
    <section class="card"><div class="card-head"><h3>Savings Goals</h3></div>${state.money.goals.map(g=>`<div style="padding:7px 0"><div class="row between"><span class="row-title">${esc(g.name)}</span><span>${peso(g.saved)} / ${g.target?peso(g.target):'No target'}</span></div><div class="progress small"><span style="width:${g.target?clamp(g.saved/g.target*100,0,100):0}%"></span></div></div>`).join('')}</section>`);$('#closeFull').onclick=closeFull;$('#editAllowance').onclick=allowanceForm;$('#receiveAllowance').onclick=receiveAllowanceForm;$$('[data-acct]').forEach(b=>b.onclick=()=>accountForm(state.money.accounts.find(x=>x.id===b.dataset.acct)));$('#transferBtn').onclick=transferForm;$$('[data-credit]').forEach(b=>b.onclick=()=>creditForm(state.money.credits.find(x=>x.id===b.dataset.credit)));$('#editBom').onclick=bomFull;}
  function bomCategoriesHtml(){const cats=[...new Set(state.thesis.bom.map(x=>x.cat))];return cats.map(c=>{const items=state.thesis.bom.filter(x=>x.cat===c),sum=items.reduce((a,x)=>a+x.qty*x.cost,0);return `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><div><div class="row-title">${esc(c)}</div><div class="row-sub">${items.length} items</div></div><b>${peso(sum)}</b></div>`;}).join('');}
  function receiveAllowanceForm(){const a=state.money.allowance,s=a.weekly*a.savingsRate,eAmt=s*a.emergencyShare,gAmt=s*a.galaShare;openSheet('Receive Weekly Allowance',`<form class="form" id="recvAllow"><div class="card compact" style="box-shadow:none"><div class="row between"><span>Total</span><b>${peso(a.weekly)}</b></div><div class="row between"><span>Spendable</span><b>${peso(a.weekly-s)}</b></div><div class="row between"><span>Emergency reserve</span><b>${peso(eAmt)}</b></div><div class="row between"><span>Gala reserve</span><b>${peso(gAmt)}</b></div></div><div class="field"><label>Money received in</label><select id="recvAcct">${state.money.accounts.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div><button class="btn primary">Confirm</button></form>`);$('#recvAllow').onsubmit=ev=>{ev.preventDefault();const acct=state.money.accounts.find(x=>x.id===$('#recvAcct').value);if(acct)acct.balance+=a.weekly;state.money.savings.emergency+=eAmt;state.money.savings.gala+=gAmt;const eg=state.money.goals.find(x=>x.name==='Emergency Fund');if(eg)eg.saved=state.money.savings.emergency;state.money.transactions.unshift({id:uid(),type:'income',name:'Weekly allowance',amount:a.weekly,account:acct?.name||'',date:new Date().toISOString(),allocation:{spendable:a.weekly-s,emergency:eAmt,gala:gAmt}});save();closeSheet();moneyFull();};}

  function allowanceForm(){const a=state.money.allowance;openSheet('Edit Allowance Rules',`<form class="form" id="allowForm"><div class="field"><label>Weekly allowance</label><input id="aw" type="number" min="0" value="${a.weekly}"></div><div class="field"><label>Savings %</label><input id="as" type="number" min="0" max="100" value="${a.savingsRate*100}"></div><div class="grid2"><div class="field"><label>Emergency share %</label><input id="ae" type="number" min="0" max="100" value="${a.emergencyShare*100}"></div><div class="field"><label>Gala share %</label><input id="ag" type="number" min="0" max="100" value="${a.galaShare*100}"></div></div><button class="btn primary">Save</button></form>`);$('#allowForm').onsubmit=e=>{e.preventDefault();a.weekly=Number($('#aw').value);a.savingsRate=Number($('#as').value)/100;const es=Number($('#ae').value),gs=Number($('#ag').value),tot=es+gs||100;a.emergencyShare=es/tot;a.galaShare=gs/tot;save();closeSheet();moneyFull();};}
  function accountForm(a){openSheet(a.name,`<form class="form" id="acctForm"><div class="field"><label>Current balance</label><input id="ab" type="number" step="0.01" value="${a.balance}"></div><button class="btn primary">Save Balance</button></form>`);$('#acctForm').onsubmit=e=>{e.preventDefault();a.balance=Number($('#ab').value);save();closeSheet();moneyFull();};}
  function transferForm(){openSheet('Transfer Money',`<form class="form" id="trForm"><div class="field"><label>From</label><select id="trFrom">${state.money.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div><div class="field"><label>To</label><select id="trTo">${state.money.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div><div class="field"><label>Amount</label><input id="trAmt" type="number" min="0" step="0.01"></div><button class="btn primary">Transfer</button></form>`);$('#trForm').onsubmit=e=>{e.preventDefault();const f=state.money.accounts.find(a=>a.id===$('#trFrom').value),t=state.money.accounts.find(a=>a.id===$('#trTo').value),amt=Number($('#trAmt').value);if(f&&t&&f!==t&&amt>0){f.balance-=amt;t.balance+=amt;state.money.transactions.unshift({id:uid(),type:'transfer',from:f.name,to:t.name,amount:amt,date:new Date().toISOString()});save();}closeSheet();moneyFull();};}
  function creditForm(c){openSheet(c.name,`<form class="form" id="crForm"><div class="field"><label>Outstanding balance</label><input id="cb" type="number" min="0" value="${c.balance}"></div><div class="field"><label>Due date</label><input id="cd" type="date" value="${c.due}"></div><div class="field"><label>Fees / interest</label><input id="cf" type="number" min="0" value="${c.fees}"></div><button class="btn primary">Save</button></form>`);$('#crForm').onsubmit=e=>{e.preventDefault();c.balance=Number($('#cb').value);c.due=$('#cd').value;c.fees=Number($('#cf').value);save();closeSheet();moneyFull();};}
  function bomFull(){
    const cost=thesisCostStats(), planned=cost.bomPlanned, actual=cost.bomSpent, purchased=cost.purchased, pct=cost.totalItems?Math.round(purchased/cost.totalItems*100):0;
    openFull(`<div class="fullbar"><div><div class="eyebrow">THESIS BOM</div><h2>${peso(planned)}</h2><div class="subtle">${purchased}/${state.thesis.bom.length} items purchased</div></div><button class="icon-btn" id="closeFull">✕</button></div><section class="card"><div class="row between"><b>Purchase Progress</b><span>${pct}%</span></div><div class="progress" style="margin-top:8px"><span style="width:${pct}%"></span></div><div class="progress-meta"><span>${peso(actual)} actual recorded</span><span>${peso(Math.max(0,planned-actual))} unrecorded/remaining</span></div></section><button class="btn primary" id="addBom">+ Add BOM Item</button><div style="margin-top:12px">${[...new Set(state.thesis.bom.map(x=>x.cat))].map(c=>`<section class="card"><div class="card-head"><h3>${esc(c)}</h3><b>${peso(state.thesis.bom.filter(x=>x.cat===c).reduce((a,x)=>a+x.qty*x.cost,0))}</b></div>${state.thesis.bom.filter(x=>x.cat===c).map(x=>`<div class="list-row bom-row"><button class="check ${x.purchased?'done':''}" data-bom-toggle="${x.id}" aria-label="${x.purchased?'Mark not purchased':'Mark purchased'}">${x.purchased?'✓':''}</button><div><div class="row-title">${esc(x.name)}</div><div class="row-sub">${x.qty} ${esc(x.unit)} × ${peso(x.cost)}${x.actual!=null?` • actual ${peso(x.actual)}`:''}</div></div><div class="bom-actions"><b class="money bom-price">${peso(x.qty*x.cost)}</b><button class="btn small" data-bom-edit="${x.id}">Edit</button></div></div>`).join('')}</section>`).join('')}</div>`);
    $('#closeFull').onclick=closeFull;$$('[data-bom-toggle]').forEach(b=>b.onclick=()=>{const x=state.thesis.bom.find(v=>v.id===b.dataset.bomToggle);if(x){x.purchased=!x.purchased;save();render();bomFull();}});$$('[data-bom-edit]').forEach(b=>b.onclick=()=>bomItemForm(state.thesis.bom.find(x=>x.id===b.dataset.bomEdit)));$('#addBom').onclick=()=>bomItemForm();
  }

  function bomItemForm(x){openSheet(x?'Edit BOM Item':'Add BOM Item',`<form class="form" id="bomForm"><div class="field"><label>Item</label><input id="bn" required value="${esc(x?.name||'')}"></div><div class="field"><label>Category</label><input id="bc" required value="${esc(x?.cat||'Other')}"></div><div class="grid2"><div class="field"><label>Qty</label><input id="bq" type="number" min="1" value="${x?.qty||1}"></div><div class="field"><label>Unit</label><input id="bu" value="${esc(x?.unit||'pc')}"></div></div><div class="grid2"><div class="field"><label>Planned unit cost</label><input id="bp" type="number" min="0" value="${x?.cost||0}"></div><div class="field"><label>Actual total cost</label><input id="ba" type="number" min="0" value="${x?.actual??''}"></div></div><label class="row"><input id="bb" type="checkbox" ${x?.purchased?'checked':''}> Purchased</label><button class="btn primary">Save</button>${x?'<button type="button" class="btn danger" id="bomDelete">Delete</button>':''}</form>`);$('#bomForm').onsubmit=e=>{e.preventDefault();const obj=x||{id:uid()};Object.assign(obj,{name:$('#bn').value,cat:$('#bc').value,qty:Number($('#bq').value),unit:$('#bu').value,cost:Number($('#bp').value),actual:$('#ba').value===''?null:Number($('#ba').value),purchased:$('#bb').checked});if(!x)state.thesis.bom.push(obj);save();render();closeSheet();bomFull();};if(x)$('#bomDelete').onclick=()=>{state.thesis.bom=state.thesis.bom.filter(i=>i.id!==x.id);save();render();closeSheet();bomFull();};}

  function inventoryFull(categoryFilter='all', statusFilter='all'){
    let filter=statusFilter, category=categoryFilter;
    const draw=()=>{
      const groups=[...new Set(state.inventory.map(x=>x.category))];
      let list=state.inventory;
      if(category!=='all') list=list.filter(x=>x.category===category);
      if(filter==='attention') list=list.filter(x=>['need','low','replace'].includes(x.status));
      else if(filter!=='all') list=list.filter(x=>x.status===filter);
      openFull(`<div class="fullbar"><div><div class="eyebrow">LIFE INVENTORY</div><h2>${category==='all'?'Have • Low • Need • Replace':esc(category)}</h2></div><button class="icon-btn" id="closeFull">✕</button></div>
      <div class="chip-row"><button class="chip ${category==='all'?'active':''}" data-cat="all">All Categories</button>${groups.map(g=>`<button class="chip ${category===g?'active':''}" data-cat="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <div class="chip-row" style="margin-top:8px"><button class="chip ${filter==='all'?'active':''}" data-if="all">All Status</button><button class="chip ${filter==='need'?'active':''}" data-if="need">Need to Buy</button><button class="chip ${filter==='low'?'active':''}" data-if="low">Low</button><button class="chip ${filter==='replace'?'active':''}" data-if="replace">Replace</button><button class="chip ${filter==='attention'?'active':''}" data-if="attention">Needs Attention</button></div>
      <button class="btn primary" id="newInv" style="margin:10px 0">+ Add Item</button>
      ${groups.map(g=>{const arr=list.filter(x=>x.category===g);return arr.length?`<section class="card"><div class="card-head"><h3>${esc(g)}</h3><span class="pill">${arr.length}</span></div>${arr.map(x=>`<div class="list-row"><span class="status-dot ${x.status==='have'?'good':x.status==='low'?'warn':x.status==='need'||x.status==='replace'?'bad':''}"></span><div><div class="row-title">${esc(x.name)}</div><div class="row-sub">${statusLabel(x.status)}${x.price?` • ${peso(x.price)}`:''}</div></div><button class="btn small" data-inv-edit="${x.id}">Edit</button></div>`).join('')}</section>`:'';}).join('')||'<div class="empty">No items match these filters.</div>'}`);
      $('#closeFull').onclick=closeFull;
      $$('[data-if]').forEach(b=>b.onclick=()=>{filter=b.dataset.if;draw();});
      $$('[data-cat]').forEach(b=>b.onclick=()=>{category=b.dataset.cat;draw();});
      $$('[data-inv-edit]').forEach(b=>b.onclick=()=>inventoryForm(state.inventory.find(x=>x.id===b.dataset.invEdit)));
      $('#newInv').onclick=()=>inventoryForm();
    };
    draw();
  }
  const statusLabel=s=>({have:'Have',low:'Low',need:'Need to Buy',replace:'Replace','dont-use':'Don’t Use',unset:'Unset'}[s]||s);

  function renderProfile(){const li=levelInfo();openFull(`<div class="fullbar"><div><div class="eyebrow">PROFILE & SETTINGS</div><h2>Lv. ${li.level} — ${esc(li.title)}</h2></div><button class="icon-btn" id="closeFull">✕</button></div>
    <section class="card level-card"><div class="big-value">${li.xp.toLocaleString()} XP</div><div class="progress"><span style="width:${li.pct}%"></span></div><div class="progress-meta"><span>Current level</span><span>${li.next?`${li.next[1].toLocaleString()} XP next`:'Maximum'}</span></div></section>
    <section class="card"><div class="card-head"><h3>Level Path</h3><span class="subtle">All visible, future ranks locked</span></div><div class="rank-list">${LEVELS.map((r,i)=>`<div class="rank ${i===li.idx?'current':''} ${i>li.idx?'locked':''}"><div><b>Lv. ${i+1} — ${esc(r[0])}</b><div class="subtle">${r[1].toLocaleString()} XP</div></div><span>${i<li.idx?'✓':i===li.idx?'CURRENT':'🔒'}</span></div>`).join('')}</div></section>
    <section class="card"><div class="card-head"><h3>Notifications</h3></div><label class="row between" style="padding:9px 0"><span>Vibration</span><input type="checkbox" id="vibration" ${state.settings.vibration?'checked':''}></label><div class="field"><label>Auto-No after ignored notification</label><select id="autoNo">${[3,5,10,15,30,0].map(n=>`<option value="${n}" ${state.settings.autoNoMin===n?'selected':''}>${n?`${n} minutes`:'Never'}</option>`).join('')}</select></div><button class="btn full" id="enableNotif" style="margin-top:10px">Enable Notifications</button><button class="btn full soft" id="testNotif" style="margin-top:8px">Test Notification in 10 Seconds</button><div id="notifDiag" class="notif-diag">Checking Android notification setup…</div><div class="help">In the Android app, exact-time reminders use native alarms with YES / NO actions, vibration, and Auto-No. Browser/PWA mode remains limited while fully closed.</div></section>
    <section class="card"><div class="card-head"><h3>App</h3><span class="pill">v3.6.0</span></div><div class="row between"><span>Version</span><b>3.6.0 (4)</b></div><div class="subtle" style="margin-top:6px">Android build with native actionable notifications</div></section>
    <section class="card"><div class="card-head"><h3>Appearance</h3></div><button class="btn full" id="themeToggle">Switch to ${state.settings.theme==='dark'?'Light':'Dark'} Mode</button></section>
    <section class="card"><div class="card-head"><h3>Backup & Data</h3></div><div class="stack"><button class="btn" id="exportData">Export Backup</button><label class="btn" style="text-align:center">Import Backup<input id="importData" type="file" accept="application/json" hidden></label><button class="btn danger" id="resetData">Reset V3 Data</button></div></section>
    <section class="card"><div class="card-head"><h3>Recent XP</h3></div>${state.profile.xpEvents.slice(0,12).map(e=>`<div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line)"><span>${esc(e.reason)}</span><b style="color:${e.amount>=0?'var(--accent)':'var(--danger)'}">${e.amount>=0?'+':''}${e.amount}</b></div>`).join('')||'<div class="empty">No XP history yet.</div>'}</section>`);$('#closeFull').onclick=closeFull;$('#vibration').onchange=e=>{state.settings.vibration=e.target.checked;save();};$('#autoNo').onchange=e=>{state.settings.autoNoMin=Number(e.target.value);save();};$('#themeToggle').onclick=()=>{state.settings.theme=state.settings.theme==='dark'?'light':'dark';save();renderProfile();};$('#enableNotif').onclick=enableNotifications;const nd=$('#notifDiag');if(nd){if(nativeAndroid()){try{const ns=JSON.parse(window.AndroidApp.getNotificationStatus?.()||'{}');nd.innerHTML=`<b>${ns.notifications?'✓':'!'} Notifications:</b> ${ns.notifications?'allowed':'permission needed'} &nbsp; <b>${ns.exactAlarms?'✓':'!'} Exact alarms:</b> ${ns.exactAlarms?'allowed':'permission needed'}`;}catch{nd.textContent='Android notification status unavailable.';}}else nd.textContent='Native exact alarms are available only in the installed Android app.';}$('#testNotif').onclick=()=>{if(nativeAndroid()){state.settings.notifications=true;save();window.AndroidApp.requestPermissions();const ok=window.AndroidApp.scheduleNotification(JSON.stringify({tag:'test:'+Date.now(),title:'Edjay’s Life Organizer',body:'Test notification — Android scheduling is working.',kind:'reminder',when:Date.now()+10000,autoNoMin:0,vibrate:!!state.settings.vibration}));alert(ok?'Test scheduled for about 10 seconds from now. Keep the app open or close it — the Android alarm should still fire.':'The test could not be scheduled. Check notification/alarm permissions.');}else alert('Use the installed Android app for the native notification test.');};$('#exportData').onclick=exportBackup;$('#importData').onchange=importBackup;$('#resetData').onclick=()=>{if(confirm('Reset all V3 data to the starting setup?')){reset();closeFull();}};}

  function mindmapFull(){
    openFull(`<div class="fullbar"><div><div class="eyebrow">LIVE MIND MAP</div><h2>My Life</h2><div class="subtle">Automatically updates from my actual app data</div></div><button class="icon-btn" id="closeFull">✕</button></div><div class="map-tools"><button class="btn small" id="zoomIn">＋ Zoom</button><button class="btn small" id="zoomOut">－ Zoom</button><button class="btn small" id="mapReset">Reset view</button><button class="btn small primary" id="mapAdd">+ Personal Node</button><button class="btn small danger" id="mapDelete">Delete Personal Node</button></div><div class="map-wrap" id="mapWrap"><svg id="mapSvg" viewBox="0 0 1000 760" aria-label="Live life mind map"><g id="mapScene"></g></svg></div><div class="help">Green data nodes come from what I actually do in the app. Personal nodes are the only nodes I manually add/delete.</div>`);
    $('#closeFull').onclick=closeFull;
    let scale=1,tx=0,ty=0,selected='life',drag=false,last=null;
    const scene=$('#mapScene'),svg=$('#mapSvg');
    const liveNodes=()=>{const st=dashboardStats();const inv=state.inventory.filter(x=>['need','low','replace'].includes(x.status));const pendingGoals=state.goals.filter(g=>Number(g.progress||0)<100).length;const credit=state.money.credits.reduce((a,x)=>a+Number(x.balance||0),0);return [
      {id:'life',label:'My Life',detail:`${dailyProgress()}% today`,parent:null,x:500,y:365,live:true},
      {id:'thesis',label:'Thesis',detail:`${st.thesis.pct}% overall`,parent:'life',x:500,y:105,live:true},
      {id:'health',label:'Health',detail:st.workoutStatus,parent:'life',x:220,y:235,live:true},
      {id:'money',label:'Money',detail:`${peso(st.balance)} current`,parent:'life',x:780,y:235,live:true},
      {id:'routine',label:'Routine',detail:`${st.routineDone}/${st.routineActive} today`,parent:'life',x:800,y:505,live:true},
      {id:'personal',label:'Personal',detail:`${st.inventoryNeed} need attention`,parent:'life',x:200,y:505,live:true},
      {id:'goals',label:'Goals',detail:`${pendingGoals} active`,parent:'life',x:500,y:665,live:true},
      {id:'tasks',label:'Tasks',detail:`${st.tasksPending} pending`,parent:'life',x:500,y:500,live:true},
      {id:'thesis-next',label:'Thesis items',detail:`${st.thesis.done}/${st.thesis.total} done`,parent:'thesis',x:350,y:35,live:true},
      {id:'schedule',label:'Schedule',detail:`${st.scheduleDone} done • ${st.schedulePending} pending`,parent:'tasks',x:430,y:595,live:true},
      {id:'buy',label:'Things to Buy',detail:`${inv.filter(x=>x.status==='need').length} need`,parent:'personal',x:70,y:650,live:true},
      {id:'credit',label:'Credit',detail:`${peso(credit)} owed`,parent:'money',x:920,y:335,live:true},
      {id:'savings',label:'Savings',detail:`${peso(st.savings)} saved`,parent:'money',x:890,y:120,live:true}
    ];};
    const personalNodes=()=> (state.mindmap.nodes||[]).filter(n=>!['life','thesis','health','money','personal','routine','goals','buy','proposal','conduct','defense'].includes(n.id)).map(n=>({...n,live:false}));
    const draw=()=>{const nodes=[...liveNodes(),...personalNodes()];const lines=nodes.filter(n=>n.parent).map(n=>{const p=nodes.find(x=>x.id===n.parent);return p?`<line x1="${p.x}" y1="${p.y}" x2="${n.x}" y2="${n.y}" stroke="#bfc8c2" stroke-width="3"/>`:''}).join('');const ns=nodes.map(n=>`<g class="node ${n.id===selected?'selected':''}" data-node="${n.id}" transform="translate(${n.x-78},${n.y-29})"><rect width="156" height="58" rx="14" fill="${n.live?'#effaf4':'#f8faf9'}" stroke="${n.id==='life'?'#71bd98':'#cfd8d2'}"></rect><text x="78" y="24" text-anchor="middle" fill="#26352d" font-weight="700">${esc(n.label)}</text><text x="78" y="42" text-anchor="middle" fill="#718078" font-size="11">${esc(n.detail||'Personal node')}</text></g>`).join('');scene.innerHTML=`<g transform="translate(${tx} ${ty}) scale(${scale})">${lines}${ns}</g>`;$$('[data-node]',scene).forEach(n=>n.addEventListener('click',e=>{e.stopPropagation();selected=n.dataset.node;draw();}));};
    $('#zoomIn').onclick=()=>{scale=clamp(scale+.15,.5,2.2);draw();};$('#zoomOut').onclick=()=>{scale=clamp(scale-.15,.5,2.2);draw();};$('#mapReset').onclick=()=>{scale=1;tx=0;ty=0;draw();};
    $('#mapAdd').onclick=()=>{const all=[...liveNodes(),...personalNodes()];const p=all.find(x=>x.id===selected)||all[0];const label=prompt('Personal node name');if(label&&p){state.mindmap.nodes.push({id:uid(),label,parent:p.id,x:clamp(p.x+(Math.random()>.5?185:-185),80,920),y:clamp(p.y+125,60,700)});save();draw();}};
    $('#mapDelete').onclick=()=>{const n=personalNodes().find(x=>x.id===selected);if(!n){alert('Live nodes update automatically and cannot be deleted.');return;}state.mindmap.nodes=state.mindmap.nodes.filter(x=>x.id!==selected&&x.parent!==selected);selected='life';save();draw();};
    svg.addEventListener('pointerdown',e=>{if(e.target.closest?.('[data-node]'))return;drag=true;last={x:e.clientX,y:e.clientY};svg.setPointerCapture?.(e.pointerId);});svg.addEventListener('pointermove',e=>{if(!drag)return;tx+=(e.clientX-last.x)*2.1;ty+=(e.clientY-last.y)*2.1;last={x:e.clientX,y:e.clientY};draw();});svg.addEventListener('pointerup',()=>drag=false);svg.addEventListener('pointercancel',()=>drag=false);draw();
  }


  function nativeAndroid(){return !!window.AndroidApp?.isNativeAndroid?.();}
  function enableNotifications(){
    if(nativeAndroid()){state.settings.notifications=true;save();window.AndroidApp.requestPermissions();scheduleNotifications();alert('Android notifications enabled. Allow Notifications and Alarms & reminders when Android asks.');return;}
    if(!('Notification' in window)){alert('Notifications are not supported in this browser.');return;}
    Notification.requestPermission().then(p=>{if(p==='granted'){state.settings.notifications=true;save();scheduleNotifications();alert('Notifications enabled.');}});
  }
  function scheduleNotifications(){
    if(!state.settings.notifications)return;
    const ds=dayState(),sched=state.scheduleTemplates[ds.template]||[],now=new Date();
    if(nativeAndroid()){
      sched.forEach(item=>{
        const tag=`schedule:${item.id}`,st=ds.schedule[item.id]?.status||'pending';
        if(st!=='pending'){window.AndroidApp.cancelNotification(tag);return;}
        const [h,m]=item.time.split(':').map(Number),due=new Date();due.setHours(h,m,0,0);
        if(due<=now)return;
        const lower=(item.title||'').toLowerCase();
        const kind=lower.includes('workout')?'workout':lower.includes('thesis')?'thesis':'schedule';
        const body=kind==='workout'?`${formatTime(item.time)} • Workout scheduled now`:kind==='thesis'?`${formatTime(item.time)} • Thesis session scheduled now`:`${formatTime(item.time)} • Did I do this?`;
        window.AndroidApp.scheduleNotification(JSON.stringify({tag,title:item.title,body,kind,when:due.getTime(),autoNoMin:state.settings.autoNoMin||0,vibrate:!!state.settings.vibration}));
      });
      (state.reminders||[]).forEach(r=>{
        const tag=`reminder:${r.id}`;
        if(r.status!=='pending'||!r.date||!r.time){window.AndroidApp.cancelNotification(tag);return;}
        const due=new Date(`${r.date}T${r.time}:00`);
        if(!Number.isFinite(due.getTime())||due<=now)return;
        window.AndroidApp.scheduleNotification(JSON.stringify({tag,title:r.title,body:`${fmtDate(r.date)} • ${formatTime(r.time)}`,kind:'reminder',when:due.getTime(),autoNoMin:0,vibrate:!!state.settings.vibration}));
      });
      return;
    }
    if(Notification.permission!=='granted')return;
    sched.forEach(item=>{if((ds.schedule[item.id]?.status||'pending')!=='pending')return;const [h,m]=item.time.split(':').map(Number);const due=new Date();due.setHours(h,m,0,0);const delay=due-now;if(delay>0&&delay<86400000)setTimeout(()=>showActionNotification(item),delay);});
    (state.reminders||[]).forEach(r=>{if(r.status!=='pending'||!r.date||!r.time)return;const due=new Date(`${r.date}T${r.time}:00`),delay=due-now;if(delay>0&&delay<86400000)setTimeout(()=>{new Notification(r.title,{body:`${fmtDate(r.date)} • ${formatTime(r.time)}`,tag:`reminder:${r.id}`});},delay);});
  }
  async function showActionNotification(item){ if(state.settings.vibration)navigator.vibrate?.([180,100,180]);const reg=await navigator.serviceWorker?.ready;const opts={body:`${formatTime(item.time)} • Did you do/start this?`,tag:`schedule:${item.id}`,renotify:true,vibrate:state.settings.vibration?[180,100,180]:undefined,actions:[{action:'yes',title:'YES'},{action:'no',title:'NO'}]};if(reg?.showNotification)reg.showNotification(item.title,opts);else new Notification(item.title,opts);const mins=state.settings.autoNoMin;if(mins)setTimeout(()=>{const ds=dayState();if((ds.schedule[item.id]?.status||'pending')==='pending'){ds.schedule[item.id]={status:'missed',auto:true,at:new Date().toISOString()};addXP(-5,`Auto-No: ${item.title}`);save();if(currentView==='today')renderToday();}},mins*60000);}
  function applyNotificationAction(d){
    const [tagKind,id]=(d.tag||'').split(':');
    if(tagKind==='reminder'){const r=(state.reminders||[]).find(x=>x.id===id);if(!r)return;if(d.action==='yes'||d.action==='open')r.status='done';else if(d.action==='no')r.status='dismissed';r.actedAt=new Date(d.at||Date.now()).toISOString();save();render();return;}
    if(tagKind!=='schedule')return;
    const ds=dayState(), prev=ds.schedule[id]?.status||'pending';
    const item=(state.scheduleTemplates[ds.template]||[]).find(x=>x.id===id);
    const nKind=d.kind||(((item?.title||'').toLowerCase().includes('workout'))?'workout':((item?.title||'').toLowerCase().includes('thesis'))?'thesis':'schedule');
    const at=new Date(d.at||Date.now()).toISOString();
    if(!['pending','not-now'].includes(prev))return;
    if(nKind==='workout'){
      if(d.action==='yes'){
        ds.schedule[id]={status:'done',at,native:true};
        state.workouts.statuses[todayKey()]='Completed';
        addXP(XP_CONFIG.workout||50,'Workout completed from notification');
      }else if(d.action==='reschedule'){
        ds.schedule[id]={status:'rescheduled',at,native:true};
        state.workouts.statuses[todayKey()]='Rescheduled';
      }else if(d.action==='no'){
        ds.schedule[id]={status:'missed',at,auto:!!d.auto,native:true};
        state.workouts.statuses[todayKey()]='Missed';
        addXP(-(XP_CONFIG.missWorkout||20),d.auto?'Auto-No workout':'Missed workout');
      }
    }else if(nKind==='thesis'){
      if(d.action==='start') ds.schedule[id]={status:'started',at,native:true};
      else if(d.action==='not_now') ds.schedule[id]={status:'not-now',at,native:true};
      else if(d.action==='no'){ds.schedule[id]={status:'missed',at,auto:!!d.auto,native:true};addXP(-5,d.auto?'Auto-No thesis session':'Missed thesis session');}
    }else{
      if(d.action==='yes'){ds.schedule[id]={status:'done',at,native:true};addXP(XP_CONFIG.schedule||10,'Notification: completed');}
      else if(d.action==='no'){ds.schedule[id]={status:'missed',at,auto:!!d.auto,native:true};addXP(-5,d.auto?'Auto-No notification':'Notification: no');}
    }
    save(); render();
  }
  window.__applyNativeNotificationActions=function(json){try{const arr=JSON.parse(json||'[]');arr.forEach(applyNotificationAction);scheduleNotifications();}catch(e){console.error(e);}};
  navigator.serviceWorker?.addEventListener('message',e=>{const d=e.data;if(d?.type!=='notification-action')return;applyNotificationAction(d);});

  function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`edjay-life-organizer-v3-backup-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function importBackup(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const obj=JSON.parse(r.result);if(!obj.version)throw new Error('Invalid');state=obj;save();closeFull();render();alert('Backup imported.');}catch{alert('That file is not a valid V3 backup.');}};r.readAsText(f);}

  document.addEventListener('toggle',e=>{if(e.target?.id==='fullSchedule')scheduleExpanded=e.target.open;},true);

  document.addEventListener('click',e=>{
    const qa=e.target.closest('[data-qa]');if(qa){quickAdd(qa.dataset.qa);return;}
    if(e.target.closest('#allLevels')||e.target.closest('[data-level-preview]')){renderProfile();return;}
    const stat=e.target.closest('[data-stat-open]');if(stat){const x=stat.dataset.statOpen;if(x==='thesis')thesisFull();if(x==='money')moneyFull();if(x==='tasks')setView('tasks');if(x==='attention')inventoryFull('all','attention');if(x==='inventory')inventoryFull();return;}
    const op=e.target.closest('[data-open]');if(op){const x=op.dataset.open;if(x==='mindmap')mindmapFull();if(x==='thesis')thesisFull();if(x==='money')moneyFull();if(x==='bom')bomFull();if(x==='inventory')inventoryFull();if(x==='workouts')workoutsFull();if(x==='routine-manage')routineManageAll();if(x==='timer')focusTimerFull();return;}
    const jump=e.target.closest('[data-jump]');if(jump){const target=jump.dataset.jump;if(target==='tasks'){setView('tasks');return;}if(target==='schedule'){scheduleExpanded=true;renderToday();setTimeout(()=>$('#fullSchedule')?.scrollIntoView({behavior:'smooth',block:'start'}),20);return;}if(target==='routine'){setTimeout(()=>$('#todayRoutine')?.scrollIntoView({behavior:'smooth',block:'center'}),10);return;}if(target==='workout'){setTimeout(()=>$('#todayWorkout')?.scrollIntoView({behavior:'smooth',block:'center'}),10);return;}}
    const lc=e.target.closest('[data-life-cat]');if(lc){inventoryFull(lc.dataset.lifeCat);return;}
    const lg=e.target.closest('[data-life-group]');if(lg){if(lg.dataset.lifeGroup==='belongings')inventoryFull('Electronics');return;}
    const sch=e.target.closest('[data-sched-status]');if(sch){statusSheetSchedule(sch.dataset.schedStatus);return;}
    const tt=e.target.closest('[data-task-toggle]');if(tt){toggleTask(tt.dataset.taskToggle);return;}
    const tm=e.target.closest('[data-task-more]');if(tm){taskMore(tm.dataset.taskMore);return;}
    const rr=e.target.closest('[data-routine]');if(rr){routineSheet(rr.dataset.routine);return;}
    const sw=e.target.closest('[data-start-workout]');if(sw){startWorkout(sw.dataset.startWorkout);return;}
    const ia=e.target.closest('[data-int-action]');if(ia){const x=state.interruptions.find(v=>v.id===ia.dataset.id);if(x){
      const action=ia.dataset.intAction;
      if(action==='shift')shiftFlexible(30);
      if(action==='excuse')markAffectedFlexible('excused');
      if(action==='not-today')markAffectedFlexible('not-today');
      if(action==='resolve'&&x.kind==='Quick task'&&!x.rewarded){addXP(XP_CONFIG.unexpected||10,`Unexpected task: ${x.title}`);x.rewarded=true;}
      x.active=false;x.resolved=new Date().toISOString();x.resolution=action;save();render();
    }return;}
  });

  if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
  applyTheme(); render(); setTimeout(scheduleNotifications,1200);
})();
