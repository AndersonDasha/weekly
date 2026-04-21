/* ───────────── Quest · calendar app ───────────── */

const HOUR_H = 56;        // keep in sync with --hour-h in CSS
const DAY_START = 6;      // 6am
const DAY_END = 23;       // 11pm (rows: 6..22, 17 rows)
const DAYS_IN_WEEK = 7;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Date helpers ---------- */
const pad2 = (n) => String(n).padStart(2, '0');
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday = 0
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function fmtMonthDay(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function fmtHour(h) {
  const am = h < 12;
  const hr = ((h + 11) % 12) + 1;
  return `${hr} ${am ? 'AM' : 'PM'}`;
}

/* ---------- Recurring schedule template ----------
 * dows: 0=Sun … 6=Sat
 * t/e : decimal hours (9.5 = 9:30)
 * type: focus | body | mind | people | family | ritual | meal | rest
 */
const SCHEDULE_TEMPLATE = [
  // Daily rituals
  { title: 'Morning routine',     emoji: '☕', type: 'ritual', t: 7,    e: 8,    dows: [0,1,2,3,4,5,6], tag: 'ritual' },
  { title: 'Meditation',          emoji: '🧘', type: 'mind',   t: 8,    e: 8.5,  dows: [1,2,3,4,5],     tag: 'calm'   },
  { title: 'Lunch',               emoji: '🥗', type: 'meal',   t: 13,   e: 14,   dows: [0,1,2,3,4,5,6], tag: 'meal'   },
  { title: 'Dinner',              emoji: '🍲', type: 'meal',   t: 19,   e: 20,   dows: [0,1,2,3,4,5,6], tag: 'meal'   },
  { title: 'Wind down · read',    emoji: '📖', type: 'rest',   t: 22,   e: 23,   dows: [0,1,2,3,4,5,6], tag: 'rest'   },

  // Body
  { title: 'Run · 5k',            emoji: '🏃', type: 'body',   t: 6.5,  e: 7,    dows: [1,3,5], tag: 'body' },
  { title: 'Strength training',   emoji: '🏋️', type: 'body',   t: 17.5, e: 18.5, dows: [2,4],   tag: 'body' },
  { title: 'Long walk',           emoji: '🌿', type: 'body',   t: 10,   e: 11,   dows: [6],     tag: 'body' },

  // Focus blocks — goal-critical, 3–4h
  { title: 'Prep résumé & portfolio', emoji: '✍️', type: 'focus', t: 9,   e: 12.5, dows: [1],   tag: 'goal', focus: true },
  { title: 'Practice case study',     emoji: '🎤', type: 'focus', t: 9,   e: 13,   dows: [2],   tag: 'goal', focus: true },
  { title: 'Apply to 10 roles',       emoji: '🚀', type: 'focus', t: 9.5, e: 13,   dows: [3],   tag: 'goal', focus: true },
  { title: 'Portfolio case write-up', emoji: '📐', type: 'focus', t: 9,   e: 12.5, dows: [4],   tag: 'goal', focus: true },
  { title: 'Network & coffee chats',  emoji: '☕', type: 'focus', t: 10,  e: 13,   dows: [5],   tag: 'goal', focus: true },

  // People
  { title: 'Design book club',    emoji: '📚', type: 'people', t: 19.5, e: 21,   dows: [3], tag: 'friends' },
  { title: 'Friends · dinner',    emoji: '🍜', type: 'people', t: 19,   e: 21.5, dows: [5], tag: 'friends' },
  { title: 'Board game night',    emoji: '🎲', type: 'people', t: 20,   e: 22,   dows: [6], tag: 'friends' },

  // Family
  { title: 'Family brunch',       emoji: '🥞', type: 'family', t: 11,   e: 13,   dows: [0], tag: 'family' },
  { title: 'Call parents',        emoji: '📞', type: 'family', t: 18,   e: 18.5, dows: [0], tag: 'family' },
  { title: 'Siblings video call', emoji: '💬', type: 'family', t: 20,   e: 21,   dows: [2], tag: 'family' },
];

/* ---------- State ---------- */
const state = {
  today: new Date(),   // real wall clock
  cursor: new Date(),  // reference date for the visible range
  view: 'week',
};

/* ---------- Expand schedule for a given date ---------- */
function eventsFor(date) {
  const dow = date.getDay();
  return SCHEDULE_TEMPLATE
    .filter((e) => e.dows.includes(dow))
    .map((e) => ({ ...e, date: new Date(date) }));
}

/* ───────────── Renderers ───────────── */

function renderWeek(root, anchor, opts = {}) {
  const days = opts.days ?? DAYS_IN_WEEK;
  const start = opts.start ?? startOfWeek(anchor);
  const daysArr = Array.from({ length: days }, (_, i) => addDays(start, i));

  // Scaffold
  root.innerHTML = '';
  const week = document.createElement('div');
  week.className = 'week';
  week.style.setProperty('--days', days);

  // Header row
  const hdr = document.createElement('div');
  hdr.className = 'week-head';
  hdr.appendChild(headCell('', 'head-cell gutter'));
  daysArr.forEach((d) => {
    const isToday = sameDay(d, state.today);
    const cell = document.createElement('div');
    cell.className = 'head-cell head-day' + (isToday ? ' today' : '');
    const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
    cell.innerHTML = `<span class="dow">${dow}</span><span class="dnum">${d.getDate()}</span>`;
    hdr.appendChild(cell);
  });
  week.appendChild(hdr);

  // Time gutter
  const gutter = document.createElement('div');
  gutter.className = 'time-gutter';
  for (let h = DAY_START; h <= DAY_END; h++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.textContent = fmtHour(h);
    gutter.appendChild(slot);
  }
  week.appendChild(gutter);

  // Day columns
  daysArr.forEach((d) => {
    const col = document.createElement('div');
    col.className = 'hour-col';
    if (sameDay(d, state.today)) col.classList.add('today');
    for (let h = DAY_START; h <= DAY_END; h++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      col.appendChild(slot);
    }
    // Render blocks
    eventsFor(d).forEach((ev) => col.appendChild(renderBlock(ev)));
    week.appendChild(col);
  });

  root.appendChild(week);

  // Now line (only if today is visible)
  const todayInRange = daysArr.some((d) => sameDay(d, state.today));
  if (todayInRange) addNowLine(week, daysArr);
}

function headCell(html, cls) {
  const c = document.createElement('div');
  c.className = cls;
  c.innerHTML = html;
  return c;
}

function renderBlock(ev) {
  const el = document.createElement('div');
  el.className = `block ${ev.type}` + (ev.focus ? ' focus' : '');
  const top = (ev.t - DAY_START) * HOUR_H;
  const height = Math.max(28, (ev.e - ev.t) * HOUR_H - 4);
  el.style.top = `${top + 2}px`;
  el.style.height = `${height}px`;

  const timeStr = `${fmtTime(ev.t)} – ${fmtTime(ev.e)}`;
  el.innerHTML = `
    <div class="b-title"><span class="b-emoji">${ev.emoji}</span>${ev.title}</div>
    <div class="b-time">${timeStr}</div>
    ${ev.tag ? `<span class="b-tag">${ev.tag}</span>` : ''}
  `;
  return el;
}

function fmtTime(h) {
  const hr = Math.floor(h);
  const m = Math.round((h - hr) * 60);
  const am = hr < 12;
  const hh = ((hr + 11) % 12) + 1;
  return `${hh}:${pad2(m)} ${am ? 'AM' : 'PM'}`;
}

function addNowLine(weekRoot, daysArr) {
  const now = new Date();
  const hrs = now.getHours() + now.getMinutes() / 60;
  if (hrs < DAY_START || hrs > DAY_END + 1) return;
  const top =
    // header height (~60px) isn't part of column, but now-line is absolute to .week
    // easier: absolute-position inside the today column instead
    null;

  const todayIdx = daysArr.findIndex((d) => sameDay(d, state.today));
  if (todayIdx < 0) return;

  const cols = weekRoot.querySelectorAll('.hour-col');
  const col = cols[todayIdx];
  if (!col) return;
  const bar = document.createElement('div');
  bar.className = 'now-line';
  bar.style.left = '0';
  bar.style.right = '0';
  bar.style.position = 'absolute';
  bar.style.top = `${(hrs - DAY_START) * HOUR_H}px`;
  bar.innerHTML = `
    <div class="bead"></div>
    <div class="pill">${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
    <div class="bar"></div>
  `;
  col.style.position = 'relative';
  col.appendChild(bar);
}

/* ---------- Month ---------- */
function renderMonth(root, anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'month';

  const heads = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  heads.forEach((h) => {
    const el = document.createElement('div');
    el.className = 'm-head';
    el.textContent = h;
    wrap.appendChild(el);
  });

  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const inMonth = d.getMonth() === anchor.getMonth();
    const isToday = sameDay(d, state.today);
    const cell = document.createElement('div');
    cell.className = 'm-cell' + (inMonth ? '' : ' other') + (isToday ? ' today' : '');
    cell.innerHTML = `<div class="m-num">${d.getDate()}</div>`;

    const pills = document.createElement('div');
    pills.className = 'm-pills';
    const evs = eventsFor(d).filter((e) => e.focus || e.type === 'people' || e.type === 'family');
    evs.slice(0, 3).forEach((e) => {
      const p = document.createElement('div');
      p.className = 'm-pill ' + e.type + (e.focus ? ' focus' : '');
      p.textContent = `${e.emoji} ${e.title}`;
      pills.appendChild(p);
    });
    cell.appendChild(pills);
    wrap.appendChild(cell);
  }
  root.appendChild(wrap);
}

