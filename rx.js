const assert = require('assert');
const EventEmitter = require('events');

const {
	Observable
} = require('rxjs');

const ee = new EventEmitter();
const ee$ = Observable.fromEvent(ee, 'a');

ee.on('a', () => null);
ee$.subscribe();
ee$.subscribe();
ee$.subscribe();

assert.equal(ee._events.a.length, 4);

const ee2 = new EventEmitter();
const ee2$ = Observable.fromEvent(ee2, 'a')
	.share();

ee2.on('a', () => null);
ee2$.subscribe();
ee2$.subscribe();
ee2$.subscribe();

assert.equal(ee2._events.a.length, 2);
