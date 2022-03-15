import * as vscode from "vscode";
import * as path from "path";
import { createCommand, createTreeItemCommand, getFilePath } from "../utils/utils";
import { FileSystemProvider } from "../FileSystemProvider";
import { ContextValueType, IProject } from "../type";
import { PROJECT_STORAGE_FILE } from "../constants";
import { ProjectStorage } from "../storage/projectStorage";
import { ProjectStoragePath } from "../storage/storage";
import { getConfigurationFileName, getConfigurationIgnoredFolders, openResource, openVSCode, showInputBox } from "../utils/native";

export class MultiProjectProvider extends FileSystemProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | void> = new vscode.EventEmitter<ProjectItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(public storage: ProjectStorage) {
    super();
    this.loadStorage();
  }

  loadStorage() {
    this.storage.load();
    this.storage.onDidChangeFile(e => {
      this.storage.syncDataFromDiskFile();
      this.refresh();
    });
    this.refresh();
  }

  setStorage(newStorage: ProjectStorage) {
    this.storage.unload();

    this.storage = newStorage;
    this.loadStorage();
  }

  hasProject(targetProject: IProject) {
    const findedProject = this.projects.find(project => project.path === targetProject.path);
    return findedProject !== undefined;
  }

  get fileName(): string {
    return getConfigurationFileName();
  }

  get ignoredFolders(): string[] {
    return getConfigurationIgnoredFolders();
  }

  get projects(): IProject[] {
    return this.storage.data;
  }

  updateProjects(projects: IProject[]) {
    this.storage.update(projects);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // tree data provider
  async getChildren(element?: ProjectItem): Promise<ProjectItem[]> {
    if (element) {
      const elementUri = vscode.Uri.file(element.project.path);
      const children = await this.readDirectory(elementUri);
      const filteredChildren = this.getProjectItems(children, elementUri.fsPath);
      return this.sortChildren(filteredChildren);
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

  private sortChildren(treeItems: ProjectItem[]): ProjectItem[] {
    const directory: ProjectItem[] = [];
    const files: ProjectItem[] = [];

    treeItems.forEach((treeItem: ProjectItem) => {
      if (treeItem.type === vscode.FileType.File) {
        files.push(treeItem);
      } else {
        directory.push(treeItem);
      }
    });

    return directory.concat(files);
  }

  private getProjectItems(children: [string, vscode.FileType][], filepath: string): ProjectItem[] {
    return children.reduce((result: ProjectItem[], [name, type]) => {
      if (this.validateFile(name, type)) {
        const project: IProject = ProjectStorage.createDefaultProject(path.join(filepath, name), name);
        result.push(new ProjectItem(project, type));
      }
      return result;
    }, []);
  }

  private validateFile(name: string, type: vscode.FileType): boolean {
    if (type === vscode.FileType.Directory) {
      // 폴더 검증
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
      } else {
        return false;
      }
    }
  }
}

export class ProjectItem extends vscode.TreeItem {
  label: string | undefined;
  contextValue?: ContextValueType;
  constructor(public project: IProject, public readonly type: vscode.FileType) {
    super(project.name, type === vscode.FileType.File ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
    this.resourceUri = vscode.Uri.file(project.path);
    if (this.type === vscode.FileType.Unknown) {
      this.iconPath = new vscode.ThemeIcon("root-folder");
    }

    if (type === vscode.FileType.File) {
      this.command = createTreeItemCommand("multiProjectExplorer.openFile", "Open File", [this.resourceUri]);
    }

    this.setContextValue();
  }

  setContextValue() {
    switch (this.type) {
      case vscode.FileType.Unknown:
        this.contextValue = ContextValueType.Project;
        break;
      case vscode.FileType.File:
        this.contextValue = ContextValueType.File;
        break;
      case vscode.FileType.Directory:
        this.contextValue = ContextValueType.ProjectChild;
        break;
      default:
        this.contextValue = ContextValueType.Default;
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
    const projectPath = new ProjectStoragePath(globalStoragePath);
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

      if (cfg.affectsConfiguration("multiProject.projectStorageLocation")) {
        const newStorage = new ProjectStorage(projectPath.storageLocation, PROJECT_STORAGE_FILE);
        this.treeDataProvider.setStorage(newStorage);
      }
    });
  }

  public getCommands() {
    return [
      createCommand("multiProjectExplorer.addProject", this.addProject),
      createCommand("multiProjectExplorer.removeProject", this.removeProject),
      createCommand("multiProjectExplorer.renameProject", this.renameProject),
      createCommand("multiProjectExplorer.openProject", this.openProject),
      createCommand("multiProjectExplorer.openFile", this.openFile),
      createCommand("multiProjectExplorer.editProject", this.editProjectFile),
      createCommand("multiProjectExplorer.openFolder", this.openFolder),
      createCommand("multiProjectExplorer.refreshProjectExplorerEntry", this.refresh),
      createCommand("multiProjectExplorer.openTerminal", this.openTerminal),
    ];
  }

  editProjectFile() {
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
    if (!uri) {
      return;
    }
    const openInNewWindow = true;
    await openVSCode(uri, openInNewWindow);
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

  async addProject(thing: vscode.Uri | ProjectItem, uriList: vscode.Uri[]) {
    // console.log(args);
    let filePathList;
    if (ProjectItem.isProejctItem(thing)) {
      filePathList = getFilePath(thing);
    } else {
      uriList = thing ? [thing] : uriList;
      const directoryUriList = this.treeDataProvider.filterType(uriList, vscode.FileType.File);
      filePathList = getFilePath(directoryUriList);
    }
    const projects = filePathList.map(projectPath => ProjectStorage.createDefaultProject(projectPath));
    const onlyNewProjects = projects.filter(project => !this.treeDataProvider.hasProject(project));
    const resultProjects = this.treeDataProvider.projects.concat(onlyNewProjects);

    this.treeDataProvider.updateProjects(resultProjects);
  }

  removeProject(treeItem: ProjectItem) {
    const filePathList = getFilePath(treeItem);
    const resultProjects = this.treeDataProvider.projects.filter(project => !filePathList.includes(project.path));
    this.treeDataProvider.updateProjects(resultProjects);
  }

  openTerminal(treeItem: ProjectItem) {
    const terminal = this.getProjectTerminal(treeItem.label || "No Label");
    terminal.show();
    // 한글 지원 안됌 한글의 경우 ''로 감싸면 가능
    terminal.sendText(`cd ${treeItem.project.path}`);
  }

  async openProject() {
    const selectedQuickPickItem = await this.selectProject();

    if (!selectedQuickPickItem) {
      return;
    }

    this.openFolder(selectedQuickPickItem.projectItem);
  }

  private getProjectTerminal(label: string) {
    const terminal = vscode.window.terminals.find(terminal => terminal.name === label);
    if (terminal) {
      return terminal;
    } else {
      return vscode.window.createTerminal(label);
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
