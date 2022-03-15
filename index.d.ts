export default class FastJson {
  constructor(options?: FastJsonOptions);
  /**
   * Adds a listener function for the provided path.
   * @param {Array|string} path The JSON path to get values.
   * @param {FastJson~jsonListener} listener The function called after finding the JSON path.
   */
  on(path: any[] | string, listener: FastJsonListener): void;
  /**
   * Start processing JSON using the defined paths in {@link FastJson#on} method.
   * @param {string|Buffer} data The JSON to process.
   */
  write(data: string | Buffer): void;
  /**
   * Stop processing the last JSON provided in the {@link FastJson#write} method.
   */
  skip(): void;
}

export interface FastJsonOptions {
  /**
   * Path separator to use in string JSON paths. This can
   * be used to allow JSON keys with special characters like dots. Setting this to <code>/</code>
   * allows JSON paths like <code>user/first.name</code> which will be separated into
   * <code>['user', 'first.name']</code>.
   */
  pathSeparator?: string;
}

/**
 * JsonListener
 */
type FastJsonListener = (value: string | Buffer) => any;
