const FastJson = require('../lib/FastJson');

const fastJson = new FastJson();

fastJson.on('a', (value) => {
  console.log('a ->', value);
});

fastJson.on('b.c', (value) => {
  console.log('b.c ->', value);
});

fastJson.on('c', (value) => {
  console.log('c ->', value);
});

fastJson.on('d.lol[0]', (value) => {
  console.log('d.lol[0] ->', value);
});

fastJson.write('{"a":11');
fastJson.write('1}{"b":{"c":[1,2,3]}}{"c":"h\\');
fastJson.write('ola"}{"b":{"c":[1,2');
fastJson.write(',3]}}{"d":{"lol":["');
fastJson.write('55"]}}');
