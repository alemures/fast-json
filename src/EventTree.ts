import { WILDCARD } from './constants';
import { Node } from './Node';
import { Tree } from './Tree';
import { FastJsonData, FastJsonListener, FastJsonPath } from './types';

export class EventTree {
  private tree: Tree;
  private customPathSeparator: string;
  private expandedTree: Tree;
  private node: Node;

  constructor(rootName: string, customPathSeparator = '') {
    this.tree = new Tree(rootName);
    this.customPathSeparator = customPathSeparator;

    this.expandedTree = this.tree.getCloneExpanded();
    this.node = this.expandedTree.root;
  }

  down(name: string) {
    if (name !== this.expandedTree.root.name) {
      const node = this.node.getChild(name) ?? this.node.getChild(WILDCARD);
      if (node === undefined) {
        throw new Error('Could not get child');
      }
      this.node = node;
    }
  }

  up() {
    if (this.node.parent !== undefined) {
      this.node = this.node.parent;
    }
  }

  hasNode(name: string): boolean {
    if (name === this.expandedTree.root.name) {
      return true;
    }

    return (
      this.node.getChild(name) !== undefined ||
      this.node.getChild(WILDCARD) !== undefined
    );
  }

  hasListener(): boolean {
    return this.node.hasListeners();
  }

  emit(data: FastJsonData) {
    this.node.callListeners(data);
  }

  on(path: FastJsonPath, listener: FastJsonListener) {
    const pathArr = this.parsePath(path);
    this.tree.add(pathArr, listener);

    const nodePath = this.node.getPath();
    this.expandedTree = this.tree.getCloneExpanded();
    this.node = this.expandedTree.get(nodePath);
  }

  reset() {
    this.node = this.expandedTree.root;
  }

  private parsePath(origPath: FastJsonPath): string[] {
    if (Array.isArray(origPath)) {
      return origPath;
    }

    if (origPath.length === 0) {
      return [];
    }

    if (this.customPathSeparator) {
      return origPath.split(this.customPathSeparator);
    }

    const sep = '.';
    let path = origPath.replace(/[.[]/g, sep);
    path = path.replace(/\]/g, '');
    path = path.startsWith(sep) ? path.substring(sep.length) : path;
    return path.split(sep);
  }
}