/* ---------- 12-Week ---------- */
function renderTwelve(root, anchor) {
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'twelve';

  const currentWeekIndex = 4; // week 5 of 12 → 0-indexed 4, matches progress bar

  const milestones = [
    'Audit portfolio · list target roles',
    'Refresh résumé & LinkedIn',
    'Draft 3 case studies',
    'Polish hero case · seek feedback',
    'Apply to 10 roles (week 1)',         // current
    'Practice case study presentation',
    'First mock interviews',
    'Apply to 10 roles (week 2)',
    'Whiteboard & portfolio deep-dives',
    'Apply to 10 roles (week 3) · follow-ups',
    'Negotiation prep · references',
    'Offers · pick your favourite 🎉',
  ];

  const head = document.createElement('div');
  head.className = 'twelve-head';
  head.innerHTML = `
    <div class="twelve-title">12-Week Quest</div>
    <div class="twelve-sub">a season-long sprint toward your life goal</div>
  `;
  wrap.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'twelve-grid';

  const seasonStart = addDays(startOfWeek(state.today), -currentWeekIndex * 7);

  for (let i = 0; i < 12; i++) {
    const wStart = addDays(seasonStart, i * 7);
    const wEnd = addDays(wStart, 6);
    const card = document.createElement('div');
    card.className = 'w-card' +
      (i < currentWeekIndex ? ' done' : '') +
      (i === currentWeekIndex ? ' current' : '');

    const pct = i < currentWeekIndex ? 100
              : i === currentWeekIndex ? 42
              : 0;

    card.innerHTML = `
      <div class="w-top">
        <div class="w-num">W${i + 1}</div>
        <div class="w-range">${fmtMonthDay(wStart)} – ${fmtMonthDay(wEnd)}</div>
      </div>
      <div class="w-milestone">${milestones[i]}</div>
      <div class="w-bar"><span style="width:${pct}%"></span></div>
      <div class="w-meta">${pct}% · ${i === currentWeekIndex ? 'in progress' : i < currentWeekIndex ? 'complete' : 'upcoming'}</div>
    `;
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  root.appendChild(wrap);
}

/* ---------- Range label ---------- */
function rangeLabelText() {
  const d = state.cursor;
  if (state.view === 'day') {
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }
  if (state.view === 'week') {
    const s = startOfWeek(d);
    const e = addDays(s, 6);
    const sameMonth = s.getMonth() === e.getMonth();
    return sameMonth
      ? `${s.toLocaleDateString(undefined, { month: 'long' })} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`
      : `${fmtMonthDay(s)} – ${fmtMonthDay(e)}, ${e.getFullYear()}`;
  }
  if (state.view === 'month') {
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  return `12-Week Quest`;
}

/* ---------- Dispatcher ---------- */
function render() {
  const canvas = $('#canvas');
  $('#rangeLabel').textContent = rangeLabelText();

  $$('.seg').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));

  if (state.view === 'day') {
    const dayStart = new Date(state.cursor);
    dayStart.setHours(0, 0, 0, 0);
    renderWeek(canvas, state.cursor, { days: 1, start: dayStart });
  } else if (state.view === 'week') {
    renderWeek(canvas, state.cursor);
  } else if (state.view === 'month') {
    renderMonth(canvas, state.cursor);
  } else {
    renderTwelve(canvas, state.cursor);
  }
}

