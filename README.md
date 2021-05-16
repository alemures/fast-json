fast-json
===
A lightning fast on the fly **JSON parser** able to return JSON values and structures from plain JSON as `String` or `Buffer`. It's much faster than JSON.parse() and doesn't require any extra memory allocation for the data processed.

## Install
```
npm install fast-json
```

## Usage
```javascript
const FastJson = require('fast-json');

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

fastJson.on('spain.people[*].name', (value) => {
  console.log('spain.people[*].name ->', value);
});

fastJson.on('*.people[*].name', (value) => {
  console.log('*.people[*].name ->', value);
});

fastJson.write(data);
// or
fastJson.write(Buffer.from(data));
```

## Performance
JSON file *citylots.json* of **189MB** from https://github.com/zemirco/sf-city-lots-json.

* **fast-json: 0.56s / 198MB RAM**
* JSON.parse: 1.8s / 640MB RAM
* jsonparse: 15.0s / 1,100MB RAM (Only reading, it wasn't able to return a value)

## TODO
* [**Feature**] Allow chunked JSON.
* [**Feature**] Match more glob patters.
* [**Feature**] Add more flexibility to event listeners (on, once, off, etc).
* [**Documentation**] Create branch gh-pages using *jsdoc*.
* [**Documentation**] More real life testing and examples.
