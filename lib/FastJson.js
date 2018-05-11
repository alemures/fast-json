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

const TYPE_ARRAY = 'array';
const TYPE_OBJECT = 'object';

const SEP = '/';

class FastJson {
  /**
   * @param {Object} options
   */
  constructor(options) {
    this._options = options || {};

    this._stack = new Array(16);
    this._level = -1;

    this._postColon = false;
    this._lastString = null;

    this._events = new EventEmitter();
    this._subPaths = new Set([SEP]);
  }

  /**
   * @param {String} path
   * @param {Function} listener
   */
  on(path, listener) {
    const processedPath = FastJson._processPath(path);
    this._addToSubPaths(processedPath);
    this._events.on(processedPath, listener);
  }

  /**
   * @param {String|Buffer} data
   */
  write(data) {
    for (let i = 0; i < data.length; i++) {
      switch (FastJson._get(data, i)) {
        case OPEN_BRACE:
          i = this._onOpenBrace(data, i);
          break;
        case OPEN_BRACKET:
          i = this._onOpenBracket(data, i);
          break;
        case CLOSE_BRACE: case CLOSE_BRACKET:
          this._onCloseBraceOrBracket(data, i);
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
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   */
  _onOpenBrace(data, index) {
    this._level++;

    const parent = this._resolveParentKey(data);
    const path = this._resolvePath(parent);

    if (!this._subPaths.has(path)) {
      this._level--;
      return FastJson._skipBlock(data, index, OPEN_BRACE, CLOSE_BRACE);
    }

    this._stack[this._level] = {
      type: TYPE_OBJECT,
      start: index,
      parent,
      path,
    };

    this._postColon = false;

    return index;
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   */
  _onOpenBracket(data, index) {
    this._level++;

    const parent = this._resolveParentKey(data);
    const path = this._resolvePath(parent);

    if (!this._subPaths.has(path)) {
      this._level--;
      return FastJson._skipBlock(data, index, OPEN_BRACKET, CLOSE_BRACKET);
    }

    this._stack[this._level] = {
      type: TYPE_ARRAY,
      start: index,
      parent,
      path,
      index: 0,
    };

    this._postColon = false;

    return index;
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   */
  _onCloseBraceOrBracket(data, index) {
    const frame = this._stack[this._level];
    frame.end = index;

    if (this._hasListeners(frame.path)) {
      const result = data.slice(frame.start, frame.end + 1);
      this._events.emit(frame.path, result);
    }

    this._level--;
  }

  /**
   * @param {String|Buffer} data
   * @param {Number} index
   * @returns {Number}
   */
  _onQuote(data, index) {
    const frame = this._stack[this._level];
    const str = { start: index + 1, end: FastJson._parseString(data, index) };
    let path;

    if (this._postColon) {
      path = this._resolvePathForPrimitiveObject(data);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.slice(str.start, str.end));
      }
    } else if (frame.type === TYPE_ARRAY) {
      path = this._resolvePathForPrimitiveArray();

      if (this._hasListeners(path)) {
        this._events.emit(path, data.slice(str.start, str.end));
      }
    }

    this._postColon = false;
    this._lastString = str;

    return index + ((str.end - str.start) + 1);
  }

  _onComma() {
    const frame = this._stack[this._level];
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
    const frame = this._stack[this._level];
    const primEnd = FastJson._parsePrimitive(data, index);
    let path;

    if (this._postColon) {
      path = this._resolvePathForPrimitiveObject(data);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.slice(index, primEnd));
      }
    } else if (frame.type === TYPE_ARRAY) {
      path = this._resolvePathForPrimitiveArray();

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
   */
  static _skipBlock(data, index, openChar, closeChar) {
    let blockDepth = 1;
    let strEnd;

    for (let i = index + 1; ;i++) {
      switch (FastJson._get(data, i)) {
        case QUOTE:
          strEnd = FastJson._parseString(data, i);
          i += strEnd - i;
          break;
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
  _resolveParentKey(data) {
    if (this._level === 0) {
      return SEP;
    }

    const parentType = this._stack[this._level - 1].type;
    if (parentType === TYPE_ARRAY) {
      return this._stack[this._level - 1].index;
    }

    return FastJson._toString(data, this._lastString.start, this._lastString.end);
  }

  /**
   * @param {String} parentKey
   * @returns {String}
   */
  _resolvePath(parentKey) {
    if (this._level === 0) {
      return SEP;
    } else if (this._level === 1) {
      return `${SEP}${parentKey}`;
    }

    return `${this._stack[this._level - 1].path}${SEP}${parentKey}`;
  }

  /**
   * @param {String} processedPath
   * @returns {Boolean}
   */
  _hasListeners(processedPath) {
    return this._events.listenerCount(processedPath) > 0;
  }

  /**
   * @param {String|Buffer} data
   * @returns {String}
   */
  _resolvePathForPrimitiveObject(data) {
    if (this._level === 0) {
      return `${SEP}${FastJson._toString(data, this._lastString.start, this._lastString.end)}`;
    }

    return `${this._stack[this._level].path}${SEP}${
      FastJson._toString(data, this._lastString.start, this._lastString.end)}`;
  }

  /**
   * @returns {String}
   */
  _resolvePathForPrimitiveArray() {
    if (this._level === 0) {
      return `${SEP}${this._stack[this._level].index}`;
    }

    return `${this._stack[this._level].path}${SEP}${this._stack[this._level].index}`;
  }

  /**
   * @param {String} processedPath
   */
  _addToSubPaths(processedPath) {
    let aux = '';
    const tokens = processedPath.split(SEP);

    for (let i = 1; i < tokens.length; i++) {
      aux += `${SEP}${tokens[i]}`;
      this._subPaths.add(aux);
    }
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
   * @param {String} path
   * @returns {String}
   */
  static _processPath(path) {
    if (!path) {
      return SEP;
    }

    let newPath = path.replace(/[.[]/g, SEP);
    newPath = newPath.replace(/\]/g, '');
    return newPath[0] !== SEP ? `${SEP}${newPath}` : newPath;
  }
}

module.exports = FastJson;
