const FastJson = require('../lib/FastJson');

const data = JSON.stringify({
  ireland: {
    people: [{ name: 'Alex' }, { name: 'John' }, { name: 'Cian' }],
  },
  spain: {
    people: [{ name: 'Antonio' }, { name: 'Juan' }, { name: 'Pedro' }],
  },
  'unknown.country': {
    people: [{ name: 'Frank' }, { name: 'Paul' }],
  },
});

const fastJson = new FastJson();

fastJson.on('ireland.people', (value) => {
  console.log('ireland.people ->', value);
});

fastJson.on('spain.people[1].name', (value) => {
  console.log('spain.people[1].name ->', value);
});

// Path as Array to allow keys with dots
fastJson.on(['unknown.country', 'people', '0', 'name'], (value) => {
  console.log(['unknown.country', 'people', '0', 'name'], value);
  // Stop parsing JSON usefull when have all we need improving performance
  fastJson.skip();
});

fastJson.write(data);
