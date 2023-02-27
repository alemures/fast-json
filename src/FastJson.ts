import { ROOT_KEY } from './constants';
import { EventTree } from './EventTree';
import {
  FastJsonStackFrame,
  FastJsonOptions,
  FastJsonPath,
  FastJsonListener,
  FastJsonData,
} from './types';

const OPEN_BRACE = '{'.charCodeAt(0);
const CLOSE_BRACE = '}'.charCodeAt(0);
const OPEN_BRACKET = '['.charCodeAt(0);
const CLOSE_BRACKET = ']'.charCodeAt(0);
const QUOTE = '"'.charCodeAt(0);
const SPACE = ' '.charCodeAt(0);
const NEW_LINE = '\n'.charCodeAt(0);
const CARRIAGE_RETURN = '\r'.charCodeAt(0);
const TAB = '\t'.charCodeAt(0);
const COLON = ':'.charCodeAt(0);
const COMMA = ','.charCodeAt(0);
const BACKSLASH = '\\'.charCodeAt(0);

const TYPE_ARRAY = 1;
const TYPE_OBJECT = 2;

export class FastJson {
  private stack: FastJsonStackFrame[];
  private postColon: boolean;
  private lastString: { start: number; end: number };
  private skipped: boolean;
  private events: EventTree;

  /**
   * @param options The fast-json options.
   */
  constructor(options: FastJsonOptions = {}) {
    this.stack = [];
    this.postColon = false;
    this.lastString = { start: 0, end: 0 };
    this.skipped = false;

    this.events = new EventTree(ROOT_KEY, options.pathSeparator);
  }

  /**
   * Adds a listener function for the provided path.
   * @param path The JSON path to get values.
   * @param listener The function called after finding the JSON path.
   */
  on(path: FastJsonPath, listener: FastJsonListener) {
    this.events.on(path, listener);
  }

  /**
   * Start processing JSON using the defined paths in {@link FastJson#on} method.
   * @param data The JSON to process.
   */
  write(data: FastJsonData) {
    for (let i = 0; i < data.length && !this.skipped; i++) {
      switch (FastJson.get(data, i)) {
        case OPEN_BRACE:
          i = this.onOpenBlock(data, i, TYPE_OBJECT, OPEN_BRACE, CLOSE_BRACE);
          break;
        case OPEN_BRACKET:
          i = this.onOpenBlock(
            data,
            i,
            TYPE_ARRAY,
            OPEN_BRACKET,
            CLOSE_BRACKET
          );
          break;
        case CLOSE_BRACE:
        case CLOSE_BRACKET:
          this.onCloseBlock(data, i);
          break;
        case QUOTE:
          i = this.onQuote(data, i);
          break;
        case TAB:
        case CARRIAGE_RETURN:
        case NEW_LINE:
        case SPACE:
          break;
        case COLON:
          this.postColon = true;
          break;
        case COMMA:
          this.onComma();
          break;
        default:
          i = this.onPrimitive(data, i);
      }
    }

    if (this.skipped) {
      this.skipCleanUp();
    }
  }

  /**
   * Stop processing the last JSON provided in the {@link FastJson#write} method.
   */
  skip() {
    this.skipped = true;
  }

  private skipCleanUp() {
    this.stack = [];
    this.postColon = false;
    this.skipped = false;
    this.events.reset();
  }

  private onOpenBlock(
    data: FastJsonData,
    index: number,
    type: number,
    openChar: number,
    closeChar: number
  ): number {
    const key = this.getKey(data);
    if (!this.events.hasNode(key)) {
      return FastJson.skipBlock(data, index, openChar, closeChar);
    }

    this.events.down(key);

    this.stack.push({
      // General
      type,
      start: index,
      end: 0,
      key,

      // TYPE_ARRAY
      index: 0,
    });

    this.postColon = false;

    return index;
  }

