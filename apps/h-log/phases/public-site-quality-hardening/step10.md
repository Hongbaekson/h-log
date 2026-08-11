# Step 10: career-content-evidence-alignment

## 목표

사용자가 제공한 경력기술서의 공개 가능한 근거만 사용해 Portfolio와 Resume의 경력 정합성을 높인다.

## 작업

- 현재 경력의 AI 개발 워크플로우, Redisson 비동기 처리·DLQ, OpenTelemetry 관측성을 Featured 3건으로 배치한다.
- 기존 경력 프로젝트 5건은 근거가 확인된 성과 수치를 복원한다.
- GitHub Issues·Discord 자동화는 개인 프로젝트로 분리한다.
- Resume의 Gitea Actions와 Jenkins 사용 맥락을 바로잡고 캐시 예열 성과를 추가한다.
- 실무 핵심 기술과 개인 프로젝트·운영 도구를 구분한다.
- 조직 식별자, 개인정보, 근거 자료 원본과 PDF 다운로드는 공개하지 않는다.
- Home의 기술 레이더 구현과 스타일은 변경하지 않는다.

## 인수 기준

```bash
node --no-warnings --test --experimental-strip-types lib/projects.test.ts lib/resume-profile.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증 기록

- RED: 대표·경력·개인 프로젝트 분리와 Resume 정합성 테스트가 기존 콘텐츠에서 실패했다.
- GREEN: focused test 15개가 통과했다.
- 전체 `npm run test`: 193개 중 181개 통과, `DATABASE_URL`이 필요한 기존 12개 skip, 실패 0개.
- `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`: 통과.
- 프로세스 전용 HTTPS test origin으로 standalone 서버를 실행해 Home, Portfolio, Resume와 프로젝트 상세 9개가 모두 HTTP 200인지 확인했다.
- Home 대표 사례와 기술 레이더, Portfolio의 Featured·개인 프로젝트 구분, Resume의 캐시 예열·기술 구분을 HTML content smoke로 확인했다.

## 운영 경계

- 도메인, DNS/TLS, OCI, production timer, 자동 발행 동작은 변경하지 않는다.
- 원본 경력기술서는 증빙 확인에만 사용하고 저장소에 추가하지 않는다.
