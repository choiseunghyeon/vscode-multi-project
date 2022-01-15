import * as vscode from "vscode";
import * as path from "path";
import { getFilePath } from "./utils";
import { FileSystemProvider } from "./FileSystemProvider";

//#region Utilities

//#endregion

export class MultiProjectProvider extends FileSystemProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | void> = new vscode.EventEmitter<ProjectItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor() {
    super();
  }

  get fileName(): string {
    return vscode.workspace.getConfiguration("multiProject").get("fileName", "*");
  }

  get projectPaths(): string[] {
    return vscode.workspace.getConfiguration("multiProject").get("projectPaths", []);
  }

  get ignoredFolders(): string[] {
    return vscode.workspace.getConfiguration("multiProject").get("ignoredFolders", []);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // tree data provider
  async getChildren(element?: ProjectItem): Promise<ProjectItem[]> {
    if (element) {
      const children = await this.readDirectory(element.resourceUri);
      return this.filterChildren(children, element.resourceUri.fsPath);
    }

    // 첫 로드

    if (this.projectPaths.length > 0) {
      return this.projectPaths.map(path => new ProjectItem(vscode.Uri.file(path), vscode.FileType.Unknown));
    }
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
      if (this.ignoredFolders.some(ignoreFolderName => ignoreFolderName === name)) return false;
      return true;
    } else {
      // 파일 검증
      if (this.fileName === "*") return true;
      else if (name.includes(this.fileName)) return true;

      return true;
    }
  }
}

export class ProjectItem extends vscode.TreeItem {
  projectLabel: string | undefined;
  constructor(public readonly resourceUri: vscode.Uri, public readonly type: vscode.FileType) {
    super(resourceUri, type === vscode.FileType.File ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);

    if (this.type === vscode.FileType.Unknown) {
      this.projectLabel = resourceUri.fsPath.split(path.sep).pop();
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
        this.contextValue = "default";
        break;
    }
  }

  static isProejctItem(thing: any): thing is ProjectItem {
    if (thing instanceof ProjectItem) {
      return true;
    } else {
      return false;
    }
  }
}

export class MultiProjectExplorer {
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
    const treeDataProvider = new MultiProjectProvider();
    context.subscriptions.push(vscode.window.createTreeView("multiProjectExplorer", { treeDataProvider }));
    vscode.commands.registerCommand("multiProjectExplorer.openFile", resource => this.openResource(resource));
    vscode.commands.registerCommand("multiProjectExplorer.refreshEntry", () => treeDataProvider.refresh());
    vscode.commands.registerCommand("multiProjectExplorer.openFolder", async args => {
      const uri = args.resourceUri;
      const openInNewWindow = true;
      await vscode.commands.executeCommand("vscode.openFolder", uri, openInNewWindow);
    });

    context.subscriptions.push(
      vscode.commands.registerCommand("multiProjectExplorer.addProject", async (uri: vscode.Uri, uriList: vscode.Uri[]) => {
        // console.log(args);
        const filteredUriList = await treeDataProvider.filterUri(uriList, vscode.FileType.File);
        const filePathList = getFilePath(filteredUriList);
        const resultPaths = treeDataProvider.projectPaths.concat(filePathList);
        vscode.workspace.getConfiguration("multiProject").update("projectPaths", resultPaths, vscode.ConfigurationTarget.Global);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("multiProjectExplorer.removeProject", (treeItem: ProjectItem) => {
        // console.log(args);
        const filePathList = getFilePath(treeItem);
        const reulstPaths = treeDataProvider.projectPaths.filter(projectPath => !filePathList.includes(projectPath));
        vscode.workspace.getConfiguration("multiProject").update("projectPaths", reulstPaths, vscode.ConfigurationTarget.Global);
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(cfg => {
        if (cfg.affectsConfiguration("multiProject.projectPaths")) {
          // filePath 모양 맞추기 c, d드라이브의 경우 대소문자로 들어올 수 있음
          const resultPaths = treeDataProvider.projectPaths.map(projectPath => vscode.Uri.file(projectPath).fsPath);
          vscode.workspace.getConfiguration("multiProject").update("projectPaths", resultPaths, vscode.ConfigurationTarget.Global);
        }

        if (cfg.affectsConfiguration("multiProject.fileName") || cfg.affectsConfiguration("multiProject.projectPaths") || cfg.affectsConfiguration("multiProject.ignoredFolders")) {
          treeDataProvider.refresh();
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("multiProjectExplorer.openTerminal", (treeItem: ProjectItem) => {
        const filePathList = getFilePath(treeItem);
        filePathList.forEach(filePath => {
          const terminal = this.getProjectTerminal(filePath);
          terminal.show();
          // 한글 지원 안됌 한글의 경우 ''로 감싸면 가능
          terminal.sendText(`cd ${filePath}`);
        });
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("multiProjectExplorer.openProject", async () => {
        const selectedQuickPickItem = await this.selectProject(treeDataProvider);

        if (!selectedQuickPickItem) return;

        const openInNewWindow = true;
        await vscode.commands.executeCommand("vscode.openFolder", selectedQuickPickItem.project.resourceUri, openInNewWindow);
      })
    );
  }

  private openResource(resource: vscode.Uri): void {
    vscode.window.showTextDocument(resource);
  }

  private getProjectTerminal(filePath: string) {
    const { name } = path.parse(filePath);

    const terminal = vscode.window.terminals.find(terminal => terminal.name === name);
    if (terminal) {
      return terminal;
    } else {
      return vscode.window.createTerminal(`${name}`);
    }
  }

  private async selectProject(treeDataProvider: MultiProjectProvider) {
    interface ProjectQuickPickItem extends vscode.QuickPickItem {
      project: ProjectItem;
    }

    const projectItems = await treeDataProvider.getChildren();
    const items: ProjectQuickPickItem[] = projectItems.map(project => ({
      label: project?.projectLabel || "프로젝트 라벨이 없습니다.",
      project,
    }));

    const selectedQuickPickItem = await vscode.window.showQuickPick(items);
    return selectedQuickPickItem;
  }
}
