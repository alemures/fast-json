const FastJson = require('../lib/FastJson');

const data = JSON.stringify({
  ireland: {
    people: [{ name: 'Alex' }, { name: 'John' }, { name: 'Cian' }],
  },
  spain: {
    people: [{ name: 'Antonio' }, { name: 'Juan' }, { name: 'Pedro' }],
  },
});

const fastJson = new FastJson();

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

fastJson.on('spain.people[*].name', (value) => {
  console.log('spain.people[*].name ->', value);
});

fastJson.on('*.people[*].name', (value) => {
  console.log('*.people[*].name ->', value);
});

console.log(fastJson._events.tree.toString());

fastJson.write(data);
