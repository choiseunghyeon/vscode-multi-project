import * as expect from "expect"; // jest matchers
import { before, beforeEach } from "mocha";
import path = require("path");
import { fn, spyOn, ModuleMocker } from "jest-mock";
import * as vscode from "vscode";
import { BOOKMARK_STORAGE_FILE, PROJECT_STORAGE_FILE } from "../../constants";
import { ProjectItem } from "../../explorer/multiProjectExplorer";
import { IBookmark, IProject } from "../../type";
import { getData, initStorage, setConfig, sleep } from "../helper";
import { BookmarkItem } from "../../explorer/bookmarkExplorer";
// import * as myExtension from '../../extension';
const mock = new ModuleMocker(globalThis);

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Should start extension multi project", () => {
    const multiProjectExtension = vscode.extensions.getExtension("choiseunghyeon.multi-project");
    expect(multiProjectExtension).not.toBeUndefined();
    expect(multiProjectExtension?.isActive).toBe(true);
  });
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

suite("Multi Project Explorer", () => {
  before(async () => {
    await setConfig("projectStorageLocation", PROJECT_STORAGE_LOCATION);
  });

  beforeEach(() => {
    mock.clearAllMocks();
  });

  test("add multiple project from UI", async () => {
    const initProjectData: IProject[] = [];
    initStorage(PROJECT_STORAGE_LOCATION, PROJECT_STORAGE_FULL_PATH, initProjectData);
    await sleep(50);
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

const BOOKMARK_STORAGE_LOCATION = "c:\\multiProjectTest";
const BOOKMARK_STORAGE_FULL_PATH = path.join(BOOKMARK_STORAGE_LOCATION, BOOKMARK_STORAGE_FILE);
const initBookmarkData: IBookmark[] = [
  {
    path: "c:\\cypress-testbed\\src\\App.test.tsx",
    name: "App.test.tsx",
  },
  {
    path: "c:\\cypress-testbed\\src\\App.tsx",
    name: "App.tsx",
  },
];
suite("Bookmark Explorer", () => {
  before(async () => {
    await setConfig("bookmarkStorageLocation", BOOKMARK_STORAGE_LOCATION);
  });

  beforeEach(() => {
    mock.clearAllMocks();
  });

  test("add multiple bookmark from Explorer", async () => {
    const initBookmarkData: IBookmark[] = [];
    initStorage(BOOKMARK_STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep(50);
    const uriList = [vscode.Uri.file("c:\\JS_pattern_test"), vscode.Uri.file("c:\\cypress-testbed\\src\\App.tsx"), vscode.Uri.file("c:\\cypress-testbed\\src\\App.test.tsx")];

    await vscode.commands.executeCommand("bookmarkExplorer.addBookmark", null, uriList);

    const data = getData(BOOKMARK_STORAGE_FULL_PATH);
    expect(data).toHaveLength(2);
    expect(data).toEqual([
      {
        path: "c:\\cypress-testbed\\src\\App.tsx",
        name: "App.tsx",
      },
      {
        path: "c:\\cypress-testbed\\src\\App.test.tsx",
        name: "App.test.tsx",
      },
    ]);
    expect(data).not.toContain([
      {
        path: "c:\\JS_pattern_test",
        name: "JS_pattern_test",
      },
    ]);
  });

  test("add bookmark from Multi Project Explorer", async () => {
    const initBookmarkData: IProject[] = [];
    initStorage(BOOKMARK_STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep(50);
    const project: IProject = {
      path: "c:\\cypress-testbed\\src\\App.tsx",
      name: "App.tsx",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.File);

    await vscode.commands.executeCommand("bookmarkExplorer.addBookmark", projectItem);

    const data = getData(BOOKMARK_STORAGE_FULL_PATH);
    expect(data).toHaveLength(1);
    expect(data).toEqual([
      {
        path: "c:\\cypress-testbed\\src\\App.tsx",
        name: "App.tsx",
      },
    ]);
  });

  test("remove bookmark from UI", async () => {
    initStorage(BOOKMARK_STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep(10);
    const bookmark: IBookmark = {
      path: "c:\\cypress-testbed\\src\\App.tsx",
      name: "App.tsx",
    };
    const bookmarkItem = new BookmarkItem(bookmark, vscode.FileType.File);

    await vscode.commands.executeCommand("bookmarkExplorer.removeBookmark", bookmarkItem);

    const data = getData(BOOKMARK_STORAGE_FULL_PATH);
    expect(data).toHaveLength(1);
    expect(data).toEqual([
      {
        path: "c:\\cypress-testbed\\src\\App.test.tsx",
        name: "App.test.tsx",
      },
    ]);
  });

  test("open file", async () => {
    const spyFn = mock.spyOn(vscode.window, "showTextDocument");
    const resource = vscode.Uri.file("c:\\cypress-testbed\\cypress.json");

    await vscode.commands.executeCommand("bookmarkExplorer.openFile", resource);

    expect(spyFn).toHaveBeenCalledTimes(1);
    expect(spyFn).toHaveBeenCalledWith(resource);
  });

  test("edit bookmarks.json file", async () => {
    const spyFn = mock.spyOn(vscode.window, "showTextDocument");

    await vscode.commands.executeCommand("bookmarkExplorer.editBookmark");

    const resource = vscode.Uri.file(BOOKMARK_STORAGE_FULL_PATH);
    expect(spyFn).toHaveBeenCalledTimes(1);
    expect(spyFn.mock.calls[0][0].fsPath).toEqual(resource.fsPath);
  });
});
