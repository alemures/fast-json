import { WILDCARD } from './constants';
import { Node } from './Node';
import { FastJsonListener } from './types';

export class Tree {
  root: Node;

  constructor(root: Node | string) {
    this.root = typeof root === 'string' ? new Node(root) : root;
  }

  add(path: string[], listener: FastJsonListener) {
    let node = this.root;
    for (const pathItem of path) {
      node = node.createOrGetChild(pathItem);
    }
    node.addListeners(listener);
  }

  get(path: string[]): Node {
    let node = this.root;
    for (const pathItem of path) {
      const currentNode = node.getChild(pathItem);
      if (currentNode === undefined) {
        throw new Error('Could not get child');
      }
      node = currentNode;
    }
    return node;
  }

  toString(): string {
    const ret: string[] = [];
    function it(node: Node, level: number) {
      const pad = new Array(level).join('-');
      ret.push(`${pad} ${node.name} l:${node.listeners.length}`);

      node.children.forEach((child) => {
        it(child, level + 2);
      });
    }

    it(this.root, 2);
    return ret.join('\n');
  }

  getCloneExpanded(): Tree {
    const clone = new Tree(this.root.clone());
    this.expandWildcards(clone.root);
    return clone;
  }

  private expandWildcards(node: Node) {
    const wildNode = node.getChild(WILDCARD);
    if (wildNode !== undefined) {
      node.children.forEach((child) => {
        if (child.name !== WILDCARD) {
          child.addListeners(wildNode.listeners);
          this.mergeNodes(child, wildNode);
        }
      });
    }

    node.children.forEach((child) => this.expandWildcards(child));
  }

  private mergeNodes(target: Node, source: Node) {
    source.children.forEach((sourceChild) => {
      const targetChild = target.createOrGetChild(sourceChild.name);
      targetChild.addListeners(sourceChild.listeners);
      this.mergeNodes(targetChild, sourceChild);
    });
  }
}
