const parentProject = {
  path: "c:\\testFolder",
  name: "testFolder",
};

const childrenProject = [
  {
    path: "c:\\testFolder\\.gitignore",
    name: ".gitignore",
  },
  {
    path: "c:\\testFolder\\App.tsx",
    name: "App.tsx",
  },
  {
    path: "c:\\testFolder\\src",
    name: "src",
  },
  {
    path: "c:\\testFolder\\node_modules",
    name: "node_modules",
  },
];

export const fixture = { parentProject, childrenProject };
