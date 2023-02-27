import * as index from '../src/index';

describe('test index file', () => {
  type exportedFunction = keyof typeof index;
  it.each([['FastJson' as exportedFunction]])(
    'should export a %p function',
    (functionName) => {
      expect(index[functionName]).toBeInstanceOf(Function);
    }
  );
});
