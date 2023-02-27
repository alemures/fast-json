const { FastJson } = require('../dist/index');

const data = JSON.stringify({
  ireland: {
    people: [{ name: 'Alex' }, { name: 'John' }, { name: 'Cian' }],
  },
  spain: {
    people: [{ name: 'Antonio' }, { name: 'Juan' }, { name: 'Pedro' }],
  },
});

const fastJson = new FastJson();

fastJson.on('ireland.people[1].name', (value) => {
  console.log('ireland.people[1].name ->', value);
  // Once we have all we need, we can skip the rest of the JSON to improve performance.
  fastJson.skip();
});

fastJson.write(data);
