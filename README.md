# 내 팀 HQ (Vercel 배포용)

AI 팀원 5명(마케터1·2, 막내 신입, PD, 디자이너)이 있는 업무 대시보드입니다.

## 구조
```
index.html     화면 전체 (프론트엔드)
api/ask.js     서버 함수: Anthropic API 호출 (키는 여기서만 사용)
vercel.json    함수 최대 실행 시간 60초
```

## 배포 방법
1. 이 폴더를 GitHub 저장소에 올립니다. (`.env`는 올리지 마세요)
2. Vercel > Add New > Project 에서 저장소를 Import 합니다. (Framework: Other, 빌드 설정 없음)
3. Settings > Environment Variables 에 아래를 추가합니다.

| 이름 | 값 | 필수 |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com 에서 발급한 키 | 필수 |
| `ACCESS_CODE` | 팀원에게 알려줄 접근 코드 (아무 문자열) | 필수 |
| `ANTHROPIC_MODEL` | 기본값 `claude-sonnet-5-5` | 선택 |
| `ENABLE_SEARCH` | `false` 로 두면 마케터1의 웹 검색 끔 | 선택 |

4. Deploy 후 환경변수를 추가했다면 Redeploy 해야 반영됩니다.

CLI로 하려면: `npm i -g vercel` → 폴더에서 `vercel` → `vercel --prod`

## 로컬 테스트
`.env.local` 파일에 `ANTHROPIC_API_KEY=...` 와 `ACCESS_CODE=...` 를 적고 `vercel dev` 를 실행하세요.
(index.html만 파일로 열면 /api/ask 가 없어서 AI가 동작하지 않습니다.)

## 공유하기
배포된 주소(`https://프로젝트명.vercel.app`)와 접근 코드를 함께 알려주세요.
처음 접속하면 코드를 묻고, 이후에는 그 브라우저에 저장됩니다.
접근 코드가 없으면 API 비용이 남에게 나갈 수 있어서 서버가 요청을 거절하도록 해두었습니다.

## 참고
- 사용료는 API 키 주인의 Anthropic 계정에서 나갑니다. 콘솔에서 월 사용 한도를 걸어두세요.
- 마케터1의 웹 검색은 Anthropic 콘솔(Privacy 설정)에서 web search가 켜져 있어야 합니다. 안 되면 `ENABLE_SEARCH=false`.
- 입력값과 마지막 결과는 각자 브라우저(localStorage)에만 저장됩니다.
- 팀원 추가: `index.html` 의 `TEAM` 배열에 항목을 추가하거나, 화면의 "＋ 팀원 충원"을 쓰세요.
