# 현재 공개 글과 Second Brain 출처 연결 검수

2026-11-10(KST), [R3 Step 0](../../../phases/public-knowledge-connections/step0.md)을 완료했다. 기준 commit은 `38c3348472b48b77f8e71d8278ceda52c75e4b6e`다. R2의 [원고](EVIDENCE_CASE_MANUSCRIPT_REVIEW.md)와 [기록 후보](BRAIN_PRINCIPLE_DRAFT_REVIEW.md)는 계속 비공개 검토본이며 이번 검증은 별도 합성 DB에서 수행했다.

## 구현한 동작

- 관리자 출처 입력에서 `/blog/[slug]`를 허용한다. 상대 주소는 기존과 같은 소문자·숫자·하이픈 slug 형식이며 목록·Markdown·query/fragment가 붙은 상대 주소는 거부한다. 저장 parser는 값과 공백을 보존하고 기존 공개 명령·revision·불변 이력을 사용한다.
- 서버의 `loadPublicBrain`은 파일 카탈로그 또는 공개 DB 사본을 읽은 뒤 `resolveBrainBlogSources`로 출처만 투영한다. 내부 Blog 출처가 있을 때만 기존 request-cached Blog store를 한 번 읽고 `selectPublicBlogRouteEntries`로 현재 공개 버전과 privacy를 확인한다. 본문을 다시 렌더링하거나 출처 URL을 HTTP로 요청하지 않는다.
- `HLOG_PUBLIC_BASE_URL`에서 확정한 origin의 절대 HTTPS URL도 내부 참조로 검사한다. URL의 pathname을 해석해 인코딩된 경로·마지막 slash·query/fragment 변형을 같은 상세 경로로 취급한다. 유효하지 않은 내부 Blog 경로도 외부 링크로 남기지 않는다. 다른 origin의 외부 HTTPS 출처에는 새 조회나 자동 fetch를 추가하지 않았다.
- 공개 대상은 **현재 글 제목과 canonical 상대 경로**를 표시한다. 저장 label이 과거 글 제목일 수 있으므로 비공개·철회·삭제·누락·잘못된 현재 버전·privacy 차단 대상에는 고정 설명 **‘블로그 기록’**만 표시한다. 원래 label/slug를 HTML/RSC에 넘기지 않는다. 일반 출처 설명·임의 본문의 링크를 자동으로 고치는 기능은 아니다.
- Blog 조회 실패는 `sourcesUnavailable`을 공개 응답에만 표시하고 관련 출처의 링크/제목을 숨긴다. 기존 Brain 본문·외부 출처·레이아웃을 유지하며 두 reader의 출처 영역에서 다시 확인할 수 있다. 성공한 빈 결과에는 오류 문구가 없다.
- Blog 상세의 `BlogBrainLinks`는 두 공개 selector 결과에서만 역방향 연결을 만든다. 같은 노드의 중복 출처는 역방향 링크 하나가 된다. 현재 공개 Brain이 없으면 영역을 생략하고 Brain 저장소 오류는 해당 영역에서 재시도를 안내한다. Blog 본문은 유지된다.

원본→공개 사본→현재 공개 응답의 경계는 그대로다. DB schema, repository SQL/명령, 카탈로그 노드·관계, Home 레이더와 그래프 배치 코드는 변경하지 않았다. 새 서버/캐시/AI/provider/외부 네트워크 호출은 없다. 두 loader는 서로 재귀 호출하지 않는다. Blog 상세→Brain 공개 loader→Blog request cache 순서이며 요청 간 캐시는 추가하지 않았다.

## 검증

앱 디렉터리에서 Node 24.22.1·Next 16.4.3을 사용했다. Next 설치본의 caching-without-cache-components와 route-segment-config 문서를 확인하고 기존 dynamic route와 React request cache를 재사용했다.

