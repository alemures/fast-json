const fs = require('fs');

const FastJson = require('../lib/FastJson');

const fastJson = new FastJson();

fastJson.on('tortilla', (jsonText) => {
  // console.log('fast-json result:', jsonText);
});

const file = fs.readFileSync(`${__dirname}/json/citylots.json`).toString();

const fileChunks = stringChunk(file, 1e+7);

console.log(fileChunks.length, 'chunks')

console.time('fast-json time');

fileChunks.forEach((chunk) => {
  console.log('writting', chunk.length);
  fastJson.write(chunk);
});
// fastJson.write(file);

console.timeEnd('fast-json time');

function stringChunk(string, chunkSize) {
  var size = string.length;
  var tempArray = new Array(Math.ceil(size / chunkSize));

  for (var i = 0, j = 0; j < size; j += chunkSize, i++) {
    tempArray[i] = string.substring(j, j + chunkSize);
  }

  return tempArray;
}
