const { FastJson } = require('../dist/index');

const data = JSON.stringify({
  'unknown.country': {
    people: [{ name: 'Frank' }, { name: 'Paul' }],
  },
});

// Path separator defines the keys separator on the listeners
const fastJson = new FastJson({ pathSeparator: '/' });

// In this case it allows keys having dots by using a different separator
fastJson.on('unknown.country/people/0/name', (value) => {
  console.log('unknown.country/people/0/name ->', value);
});

fastJson.write(data);