/* ---------- Navigation ---------- */
function nav(dir) {
  const step = dir === 'next' ? 1 : -1;
  if (state.view === 'day')   state.cursor = addDays(state.cursor, step);
  else if (state.view === 'week') state.cursor = addDays(state.cursor, 7 * step);
  else if (state.view === 'month') {
    state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + step, 1);
  } else {
    state.cursor = addDays(state.cursor, 7 * 12 * step);
  }
  render();
}

/* ---------- AI notes (rotating stock set) ---------- */
const NOTE_SETS = [
  [
    '<strong>Your 9–1 focus block</strong> is prime case-study prep time — silence notifications.',
    'Aim for <strong>3 applications</strong> before lunch; batch follow-ups for Thursday.',
    'End the day by logging one interview question you practiced today.',
  ],
  [
    'Review the <strong>feedback from last week</strong> before tomorrow’s portfolio polish block.',
    'Draft a 30-sec self-intro; record it once and iterate.',
    'Message 2 designers on LinkedIn while your morning coffee brews.',
  ],
  [
    'Your résumé section <strong>“impact metrics”</strong> still reads vague — rewrite two bullets.',
    'Pair today’s case study practice with a 10-min walk afterward to consolidate.',
    'Sleep is part of the plan — wind-down starts at 10 PM.',
  ],
];
let noteIdx = 0;
function renderNotes() {
  const list = $('#notesList');
  list.innerHTML = NOTE_SETS[noteIdx % NOTE_SETS.length]
    .map((n) => `<li>${n}</li>`).join('');
}

/* ---------- Init ---------- */
function init() {
  // view toggles
  $$('.seg').forEach((b) => b.addEventListener('click', () => {
    state.view = b.dataset.view;
    render();
  }));

  $('#prev').addEventListener('click', () => nav('prev'));
  $('#next').addEventListener('click', () => nav('next'));
  $('#todayBtn').addEventListener('click', () => {
    state.cursor = new Date();
    render();
  });

  $('#refreshNotes').addEventListener('click', () => {
    noteIdx++;
    renderNotes();
  });

  renderNotes();
  render();

  // Keep the now-line + visible ranges fresh
  setInterval(() => {
    // re-render current view so the now-line moves with real time
    render();
  }, 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);
