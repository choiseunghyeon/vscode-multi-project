import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as rimraf from "rimraf";

export class FileStat implements vscode.FileStat {
  constructor(private fsStat: fs.Stats) {}

  get type(): vscode.FileType {
    return this.fsStat.isFile() ? vscode.FileType.File : this.fsStat.isDirectory() ? vscode.FileType.Directory : this.fsStat.isSymbolicLink() ? vscode.FileType.SymbolicLink : vscode.FileType.Unknown;
  }

  get isFile(): boolean | undefined {
    return this.fsStat.isFile();
  }

  get isDirectory(): boolean | undefined {
    return this.fsStat.isDirectory();
  }

  get isSymbolicLink(): boolean | undefined {
    return this.fsStat.isSymbolicLink();
  }

  get size(): number {
    return this.fsStat.size;
  }

  get ctime(): number {
    return this.fsStat.ctime.getTime();
  }

  get mtime(): number {
    return this.fsStat.mtime.getTime();
  }
}

export namespace fsUtils {
  function handleResult<T>(resolve: (result: T) => void, reject: (error: Error) => void, error: Error | null | undefined, result: T): void {
    if (error) {
      reject(massageError(error));
    } else {
      resolve(result);
    }
  }

  function massageError(error: Error & { code?: string }): Error {
    if (error.code === "ENOENT") {
      return vscode.FileSystemError.FileNotFound();
    }

    if (error.code === "EISDIR") {
      return vscode.FileSystemError.FileIsADirectory();
    }

    if (error.code === "EEXIST") {
      return vscode.FileSystemError.FileExists();
    }

    if (error.code === "EPERM" || error.code === "EACCESS") {
      return vscode.FileSystemError.NoPermissions();
    }

    return error;
  }

  export function checkCancellation(token: vscode.CancellationToken): void {
    if (token.isCancellationRequested) {
      throw new Error("Operation cancelled");
    }
  }

  export function normalizeNFC(items: string): string;
  export function normalizeNFC(items: string[]): string[];
  export function normalizeNFC(items: string | string[]): string | string[] {
    if (process.platform !== "darwin") {
      return items;
    }

    if (Array.isArray(items)) {
      return items.map(item => item.normalize("NFC"));
    }

    return items.normalize("NFC");
  }

  export function existsSync(path: string): boolean {
    return fs.existsSync(path);
  }

  export function readFileSync(path: string, encoding: BufferEncoding = "utf8") {
    return fs.readFileSync(path, { encoding });
  }

  export function writeFileSync(path: string, data: any): void {
    return fs.writeFileSync(path, data);
  }

  export function statSync(path: string): fs.Stats {
    return fs.statSync(path);
  }

  export function mkdirSync(
    path: string,
    option?: fs.MakeDirectoryOptions & {
      recursive: true;
    }
  ) {
    return fs.mkdirSync(path, option);
  }

  export function readdir(path: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(path, (error, children) => handleResult(resolve, reject, error, normalizeNFC(children)));
    });
  }

  export function readfile(path: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      fs.readFile(path, (error, buffer) => handleResult(resolve, reject, error, buffer));
    });
  }

  export function writefile(path: string, content: string | Buffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(path, content, error => handleResult(resolve, reject, error, void 0));
    });
  }

  export function exists(path: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      fs.exists(path, exists => handleResult(resolve, reject, null, exists));
    });
  }

  export function rmrf(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      rimraf(path, error => handleResult(resolve, reject, error, void 0));
    });
  }

  export function mkdir(path: string, option?: fs.MakeDirectoryOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.mkdir(path, option, error => handleResult(resolve, reject, error, void 0));
    });
  }

  export function rename(oldPath: string, newPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.rename(oldPath, newPath, error => handleResult(resolve, reject, error, void 0));
    });
  }

  export function unlink(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.unlink(path, error => handleResult(resolve, reject, error, void 0));
    });
  }
}

export abstract class FileSystemProvider implements vscode.FileSystemProvider {
  private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]>;
  constructor() {
    this._onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  }

  get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
    return this._onDidChangeFile.event;
  }

  watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
    const watcher = fs.watch(uri.fsPath, { recursive: options.recursive }, async (event: string, filename: string | Buffer) => {
      const filepath = path.join(uri.fsPath, fsUtils.normalizeNFC(filename.toString()));

      // TODO support excludes (using minimatch library?)

      this._onDidChangeFile.fire([
        {
          type: event === "change" ? vscode.FileChangeType.Changed : (await fsUtils.exists(filepath)) ? vscode.FileChangeType.Created : vscode.FileChangeType.Deleted,
          uri: uri.with({ path: filepath }),
        } as vscode.FileChangeEvent,
      ]);
    });

    return { dispose: () => watcher.close() };
  }

  stat(uri: vscode.Uri): FileStat {
    return this._stat(uri.fsPath);
  }

  _stat(path: string): FileStat {
    return new FileStat(fsUtils.statSync(path));
  }

  filterType(uriList: vscode.Uri[], type: vscode.FileType) {
    const result = [];
    for (const uri of uriList) {
      const stat = this.stat(uri);
      if (stat.type !== type) {
        result.push(uri);
      }
    }
    return result;
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    return this._readDirectory(uri);
  }

  async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const children = await fsUtils.readdir(uri.fsPath);

    const result: [string, vscode.FileType][] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const stat = await this._stat(path.join(uri.fsPath, child));
      result.push([child, stat.type]);
    }

    return Promise.resolve(result);
  }

  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    return fsUtils.mkdir(uri.fsPath);
  }

  readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
    return fsUtils.readfile(uri.fsPath);
  }

  writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): void | Thenable<void> {
    return this._writeFile(uri, content, options);
  }

  async _writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): Promise<void> {
    const exists = await fsUtils.exists(uri.fsPath);
    if (!exists) {
      if (!options.create) {
        throw vscode.FileSystemError.FileNotFound();
      }

      await fsUtils.mkdir(path.dirname(uri.fsPath));
    } else {
      if (!options.overwrite) {
        throw vscode.FileSystemError.FileExists();
      }
    }

    return fsUtils.writefile(uri.fsPath, content as Buffer);
  }

  delete(uri: vscode.Uri, options: { recursive: boolean }): void | Thenable<void> {
    if (options.recursive) {
      return fsUtils.rmrf(uri.fsPath);
    }

    return fsUtils.unlink(uri.fsPath);
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void | Thenable<void> {
    return this._rename(oldUri, newUri, options);
  }

  async _rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): Promise<void> {
    const exists = await fsUtils.exists(newUri.fsPath);
    if (exists) {
      if (!options.overwrite) {
        throw vscode.FileSystemError.FileExists();
      } else {
        await fsUtils.rmrf(newUri.fsPath);
      }
    }

    const parentExists = await fsUtils.exists(path.dirname(newUri.fsPath));
    if (!parentExists) {
      await fsUtils.mkdir(path.dirname(newUri.fsPath));
    }

    return fsUtils.rename(oldUri.fsPath, newUri.fsPath);
  }
}
