import { FastJson } from '../src/FastJson';

describe('FastJson', () => {
  describe('constructor', () => {
    it('should create an FastJson instance', () => {
      expect(new FastJson()).toBeInstanceOf(FastJson);
    });

    it('should set a custom path separator', () => {
      const fastJson = new FastJson({ pathSeparator: '/' });
      const fn = jest.fn();

      fastJson.on('user/first.name', fn);

      fastJson.write(
        JSON.stringify({
          user: {
            'first.name': 'Alejandro',
            'last.name': 'Santiago',
          },
        })
      );

      expect(fn).toHaveBeenCalledWith('Alejandro');
    });
  });

  describe('write/on', () => {
    it('should return primitives', () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('a', fn);
      fastJson.on('b', fn);
      fastJson.on('c', fn);
      fastJson.on('d', fn);

      fastJson.write(
        JSON.stringify({
          a: 1,
          b: true,
          c: null,
          d: 1.2323,
        })
      );

      expect(fn).toHaveBeenNthCalledWith(1, '1');
      expect(fn).toHaveBeenNthCalledWith(2, 'true');
      expect(fn).toHaveBeenNthCalledWith(3, 'null');
      expect(fn).toHaveBeenNthCalledWith(4, '1.2323');
    });

    it('should return strings', () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('a', fn);

      fastJson.write(
        JSON.stringify({
          a: 'hello world!',
        })
      );

      expect(fn).toHaveBeenCalledWith('hello world!');
    });

    it('should return arrays and objects', () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('a', fn);
      fastJson.on('b', fn);

      fastJson.write(JSON.stringify({ a: { c: 1 }, b: [1, 2, 3] }));

      expect(fn).toHaveBeenNthCalledWith(1, '{"c":1}');
      expect(fn).toHaveBeenNthCalledWith(2, '[1,2,3]');
    });

    it("should't return anything", () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('a', fn);

      fastJson.write(JSON.stringify({ b: { a: { c: 1 } } }));

      expect(fn).not.toHaveBeenCalled();
    });

    it('should return full JSON for empty path', () => {
      const fastJson = new FastJson();
      const jsonString = JSON.stringify({ b: 1 });
      const fn = jest.fn();

      fastJson.on('', fn);
      fastJson.on([], fn);

      fastJson.write(jsonString);

      expect(fn).toHaveBeenNthCalledWith(1, jsonString);
      expect(fn).toHaveBeenNthCalledWith(2, jsonString);
    });

    it('should return inner values', () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('a.a[0].a', fn);
      fastJson.on('a.a[1]', fn);
      fastJson.on('a.a[3][0]', fn);
      fastJson.on('b.a.a.a', fn);

      fastJson.write(
        JSON.stringify({
          a: { a: [{ a: 5 }, null, true, [10]] },
          b: { a: { a: { a: null } } },
        })
      );

      expect(fn).toHaveBeenNthCalledWith(1, '5');
      expect(fn).toHaveBeenNthCalledWith(2, 'null');
      expect(fn).toHaveBeenNthCalledWith(3, '10');
      expect(fn).toHaveBeenNthCalledWith(4, 'null');
    });

    it('should return values from a top level array', () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('[0]', fn);
      fastJson.on('[2][0]', fn);

      fastJson.write(JSON.stringify([1, 2, [3]]));

      expect(fn).toHaveBeenNthCalledWith(1, '1');
      expect(fn).toHaveBeenNthCalledWith(2, '3');
    });

    it('should process Buffer instances', () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('a', fn);
      fastJson.on('b[0].c', fn);

      fastJson.write(
        Buffer.from(
          JSON.stringify({
            a: 1,
            b: [{ c: { d: 5 } }],
          })
        )
      );

      expect(fn).toHaveBeenNthCalledWith(1, Buffer.from('1'));
      expect(fn).toHaveBeenNthCalledWith(2, Buffer.from('{"d":5}'));
    });

    it('should return all values in an array', () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('aa[*]', fn);

      fastJson.write(JSON.stringify({ aa: [{ a: 0 }, { a: 1 }, { a: 2 }] }));

      expect(fn).toHaveBeenNthCalledWith(1, '{"a":0}');
      expect(fn).toHaveBeenNthCalledWith(2, '{"a":1}');
      expect(fn).toHaveBeenNthCalledWith(3, '{"a":2}');
    });

    it('should return all values in an object', () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('aa.*', fn);

      fastJson.write(JSON.stringify({ aa: { a: 0, b: 1, c: 2 } }));

      expect(fn).toHaveBeenNthCalledWith(1, '0');
      expect(fn).toHaveBeenNthCalledWith(2, '1');
      expect(fn).toHaveBeenNthCalledWith(3, '2');
    });
  });

  describe('skip', () => {
    it('should skip actual written json', () => {
      const fastJson = new FastJson();
      const fn1 = jest.fn();
      const fn2 = jest.fn(() => fastJson.skip());
      const fn3 = jest.fn();

      fastJson.on('[0]', fn1);
      fastJson.on('[1]', fn2);
      fastJson.on('[2]', fn3);

      fastJson.write(JSON.stringify([1, 2, 3]));

      expect(fn1).toHaveBeenCalledWith('1');
      expect(fn2).toHaveBeenCalledWith('2');
      expect(fn3).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle escaped strings', () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('a.a', fn);

      fastJson.write(
        JSON.stringify({
          a: { a: '\\"\\' },
          b: { a: ']}' },
          c: { a: '{[' },
        })
      );

      expect(fn).toHaveBeenCalledWith('\\\\\\"\\\\');
    });

    it('should return primitives ignoring special characters around', () => {
      const fastJson = new FastJson();
      const fn = jest.fn();

      fastJson.on('a', fn);
      fastJson.on('b', fn);
      fastJson.on('c', fn);
      fastJson.on('d', fn);

      fastJson.write('{"a": 1 }');
      fastJson.write('{"b":\rtrue\r}');
      fastJson.write('{"c":\tnull\t}');
      fastJson.write('{"d":\n1.2323\n}');

      expect(fn).toHaveBeenNthCalledWith(1, '1');
      expect(fn).toHaveBeenNthCalledWith(2, 'true');
      expect(fn).toHaveBeenNthCalledWith(3, 'null');
      expect(fn).toHaveBeenNthCalledWith(4, '1.2323');
    });
  });
});
