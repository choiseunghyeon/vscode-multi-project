import * as vscode from "vscode";
import * as path from "path";
import { createCommand, createTreeItemCommand, getFilePath, isBookmark, isBookmarkFolder } from "../utils/utils";
import { FileSystemProvider } from "../FileSystemProvider";
import { BOOKMARK_STORAGE_FILE } from "../constants";
import { BookmarksType, ContextValueType, IBookmark, IBookmarkFolder } from "../type";
import { ProjectItem } from "./multiProjectExplorer";
import { BookmarkStorage } from "../storage/bookmarkStorage";
import { BookmarkStoragePath } from "../storage/storage";
import { openResource } from "../utils/native";

export class BookmarkProvider extends FileSystemProvider implements vscode.TreeDataProvider<BookmarkItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<BookmarkItem | undefined | void> = new vscode.EventEmitter<BookmarkItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<BookmarkItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(public storage: BookmarkStorage) {
    super();
    this.loadStorage();
  }

  loadStorage() {
    this.storage.load();
    this.refresh();
    this.storage.onDidChangeFile(e => {
      this.storage.syncDataFromDiskFile();
      this.refresh();
    });
  }

  setStorage(newStorage: BookmarkStorage) {
    this.storage.unload();
    this.storage = newStorage;
    this.loadStorage();
  }

  get bookmarks(): BookmarksType {
    return this.storage.data;
  }

  updateBookmarks(bookmarks: BookmarksType) {
    this.storage.update(bookmarks);
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // tree data provider
  async getChildren(element?: BookmarkItem): Promise<BookmarkItem[]> {
    if (element) {
      const bookmarkFolder = this.bookmarks.find(bookmark => bookmark.name === element.bookmark.name);
      if (!bookmarkFolder || isBookmark(bookmarkFolder)) return [];
      return bookmarkFolder.children.map(bookmark => this.createBookmarkItem(bookmark));
    }
    // 첫 로드
    if (this.bookmarks.length > 0) {
      return this.bookmarks.map(bookmark => this.createBookmarkItem(bookmark));
    }

    return [];
  }

  createBookmarkItem(bookmark: IBookmark | IBookmarkFolder): BookmarkItem {
    if (isBookmark(bookmark)) {
      return new BookmarkItem(bookmark, vscode.FileType.File);
    }
    return new BookmarkItem(bookmark, vscode.FileType.Directory);
  }

  getTreeItem(element: BookmarkItem): BookmarkItem {
    return element;
  }
}

export class BookmarkItem extends vscode.TreeItem {
  label: string;
  constructor(public bookmark: IBookmark | IBookmarkFolder, public readonly type: vscode.FileType) {
    super(bookmark.name, isBookmark(bookmark) ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);

    this.label = bookmark.name;

    if (isBookmark(bookmark)) {
      this.iconPath = new vscode.ThemeIcon("extensions-star-full");
      this.command = createTreeItemCommand("multiProjectExplorer.openFile", "Open File", [vscode.Uri.file(bookmark.path)]);
      this.contextValue = ContextValueType.File;
    } else {
      this.iconPath = new vscode.ThemeIcon("file-directory");
      this.contextValue = ContextValueType.Folder;
    }
  }

  static isBookmarkItem(thing: any): thing is BookmarkItem {
    if (thing instanceof BookmarkItem) {
      return true;
    } else {
      return false;
    }
  }
}

export class BookmarkExplorer {
  treeDataProvider: BookmarkProvider;
  constructor(globalStoragePath: string) {
    const bookmarkPath = new BookmarkStoragePath(globalStoragePath);
    const storage = new BookmarkStorage(bookmarkPath.storageLocation, BOOKMARK_STORAGE_FILE);
    this.treeDataProvider = new BookmarkProvider(storage);

    // storage 도입 전 0.0.6 version 사용자의 경우 @legacy
    if (this.treeDataProvider.bookmarks.length < 1) {
      const bookmarkPaths = vscode.workspace.getConfiguration("multiProject").get("bookmarks", []);
      const bookmarks = bookmarkPaths.map(bookmarkPath => BookmarkStorage.createDefaultBookmark(bookmarkPath));
      storage.update(bookmarks);
    }

    vscode.window.createTreeView("bookmarkExplorer", { treeDataProvider: this.treeDataProvider });

    vscode.workspace.onDidChangeConfiguration(async cfg => {
      if (cfg.affectsConfiguration("multiProject.bookmarkStorageLocation")) {
        const newStorage = new BookmarkStorage(bookmarkPath.storageLocation, BOOKMARK_STORAGE_FILE);
        this.treeDataProvider.setStorage(newStorage);
      }
    });
  }

  getCommands() {
    return [
      createCommand("bookmarkExplorer.openFile", this.openFile),
      createCommand("bookmarkExplorer.editBookmark", this.openBookmarkFile),
      createCommand("bookmarkExplorer.addBookmark", this.addBookmark),
      createCommand("bookmarkExplorer.removeBookmark", this.removeBookmark),
      createCommand("bookmarkExplorer.refreshBookmarkExplorerEntry", this.refresh),
    ];
  }

  refresh() {
    this.treeDataProvider.refresh();
  }

  openBookmarkFile() {
    openResource(this.treeDataProvider.storage._uri);
  }

  openFile(resource: any) {
    openResource(resource);
  }

  addBookmark(thing: vscode.Uri | ProjectItem, uriList: vscode.Uri[]) {
    const params = ProjectItem.isProejctItem(thing) ? [vscode.Uri.file(thing.project.path)] : uriList;
    const filteredUriList = this.treeDataProvider.filterType(params, vscode.FileType.Directory);
    const filePathList = getFilePath(filteredUriList);
    const bookmarks = filePathList.map(filePath => BookmarkStorage.createDefaultBookmark(filePath));
    const resultBookmarks = this.treeDataProvider.bookmarks.concat(bookmarks);
    this.treeDataProvider.updateBookmarks(resultBookmarks);
  }

  removeBookmark(treeItem: BookmarkItem) {
    const name = treeItem.bookmark.name;
    // const filePathlist = getFilePath(treeItem);

    const bookmarks = this.treeDataProvider.bookmarks;
    this.removeABC(bookmarks, name);
    this.treeDataProvider.updateBookmarks(bookmarks);
  }

  removeABC(bookmarks: BookmarksType, name: string): boolean {
    let targetIndex = -1;
    for (let index = 0; index < bookmarks.length; index++) {
      const bookmark = bookmarks[index];

      if (bookmark.name === name) {
        targetIndex = index;
        break;
      }

      if (isBookmarkFolder(bookmark)) {
        const result = this.removeABC(bookmark.children, name);
        if (result) return true;
      }
    }

    if (targetIndex > -1) {
      bookmarks.splice(targetIndex, 1);
      return true;
    }

    return false;
  }
}
