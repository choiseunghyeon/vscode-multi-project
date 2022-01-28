import * as expect from "expect"; // jest matchers
import { before } from "mocha";
import path = require("path");
import { fn } from "jest-mock";
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { PROJECT_STORAGE_FILE } from "../../constants";
import { ProjectItem } from "../../explorer/multiProjectExplorer";
import { IProject } from "../../type";
import { getData, initProjectStorage, setConfig, sleep } from "../helper";
// import * as myExtension from '../../extension';
suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Should start extension multi project", () => {
    const multiProjectExtension = vscode.extensions.getExtension("choiseunghyeon.multi-project");
    expect(multiProjectExtension).not.toBeUndefined();
    expect(multiProjectExtension?.isActive).toBe(true);
  });

  // test("open folder", async () => {
  //   const project: IProject = {
  //     path: "c:\\Users\\ket87\\OneDrive\\바탕 화면\\filebrowser-master",
  //     name: "filebrowser-master",
  //   };
  //   const projectItem = new ProjectItem(project, vscode.FileType.Unknown);

  //   const result = await vscode.commands.executeCommand("multiProjectExplorer.openFolder", projectItem);
  //   console.log(result);
  // });
});

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
function mockedExecuteCommand<T>(command: string, ...rest: any[]): Thenable<T | undefined> {
  return new Promise((resolve, reject) => {
    resolve();
  });
}

suite("Multi Project Explorer", () => {
  before(async () => {
    await setConfig("projectStorageLocation", PROJECT_STORAGE_LOCATION);
  });

  test("add multiple project from UI", async () => {
    const initProjectData: IProject[] = [];
    initProjectStorage(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep(10);
    const uriList = [vscode.Uri.file("c:\\JS_pattern_test"), vscode.Uri.file("c:\\cypress-testbed"), vscode.Uri.file("c:\\cypress-testbed\\src\\App.tsx")];

    await vscode.commands.executeCommand("multiProjectExplorer.addProject", null, uriList);

    const data = getData(PROJECT_STORAGE_FULL_PATH);
    expect(data).toHaveLength(2);
    expect(data).toEqual([
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
    initProjectStorage(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
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
    initProjectStorage(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep(10);

    function mockedShowInputBox(options?: vscode.InputBoxOptions, token?: vscode.CancellationToken): Thenable<string | undefined> {
      return new Promise((resolve, reject) => {
        resolve("renamed folder");
      });
    }
    vscode.window.showInputBox = fn(mockedShowInputBox);

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
    vscode.commands.executeCommand = fn(mockedExecuteCommand);

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
});
