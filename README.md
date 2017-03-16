# fibonacci-backoff-interval
Fibonacci Backoff Interval with Promise Support

#### Example Usage

```javascript

const Promise = require('bluebird');
const backoff = require('backoff');

let ctx = backoff((ctx) => {
  let value = Math.random();
  let doAsync = Math.random() < 0.5;
  return doAsync
    ? Promise.resolve(value)
    : value;
});

assert(ctx.status() === 'initial');

// auto started on next tick
setTimeout(() => {
  assert(ctx.status() === 'running');
}, 1);

ctx.on('resolved', (value, ctx) => {
  console.log('resolved: ', value);
});

ctx.on('rejected', (err, ctx) => {
  console.error('rejected: ', err);
});

ctx.on('started', (ctx) => {
  assert(ctx.status() === 'running');
  console.log('started');
});

ctx.on('stopped', (ctx) => {
  assert(ctx.status() === 'stopped');
  console.log('stopped');
});



```
