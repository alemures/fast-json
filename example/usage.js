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

var fastJson = new FastJson();

fastJson.on('ireland.people[0]', (jsonText) => {
  console.log(jsonText);
});

fastJson.write(data);