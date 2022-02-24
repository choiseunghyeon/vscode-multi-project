import * as expect from "expect"; // jest matchers
import { before, beforeEach } from "mocha";
import path = require("path");
import * as vscode from "vscode";
import { PROJECT_STORAGE_FILE } from "../../constants";
import { ProjectItem } from "../../explorer/multiProjectExplorer";
import { ContextValueType, IProject } from "../../type";
import { getData, getMultiProjectProvider, initStorage, restoreConfig, saveConfig, setConfig, sleep, STORAGE_LOCATION, TEST_FOLDER_LOCATION } from "../helper";
import { mock, mockedOpenVSCode, spyCreateTerminal, spyExecuteCommand, spyShowInputBox, spyShowQuickPick, spyShowTextDocument, spyTreeDataProviderRefresh } from "../__mock__";

const PROJECT_STORAGE_FULL_PATH = path.join(STORAGE_LOCATION, PROJECT_STORAGE_FILE);
const initProjectData: IProject[] = [
  {
    path: `${TEST_FOLDER_LOCATION}\\JS_pattern_test`,
    name: "JS_pattern_test",
  },
  {
    path: `${TEST_FOLDER_LOCATION}\\cypress-testbed`,
    name: "cypress-testbed",
  },
];
const emptyProjectData: IProject[] = [];

