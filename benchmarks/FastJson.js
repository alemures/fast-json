// Commit d44a0fab68a06fbc2dd76e51c011689342df1a91

const EventEmitter = require('events');

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
   * @param {Object} [options] The fast-json configuration object.
   */
  constructor(options) {
    this._options = options || {};

    this._stack = [];
    this._postColon = false;
    this._lastString = {};
    this._skipped = false;

    this._events = new EventEmitter();
    this._subPaths = new Set([SEP]);
  }

  /**
   * Adds a listener function for the provided path.
   * @param {Array|String} path The JSON path to get values.
   * @param {FastJson~jsonListener} listener The function called after finding the JSON path.
   */
  on(path, listener) {
    const normPath = FastJson._normalizePath(path);
    this._addToSubPaths(normPath);
    this._events.on(normPath, listener);
  }

  /**
   * Start processing JSON using the defined paths in {@link FastJson#on} method.
   * @param {String|Buffer} data The JSON to process.
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

  /**
   * Stop processing the last JSON provided in the {@link FastJson#write} method.
   */
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
   * @private
   */
  _onOpenBlock(data, index, type, openChar, closeChar) {
    const path = this._resolvePath(data);
    if (!this._subPaths.has(path)) {
      return FastJson._skipBlock(data, index, openChar, closeChar);
    }

    this._stack.push({
      // General
      type,
      start: index,
      path,

      // TYPE_ARRAY
      index: 0,
    });

    this._postColon = false;

    return index;
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @private
   */
  _onCloseBlock(data, index) {
    const frame = this._stack.pop();
    frame.end = index;

    if (this._hasListeners(frame.path)) {
      this._events.emit(frame.path, data.slice(frame.start, frame.end + 1));
    }
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   * @private
   */
  _onQuote(data, index) {
    const frame = this._getFrame();
    const strStart = index + 1;
    const strEnd = FastJson._parseString(data, index);

    if (this._postColon) {
      const path = this._resolvePathForPrimitiveObject(data, frame);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.slice(strStart, strEnd));
      }
    } else if (frame.type === TYPE_ARRAY) {
      const path = FastJson._resolvePathForPrimitiveArray(frame);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.slice(strStart, strEnd));
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
   * @private
   */
  _onPrimitive(data, index) {
    const frame = this._getFrame();
    const primEnd = FastJson._parsePrimitive(data, index);

    if (this._postColon) {
      const path = this._resolvePathForPrimitiveObject(data, frame);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.slice(index, primEnd));
      }
    } else if (frame.type === TYPE_ARRAY) {
      const path = FastJson._resolvePathForPrimitiveArray(frame);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.slice(index, primEnd));
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
   * @private
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
   * @private
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
   * @private
   */
  static _parsePrimitive(data, index) {
    for (let i = index; ;i++) {
      switch (FastJson._get(data, i)) {
        case CLOSE_BRACKET: case CLOSE_BRACE: case COMMA:
        case TAB: case CARRIAGE_RETURN: case NEW_LINE: case SPACE:
          return i;
        default:
      }
    }
  }

  /**
   * @param {String|Buffer} data
   * @param {Object} frame
   * @returns {String}
   * @private
   */
  _getParentKey(data, frame) {
    if (frame.type === TYPE_ARRAY) {
      return frame.index;
    }

    return FastJson._toString(data, this._lastString.start, this._lastString.end);
  }

  /**
   * @param {String|Buffer} data
   * @returns {String}
   * @private
   */
  _resolvePath(data) {
    if (this._stack.length === 0) {
      return SEP;
    }

    const frame = this._getFrame();
    return `${frame.path}${this._getParentKey(data, frame)}${SEP}`;
  }

  /**
   * @return {Object}
   * @private
   */
  _getFrame() {
    return this._stack[this._stack.length - 1];
  }

  /**
   * @param {String} path
   * @returns {Boolean}
   * @private
   */
  _hasListeners(path) {
    return this._events.listenerCount(path) > 0;
  }

  /**
   * @param {String|Buffer} data
   * @param {Object} frame
   * @returns {String}
   * @private
   */
  _resolvePathForPrimitiveObject(data, frame) {
    return `${frame.path}${
      FastJson._toString(data, this._lastString.start, this._lastString.end)}${SEP}`;
  }

  /**
   * @param {Object} frame
   * @returns {String}
   * @private
   */
  static _resolvePathForPrimitiveArray(frame) {
    return `${frame.path}${frame.index}${SEP}`;
  }

  /**
   * @param {String} path
   * @private
   */
  _addToSubPaths(path) {
    let subPath = SEP;
    const tokens = path.split(SEP);

    for (let i = 1; i < tokens.length - 1; i++) {
      subPath += `${tokens[i]}${SEP}`;
      this._subPaths.add(subPath);
    }
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   * @private
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
   * @private
   */
  static _toString(data, start, end) {
    if (typeof data === 'string') {
      return data.slice(start, end);
    }

    return data.toString(undefined, start, end);
  }

  /**
   * @param {Array|String} origPath
   * @returns {String}
   * @private
   */
  static _normalizePath(origPath) {
    if (Array.isArray(origPath)) {
      return `${SEP}${origPath.join(SEP)}${SEP}`;
    }

    let path = origPath.replace(/[.[]/g, SEP);
    path = path.replace(/\]/g, '') + SEP;
    return !path.startsWith(SEP) ? `${SEP}${path}` : path;
  }
}

module.exports = FastJson;

/**
 * @callback FastJson~jsonListener
 * @param {String|Buffer} value The found value type will depend of the type used in
 *   {@link FastJson#write}.
 */
