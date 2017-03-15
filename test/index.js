'use strict';

const { expect, assert } = require('chai');
const sinon = require('sinon');
const Promise = require('bluebird');

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
    return Promise.delay(100)
      .then(() => {
        assert(spy.calledOnce);
      });
  });

  it ('prevents from running immediately', function () {
    let spy = sinon.spy();
    let ctx = backoff(spy, { start: false });
    return Promise.delay(100)
      .then(() => {
        assert(spy.notCalled);
      });
  });

});
