# fast-json

A lightning fast on the fly **JSON parser** able to return JSON values and structures from plain JSON as `String` or `Buffer`. It's much faster than JSON.parse() and doesn't require any extra memory allocation for the data processed.

## Install

```
npm install fast-json
```

## Usage

```javascript
const { FastJson } = require('fast-json');

const data = JSON.stringify({
  ireland: {
    people: [{ name: 'Alex' }, { name: 'John' }, { name: 'Cian' }],
  },
  spain: {
    people: [{ name: 'Antonio' }, { name: 'Juan' }, { name: 'Pedro' }],
  },
});

const fastJson = new FastJson();

// Path is a string representing a javascript object path
fastJson.on('ireland.people', (value) => {
  console.log('ireland.people ->', value);
});

// Paths can be also an array of keys
fastJson.on(['spain', 'people', '1', 'name'], (value) => {
  console.log(['spain', 'people', '1', 'name'], '->', value);
});

// Wildcards can be used to match all items in object or array
fastJson.on('spain.people[*].name', (value) => {
  console.log('spain.people[*].name ->', value);
});

fastJson.on('*.people[*].name', (value) => {
  console.log('*.people[*].name ->', value);
});

fastJson.write(data);
// The JSON can be string or Buffer
// fastJson.write(Buffer.from(data))
```

```javascript
fastJson.on('ireland.people[1].name', (value) => {
  console.log('ireland.people[1].name ->', value);
  // Once we have all we need, we can skip the rest of the JSON to improve performance.
  fastJson.skip();
});
```

```javascript
// Path separator defines the keys separator on the listeners
const fastJson = new FastJson({ pathSeparator: '/' });

// In this case it allows keys having dots by using a different separator
fastJson.on('unknown.country/people/0/name', (value) => {
  console.log('unknown.country/people/0/name ->', value);
});
```

## Performance

JSON file _citylots.json_ of **189MB** from https://github.com/zemirco/sf-city-lots-json.

- **fast-json: 0.56s / 198MB RAM**
- JSON.parse: 1.8s / 640MB RAM
- jsonparse: 15.0s / 1,100MB RAM (Only reading, it wasn't able to return a value)

## TODO

- [**Feature**] Allow chunked JSON.
- [**Feature**] Match more glob patters.
- [**Feature**] Add more flexibility to event listeners (on, once, off, etc).
- [**Documentation**] Create branch gh-pages using _jsdoc_.
- [**Documentation**] More real life testing and examples.
