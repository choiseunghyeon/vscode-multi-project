import * as vscode from "vscode";
import * as path from "path";
import { getFilePath } from "./utils";
import { FileSystemProvider } from "./FileSystemProvider";
import { IProject } from "./type";
import { showInputBox } from "./quickPick";
import { ProjectPath, Storage } from "./Storage";

//#region Utilities

//#endregion

export class MultiProjectProvider extends FileSystemProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | void> = new vscode.EventEmitter<ProjectItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {
    super();
  }

  // get storageLocation(): string {
  //   vscode.workspace.getConfiguration("multiProject").get<string>("storageLocation", "");

  //   return
  // }

  get fileName(): string {
    return vscode.workspace.getConfiguration("multiProject").get("fileName", "*");
  }

  get projectPaths(): string[] {
    return vscode.workspace.getConfiguration("multiProject").get("projectPaths", []);
  }

  async updateProjectPaths(projectPaths: string[]) {
    await vscode.workspace.getConfiguration("multiProject").update("projectPaths", projectPaths, vscode.ConfigurationTarget.Global);
    await this.updateProjectStateWith(this.projectPaths);
  }

  loadProjectsFile() {
    // this.storage.load();
    // const errorLoading: string = this.storage.load();
    // // how to handle now, since the extension starts 'at load'?
    // if (errorLoading !== "") {
    //     const optionOpenFile = <vscode.MessageItem> {
    //         title: "Open File"
    //     };
    //     vscode.window.showErrorMessage("Error loading projects.json file. Message: " + errorLoading, optionOpenFile).then(option => {
    //         // nothing selected
    //         if (typeof option === "undefined") {
    //             return;
    //         }
    //         if (option.title === "Open File") {
    //             vscode.commands.executeCommand("projectManager.editProjects");
    //         } else {
    //             return;
    //         }
    //     });
    //     return null;
    // }
  }

  get projects(): IProject[] {
    const projects = this.context.globalState.get<IProject[]>("projects");
    if (projects === undefined) {
      return [];
    }
    return projects;
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
      const elementUri = vscode.Uri.file(element.project.path);
      const children = await this.readDirectory(elementUri);
      return this.filterChildren(children, elementUri.fsPath);
    }

    // 첫 로드
    if (this.projects.length > 0) {
      return this.projects.map(project => new ProjectItem(project, vscode.FileType.Unknown));
    }
    return [];
  }

  getTreeItem(element: ProjectItem): ProjectItem {
    return element;
  }

  private filterChildren(children: [string, vscode.FileType][], filepath: string) {
    return children.reduce((result: ProjectItem[], [name, type]) => {
      if (this.validateFile(name, type)) {
        const project: IProject = {
          path: path.join(filepath, name),
          name: name,
        };
        result.push(new ProjectItem(project, type));
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

  updateProjectStateWith(projectPaths: string[]) {
    // projectState object로 변환 시 proejctPaths 변경 시 update 하는 비용 감소함
    const projects = this.projects;
    const newProject = projectPaths.map(projectPath => {
      const existProject = projects.find(project => project.path === projectPath);
      if (existProject) {
        return {
          ...existProject,
        };
      }

      return {
        path: projectPath,
        name: projectPath.split(path.sep).pop() || projectPath,
      };
    });
    this.updateProjects(newProject);
  }

  updateProjects(projectState: IProject[]) {
    this.context.globalState.update("projects", projectState);
    this.refresh();
  }
}

export class ProjectItem extends vscode.TreeItem {
  projectLabel: string | undefined;
  constructor(public project: IProject, public readonly type: vscode.FileType) {
    super(project.name, type === vscode.FileType.File ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
    if (this.type === vscode.FileType.Unknown) {
      this.projectLabel = project.name;
      this.label = project.name;
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
  treeDataProvider: MultiProjectProvider;
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

    // const projectPath = new ProjectPath(context);
    // const storage = new Storage(projectPath.storageFilePath);
    this.treeDataProvider = new MultiProjectProvider(context);

    // globalState 도입 전 0.0.6 version 사용자의 경우 @legacy
    if (this.treeDataProvider.projects.length < 1) {
      this.treeDataProvider.updateProjectStateWith(this.treeDataProvider.projectPaths);
    }
    context.subscriptions.push(vscode.window.createTreeView("multiProjectExplorer", { treeDataProvider: this.treeDataProvider }));
    vscode.commands.registerCommand("multiProjectExplorer.openFile", resource => this.openResource(resource));
    vscode.commands.registerCommand("multiProjectExplorer.refreshEntry", () => this.treeDataProvider.refresh());
    vscode.commands.registerCommand("multiProjectExplorer.openFolder", async (treeItem: ProjectItem) => {
      const uri = treeItem.resourceUri;
      const openInNewWindow = true;
      await vscode.commands.executeCommand("vscode.openFolder", uri, openInNewWindow);
    });

    context.subscriptions.push(
      vscode.commands.registerCommand("multiProjectExplorer.renameProject", async (treeItem: ProjectItem) => {
        // console.log(args);
        debugger;
        const projects = this.treeDataProvider.projects;
        const project = projects.find(project => project.path === treeItem.project.path);
        if (project === undefined) {
          return;
        }

        const newName = await showInputBox(project.name, "변경하실 이름을 입력해주세요");
        project.name = newName ?? project.name;
        this.treeDataProvider.updateProjects(projects);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("multiProjectExplorer.addProject", async (uri: vscode.Uri, uriList: vscode.Uri[]) => {
        // console.log(args);
        const filteredUriList = await this.treeDataProvider.filterUri(uriList, vscode.FileType.File);
        const filePathList = getFilePath(filteredUriList);
        const resultPaths = this.treeDataProvider.projectPaths.concat(filePathList);
        this.treeDataProvider.updateProjectPaths(resultPaths);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("multiProjectExplorer.removeProject", (treeItem: ProjectItem) => {
        // console.log(args);
        const filePathList = getFilePath(treeItem);
        const resultPaths = this.treeDataProvider.projectPaths.filter(projectPath => !filePathList.includes(projectPath));
        this.treeDataProvider.updateProjectPaths(resultPaths);
      })
    );

    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async cfg => {
        if (cfg.affectsConfiguration("multiProject.projectPaths")) {
          // filePath 모양 맞추기 c, d드라이브의 경우 대소문자로 들어올 수 있음
          const resultPaths = this.treeDataProvider.projectPaths.map(projectPath => vscode.Uri.file(projectPath).fsPath);
          this.treeDataProvider.updateProjectPaths(resultPaths);
        }

        if (cfg.affectsConfiguration("multiProject.fileName") || cfg.affectsConfiguration("multiProject.projectPaths") || cfg.affectsConfiguration("multiProject.ignoredFolders")) {
          this.treeDataProvider.refresh();
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
        const selectedQuickPickItem = await this.selectProject();

        if (!selectedQuickPickItem) return;

        const openInNewWindow = true;
        await vscode.commands.executeCommand("vscode.openFolder", selectedQuickPickItem.projectItem.resourceUri, openInNewWindow);
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

  private async selectProject() {
    interface ProjectQuickPickItem extends vscode.QuickPickItem {
      projectItem: ProjectItem;
    }

    const projectItems = await this.treeDataProvider.getChildren();
    const items: ProjectQuickPickItem[] = projectItems.map(projectItem => ({
      label: projectItem?.project.name || "프로젝트 라벨이 없습니다.",
      projectItem,
    }));

    const selectedQuickPickItem = await vscode.window.showQuickPick(items);
    return selectedQuickPickItem;
  }
}
