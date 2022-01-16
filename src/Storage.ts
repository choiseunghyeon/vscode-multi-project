import path = require("path");
import fs = require("fs");
import * as vscode from "vscode";
import { STORAGE_FILE } from "./constants";
import { FileSystemProvider } from "./FileSystemProvider";
export class Storage extends FileSystemProvider {
  data: any;
  constructor(private uri: vscode.Uri) {
    super();
  }

  async load() {
    if (fs.existsSync(this.uri.path)) {
      this.data = await this.readFile(this.uri);
    } else {
      await fs.writeFile(this.uri.path, "", err => {
        if (err) throw err;
        console.log("created new projects.json");
      });
      this.data = "";
    }
  }
}

export class ProjectPath {
  constructor(private context: vscode.ExtensionContext) {}
  get storageFilePath() {
    const storageLocation = vscode.workspace.getConfiguration("multiProject").get<string>("storageLocation", "");
    let storagePath;
    if (storageLocation) {
      storagePath = storageLocation;
    } else {
      storagePath = this.context.globalStorageUri.path;
    }
    const fullPath = path.join(storagePath, STORAGE_FILE);
    return vscode.Uri.file(fullPath);
  }
}
