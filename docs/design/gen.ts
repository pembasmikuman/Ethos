// Generates three artboards for the Ethos design canvas.
const LIGHT = process.env.THEME === 'light';
const SFX = LIGHT ? 'Light' : '';
const ACCENT = '#FF4D1C';
const BG = LIGHT ? '#EDEAE4' : '#0A0A0B';
const CARD = LIGHT ? '#F7F5F1' : '#141416';
const LINE = LIGHT ? '#D6D2CA' : '#232326';
const TEXT = LIGHT ? '#141416' : '#F2F2F0';
const MUTE = LIGHT ? '#6B6B66' : '#8A8A86';
const DIM = LIGHT ? '#B8B5AE' : '#3A3A3E';
const WARN_BG = LIGHT ? '#FBE9E2' : '#1A1210';
const WARN_LINE = LIGHT ? '#F3C4B3' : '#3A2418';
const GREEN = LIGHT ? '#15803D' : '#4ADE80';
const GREEN_DIM = LIGHT ? '#CDE9D6' : '#1E3A2A';

const head = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Doto:ROND,wght@100,400;100,700;100,900&family=JetBrains+Mono:wght@400;500;600&display=swap">
  <style>
    body { margin: 0; background: ${BG}; color: ${TEXT}; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; -webkit-font-smoothing: antialiased; }
    a { color: ${ACCENT}; } a:hover { color: #FF7A55; }
    .doto { font-family: 'Doto', 'JetBrains Mono', monospace; font-variation-settings: 'ROND' 100; font-weight: 900; }
    .lbl { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: ${MUTE}; font-weight: 500; }
    .num { font-variant-numeric: tabular-nums; }
  </style>
</helmet>`;
const foot = `</x-dc>
</body>
</html>`;

// Ring of dots: n dots, lit fraction f.
function ring(size: number, n: number, lit: number, r: number, dot = 3) {
  const c = size / 2;
  let s = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block">`;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
    const on = i < Math.round(n * lit);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${on ? dot : dot * 0.6}" fill="${on ? ACCENT : DIM}"></circle>`;
  }
  return s + '</svg>';
}
// Dot column bar chart: values 0..1 per column, rows tall.
function dotBars(vals: number[], rows: number, colW = 14, dot = 4, hi?: number[]) {
  const w = vals.length * colW, h = rows * (dot * 2 + 2);
  let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">`;
  vals.forEach((v, i) => {
    const litRows = Math.round(v * rows);
    for (let rI = 0; rI < rows; rI++) {
      const on = rI < litRows;
      const y = h - dot - rI * (dot * 2 + 2);
      const inBand = hi && rI + 1 >= hi[0] && rI + 1 <= hi[1];
      const fill = on ? (inBand ? GREEN : TEXT) : (inBand ? GREEN_DIM : DIM);
      s += `<circle cx="${i * colW + colW / 2}" cy="${y}" r="${on ? dot : dot * 0.5}" fill="${fill}"></circle>`;
    }
  });
  return s + '</svg>';
}
const check = (on: boolean) => `<div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${on ? ACCENT : 'transparent'};border:1.5px solid ${on ? ACCENT : LINE}">${on ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="${BG}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l4 4 8-9"></path></svg>` : ''}</div>`;

const setRow = (n: number, w: string, reps: string, rir: string, state: 'done' | 'active' | 'todo', prev: string, warm = false) => {
  const col = state === 'todo' ? DIM : TEXT;
  const bg = state === 'active' ? CARD : 'transparent';
  const border = state === 'active' ? ACCENT : 'transparent';
  return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:14px;background:${bg};border:1px solid ${border}">
    <div class="lbl" style="width:26px;color:${warm ? '#7C8A99' : MUTE}">${warm ? 'W' : n}</div>
    <div style="flex:1;display:flex;flex-direction:column;gap:2px">
      <div style="display:flex;gap:14px;align-items:baseline">
        <span class="doto num" style="font-size:26px;color:${col}">${w}</span>
        <span class="lbl" style="color:${DIM}">kg</span>
        <span class="doto num" style="font-size:26px;color:${col}">${reps}</span>
        <span class="lbl" style="color:${DIM}">reps</span>
        <span class="doto num" style="font-size:26px;color:${col}">${rir}</span>
        <span class="lbl" style="color:${DIM}">rir</span>
      </div>
      <div class="lbl num" style="font-size:10px;color:${state === 'active' ? MUTE : DIM}">${prev}</div>
    </div>
    ${check(state === 'done')}
  </div>`;
};