suite("Multi Project Explorer", () => {
  before(async () => {
    // configuration projectStorageLocation 변경 실시간 적용 안되는 경우 테스트 전부 깨짐
    await setConfig("projectStorageLocation", STORAGE_LOCATION);
  });

  beforeEach(() => {
    mock.clearAllMocks();
  });

  test("add multiple project from UI", async () => {
    // File 등록 안함 / 이미 존재하는 Project면 제외
    const initProjectData: IProject[] = [
      {
        path: `${TEST_FOLDER_LOCATION}\\portfolio_page`,
        name: "portfolio_page",
      },
    ];
    initStorage(STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep();
    const uriList = [
      vscode.Uri.file(`${TEST_FOLDER_LOCATION}\\JS_pattern_test`),
      vscode.Uri.file(`${TEST_FOLDER_LOCATION}\\cypress-testbed`),
      vscode.Uri.file(`${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`), // File Type
      vscode.Uri.file(`${TEST_FOLDER_LOCATION}\\portfolio_page`), // 이미 존재하는 project
    ];

    await vscode.commands.executeCommand("multiProjectExplorer.addProject", null, uriList);

    const data = getData(PROJECT_STORAGE_FULL_PATH);
    expect(data).toHaveLength(3);
    expect(data).toEqual([
      {
        path: `${TEST_FOLDER_LOCATION}\\portfolio_page`,
        name: "portfolio_page",
      },
      {
        path: `${TEST_FOLDER_LOCATION}\\JS_pattern_test`,
        name: "JS_pattern_test",
      },
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed`,
        name: "cypress-testbed",
      },
    ]);
    expect(data).not.toContain([
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
        name: "App.tsx",
      },
    ]);
  });

  test("add project child from UI", async () => {
    initStorage(STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, emptyProjectData);
    await sleep();
    const project: IProject = {
      path: `${TEST_FOLDER_LOCATION}\\portfolio_page`,
      name: "portfolio_page",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Directory);

    await vscode.commands.executeCommand("multiProjectExplorer.addProject", projectItem, undefined);

    const data = getData(PROJECT_STORAGE_FULL_PATH);
    expect(data).toHaveLength(1);
    expect(data).toEqual([
      {
        path: `${TEST_FOLDER_LOCATION}\\portfolio_page`,
        name: "portfolio_page",
      },
    ]);
  });

  test("remove project from UI", async () => {
    initStorage(STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep();
    const project: IProject = {
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed`,
      name: "cypress-testbed",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    await vscode.commands.executeCommand("multiProjectExplorer.removeProject", projectItem);

    const data = getData(PROJECT_STORAGE_FULL_PATH);
    expect(data).toHaveLength(1);
    expect(data).toEqual([
      {
        path: `${TEST_FOLDER_LOCATION}\\JS_pattern_test`,
        name: "JS_pattern_test",
      },
    ]);
  });

  test("rename project", async () => {
    initStorage(STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep();

    function stubbedShowInputBox(options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Thenable<string | undefined> {
      return new Promise((resolve, reject) => {
        resolve("renamed folder");
      });
    }

    spyShowInputBox.mockImplementationOnce(stubbedShowInputBox);

    const project: IProject = {
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed`,
      name: "cypress-testbed",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    await vscode.commands.executeCommand("multiProjectExplorer.renameProject", projectItem);

    const data = getData(PROJECT_STORAGE_FULL_PATH);
    expect(data).toHaveLength(2);
    expect(data).toEqual([
      {
        path: `${TEST_FOLDER_LOCATION}\\JS_pattern_test`,
        name: "JS_pattern_test",
      },
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed`,
        name: "renamed folder",
      },
    ]);
  });

  test("open project", async () => {
    const project: IProject = {
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed`,
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
    const resource = vscode.Uri.file(`${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.test.tsx`);

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
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed`,
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
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed`,
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

  test("refresh when fileName configuration has changed", async () => {
    await setConfig("fileName", "git");

    expect(spyTreeDataProviderRefresh).toHaveBeenCalled();
  });
  test("refresh when ignoredFolders configuration has changed", async () => {
    await setConfig("ignoredFolders", ["node_modules"]);

    expect(spyTreeDataProviderRefresh).toHaveBeenCalled();
  });
});

suite("Multi Project Provider", () => {
  test("project item with Unkown File Type", () => {
    // root project의 경우
    const project = {
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed`,
      name: "cypress-testbed",
    };

    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    expect(projectItem.label).toBe(project.name);
    expect(projectItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
    expect(projectItem.resourceUri).toEqual(vscode.Uri.file(project.path));
    expect(projectItem.contextValue).toBe(ContextValueType.Project);
    expect(projectItem.iconPath).toEqual(new vscode.ThemeIcon("root-folder"));
    expect(projectItem.type).toBe(vscode.FileType.Unknown);
  });

  test("project item with Directory", () => {
    // project 하위 project인 경우
    const project = {
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed`,
      name: "cypress-testbed",
    };

    const projectItem = new ProjectItem(project, vscode.FileType.Directory);

    expect(projectItem.label).toBe(project.name);
    expect(projectItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
    expect(projectItem.resourceUri).toEqual(vscode.Uri.file(project.path));
    expect(projectItem.contextValue).toBe(ContextValueType.ProjectChild);
    expect(projectItem.type).toBe(vscode.FileType.Directory);
  });

  test("project item with File", () => {
    const projectFile = {
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\cypress.json`,
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
    initStorage(STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep();

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
      path: `${TEST_FOLDER_LOCATION}\\portfolio_page`,
      name: "portfolio_page",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    const projectItems = await treeDataProvider.getChildren(projectItem);

    const expectedProjectItems = [
      new ProjectItem(
        {
          path: `${TEST_FOLDER_LOCATION}\\portfolio_page\\src`,
          name: "src",
        },
        vscode.FileType.Directory
      ),
      new ProjectItem(
        {
          path: `${TEST_FOLDER_LOCATION}\\portfolio_page\\.gitignore`,
          name: ".gitignore",
        },
        vscode.FileType.File
      ),
    ];
    expect(expectedProjectItems).toEqual(projectItems);
    expect(projectItems).not.toContain(
      new ProjectItem(
        {
          path: `${TEST_FOLDER_LOCATION}\\portfolio_page\\node_modules`,
          name: "node_modules",
        },
        vscode.FileType.Directory
      )
    );
    expect(projectItems).not.toContain(
      new ProjectItem(
        {
          path: `${TEST_FOLDER_LOCATION}\\portfolio_page\\App.tsx`,
          name: "App.tsx",
        },
        vscode.FileType.File
      )
    );
  });

  test("sort directory and file sequently", async () => {
    await setConfig("ignoredFolders", []);
    await setConfig("fileName", "*");

    const treeDataProvider = getMultiProjectProvider();
    const project = {
      path: `${TEST_FOLDER_LOCATION}\\JS_pattern_test`,
      name: "JS_pattern_test",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    const projectItems = await treeDataProvider.getChildren(projectItem);

    const expectedProjectItems = [
      new ProjectItem(
        {
          path: `${TEST_FOLDER_LOCATION}\\JS_pattern_test\\resources`,
          name: "resources",
        },
        vscode.FileType.Directory
      ),
      new ProjectItem(
        {
          path: `${TEST_FOLDER_LOCATION}\\JS_pattern_test\\server`,
          name: "server",
        },
        vscode.FileType.Directory
      ),
      new ProjectItem(
        {
          path: `${TEST_FOLDER_LOCATION}\\JS_pattern_test\\App.tsx`,
          name: "App.tsx",
        },
        vscode.FileType.File
      ),
      new ProjectItem(
        {
          path: `${TEST_FOLDER_LOCATION}\\JS_pattern_test\\index.html`,
          name: "index.html",
        },
        vscode.FileType.File
      ),
    ];
    expect(expectedProjectItems).toEqual(projectItems);
  });

  test("sync and refresh when projects.json changes", async () => {
    initStorage(STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, emptyProjectData);
    await sleep();
    const treeDataProvider = getMultiProjectProvider();

    initStorage(STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, [
      {
        path: `${TEST_FOLDER_LOCATION}\\portfolio_page\\src`,
        name: "src",
      },
    ]);
    await sleep();

    expect(treeDataProvider.projects).toEqual([
      {
        path: `${TEST_FOLDER_LOCATION}\\portfolio_page\\src`,
        name: "src",
      },
    ]);
    expect(spyTreeDataProviderRefresh).toHaveBeenCalled();
  });
});
