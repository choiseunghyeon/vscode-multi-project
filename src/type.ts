export interface IProject {
  name: string;
  path: string;
}

export interface IBookmark {
  name: string;
  path: string;
}

export interface IRegisterCommand {
  name: string;
  callback: Function;
}

export const enum ContextValueType {
  Project = "project",
  File = "file",
  Default = "default",
}
