const conceptPool = ["杠杆", "空气压力", "弹力", "龙卷风与气流", "行星运动", "浮力", "摩擦力", "光的反射", "电路", "磁力", "热传导", "密度", "压强", "能量守恒", "惯性"];
const moodTracks = [[261.63,329.63,392],[293.66,369.99,440],[329.63,415.3,493.88],[349.23,440,523.25],[392,493.88,587.33]];
let gameState = null, bgmCtx = null, bgmTimer = null;
const chapterCG = ["assets/ch1.svg","assets/ch2.svg","assets/ch3.svg","assets/ch4.svg","assets/ch5.svg"];
const $ = (id) => document.getElementById(id);

function splitSentences(text){return text.split(/[。！？!?.\n]/g).map(s=>s.trim()).filter(s=>s.length>=8)}
function extractConcepts(text){const found=conceptPool.filter(c=>text.includes(c));const uniq=[...new Set(found)];while(uniq.length<5){const n=conceptPool.find(c=>!uniq.includes(c));uniq.push(n)}return uniq.slice(0,5)}
function hashSeed(str){return [...str].reduce((a,c)=>(a*33+c.charCodeAt(0))>>>0,17)}
function seeded(seed){const x=Math.sin(seed)*10000;return x-Math.floor(x)}
function inferTheme(text){for(const t of ["宇宙","校园","深海","森林","未来都市","天空城"]) if(text.includes(t)) return t;return "未来都市"}

function parseQuestionBlocks(doc){
  const lines = doc.split(/\n+/).map(l=>l.trim()).filter(Boolean);
  const qs=[]; let cur=null;
  for(const line of lines){
    if(/^Q[:：]/i.test(line)){ if(cur) qs.push(cur); cur={q:line.replace(/^Q[:：]/i,'').trim(), opts:[], ans:null, concept:null}; continue; }
    if(!cur) continue;
    if(/^(A|B|C|D)[\).:：]/i.test(line)) cur.opts.push(line.trim());
    else if(/^ANS[:：]/i.test(line)) cur.ans=line.replace(/^ANS[:：]/i,'').trim().toUpperCase();
    else if(/^SCI[:：]/i.test(line)) cur.concept=line.replace(/^SCI[:：]/i,'').trim();
  }
  if(cur) qs.push(cur);
  return qs.filter(x=>x.q && x.opts.length>=2);
}

function generateOtomeStory(doc, concepts){
  const lines=splitSentences(doc), theme=inferTheme(doc);
  const heroine=/我|主角|女孩|少女/.test(doc)?"你":"星野凛";
  const partner=/机器人|AI|助手/.test(doc)?"AI搭档诺亚":"学长航";
  const baseEvents=lines.length?lines:["城市科研中枢异常波动","你被选中参与修复计划","搭档向你伸出手，请你做出关键判断"];
  const parsedQs=parseQuestionBlocks(doc);

  return concepts.map((concept,i)=>{
    const event=baseEvents[i%baseEvents.length];
    const conflict=`${event}。在${theme}第${i+1}区，问题与“${concept}”直接相关。`;
    const q=parsedQs[i];
    let choices;
    if(q){
      const ans=(q.ans||'B').replace(/[^A-D]/g,'');
      choices=q.opts.map(raw=>{
        const key=(raw.match(/^(A|B|C|D)/i)||[''])[0].toUpperCase();
        const ok=key===ans;
        return {text:raw,ok,reason:ok?`该选项与文档原题答案(${ans})一致，并满足科学求证逻辑。`:`该选项与文档原题答案(${ans})不一致，请回到题干重新验证变量与因果。`};
      });
      if(!choices.some(c=>c.ok)){choices[0].ok=true;choices[0].reason='文档未给出有效答案标记，默认第一项为参考正确项。'}
    }else{
      choices=[
        {text:"A. 直接凭感觉操作装置，不记录任何数据。",ok:false,reason:`没有测量与验证，无法证明${concept}被正确应用。`},
        {text:`B. 先建立变量表，进行一次小规模实验，再依据${concept}结论执行。`,ok:true,reason:"你完成了问题→实验→结论→执行的科学闭环。"},
        {text:"C. 复制上一关方案，不验证当前场景是否成立。",ok:false,reason:"场景变化后套用旧方案，违背科学求证过程。"}
      ];
    }

    return {sceneTitle:`${theme}·章节 ${i+1}`, concept:q?.concept||concept, dialogue:[`${heroine}看着故障装置，心跳加速。`,`${partner}：别怕，我会和你一起完成这次试炼。`,`旁白：${conflict}`,`${partner}：你来决定，我们该怎么做？`], question:q?.q||`请选择本章最科学的解决方案（概念：${concept}）`, choices};
  });
}

