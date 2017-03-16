'use strict';

let debug = require('debug')('fibonacci');
let Promise = require('bluebird');
let backoff = require('backoff');
let EventEmitter = require('events');

const DEFAULT_MAX_DELAY = 10000;
const DEFAULT_MIN_DELAY = 100;

const symstr = (sym) => sym.toString().match(/Symbol\((\w+)\)/)[1];

exports = module.exports = function fibonacciBackoffInterval(fn, options = {}) {

  let cycle = 0;
  let status = Symbol('initial');
  const RUNNING = Symbol('running');
  const STOPPED = Symbol('stopped');

  const emitter = new EventEmitter();
  const theFunctionToCall = Promise.method(fn);
  const manager = backoff.fibonacci({
    maxDelay: options.max || DEFAULT_MAX_DELAY,
    initialDelay: options.min || DEFAULT_MIN_DELAY,
  });

  const ctx = {};
  ctx.status = () => symstr(status);
  ctx.start = function start() {
    debug('start');
    if (status === RUNNING) {
      return;
    }
    debug('starting');
    status = RUNNING;
    emitter.emit('started', ctx);
    manager.backoff();
    return ctx;
  };

  ctx.stop = function stop() {
    debug('stop');
    status = STOPPED;
    emitter.emit('stopped', ctx);
    return ctx;
  };

  ctx.backoff = function backoff() {
    if (status === RUNNING) {
      debug('next -> backoff');
      manager.backoff();
      emitter.emit('backoff', ctx);
    } else {
      debug('next -> do nothing');
    }
    return ctx;
  };

  ctx.reset = function reset() {
    manager.reset();
    emitter.emit('reset', ctx);
    return ctx;
  };

  ctx.on = function on(name, fn) {
    emitter.on(name, fn);
    return ctx;
  };


  manager.on('backoff', (number, delay) => {
    debug('backoff: ', { cycle, number, delay });
  });

  manager.on('ready', (number, delay) => {
    if (status !== RUNNING) return;

    ++cycle;

    debug('ready: ', { cycle, number, delay });

    theFunctionToCall(ctx)
    .then(
      (obj) => {
        emitter.emit('resolved', obj, ctx);
        if (options.manual === true) return;
        ctx.reset();
        ctx.backoff();
      },
      (err) => {
        emitter.emit('rejected', err, ctx);
        if (options.manual === true) return;
        ctx.backoff();
      }
    );
  });

  // start  it!
  if (options.start !== false) process.nextTick(() => ctx.start());

  return Object.freeze(ctx);
};
