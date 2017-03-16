'use strict';

const { expect, assert } = require('chai');
const sinon = require('sinon');
const Promise = require('bluebird');
const debug = require('debug')('test');

const backoff = require('../');

describe('module', function () {
  it ('is just a function', function () {
    assert.isFunction(backoff);
  });
})

describe('schema', function () {

  it ('is frozen', function () {
    let instance = backoff(() => {}, { start: false });
    expect(instance).to.be.frozen;
  });

  describe ('methods', function () {

    let instance = backoff(() => {}, { start: false });
    ([
      'stop',
      'start',
      'status',
      'backoff',
      'reset',
      'on',
    ]).forEach(method => {
      it (method, () => {
        assert.isFunction(instance[method], `has method "${method}"`);
      });
    });
  });

});

describe('fibonacci-backoff-interval', function () {

  it ('starts immediately by default', function () {
    let spy = sinon.spy(ctx => ctx.stop());
    let ctx = backoff(spy);
    return Promise.delay(150)
      .then(() => {
        assert(spy.calledOnce, 'is called once');
      });
  });

  it ('prevents from running immediately', function () {
    let spy = sinon.spy();
    let ctx = backoff(spy, { start: false });
    return Promise.delay(150)
      .then(() => {
        assert(spy.notCalled, 'is not called');
      });
  });

  it ('no backoff when function finishes successfully', function () {
    let spy = sinon.spy(() => { debug('spy called'); });
    let ctx = backoff(spy);
    return Promise.delay(150)
      .then(() => {
        debug('assert: called once');
        assert(spy.calledOnce, 'called once');
      })
      .delay(100)
      .then(() => {
        debug('assert: called twice');
        assert(spy.calledTwice, 'called twice');
      })
      .delay(100)
      .then(() => {
        debug('assert: called thrice');
        assert(spy.calledThrice, 'called thrice');
        debug('stop');
        ctx.stop();
      })
      .delay(250)
      .then(() => {
        debug('assert: not called again after stop called');
        assert(spy.calledThrice, 'not called again after stop called');
      });
  });

  it ('fibonacci backoff if when errors thrown', function () {
    this.timeout(10000);
    let spy = sinon.spy(() => {
      debug('spy called... throwing');
      throw new Error('do backoff');
    });
    let ctx = backoff(spy);

    let delays = [100, 200, 300, 500, 800, 1300];

    return delays.reduce((promise, delay, index) => {
      return promise.then(() => {
        let iteration = index + 1;
        debug(`assert -- iteration: ${iteration}, delay: ${delay}`);
        assert(spy.callCount === iteration, `called ${iteration} times`);
      })
      .delay(delay);
    }, Promise.delay(150))
    .then(() => {
      debug('stop');
      ctx.stop();
    })
    .then(() => {
      debug('assert: not called again after stop called');
      expect(spy.callCount).to.be.eql(delays.length + 1);
    });
  });

});

describe ('backoff listeners', function () {

  it ('listen for "rejected"', function () {
    let spy = sinon.spy();
    let error = new Error('Reject');
    let ctx = backoff(() => { throw error; });
    ctx.on('rejected', spy);

    return Promise.delay(150)
      .then(() => {
        debug('assert: called with error and ctx just one time');
        assert(spy.calledOnce, 'called once');
        assert(spy.calledWithExactly(error, ctx), 'called with error and ctx as arguements');
        ctx.stop();
      });
  });

  it ('listen for "resolved"', function () {
    let spy = sinon.spy();
    let obj = Math.random();
    let ctx = backoff(() => obj);
    ctx.on('resolved', spy);

    return Promise.delay(150)
      .then(() => {
        debug('assert: called with return value and ctx just one time');
        assert(spy.calledOnce, 'called once');
        assert(spy.calledWithExactly(obj, ctx), 'called with return value and ctx as arguements');
        ctx.stop();
      });
  });

});

describe ('status', function () {

  it ('method returning status string', function () {
    let ctx = backoff(() => {}, { start: false });

    debug('status === "initial"');
    expect(ctx.status()).to.be.eql('initial');

    ctx.start();
    debug('status === "running"');
    expect(ctx.status()).to.be.eql('running');

    return Promise.delay(250)
      .then(() => {
        debug('status === "running"');
        expect(ctx.status()).to.be.eql('running');
      })
      .then(() => {
        ctx.stop();
        debug('status === "stopped"');
        expect(ctx.status()).to.be.eql('stopped');
      })
      .delay(250)
      .then(() => {
        debug('status === "stopped"');
        expect(ctx.status()).to.be.eql('stopped');
      });
  });
});
