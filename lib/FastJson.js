const { EventTree } = require('./EventTree');

const OPEN_BRACE = '{'.charCodeAt(0);
const CLOSE_BRACE = '}'.charCodeAt(0);
const OPEN_BRACKET = '['.charCodeAt(0);
const CLOSE_BRACKET = ']'.charCodeAt(0);
const QUOTE = '"'.charCodeAt(0);
const SPACE = ' '.charCodeAt(0);
const NEW_LINE = '\n'.charCodeAt(0);
const CARRIAGE_RETURN = '\r'.charCodeAt(0);
const TAB = '\t'.charCodeAt(0);
const COLON = ':'.charCodeAt(0);
const COMMA = ','.charCodeAt(0);
const BACKSLASH = '\\'.charCodeAt(0);

const TYPE_ARRAY = 1;
const TYPE_OBJECT = 2;
const ROOT_KEY = '/';

class FastJson {
  /**
   * @param {Object} [options]
   */
  constructor(options) {
    this._options = options !== undefined ? options : {};

    this._stack = [];
    this._postColon = false;
    this._lastString = {};
    this._skipped = false;

    this._buffer = null;
    this._bufferOffset = 0;

    this._events = new EventTree(ROOT_KEY);
  }

  /**
   * @param {Array|String} path
   * @param {Function} listener
   */
  on(path, listener) {
    this._events.on(path, listener);
  }

  /**
   * @param {String|Buffer} data
   */
  write(data) {
    let i = 0;
    let fullData = data;

    if (this._buffer !== null) {
      fullData = FastJson._concat(this._buffer, data);
      this._buffer = null;
      i = this._bufferOffset;
    }

    for (; i < fullData.length && !this._skipped; i++) {
      let pos = i;

      switch (FastJson._get(fullData, i)) {
        case OPEN_BRACE:
          pos = this._onOpenBlock(fullData, i, TYPE_OBJECT, OPEN_BRACE, CLOSE_BRACE);
          break;
        case OPEN_BRACKET:
          pos = this._onOpenBlock(fullData, i, TYPE_ARRAY, OPEN_BRACKET, CLOSE_BRACKET);
          break;
        case CLOSE_BRACE: case CLOSE_BRACKET:
          this._onCloseBlock(fullData, i);
          break;
        case QUOTE:
          pos = this._onQuote(fullData, i);
          break;
        case TAB: case CARRIAGE_RETURN: case NEW_LINE: case SPACE:
          break;
        case COLON:
          this._postColon = true;
          break;
        case COMMA:
          this._onComma();
          break;
        default:
          pos = this._onPrimitive(fullData, i);
      }

      if (pos === -1) {
        this._buffer = fullData;
        this._bufferOffset = i;
        return;
      }

      i = pos;
    }

    if (this._skipped) {
      this._skipCleanUp();
    }
  }

  /**
   * Should only be called inside FastJson#on listeners.
   */
  skip() {
    this._skipped = true;
  }

