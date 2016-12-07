'use strict';

var fs = require('fs');

var FastJson = require('../lib/FastJson');

var stream = new FastJson();

stream.on('features[293].geometry.coordinates[0][0]', (jsonText) => {
  console.log('fast-json result:', jsonText);
});

var file = fs.readFileSync(__dirname + '/json/citylots.json').toString();

console.time('fast-json time');

stream.write(file);

console.timeEnd('fast-json time');

console.time('JSON.parse() time');

// Huge amount of RAM used
var object = JSON.parse(file);
console.log('JSON.parse() result:', object.features[293].geometry.coordinates[0][0]);

console.timeEnd('JSON.parse() time');