function drawAnimeVNScene(level, seedBase){const c=$("sceneCanvas"),ctx=c.getContext("2d"),w=c.width,h=c.height,seed=hashSeed(level.sceneTitle+level.concept+seedBase);const bg=new Image();bg.onload=()=>{ctx.drawImage(bg,0,0,w,h);drawOverlay()};bg.onerror=()=>{const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,`hsl(${Math.floor(seeded(seed)*360)},75%,20%)`);sky.addColorStop(1,`hsl(${Math.floor(seeded(seed+1)*360)},65%,10%)`);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);drawOverlay()};bg.src=chapterCG[(gameState?.idx||0)%chapterCG.length];
function drawOverlay(){ctx.fillStyle="rgba(12,14,35,.72)";ctx.strokeStyle="rgba(255,182,219,.85)";ctx.lineWidth=2;ctx.fillRect(24,h-170,w-48,146);ctx.strokeRect(24,h-170,w-48,146);ctx.fillStyle="#ffd7ef";ctx.font="bold 30px sans-serif";ctx.fillText(level.sceneTitle,42,h-132);ctx.fillStyle="#eaf0ff";ctx.font="24px sans-serif";ctx.fillText(`科学概念：${level.concept}`,42,h-92)}}

function stopBGM(){if(bgmTimer){clearInterval(bgmTimer);bgmTimer=null}}
function startBGM(i){if(!bgmCtx) bgmCtx=new (window.AudioContext||window.webkitAudioContext)();stopBGM();const chord=moodTracks[i%moodTracks.length];let beat=0;bgmTimer=setInterval(()=>{chord.forEach((f,idx)=>{const osc=bgmCtx.createOscillator(),gain=bgmCtx.createGain();osc.type=idx===0?"triangle":"sine";osc.frequency.value=f*(beat%4===3&&idx===2?1.5:1);gain.gain.value=idx===0?0.025:0.018;osc.connect(gain).connect(bgmCtx.destination);osc.start();osc.stop(bgmCtx.currentTime+0.28)});beat++},320)}

function renderLevel(){const lv=gameState.levels[gameState.idx];gameState.locked=false;$("chapter").textContent=gameState.idx+1;$("score").textContent=gameState.score;$("endingHint").textContent=gameState.score>=gameState.idx*15?"高好感·高可信度":"剧情紧张中";$("sceneTitle").textContent=lv.sceneTitle;$("narration").textContent=lv.dialogue.join(" ");$("conceptTag").textContent=`本章科学概念：${lv.concept}`;drawAnimeVNScene(lv,gameState.seedBase);startBGM(gameState.idx);const box=$("choices");box.innerHTML="";$("feedback").classList.add("hidden");$("nextBtn").classList.add("hidden");
  const q=document.createElement('p');q.className='question';q.textContent=`题干：${lv.question}`;box.appendChild(q);
  lv.choices.forEach(choice=>{const btn=document.createElement("button");btn.className="choice";btn.textContent=choice.text;btn.onclick=()=>{if(gameState.locked) return;gameState.locked=true;const fb=$("feedback");fb.classList.remove("hidden");fb.className=`feedback ${choice.ok?"good":"bad"}`;fb.textContent=`${choice.ok?"✅ 判定成功":"❌ 判定失败"}：${choice.reason}`;if(choice.ok){gameState.score+=20;gameState.affection+=1}$("score").textContent=gameState.score;$("nextBtn").classList.remove("hidden")};box.appendChild(btn)})}

function startGame(text){const concepts=extractConcepts(text),levels=generateOtomeStory(text,concepts);gameState={idx:0,score:0,affection:0,seedBase:text.slice(0,100),levels,locked:false};$("setup").classList.add("hidden");$("ending").classList.add("hidden");$("game").classList.remove("hidden");renderLevel()}
$("generateBtn").onclick=async()=>{const file=$("fileInput").files[0];let text=$("storyInput").value.trim();if(!text&&file) text=await file.text();if(!text) return alert("请先上传或粘贴故事文档内容\n\n如要使用文档原题，请按格式输入：\nQ: 题干\nA) ...\nB) ...\nC) ...\nANS: B\nSCI: 概念");startGame(text)};
$("demoBtn").onclick=async()=>{const t=await fetch("demo_story.txt").then(r=>r.text());$("storyInput").value=t};
$("nextBtn").onclick=()=>{gameState.idx+=1;if(gameState.idx>=5){stopBGM();$("game").classList.add("hidden");$("ending").classList.remove("hidden");const s=gameState.score,a=gameState.affection;let title="重修结局",text=`本次得分 ${s}，你和搭档的默契仍需磨合。`;if(s>=80&&a>=4){title="真结局：星海誓约";text=`本次得分 ${s}。你用严谨科学与温柔判断拯救了城市，也收获了最真挚的羁绊。`}else if(s>=50){title="普通结局：并肩前行";text=`本次得分 ${s}。危机解除，你和搭档约定下一次要做得更完美。`;}$("endingTitle").textContent=title;$("endingText").textContent=text+" 再上传新文档可生成新的剧情章节、概念和演出。";return}renderLevel()};
$("restartBtn").onclick=()=>{stopBGM();$("ending").classList.add("hidden");$("setup").classList.remove("hidden")};
