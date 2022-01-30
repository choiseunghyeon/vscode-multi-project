import * as expect from "expect"; // jest matchers
import { before, beforeEach } from "mocha";
import path = require("path");
import * as vscode from "vscode";
import { PROJECT_STORAGE_FILE } from "../../constants";
import { ProjectItem } from "../../explorer/multiProjectExplorer";
import { IProject } from "../../type";
import { getData, initStorage, setConfig, sleep } from "../helper";
import { mock, spyExecuteCommand, spyShowInputBox, spyShowQuickPick, spyShowTextDocument } from "../__mock__";
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
    expect(spyExecuteCommand).toBeCalledTimes(2);
    expect(spyExecuteCommand).toHaveBeenLastCalledWith("vscode.openFolder", quickPickItem.projectItem.resourceUri, true);
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

    expect(spyExecuteCommand).toHaveBeenCalledTimes(2);
    expect(spyExecuteCommand).toHaveBeenLastCalledWith("vscode.openFolder", projectItem.resourceUri, true);
  });
});
