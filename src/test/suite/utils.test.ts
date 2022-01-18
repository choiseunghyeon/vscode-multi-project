import { getFilePath } from "../../utils/utils";
import * as vscode from "vscode";
import { Uri } from "vscode";
import * as expect from "expect"; // jest matchers
import { ProjectItem } from "../../explorer/multiProjectExplorer";
import { BookmarkItem } from "../../explorer/bookmarkExplorer";

const PATH = "c:\\cypress-interlligent-testbed\\public";
const FILE_PATH = "c:\\cypress-interlligent-testbed\\public\\index.ts";
suite("Utils For Extension", () => {
  test("get File Path From Uri", () => {
    const expected = [PATH];
    const uri = Uri.file(PATH);

    const result = getFilePath([uri]);

    expect(result).toEqual(expected);
  });

  test("get File Path From Project", () => {
    const project = {
      path: PATH,
      name: "public",
    };
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);
    const expected = [PATH];

    const result = getFilePath(projectItem);

    expect(result).toEqual(expected);
  });

  test("get File Path From Bookmark", () => {
    const bookmark = {
      path: PATH + "\\index.ts",
      name: "index.ts",
    };
    const bookmarkItem = new BookmarkItem(bookmark, vscode.FileType.File);
    const expected = [FILE_PATH];

    const result = getFilePath(bookmarkItem);

    expect(result).toEqual(expected);
  });
});
