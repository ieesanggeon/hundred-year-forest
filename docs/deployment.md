# GitHub 및 Vercel 배포

## 구성

- GitHub 저장소: https://github.com/ieesanggeon/hundred-year-forest
- 브랜치: `main`
- 기술: Three.js, HTML/CSS, esbuild
- Vercel 설치: `npm ci`
- Vercel 빌드: `npm run build`
- 게시 폴더: `web-dist`

게임은 정적 파일로 실행된다. Python·Node 로컬 서버를 Vercel에서 장시간 실행할 필요가 없으며 데이터베이스·API 키·비밀 환경변수도 사용하지 않는다. `scripts/build-web.cjs`가 원본 게임을 번들로 묶고 HTML·CSS·음원만 게시 폴더로 복사한다.

## 로컬 확인

```powershell
npm ci
npm run build
npm test
```

Windows 사용자는 기존 `run_game.bat`으로 게임을 실행할 수 있다. 원본 `dist/game.bundle.js`도 저장소에 포함하여 의존성 설치 없이 배치파일로 실행하는 기존 방식을 유지한다.

## 업로드에서 제외하는 파일

`.gitignore`와 `.vercelignore`에서 의존성, 촬영 원본, 임시 인코딩 도구, 로컬 설정, 환경변수 파일을 제외한다. `.playtest`의 발표 영상과 검수 이미지는 이 컴퓨터에 그대로 보관된다. 실제 웹 게시물은 `web-dist` 안의 게임 실행 파일만 사용한다.

## 배포 확인 항목

- 첫 화면·Three.js 배경과 시작 버튼
- 컷신·스킵 후 HUD와 이동·전투
- 자바스크립트·스타일·지역별 배경음악 응답
- 원본 소스·테스트·촬영 폴더가 웹 게시 폴더에 포함되지 않는지
- Vercel 상태와 공개 주소의 HTTP 응답

기존 Vercel 프로젝트별 대표 주소와 전체 배포 이력은 로컬 `.playtest/vercel-links.md`에 따로 정리한다.
