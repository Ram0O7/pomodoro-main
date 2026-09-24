import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, preferences, freshTimer, restoreTimer, secondsLeft, nextMode, localDay } from '../timer.js';
test('invalid persisted preferences cannot corrupt durations', () => {
  assert.deepEqual(preferences({focus:-1, short:NaN, long:61, sound:'false'}), defaults);
  assert.equal(preferences({focus:90}).focus, 90);
  assert.deepEqual(preferences(null), defaults);
});
test('deadline catches up after browser throttling and never becomes negative', () => {
  const timer = {...freshTimer('focus', defaults), endAt:100000};
  assert.equal(secondsLeft(timer, 39500),61);
  assert.equal(secondsLeft(timer, 99999),1);
  assert.equal(secondsLeft(timer, 100000),0);
  assert.equal(secondsLeft(timer, 200000),0);
});
test('paused session preserves its remainder independently of wall time', () => {
  assert.equal(secondsLeft({...freshTimer('focus',defaults),remaining:73},999999),73);
});
test('four completed focus sessions select a long break; skips do not', () => {
  for(let cycle=0;cycle<4;cycle++) {
    const timer=freshTimer('focus',defaults,cycle);
    assert.equal(nextMode(timer,true),cycle===3?'long':'short');
    assert.equal(nextMode(timer,false),'short');
  }
  assert.equal(nextMode(freshTimer('long',defaults),true),'focus');
});
test('restore retains an expired deadline to reconcile completion', () => {
  const timer={...freshTimer('focus',defaults),endAt:1000,id:'session'};
  assert.deepEqual(restoreTimer(timer,defaults),timer);
  for(const value of [null,{}, {...timer,remaining:-1},{...timer,cycle:5},{...timer,endAt:'bad'}]) assert.deepEqual(restoreTimer(value,defaults),freshTimer('focus',defaults));
});
test('daily history uses local calendar boundaries', () => {
  assert.equal(localDay(new Date(2026,8,24,23,59).getTime()),'2026-09-24');
});
