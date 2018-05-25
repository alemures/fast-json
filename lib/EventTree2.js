const SEP = '.';

class TreeWalker {
  constructor(tree) {
    this.tree = tree;
    this.node = tree.root;
  }

  down(name) {
    this.node = this.node.getChild(name);
  }

  up() {
    this.node = this.node.parent;
  }

  get() {
    return this.node;
  }
}

class Tree {
  constructor(rootName) {
    this.root = new Node(rootName, null);
  }

  add(path) {
    const pathArr = path.split(SEP);
    let node = this.root;

    for (let i = 0; i < pathArr.length; i++) {
      node = node.addChild(pathArr[i]);
    }
  }

  get(path) {
    const pathArr = path.split(SEP);
    let node = this.root;

    for (let i = 0; i < pathArr.length && node !== undefined; i++) {
      node = node.getChild(pathArr[i]);
    }

    return node;
  }

  print() {
    function _it(node, level) {
      const pad = (new Array(level)).join('-');
      console.log(pad, node.name);
      node.children.forEach((node, name) => {
        _it(node, level + 1);
      })
    }

    _it(this.root, 2);
  }
}

class Node {
  constructor(name, parent) {
    this.name = name;
    this.children = new Map();
    this.parent = parent;
  }

  addChild(name) {
    const node = new Node(name, this);
    this.children.set(name, node);
    return node;
  }

  getChild(name) {
    return this.children.get(name);
  }

  merge(node) {
    function _merge(target, source) {
      source.children.forEach((childNode, name) => {
        let newNode = target.getChild(name);
        if (newNode === undefined) {
           newNode = target.addChild(name);
        }
        
        if (childNode.children.size > 0) {
          _merge(newNode, childNode);
        }
      });
    }

    _merge(this, node);
  }
}

const t = new Tree('/');
t.add('a.b.c');
t.add('b.b.*');
t.get('a').merge(t.get('a'));
t.print();
