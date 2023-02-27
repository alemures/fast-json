export type FastJsonListener = (data: FastJsonData) => void;

export interface FastJsonOptions {
  /**
   * Path separator to use in string JSON paths. This can
   * be used to allow JSON keys with special characters like dots. Setting this to <code>/</code>
   * allows JSON paths like <code>user/first.name</code> which will be separated into
   * <code>['user', 'first.name']</code>.
   */
  pathSeparator?: string;
}

export interface FastJsonStackFrame {
  type: number;
  start: number;
  end: number;
  key: string;
  index: number;
}

export type FastJsonData = string | Buffer;

export type FastJsonPath = string[] | string;
