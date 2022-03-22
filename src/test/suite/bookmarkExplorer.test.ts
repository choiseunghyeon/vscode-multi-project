import * as expect from "expect"; // jest matchers
import { before, beforeEach } from "mocha";
import path = require("path");
import * as vscode from "vscode";
import { BOOKMARK_STORAGE_FILE } from "../../constants";
import { ProjectItem } from "../../explorer/multiProjectExplorer";
import { BookmarksType, ContextValueType, IBookmark, IBookmarkFolder, IProject } from "../../type";
import { getBookmarkProvider, getData, initStorage, restoreConfig, saveConfig, setConfig, sleep, STORAGE_LOCATION, TEST_FOLDER_LOCATION } from "../helper";
import { BookmarkItem } from "../../explorer/bookmarkExplorer";
import { mock, spyShowTextDocument } from "../__mock__";
import { spyOn } from "jest-mock";

const BOOKMARK_STORAGE_FULL_PATH = path.join(STORAGE_LOCATION, BOOKMARK_STORAGE_FILE);
const initBookmarkData: BookmarksType = [
  {
    path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.test.tsx`,
    name: "App.test.tsx",
  },
  {
    path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
    name: "App.tsx",
  },
];

suite("Bookmark Explorer", () => {
  before(async () => {
    await setConfig("bookmarkStorageLocation", STORAGE_LOCATION);
  });

  beforeEach(() => {
    mock.clearAllMocks();
  });

  test("add multiple bookmark from Explorer", async () => {
    const initBookmarkData: BookmarksType = [];
    initStorage(STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep();
    const uriList = [
      vscode.Uri.file(`${TEST_FOLDER_LOCATION}\\JS_pattern_test`),
      vscode.Uri.file(`${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`),
      vscode.Uri.file(`${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.test.tsx`),
    ];

    await vscode.commands.executeCommand("bookmarkExplorer.addBookmark", null, uriList);

    const data = getData(BOOKMARK_STORAGE_FULL_PATH);
    expect(data).toHaveLength(2);
    expect(data).toEqual([
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
        name: "App.tsx",
      },
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.test.tsx`,
        name: "App.test.tsx",
      },
    ]);
    expect(data).not.toContain([
      {
        path: `${TEST_FOLDER_LOCATION}\\JS_pattern_test`,
        name: "JS_pattern_test",
      },
    ]);
  });

  test("add bookmark from Multi Project Explorer", async () => {
    const initBookmarkData: IProject[] = [];
    initStorage(STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep();
    const project: IProject = {
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
      name: "App.tsx",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.File);

    await vscode.commands.executeCommand("bookmarkExplorer.addBookmark", projectItem);

    const data = getData(BOOKMARK_STORAGE_FULL_PATH);
    expect(data).toHaveLength(1);
    expect(data).toEqual([
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
        name: "App.tsx",
      },
    ]);
  });

  test("remove bookmark from UI", async () => {
    initStorage(STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep();
    const bookmark: IBookmark = {
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
      name: "App.tsx",
    };
    const bookmarkItem = new BookmarkItem(bookmark, vscode.FileType.File);

    await vscode.commands.executeCommand("bookmarkExplorer.removeBookmark", bookmarkItem);

    const data = getData(BOOKMARK_STORAGE_FULL_PATH);
    expect(data).toHaveLength(1);
    expect(data).toEqual([
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.test.tsx`,
        name: "App.test.tsx",
      },
    ]);
  });

  test("remove bookmark folder from UI", async () => {
    const initBookmarkData: BookmarksType = [
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.test.tsx`,
        name: "App.test.tsx",
      },
      {
        name: "AFolder",
        children: [
          {
            path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
            name: "App.tsx",
          },
        ],
      },
    ];
    initStorage(STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep();
    const bookmark: IBookmarkFolder = {
      name: "AFolder",
      children: [
        {
          path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
          name: "App.tsx",
        },
      ],
    };
    const bookmarkItem = new BookmarkItem(bookmark, vscode.FileType.Directory);

    await vscode.commands.executeCommand("bookmarkExplorer.removeBookmark", bookmarkItem);

    const data = getData(BOOKMARK_STORAGE_FULL_PATH);
    expect(data).toHaveLength(1);
    expect(data).toEqual([
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.test.tsx`,
        name: "App.test.tsx",
      },
    ]);
  });

  test("remove bookmark file inside folder from UI", async () => {
    const initBookmarkData: BookmarksType = [
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.test.tsx`,
        name: "App.test.tsx",
      },
      {
        name: "AFolder",
        children: [
          {
            path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
            name: "App.tsx",
          },
        ],
      },
    ];
    initStorage(STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep();
    const bookmark: IBookmark = {
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
      name: "App.tsx",
    };
    const bookmarkItem = new BookmarkItem(bookmark, vscode.FileType.File);

    await vscode.commands.executeCommand("bookmarkExplorer.removeBookmark", bookmarkItem);

    const data = getData(BOOKMARK_STORAGE_FULL_PATH);
    expect(data).toHaveLength(2);
    expect(data).toEqual([
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.test.tsx`,
        name: "App.test.tsx",
      },
      {
        name: "AFolder",
        children: [],
      },
    ]);
  });

  test("open file", async () => {
    const resource = vscode.Uri.file(`${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`);

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
  test("bookmark file item with file", () => {
    const bookmark = {
      path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\cypress.json`,
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

  test("bookmark folder with folder", () => {
    const bookmark: IBookmarkFolder = {
      name: "App.tsx",
      children: [
        {
          path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
          name: "App.tsx",
        },
      ],
    };

    const bookmarkItem = new BookmarkItem(bookmark, vscode.FileType.Directory);

    expect(bookmarkItem.label).toBe(bookmark.name);
    expect(bookmarkItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
    expect(bookmarkItem.iconPath).toEqual(new vscode.ThemeIcon("file-directory"));
    expect(bookmarkItem.contextValue).toBe(ContextValueType.Folder);
    expect(bookmarkItem.type).toBe(vscode.FileType.Directory);
    // expect(bookmarkItem.command).toEqual({ command: "multiProjectExplorer.openFile", title: "Open File", arguments: [vscode.Uri.file(bookmark.path)] });
  });

  test("get children at first load", async () => {
    const initBookmarkData: BookmarksType = [
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.test.tsx`,
        name: "App.test.tsx",
      },
      {
        name: "App.tsx",
        children: [
          {
            path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
            name: "App.tsx",
          },
        ],
      },
    ];
    initStorage(STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep();

    const treeDataProvider = getBookmarkProvider();
    const expectedBookmarkItems = [new BookmarkItem(initBookmarkData[0], vscode.FileType.File), new BookmarkItem(initBookmarkData[1], vscode.FileType.Directory)];

    const bookmarkItems = await treeDataProvider.getChildren();

    expect(expectedBookmarkItems).toEqual(bookmarkItems);
  });

  test("get children from bookmark folder item", async () => {
    const treeDataProvider = getBookmarkProvider();
    const bookmark = {
      name: "App.tsx",
      children: [
        {
          path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
          name: "App.tsx",
        },
      ],
    };
    const bookmarkItem = new BookmarkItem(bookmark, vscode.FileType.Directory);

    const bookmarkItems = await treeDataProvider.getChildren(bookmarkItem);

    const expectedBookmarkItems = [
      new BookmarkItem(
        {
          path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
          name: "App.tsx",
        },
        vscode.FileType.File
      ),
    ];
    expect(expectedBookmarkItems).toEqual(bookmarkItems);
  });

  test("sync and refresh when projects.json changes", async () => {
    initStorage(STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, []);
    await sleep();
    const treeDataProvider = getBookmarkProvider();
    const spyTreeDataProviderRefresh = spyOn(treeDataProvider, "refresh");

    const initBookmarkData = [
      {
        path: `${TEST_FOLDER_LOCATION}\\cypress-testbed\\App.tsx`,
        name: "App.tsx",
      },
    ];
    initStorage(STORAGE_LOCATION, BOOKMARK_STORAGE_FULL_PATH, initBookmarkData);
    await sleep();

    expect(treeDataProvider.bookmarks).toEqual(initBookmarkData);
    expect(spyTreeDataProviderRefresh).toHaveBeenCalled();
    spyTreeDataProviderRefresh.mockRestore();
  });
});
