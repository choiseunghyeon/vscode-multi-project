import { MultiProjectExplorer, ProjectItem } from "../src/explorer/multiProjectExplorer";
import { IProject } from "../src/type";

// jest.mock("vscode");

// const vscode = require("vscode");
import * as vscode from "vscode";

const project: IProject = {
  path: "c:\\Users\\ket87\\OneDrive\\바탕 화면\\filebrowser-master",
  name: "filebrowser-master",
};
let multiProjectExplorer: MultiProjectExplorer;
const globalStoragePath = "c:\\Users\\ket87\\OneDrive\\바탕 화면\\filebrowser-master";

describe("Multi Project Explorer", () => {
  beforeEach(() => {
    multiProjectExplorer = new MultiProjectExplorer(globalStoragePath);
  });
  it("openFolder", async () => {
    const multiProjectExplorer = new MultiProjectExplorer(globalStoragePath);
    const projectItem = new ProjectItem(project, vscode.FileType.Unknown);
    await multiProjectExplorer.openFolder(projectItem);

    expect(vscode.commands.executeCommand).toHaveBeenCalled();
    // expect(vscode.commands.executeCommand).toHaveBeenCalledWith("vscode.openFolder", projectItem.resourceUri, true);
  });
});
