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
  }

  on(path, listener) {
    this._events.on(this._processPath(path), listener);
  }

  write(data) {
    for (var i = 0; i < data.length; i++) {
      switch (data[i]) {
        case '{':
          this._onOpenBrace(data, i);
          break;
        case '[':
          this._onOpenBracket(data, i);
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
    this._stack[this._level] = {
      type: 'object',
      start: index,
      parent: parent,
      path: this._resolvePath(parent)
    };

    this._postColon = false;
  }

  _onOpenBracket(data, index) {
    this._level++;

    var parent = this._resolveParentKey(data);
    this._stack[this._level] = {
      type: 'array',
      start: index,
      parent: parent,
      path: this._resolvePath(parent),
      index: 0
    };

    this._postColon = false;
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
    var str = this._parseString(data, index);
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
    var prim = this._parsePrimitive(data, index);
    var path;

    if (this._postColon) {
      path = this._resolvePathForPrimitiveObject(data);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.substring(prim.start, prim.end));
      }
    }

    if (frame.type === 'array') {
      path = this._resolvePathForPrimitiveArray(data);

      if (this._hasListeners(path)) {
        this._events.emit(path, data.substring(prim.start, prim.end));
      }
    }

    this._postColon = false;

    return index + (prim.end - prim.start - 1);
  }

  _parseString(data, start) {
    var i = ++start;
    while (data[i] !== '"' || data[i - 1] === '\\') {
      i++;
    }

    return { start: start, end: i };
  }

  _parsePrimitive(data, start) {
    var i = start;
    while (data[i] !== ']' && data[i] !== '}' && data[i] !== ',') {
      i++;
    }

    return { start: start, end: i };
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
    return this._events._events[processedPath] !== undefined;
  }

  _resolvePathForPrimitiveObject(data) {
    return this._stack[this._level].path + '/' +
        data.substring(this._lastString.start, this._lastString.end);
  }

  _resolvePathForPrimitiveArray(data) {
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
}

module.exports = FastJson;
