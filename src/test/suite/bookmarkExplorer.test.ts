import * as expect from "expect"; // jest matchers
import { before, beforeEach } from "mocha";
import path = require("path");
import * as vscode from "vscode";
import { BOOKMARK_STORAGE_FILE } from "../../constants";
import { ProjectItem } from "../../explorer/multiProjectExplorer";
import { ContextValueType, IBookmark, IProject } from "../../type";
import { getBookmarkProvider, getData, initStorage, setConfig, sleep } from "../helper";
import { BookmarkItem } from "../../explorer/bookmarkExplorer";
import { mock, spyShowTextDocument } from "../__mock__";
import { spyOn } from "jest-mock";

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
    const resource = vscode.Uri.file("c:\\cypress-testbed\\cypress.json");

    await vscode.commands.executeCommand("bookmarkExplorer.openFile", resource);

    expect(spyShowTextDocument).toHaveBeenCalledTimes(1);
    expect(spyShowTextDocument).toHaveBeenCalledWith(resource);
  });

  test("edit bookmarks.json file", async () => {
    await vscode.commands.executeCommand("bookmarkExplorer.editBookmark");

    const resource = vscode.Uri.file(BOOKMARK_STORAGE_FULL_PATH);
    expect(spyShowTextDocument).toHaveBeenCalledTimes(1);
    expect(spyShowTextDocument.mock.calls[0][0].fsPath).toEqual(resource.fsPath);
  });
});

suite("Bookmark Provider", () => {
  test("bookmark item with file", () => {
    const bookmark = {
      path: "c:\\cypress-testbed\\cypress.json",
      name: "cypress.json",
    };

    const bookmarkItem = new BookmarkItem(bookmark, vscode.FileType.File);

    expect(bookmarkItem.label).toBe(bookmark.name);
    expect(bookmarkItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
    expect(bookmarkItem.iconPath).toEqual(new vscode.ThemeIcon("extensions-star-full"));
    expect(bookmarkItem.contextValue).toBe(ContextValueType.File);
    expect(bookmarkItem.type).toBe(vscode.FileType.File);
    expect(bookmarkItem.command).toEqual({ command: "multiProjectExplorer.openFile", title: "Open File", arguments: [vscode.Uri.file(bookmark.path)] });
  });

  test("get children at first load", async () => {
    initStorage(BOOKMARK_STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep(10);

    const treeDataProvider = getBookmarkProvider();
    const expectedBookmarkItems = initBookmarkData.map(bookmark => new BookmarkItem(bookmark, vscode.FileType.File));

    const bookmarkItems = await treeDataProvider.getChildren();

    expect(expectedBookmarkItems).toEqual(bookmarkItems);
  });

  test("sync and refresh when projects.json changes", async () => {
    initStorage(BOOKMARK_STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, []);
    await sleep(50);
    const treeDataProvider = getBookmarkProvider();
    const spyTreeDataProviderRefresh = spyOn(treeDataProvider, "refresh");

    const initBookmarkData = [
      {
        path: "c:\\cypress-testbed\\cypress.json",
        name: "cypress.json",
      },
    ];
    initStorage(BOOKMARK_STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep(50);

    expect(treeDataProvider.bookmarks).toEqual(initBookmarkData);
    expect(spyTreeDataProviderRefresh).toHaveBeenCalled();
    spyTreeDataProviderRefresh.mockRestore();
  });
});