const key = (k: string, sub = false) => `<div style="display:flex;align-items:center;justify-content:center;height:56px;border-radius:14px;background:${sub ? 'transparent' : CARD};border:1px solid ${LINE}"><span class="doto num" style="font-size:26px;color:${sub ? MUTE : TEXT}">${k}</span></div>`;

// ---------- Main: active workout ----------
const workout = `${head}
<div style="width:390px;height:844px;background:${BG};display:flex;flex-direction:column;padding:60px 16px 0;box-sizing:border-box;overflow:hidden">
  <div style="display:flex;align-items:flex-end;justify-content:space-between;padding:0 4px 18px">
    <div style="display:flex;flex-direction:column;gap:4px">
      <div class="lbl">Push A · Session 14</div>
      <div class="doto" style="font-size:36px;line-height:1;letter-spacing:0.02em">BENCH PRESS</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
      <div class="lbl">Elapsed</div>
      <div class="doto num" style="font-size:22px;line-height:1;color:${MUTE}">24:10</div>
    </div>
  </div>

  <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:14px;background:${WARN_BG};border:1px solid ${WARN_LINE};margin-bottom:14px">
    <span style="width:8px;height:8px;border-radius:50%;background:${ACCENT};display:inline-block"></span>
    <span class="lbl" style="color:${ACCENT};flex:1">Ready to overload</span>
    <span class="doto num" style="font-size:18px;color:${ACCENT}">+2.5 kg</span>
  </div>

  <div style="display:flex;flex-direction:column;gap:4px">
    ${setRow(0, '50', '8', '–', 'done', '', true)}
    ${setRow(1, '82.5', '10', '2', 'done', 'prev 80 × 10 @ 2')}
    ${setRow(2, '82.5', '10', '2', 'active', 'prev 80 × 10 @ 2 · target 12')}
    ${setRow(3, '82.5', '–', '–', 'todo', 'prev 80 × 9 @ 1')}
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 4px 10px">
    <div class="lbl">Next · <span style="color:${TEXT}">Incline DB Press</span></div>
    <div class="lbl" style="color:${DIM}">02 / 05</div>
  </div>

  <div style="margin-top:auto;padding-bottom:34px">
    <div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:8px">
      ${key('7')}${key('8')}${key('9')}${key('+2.5', true)}
      ${key('4')}${key('5')}${key('6')}${key('−2.5', true)}
      ${key('1')}${key('2')}${key('3')}${key('.', true)}
      ${key('0')}${key('⌫', true)}
      <div style="grid-column:span 2;display:flex;align-items:center;justify-content:center;height:56px;border-radius:14px;background:${ACCENT}"><span class="lbl" style="color:${BG};font-size:13px;font-weight:600">Done · Start rest</span></div>
    </div>
  </div>
</div>
${foot}`;