  private onCloseBlock(data: FastJsonData, index: number) {
    const frame = this.stack.pop();

    if (frame) {
      frame.end = index;

      if (this.events.hasListener()) {
        this.events.emit(data.slice(frame.start, frame.end + 1));
      }
    }

    this.events.up();
  }

  private onQuote(data: FastJsonData, index: number): number {
    const strStart = index + 1;
    const strEnd = FastJson.parseString(data, index);

    this.emitPrimitiveOrString(data, strStart, strEnd);

    this.postColon = false;
    this.lastString.start = strStart;
    this.lastString.end = strEnd;

    return index + (strEnd - strStart + 1);
  }

  private onComma() {
    const frame = this.getFrame();
    if (frame.type === TYPE_ARRAY) {
      frame.index++;
    }
  }

  private onPrimitive(data: FastJsonData, index: number): number {
    const primEnd = FastJson.parsePrimitive(data, index);

    this.emitPrimitiveOrString(data, index, primEnd);

    this.postColon = false;

    return index + (primEnd - index - 1);
  }

  private emitPrimitiveOrString(
    data: FastJsonData,
    start: number,
    end: number
  ) {
    const frame = this.getFrame();

    if (this.postColon) {
      const key = this.getKeyForPrimitiveObject(data);
      if (this.events.hasNode(key)) {
        this.events.down(key);

        if (this.events.hasListener()) {
          this.events.emit(data.slice(start, end));
        }

        this.events.up();
      }
    } else if (frame.type === TYPE_ARRAY) {
      const key = FastJson.getKeyForPrimitiveArray(frame);
      if (this.events.hasNode(key)) {
        this.events.down(key);

        if (this.events.hasListener()) {
          this.events.emit(data.slice(start, end));
        }

        this.events.up();
      }
    }
  }

  private static skipBlock(
    data: FastJsonData,
    index: number,
    openChar: number,
    closeChar: number
  ): number {
    let blockDepth = 1;
    let i = index + 1;

    for (; blockDepth > 0; i++) {
      switch (FastJson.get(data, i)) {
        case QUOTE: {
          const strEnd = FastJson.parseString(data, i);
          i += strEnd - i;
          break;
        }
        case openChar:
          blockDepth++;
          break;
        case closeChar:
          blockDepth--;
          break;
        default:
      }
    }

    return i - 1;
  }

  private static parseString(data: FastJsonData, index: number): number {
    for (let i = index + 1; ; i++) {
      switch (FastJson.get(data, i)) {
        case QUOTE:
          return i;
        case BACKSLASH:
          i++;
          break;
        default:
      }
    }
  }

  private static parsePrimitive(data: FastJsonData, index: number): number {
    for (let i = index; ; i++) {
      switch (FastJson.get(data, i)) {
        case CLOSE_BRACKET:
        case CLOSE_BRACE:
        case COMMA:
        case TAB:
        case CARRIAGE_RETURN:
        case NEW_LINE:
        case SPACE:
          return i;
        default:
      }
    }
  }

  private getKey(data: FastJsonData): string {
    if (this.stack.length === 0) {
      return ROOT_KEY;
    }

    const frame = this.getFrame();
    if (frame.type === TYPE_ARRAY) {
      return FastJson.getKeyForPrimitiveArray(frame);
    }

    return this.getKeyForPrimitiveObject(data);
  }

  private getFrame() {
    return this.stack[this.stack.length - 1];
  }

  private getKeyForPrimitiveObject(data: FastJsonData): string {
    return FastJson.toString(data, this.lastString.start, this.lastString.end);
  }

  private static getKeyForPrimitiveArray(frame: FastJsonStackFrame): string {
    return `${frame.index}`;
  }

  private static get(data: FastJsonData, index: number): number {
    if (typeof data === 'string') {
      return data.charCodeAt(index);
    }

    return data[index];
  }

  private static toString(
    data: FastJsonData,
    start: number,
    end: number
  ): string {
    if (typeof data === 'string') {
      return data.slice(start, end);
    }

    return data.toString(undefined, start, end);
  }
}
