import * as expect from "expect"; // jest matchers
import { spyOn } from "jest-mock";
import { after, before, beforeEach } from "mocha";
import path = require("path");
import * as vscode from "vscode";
import { PROJECT_STORAGE_FILE } from "../../constants";
import { ProjectItem } from "../../explorer/multiProjectExplorer";
import { ContextValueType, IProject } from "../../type";
import { getData, getMultiProjectProvider, initStorage, restoreConfig, saveConfig, setConfig, sleep } from "../helper";
import { mock, mockedOpenVSCode, spyCreateTerminal, spyExecuteCommand, spyShowInputBox, spyShowQuickPick, spyShowTextDocument } from "../__mock__";
// const mock = new ModuleMocker(globalThis);

const PROJECT_STORAGE_LOCATION = "c:\\multiProjectTest";
const PROJECT_STORAGE_FULL_PATH = path.join(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FILE);
const initProjectData: IProject[] = [
  {
    path: "c:\\JS_pattern_test",
    name: "JS_pattern_test",
  },
  {
    path: "c:\\cypress-testbed",
    name: "cypress-testbed",
  },
];

before(() => {
  saveConfig();
});

after(() => {
  // 기존 config 작업 복원
  restoreConfig();
});

suite("Multi Project Explorer", () => {
  before(async () => {
    await setConfig("projectStorageLocation", PROJECT_STORAGE_LOCATION);
  });

  beforeEach(() => {
    mock.clearAllMocks();
  });

  test("add multiple project from UI", async () => {
    // File 등록 안함 / 이미 존재하는 Project면 제외
    const initProjectData: IProject[] = [
      {
        path: "c:\\immer",
        name: "immer",
      },
    ];
    initStorage(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep(50);
    const uriList = [vscode.Uri.file("c:\\JS_pattern_test"), vscode.Uri.file("c:\\cypress-testbed"), vscode.Uri.file("c:\\cypress-testbed\\src\\App.tsx"), vscode.Uri.file("c:\\immer")];

    await vscode.commands.executeCommand("multiProjectExplorer.addProject", null, uriList);

    const data = getData(PROJECT_STORAGE_FULL_PATH);
    expect(data).toHaveLength(3);
    expect(data).toEqual([
      {
        path: "c:\\immer",
        name: "immer",
      },
      {
        path: "c:\\JS_pattern_test",
        name: "JS_pattern_test",
      },
      {
        path: "c:\\cypress-testbed",
        name: "cypress-testbed",
      },
    ]);
    expect(data).not.toContain([
      {
        path: "c:\\cypress-testbed\\src\\App.tsx",
        name: "App.tsx",
      },
    ]);
  });

  test("remove project from UI", async () => {
    initStorage(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep(10);
    const project: IProject = {
      path: "c:\\cypress-testbed",
      name: "cypress-testbed",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    await vscode.commands.executeCommand("multiProjectExplorer.removeProject", projectItem);

    const data = getData(PROJECT_STORAGE_FULL_PATH);
    expect(data).toHaveLength(1);
    expect(data).toEqual([
      {
        path: "c:\\JS_pattern_test",
        name: "JS_pattern_test",
      },
    ]);
  });

  test("rename project", async () => {
    initStorage(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep(10);

    function stubbedShowInputBox(options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Thenable<string | undefined> {
      return new Promise((resolve, reject) => {
        resolve("renamed folder");
      });
    }

    spyShowInputBox.mockImplementationOnce(stubbedShowInputBox);

    const project: IProject = {
      path: "c:\\cypress-testbed",
      name: "cypress-testbed",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    await vscode.commands.executeCommand("multiProjectExplorer.renameProject", projectItem);

    const data = getData(PROJECT_STORAGE_FULL_PATH);
    expect(data).toHaveLength(2);
    expect(data).toEqual([
      {
        path: "c:\\JS_pattern_test",
        name: "JS_pattern_test",
      },
      {
        path: "c:\\cypress-testbed",
        name: "renamed folder",
      },
    ]);
  });

  test("open project", async () => {
    const project: IProject = {
      path: "c:\\cypress-testbed",
      name: "cypress-testbed",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);
    const quickPickItem = {
      label: projectItem.label || "프로젝트 라벨이 없습니다.",
      projectItem,
    };
    spyShowQuickPick.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          resolve(quickPickItem);
        })
    );

    await vscode.commands.executeCommand("multiProjectExplorer.openProject", projectItem);

    expect(spyShowQuickPick).toBeCalledTimes(1);
    expect(spyExecuteCommand).toBeCalledTimes(1);
    expect(mockedOpenVSCode).toHaveBeenCalledWith(quickPickItem.projectItem.resourceUri, true);
  });

  test("open file", async () => {
    const resource = vscode.Uri.file("c:\\cypress-testbed\\cypress.json");

    await vscode.commands.executeCommand("multiProjectExplorer.openFile", resource);

    expect(spyShowTextDocument).toHaveBeenCalledTimes(1);
    expect(spyShowTextDocument).toHaveBeenCalledWith(resource);
  });

  test("edit project file", async () => {
    await vscode.commands.executeCommand("multiProjectExplorer.editProject");

    const resource = vscode.Uri.file(PROJECT_STORAGE_FULL_PATH);
    expect(spyShowTextDocument).toHaveBeenCalledTimes(1);
    expect(spyShowTextDocument.mock.calls[0][0].fsPath).toEqual(resource.fsPath);
  });

  test("open folder", async () => {
    const project: IProject = {
      path: "c:\\cypress-testbed",
      name: "cypress-testbed",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    await vscode.commands.executeCommand("multiProjectExplorer.openFolder", projectItem);

    expect(spyExecuteCommand).toHaveBeenCalledTimes(1);
    expect(mockedOpenVSCode).toHaveBeenCalledWith(projectItem.resourceUri, true);
  });
  test("open terminal", async () => {
    // Terminal 없는 경우
    // Terminal 없는 경우 show, sendText 호출되는지 확인할 수 없는 테스트 코드임.. @TODO
    const project: IProject = {
      path: "c:\\cypress-testbed",
      name: "TestBed",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    await vscode.commands.executeCommand("multiProjectExplorer.openTerminal", projectItem);

    expect(spyCreateTerminal).toHaveBeenCalledTimes(1);
    expect(spyCreateTerminal).toHaveBeenCalledWith(projectItem.label);

    // Terminal 있는 경우
    const targetTerminal = vscode.window.terminals.find(terminal => terminal.name === projectItem.label);

    if (!targetTerminal) {
      expect(targetTerminal).not.toBeUndefined();
      return;
    }

    mock.spyOn(targetTerminal, "show");
    mock.spyOn(targetTerminal, "sendText");

    await vscode.commands.executeCommand("multiProjectExplorer.openTerminal", projectItem);

    expect(targetTerminal.name).toBe(projectItem.label);
    expect(targetTerminal.show).toHaveBeenCalled();
    expect(targetTerminal.sendText).toHaveBeenCalledWith(`cd ${projectItem.project.path}`);
  });
});

suite("Multi Project Provider", () => {
  test("project item with directory", () => {
    const project = {
      path: "c:\\testFolder",
      name: "testFolder",
    };
    // const file = {
    //   path: "c:\\cypress-testbed\\cypress.json",
    //   name: "cypress.json"
    // }

    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    expect(projectItem.label).toBe(project.name);
    expect(projectItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
    expect(projectItem.resourceUri).toEqual(vscode.Uri.file(project.path));
    expect(projectItem.contextValue).toBe(ContextValueType.Project);
    expect(projectItem.iconPath).toEqual(new vscode.ThemeIcon("root-folder"));
    expect(projectItem.type).toBe(vscode.FileType.Unknown);
  });

  test("project item with file", () => {
    const projectFile = {
      path: "c:\\cypress-testbed\\cypress.json",
      name: "cypress.json",
    };

    const projectItem = new ProjectItem(projectFile, vscode.FileType.File);

    expect(projectItem.label).toBe(projectFile.name);
    expect(projectItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
    expect(projectItem.resourceUri).toEqual(vscode.Uri.file(projectFile.path));
    expect(projectItem.contextValue).toBe(ContextValueType.File);
    expect(projectItem.iconPath).toBeUndefined();
    expect(projectItem.type).toBe(vscode.FileType.File);
    expect(projectItem.command).toEqual({ command: "multiProjectExplorer.openFile", title: "Open File", arguments: [projectItem.resourceUri] });
  });

  test("get children at first load", async () => {
    initStorage(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep(10);

    const treeDataProvider = getMultiProjectProvider();
    const expectedProjectItems = initProjectData.map(project => new ProjectItem(project, vscode.FileType.Unknown));

    const projectItems = await treeDataProvider.getChildren();

    expect(expectedProjectItems).toEqual(projectItems);
  });

  test("get children from project item", async () => {
    // node_moduels 제외, git 포함된 목록 리턴
    await setConfig("ignoredFolders", ["node_modules"]);
    await setConfig("fileName", "git");

    const treeDataProvider = getMultiProjectProvider();
    const project = {
      path: "c:\\testFolder",
      name: "testFolder",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    const projectItems = await treeDataProvider.getChildren(projectItem);

    const expectedProjectItems = [
      new ProjectItem(
        {
          path: "c:\\testFolder\\.gitignore",
          name: ".gitignore",
        },
        vscode.FileType.File
      ),
      new ProjectItem(
        {
          path: "c:\\testFolder\\src",
          name: "src",
        },
        vscode.FileType.Directory
      ),
    ];
    expect(expectedProjectItems).toEqual(projectItems);
    expect(projectItems).not.toContain(
      new ProjectItem(
        {
          path: "c:\\testFolder\\node_modules",
          name: "node_modules",
        },
        vscode.FileType.Directory
      )
    );
    expect(projectItems).not.toContain(
      new ProjectItem(
        {
          path: "c:\\testFolder\\App.tsx",
          name: "App.tsx",
        },
        vscode.FileType.File
      )
    );
  });

  test("sync and refresh when projects.json changes", async () => {
    initStorage(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, []);
    await sleep(50);
    const treeDataProvider = getMultiProjectProvider();
    const spyTreeDataProviderRefresh = spyOn(treeDataProvider, "refresh");

    initStorage(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, [
      {
        path: "c:\\testFolder\\src",
        name: "src",
      },
    ]);
    await sleep(50);

    expect(treeDataProvider.projects).toEqual([
      {
        path: "c:\\testFolder\\src",
        name: "src",
      },
    ]);
    expect(spyTreeDataProviderRefresh).toHaveBeenCalled();
    spyTreeDataProviderRefresh.mockRestore();
  });
});
