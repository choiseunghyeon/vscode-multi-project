/* eslint-disable @typescript-eslint/naming-convention */
export interface IProject {
  name: string;
  path: string;
}

export type BookmarksType = (IBookmark | IBookmarkFolder)[];
export interface IBookmark {
  name: string;
  path: string;
}

export interface IBookmarkFolder {
  name: string;
  children: BookmarksType;
}

export interface IRegisterCommand {
  name: string;
  callback: Function;
}

export const enum ContextValueType {
  Project = "project",
  ProjectChild = "projectChild",
  File = "file",
  Folder = "folder",
  Default = "default",
}
