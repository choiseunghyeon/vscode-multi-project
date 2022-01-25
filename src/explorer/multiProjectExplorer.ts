import * as vscode from "vscode";
import * as path from "path";
import { createCommand, getFilePath } from "../utils/utils";
import { FileSystemProvider } from "../FileSystemProvider";
import { IProject, IRegisterCommand } from "../type";
import { showInputBox } from "../quickPick";
import { PROJECT_STORAGE_FILE } from "../constants";
import { ProjectStorage } from "../storage/projectStorage";
import { StoragePath } from "../storage/storage";
import { openResource } from "../utils/native";

export class MultiProjectProvider extends FileSystemProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | void> = new vscode.EventEmitter<ProjectItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(public storage: ProjectStorage) {
    super();
    storage.load();
    storage.onDidChangeFile(e => {
      storage.syncDataFromDiskFile();
      this.refresh();
    });
  }

  // get storageLocation(): string {
  //   vscode.workspace.getConfiguration("multiProject").get<string>("storageLocation", "");

  //   return
  // }

  get fileName(): string {
    return vscode.workspace.getConfiguration("multiProject").get("fileName", "*");
  }

  get projects(): IProject[] {
    return this.storage.data;
  }

  updateProjects(projects: IProject[]) {
    this.storage.update(projects);
  }

  get ignoredFolders(): string[] {
    return vscode.workspace.getConfiguration("multiProject").get("ignoredFolders", []);
  }

  public refresh(): void {
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
        const project: IProject = ProjectStorage.createDefaultProject(path.join(filepath, name), name);
        result.push(new ProjectItem(project, type));
      }
      return result;
    }, []);
  }

  private validateFile(name: string, type: vscode.FileType): boolean {
    // 폴더 검증
    if (type === vscode.FileType.Directory) {
      if (this.ignoredFolders.some(ignoreFolderName => ignoreFolderName === name)) {
        return false;
      }
      return true;
    } else {
      // 파일 검증
      if (this.fileName === "*") {
        return true;
      } else if (name.includes(this.fileName)) {
        return true;
      }

      return true;
    }
  }
}

export class ProjectItem extends vscode.TreeItem {
  label: string | undefined;
  constructor(public project: IProject, public readonly type: vscode.FileType) {
    super(project.name, type === vscode.FileType.File ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
    this.resourceUri = vscode.Uri.file(project.path);
    if (this.type === vscode.FileType.Unknown) {
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
  constructor(globalStoragePath: string) {
    const projectPath = new StoragePath(globalStoragePath);
    const storage = new ProjectStorage(projectPath.storageLocation, PROJECT_STORAGE_FILE);
    this.treeDataProvider = new MultiProjectProvider(storage);

    // storage 도입 전 0.0.6 version 사용자의 경우 @legacy
    if (this.treeDataProvider.projects.length < 1) {
      const projectPaths = vscode.workspace.getConfiguration("multiProject").get("projectPaths", []);
      const projects = projectPaths.map(projectPath => ProjectStorage.createDefaultProject(projectPath));
      storage.update(projects);
    }

    vscode.window.createTreeView("multiProjectExplorer", { treeDataProvider: this.treeDataProvider });
    vscode.workspace.onDidChangeConfiguration(async cfg => {
      if (cfg.affectsConfiguration("multiProject.fileName") || cfg.affectsConfiguration("multiProject.ignoredFolders")) {
        this.refresh();
      }
    });
  }

  public getCommands() {
    return [
      createCommand("multiProjectExplorer.openFile", this.openFile),
      createCommand("multiProjectExplorer.editProject", this.openProjectFile),
      createCommand("multiProjectExplorer.refreshEntry", this.refresh),
      createCommand("multiProjectExplorer.openFolder", this.openFolder),
      createCommand("multiProjectExplorer.renameProject", this.renameProject),
      createCommand("multiProjectExplorer.addProject", this.addProject),
      createCommand("multiProjectExplorer.removeProject", this.removeProject),
      createCommand("multiProjectExplorer.openTerminal", this.openTerminal),
      createCommand("multiProjectExplorer.openProject", this.openProject),
    ];
  }

  openProjectFile() {
    openResource(this.treeDataProvider.storage._uri);
  }

  openFile(resource: any) {
    openResource(resource);
  }

  refresh() {
    this.treeDataProvider.refresh();
  }

  async openFolder(treeItem: ProjectItem) {
    const uri = treeItem.resourceUri;
    const openInNewWindow = true;
    await vscode.commands.executeCommand("vscode.openFolder", uri, openInNewWindow);
  }

  async renameProject(treeItem: ProjectItem) {
    // console.log(args);
    const projects = this.treeDataProvider.projects;
    const project = projects.find(project => project.path === treeItem.project.path);
    if (project === undefined) {
      return;
    }

    const newName = await showInputBox(project.name, "변경하실 이름을 입력해주세요");
    project.name = newName ?? project.name;
    this.treeDataProvider.updateProjects(projects);
  }

  async addProject(uri: vscode.Uri, uriList: vscode.Uri[]) {
    // console.log(args);
    const filteredUriList = await this.treeDataProvider.filterType(uriList, vscode.FileType.File);
    const filePathList = getFilePath(filteredUriList);
    const projects = filePathList.map(projectPath => ProjectStorage.createDefaultProject(projectPath));
    const resultProjects = this.treeDataProvider.projects.concat(projects);
    this.treeDataProvider.updateProjects(resultProjects);
  }

  removeProject(treeItem: ProjectItem) {
    // console.log(args);
    const filePathList = getFilePath(treeItem);
    const resultProjects = this.treeDataProvider.projects.filter(project => !filePathList.includes(project.path));
    this.treeDataProvider.updateProjects(resultProjects);
  }

  openTerminal(treeItem: ProjectItem) {
    const filePathList = getFilePath(treeItem);
    filePathList.forEach(filePath => {
      const terminal = this.getProjectTerminal(filePath);
      terminal.show();
      // 한글 지원 안됌 한글의 경우 ''로 감싸면 가능
      terminal.sendText(`cd ${filePath}`);
    });
  }

  async openProject() {
    const selectedQuickPickItem = await this.selectProject();

    if (!selectedQuickPickItem) {
      return;
    }
    const openInNewWindow = true;
    await vscode.commands.executeCommand("vscode.openFolder", selectedQuickPickItem.projectItem.resourceUri, openInNewWindow);
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
      label: projectItem.label || "프로젝트 라벨이 없습니다.",
      projectItem,
    }));

    const selectedQuickPickItem = await vscode.window.showQuickPick(items);
    return selectedQuickPickItem;
  }
}
