import path = require("path");
import * as vscode from "vscode";
import { FileSystemProvider, fsUtils } from "./FileSystemProvider";
import { IBookmark, IProject } from "./type";

abstract class Storage extends FileSystemProvider {
  uri: vscode.Uri;
  protected _data: any;
  constructor(protected location: string, protected fileName: string) {
    super();
    const fullPath = path.join(location, fileName);
    this.uri = vscode.Uri.file(fullPath);
  }

  abstract get defaultStorageValue(): any;
  load() {
    if (!fsUtils.existsSync(this.location)) {
      fsUtils.mkdirSync(this.location, { recursive: true });
    }

    if (fsUtils.existsSync(this.uri.fsPath)) {
      const jsonFile = fsUtils.readFileSync(this.uri.fsPath);
      const jsonData = JSON.parse(jsonFile);
      this._data = jsonData;
    } else {
      fsUtils.writeFileSync(this.uri.fsPath, `${this.defaultStorageValue}`);
      this._data = this.defaultStorageValue;
    }

    this.watch(this.uri, { recursive: false, excludes: [] });
  }

  // protected abstract update<T>(data: T): void;
}
export class ProjectStorage extends Storage {
  constructor(location: string, fileName: string) {
    super(location, fileName);
  }

  get defaultStorageValue(): any {
    return [];
  }

  update(projects: IProject[]) {
    // path 통일
    projects.map(project => (project.path = vscode.Uri.file(project.path).fsPath));
    const projectsJson = JSON.stringify(projects);
    try {
      fsUtils.writeFileSync(this.uri.fsPath, projectsJson);
      this._data = projects;
    } catch (error) {
      console.error(`file update 중 오류가 발생했습니다. ${error}`);
    }
  }

  get projects() {
    return this._data;
  }

  static createDefaultProject(projectPath: string, name?: string): IProject {
    const defaultName = name ?? projectPath.split(path.sep).pop();
    return {
      path: projectPath,
      name: defaultName ?? "",
    };
  }
}

export class BookmarkStorage extends Storage {
  constructor(location: string, fileName: string) {
    super(location, fileName);
  }

  get defaultStorageValue(): any {
    return [];
  }

  update(bookmarks: IBookmark[]) {
    // path 통일
    bookmarks.map(bookmark => (bookmark.path = vscode.Uri.file(bookmark.path).fsPath));
    const bookmarkJson = JSON.stringify(bookmarks);
    try {
      fsUtils.writeFileSync(this.uri.fsPath, bookmarkJson);
      this._data = bookmarks;
    } catch (error) {
      console.error(`file update 중 오류가 발생했습니다. ${error}`);
    }
  }

  get bookmarks() {
    return this._data;
  }

  static createDefaultBookmark(bookmarkPath: string, name?: string): IBookmark {
    const defaultName = name ?? bookmarkPath.split(path.sep).pop();
    return {
      path: bookmarkPath,
      name: defaultName ?? "",
    };
  }
}

export class StoragePath {
  constructor(private context: vscode.ExtensionContext) {}
  get storageLocation(): string {
    const storageLocation = vscode.workspace.getConfiguration("multiProject").get<string>("storageLocation", "");
    let location;
    if (storageLocation) {
      const storageUri = vscode.Uri.file(storageLocation);
      location = storageUri.fsPath;
    } else {
      location = this.context.globalStorageUri.fsPath;
    }
    return location;
  }
}
