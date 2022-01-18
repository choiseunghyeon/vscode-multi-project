import { Uri } from "vscode";
import * as path from "path";
import { IProject } from "../type";
import { Storage } from "./storage";

export class ProjectStorage extends Storage {
  constructor(location: string, fileName: string) {
    super(location, fileName);
  }

  get defaultStorageValue(): any {
    return [];
  }

  update(projects: IProject[]) {
    // path 통일
    projects.forEach(project => (project.path = Uri.file(project.path).fsPath));

    try {
      this.writeFileSync(projects);
      this.syncDataFromDiskFile();
    } catch (error) {
      console.error(`file update 중 오류가 발생했습니다. ${error}`);
    }
  }

  static createDefaultProject(projectPath: string, name?: string): IProject {
    const defaultName = name ?? projectPath.split(path.sep).pop();
    return {
      path: projectPath,
      name: defaultName ?? "",
    };
  }
}
