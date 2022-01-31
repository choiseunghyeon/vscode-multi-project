import _ = require("lodash");
import path = require("path");
import * as vscode from "vscode";
import { FileSystemProvider, fsUtils } from "../FileSystemProvider";

export abstract class Storage extends FileSystemProvider {
  _uri: vscode.Uri;
  protected _data: any;
  constructor(protected location: string, protected fileName: string) {
    super();
    const fullPath = path.join(location, fileName);
    this._uri = vscode.Uri.file(fullPath);
  }

  get uri() {
    return _.cloneDeep(this._uri);
  }

  get data() {
    return _.cloneDeep(this._data);
  }

  abstract get defaultStorageValue(): any;
  public load() {
    if (!fsUtils.existsSync(this.location)) {
      fsUtils.mkdirSync(this.location, { recursive: true });
    }

    if (!fsUtils.existsSync(this._uri.fsPath)) {
      this.writeFileSync(this.defaultStorageValue);
    }

    this.syncDataFromDiskFile();
    this.watch(this._uri, { recursive: false, excludes: [] });
  }

  public syncDataFromDiskFile() {
    const jsonFile = fsUtils.readFileSync(this._uri.fsPath);
    const jsonData = JSON.parse(jsonFile);
    this._data = jsonData;
  }

  private stringify(data: any) {
    // format
    return JSON.stringify(data, null, 2);
  }

  protected writeFileSync(data: any) {
    fsUtils.writeFileSync(this._uri.fsPath, this.stringify(data));
  }
}

abstract class StoragePath {
  constructor(protected globalStoragePath: string) {}
  get storageLocation(): string {
    let location;
    if (!_.isEmpty(this.storageLocationFromConfig)) {
      const storageUri = vscode.Uri.file(this.storageLocationFromConfig);
      location = storageUri.fsPath;
    } else {
      location = this.globalStoragePath;
    }
    return location;
  }

  abstract get storageLocationFromConfig(): string;
}

export class ProjectStoragePath extends StoragePath {
  constructor(protected globalStoragePath: string) {
    super(globalStoragePath);
  }

  get storageLocationFromConfig(): string {
    return vscode.workspace.getConfiguration("multiProject").get<string>("projectStorageLocation", "");
  }
}
export class BookmarkStoragePath extends StoragePath {
  constructor(protected globalStoragePath: string) {
    super(globalStoragePath);
  }

  get storageLocationFromConfig(): string {
    return vscode.workspace.getConfiguration("multiProject").get<string>("bookmarkStorageLocation", "");
  }
}
