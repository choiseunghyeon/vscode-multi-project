## 개발 예정

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

- workspace 추가
- 영어문서 제작
- bookmark 그룹화 및 정렬 기능
  - 진행중, bookmark folder 추가, 기존 bookmark folder로 이동 기능 추가

## Unit Test가 힘든 이유

- vscode.TreeItem의 경우 실제 class 코드가 없는 경우 해당 객체를 활용한 테스트가 어려움
- 사용하는 모든 vscode에 대한 mocking
- file update 시 storage 업데이트 되는 테스트 케이스 작성의 어려움

## 기능

- etc

  1. Configuration 변경 시 즉시 반영 (ignore folder, file name, project stroage location) - bookmark storage location은 refresh시 getChildren 실행되지 않음 코어 로직 분석 필요해 보임

- Project Explorer

  1. alises 별칭 지정
  2. 프로젝트 추가

     - Explorer에서 디렉토리 단일, 다중 추가
     - Multi Project Explorer에서 하위 디렉토리 단일 추가

  3. 프로젝트 삭제
  4. 특정 폴더 숨기기(ignore folder)
  5. 폴더 파일 순서로 표시
  6. 프로젝트 터미널 오픈
  7. 프로젝트 빠르게 열기 (command palette, explorer item context inline )

- Bookmark Explorer

  1. alises 별칭 지정
  2. Bookmark 추가(다중) / 삭제
  3. editor 열기

- Storage
  1. 필요한 데이터를 저장 및 Data Model 역할
