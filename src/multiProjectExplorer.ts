import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as rimraf from "rimraf";

//#region Utilities

namespace _ {
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

  export function readdir(path: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(path, (error, children) => handleResult(resolve, reject, error, normalizeNFC(children)));
    });
  }

  export function stat(path: string): Promise<fs.Stats> {
    return new Promise<fs.Stats>((resolve, reject) => {
      fs.stat(path, (error, stat) => handleResult(resolve, reject, error, stat));
    });
  }

  export function readfile(path: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      fs.readFile(path, (error, buffer) => handleResult(resolve, reject, error, buffer));
    });
  }

  export function writefile(path: string, content: Buffer): Promise<void> {
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

  export function mkdir(path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // mkdirp(path, error => handleResult(resolve, reject, error, void 0));
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

//#endregion

export class MultiProjectProvider implements vscode.TreeDataProvider<ProjectItem>, vscode.FileSystemProvider {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | void> = new vscode.EventEmitter<ProjectItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | void> = this._onDidChangeTreeData.event;

  private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]>;
  private fileName: string;
  private projectPaths: string[] | undefined;
  ignoredFolders: string[] | undefined;

  constructor() {
    this._onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

    this.fileName = vscode.workspace.getConfiguration("multiProject").get("fileName") || "*";
    this.projectPaths = vscode.workspace.getConfiguration("multiProject").get("projectPaths");
    this.ignoredFolders = vscode.workspace.getConfiguration("multiProject").get("ignoredFolders");
  }

  get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
    return this._onDidChangeFile.event;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
    const watcher = fs.watch(uri.fsPath, { recursive: options.recursive }, async (event: string, filename: string | Buffer) => {
      const filepath = path.join(uri.fsPath, _.normalizeNFC(filename.toString()));

      // TODO support excludes (using minimatch library?)

      this._onDidChangeFile.fire([
        {
          type: event === "change" ? vscode.FileChangeType.Changed : (await _.exists(filepath)) ? vscode.FileChangeType.Created : vscode.FileChangeType.Deleted,
          uri: uri.with({ path: filepath }),
        } as vscode.FileChangeEvent,
      ]);
    });

    return { dispose: () => watcher.close() };
  }

  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    return this._stat(uri.fsPath);
  }

  async _stat(path: string): Promise<vscode.FileStat> {
    return new FileStat(await _.stat(path));
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    return this._readDirectory(uri);
  }

  async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const children = await _.readdir(uri.fsPath);

    const result: [string, vscode.FileType][] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const stat = await this._stat(path.join(uri.fsPath, child));
      result.push([child, stat.type]);
    }

    return Promise.resolve(result);
  }

  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    return _.mkdir(uri.fsPath);
  }

  readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
    return _.readfile(uri.fsPath);
  }

  writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): void | Thenable<void> {
    return this._writeFile(uri, content, options);
  }

  async _writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): Promise<void> {
    const exists = await _.exists(uri.fsPath);
    if (!exists) {
      if (!options.create) {
        throw vscode.FileSystemError.FileNotFound();
      }

      await _.mkdir(path.dirname(uri.fsPath));
    } else {
      if (!options.overwrite) {
        throw vscode.FileSystemError.FileExists();
      }
    }

    return _.writefile(uri.fsPath, content as Buffer);
  }

  delete(uri: vscode.Uri, options: { recursive: boolean }): void | Thenable<void> {
    if (options.recursive) {
      return _.rmrf(uri.fsPath);
    }

    return _.unlink(uri.fsPath);
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void | Thenable<void> {
    return this._rename(oldUri, newUri, options);
  }

  async _rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): Promise<void> {
    const exists = await _.exists(newUri.fsPath);
    if (exists) {
      if (!options.overwrite) {
        throw vscode.FileSystemError.FileExists();
      } else {
        await _.rmrf(newUri.fsPath);
      }
    }

    const parentExists = await _.exists(path.dirname(newUri.fsPath));
    if (!parentExists) {
      await _.mkdir(path.dirname(newUri.fsPath));
    }

    return _.rename(oldUri.fsPath, newUri.fsPath);
  }

  // tree data provider
  async getChildren(element?: ProjectItem): Promise<ProjectItem[]> {
    if (element) {
      const children = await this.readDirectory(element.resourceUri);
      return this.filterChildren(children, element.resourceUri.fsPath);
    }

    // 첫 로드

    if (this.projectPaths) {
      return this.projectPaths.map(path => new ProjectItem(vscode.Uri.file(path), vscode.FileType.Unknown));
    }
    // const testFolderUri = vscode.Uri.file(this.multiPaths);
    // if (testFolderUri) {
    //   const children = await this.readDirectory(testFolderUri);
    //   children.sort((a, b) => {
    //     if (a[1] === b[1]) {
    //       return a[0].localeCompare(b[0]);
    //     }
    //     return a[1] === vscode.FileType.Directory ? -1 : 1;
    //   });
    //   return this.filterChildren(children, testFolderUri.fsPath);
    // }

    return [];
  }

  getTreeItem(element: ProjectItem): ProjectItem {
    return element;
  }

  private filterChildren(children: [string, vscode.FileType][], filepath: string) {
    return children.reduce((result: ProjectItem[], [name, type]) => {
      if (this.validateFile(name, type)) {
        result.push(new ProjectItem(vscode.Uri.file(path.join(filepath, name)), type));
      }
      return result;
    }, []);
  }

  private validateFile(name: string, type: vscode.FileType): boolean {
    // 폴더 검증
    if (type === vscode.FileType.Directory) {
      // undefined면 보여주기 / 하나도 일치하지 않으면 보여주기
      if (this.ignoredFolders === undefined || this.ignoredFolders.length <= 0) return true;
      else if (this.ignoredFolders.some(ignoreFolderName => ignoreFolderName === name)) return false;
      return true;
    } else {
      // 파일 검증
      if (this.fileName === "*") return true;
      else if (name.includes(this.fileName)) return true;

      return true;
    }
  }
}

