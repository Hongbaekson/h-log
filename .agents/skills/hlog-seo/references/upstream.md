# 출처와 이식 범위

원저작자: **agricidaniel / AgriciDaniel**. 원본: [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo). 기준은 **2.5.0**, commit **`6be93f45064ffbadced572b5d5c95f55fd263af0`**이다. 2026-11-03 고정 commit의 원문을 읽고 Git blob SHA-1을 대조했다. 최신 main을 자동 설치하거나 추적하지 않는다.

이 스킬의 한국어 지침은 아래 원문을 선별·축약해 H-Log 계약에 맞게 재작성한 MIT 파생 자료다. 원문의 저작권·허가·면책은 [LICENSE](../LICENSE)에 원문 그대로 둔다. 원본 전체 파일, 실행 코드, 별도 라이선스의 FLOW 자료는 배포하지 않는다.

| 원본 경로 (고정 commit) | Git blob SHA-1 | 채택한 내용과 위치 |
| --- | --- | --- |
| [skills/seo-page/SKILL.md](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/skills/seo-page/SKILL.md) | `69eb6a19a82225bb39eea3b4e91f19e27cfd5da6` | checks.md metadata·본문·HTML/렌더링, 관측 한계 |
| [skills/seo-technical/SKILL.md](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/skills/seo-technical/SKILL.md) | `2184128105f866eb04c10d3d2fcd50d079d41f03` | checks.md 공개 발견·페이지 분할·canonical·JS/no-JS |
| [skills/seo-schema/SKILL.md](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/skills/seo-schema/SKILL.md) | `ce2747efaa221516e4bca54587c510fae33f70ca` | checks.md 렌더된 JSON-LD 파싱·보이는 사실 대조 |
| [skills/seo-sitemap/SKILL.md](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/skills/seo-sitemap/SKILL.md) | `d437c023a044bd6d3e90ed31fa601137b54c667c` | checks.md 실제 XML·status·canonical·lastmod 검증 |
| [skills/seo-content/SKILL.md](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/skills/seo-content/SKILL.md) | `be86bd23b85c7bffa157bacd8761caa45157d94d` | checks.md 작성자·과정·목적·경험 근거·내부 링크 |
| [skills/seo-images/SKILL.md](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/skills/seo-images/SKILL.md) | `b4a584ac50628ded815c6418fb55d6b4da60a563` | checks.md alt·크기·responsive image·LCP와 지연 로딩 |
| [skills/seo-geo/SKILL.md](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/skills/seo-geo/SKILL.md) | `b52a0745b06ed05c9e70487143a059a74e6288ab` | checks.md 출처·문맥을 가진 답·기존 llms의 한계 |
| [LICENSE](https://github.com/AgriciDaniel/claude-seo/blob/6be93f45064ffbadced572b5d5c95f55fd263af0/LICENSE) | `94fac7465f1e76414fc59f9fd97cdfd2105e030d` | 원문 보존 |

## Codex/H-Log에 맞춘 변경

- `/seo`·Claude 도구 이름·plugin root·PostToolUse schema hook을 `$hlog-seo`와 현재 도구의 명시적 읽기/검증으로 바꿨다. 설치·자동 hook·agent/model 위임·병렬 실행 지시는 포함하지 않았다.
- 원본 runtime.py·url_safety.py와 Python requirements를 이식하지 않았다. 따라서 원본 SSRF 방어가 설치됐다고 주장하지 않는다. source/local/public별 요청 범위, redirect·브라우저 subresource 확인은 SKILL.md의 실행 계약이다. 도구가 이를 지키지 못하면 해당 측정을 하지 않는다.
- 기본 결과는 증거·확실성·우선순위·후속 검증이다. 원본의 가중 종합 점수·SEO 효과 추정·인용 통계와 고정 문장 길이 처방은 제외했다.
- 영어 가독성/글자 수, commerce/local-business, 과도한 schema 제안과 특정 rich result의 시점별 지원 표는 복제하지 않았다. 최신 공식 지원을 확인한 뒤 필요한 사실만 제안한다.
- 공개 selector/hash, Brain 사본, PDF 공개 게이트와 승인된 UI를 H-Log 고유 제약으로 추가했다. schema에 사실을 채우기 위해 회사 내부 문서를 읽지 않는다.

Codex 검색 경로는 [공식 Build skills](https://learn.chatgpt.com/docs/build-skills)의 저장소 `.agents/skills`를 사용한다. 실제 검색 검증은 [app-server `skills/list`](https://learn.chatgpt.com/docs/app-server)의 `cwds`·`forceReload`로 확인하며 모델 호출 없이 경로/활성 여부를 대조할 수 있다. 기존 `.codex/skills`와 전역 설정은 옮기지 않는다.
