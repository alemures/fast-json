fast-json
===
A fast json stream parser.

## Usage
```
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

// JSON.parse() inside only for the 'path' result if it matches
stream.onJson = function (jsonObject) {
  console.log(typeof jsonObject, jsonObject);
};

// Only returns json as string so better performance
stream.onText = function (jsonText) {
  console.log(typeof jsonText, jsonText);
};

stream.write(data);
```

## Performance
JSON file *citylots.json* of **189MB** from https://github.com/zemirco/sf-city-lots-json.

* fast-json: 1.4s / 198MB RAM
* JSON.parse: 2.2s / 640MB RAM
* jsonparse: 13.7s

## TODO
* [**Performance**] Skip JSON sections that will never match the path.
* [**Feature**] Cache chunks to support fragmentation (value starts in a previous chunk)
* [**Feature**] Make FastJson a Node.js Stream (is this worth it?).
* [**Feature**] Multiple paths per FastJson instance.
* [**Feature**] Process wildcards in paths.
* [**Documentation**] Document public interface and create branch gh-pages using *jsdoc*.
* [**Documentation**] More real life testing and examples.
