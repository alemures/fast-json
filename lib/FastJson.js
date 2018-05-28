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
const SEP = '/';

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

    this._events = new EventTree(SEP);
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
    for (let i = 0; i < data.length && !this._skipped; i++) {
      switch (FastJson._get(data, i)) {
        case OPEN_BRACE:
          i = this._onOpenBlock(data, i, TYPE_OBJECT, OPEN_BRACE, CLOSE_BRACE);
          break;
        case OPEN_BRACKET:
          i = this._onOpenBlock(data, i, TYPE_ARRAY, OPEN_BRACKET, CLOSE_BRACKET);
          break;
        case CLOSE_BRACE: case CLOSE_BRACKET:
          this._onCloseBlock(data, i);
          break;
        case QUOTE:
          i = this._onQuote(data, i);
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
          i = this._onPrimitive(data, i);
      }
    }

    if (this._skipped) {
      this._skipCleanUp();
    }
  }

  skip() {
    this._skipped = true;
  }

  _skipCleanUp() {
    this._stack = [];
    this._postColon = false;
    this._skipped = false;
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
    const frame = this._getFrame();
    const strStart = index + 1;
    const strEnd = FastJson._parseString(data, index);

    if (this._postColon) {
      const key = this._getKeyForPrimitiveObject(data);
      if (this._events.hasNode(key)) {
        this._events.down(key);

        if (this._events.hasListener()) {
          this._events.emit(data.slice(strStart, strEnd));
        }

        this._events.up();
      }
    } else if (frame.type === TYPE_ARRAY) {
      const key = FastJson._getKeyForPrimitiveArray(frame);
      if (this._events.hasNode(key)) {
        this._events.down(key);

        if (this._events.hasListener()) {
          this._events.emit(data.slice(strStart, strEnd));
        }

        this._events.up();
      }
    }

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
    const frame = this._getFrame();
    const primEnd = FastJson._parsePrimitive(data, index);

    if (this._postColon) {
      const key = this._getKeyForPrimitiveObject(data);
      if (this._events.hasNode(key)) {
        this._events.down(key);

        if (this._events.hasListener()) {
          this._events.emit(data.slice(index, primEnd));
        }

        this._events.up();
      }
    } else if (frame.type === TYPE_ARRAY) {
      const key = FastJson._getKeyForPrimitiveArray(frame);
      if (this._events.hasNode(key)) {
        this._events.down(key);

        if (this._events.hasListener()) {
          this._events.emit(data.slice(index, primEnd));
        }

        this._events.up();
      }
    }

    this._postColon = false;

    return index + (primEnd - index - 1);
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
    let i = index + 1;

    for (; blockDepth > 0; i++) {
      switch (FastJson._get(data, i)) {
        case QUOTE: {
          const strEnd = FastJson._parseString(data, i);
          i += strEnd - i;
          break;
        }
        case openChar:
          blockDepth++;
          break;
        case closeChar:
          blockDepth--;
          break;
        default:
      }
    }

    return i - 1;
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   */
  static _parseString(data, index) {
    for (let i = index + 1; ;i++) {
      switch (FastJson._get(data, i)) {
        case QUOTE: return i;
        case BACKSLASH: i++; break;
        default:
      }
    }
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   */
  static _parsePrimitive(data, index) {
    for (let i = index; ;i++) {
      switch (FastJson._get(data, i)) {
        case CLOSE_BRACKET: case CLOSE_BRACE: case COMMA:
          return i;
        default:
      }
    }
  }

  /**
   * @param {String|Buffer} data
   * @returns {String}
   */
  _getKey(data) {
    if (this._stack.length === 0) {
      return SEP;
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
}

module.exports = FastJson;
