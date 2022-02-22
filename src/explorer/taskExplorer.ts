import * as vscode from "vscode";
import * as path from "path";
import { createCommand, createTreeItemCommand, getFilePath } from "../utils/utils";
import { FileSystemProvider } from "../FileSystemProvider";
import { BOOKMARK_STORAGE_FILE } from "../constants";
import { IBookmark } from "../type";
import { ProjectItem } from "./multiProjectExplorer";
import { BookmarkStorage } from "../storage/bookmarkStorage";
import { BookmarkStoragePath } from "../storage/storage";
import { openResource } from "../utils/native";

export class TaskProvider extends FileSystemProvider implements vscode.TreeDataProvider<BookmarkItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<BookmarkItem | undefined | void> = new vscode.EventEmitter<BookmarkItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<BookmarkItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(public storage: BookmarkStorage) {
    super();
    storage.load();
    storage.onDidChangeFile(e => {
      storage.syncDataFromDiskFile();
      this.refresh();
    });
  }

  get bookmarks(): IBookmark[] {
    return this.storage.data;
    // return vscode.workspace.getConfiguration("multiProject").get("bookmarks", []);
  }

  updateBookmarks(bookmarks: IBookmark[]) {
    this.storage.update(bookmarks);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // tree data provider
  async getChildren(): Promise<BookmarkItem[]> {
    // 모든 bookmarkItem은 vscode.TreeItemCollapsibleState.None 이므로 element가 넘어오는 경우 없음
    // 첫 로드
    if (this.bookmarks.length > 0) {
      return this.bookmarks.map(bookmark => new BookmarkItem(bookmark, vscode.FileType.File));
    }

    return [];
  }

  getTreeItem(element: BookmarkItem): BookmarkItem {
    return element;
  }

  private filterChildren(children: [string, vscode.FileType][], filepath: string) {
    return children.reduce((result: BookmarkItem[], [name, type]) => {
      const bookmark = BookmarkStorage.createDefaultBookmark(path.join(filepath, name), name);
      result.push(new BookmarkItem(bookmark, type));
      return result;
    }, []);
  }
}

export class BookmarkItem extends vscode.TreeItem {
  label: string;
  constructor(public bookmark: IBookmark, public readonly type: vscode.FileType) {
    super(bookmark.name, vscode.TreeItemCollapsibleState.None);

    this.label = bookmark.name;
    this.iconPath = new vscode.ThemeIcon("extensions-star-full");

    this.command = createTreeItemCommand("multiProjectExplorer.openFile", "Open File", [vscode.Uri.file(bookmark.path)]);
    this.contextValue = "file";
  }

  static isBookmarkItem(thing: any): thing is BookmarkItem {
    if (thing instanceof BookmarkItem) {
      return true;
    } else {
      return false;
    }
  }
}

export class TaskExplorer {
  treeDataProvider: TaskProvider;
  constructor(globalStoragePath: string) {
    const bookmarkPath = new BookmarkStoragePath(globalStoragePath);
    const storage = new BookmarkStorage(bookmarkPath.storageLocation, BOOKMARK_STORAGE_FILE);
    this.treeDataProvider = new TaskProvider(storage);

    // storage 도입 전 0.0.6 version 사용자의 경우 @legacy
    if (this.treeDataProvider.bookmarks.length < 1) {
      const bookmarkPaths = vscode.workspace.getConfiguration("multiProject").get("bookmarks", []);
      const bookmarks = bookmarkPaths.map(bookmarkPath => BookmarkStorage.createDefaultBookmark(bookmarkPath));
      storage.update(bookmarks);
    }

    vscode.window.createTreeView("bookmarkExplorer", { treeDataProvider: this.treeDataProvider });
  }

  getCommands() {
    return [
      // createCommand("bookmarkExplorer.openFile", this.openFile),
      // createCommand("bookmarkExplorer.editBookmark", this.openBookmarkFile),
      // createCommand("bookmarkExplorer.addBookmark", this.addBookmark),
      // createCommand("bookmarkExplorer.removeBookmark", this.removeBookmark),
    ];
    // vscode.commands.registerCommand("multiProjectExplorer.refreshEntry", () => treeDataProvider.refresh());
  }

  openBookmarkFile() {
    openResource(this.treeDataProvider.storage._uri);
  }

  openFile(resource: any) {
    openResource(resource);
  }

  addBookmark(thing: vscode.Uri | ProjectItem, uriList: vscode.Uri[]) {
    // console.log(args);
    const params = ProjectItem.isProejctItem(thing) ? [vscode.Uri.file(thing.project.path)] : uriList;
    const filteredUriList = this.treeDataProvider.filterType(params, vscode.FileType.Directory);
    const filePathList = getFilePath(filteredUriList);
    const bookmarks = filePathList.map(filePath => BookmarkStorage.createDefaultBookmark(filePath));
    const resultBookmarks = this.treeDataProvider.bookmarks.concat(bookmarks);
    this.treeDataProvider.updateBookmarks(resultBookmarks);
  }

  removeBookmark(treeItem: BookmarkItem) {
    // console.log(args);
    const filePathlist = getFilePath(treeItem);
    const resultBookmarks = this.treeDataProvider.bookmarks.filter(bookmark => !filePathlist.includes(bookmark.path));
    this.treeDataProvider.updateBookmarks(resultBookmarks);
  }
}