| 검사 | 결과 |
| --- | --- |
| RED | 새 Blog 출처 저장이 `invalid_draft`로 실패. 공개 출처 처리 테스트에서 철회 대상 href 잔존·현재 제목 미반영·오류 상태 누락·절대 URL 미검사를 확인 |
| focused GREEN | `brain.test.ts`, `brain-capture.test.ts`, `blog-public.test.ts` **61/61** |
| 전체 단위 | `npm run test` **288 pass / 28 DB skip / 0 fail**. 첫 sandbox 실행의 loopback EACCES·임시 파일 접근 실패는 로컬 권한에서 동일 명령 재실행 후 통과 |
| DB integration | `brain-postgres-repository.integration.test.ts`와 `blog-public-read-path.integration.test.ts` **4/4**, skip 0. 새 검증은 기존 `test:brain` / `test:public-read-path`에 포함 |
| 타입·build | `npm run typecheck`, `npm run build` 통과. build의 기존 `blog-thumbnails.ts` 동적 파일 tracing 경고 2건은 남음 |
| lint | 기본 `npm run lint`는 기존 Git 제외 private helper 3파일의 오류 10건으로 실패. 직접 `node node_modules/eslint/bin/eslint.js . --ignore-pattern "private/**"`는 통과. 앱 소스 오류 없음 |
| HTTP | production/dev에서 Blog↔Brain 상세와 graph의 HTML·RSC (`text/x-component` 확인), 비공개/누락 URL·이전 label 비노출, Blog/Brain 철회 후 새 응답·직접 404, 재공개 후 연결 복원 확인 |
| 독립 장애 | 합성 DB에서 posts 또는 brain_notes를 잠시 사용할 수 없게 해 연결 오류와 본문 유지 확인. 정상 복구 뒤 옛 실패 상태가 남지 않음 |
| 사본/원문 | 비공개 v2 수정이 공개 v1에 섞이지 않음. 조회·철회 대상 변경 전후 저장된 public_node bytes와 비공개 버전 이력 보존 |
| flag OFF | 개발 서버에서 DB Brain 사본 제외·직접 상세 404. 파일 카탈로그에 Blog 출처가 없으면 Blog 저장소 장애에도 `/brain` 200 |
| 브라우저 | production/dev 각각 **1440/390/320px × JavaScript ON/OFF = 총 12조합**. 긴 제목/중복 목적지, source/역방향 링크, 키보드 Enter·뒤로가기·가로 넘침·pageerror 확인. graph canvas 준비 후 기존 reader·검색을 확인하고 Home 레이더도 확인 |

실행 명령:

```powershell
node --no-warnings --experimental-strip-types --test lib/brain.test.ts lib/brain-capture.test.ts lib/blog-public.test.ts
npm run test
npm run lint
node node_modules/eslint/bin/eslint.js . --ignore-pattern "private/**"
npm run typecheck
npm run build
# 아래 두 DB suite는 별도 임시 loopback DB에서만 실행
node --no-warnings --experimental-strip-types --test lib/brain-postgres-repository.integration.test.ts lib/blog-public-read-path.integration.test.ts
git diff --check
```

상세 로그·DB/HTTP/browser 재현 runner·스크린샷은 Git/Docker 제외 `private/r3-sources-2026-11-10/`에 있다. 초기 추가 UI 검수의 잘못된 레이더 선택자는 실제 `.skills-radar`로 바로잡아 재실행했다. 테스트용 컨테이너·서버·브라우저·임시 credential 파일은 종료/정리했다. 실제 운영 DB, 사용자 인증 프로필, provider나 외부 출처를 사용하지 않았다.

## 범위와 남은 일

연결 판정은 **새 서버 응답 시점의 현재 공개 상태**를 따른다. 이미 열린 탭·다운로드·브라우저 뒤로가기의 과거 사본 전체를 회수하는 기능은 아니다. 관리되는 sources/역방향 연결 밖의 임의 Markdown 과거 URL도 재작성하지 않는다. 공개 Blog 읽기는 기존 전체 store를 재사용하며 요약 전용 조회·공유 캐시 도입은 성능 F 트랙에서 측정 후 진행한다.

R3 Step 0 완료, R3 Step 1은 pending이다. R 트랙은 completed 7·pending 7, 전체는 기존 60 phase/209 step이다. 다음 **R3 Step 1 `curated-reading-paths`**에서 검수한 사례의 Portfolio→Blog→Brain 읽기 경로를 편집한다. 실제 원고 발행, 운영 배포, DNS/TLS, timer·AI 활성화와 F 22개 step은 실행하지 않았다.
