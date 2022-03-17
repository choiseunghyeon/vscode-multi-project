# Multi Project Extension 제작 회고

## 제작 동기

현재 다니고 있는 ECount 회사는 Client/Server Framework를 자체 제작해서 사용한다.  
신규 Framework를 제작 중인데 핵심 개념은 모듈화다.  
가능한 모듈로 분리하고 조립하여 하나의 기능, 사이트를 제작한다는 컨셉이다.

이런 식의 개발 방식에는 여러 이점이 있다.

1. 코드의 재사용
2. 모듈이 담당하는 로직에만 집중
3. 테스트하기 좋다.

지금은 개발 초기라 개발 및 관리해야 하는 모듈이 굉장히 많다.  
문제는 각 모듈마다 Visual Studio Code를 켜서 개발을 했는데  
켜져 있는 Visual Studio Code가 많아서 특정 모듈을 찾기 힘들었다.

이 불편함을 해소하기 위해 Multi Project Extension을 제작했다.

## 사용자

이 불편함을 가지고 있는게 우리 회사 뿐만 있다고 생각하지는 않아서 최대한 많은 사람을 타겟으로 제작을 했다.  
그래서 코드 구현이나 기능이 ECount 회사 종속적이지는 않다.

현재는 신규 Framework 제작 팀원 분들은 모두 사용하는 것 같다.

## 테스트

불편했던 삶을 살다가 편안한 삶을 살면 다시 못돌아간다는 것처럼  
회귀가 발생하면 이 Extension을 사용하는 사람들이 불편했던 환경으로 돌아가므로 테스트는 신경써서 진행했다.

Jest를 활용해서 Unit Test를 진행하려 했지만 Intergration Test로 방향을 바꿨다.  
그 이유는 다음과 같다.

1. Extension 구현 코드에서 vscode library에 의존적인 코드가 생기는데 이 vscode는 실제 구현 코드는 없고 dts 타입 정보만 제공되고 실제 Visual Studio Code가 구동될 때만 vscode 구현 코드에 접근할 수 있다.
   즉, Unit Test로 Extension을 테스트하면 vscode library 구현 코드가 없어서 정상적인 테스트가 불가능 했다.  
   \*구현 코드가 없어도 Mock 처리할 수 있지만 모든 vscode에 대해 Mock처리해야 해서 Mock처리하지는 않았다.
2. 프로세스 외부 의존성인 File System과의 소통하는 로직 검증을 위해(ex. file 수정 시 store 및 Tree View update)
3. E2E 테스트 진행이 어렵기 때문에 최대한 사용자 관점에서 진행하기 위해
4. 테스트 코드의 리팩터링 내성 및 회귀 방지 지표를 최대로 확보 하기 위해

## 기능 (README.md 일부 내용 발췌)

- Project Explorer

  1. Add Project

     - add a project or multi project from Explorer(ctrl + shift + E)
     - add a project from Multi Project Explorer

  2. Rename Project name

  3. Remove Project
  4. Ignore specific folders
  5. Open Terminal
  6. Sync Project with json file

     - you can add, remove, rename project through editing projects.json

  7. Quick open each project

     - search Multi Project: Open Project from command palette(ctrl + shift + p)
     - mouse over project then click door icon from Multi Project Explorer

- Bookmark Explorer

  1. Add Bookmark
     - add a bookmark or multi bookmark from Explorer(ctrl + shift + E)
     - add a bookmark from Multi Project Explorer
  2. Rename Bookmark name
  3. Sync Bookmark with json file
     - you can add, remove, rename bookmark through editing bookmarks.json
