fast-json
===
A lightning fast on the fly **JSON parser** able to return JSON values and structures from plain JSON strings. It's much faster than JSON.parse() and doesn't require any extra memory allocation for the data processed.

## Usage
```javascript
var FastJson = require('fast-json');

var data = JSON.stringify({
  ireland: {
    people: [{ name: 'Alex' }, { name: 'John' }, { name: 'Cian' }]
  },
  spain: {
    people: [{ name: 'Antonio' }, { name: 'Juan' }, { name: 'Pedro' }]
  }
});

var fastJson = new FastJson();

fastJson.on('ireland.people[0]', (person) => {
  console.log(person); // -> '{"name":"Alex"}'
})

fastJson.write(data);
```

## Performance
JSON file *citylots.json* of **189MB** from https://github.com/zemirco/sf-city-lots-json.

* fast-json: 0.65s / 198MB RAM
* JSON.parse: 2.2s / 640MB RAM
* jsonparse: 13.7s

## TODO
* [**Improvement**] Tolerate malformed JSONs.
* [**Feature**] Cache chunks to support fragmentation (value starts in a previous chunk).
* [**Feature**] Make FastJson a Node.js Stream (is this worth it?).
* [**Feature**] Process wildcards in paths.
* [**Documentation**] Document public interface and create branch gh-pages using *jsdoc*.
* [**Documentation**] More real life testing and examples.
