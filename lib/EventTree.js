const WILDCARD = '*';

class Node {
  constructor(name, parent, listeners = []) {
    this.name = name;
    this.children = new Map();
    this.parent = parent;
    this.listeners = Array.isArray(listeners) ? listeners.slice() : [listeners];
  }

  createChild(name, listeners) {
    const node = new Node(name, this, listeners);
    this.children.set(name, node);
    return node;
  }

  getChild(name) {
    return this.children.get(name);
  }
}

class Tree {
  constructor(rootName) {
    this.root = new Node(rootName, null);
  }

  on(path, listeners) {
    let node = this.root;

    for (let i = 0; i < path.length; i++) {
      node = node.getChild(path[i]) || node.createChild(path[i]);
    }

    node.listeners.push(listeners);
    this.processWildcardsInPath(path, listeners);
  }

  processWildcardsInPath(path) {
    let node = this.root;

    for (let i = 0; i < path.length; i++) {
      node = node.getChild(path[i]);
      this.processWildcardMerge(node);
    }
  }

  processWildcardMerge(node) {
    if (node.name === WILDCARD) {
      node.parent.children.forEach((child) => {
        if (child.name !== WILDCARD) {
          child.listeners = child.listeners.concat(node.listeners);
          this.merge(child, node);
        }
      });
    } else if (node.parent.getChild(WILDCARD) !== undefined) {
      const wildNode = node.parent.getChild(WILDCARD);
      node.listeners = node.listeners.concat(wildNode.listeners);
      this.merge(node, wildNode);
    }
  }

  get(path) {
    let node = this.root;

    for (let i = 0; i < path.length && node !== undefined; i++) {
      node = node.getChild(path[i]);
    }

    return node;
  }

  merge(target, source) {
    source.children.forEach((childNode) => {
      const newNode = target.getChild(childNode.name) || target.createChild(childNode.name);
      newNode.listeners = newNode.listeners.concat(childNode.listeners);

      this.processWildcardMerge(newNode);

      if (childNode.children.size > 0) {
        this.merge(newNode, childNode);
      }
    });
  }

  print() {
    function _it(node, level) {
      const pad = (new Array(level)).join('-');
      console.log(pad, node.name, `l:${node.listeners.length}`);

      node.children.forEach((child) => {
        _it(child, level + 1);
      });
    }

    _it(this.root, 2);
  }
}

class EventTree {
  constructor(separator) {
    this.tree = new Tree(separator);
    this.node = this.tree.root;
    this.separator = separator;
  }

  down(name) {
    if (name === this.separator) {
      return;
    }

    this.node = this.node.getChild(String(name)) || this.node.getChild(WILDCARD);
  }

  up() {
    if (this.node.parent === null) {
      return;
    }

    this.node = this.node.parent;
  }

  hasNode(name) {
    if (name === this.separator) {
      return true;
    }

    return this.node.getChild(String(name)) !== undefined ||
      this.node.getChild(WILDCARD) !== undefined;
  }

  hasListener() {
    return this.node.listeners.length > 0;
  }

  emit(data) {
    for (let i = 0; i < this.node.listeners.length; i++) {
      this.node.listeners[i](data);
    }
  }

  on(path, listeners) {
    const pathArr = this._normalizePath(path);
    this.tree.on(pathArr, listeners);
  }

  /**
   * @param {Array|String} origPath
   * @returns {Array}
   */
  _normalizePath(origPath) {
    if (Array.isArray(origPath)) {
      return origPath;
    }

    let path = origPath.replace(/[.[]/g, this.separator);
    path = path.replace(/\]/g, '');
    path = path.startsWith(this.separator) ? path.substring(this.separator.length) : path;
    return path.split(this.separator);
  }
}

module.exports = EventTree;
