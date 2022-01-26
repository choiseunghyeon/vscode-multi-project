import * as expect from "expect"; // jest matchers
import { beforeEach } from "mocha";
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { ProjectItem } from "../../explorer/multiProjectExplorer";
import { IProject } from "../../type";
import { getData, initProjectStorage, setConfig } from "../helper";
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

suite("Multi Project Explorer", () => {
  beforeEach(async () => {
    await setConfig("projectStorageLocation", "c:\\multiProjectTest");
    initProjectStorage("c:\\multiProjectTest", "c:\\multiProjectTest\\projects.json", "[]");
  });

  test("add project", async () => {
    // onDidChangeFile가 비동기로 발생하여 onDidChangeFile 발생 전에 test가 처리되어 실패하게 됌
    // {
    //   "path": "c:\\JS_pattern_test",
    //   "name": "JS_pattern_test"
    // },
    const uri = vscode.Uri.file("c:\\JS_pattern_test");
    await vscode.commands.executeCommand("multiProjectExplorer.addProject", uri, [uri]);

    const data = getData("c:\\multiProjectTest\\projects.json");
    expect(data).toHaveLength(1);
    expect(data).toEqual([
      {
        path: "c:\\JS_pattern_test",
        name: "JS_pattern_test",
      },
    ]);
  });
});