  _skipCleanUp() {
    this._stack = [];
    this._postColon = false;
    this._skipped = false;
    this._events.reset();
    this._buffer = null;
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @param {String} type
   * @param {Number} openChar
   * @param {Number} closeChar
   * @returns {Number}
   */
  _onOpenBlock(data, index, type, openChar, closeChar) {
    const key = this._getKey(data);
    if (!this._events.hasNode(key)) {
      return FastJson._skipBlock(data, index, openChar, closeChar);
    }

    this._events.down(key);

    this._stack.push({
      // General
      type,
      start: index,
      key,

      // TYPE_ARRAY
      index: 0,
    });

    this._postColon = false;

    return index;
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   */
  _onCloseBlock(data, index) {
    const frame = this._stack.pop();
    frame.end = index;

    if (this._events.hasListener()) {
      this._events.emit(data.slice(frame.start, frame.end + 1));
    }

    this._events.up();
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   */
  _onQuote(data, index) {
    const strStart = index + 1;
    const strEnd = FastJson._parseString(data, index);
    if (strEnd === -1) {
      return -1;
    }

    this._emitPrimitiveOrString(data, strStart, strEnd);

    this._postColon = false;
    this._lastString.start = strStart;
    this._lastString.end = strEnd;

    return index + ((strEnd - strStart) + 1);
  }

  _onComma() {
    const frame = this._getFrame();
    if (frame.type === TYPE_ARRAY) {
      frame.index++;
    }
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   */
  _onPrimitive(data, index) {
    const primEnd = FastJson._parsePrimitive(data, index);
    if (primEnd === -1) {
      return -1;
    }

    this._emitPrimitiveOrString(data, index, primEnd);

    this._postColon = false;

    return index + (primEnd - index - 1);
  }

  _emitPrimitiveOrString(data, start, end) {
    const frame = this._getFrame();

    if (this._postColon) {
      const key = this._getKeyForPrimitiveObject(data);
      if (this._events.hasNode(key)) {
        this._events.down(key);

        if (this._events.hasListener()) {
          this._events.emit(data.slice(start, end));
        }

        this._events.up();
      }
    } else if (frame.type === TYPE_ARRAY) {
      const key = FastJson._getKeyForPrimitiveArray(frame);
      if (this._events.hasNode(key)) {
        this._events.down(key);

        if (this._events.hasListener()) {
          this._events.emit(data.slice(start, end));
        }

        this._events.up();
      }
    }
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @param {Number} openChar
   * @param {Number} closeChar
   * @returns {Number}
   */
  static _skipBlock(data, index, openChar, closeChar) {
    let blockDepth = 1;

    for (let i = index + 1; i < data.length; i++) {
      switch (FastJson._get(data, i)) {
        case QUOTE: {
          const strEnd = FastJson._parseString(data, i);
          if (strEnd === -1) {
            return -1;
          }

          i += strEnd - i;
          break;
        }
        case openChar:
          blockDepth++;
          break;
        case closeChar:
          blockDepth--;
          if (blockDepth === 0) {
            return i;
          }
          break;
        default:
      }
    }

    return -1;
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   */
  static _parseString(data, index) {
    for (let i = index + 1; i < data.length; i++) {
      switch (FastJson._get(data, i)) {
        case QUOTE: return i;
        case BACKSLASH: i++; break;
        default:
      }
    }

    return -1;
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   */
  static _parsePrimitive(data, index) {
    for (let i = index; i < data.length; i++) {
      switch (FastJson._get(data, i)) {
        case CLOSE_BRACKET: case CLOSE_BRACE: case COMMA:
          return i;
        default:
      }
    }

    return -1;
  }

  /**
   * @param {String|Buffer} data
   * @returns {String}
   */
  _getKey(data) {
    if (this._stack.length === 0) {
      return ROOT_KEY;
    }

    const frame = this._getFrame();
    if (frame.type === TYPE_ARRAY) {
      return FastJson._getKeyForPrimitiveArray(frame);
    }

    return this._getKeyForPrimitiveObject(data);
  }

  /**
   * @return {Object}
   */
  _getFrame() {
    return this._stack[this._stack.length - 1];
  }

  /**
   * @param {String|Buffer} data
   * @returns {String}
   */
  _getKeyForPrimitiveObject(data) {
    return FastJson._toString(data, this._lastString.start, this._lastString.end);
  }

  /**
   * @param {Object} frame
   * @returns {String}
   */
  static _getKeyForPrimitiveArray(frame) {
    return `${frame.index}`;
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   */
  static _get(data, index) {
    if (typeof data === 'string') {
      return data.charCodeAt(index);
    }

    return data[index];
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} start
   * @param {Number} end
   * @returns {String}
   */
  static _toString(data, start, end) {
    if (typeof data === 'string') {
      return data.slice(start, end);
    }

    return data.toString(undefined, start, end);
  }

  /**
   * @param {String|Buffer} data1
   * @param {String|Buffer} data1
   * @returns {String|Buffer}
   */
  static _concat(data1, data2) {
    if (typeof data1 === 'string') {
      return data1 + data2;
    }

    return Buffer.concat([data1, data2]);
  }
}

module.exports = FastJson;
