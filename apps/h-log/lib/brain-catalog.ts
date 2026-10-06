import type { BrainCatalog } from "./brain.ts";

// 2026-10-06: 사용자가 검토본의 추가 18개 노드와 연결을 공개 승인했다.
// 일반화한 편집본만 담으며 원문·로컬 근거 대장·Wiki를 런타임에서 가져오지 않는다.
export const brainCatalog = {
  "nodes": [
    {
      "id": "operable-backend",
      "title": "운영하기 쉬운 백엔드를 만들고 싶다",
      "summary": "기능을 만든 뒤에 누가 어떻게 고치고 운영할지도 생각한다.",
      "kind": "reflection",
      "topic": "principles",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "내가 지향하는 일",
          "paragraphs": [
            "Java와 Spring을 중심으로 백엔드를 개발해 왔다. 소개와 경력을 돌아보면 반복 작업을 줄이고, 장애와 변경에 대응하기 쉬운 구조를 만드는 이야기가 자주 나온다.",
            "빨리 만드는 일과 나중에 유지하는 일 사이에서 균형을 찾고 싶다."
          ]
        },
        {
          "heading": "연결해서 보고 싶은 것",
          "paragraphs": [
            "비동기 작업이 실패했을 때 복구하는 방법, 관측성, 명세와 검증 자동화를 함께 적어 둔다. 모두 운영을 쉽게 만드는 선택이라는 점에서 이어지는 내용이다."
          ]
        }
      ],
      "questions": [
        "이 기능을 처음 보는 사람이 실패 원인과 복구 방법을 찾을 수 있을까?"
      ],
      "tags": [
        "백엔드",
        "운영",
        "자기소개"
      ],
      "sources": [
        {
          "label": "H-Log 소개와 경력",
          "href": "/resume"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "repeatable-work",
      "title": "반복되는 일은 기준으로 남긴다",
      "summary": "같은 설명과 검토를 되풀이하지 않도록 일할 때의 기준을 적어 둔다.",
      "kind": "reflection",
      "topic": "principles",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "기록에 남아 있는 방향",
          "paragraphs": [
            "소개 글에 시행착오와 검증 결과를 팀의 기준으로 남긴다고 썼다. 공개한 사례에도 명세를 기준으로 반복 구현을 정리하고, 생성 결과를 빌드·테스트·리뷰로 확인한 과정을 담았다."
          ]
        },
        {
          "heading": "계속 가져갈 기준",
          "paragraphs": [
            "자주 하는 판단을 문서와 검증으로 남기고, 자동화한 일도 사람이 결과를 확인할 수 있게 하고 싶다."
          ]
        }
      ],
      "questions": [
        "지금 반복하는 일은 자동화하면 될까, 먼저 기준부터 맞춰야 할까?"
      ],
      "tags": [
        "자동화",
        "문서화",
        "개발 규칙"
      ],
      "sources": [
        {
          "label": "H-Log 소개와 경력",
          "href": "/resume"
        },
        {
          "label": "개발 워크플로우 사례",
          "href": "/portfolio/ai-backend-workflow-standardization"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "observe-before-optimize",
      "title": "개선의 출발점은 관찰이다",
      "summary": "느리게 느껴진다면 요청·쿼리·작업 중 어느 구간이 느린지부터 본다.",
      "kind": "reflection",
      "topic": "principles",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "경력에서 이어진 기준",
          "paragraphs": [
            "프로필에 데이터와 관측 결과를 보고 개선안을 제시한다고 썼다. 관측성 사례에서도 요청 흐름의 trace·metric·log를 연결해 어느 구간에서 문제가 생겼는지 찾는 과정을 정리했다."
          ]
        },
        {
          "heading": "다시 사용할 질문",
          "paragraphs": [
            "새 기술을 붙이기 전에 무엇이 느리고 어디서 실패하는지부터 설명해 본다. 바꾸기 전과 후를 같은 조건에서 비교해야 다음에 판단할 근거도 남는다."
          ]
        }
      ],
      "questions": [
        "이번에 줄어든 건 응답 시간일까, 대기 시간일까, 운영자가 확인하는 시간일까?"
      ],
      "tags": [
        "관측성",
        "성능",
        "측정"
      ],
      "sources": [
        {
          "label": "H-Log 소개와 경력",
          "href": "/resume"
        },
        {
          "label": "관측성 사례",
          "href": "/portfolio/opentelemetry-observability"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "external-memory",
      "title": "기억의 한계를 인정하고 밖에 남긴다",
      "summary": "해결 방법뿐 아니라 당시 상황과 생각을 다시 찾고 싶다.",
      "kind": "reflection",
      "topic": "principles",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "이 공간을 만드는 이유",
          "paragraphs": [
            "모든 일을 머릿속에 담아 둘 수는 없다. 어떤 문제를 어떻게 풀었고, 그때 무엇을 고민했는지 적어 두고 싶다.",
            "결론을 기억하는 것만큼, 그 결론에 이르기까지 어떤 상황이었는지 기억하는 것도 중요하다."
          ]
        },
        {
          "heading": "기록을 시작하는 방법",
          "paragraphs": [
            "완성된 글이 아니어도 일단 남긴다. 정리 덜 된 메모나 아직 답을 못 찾은 질문에서 다른 생각으로 이어질 수도 있다."
          ]
        }
      ],
      "questions": [
        "몇 달 뒤에 다시 읽는다면 무엇부터 찾아볼까?"
      ],
      "tags": [
        "기억",
        "Second Brain",
        "개인 기록"
      ],
      "sources": [
        {
          "label": "Second Brain에 대해 직접 남긴 방향"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "async-request-boundary",
      "title": "요청의 완료와 후속 작업을 나눴다",
      "summary": "응답에 꼭 필요한 일과 나중에 처리할 일을 나눴다.",
      "kind": "experience",
      "topic": "reliability",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "기존 경험에서 확인한 것",
          "paragraphs": [
            "요청 트랜잭션에 묶여 있던 외부 연동과 후속 처리를 Redisson Queue와 Worker로 분리했던 경험을 포트폴리오에 정리했다.",
            "요청을 받을 때 필요한 상태를 저장하고 후속 작업을 넘긴다. 넘겨받은 일은 Worker가 독립적으로 처리한다."
          ]
        },
        {
          "heading": "이어서 볼 지점",
          "paragraphs": [
            "응답을 보냈어도 업무는 아직 진행 중일 수 있다. 비동기로 나눈 일을 이해하려면 지금 어떤 상태인지, 실패하면 어떻게 복구하는지까지 봐야 한다."
          ]
        }
      ],
      "questions": [
        "사용자에게 접수와 완료를 어떻게 구별해서 보여 줄까?"
      ],
      "tags": [
        "Redis",
        "Redisson",
        "Queue",
        "비동기"
      ],
      "sources": [
        {
          "label": "비동기 처리와 장애 복구 사례",
          "href": "/portfolio/redisson-async-processing-recovery"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "dlq-recovery",
      "title": "실패한 작업의 다음 경로를 만든다",
      "summary": "실패한 작업은 재시도만 반복하지 않고 따로 모아 다시 처리할 수 있게 한다.",
      "kind": "solution",
      "topic": "reliability",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "남겨 둔 해결 방식",
          "paragraphs": [
            "실패한 작업을 DLQ로 옮겨 운영자가 다시 처리할 수 있게 만든 과정을 공개 사례에 적어 뒀다. 살펴본 코드에서도 일반 큐와 실패 큐를 따로 두고 있었다."
          ]
        },
        {
          "heading": "다음에 확인할 기준",
          "paragraphs": [
            "DLQ를 만들었다고 복구까지 끝난 건 아니다. 어떤 오류를 다시 시도할지, 같은 작업을 중복 실행해도 안전한지, 처리 결과는 누가 확인할지까지 살펴보고 싶다."
          ]
        }
      ],
      "questions": [
        "같은 작업을 다시 실행하면 결과가 중복되지 않을까?",
        "어떤 경우에 재시도를 멈추고 사람이 확인해야 할까?"
      ],
      "tags": [
        "DLQ",
        "재처리",
        "멱등성"
      ],
      "sources": [
        {
          "label": "비동기 처리와 장애 복구 사례",
          "href": "/portfolio/redisson-async-processing-recovery"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "cache-warmup-cost",
      "title": "캐시를 채우는 비용도 측정한다",
      "summary": "조회가 빨라져도 캐시를 채우는 데는 비용이 든다.",
      "kind": "reflection",
      "topic": "data",
      "basis": "reflection",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "구현에서 출발한 생각",
          "paragraphs": [
            "살펴본 캐시 예열 코드는 전체 대상을 조회한 뒤 항목별로 저장했다. 실행 시간을 재고 중복 실행을 제한하는 장치도 있었다. 캐시를 읽을 때뿐 아니라 채울 때 드는 비용도 봐야 한다."
          ]
        },
        {
          "heading": "다시 설계한다면",
          "paragraphs": [
            "미리 채워 둔 캐시가 실제 조회에 얼마나 도움이 되는지부터 보고 싶다. 일괄 처리나 병렬화를 검토할 때도 DB·Redis에 걸리는 부하와 실패했을 때 어디서 다시 시작할지를 함께 확인하겠다."
          ]
        }
      ],
      "questions": [
        "전체를 미리 채워 둘 필요가 있을까?",
        "캐시를 채우는 도중 새 값이 생기거나 일부 저장에 실패하면 어떻게 될까?"
      ],
      "tags": [
        "Redis",
        "캐시",
        "예열",
        "성능"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "commit-before-side-effects",
      "title": "저장이 확정된 뒤 후속 처리를 시작한다",
      "summary": "트랜잭션이 성공한 시점과 알림을 보내는 시점을 구분한다.",
      "kind": "learning",
      "topic": "reliability",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "확인한 동작",
          "paragraphs": [
            "Spring 코드를 읽다가 AFTER_COMMIT 이벤트와 별도 트랜잭션으로 후속 작업을 처리하는 부분을 봤다. 주 작업의 저장 결과와 그 뒤에 일어나는 부수 효과를 나눠 보려고 적어 둔 메모다."
          ]
        },
        {
          "heading": "기억할 경계",
          "paragraphs": [
            "Spring의 트랜잭션 이벤트는 트랜잭션의 단계에 맞춰 실행 시점을 정한다. 언제 실행할지 정했더라도, 프로세스가 멈춘 뒤 작업을 전달할 수 있는지는 따로 봐야 한다."
          ]
        }
      ],
      "questions": [
        "커밋 직후 프로세스가 종료돼도 남겨 둔 작업을 찾을 수 있을까?"
      ],
      "tags": [
        "Spring",
        "AFTER_COMMIT",
        "REQUIRES_NEW",
        "트랜잭션"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        },
        {
          "label": "Spring 공식 문서 · 트랜잭션 이벤트",
          "href": "https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "cache-readiness-is-not-use",
      "title": "캐시 설정과 효과를 구별한다",
      "summary": "캐시를 설정해 뒀어도 실제 조회에서 쓰는지는 확인해야 한다.",
      "kind": "reflection",
      "topic": "data",
      "basis": "reflection",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "이번에 확인한 차이",
          "paragraphs": [
            "설정에는 TTL과 직렬화 방식이 있었지만, 서비스에 적용하는 일은 후속 작업으로 적힌 부분도 있었다. 설정 파일만 읽고 캐시를 도입한 효과까지 말할 수는 없다."
          ]
        },
        {
          "heading": "내가 남겨 둘 확인 순서",
          "paragraphs": [
            "실제로 어디서 호출하는지, 키와 무효화 규칙은 무엇인지, 캐시에 적중하는지, 원본 조회에는 비용이 얼마나 드는지 차례로 보고 싶다. 인프라를 준비한 데까지인지 실제 동작도 검증했는지 나눠 적어 두면 다음에 판단하기도 쉽다."
          ]
        }
      ],
      "questions": [
        "조회할 때 정말 이 캐시를 읽고 있을까?",
        "어디까지는 오래된 값이 남아 있어도 괜찮을까?"
      ],
      "tags": [
        "Redis",
        "TTL",
        "Cache-Aside",
        "검증"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "transaction-context",
      "title": "같은 함수에서도 트랜잭션 문맥을 확인한다",
      "summary": "가까이 있는 코드라도 같은 트랜잭션에 참여하는지는 따로 봐야 한다.",
      "kind": "learning",
      "topic": "boundaries",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "코드에서 확인한 것",
          "paragraphs": [
            "살펴본 Go 코드는 문맥에 SQL 트랜잭션을 연결하고, 서비스의 트랜잭션 콜백에서 그 문맥을 넘긴다. 실패했을 때 어디까지 영향을 받는지 확인하는 테스트도 따로 있었다."
          ]
        },
        {
          "heading": "다시 사용할 관점",
          "paragraphs": [
            "트랜잭션 안에서 부르는 함수가 어떤 문맥과 연결을 쓰는지 따라가 본다. 바깥 문맥을 잘못 넘긴 경우와 롤백했는데 상태가 남는 경우도 검증할 항목으로 적어 둔다."
          ]
        }
      ],
      "questions": [
        "중간에 실패하면 앞에서 바꾼 내용도 함께 취소될까?"
      ],
      "tags": [
        "Go",
        "PostgreSQL",
        "SQLC",
        "트랜잭션"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "telemetry-with-less-data",
      "title": "관측에 필요한 정보만 남긴다",
      "summary": "장애를 찾을 정보는 남기되, 원문 데이터가 노출되는지도 함께 본다.",
      "kind": "learning",
      "topic": "boundaries",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "검토한 구성",
          "paragraphs": [
            "Redis tracing 설정에서 명령문 내용과 호출자 정보를 수집하지 않도록 한 부분을 봤다. 관측 도구를 붙이면서 어디까지 수집할지도 정한 사례라 적어 둔다."
          ]
        },
        {
          "heading": "계속 확인할 질문",
          "paragraphs": [
            "운영 문제를 구분하는 데 필요한 신호는 남기면서, 사용자 입력과 민감한 키가 기록되지는 않는지 확인하고 싶다. 무엇을 모으지 않을지도 관측성을 설계할 때 정해야 한다."
          ]
        }
      ],
      "questions": [
        "이 필드는 문제를 구분하는 데 필요할까, 원문을 그대로 옮기는 걸까?"
      ],
      "tags": [
        "OpenTelemetry",
        "Redis",
        "로그",
        "개인정보"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        },
        {
          "label": "관측성 사례",
          "href": "/portfolio/opentelemetry-observability"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "contract-before-generated-code",
      "title": "생성 코드보다 원본 계약을 먼저 본다",
      "summary": "API를 바꿀 때는 명세·생성 결과·호출부가 서로 맞는지 본다.",
      "kind": "solution",
      "topic": "boundaries",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "기록에 남은 접근",
          "paragraphs": [
            "OpenAPI Spec-First를 기준으로 반복 구현을 정리한 경험을 공개 경력에 적어 뒀다. 생성한 코드도 기존 검증 흐름에서 확인하는 것까지 같은 맥락으로 본다."
          ]
        },
        {
          "heading": "다음에도 확인할 기준",
          "paragraphs": [
            "생성된 코드만 고치면 다음에 생성할 때 수정한 내용이 사라질 수 있다. 명세를 왜 바꿨는지, 그 명세를 사용하는 코드가 어느 버전인지 함께 확인해 두자."
          ]
        }
      ],
      "questions": [
        "이번 변경에서 원본으로 삼아야 할 건 명세일까, 직접 작성한 서비스 코드일까?"
      ],
      "tags": [
        "OpenAPI",
        "코드 생성",
        "계약",
        "Spec-First"
      ],
      "sources": [
        {
          "label": "개발 워크플로우 사례",
          "href": "/portfolio/ai-backend-workflow-standardization"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "project-boundaries",
      "title": "자동 탐색에도 저장소의 경계가 필요하다",
      "summary": "가까이 있는 폴더의 이름보다 어느 프로젝트에 속하는지 명시한 정보를 먼저 본다.",
      "kind": "learning",
      "topic": "tools",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "확인한 검증 방식",
          "paragraphs": [
            "개발 도구의 탐색 코드와 테스트를 보니 멀티모듈의 소유자를 찾는 검사가 있었다. 독립 Git 저장소나 형제 모듈의 근거를 함부로 섞지 않는지도 확인했다."
          ]
        },
        {
          "heading": "개인 도구로 가져갈 생각",
          "paragraphs": [
            "자동화가 편해지는 만큼 엉뚱한 프로젝트 규칙을 적용하는 실수도 줄이고 싶다. 폴더 이름이 비슷해도 같은 프로젝트 맥락으로 읽어도 되는지는 따로 확인한다."
          ]
        }
      ],
      "questions": [
        "이 파일이 속한 저장소는 어디고, 어떤 규칙을 적용해야 할까?"
      ],
      "tags": [
        "개발 도구",
        "Gradle",
        "저장소 경계"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "verification-is-not-a-label",
      "title": "검사 성공과 작업 완료를 구별한다",
      "summary": "도구가 준비됐다는 것과 구현이 실제로 잘 동작한다는 것은 구분한다.",
      "kind": "reflection",
      "topic": "tools",
      "basis": "reflection",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "검증 코드에서 출발한 생각",
          "paragraphs": [
            "검증 코드는 준비 상태를 진단한 결과와 실제로 실행한 결과를 구분하고 있었다. 결과 기록이 확인한 소스 상태와 연결되는지 검사하는 부분도 있었다."
          ]
        },
        {
          "heading": "내가 남겨 둘 기준",
          "paragraphs": [
            "무엇을 실행했고 무엇은 아직 안 했는지 적어 두고 싶다. 성공했다는 표시만 남기기보다 실행한 명령, 확인한 범위, 아직 확인하지 못한 부분을 적어 두는 편이 다음 작업에 도움이 된다."
          ]
        }
      ],
      "questions": [
        "통과한 건 준비 상태 검사일까, 실제 동작을 확인하는 검사일까?"
      ],
      "tags": [
        "TDD",
        "검증",
        "AI 워크플로우"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        },
        {
          "label": "개발 워크플로우 사례",
          "href": "/portfolio/ai-backend-workflow-standardization"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "pinned-dependency-context",
      "title": "최신 코드와 실제 사용하는 버전은 다르다",
      "summary": "문서부터 읽기 전에 지금 쓰는 의존성이 어느 버전인지 확인한다.",
      "kind": "learning",
      "topic": "boundaries",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "확인한 구조",
          "paragraphs": [
            "여러 저장소에서 공통 도구의 버전을 서로 다르게 고정해 쓰고 있었다. 실제로 쓰는 버전을 확인하는 검증도 살펴봤다. 최신 소스에 있는 동작이 지금 프로젝트에도 있다고 생각하면 안 된다."
          ]
        },
        {
          "heading": "다시 확인할 순서",
          "paragraphs": [
            "사용 중인 버전을 확인하고, 그 버전의 소스와 현재 호출부를 함께 읽는다. 자동으로 최신 버전으로 바꾸는 일은 별도 변경으로 다룬다."
          ]
        }
      ],
      "questions": [
        "이 설명이 지금 쓰는 버전에도 맞을까?"
      ],
      "tags": [
        "의존성",
        "버전 고정",
        "재현성"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "html-structure",
      "title": "태그를 정리해도 문서의 의미는 남아야 한다",
      "summary": "HTML을 정리할 때 문단과 목록, 표의 구조도 살핀다.",
      "kind": "learning",
      "topic": "tools",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "문서 도구에서 확인한 것",
          "paragraphs": [
            "문서 도구는 HTML을 DOM으로 파싱하고, 태그와 속성을 정리한 뒤 규칙에 맞춰 줄을 바꾸고 있었다. 태그를 지우는 일이라도 문서 구조를 어떻게 남길지 정해야 한다."
          ]
        },
        {
          "heading": "다음에 사용할 기준",
          "paragraphs": [
            "변환한 뒤에도 문단이 어디서 나뉘는지, 목록 순서와 표의 셀 구분이 보이는지 확인하고 싶다. 어떤 태그를 허용할지 정했더라도 결과를 브라우저에 안전하게 표시하는지는 따로 검증한다."
          ]
        }
      ],
      "questions": [
        "변환한 결과만 읽어도 원래 목록과 표를 이해할 수 있을까?"
      ],
      "tags": [
        "HTML",
        "Jsoup",
        "파싱",
        "문서"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "whitespace-is-content",
      "title": "공백을 정리하다 의미를 지우지 않을까",
      "summary": "보기에 깔끔해졌어도 원문 뜻이 달라지지는 않았는지 본다.",
      "kind": "question",
      "topic": "tools",
      "basis": "question",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "코드에서 생긴 질문",
          "paragraphs": [
            "문서 처리 코드를 읽다가 공백을 한꺼번에 정리하는 부분을 봤다. 모든 공백을 같은 방식으로 지워도 괜찮은지는 사례를 따로 넣어 봐야 알겠다."
          ]
        },
        {
          "heading": "확인해 보고 싶은 입력",
          "paragraphs": [
            "단어 사이 공백이나 코드 블록의 들여쓰기, 표 안의 여러 문장을 넣고 비교해 보고 싶다. 공백 자체에 의미가 있는 경우들이다. 해결한 문제보다는 더 확인할 질문으로 남겨 둔다."
          ]
        }
      ],
      "questions": [
        "변환한 뒤에도 영문 두 단어 사이의 공백과 코드 들여쓰기가 남아 있을까?"
      ],
      "tags": [
        "파싱",
        "공백",
        "회귀 테스트"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "parser-input-boundary",
      "title": "파일을 읽는 도구의 허용 범위는 어디까지일까",
      "summary": "제대로 파싱하는지와 안전하게 파일을 읽는지는 따로 확인해야 한다.",
      "kind": "question",
      "topic": "tools",
      "basis": "question",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "남겨 둔 문제",
          "paragraphs": [
            "파일이나 폴더 경로를 받는 문서 도구를 보면서, 어느 위치의 파일까지 읽게 할지, 크기는 어디까지 허용할지 궁금해졌다. 실제 침해나 사고가 있었다는 뜻으로 적은 질문은 아니다."
          ]
        },
        {
          "heading": "확인할 항목",
          "paragraphs": [
            "허용 디렉터리와 심볼릭 링크부터 큰 파일, 파싱 실패, 로그에 원문이 남는 경우까지 살펴보고 싶다. 로컬에서만 쓰는 도구인지 외부 요청을 받는 도구인지에 따라서도 제한할 범위가 달라진다."
          ]
        }
      ],
      "questions": [
        "입력한 경로가 작업하려던 폴더 밖을 가리키면 어떻게 될까?"
      ],
      "tags": [
        "파일 접근",
        "파서",
        "입력 검증"
      ],
      "sources": [
        {
          "label": "허용된 구현을 읽고 일반화한 기술 메모"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "time-split-validation",
      "title": "미래를 보지 않은 평가를 남긴다",
      "summary": "결과를 고를 때 쓴 데이터와 마지막 평가에 쓸 데이터를 나눠 둔다.",
      "kind": "learning",
      "topic": "data",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "개인 분석 도구에서 확인한 것",
          "paragraphs": [
            "시간순 이력을 분석하는 코드와 테스트를 살펴봤다. 과거 구간에서 후보를 고르고, 뒤쪽 구간은 따로 평가에 쓴다. 미래 시점의 행이 예측 입력에 섞이지 않는지도 검사하고 있었다."
          ]
        },
        {
          "heading": "다른 작업에 이어질 기준",
          "paragraphs": [
            "결과가 좋아 보일 때는 그 결과에 맞춰 기준까지 바꾼 건 아닌지 돌아보고 싶다. 평가 데이터에 맞춰 방법을 고쳤다면 새로 검증해야 하지 않을까?"
          ]
        }
      ],
      "questions": [
        "평가 결과를 보고 방법을 고친 뒤, 같은 데이터로 다시 증명하려는 건 아닐까?"
      ],
      "tags": [
        "데이터 분석",
        "홀드아웃",
        "데이터 누수"
      ],
      "sources": [
        {
          "label": "개인 도구의 구현과 테스트 검토"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "baseline-before-complexity",
      "title": "복잡한 방법이 기준선을 이겼는지 확인한다",
      "summary": "더 나아졌다는 근거가 없다면 단순한 기준을 유지하는 것도 선택이다.",
      "kind": "reflection",
      "topic": "data",
      "basis": "reflection",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "구현에서 출발한 생각",
          "paragraphs": [
            "개인 분석 도구는 여러 후보를 비교하고, 개선 조건을 채우지 못하면 단순한 기준으로 돌아가게 되어 있었다. 실제로 고른 방식과 그 이유도 결과에 남긴다."
          ]
        },
        {
          "heading": "내가 계속 묻고 싶은 것",
          "paragraphs": [
            "복잡하게 만들었다고 더 낫다고 말하고 싶지는 않다. 비교에 쓴 지표가 실제 목적에 얼마나 맞는지부터 확인하겠다. 여기서 추첨 결과를 잘 예측했다고 말하려는 건 아니다."
          ]
        }
      ],
      "questions": [
        "지표가 좋아졌다면 사용자가 원하던 것도 이뤄졌을까?"
      ],
      "tags": [
        "기준선",
        "모델 평가",
        "단순함"
      ],
      "sources": [
        {
          "label": "개인 도구의 구현과 테스트 검토"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "first-write-wins",
      "title": "한 번 저장한 결과를 다시 만들지 않는다",
      "summary": "다시 실행하거나 동시에 실행해도 처음 저장한 기록을 지킨다.",
      "kind": "solution",
      "topic": "everyday",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "개인 도구의 저장 방식",
          "paragraphs": [
            "저장 코드를 보니 회차별 기록을 임시 파일에 완성한 뒤 저장하고 있었다. 먼저 만들어진 결과는 덮어쓰지 않는다. 기존 기록도 회차와 입력 데이터의 지문을 비교해 다시 검증한다."
          ]
        },
        {
          "heading": "다음에 떠올릴 상황",
          "paragraphs": [
            "중복 요청이나 재실행 때도 같은 결과를 유지해야 한다면 이 방식을 떠올려 보고 싶다. 처음 결과를 지키는 규칙과 잘못된 원본을 고치는 규칙은 따로 정해야 한다."
          ]
        }
      ],
      "questions": [
        "입력 데이터가 바뀌면 기존 결과를 둘지 다시 만들지 누가 정할까?"
      ],
      "tags": [
        "멱등성",
        "파일 저장",
        "동시 실행"
      ],
      "sources": [
        {
          "label": "개인 도구의 구현과 테스트 검토"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "data-freshness",
      "title": "오래된 정보는 오래되었다고 보여 준다",
      "summary": "링크가 남아 있어도 지금 쓸 수 있는지는 확인해야 한다.",
      "kind": "learning",
      "topic": "everyday",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "목록 서비스에서 확인한 것",
          "paragraphs": [
            "개인 목록 서비스에서는 확인한 판매 정보와 참고할 후보를 나눠 둔다. 확인한 지 오래됐거나 검증하지 않은 링크는 검색으로 안내하고, 화면에서도 정보가 어떤 상태인지 구분해 보여 준다."
          ]
        },
        {
          "heading": "다른 기록에도 적용할 점",
          "paragraphs": [
            "확인 날짜만 오늘로 바꿔 새로 검증한 정보처럼 보이게 하고 싶지는 않다. 기술 문서나 개인 기억도 무엇을 언제 확인했는지 적어 두면 다시 읽을 때 판단하기 쉽다."
          ]
        }
      ],
      "questions": [
        "이 정보가 틀렸거나 오래됐어도 사용자가 안전하게 다음 행동을 할 수 있을까?"
      ],
      "tags": [
        "데이터 신선도",
        "링크 검증",
        "UX"
      ],
      "sources": [
        {
          "label": "개인 도구의 구현과 테스트 검토"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "local-state-privacy",
      "title": "계정 없이 쓰는 도구에도 저장 경계가 있다",
      "summary": "브라우저에 어떤 기록이 남고, 어디까지 보관되는지 알려 준다.",
      "kind": "learning",
      "topic": "everyday",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "확인한 선택",
          "paragraphs": [
            "개인 목록 서비스는 찜과 준비 상태를 브라우저 저장소에 담아 둔다. 로그인 없이 쓸 수 있지만 다른 기기로 자동 동기화되지는 않는다."
          ]
        },
        {
          "heading": "남겨 둘 질문",
          "paragraphs": [
            "쓰는 사람이 자기 기록이 어디에 저장되는지 알 수 있어야 한다. 브라우저 데이터를 지우거나 공용 기기를 쓸 때, 다른 기기로 옮길 때는 어떤지도 살펴보고 싶다."
          ]
        }
      ],
      "questions": [
        "저장 위치를 모르고 쓰던 사람도 데이터가 어디까지 남는지 알 수 있을까?"
      ],
      "tags": [
        "localStorage",
        "개인 도구",
        "개인정보"
      ],
      "sources": [
        {
          "label": "개인 도구의 구현과 테스트 검토"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "shared-copy-is-not-sync",
      "title": "공유한 사본과 함께 편집하는 원본은 다르다",
      "summary": "주소 하나로 편하게 공유하더라도 어떤 데이터가 담기는지는 살펴야 한다.",
      "kind": "reflection",
      "topic": "everyday",
      "basis": "reflection",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "구현에서 확인한 구분",
          "paragraphs": [
            "개인 목록 서비스에서는 주소에 담긴 내용을 읽고 자기 브라우저에 사본을 저장한다. 함께 편집하거나 실시간으로 동기화하는 방식과는 다르다."
          ]
        },
        {
          "heading": "설계할 때 남겨 둘 기준",
          "paragraphs": [
            "주소를 받은 사람이 어디까지 읽을 수 있는지 분명하게 알려 주고 싶다. 메모도 주소에 담는다면 공유 전에 어떤 내용이 들어가는지 확인하게 한다. 사본을 고치면 원본도 바뀌는 것처럼 보이지 않게 하는 것도 필요하다."
          ]
        }
      ],
      "questions": [
        "공유 버튼을 누르기 전에 어떤 내용이 넘어가는지 볼 수 있을까?"
      ],
      "tags": [
        "공유",
        "URL 상태",
        "사본",
        "UX"
      ],
      "sources": [
        {
          "label": "개인 도구의 구현과 테스트 검토"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "pubsub-delivery",
      "title": "Redis Pub/Sub로 충분한 메시지는 무엇일까",
      "summary": "놓쳐도 괜찮은 신호와 다시 처리해야 하는 작업을 나눠 본다.",
      "kind": "question",
      "topic": "reliability",
      "basis": "question",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "도입 전에 확인할 사실",
          "paragraphs": [
            "Redis 공식 문서에서 Pub/Sub의 전달 방식은 at-most-once다. 구독자의 연결이 끊겼거나 메시지를 처리하지 못해도 다시 보내 주는 기능은 없다."
          ]
        },
        {
          "heading": "내가 검토하고 싶은 조건",
          "paragraphs": [
            "잠깐 화면을 갱신하는 신호와 완료됐는지 끝까지 추적해야 하는 작업을 같은 방식으로 보내도 될까? Pub/Sub를 도입했다는 경험담은 아니다. 도입 전에 따져 볼 조건을 적어 뒀다."
          ]
        }
      ],
      "questions": [
        "구독자가 잠시 끊겨도 괜찮은 메시지인가?",
        "다시 처리해야 한다면 어떻게 저장하고 확인해야 할까?"
      ],
      "tags": [
        "Redis",
        "Pub/Sub",
        "메시지 전달",
        "Queue"
      ],
      "sources": [
        {
          "label": "Redis 공식 문서 · Pub/Sub 전달 방식",
          "href": "https://redis.io/docs/latest/develop/pubsub/"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "msa-boundary",
      "title": "MSA로 나누기 전에 경계를 설명할 수 있을까",
      "summary": "모듈을 나눴어도 독립 배포와 데이터 소유권은 따로 생각해야 한다.",
      "kind": "question",
      "topic": "boundaries",
      "basis": "question",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "아직 열어 둔 질문",
          "paragraphs": [
            "모듈이 나뉘었다고 MSA를 도입했다고 적을 수는 없다. 서비스마다 따로 배포하고 데이터를 소유해야 하는 이유부터 설명해 보고 싶다."
          ]
        },
        {
          "heading": "검토할 기준",
          "paragraphs": [
            "얼마나 자주 바뀌는지, 장애를 격리할 수 있는지, 팀이 운영할 수 있는지, 배포와 관측은 준비됐는지 함께 본다. 나눈 뒤 늘어나는 통신과 정합성 문제도 감당해야 할 비용으로 적어 두겠다."
          ]
        }
      ],
      "questions": [
        "정말 따로 배포해야 할까?",
        "한 요청이 여러 저장소를 바꾸다 실패하면 어떻게 처리할까?"
      ],
      "tags": [
        "MSA",
        "모듈",
        "서비스 경계",
        "아키텍처"
      ],
      "sources": [
        {
          "label": "Martin Fowler · Microservice Prerequisites",
          "href": "https://martinfowler.com/bliki/MicroservicePrerequisites.html"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "outbox-gap",
      "title": "커밋과 메시지 전송 사이가 비면 어떻게 될까",
      "summary": "DB에는 저장됐는데 후속 작업은 전달되지 않는 경우를 살펴본다.",
      "kind": "question",
      "topic": "reliability",
      "basis": "question",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "연결해서 생긴 질문",
          "paragraphs": [
            "DB 저장과 메시지 전송을 따로 하면 한쪽만 성공할 수도 있다. 커밋 후 언제 실행할지 정했어도, 그 사이에 무슨 일이 생길 수 있는지는 따로 살펴봐야 한다."
          ]
        },
        {
          "heading": "검토할 대안",
          "paragraphs": [
            "업무 변경과 메시지를 보내겠다는 기록을 같은 트랜잭션에 남기는 outbox를 검토해 볼 수 있다. 이후에 중복으로 전달되는 경우와 소비자의 멱등성도 함께 확인해야 한다. 현재 구현에 outbox가 있다는 뜻으로 적은 메모는 아니다."
          ]
        }
      ],
      "questions": [
        "다시 시작한 뒤에도 저장은 성공했고 전송은 실패했다는 걸 기록에서 알 수 있을까?"
      ],
      "tags": [
        "Outbox",
        "전달 보장",
        "멱등성",
        "트랜잭션"
      ],
      "sources": [
        {
          "label": "AWS 설계 가이드 · Transactional outbox",
          "href": "https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html"
        }
      ],
      "visibility": "public"
    },
    {
      "id": "feelings-and-hindsight",
      "title": "그때의 감정과 지금의 해석을 나눠 남긴다",
      "summary": "결론을 깔끔하게 정리하다 그때 마음까지 지우고 싶지는 않다.",
      "kind": "reflection",
      "topic": "principles",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "내가 남기고 싶은 기억",
          "paragraphs": [
            "무슨 일이 있었는지와 함께 그때 감정도 남기고 싶다. 기술 문제의 답만 적어 두면 왜 망설였는지, 무엇이 부담이었는지는 잊기 쉽다."
          ]
        },
        {
          "heading": "기록의 원칙",
          "paragraphs": [
            "그때 쓴 글은 그대로 두고, 나중에 든 생각을 덧붙이는 편이 좋겠다. 코드만 보고 감정을 짐작해 채우거나 모든 기록을 성공담으로 만들고 싶지는 않다."
          ]
        }
      ],
      "questions": [
        "그때 쓴 내용과 지금 돌아보며 덧붙인 내용을 구별할 수 있을까?"
      ],
      "tags": [
        "감정",
        "회고",
        "기억"
      ],
      "sources": [
        {
          "label": "Second Brain에 대해 직접 남긴 방향"
        }
      ],
      "visibility": "public"
    }
  ],
  "edges": [
    {
      "from": "repeatable-work",
      "to": "operable-backend",
      "relation": "supports",
      "reason": "반복 작업의 기준을 남기는 일이 운영 부담을 줄인다.",
      "visibility": "public"
    },
    {
      "from": "observe-before-optimize",
      "to": "operable-backend",
      "relation": "supports",
      "reason": "어떻게 동작하는지 볼 수 있어야 문제를 찾고 고치기 쉽다.",
      "visibility": "public"
    },
    {
      "from": "external-memory",
      "to": "repeatable-work",
      "relation": "extends",
      "reason": "내가 겪은 시행착오도 다음에 참고할 기준으로 남겨 둔다.",
      "visibility": "public"
    },
    {
      "from": "feelings-and-hindsight",
      "to": "external-memory",
      "relation": "extends",
      "reason": "그때 마음과 나중에 돌아보며 든 생각도 기억과 함께 남긴다.",
      "visibility": "public"
    },
    {
      "from": "async-request-boundary",
      "to": "operable-backend",
      "relation": "applies",
      "reason": "요청이 끝난 시점과 후속 작업까지 끝난 시점을 구분한다.",
      "visibility": "public"
    },
    {
      "from": "dlq-recovery",
      "to": "async-request-boundary",
      "relation": "extends",
      "reason": "따로 떼어 낸 작업이 실패하면 어떻게 처리할지 살펴본다.",
      "visibility": "public"
    },
    {
      "from": "commit-before-side-effects",
      "to": "async-request-boundary",
      "relation": "extends",
      "reason": "작업을 넘기는 시점이 트랜잭션과 어떻게 맞물리는지 본다.",
      "visibility": "public"
    },
    {
      "from": "outbox-gap",
      "to": "commit-before-side-effects",
      "relation": "questions",
      "reason": "커밋한 뒤 프로세스가 멈추거나 작업이 전달되지 않는 경우도 살펴본다.",
      "visibility": "public"
    },
    {
      "from": "outbox-gap",
      "to": "dlq-recovery",
      "relation": "extends",
      "reason": "전달하기 전에 빠진 작업과 전달한 뒤 실패한 작업을 구분한다.",
      "visibility": "public"
    },
    {
      "from": "pubsub-delivery",
      "to": "async-request-boundary",
      "relation": "questions",
      "reason": "알림 신호와 끝까지 추적할 작업을 같은 방식으로 보내도 될까?",
      "visibility": "public"
    },
    {
      "from": "pubsub-delivery",
      "to": "dlq-recovery",
      "relation": "questions",
      "reason": "다시 보내 주지 않는 방식으로도 필요한 만큼 복구할 수 있을까?",
      "visibility": "public"
    },
    {
      "from": "cache-warmup-cost",
      "to": "observe-before-optimize",
      "relation": "applies",
      "reason": "캐시를 준비하는 데 드는 비용도 잰다.",
      "visibility": "public"
    },
    {
      "from": "cache-readiness-is-not-use",
      "to": "cache-warmup-cost",
      "relation": "extends",
      "reason": "설정부터 예열, 실제로 조회하는 코드까지 따라가 본다.",
      "visibility": "public"
    },
    {
      "from": "cache-readiness-is-not-use",
      "to": "verification-is-not-a-label",
      "relation": "supports",
      "reason": "준비해 둔 것과 실제로 효과를 확인한 것을 나눠 본다.",
      "visibility": "public"
    },
    {
      "from": "transaction-context",
      "to": "commit-before-side-effects",
      "relation": "extends",
      "reason": "같은 트랜잭션에 속하는 호출 범위를 확인한다.",
      "visibility": "public"
    },
    {
      "from": "transaction-context",
      "to": "outbox-gap",
      "relation": "extends",
      "reason": "함께 저장할 변경과 나중에 실행할 작업의 경계를 살펴본다.",
      "visibility": "public"
    },
    {
      "from": "telemetry-with-less-data",
      "to": "observe-before-optimize",
      "relation": "applies",
      "reason": "관측에 필요한 신호는 남기면서 어디까지 수집할지 정한다.",
      "visibility": "public"
    },
    {
      "from": "telemetry-with-less-data",
      "to": "local-state-privacy",
      "relation": "extends",
      "reason": "데이터가 남는 위치와 범위를 함께 생각한다.",
      "visibility": "public"
    },
    {
      "from": "contract-before-generated-code",
      "to": "repeatable-work",
      "relation": "applies",
      "reason": "반복하는 작업에도 명세와 생성 결과를 확인할 기준을 적용한다.",
      "visibility": "public"
    },
    {
      "from": "pinned-dependency-context",
      "to": "contract-before-generated-code",
      "relation": "extends",
      "reason": "명세가 실제로 쓰는 버전과 맞는지 확인한다.",
      "visibility": "public"
    },
    {
      "from": "project-boundaries",
      "to": "pinned-dependency-context",
      "relation": "extends",
      "reason": "어느 저장소의 어떤 버전을 읽는지 구분한다.",
      "visibility": "public"
    },
    {
      "from": "project-boundaries",
      "to": "repeatable-work",
      "relation": "applies",
      "reason": "자동화에 쓰는 규칙이 어느 프로젝트에 속하는지 정한다.",
      "visibility": "public"
    },
    {
      "from": "verification-is-not-a-label",
      "to": "repeatable-work",
      "relation": "supports",
      "reason": "반복해서 실행한 결과도 실제로 확인한 근거와 함께 남긴다.",
      "visibility": "public"
    },
    {
      "from": "verification-is-not-a-label",
      "to": "observe-before-optimize",
      "relation": "supports",
      "reason": "어디까지 봤고 무엇은 아직 확인하지 못했는지 나눠 둔다.",
      "visibility": "public"
    },
    {
      "from": "html-structure",
      "to": "whitespace-is-content",
      "relation": "questions",
      "reason": "태그를 정리한 뒤에도 단어와 문서의 뜻이 그대로 남을까?",
      "visibility": "public"
    },
    {
      "from": "parser-input-boundary",
      "to": "html-structure",
      "relation": "extends",
      "reason": "파싱 결과뿐 아니라 읽을 수 있는 입력 범위도 확인한다.",
      "visibility": "public"
    },
    {
      "from": "whitespace-is-content",
      "to": "verification-is-not-a-label",
      "relation": "applies",
      "reason": "대표적인 입력을 변환한 결과를 비교해 뜻이 어떻게 바뀌는지 본다.",
      "visibility": "public"
    },
    {
      "from": "time-split-validation",
      "to": "observe-before-optimize",
      "relation": "applies",
      "reason": "어떤 조건에서 평가했는지, 입력에는 어느 시점까지의 데이터를 썼는지 본다.",
      "visibility": "public"
    },
    {
      "from": "baseline-before-complexity",
      "to": "time-split-validation",
      "relation": "extends",
      "reason": "따로 떼어 둔 데이터로 평가해 단순한 기준보다 나아졌는지 본다.",
      "visibility": "public"
    },
    {
      "from": "baseline-before-complexity",
      "to": "operable-backend",
      "relation": "supports",
      "reason": "검증하지 않은 채 복잡하게 만들지 않도록 기준을 남긴다.",
      "visibility": "public"
    },
    {
      "from": "first-write-wins",
      "to": "dlq-recovery",
      "relation": "extends",
      "reason": "다시 실행해도 같은 결과를 유지해야 한다는 고민이 이어진다.",
      "visibility": "public"
    },
    {
      "from": "first-write-wins",
      "to": "time-split-validation",
      "relation": "extends",
      "reason": "평가에 사용한 입력과 최초 결과를 다시 확인할 수 있게 한다.",
      "visibility": "public"
    },
    {
      "from": "data-freshness",
      "to": "verification-is-not-a-label",
      "relation": "applies",
      "reason": "링크가 있는지와 최근에도 확인했는지를 구분한다.",
      "visibility": "public"
    },
    {
      "from": "data-freshness",
      "to": "pinned-dependency-context",
      "relation": "extends",
      "reason": "기록이 현재 사용 조건에 맞는지 확인한다.",
      "visibility": "public"
    },
    {
      "from": "local-state-privacy",
      "to": "shared-copy-is-not-sync",
      "relation": "extends",
      "reason": "내 브라우저에 저장한 내용과 다른 사람에게 넘긴 사본을 구분한다.",
      "visibility": "public"
    },
    {
      "from": "shared-copy-is-not-sync",
      "to": "external-memory",
      "relation": "questions",
      "reason": "기억을 밖에 남길 때 누구에게 어디까지 보여 줘도 될까?",
      "visibility": "public"
    },
    {
      "from": "msa-boundary",
      "to": "transaction-context",
      "relation": "questions",
      "reason": "서비스를 나눈 뒤에도 어디까지를 한 트랜잭션으로 볼지 정할 수 있을까?",
      "visibility": "public"
    },
    {
      "from": "msa-boundary",
      "to": "observe-before-optimize",
      "relation": "questions",
      "reason": "서비스를 나눈 뒤 요청이 어떻게 흐르는지 살펴볼 준비가 됐을까?",
      "visibility": "public"
    },
    {
      "from": "msa-boundary",
      "to": "baseline-before-complexity",
      "relation": "questions",
      "reason": "운영 비용이 늘어나는 만큼 나눴을 때 얻는 이점이 있을까?",
      "visibility": "public"
    },
    {
      "from": "feelings-and-hindsight",
      "to": "verification-is-not-a-label",
      "relation": "extends",
      "reason": "확인한 사실과 나중에 해석한 내용을 구별한다.",
      "visibility": "public"
    },
    {
      "from": "cache-warmup-cost",
      "to": "data-freshness",
      "relation": "extends",
      "reason": "캐시에서 빨리 읽는 것만큼 값이 얼마나 최신인지도 본다.",
      "visibility": "public"
    },
    {
      "from": "parser-input-boundary",
      "to": "project-boundaries",
      "relation": "extends",
      "reason": "자동화 도구가 어디까지 읽고 적용해도 되는지 정한다.",
      "visibility": "public"
    }
  ]
} satisfies BrainCatalog;
