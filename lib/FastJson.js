'use strict';

class FastJson {
  constructor(path, options) {
    this._path = this._processPath(path);
    this._options = options || {};

    this._stack = [];
    this._level = -1;

    this._postColon = false;
    this._lastString = null;

    this.onText = null;
    this.onJson = null;
  }

  write(chunk) {
    var prim;
    var str;
    var parent;

    for (var i = 0; i < chunk.length; i++) {
      switch (chunk[i]) {
        case '{':
          parent = this._getParentKey(chunk);
          this._stack[++this._level] = {
            type: 'object',
            start: i,
            parent: parent,
            path: this._level ? this._stack[this._level - 1].path + '.' + parent : parent
          };
          this._postColon = false;
          break;
        case '[':
          parent = this._getParentKey(chunk);
          this._stack[++this._level] = {
            type: 'array',
            start: i,
            parent: parent,
            path: this._level ? this._stack[this._level - 1].path + '.' + parent : parent,
            index: 0
          };
          this._postColon = false;
          break;
        case '}': case ']':
          this._stack[this._level].end = i;

          if (this._path === this._stack[this._level].path) {
            var text = chunk.substring(this._stack[this._level].start,
                this._stack[this._level].end + 1);

            if (this.onText) {
              this.onText(text);
            }

            if (this.onJson) {
              this.onJson(JSON.parse(text));
            }
          }

          this._level--;
          break;
        case '"':
          str = this._parseString(chunk, i);
          i += str.end - str.start + 1;

          if (this._postColon) {
            if (this._path === this._getPathForPrimitiveObject(chunk)) {
              if (this.onText) {
                this.onText(chunk.substring(str.start, str.end));
              }
            }
          }

          if (this._stack[this._level].type === 'array') {
            if (this._path === this._getPathForPrimitiveArray(chunk)) {
              if (this.onText) {
                this.onText(chunk.substring(str.start, str.end));
              }
            }
          }

          this._postColon = false;
          this._lastString = str;
          break;
        case '\t' : case '\r' : case '\n' : case ' ':
          break;
        case ':':
          this._postColon = true;
          break;
        case ',':
          if (this._stack[this._level].type === 'array') {
            this._stack[this._level].index++;
          }

          break;
        default:
          prim = this._parsePrimitive(chunk, i);
          i += prim.end - prim.start - 1;

          if (this._postColon) {
            if (this._path === this._getPathForPrimitiveObject(chunk)) {
              if (this.onText) {
                this.onText(chunk.substring(prim.start, prim.end));
              }
            }
          }

          if (this._stack[this._level].type === 'array') {
            if (this._path === this._getPathForPrimitiveArray(chunk)) {
              if (this.onText) {
                this.onText(chunk.substring(prim.start, prim.end));
              }
            }
          }

          this._postColon = false;
          break;
      }
    }
  }

  _parseString(chunk, start) {
    var i = ++start;
    while (chunk[i] !== '"' || chunk[i - 1] === '\\') {
      i++;
    }

    return { start: start, end: i };
  }

  _parsePrimitive(chunk, start) {
    var i = start;
    while (chunk[i] !== ']' && chunk[i] !== '}' && chunk[i] !== ',') {
      i++;
    }

    return { start: start, end: i };
  }

  _getParentKey(chunk) {
    if (this._level === -1) {
      return '/';
    }

    var parentType = this._stack[this._level].type;

    if (parentType === 'array') {
      return '[' + this._stack[this._level].index + ']';
    }

    if (parentType === 'object') {
      return chunk.substring(this._lastString.start, this._lastString.end);
    }
  }

  _getPathForPrimitiveObject(chunk) {
    return this._stack[this._level].path + '.' +
        chunk.substring(this._lastString.start, this._lastString.end);
  }

  _getPathForPrimitiveArray(chunk) {
    return this._stack[this._level].path + '.[' + this._stack[this._level].index + ']';
  }

  _processPath(path) {
    if (!path) {
      return '/';
    }

    path = path.replace(/\[/g, '.[');
    return path[0] !== '.' ? '/.' + path : '/' + path;
  }
}

module.exports = FastJson;
