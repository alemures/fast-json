/**
 * Compares the current implementation with an old FastJson version.
 */

const Benchmark = require('benchmark');
const { FastJson } = require('../dist/index');
const OldFastJson = require('./FastJson');

const suite = new Benchmark.Suite();

write(suite);

suite
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', () => {
    console.log(`Fastest is ${suite.filter('fastest').map('name')}`);
  })
  .run({ async: true });

function write(suite) {
  const data = JSON.stringify({
    ireland: {
      people: [
        { name: 'Alex', age: 32, single: false },
        { name: 'John', age: 32, single: true },
        { name: 'Cian', age: 35, single: false },
      ],
    },
    spain: {
      people: [
        { name: 'Antonio', age: 22, single: false },
        { name: 'Juan', age: 11, single: false },
        { name: 'Pedro', age: 32, single: true },
      ],
    },
  });

  const path = 'spain.people[2].single';
  const fastJson = new FastJson();
  const oldFastJson = new OldFastJson();

  fastJson.on(path, (value) => {});
  oldFastJson.on(path, (value) => {});

  suite
    .add('FastJson.write develop', () => {
      fastJson.write(data);
    })
    .add('FastJson.write old', () => {
      oldFastJson.write(data);
    });
}
