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

fastJson.on('ireland.people[0]', (value) => {
  console.log('ireland.people[0] ->', value);
});

fastJson.on('spain', (value) => {
  console.log('spain ->', value);
});

fastJson.on('ireland.people', (value) => {
  console.log('ireland.people ->', value);
});

fastJson.on('spain.people[1].name', (value) => {
  console.log('spain.people[1].name ->', value);
});

// wildcard for each property name
fastJson.on('spain.people[1].*', (value) => {
  console.log('spain.people[1].* ->', value);
});

// wildcard for property of each array element
fastJson.on('spain.people[*].name', (value) => {
  console.log('spain.people[*].name ->', value.toString());
});

// wildcard for each array element
fastJson.on('spain.people[*]', (value) => {
  console.log('spain.people[*] ->', value);
});

// emit event when whole doc parsed
fastJson.on('', (value) => {
  console.log('whole doc ->', value);
});

fastJson.write(data);
