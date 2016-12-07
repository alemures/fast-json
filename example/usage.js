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

// Only returns json as string
stream.onData = function (jsonText) {
  console.log(jsonText);
};

stream.write(data);
