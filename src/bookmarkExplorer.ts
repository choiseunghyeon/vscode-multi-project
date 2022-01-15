import * as vscode from "vscode";
import * as path from "path";
import { getFilePath } from "./utils";
import { FileSystemProvider } from "./FileSystemProvider";

export class BookmarkProvider extends FileSystemProvider implements vscode.TreeDataProvider<BookmarkItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<BookmarkItem | undefined | void> = new vscode.EventEmitter<BookmarkItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<BookmarkItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor() {
    super();
  }

  get bookmarks(): string[] {
    return vscode.workspace.getConfiguration("multiProject").get("bookmarks", []);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // tree data provider
  async getChildren(element?: BookmarkItem): Promise<BookmarkItem[]> {
    if (element) {
      const children = await this.readDirectory(element.resourceUri);
      return this.filterChildren(children, element.resourceUri.fsPath);
    }

    // 첫 로드
    if (this.bookmarks.length > 0) {
      return this.bookmarks.map(path => new BookmarkItem(vscode.Uri.file(path), vscode.FileType.File));
    }

    return [];
  }

  getTreeItem(element: BookmarkItem): BookmarkItem {
    return element;
  }

  private filterChildren(children: [string, vscode.FileType][], filepath: string) {
    return children.reduce((result: BookmarkItem[], [name, type]) => {
      result.push(new BookmarkItem(vscode.Uri.file(path.join(filepath, name)), type));
      return result;
    }, []);
  }
}

export class BookmarkItem extends vscode.TreeItem {
  projectLabel: string | undefined;
  constructor(public readonly resourceUri: vscode.Uri, public readonly type: vscode.FileType) {
    super(resourceUri, vscode.TreeItemCollapsibleState.None);

    this.projectLabel = path.parse(resourceUri.fsPath).name;
    this.iconPath = new vscode.ThemeIcon("extensions-star-full");

    this.command = { command: "multiProjectExplorer.openFile", title: "Open File", arguments: [this.resourceUri] };
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
  constructor(context: vscode.ExtensionContext) {
    /**
     *         {
          "command": "multiProjectExplorer.aliases",
          "when": "view == multiProjectExplorer && viewItem == project"
        },
        {
          "command": "multiProjectExplorer.bookmark",
          "when": "view == multiProjectExplorer && viewItem == file"
        }
     */
    const treeDataProvider = new BookmarkProvider();
    context.subscriptions.push(vscode.window.createTreeView("bookmarkExplorer", { treeDataProvider }));
    vscode.commands.registerCommand("bookmarkExplorer.openFile", resource => this.openResource(resource));
    // vscode.commands.registerCommand("multiProjectExplorer.refreshEntry", () => treeDataProvider.refresh());

    context.subscriptions.push(
      vscode.commands.registerCommand("bookmarkExplorer.addBookmark", (thing: vscode.Uri | BookmarkItem, uriList: vscode.Uri[]) => {
        // console.log(args);
        const param = BookmarkItem.isBookmarkItem(thing) ? thing : uriList;
        const filePathList = getFilePath(param);
        const resultPaths = treeDataProvider.bookmarks.concat(filePathList);
        vscode.workspace.getConfiguration("multiProject").update("bookmarks", resultPaths, vscode.ConfigurationTarget.Global);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("bookmarkExplorer.removeBookmark", (treeItem: BookmarkItem) => {
        // console.log(args);
        const filePathlist = getFilePath(treeItem);
        const reulstPaths = treeDataProvider.bookmarks.filter(bookmark => !filePathlist.includes(bookmark));
        vscode.workspace.getConfiguration("multiProject").update("bookmarks", reulstPaths, vscode.ConfigurationTarget.Global);
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(cfg => {
        if (cfg.affectsConfiguration("multiProject.bookmarks")) {
          // filePath 모양 맞추기 c, d드라이브의 경우 대소문자로 들어올 수 있음
          const resultPaths = treeDataProvider.bookmarks.map(bookmark => vscode.Uri.file(bookmark).fsPath);
          vscode.workspace.getConfiguration("multiProject").update("bookmarks", resultPaths, vscode.ConfigurationTarget.Global);
        }

        if (cfg.affectsConfiguration("multiProject.bookmarks")) {
          treeDataProvider.refresh();
        }
      })
    );
  }

  private openResource(resource: vscode.Uri): void {
    vscode.window.showTextDocument(resource);
  }
}
