const WILDCARD = '*';

class Node {
  constructor(name, parent) {
    this.name = name;
    this.children = new Map();
    this.parent = parent;
    this.listeners = [];
  }

  createChild(name) {
    const node = new Node(name, this);
    this.children.set(name, node);
    return node;
  }

  getChild(name) {
    return this.children.get(name);
  }

  createOrGetChild(name) {
    const node = this.getChild(name);
    return node !== undefined ? node : this.createChild(name);
  }

  addListeners(listeners) {
    this.listeners = this.listeners.concat(listeners);
  }

  hasListeners() {
    return this.listeners.length > 0;
  }

  callListeners(data) {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](data);
    }
  }
}

class Tree {
  constructor(rootName) {
    this.root = new Node(rootName);
  }

  add(path, listener) {
    let node = this.root;

    for (let i = 0; i < path.length; i++) {
      node = node.createOrGetChild(path[i]);
    }

    node.addListeners(listener);
  }

  get(path) {
    let node = this.root;

    for (let i = 0; i < path.length && node !== undefined; i++) {
      node = node.getChild(path[i]);
    }

    return node;
  }

  toString() {
    const ret = [];
    function _it(node, level) {
      const pad = (new Array(level)).join('-');
      ret.push(`${pad} ${node.name} l:${node.listeners.length}`);

      node.children.forEach((child) => {
        _it(child, level + 2);
      });
    }

    _it(this.root, 2);
    return ret.join('\n');
  }
}

class EventTree {
  constructor(rootName) {
    this.tree = new Tree(rootName);
    this.node = this.tree.root;
  }

  down(name) {
    if (name !== this.tree.root.name) {
      this.node = this.node.getChild(name) || this.node.getChild(WILDCARD);
    }
  }

  up() {
    if (this.node.parent !== undefined) {
      this.node = this.node.parent;
    }
  }

  hasNode(name) {
    if (name === this.tree.root.name) {
      return true;
    }

    return this.node.getChild(name) !== undefined ||
      this.node.getChild(WILDCARD) !== undefined;
  }

  hasListener() {
    return this.node.hasListeners();
  }

  emit(data) {
    this.node.callListeners(data);
  }

  on(path, listener) {
    const pathArr = EventTree._parsePath(path);
    this.tree.add(pathArr, listener);
  }

  /**
   * @param {Array|String} origPath
   * @returns {Array}
   */
  static _parsePath(origPath) {
    if (Array.isArray(origPath)) {
      return origPath;
    }

    const sep = '.';
    let path = origPath.replace(/[.[]/g, sep);
    path = path.replace(/\]/g, '');
    path = path.startsWith(sep) ? path.substring(sep.length) : path;
    return path.split(sep);
  }
}

module.exports = {
  EventTree,
  Tree,
  Node,
};