// ---------- Timer ----------
const timer = `${head}
<div style="width:390px;height:844px;background:${BG};display:flex;flex-direction:column;padding:60px 16px 34px;box-sizing:border-box;align-items:center">
  <div style="align-self:stretch;display:flex;justify-content:space-between;padding:0 4px">
    <div class="lbl">Rest · Bench Press</div>
    <div class="lbl">Set 3 of 3</div>
  </div>

  <div style="position:relative;margin-top:64px;width:300px;height:300px">
    ${ring(300, 72, 0.58, 140, 4)}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">
      <div class="doto num" style="font-size:88px;line-height:1;letter-spacing:0.02em">1:47</div>
      <div class="lbl">of 3:00</div>
    </div>
  </div>

  <div style="display:flex;gap:10px;margin-top:40px;align-self:stretch">
    <div style="flex:1;height:56px;border-radius:14px;border:1px solid ${LINE};display:flex;align-items:center;justify-content:center"><span class="doto num" style="font-size:22px;color:${MUTE}">−30</span></div>
    <div style="flex:1;height:56px;border-radius:14px;border:1px solid ${LINE};display:flex;align-items:center;justify-content:center"><span class="doto num" style="font-size:22px;color:${MUTE}">+30</span></div>
    <div style="flex:1.4;height:56px;border-radius:14px;background:${CARD};border:1px solid ${LINE};display:flex;align-items:center;justify-content:center"><span class="lbl" style="color:${TEXT};font-size:13px">Skip</span></div>
  </div>

  <div style="margin-top:auto;align-self:stretch;padding:16px;border-radius:16px;background:${CARD};border:1px solid ${LINE};display:flex;flex-direction:column;gap:10px">
    <div class="lbl">Up next · Set 3</div>
    <div style="display:flex;align-items:baseline;gap:14px">
      <span class="doto num" style="font-size:34px">82.5</span><span class="lbl" style="color:${DIM}">kg</span>
      <span class="doto num" style="font-size:34px">12</span><span class="lbl" style="color:${DIM}">target</span>
    </div>
    <div class="lbl num" style="font-size:10px;color:${DIM}">prev 80 × 9 @ 1 · hit 12 to overload</div>
  </div>
</div>
${foot}`;

// ---------- Home ----------
const muscles = ['CHEST', 'BACK', 'QUAD', 'HAM', 'DELT', 'BI', 'TRI'];
const vols = [0.55, 0.7, 0.4, 0.3, 0.6, 0.35, 0.45]; // of 20
const home = `${head}
<div style="width:390px;height:844px;background:${BG};display:flex;flex-direction:column;padding:60px 16px 34px;box-sizing:border-box;gap:14px">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:0 4px 8px">
    <div class="doto" style="font-size:40px;line-height:1;letter-spacing:0.04em">ETHOS</div>
    <div class="lbl">Sat 06 Sep</div>
  </div>

  <div style="padding:18px 16px;border-radius:16px;background:${CARD};border:1px solid ${LINE};display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;justify-content:space-between"><span class="lbl">Today</span><span class="lbl" style="color:${DIM}">last 4 days ago</span></div>
    <div class="doto" style="font-size:32px;line-height:1">PUSH A</div>
    <div class="lbl" style="color:${MUTE}">Bench · Incline DB · Machine Press · Lateral · Pushdown</div>
    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;background:${WARN_BG};border:1px solid ${WARN_LINE}">
      <span style="width:8px;height:8px;border-radius:50%;background:${ACCENT};display:inline-block"></span>
      <span class="lbl" style="color:${ACCENT}">2 exercises ready to overload</span>
    </div>
    <div style="height:56px;border-radius:14px;background:${ACCENT};display:flex;align-items:center;justify-content:center"><span class="lbl" style="color:${BG};font-size:13px;font-weight:600">Start workout</span></div>
  </div>

  <div style="padding:16px;border-radius:16px;background:${CARD};border:1px solid ${LINE};display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;justify-content:space-between"><span class="lbl">This week · hard sets</span><span class="lbl" style="color:${GREEN}">10–20 band</span></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end">
      ${muscles.map((m, i) => `<div style="display:flex;flex-direction:column;align-items:center;gap:8px">${dotBars([vols[i]], 10, 22, 4, [5, 10])}<span class="lbl" style="font-size:9px">${m}</span></div>`).join('')}
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:2px">
    <div class="lbl" style="padding:6px 4px">Recent</div>
    ${[['PULL A', 'Tue', '58 min', '18 sets'], ['LEGS', 'Sun', '64 min', '16 sets'], ['PUSH A', 'Fri', '52 min', '17 sets']].map(([n, d, t, s]) => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid ${LINE};min-height:44px">
      <span class="doto" style="font-size:20px;flex:1">${n}</span>
      <span class="lbl" style="color:${DIM}">${d}</span>
      <span class="lbl num">${t}</span>
      <span class="lbl num">${s}</span>
    </div>`).join('')}
  </div>
