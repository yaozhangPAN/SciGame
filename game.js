const conceptPool = ["杠杆", "空气压力", "弹力", "龙卷风与气流", "行星运动", "浮力", "摩擦力", "光的反射", "电路", "磁力", "热传导", "密度"];
let gameState = null;
let bgmCtx = null;

const $ = (id) => document.getElementById(id);

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
  return [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
}

function rand(seed) {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

function generateLevels(doc, concepts) {
  const theme = (doc.match(/宇宙|深海|森林|天空|火山|机器人/g) || ["宇宙"]).slice(0, 1)[0];
  return concepts.map((concept, i) => ({
    title: `${theme}试炼·第${i + 1}关`,
    concept,
    narration: `主角与机器人来到${theme}站点，核心问题与“${concept}”有关。你需要选择最科学的方案来继续冒险。`,
    choices: [
      { text: `方案A：直觉操作，忽略数据`, ok: false, reason: `该方案没有体现${concept}的科学机制，风险较高。` },
      { text: `方案B：先测量变量，再按${concept}原理实施`, ok: true, reason: `你使用了${concept}并通过测量与验证闭环，方案科学可靠。` },
      { text: `方案C：追求速度，省略验证步骤`, ok: false, reason: `缺失验证会导致结论不稳，不能满足“科学可解释”要求。` }
    ]
  }));
}

function drawAnimeScene(level, seedBase) {
  const canvas = $("sceneCanvas");
  const ctx = canvas.getContext("2d");
  const seed = hashSeed(level.title + level.concept + seedBase);
  const w = canvas.width, h = canvas.height;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, `hsl(${Math.floor(rand(seed) * 360)}, 85%, 24%)`);
  grad.addColorStop(1, `hsl(${Math.floor(rand(seed + 1) * 360)}, 80%, 12%)`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + rand(seed + i) * 0.8})`;
    const x = rand(seed + i * 3) * w, y = rand(seed + i * 5) * h;
    const r = rand(seed + i * 7) * 2.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // anime character silhouette
  ctx.fillStyle = "rgba(255,235,180,.95)";
  ctx.beginPath(); ctx.arc(w * 0.72, h * 0.33, 55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e7f0ff";
  ctx.fillRect(w * 0.64, h * 0.40, 120, 170);
  ctx.fillStyle = "#7ec8ff";
  ctx.fillRect(w * 0.67, h * 0.45, 60, 20);

  // robot
  ctx.fillStyle = "#dde9ff";
  ctx.fillRect(w * 0.52, h * 0.50, 70, 95);
  ctx.fillStyle = "#78a9ff";
  ctx.beginPath(); ctx.arc(w * 0.555, h * 0.50, 36, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.fillRect(20, h - 110, w - 40, 90);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(level.title, 40, h - 70);
  ctx.font = "24px sans-serif";
  ctx.fillText(`科学概念：${level.concept}`, 40, h - 34);
}

function playBGM(moodIndex) {
  if (!bgmCtx) bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = bgmCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = moodIndex % 2 ? "triangle" : "sine";
  osc.frequency.value = 220 + moodIndex * 35;
  gain.gain.value = 0.03;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  setTimeout(() => osc.stop(), 1400);
}

function renderLevel() {
  const lv = gameState.levels[gameState.idx];
  $("chapter").textContent = gameState.idx + 1;
  $("score").textContent = gameState.score;
  $("endingHint").textContent = gameState.score >= gameState.idx * 10 ? "科学严谨" : "需要更多验证";
  $("sceneTitle").textContent = lv.title;
  $("narration").textContent = lv.narration;
  $("conceptTag").textContent = `本关科学概念：${lv.concept}`;
  drawAnimeScene(lv, gameState.seedBase);
  playBGM(gameState.idx);

  const box = $("choices"); box.innerHTML = "";
  $("feedback").classList.add("hidden");
  $("nextBtn").classList.add("hidden");
  lv.choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = c.text;
    btn.onclick = () => {
      if (gameState.locked) return;
      gameState.locked = true;
      const fb = $("feedback");
      fb.classList.remove("hidden");
      fb.className = `feedback ${c.ok ? "good" : "bad"}`;
      fb.textContent = `${c.ok ? "✅ 成功" : "⚠️ 失败"}：${c.reason}`;
      if (c.ok) gameState.score += 20;
      $("score").textContent = gameState.score;
      $("nextBtn").classList.remove("hidden");
    };
    box.appendChild(btn);
  });
}

function startGame(text) {
  const concepts = extractConcepts(text);
  gameState = { idx: 0, score: 0, locked: false, seedBase: text.slice(0,50), levels: generateLevels(text, concepts) };
  $("setup").classList.add("hidden");
  $("game").classList.remove("hidden");
  renderLevel();
}

$("generateBtn").onclick = async () => {
  const file = $("fileInput").files[0];
  let text = $("storyInput").value.trim();
  if (!text && file) text = await file.text();
  if (!text) return alert("请先上传或粘贴文档内容");
  startGame(text);
};

$("demoBtn").onclick = () => {
  $("storyInput").value = "在宇宙站里，我们要用浮力、磁力、热传导、电路、摩擦力修复能源系统，并通过实验验证每一步。";
};

$("nextBtn").onclick = () => {
  gameState.idx += 1;
  gameState.locked = false;
  if (gameState.idx >= 5) {
    $("game").classList.add("hidden");
    $("ending").classList.remove("hidden");
    const s = gameState.score;
    const title = s >= 85 ? "科学大师结局" : s >= 50 ? "探险家结局" : "重修结局";
    $("endingTitle").textContent = title;
    $("endingText").textContent = `本次得分 ${s}。系统已根据你的文档生成了5个科学概念关卡；再次上传新文档可得到全新剧情与画面。`;
    return;
  }
  renderLevel();
};

$("restartBtn").onclick = () => {
  $("ending").classList.add("hidden");
  $("setup").classList.remove("hidden");
};
