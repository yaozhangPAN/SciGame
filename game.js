const conceptPool = ["杠杆", "空气压力", "弹力", "龙卷风与气流", "行星运动", "浮力", "摩擦力", "光的反射", "电路", "磁力", "热传导", "密度", "压强", "能量守恒", "惯性"];
const moodTracks = [
  [261.63, 329.63, 392.0],
  [293.66, 369.99, 440.0],
  [329.63, 415.3, 493.88],
  [349.23, 440.0, 523.25],
  [392.0, 493.88, 587.33]
];

let gameState = null;
let bgmCtx = null;
let bgmTimer = null;

const $ = (id) => document.getElementById(id);

function splitSentences(text) {
  return text
    .split(/[。！？!?.\n]/g)
    .map(s => s.trim())
    .filter(s => s.length >= 8);
}

function extractConcepts(text) {
  const found = conceptPool.filter(c => text.includes(c));
  const uniq = [...new Set(found)];
  while (uniq.length < 5) {
    const next = conceptPool.find(c => !uniq.includes(c));
    uniq.push(next);
  }
  return uniq.slice(0, 5);
}

function hashSeed(str) {
  return [...str].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 17);
}

function seeded(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function inferTheme(text) {
  const themes = ["宇宙", "校园", "深海", "森林", "未来都市", "天空城"];
  for (const t of themes) if (text.includes(t)) return t;
  return "未来都市";
}

function generateOtomeStory(doc, concepts) {
  const lines = splitSentences(doc);
  const theme = inferTheme(doc);
  const heroine = /我|主角|女孩|少女/.test(doc) ? "你" : "星野凛";
  const partner = /机器人|AI|助手/.test(doc) ? "AI搭档诺亚" : "学长航";

  const baseEvents = lines.length ? lines : [
    "城市的科研中枢出现异常波动",
    "你被选中参与修复计划",
    "搭档向你伸出手，请你做出关键判断"
  ];

  return concepts.map((concept, i) => {
    const event = baseEvents[i % baseEvents.length];
    const conflict = `${event}。在${theme}第${i + 1}区，装置与“${concept}”直接相关。`;
    const properAction = `先建立变量表，进行一次小规模实验，再依据${concept}结论执行。`;
    const wrongA = `直接凭感觉操作装置，不记录任何数据。`;
    const wrongB = `复制上一关方案，不验证${concept}在当前场景是否成立。`;

    return {
      sceneTitle: `${theme}·章节 ${i + 1}`,
      concept,
      dialogue: [
        `${heroine}看着故障装置，心跳加速。`,
        `${partner}：别怕，我会和你一起完成这次试炼。`,
        `旁白：${conflict}`,
        `${partner}：你来决定，我们该怎么做？`
      ],
      choices: [
        { text: `A. ${wrongA}`, ok: false, reason: `没有测量与验证，无法证明${concept}被正确应用。` },
        { text: `B. ${properAction}`, ok: true, reason: `你完成了“问题→实验→结论→执行”的科学闭环。` },
        { text: `C. ${wrongB}`, ok: false, reason: `场景变化后直接套用旧方案，违背科学求证过程。` }
      ]
    };
  });
}

function drawAnimeVNScene(level, seedBase) {
  const canvas = $("sceneCanvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  const seed = hashSeed(level.sceneTitle + level.concept + seedBase);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, `hsl(${Math.floor(seeded(seed) * 360)}, 75%, 20%)`);
  sky.addColorStop(1, `hsl(${Math.floor(seeded(seed + 1) * 360)}, 65%, 10%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // soft bokeh for anime VN style
  for (let i = 0; i < 28; i++) {
    const x = seeded(seed + i * 11) * w;
    const y = seeded(seed + i * 19) * (h * 0.7);
    const r = 40 + seeded(seed + i * 7) * 100;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${(i * 37) % 360},90%,75%,0.25)`);
    g.addColorStop(1, "hsla(0,0%,100%,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // background architecture
  ctx.fillStyle = "rgba(20,30,80,.45)";
  for (let i = 0; i < 8; i++) {
    const x = i * 130 + 20;
    const hh = 120 + seeded(seed + i) * 180;
    ctx.fillRect(x, h - hh - 80, 90, hh);
  }

  // character bust (VN layout)
  ctx.fillStyle = "rgba(248,236,220,.98)";
  ctx.beginPath(); ctx.arc(w * 0.72, h * 0.31, 62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a3d2f"; // hair
  ctx.beginPath(); ctx.ellipse(w * 0.72, h * 0.27, 70, 55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f6fbff";
  ctx.fillRect(w * 0.63, h * 0.39, 180, 220);
  ctx.fillStyle = "#7aa2ff";
  ctx.fillRect(w * 0.68, h * 0.46, 70, 28);

  // partner silhouette
  ctx.fillStyle = "rgba(220,232,255,.85)";
  ctx.fillRect(w * 0.44, h * 0.45, 110, 170);
  ctx.fillStyle = "#89b4ff";
  ctx.beginPath(); ctx.arc(w * 0.495, h * 0.45, 50, 0, Math.PI * 2); ctx.fill();

  // dialogue box (otome/VN feeling)
  ctx.fillStyle = "rgba(12,14,35,.78)";
  ctx.strokeStyle = "rgba(255,182,219,.85)";
  ctx.lineWidth = 2;
  ctx.fillRect(24, h - 170, w - 48, 146);
  ctx.strokeRect(24, h - 170, w - 48, 146);

  ctx.fillStyle = "#ffd7ef";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(level.sceneTitle, 42, h - 132);
  ctx.fillStyle = "#eaf0ff";
  ctx.font = "24px sans-serif";
  ctx.fillText(`科学概念：${level.concept}`, 42, h - 92);
}

function stopBGM() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

function startBGM(chapterIndex) {
  if (!bgmCtx) bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
  stopBGM();
  const chord = moodTracks[chapterIndex % moodTracks.length];
  let beat = 0;
  bgmTimer = setInterval(() => {
    chord.forEach((f, idx) => {
      const osc = bgmCtx.createOscillator();
      const gain = bgmCtx.createGain();
      osc.type = idx === 0 ? "triangle" : "sine";
      osc.frequency.value = f * (beat % 4 === 3 && idx === 2 ? 1.5 : 1);
      gain.gain.value = idx === 0 ? 0.025 : 0.018;
      osc.connect(gain).connect(bgmCtx.destination);
      osc.start();
      osc.stop(bgmCtx.currentTime + 0.28);
    });
    beat++;
  }, 320);
}

function renderLevel() {
  const lv = gameState.levels[gameState.idx];
  gameState.locked = false;

  $("chapter").textContent = gameState.idx + 1;
  $("score").textContent = gameState.score;
  $("endingHint").textContent = gameState.score >= gameState.idx * 15 ? "高好感·高可信度" : "剧情紧张中";
  $("sceneTitle").textContent = lv.sceneTitle;
  $("narration").textContent = lv.dialogue.join(" ");
  $("conceptTag").textContent = `本章科学概念：${lv.concept}`;

  drawAnimeVNScene(lv, gameState.seedBase);
  startBGM(gameState.idx);

  const box = $("choices");
  box.innerHTML = "";
  $("feedback").classList.add("hidden");
  $("nextBtn").classList.add("hidden");

  lv.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = choice.text;
    btn.onclick = () => {
      if (gameState.locked) return;
      gameState.locked = true;
      const fb = $("feedback");
      fb.classList.remove("hidden");
      fb.className = `feedback ${choice.ok ? "good" : "bad"}`;
      fb.textContent = `${choice.ok ? "✅ 判定成功" : "❌ 判定失败"}：${choice.reason}`;
      if (choice.ok) {
        gameState.score += 20;
        gameState.affection += 1;
      }
      $("score").textContent = gameState.score;
      $("nextBtn").classList.remove("hidden");
    };
    box.appendChild(btn);
  });
}

function startGame(text) {
  const concepts = extractConcepts(text);
  const levels = generateOtomeStory(text, concepts);
  gameState = {
    idx: 0,
    score: 0,
    affection: 0,
    seedBase: text.slice(0, 100),
    levels,
    locked: false
  };
  $("setup").classList.add("hidden");
  $("ending").classList.add("hidden");
  $("game").classList.remove("hidden");
  renderLevel();
}

$("generateBtn").onclick = async () => {
  const file = $("fileInput").files[0];
  let text = $("storyInput").value.trim();
  if (!text && file) text = await file.text();
  if (!text) return alert("请先上传或粘贴故事文档内容");
  startGame(text);
};

$("demoBtn").onclick = () => {
  $("storyInput").value = "在未来都市校园中，我和AI助手要修复失控能源塔。第一步我们研究电路负载，第二步比较空气压力阀门，第三步用弹力机构稳定平台，第四步分析摩擦力损耗，第五步验证能量守恒并完成启动。";
};

$("nextBtn").onclick = () => {
  gameState.idx += 1;
  if (gameState.idx >= 5) {
    stopBGM();
    $("game").classList.add("hidden");
    $("ending").classList.remove("hidden");
    const s = gameState.score;
    const a = gameState.affection;
    let title = "重修结局";
    let text = `本次得分 ${s}，你和搭档的默契仍需磨合。`;
    if (s >= 80 && a >= 4) {
      title = "真结局：星海誓约";
      text = `本次得分 ${s}。你用严谨科学与温柔判断拯救了城市，也收获了最真挚的羁绊。`;
    } else if (s >= 50) {
      title = "普通结局：并肩前行";
      text = `本次得分 ${s}。危机解除，你和搭档约定下一次要做得更完美。`;
    }
    $("endingTitle").textContent = title;
    $("endingText").textContent = text + " 再上传新文档可生成新的剧情章节、概念和演出。";
    return;
  }
  renderLevel();
};

$("restartBtn").onclick = () => {
  stopBGM();
  $("ending").classList.add("hidden");
  $("setup").classList.remove("hidden");
};
