import { preferences, freshTimer, restoreTimer, secondsLeft, nextMode, localDay } from './timer.js';
const $ = (selector) => document.querySelector(selector);
const KEY = 'still-workspace-v1';
let storageWarning = false;
function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
let saved = read();
let settings = preferences(saved.settings);
let timer = restoreTimer(saved.timer, settings);
let history = Array.isArray(saved.history) ? saved.history.filter(x => x && typeof x.id === 'string' && Number.isFinite(x.at) && Number.isFinite(x.minutes) && x.minutes > 0).slice(-500) : [];
let intention = typeof saved.intention === 'string' ? saved.intention.slice(0, 120) : '';
let registration, installPrompt, audioContext, toastTimeout;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').hidden = true, 6000); }
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ settings, timer, history, intention })); }
  catch { if (!storageWarning) { storageWarning = true; toast('Storage is unavailable. Your session will last until this page closes.'); } }
}
function loadShared() {
  const latest = read();
  if (!latest.timer) return;
  settings = preferences(latest.settings);
  timer = restoreTimer(latest.timer, settings);
  history = Array.isArray(latest.history) ? latest.history.filter(x => x && typeof x.id === 'string' && Number.isFinite(x.at) && Number.isFinite(x.minutes) && x.minutes > 0).slice(-500) : [];
  intention = typeof latest.intention === 'string' ? latest.intention.slice(0,120) : '';
  $('#intention').value = intention;
}
// Web Locks serialize transitions between tabs; storage events synchronize their views.
async function change(action) {
  const run = async () => { if (!storageWarning) loadShared(); await action(); persist(); render(); };
  if (navigator.locks) await navigator.locks.request('still-timer', run); else await run();
}
const labels = { focus: 'focus', short: 'short break', long: 'long break' };
function render() {
  const remaining = secondsLeft(timer);
  const display = `${String(Math.floor(remaining / 60)).padStart(2,'0')}:${String(remaining % 60).padStart(2,'0')}`;
  $('#time').textContent = display;
  document.title = timer.endAt ? `${display} · ${labels[timer.mode]} — Still` : 'Still — Make room for focus';
  $('#progress').style.strokeDashoffset = 100 * (1 - remaining / timer.duration);
  $('#toggle').textContent = timer.endAt ? 'Ⅱ   Pause session' : `${remaining < timer.duration ? '▶   Resume' : '▶   Start'} ${labels[timer.mode]}`;
  $('#timer-caption').textContent = timer.mode !== 'focus' ? 'MAKE SPACE TO RECHARGE' : timer.endAt ? 'ONE THING AT A TIME' : 'TIME TO SETTLE IN';
  $('#timer-hint').textContent = timer.endAt ? `Until ${new Date(timer.endAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : remaining < timer.duration ? 'Take your time. We’ll be here.' : 'A fresh start awaits';
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === timer.mode)));
  $('#cycle-dots').innerHTML = Array.from({length:4}, (_, i) => `<i class="${i < timer.cycle ? 'done' : ''}"></i>`).join('');
  $('#cycle-label').textContent = `Session ${timer.cycle + 1} of 4 · then a long break`;
  const today = history.filter(item => localDay(item.at) === localDay());
  $('#session-count').textContent = today.length;
  $('#focus-minutes').innerHTML = `${Math.round(today.reduce((sum, item) => sum + item.minutes, 0))}<span>m</span>`;
  $('#goal-progress').style.width = `${Math.min(100, today.length / 4 * 100)}%`;
  $('#goal-label').textContent = today.length ? `${today.length} of 4 daily sessions${today.length >= 4 ? ' · Look at you go.' : ' · A little progress adds up.'}` : 'A fresh page. Your first session is waiting.';
}
function unlockAudio() {
  if (!settings.sound) return;
  try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume().catch(() => {}); } catch { /* Sound is optional. */ }
}
function chime() {
  if (!settings.sound || !audioContext || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
  oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(.08, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + 1);
  oscillator.start(); oscillator.stop(audioContext.currentTime + 1);
}
function supportedNotifications() { return window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator && 'ServiceWorkerRegistration' in window && 'showNotification' in ServiceWorkerRegistration.prototype; }
async function notify(title, body, tag) {
  if (!supportedNotifications() || Notification.permission !== 'granted' || !settings.alerts) return;
  try {
    if (!registration?.active) { toast('Notifications are not ready yet. Your session is saved.'); return; }
    await registration.showNotification(title, { body, tag, icon: new URL('./images/icons/icon-192.png', location.href).href, badge: new URL('./images/icons/badge.png', location.href).href, data: { url: new URL('./', location.href).href }, silent: !settings.sound });
  } catch { toast('Your browser could not show the notification. Check system notification settings.'); }
}
let finishing = false;
async function tick() {
  render();
  if (timer.endAt === null || secondsLeft(timer) > 0 || finishing) return;
  finishing = true;
  try {
    await change(async () => {
      if (timer.endAt === null || secondsLeft(timer) > 0) return;
      const completed = { ...timer };
      const next = nextMode(timer, true);
      if (timer.mode === 'focus' && !history.some(item => item.id === timer.id)) history.push({id:timer.id, at:timer.endAt, minutes:timer.duration / 60});
      history = history.slice(-500);
      timer = freshTimer(next, settings, completed.mode === 'focus' ? (completed.cycle + 1) % 4 : completed.cycle);
      // Commit before the asynchronous notification, so reload cannot complete it twice.
      persist();
      const message = completed.mode === 'focus' ? `Time for a ${labels[next]}. You earned it.` : 'Ready for a fresh focus session?';
      toast(message); chime();
      await notify(completed.mode === 'focus' ? 'A little progress. Well done.' : 'Welcome back to your focus.', message, `still-${completed.id}`);
    });
  } finally { finishing = false; }
}
$('#toggle').onclick = () => { unlockAudio(); change(() => {
  if (timer.endAt !== null) { timer.remaining = secondsLeft(timer); timer.endAt = null; }
  else { if (timer.remaining === 0) timer = freshTimer(timer.mode, settings, timer.cycle); timer.id ||= crypto.randomUUID(); timer.endAt = Date.now() + timer.remaining * 1000; }
}); };
$('#reset').onclick = () => change(() => { timer = freshTimer(timer.mode, settings, timer.cycle); toast('A clean slate. Timer reset.'); });
$('#skip').onclick = () => change(() => { timer = freshTimer(nextMode(timer, false), settings, timer.cycle); toast('Moved to the next session. Skipped focus isn’t counted.'); });
for (const button of document.querySelectorAll('[data-mode]')) button.onclick = () => change(() => { if (button.dataset.mode !== timer.mode) timer = freshTimer(button.dataset.mode, settings, timer.cycle); });
$('#intention').value = intention;
$('#intention').addEventListener('change', () => { const value = $('#intention').value; change(() => { intention = value; }); });
document.addEventListener('keydown', event => { if (event.code === 'Space' && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey && !['INPUT','TEXTAREA','BUTTON','SELECT','A'].includes(event.target.tagName) && !document.querySelector('dialog[open]')) { event.preventDefault(); $('#toggle').click(); } });
$('#settings-open').onclick = () => { const form = $('#settings-form'); for (const name of ['focus','short','long']) form.elements[name].value = settings[name]; form.elements.sound.checked = settings.sound; form.elements.alerts.checked = settings.alerts; $('#settings').showModal(); };
$('#settings-close').onclick = () => $('#settings').close();
$('#settings-form').onsubmit = event => { event.preventDefault(); const form = event.target; change(() => {
  settings = preferences({ focus: +form.elements.focus.value, short: +form.elements.short.value, long: +form.elements.long.value, sound: form.elements.sound.checked, alerts: form.elements.alerts.checked });
  if (timer.endAt === null && timer.remaining === timer.duration) timer = freshTimer(timer.mode, settings, timer.cycle);
  $('#settings').close(); notificationUI(); toast('Your rhythm, saved.');
}); };
function notificationUI() {
  const button = $('#notifications');
  let message;
  if (!supportedNotifications()) { message = 'Notifications need a supported browser and HTTPS. On iPhone or iPad, add Still to your Home Screen first.'; button.textContent = 'Notifications unavailable'; button.disabled = true; }
  else if (Notification.permission === 'denied') { message = 'Notifications are blocked. You can allow them in your browser’s site settings.'; button.textContent = 'Blocked in browser settings'; button.disabled = true; }
  else if (Notification.permission === 'granted') { message = settings.alerts ? 'Notifications are on. We’ll nudge you when a session ends.' : 'Notifications are paused. Enable them when you’re ready.'; button.textContent = settings.alerts ? 'Turn off notifications' : 'Enable notifications'; button.disabled = false; }
  else { message = 'Get a notification when it’s time to take a breath.'; button.textContent = 'Enable notifications ↗'; button.disabled = false; }
  $('#notification-status').textContent = message;
  $('#test-notification').hidden = !supportedNotifications() || Notification.permission !== 'granted' || !settings.alerts;
}
$('#notifications').onclick = async () => {
  if (!supportedNotifications()) return;
  // Permission must be requested directly from this user gesture, before awaiting SW readiness.
  try {
    const requesting = Notification.permission === 'default';
    const permission = requesting ? await Notification.requestPermission() : Notification.permission;
    if (permission === 'granted') await change(() => { settings.alerts = requesting ? true : !settings.alerts; });
    notificationUI();
  } catch { toast('Notification permission could not be requested. Try your browser’s site settings.'); }
};
$('#test-notification').onclick = () => notify('A gentle nudge from Still.', 'You’re all set. This is how your session reminders will arrive.', 'still-test');
function connectionUI() { $('#connection').textContent = navigator.onLine ? '● Online' : '● Offline'; }
window.addEventListener('online', connectionUI); window.addEventListener('offline', connectionUI);
window.addEventListener('storage', event => { if (event.key === KEY) { loadShared(); render(); notificationUI(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); notificationUI(); } });
window.addEventListener('pageshow', () => tick());
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
function installedUI() { $('#install').hidden = true; $('#install-copy').textContent = 'Installed. Your own little corner for focus.'; }
window.addEventListener('appinstalled', installedUI);
$('#install').onclick = async () => { if (!installPrompt) { $('#install-help').showModal(); return; } try { await installPrompt.prompt(); await installPrompt.userChoice; } finally { installPrompt = null; } };
$('#install-close').onclick = () => $('#install-help').close();
if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) installedUI();
let refreshing = false;
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshing) location.reload(); });
  navigator.serviceWorker.register('./serviceWorker.js').then(async reg => {
    registration = reg;
    const offerUpdate = () => { if (reg.waiting && navigator.serviceWorker.controller) $('#update-banner').hidden = false; };
    offerUpdate();
    reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offerUpdate(); }); });
    $('#update').onclick = () => { if (reg.waiting) { refreshing = true; reg.waiting.postMessage({type:'SKIP_WAITING'}); } };
    await navigator.serviceWorker.ready;
    $('#install-copy').textContent = 'Ready for offline focus. Install Still for a dedicated window.';
    if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) installedUI();
  }).catch(() => { $('#install-copy').textContent = 'Offline setup failed. Reconnect and reload to try again.'; toast('Offline setup failed. The timer still works in this tab.'); });
}
$('#date-label').textContent = new Date().toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'}).toUpperCase();
notificationUI(); connectionUI(); render(); tick(); setInterval(tick, 500);
