export function getFilePath(args: any): string {
  return (
    args?.fsPath || // explorer/context
    args?.resourceUri?.fsPath // view/item/context
  );
}
