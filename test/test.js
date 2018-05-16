const { expect } = require('chai');

const FastJson = require('../index');

describe('FastJson', () => {
  describe('constructor', () => {
    it('should create an FastJson instance', () => {
      expect(new FastJson()).to.be.instanceOf(FastJson);
    });
  });

  describe('write', () => {
    it('should return primitives', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a', (value) => {
        expect(value).to.be.equal('1');
        nMatches++;
      });
      fastJson.on('b', (value) => {
        expect(value).to.be.equal('hello');
        nMatches++;
      });
      fastJson.on('c', (value) => {
        expect(value).to.be.equal('true');
        nMatches++;
      });
      fastJson.on('d', (value) => {
        expect(value).to.be.equal('null');
        nMatches++;
      });
      fastJson.on('e', (value) => {
        expect(value).to.be.equal('1.2323');
        nMatches++;
      });

      fastJson.write(JSON.stringify({
        a: 1, b: 'hello', c: true, d: null, e: 1.2323,
      }));
      expect(nMatches).to.be.equal(5);
    });

    it('should return arrays and objects', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a', (value) => {
        expect(value).to.be.equal('{"c":1}');
        nMatches++;
      });
      fastJson.on('b', (value) => {
        expect(value).to.be.equal('[1,2,3]');
        nMatches++;
      });

      fastJson.write(JSON.stringify({ a: { c: 1 }, b: [1, 2, 3] }));
      expect(nMatches).to.be.equal(2);
    });

    it('should\'t return anything', () => {
      const fastJson = new FastJson();
      fastJson.on('a', () => {
        expect(true).to.be.equal(false);
      });

      fastJson.write(JSON.stringify({ b: 1 }));
    });

    it('should return inner values', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a.a[0].a', (value) => {
        expect(value).to.be.equal('5');
        nMatches++;
      });
      fastJson.on('a.a[1]', (value) => {
        expect(value).to.be.equal('null');
        nMatches++;
      });
      fastJson.on('a.a[3][0]', (value) => {
        expect(value).to.be.equal('10');
        nMatches++;
      });
      fastJson.on('b.a.a.a', (value) => {
        expect(value).to.be.equal('null');
        nMatches++;
      });

      fastJson.write(JSON.stringify({
        a: { a: [{ a: 5 }, null, true, [10]] },
        b: { a: { a: { a: null } } },
      }));
      expect(nMatches).to.be.equal(4);
    });

    it('should return values from a top level array', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('[0]', (value) => {
        expect(value).to.be.equal('1');
        nMatches++;
      });
      fastJson.on('[2][0]', (value) => {
        expect(value).to.be.equal('3');
        nMatches++;
      });

      fastJson.write(JSON.stringify([1, 2, [3]]));
      expect(nMatches).to.be.equal(2);
    });

    it('should handle escaped strings', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a.a', (value) => {
        expect(value).to.be.equal('\\\\\\"\\\\');
        nMatches++;
      });

      fastJson.write(JSON.stringify({
        a: { a: '\\"\\' },
        b: { a: ']}' },
        c: { a: '{[' },
      }));

      expect(nMatches).to.be.equal(1);
    });

    it('should process Buffer instances', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('a', (value) => {
        expect(value).to.be.deep.equal(Buffer.from('1'));
        nMatches++;
      });

      fastJson.on('b[0].c', (value) => {
        expect(value).to.be.deep.equal(Buffer.from('{"d":5}'));
        nMatches++;
      });

      fastJson.write(Buffer.from(JSON.stringify({
        a: 1,
        b: [{ c: { d: 5 } }],
      })));

      expect(nMatches).to.be.equal(2);
    });

    it('should return the whole object', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('', (value) => {
        expect(value).to.be.equal('{"a":true,"b":"string","c":25}');
        nMatches++;
      });

      fastJson.write(JSON.stringify({
        a: true,
        b: 'string',
        c: 25,
      }));

      expect(nMatches).to.be.equal(1);
    });
  });

  describe('skip', () => {
    it('should skip actual written json', () => {
      const fastJson = new FastJson();
      let nMatches = 0;

      fastJson.on('[0]', (value) => {
        expect(value).to.be.equal('1');
        nMatches++;
      });

      fastJson.on('[1]', (value) => {
        expect(value).to.be.equal('2');
        nMatches++;
        fastJson.skip();
      });

      fastJson.on('[2]', () => {
        expect(true).to.be.equal(false);
      });

      fastJson.write(JSON.stringify([1, 2, 3]));
      expect(nMatches).to.be.equal(2);
    });
  });
});
