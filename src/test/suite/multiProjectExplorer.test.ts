import * as expect from "expect"; // jest matchers
import { afterEach, before, beforeEach } from "mocha";
import path = require("path");
import { ModuleMocker } from "jest-mock";
import * as vscode from "vscode";
import { PROJECT_STORAGE_FILE } from "../../constants";
import { ProjectItem } from "../../explorer/multiProjectExplorer";
import { IProject } from "../../type";
import { getData, initStorage, setConfig, sleep } from "../helper";

const mock = new ModuleMocker(globalThis);

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

suite("Multi Project Explorer", () => {
  before(async () => {
    await setConfig("projectStorageLocation", PROJECT_STORAGE_LOCATION);
  });

  beforeEach(() => {
    mock.restoreAllMocks();
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
    vscode.window.showInputBox = mock.fn(stubbedShowInputBox);

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
    const mockedExecuteCommand = mock.spyOn(vscode.commands, "executeCommand");
    const mockedShowQuickPick = mock.spyOn(vscode.window, "showQuickPick").mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          resolve(quickPickItem);
        })
    );

    await vscode.commands.executeCommand("multiProjectExplorer.openProject", projectItem);

    expect(mockedShowQuickPick).toBeCalledTimes(1);
    expect(mockedExecuteCommand).toBeCalledTimes(2);
    expect(mockedExecuteCommand).toHaveBeenLastCalledWith("vscode.openFolder", quickPickItem.projectItem.resourceUri, true);
  });

  test("open file", async () => {
    const spyFn = mock.spyOn(vscode.window, "showTextDocument");
    const resource = vscode.Uri.file("c:\\cypress-testbed\\cypress.json");

    await vscode.commands.executeCommand("multiProjectExplorer.openFile", resource);

    expect(spyFn).toHaveBeenCalledTimes(1);
    expect(spyFn).toHaveBeenCalledWith(resource);
    spyFn.mockReset();
  });

  test("edit project file", async () => {
    const spyFn = mock.spyOn(vscode.window, "showTextDocument");

    await vscode.commands.executeCommand("multiProjectExplorer.editProject");

    const resource = vscode.Uri.file(PROJECT_STORAGE_FULL_PATH);
    expect(spyFn).toHaveBeenCalledTimes(1);
    expect(spyFn.mock.calls[0][0].fsPath).toEqual(resource.fsPath);
  });

  test("open folder", async () => {
    const spyFn = mock.spyOn(vscode.commands, "executeCommand");
    const project: IProject = {
      path: "c:\\cypress-testbed",
      name: "cypress-testbed",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

    await vscode.commands.executeCommand("multiProjectExplorer.openFolder", projectItem);

    expect(spyFn).toHaveBeenCalledTimes(2);
    expect(spyFn).toHaveBeenLastCalledWith("vscode.openFolder", projectItem.resourceUri, true);
  });
});
