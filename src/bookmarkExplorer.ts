import * as vscode from "vscode";
import * as path from "path";
import { getFilePath } from "./utils/utils";
import { FileSystemProvider } from "./FileSystemProvider";
import { BookmarkStorage, StoragePath } from "./Storage";
import { BOOKMARK_STORAGE_FILE } from "./constants";
import { IBookmark } from "./type";
import { ProjectItem } from "./multiProjectExplorer";

export class BookmarkProvider extends FileSystemProvider implements vscode.TreeDataProvider<BookmarkItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<BookmarkItem | undefined | void> = new vscode.EventEmitter<BookmarkItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<BookmarkItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(private storage: BookmarkStorage) {
    super();
    storage.load();
    storage.onDidChangeFile(e => {
      this.refresh();
    });
  }

  get bookmarks(): IBookmark[] {
    return this.storage.bookmarks;
    // return vscode.workspace.getConfiguration("multiProject").get("bookmarks", []);
  }

  updateBookmarks(bookmarks: IBookmark[]) {
    this.storage.update(bookmarks);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // tree data provider
  async getChildren(element?: BookmarkItem): Promise<BookmarkItem[]> {
    if (element) {
      const elementUri = vscode.Uri.file(element.bookmark.path);
      const children = await this.readDirectory(elementUri);
      return this.filterChildren(children, elementUri.fsPath);
    }

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
  label: string | undefined;
  constructor(public bookmark: IBookmark, public readonly type: vscode.FileType) {
    super(bookmark.name, vscode.TreeItemCollapsibleState.None);

    this.label = bookmark.name;
    this.iconPath = new vscode.ThemeIcon("extensions-star-full");

    this.command = { command: "multiProjectExplorer.openFile", title: "Open File", arguments: [vscode.Uri.file(bookmark.path)] };
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

export class BookmarkExplorer {
  treeDataProvider: BookmarkProvider;
  constructor(context: vscode.ExtensionContext) {
    const bookmarkPath = new StoragePath(context);
    const storage = new BookmarkStorage(bookmarkPath.storageLocation, BOOKMARK_STORAGE_FILE);
    this.treeDataProvider = new BookmarkProvider(storage);

    context.subscriptions.push(vscode.window.createTreeView("bookmarkExplorer", { treeDataProvider: this.treeDataProvider }));
    vscode.commands.registerCommand("bookmarkExplorer.openFile", resource => this.openResource(resource));
    // vscode.commands.registerCommand("multiProjectExplorer.refreshEntry", () => treeDataProvider.refresh());

    context.subscriptions.push(
      vscode.commands.registerCommand("bookmarkExplorer.addBookmark", (thing: vscode.Uri | ProjectItem, uriList: vscode.Uri[]) => {
        // console.log(args);
        const param = ProjectItem.isProejctItem(thing) ? thing : uriList;
        const filePathList = getFilePath(param);
        const bookmarks = filePathList.map(filePath => BookmarkStorage.createDefaultBookmark(filePath));
        const resultBookmarks = this.treeDataProvider.bookmarks.concat(bookmarks);
        this.treeDataProvider.updateBookmarks(resultBookmarks);
        // vscode.workspace.getConfiguration("multiProject").update("bookmarks", resultBookmarks, vscode.ConfigurationTarget.Global);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("bookmarkExplorer.removeBookmark", (treeItem: BookmarkItem) => {
        // console.log(args);
        const filePathlist = getFilePath(treeItem);
        const resultBookmarks = this.treeDataProvider.bookmarks.filter(bookmark => !filePathlist.includes(bookmark.path));
        this.treeDataProvider.updateBookmarks(resultBookmarks);
        // vscode.workspace.getConfiguration("multiProject").update("bookmarks", reulstPaths, vscode.ConfigurationTarget.Global);
      })
    );
  }

  private openResource(resource: vscode.Uri): void {
    vscode.window.showTextDocument(resource);
  }
}
