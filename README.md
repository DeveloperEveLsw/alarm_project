이 프로젝트는 대학교 융합 팀 프로젝트입니다.
### 최초 clone시
``` python
npm install
# or
yarn install
# or
pnpm install
```

### 사전 개발환경 구축
- 안드로이드
  - 안드로이드 스튜디오 환경변수 추가
  - 안드로이드 스튜디오에서 Tools -> Device Managerd 예뮬 실행 cmd에 `adb devices` 입력하여 확인
  - 안드로이드 스튜디오 Tools -> SDK Manager -> SDK Tools -> NDK 선택하여 설치
  - 설치 된 NDK 버전에 맞춰서 워킹트리의 android/build.gradle의 ndkVersion 확인해서 다를시 수정(수정했으면 커밋에 **포함하지 말것**)
- ios
  - 작성 바람, expo go를 사용하며 ios는 Mac이 없으면 예뮬 테스트가 불가함

### 디버깅, 테스트 빌드
- 안드로이드
  - 안드로이드 스튜디오에서 예뮬을 작동시킨 다음에 터미널에 `react-native run-android` 입력 만약 안될시 `npx install`(임시 방편임) 혹은 npm 폴더 날리고 `npm install`
  - `react-native run-android` 쓰는 이유 오래 걸려도 실제 빌드랑 비슷함
  - 도중에 오류 나거나 0%에서 안오르면 사전 개발환경 구축의 NDK 확인
- ios
  - 해보고 정리해주세요



# 📚 STACKS
---
<img src="https://img.shields.io/badge/react native-61DAFB?style=for-the-badge&logo=react&logoColor=white">
