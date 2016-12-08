'use strict';

const EventEmitter = require('events');

class FastJson {
  constructor(options) {
    this._options = options || {};

    this._stack = [];
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
      switch (data[i]) {
        case '{':
          i = this._onOpenBrace(data, i);
          break;
        case '[':
          i = this._onOpenBracket(data, i);
          break;
        case '}': case ']':
          this._onCloseBraceOrBracket(data, i);
          break;
        case '"':
          i = this._onQuote(data, i);
          break;
        case '\t' : case '\r' : case '\n' : case ' ':
          break;
        case ':':
          this._postColon = true;
          break;
        case ',':
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
      return this._skipBlock(data, index, '{', '}');
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
      return this._skipBlock(data, index, '[', ']');
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
      if (data[index] === '"') {
        var strEnd = this._parseString(data, index);
        index += strEnd - index;
      } else if (data[index] === openChar) {
        blockDepth++;
      } else if (data[index] === closeChar) {
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
    while (data[index] !== '"' || (data[index - 1] === '\\' && data[index - 2] !== '\\')) {
      index++;
    }

    return index;
  }

  _parsePrimitive(data, index) {
    while (data[index] !== ']' && data[index] !== '}' && data[index] !== ',') {
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
