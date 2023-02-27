import { FastJsonListener, FastJsonData } from './types';

export class Node {
  name: string;
  children: Map<string, Node>;
  parent?: Node;
  listeners: FastJsonListener[];

  constructor(name: string, parent?: Node) {
    this.name = name;
    this.children = new Map();
    this.parent = parent;
    this.listeners = [];
  }

  createChild(name: string): Node {
    const node = new Node(name, this);
    this.children.set(name, node);
    return node;
  }

  getChild(name: string): Node | undefined {
    return this.children.get(name);
  }

  createOrGetChild(name: string): Node {
    const node = this.getChild(name);
    return node !== undefined ? node : this.createChild(name);
  }

  addListeners(listeners: FastJsonListener[] | FastJsonListener) {
    this.listeners = this.listeners.concat(listeners);
  }

  hasListeners(): boolean {
    return this.listeners.length > 0;
  }

  callListeners(data: FastJsonData) {
    for (const listener of this.listeners) {
      listener(data);
    }
  }

  getPath(): string[] {
    const path = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Node = this;
    while (node.parent !== undefined) {
      path.unshift(node.name);
      node = node.parent;
    }
    return path;
  }

  clone(): Node {
    const clone = new Node(this.name);
    clone.listeners = this.listeners.slice();
    this.children.forEach((child) => {
      const childClone = child.clone();
      clone.children.set(child.name, childClone);
      childClone.parent = clone;
    });
    return clone;
  }
}