</div>
${foot}`;

// ---------- Welcome (first launch) ----------
const E = ['1111111', '1111111', '1100000', '1111110', '1111110', '1100000', '1111111', '1111111'];
function mark(cell: number) {
  const w = 7 * cell, h = E.length * cell;
  let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">`;
  E.forEach((row, y) => [...row].forEach((c, x) => {
    s += `<circle cx="${cell * (x + 0.5)}" cy="${cell * (y + 0.5)}" r="${c === '1' ? cell * 0.36 : cell * 0.12}" fill="${c === '1' ? ACCENT : DIM}"></circle>`;
  }));
  return s + '</svg>';
}
const steps: [string, string, string][] = [
  ['01', 'Routines hold days', 'UL · Day A, Day B. A starter PPL is already in. Edit or delete it.'],
  ['02', 'Log without looking', 'Numpad walks kg → reps → RIR. Check completes the set, rest timer starts.'],
  ['03', 'Progress is automatic', 'Top of the rep range on every set at RIR ≥ 1, next session pre-fills the next weight.'],
  ['04', 'Timer works locked', 'Rest done fires as a notification and a buzz. Allow it when asked.'],
];
const welcome = `${head}
<div style="width:390px;height:844px;background:${BG};display:flex;flex-direction:column;padding:56px 24px 34px;box-sizing:border-box">
  ${mark(10)}
  <div class="doto" style="font-size:52px;line-height:1;margin-top:22px;letter-spacing:0.02em">ETHOS</div>
  <div class="lbl" style="margin-top:8px">Character forged through habit</div>

  <div style="display:flex;flex-direction:column;gap:0;margin-top:28px">
    ${steps.map(([n, title, body], i) => `
    <div style="display:flex;gap:16px;padding:13px 0;border-top:1px solid ${i ? LINE : 'transparent'}">
      <span class="doto num" style="font-size:18px;color:${ACCENT};width:28px;padding-top:2px">${n}</span>
      <div style="flex:1;display:flex;flex-direction:column;gap:5px">
        <span class="doto" style="font-size:17px">${title.toUpperCase()}</span>
        <span style="font-size:12px;line-height:18px;color:${MUTE}">${body}</span>
      </div>
    </div>`).join('')}
  </div>

  <div style="margin-top:auto;display:flex;flex-direction:column;gap:10px">
    <div style="height:68px;border-radius:18px;background:${ACCENT};display:flex;align-items:center;justify-content:space-between;padding:0 22px">
      <span class="doto" style="font-size:24px;color:${BG}">START</span>
      <span class="lbl" style="color:${BG}">Starter PPL · edit anytime</span>
    </div>
    <div style="border:1px dashed ${LINE};border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:center">
      <span class="lbl" style="color:${ACCENT}">Restore from a backup file</span>
    </div>
  </div>
</div>
${foot}`;
await Bun.write(`Welcome${SFX}.dc.html`, welcome);

await Bun.write(LIGHT ? 'WorkoutLight.dc.html' : 'Main.dc.html', workout);
await Bun.write(`Timer${SFX}.dc.html`, timer);
await Bun.write(`Home${SFX}.dc.html`, home);
await Bun.write('canvas.json', JSON.stringify({
  artboards: [
    { file: 'Home.dc.html', x: 0, y: 0, w: 390, h: 844, title: 'Home · dark' },
    { file: 'Main.dc.html', x: 480, y: 0, w: 390, h: 844, title: 'Active workout · dark' },
    { file: 'Timer.dc.html', x: 960, y: 0, w: 390, h: 844, title: 'Rest timer · dark' },
    { file: 'HomeLight.dc.html', x: 0, y: 1000, w: 390, h: 844, title: 'Home · light' },
    { file: 'WorkoutLight.dc.html', x: 480, y: 1000, w: 390, h: 844, title: 'Active workout · light' },
    { file: 'TimerLight.dc.html', x: 960, y: 1000, w: 390, h: 844, title: 'Rest timer · light' },
    { file: 'Welcome.dc.html', x: 1440, y: 0, w: 390, h: 844, title: 'Welcome · dark' },
    { file: 'WelcomeLight.dc.html', x: 1440, y: 1000, w: 390, h: 844, title: 'Welcome · light' },
  ],
  launch: { view: 'canvas' },
}, null, 2));
console.log('ok');
