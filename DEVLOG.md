## 개발 완료

- ignore folder 지정
- 설정 변경 값 즉시 반영
- add Proejct, remove Project 구현
- 해당 프로젝트 터미널 오픈
- 등록된 프로젝트 빠르게 열기(quickpick)
- Bookmark - 추가, 삭제
- 프로젝트 화면 띄우기(contextMenu, quickpick 등) - 버그 수정
- Add Multiple Project(다중 선택된 폴더 프로젝트로 지정) - file 선택되더라도 filtering됨
- 프로젝트 이름 변경(aliases)
- 필요한 값을 가져오기 위해 configuration 대신 globalStorage 사용으로 변경 (project, bookmark)
- 기존 configuration 사용되던 데이터 globarStorageUri로 이전

## 개발 예정

- 순서 변경
- 선택된 프로젝트 대상 검색
- 프로그레스바 표시
- github 기능 추가
- 원하는 task 등록하는 기능 (ex. 등록된 모든 project의 git fetch, 자동 rebase 또는 끌어오기 등)
- Task Flow 개발 - 정해진 task들을 등록하여 task 자동화
  - 등록된 프로젝트의 task list up해서 보여준 후 task flow에 등록하도록 제공할 예정
    - 한계: 현재 workspace에 있는 task만 가져옴 vscode.tasks.fetchTasks()
    - multi-root workspaces를 사용하면 workspaceFolders로 등록된 각 workspace에서 tasks 정보 가져올 수 있지만 검색 및 explorer 그리고 ctrl + shift + b(run build tasks)또한 통합되어 tasks들이 나옴 - 불편해짐
- 테스트 코드 작성
  - sleep 들어가는 코드 수정해야함 처리 속도에 따라 테스트 케이스 실패할 수 있음 - readFileSync mocking?
  - 리팩토링

## 기능

- Project Explorer

  1. alises 별칭 지정
  2. 프로젝트 추가(다중) / 삭제
  3. 특정 폴더 숨기기(ignore folder)
  4. 프로젝트 터미널 오픈
  5. 프로젝트 빠르게 열기

- Bookmark Explorer

  1. alises 별칭 지정
  2. Bookmark 추가(다중) / 삭제
  3. editor 열기

- Storage
  1. 필요한 데이터를 저장 및 Data Model 역할