export class MultiProjectExplorer {
  constructor(context: vscode.ExtensionContext) {
    const treeDataProvider = new MultiProjectProvider();
    context.subscriptions.push(vscode.window.createTreeView("multiProjectExplorer", { treeDataProvider }));
    vscode.commands.registerCommand("multiProjectExplorer.openFile", resource => this.openResource(resource));
    vscode.commands.registerCommand("multiProjectExplorer.refreshEntry", () => treeDataProvider.refresh());
    vscode.commands.registerCommand("multiProjectExplorer.openFolder", async args => {
      const uri = args.resourceUri;
      const openInNewWindow = true;
      await vscode.commands.executeCommand("vscode.openFolder", uri, openInNewWindow);
    });
    vscode.commands.registerCommand("multiProjectExplorer.addProjectPath", async args => {
      console.log("called addProjectPath");
      // vscode.commands.executeCommand("workbench.action.openWorkspace");
    });
  }

  private openResource(resource: vscode.Uri): void {
    vscode.window.showTextDocument(resource);
  }
}

const contextValueType = "rootProject" || "file" || "folder";

export class ProjectItem extends vscode.TreeItem {
  constructor(public readonly resourceUri: vscode.Uri, public readonly type: vscode.FileType) {
    super(resourceUri, type === vscode.FileType.File ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);

    if (this.type === vscode.FileType.Unknown) {
      this.iconPath = new vscode.ThemeIcon("root-folder");
    }

    this.setContextValue();

    if (type === vscode.FileType.File) {
      this.command = { command: "multiProjectExplorer.openFile", title: "Open File", arguments: [this.resourceUri] };
      this.contextValue = "file";
    }
  }

  setContextValue() {
    switch (this.type) {
      case vscode.FileType.Unknown:
        this.contextValue = "project";
        break;
      case vscode.FileType.File:
        this.contextValue = "file";
        break;
      default:
        this.contextValue = "defult";
        break;
    }
  }
}