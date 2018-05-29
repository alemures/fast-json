const fs = require('fs');

const FastJson = require('../lib/FastJson');

const fastJson = new FastJson();

fastJson.on('features[293].geometry.coordinates[0][0]', (jsonText) => {
  console.log('fast-json result:', jsonText);
});

const file = fs.readFileSync(`${__dirname}/json/citylots.json`).toString();

fastJson._events.tree.expandNodes();
console.log(fastJson._events.tree.toString());

console.time('fast-json time');

fastJson.write(file);

console.timeEnd('fast-json time');

console.time('JSON.parse() time');

// Huge amount of RAM used
const object = JSON.parse(file);
console.log('JSON.parse() result:', object.features[293].geometry.coordinates[0][0]);

console.timeEnd('JSON.parse() time');
