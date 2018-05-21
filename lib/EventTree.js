const PARENT_SYMBOL = Symbol('parent');
const LISTENER_SYMBOL = Symbol('listener');

class EventTree {
  constructor(separator) {
    this._tree = {};
    this._tree[separator] = {};
    this._node = this._tree;

    this._sep = separator;
  }

  on(path, listener) {
    const normPath = this._normalizePath(path);
    const keys = normPath.split(this._sep);
    let node = this._tree[this._sep];

    for (let i = 1; i < keys.length; i++) {
      const key = keys[i];
      let childNode = node[key];
      if (childNode === undefined) {
        childNode = {};
        childNode[PARENT_SYMBOL] = node;
        node[key] = childNode;
      }

      if (i === keys.length - 1) {
        childNode[LISTENER_SYMBOL] = listener;
      }

      node = childNode;
    }
  }

  up() {
    this._node = this._node[PARENT_SYMBOL];
  }

  down(key) {
    this._node = this._node[key];
  }

  hasNode(key) {
    return this._node[key] !== undefined;
  }

  hasListener() {
    return this._node[LISTENER_SYMBOL] !== undefined;
  }

  emit(data) {
    this._node[LISTENER_SYMBOL](data);
  }

  /**
   * @param {Array|String} origPath
   * @returns {String}
   */
  _normalizePath(origPath) {
    if (Array.isArray(origPath)) {
      return `${this._sep}${origPath.join(this._sep)}`;
    }

    let path = origPath.replace(/[.[]/g, this._sep);
    path = path.replace(/\]/g, '');
    return !path.startsWith(this._sep) ? `${this._sep}${path}` : path;
  }
}

module.exports = EventTree;
