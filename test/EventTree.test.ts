import { ROOT_KEY } from '../src/constants';
import { EventTree } from '../src/EventTree';
import { FastJsonPath } from '../src/types';

describe('EventTree', () => {
  describe('constructor', () => {
    it('should create an EventTree instance', () => {
      expect(new EventTree(ROOT_KEY)).toBeInstanceOf(EventTree);
    });
  });

  describe('on', () => {
    const pathArr = ['a', 'b', '5', 'c'];
    it.each([
      ['a.b[5].c', undefined],
      [pathArr, undefined],
      ['a#b#5#c', '#'],
    ])(
      'should add listener to path %s and separator "%s"',
      (path: FastJsonPath, separator) => {
        const eventTree = new EventTree(ROOT_KEY, separator);
        eventTree.on(path, jest.fn());
        pathArr.forEach((key) => {
          eventTree.down(key);
        });
        expect(eventTree.hasListener()).toBe(true);
      }
    );
  });

  describe('down', () => {
    it("should throw when name doesn't exist on the tree", () => {
      const eventTree = new EventTree(ROOT_KEY);
      eventTree.on('a.b', jest.fn());
      expect(() => {
        eventTree.down('a');
      }).not.toThrow();
      expect(() => {
        eventTree.down('c');
      }).toThrow();
    });
  });
});
