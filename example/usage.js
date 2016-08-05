'use strict';

var FastJson = require('../lib/FastJson');

var data = JSON.stringify({
  ireland: {
    people: [{ name: 'Alex' }, { name: 'John' }, { name: 'Cian' }]
  },
  spain: {
    people: [{ name: 'Antonio' }, { name: 'Juan' }, { name: 'Pedro' }]
  }
});

var stream = new FastJson('ireland.people[0]');

// JSON.parse() inside only for the 'path' result if it matches
stream.onJson = function (jsonObject) {
  console.log(typeof jsonObject, jsonObject);
};

// Only returns json as string so better performance
stream.onText = function (jsonText) {
  console.log(typeof jsonText, jsonText);
};

stream.write(data);
