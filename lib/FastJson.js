'use strict';

const EventEmitter = require('events');

var OPEN_BRACE = '{'.charCodeAt(0);
var CLOSE_BRACE = '}'.charCodeAt(0);
var OPEN_BRACKET = '['.charCodeAt(0);
var CLOSE_BRACKET = ']'.charCodeAt(0);
var QUOTE = '"'.charCodeAt(0);
var SPACE = ' '.charCodeAt(0);
var NEW_LINE = '\n'.charCodeAt(0);
var CARRIAGE_RETURN = '\r'.charCodeAt(0);
var TAB = '\t'.charCodeAt(0);
var COLON =  ':'.charCodeAt(0);
var COMMA = ','.charCodeAt(0);
var BACKSLASH = '\\'.charCodeAt(0);

class FastJson {
  constructor(options) {
    this._options = options || {};

    this._stack = new Array(16);
    this._level = -1;

    this._postColon = false;
    this._lastString = null;

    this._events = new EventEmitter();
    this._paths = new Set();
    this._subPaths = new Set(['/']);
  }

  on(path, listener) {
    var processedPath = this._processPath(path);
    this._paths.add(processedPath);
    this._addToSubPaths(processedPath);
    this._events.on(processedPath, listener);
  }

  write(data) {
    for (var i = 0; i < data.length; i++) {
      switch (data.charCodeAt(i)) {
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
        case TAB : case CARRIAGE_RETURN : case NEW_LINE : case SPACE:
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

  _onOpenBrace(data, index) {
    this._level++;

    var parent = this._resolveParentKey(data);
    var path = this._resolvePath(parent);

    if (!this._subPaths.has(path)) {
      this._level--;
      return this._skipBlock(data, index, OPEN_BRACE, CLOSE_BRACE);
    }

    this._stack[this._level] = {
      type: 'object',
      start: index,
      parent: parent,
      path: path
    };

    this._postColon = false;

    return index;
  }

  _onOpenBracket(data, index) {
    this._level++;

    var parent = this._resolveParentKey(data);
    var path = this._resolvePath(parent);

    if (!this._subPaths.has(path)) {
      this._level--;
      return this._skipBlock(data, index, OPEN_BRACKET, CLOSE_BRACKET);
    }

    this._stack[this._level] = {
      type: 'array',
      start: index,
      parent: parent,
      path: path,
      index: 0
    };

    this._postColon = false;

    return index;
  }

  _onCloseBraceOrBracket(data, index) {
    var frame = this._stack[this._level];
    frame.end = index;

    if (this._hasListeners(frame.path)) {
      var text = data.substring(frame.start, frame.end + 1);
      this._events.emit(frame.path, text);
    }

    this._level--;
  }

  _onQuote(data, index) {
    var frame = this._stack[this._level];
    var str = { start: index + 1, end: this._parseString(data, index) };
    var path;

    if (this._postColon) {
      path = this._resolvePathForPrimitiveObject(data);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.substring(str.start, str.end));
      }
    }

    if (frame.type === 'array') {
      path = this._resolvePathForPrimitiveArray(data);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.substring(str.start, str.end));
      }
    }

    this._postColon = false;
    this._lastString = str;

    return index + (str.end - str.start + 1);
  }

  _onComma() {
    var frame = this._stack[this._level];
    if (frame.type === 'array') {
      frame.index++;
    }
  }

  _onPrimitive(data, index) {
    var frame = this._stack[this._level];
    var primEnd = this._parsePrimitive(data, index);
    var path;

    if (this._postColon) {
      path = this._resolvePathForPrimitiveObject(data);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.substring(index, primEnd));
      }
    }

    if (frame.type === 'array') {
      path = this._resolvePathForPrimitiveArray(data);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.substring(index, primEnd));
      }
    }

    this._postColon = false;

    return index + (primEnd - index - 1);
  }

  _skipBlock(data, index, openChar, closeChar) {
    var blockDepth = 1;
    index++;

    while (index < data.length) {
      if (data.charCodeAt(index) === QUOTE) {
        var strEnd = this._parseString(data, index);
        index += strEnd - index;
      } else if (data.charCodeAt(index) === openChar) {
        blockDepth++;
      } else if (data.charCodeAt(index) === closeChar) {
        blockDepth--;
      }

      if (blockDepth === 0) {
        break;
      }

      index++;
    }

    return index;
  }

  _parseString(data, index) {
    index++;
    while (data.charCodeAt(index) !== QUOTE || (data.charCodeAt(index - 1) === BACKSLASH &&
        data.charCodeAt(index - 2) !== BACKSLASH)) {
      index++;
    }

    return index;
  }

  _parsePrimitive(data, index) {
    while (data.charCodeAt(index) !== CLOSE_BRACKET && data.charCodeAt(index) !== CLOSE_BRACE &&
        data.charCodeAt(index) !== COMMA) {
      index++;
    }

    return index;
  }

  _resolveParentKey(data) {
    if (this._level <= 0) {
      return '/';
    }

    var parentType = this._stack[this._level - 1].type;

    if (parentType === 'array') {
      return this._stack[this._level - 1].index;
    }

    if (parentType === 'object') {
      return data.substring(this._lastString.start, this._lastString.end);
    }
  }

  _resolvePath(parentKey) {
    if (this._level === 0) {
      return parentKey;
    } else if (this._level === 1) {
      return this._stack[this._level - 1].path + parentKey;
    }

    return this._stack[this._level - 1].path + '/' + parentKey;
  }

  _hasListeners(processedPath) {
    return this._paths.has(processedPath);
  }

  _resolvePathForPrimitiveObject(data) {
    if (this._level === 0) {
      return this._stack[this._level].path +
        data.substring(this._lastString.start, this._lastString.end);
    }

    return this._stack[this._level].path + '/' +
        data.substring(this._lastString.start, this._lastString.end);
  }

  _resolvePathForPrimitiveArray(data) {
    if (this._level === 0) {
      return this._stack[this._level].path + this._stack[this._level].index;
    }

    return this._stack[this._level].path + '/' + this._stack[this._level].index;
  }

  _processPath(path) {
    if (!path) {
      return '/';
    }

    path = path.replace(/[\.\[]/g, '/');
    path = path.replace(/\]/g, '');
    return path[0] !== '/' ? '/' + path : path;
  }

  _addToSubPaths(processedPath) {
    var aux = '';
    var tokens = processedPath.split('/');

    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i]) {
        aux += '/' + tokens[i];
        this._subPaths.add(aux);
      }
    }
  }
}

module.exports = FastJson;
