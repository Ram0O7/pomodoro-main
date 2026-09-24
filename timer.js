export const defaults = { focus: 25, short: 5, long: 15, sound: true, alerts: false };
export function preferences(value = {}) {
  const result = { ...defaults };
  for (const mode of ['focus', 'short', 'long']) {
    if (Number.isInteger(value?.[mode]) && value[mode] >= 1 && value[mode] <= (mode === 'focus' ? 180 : 60)) result[mode] = value[mode];
  }
  for (const key of ['sound', 'alerts']) if (typeof value?.[key] === 'boolean') result[key] = value[key];
  return result;
}
export function freshTimer(mode, settings, cycle = 0) {
  return { mode, remaining: settings[mode] * 60, duration: settings[mode] * 60, endAt: null, cycle, id: null };
}
export function restoreTimer(value, settings) {
  if (!value || !['focus', 'short', 'long'].includes(value.mode) || !Number.isFinite(value.duration) || value.duration < 60 || value.duration > 10800 || !Number.isFinite(value.remaining) || value.remaining < 0 || value.remaining > value.duration || !Number.isInteger(value.cycle) || value.cycle < 0 || value.cycle > 3 || (value.endAt !== null && (!Number.isFinite(value.endAt) || typeof value.id !== 'string'))) return freshTimer('focus', settings);
  return value;
}
export function secondsLeft(timer, now = Date.now()) {
  return timer.endAt === null ? timer.remaining : Math.max(0, Math.ceil((timer.endAt - now) / 1000));
}
export function nextMode(timer, completed) {
  return timer.mode === 'focus' ? ((timer.cycle + (completed ? 1 : 0)) % 4 === 0 && completed ? 'long' : 'short') : 'focus';
}
export function localDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
