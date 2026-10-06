import type { BrainCatalog } from "./brain.ts";

// 2026-10-06: 사용자가 검토본의 추가 18개 노드와 연결을 공개 승인했다.
// 일반화한 편집본만 담으며 원문·로컬 근거 대장·Wiki를 런타임에서 가져오지 않는다.
export const brainCatalog = {
  "nodes": [
    {
      "id": "operable-backend",
      "title": "운영하기 쉬운 백엔드를 만들고 싶다",
      "summary": "기능이 동작한 다음에도, 누가 어떻게 고치고 운영할지 생각한다.",
      "kind": "reflection",
      "topic": "principles",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "내가 지향하는 일",
          "paragraphs": [
            "Java와 Spring을 중심으로 백엔드를 개발해 왔다. 반복 작업을 줄이고 장애와 변경에 대응하기 쉬운 구조를 만드는 것이 소개와 경력 기록에 반복해서 등장한다.",
            "빠르게 만드는 일과 나중에 유지할 수 있는 일 사이의 균형을 찾고 싶다."
          ]
        },
        {
          "heading": "연결해서 보고 싶은 것",
          "paragraphs": [
            "비동기 처리의 복구 경로, 관측성, 명세와 검증 자동화를 따로 떨어진 기술 목록이 아니라 운영을 쉽게 만드는 선택으로 연결해 둔다."
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
      "summary": "같은 설명과 같은 검토를 반복하지 않도록 작업의 기준을 기록한다.",
      "kind": "reflection",
      "topic": "principles",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "기록에 남아 있는 방향",
          "paragraphs": [
            "소개에는 시행착오와 검증 결과를 팀의 기준으로 남긴다고 적혀 있다. 공개 사례에는 명세를 기준으로 반복 구현을 정리하고 생성 결과를 빌드·테스트·리뷰로 확인한 흐름이 있다."
          ]
        },
        {
          "heading": "계속 가져갈 기준",
          "paragraphs": [
            "반복되는 판단을 문서와 검증으로 남기고, 자동화가 처리한 결과도 사람이 확인할 수 있게 하고 싶다."
          ]
        }
      ],
      "questions": [
        "지금의 반복은 자동화할 일인가, 먼저 기준을 합의할 일인가?"
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
      "summary": "느리다는 인상을 요청·쿼리·작업 구간으로 나눠 확인한다.",
      "kind": "reflection",
      "topic": "principles",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "경력에서 이어진 기준",
          "paragraphs": [
            "프로필에는 데이터와 관측 결과를 바탕으로 개선안을 제시한다고 적혀 있다. 관측성 사례도 요청 흐름의 trace·metric·log를 연결해 원인 구간을 찾는 내용이다."
          ]
        },
        {
          "heading": "다시 사용할 질문",
          "paragraphs": [
            "기술을 추가하기 전에 무엇이 느리고 어디에서 실패하는지 설명할 수 있는지 확인한다. 개선 전후를 같은 조건에서 비교할 수 있어야 다음 판단도 남는다."
          ]
        }
      ],
      "questions": [
        "이번 변경이 줄인 것은 응답 시간인가, 대기 시간인가, 운영자의 확인 시간인가?"
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
            "모든 일을 머릿속에 계속 보관할 수는 없다. 어떤 문제를 어떻게 해결했는지, 그때 무엇을 고민했는지 남겨 두고 싶다.",
            "기술적으로 정리된 결론만큼, 결론에 이르기 전의 맥락도 기억할 가치가 있다."
          ]
        },
        {
          "heading": "기록을 시작하는 방법",
          "paragraphs": [
            "완성된 글이 아니어도 남긴다. 정리되지 않은 메모와 아직 답하지 못한 질문도 연결의 출발점이 될 수 있다."
          ]
        }
      ],
      "questions": [
        "몇 달 뒤의 내가 이 기록에서 가장 먼저 찾을 것은 무엇일까?"
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
      "summary": "응답에 필요한 일과 나중에 처리할 일을 구분한 비동기 처리 경험.",
      "kind": "experience",
      "topic": "reliability",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "기존 경험에서 확인한 것",
          "paragraphs": [
            "공개 포트폴리오에는 요청 트랜잭션에 묶인 외부 연동과 후속 처리를 Redisson Queue와 Worker로 분리한 경험이 정리되어 있다.",
            "요청에서 필요한 상태를 저장한 뒤 후속 작업을 전달하고, Worker에서 독립적으로 처리하는 구조다."
          ]
        },
        {
          "heading": "이어서 볼 지점",
          "paragraphs": [
            "응답이 끝났다는 사실과 업무 전체가 끝났다는 사실은 다르다. 작업 상태와 실패 복구 경로를 함께 읽어야 비동기 처리의 의미가 보인다."
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
      "summary": "재시도만 반복하지 않고 실패를 격리하고 다시 처리할 수 있게 한다.",
      "kind": "solution",
      "topic": "reliability",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "남겨 둔 해결 방식",
          "paragraphs": [
            "공개 사례에는 실패 작업을 DLQ로 옮기고 운영자가 재처리할 수 있게 만든 내용이 있다. 확인한 구현에도 일반 큐와 실패 큐가 구분되어 있다."
          ]
        },
        {
          "heading": "다음에 확인할 기준",
          "paragraphs": [
            "DLQ가 있다는 사실만으로 복구가 끝나지는 않는다. 어떤 오류를 다시 시도할지, 중복 실행이 안전한지, 누가 재처리 결과를 확인할지까지 연결해 보고 싶다."
          ]
        }
      ],
      "questions": [
        "같은 작업을 다시 실행해도 결과가 중복되지 않는가?",
        "재시도를 멈추고 사람이 확인할 조건은 무엇인가?"
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
      "summary": "조회가 빨라지는 것과 캐시 준비가 가벼운 것은 별개의 문제다.",
      "kind": "reflection",
      "topic": "data",
      "basis": "reflection",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "구현에서 출발한 생각",
          "paragraphs": [
            "캐시 예열 구현에는 전체 대상 조회, 항목별 저장, 실행 시간 측정과 중복 실행을 제한하는 장치가 있었다. 캐시를 사용하는 경로뿐 아니라 채우는 경로에도 비용이 발생한다."
          ]
        },
        {
          "heading": "다시 설계한다면",
          "paragraphs": [
            "예열이 실제 조회에 얼마나 도움이 되는지 먼저 보고 싶다. 일괄 처리나 병렬화를 검토하더라도 DB·Redis 부하와 실패 시 다시 시작할 위치를 함께 확인하겠다."
          ]
        }
      ],
      "questions": [
        "전체를 미리 채울 필요가 있는가?",
        "예열 도중 새 값이 생기거나 일부 저장이 실패하면 어떻게 되는가?"
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
            "검토한 Spring 구현에는 AFTER_COMMIT 이벤트와 별도 트랜잭션을 사용하는 후속 처리가 있었다. 주 작업의 저장 결과와 부수 효과를 구분하는 데서 출발한 메모다."
          ]
        },
        {
          "heading": "기억할 경계",
          "paragraphs": [
            "Spring의 트랜잭션 이벤트는 실행 시점을 거래의 단계에 연결한다. 실행 시점을 정하는 것과 프로세스가 멈춘 뒤에도 작업을 전달하는 것은 서로 다른 검토 사항이다."
          ]
        }
      ],
      "questions": [
        "커밋 직후 프로세스가 종료되면 남겨 둔 작업을 찾을 수 있는가?"
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
      "summary": "설정이 준비되어 있다는 사실만으로 조회가 캐시를 이용한다고 말할 수 없다.",
      "kind": "reflection",
      "topic": "data",
      "basis": "reflection",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "이번에 확인한 차이",
          "paragraphs": [
            "검토한 설정에는 TTL과 직렬화 방식이 준비되어 있었지만 서비스 적용을 후속 작업으로 설명하는 부분도 있었다. 설정 파일만 보고 캐시 도입의 효과를 확정할 수는 없다."
          ]
        },
        {
          "heading": "내가 남겨 둘 확인 순서",
          "paragraphs": [
            "실제 호출 경로, 키와 무효화 규칙, 적중 여부, 원본 조회 비용을 차례로 확인하고 싶다. 준비한 인프라와 검증한 동작을 구분해 적어 두는 편이 이후 판단에도 도움이 된다."
          ]
        }
      ],
      "questions": [
        "조회가 정말 이 캐시를 읽고 있는가?",
        "오래된 값이 남아도 되는 범위는 어디까지인가?"
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
      "summary": "코드가 가까이 있다는 것과 같은 트랜잭션에 참여한다는 것은 다르다.",
      "kind": "learning",
      "topic": "boundaries",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "코드에서 확인한 것",
          "paragraphs": [
            "검토한 Go 구현은 문맥에 SQL 트랜잭션을 연결하고 서비스의 트랜잭션 콜백에서 그 문맥을 전달한다. 실패 경계를 확인하는 테스트도 별도로 두고 있다."
          ]
        },
        {
          "heading": "다시 사용할 관점",
          "paragraphs": [
            "트랜잭션 안에서 호출되는 함수가 어느 문맥과 연결을 쓰는지 추적한다. 바깥 문맥을 실수로 전달하는 상황과 롤백 후 상태가 남는 상황을 검증 대상으로 남긴다."
          ]
        }
      ],
      "questions": [
        "중간 단계가 실패했을 때 앞선 변경이 함께 취소되는가?"
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
      "summary": "장애를 찾는 데 필요한 정보와 원문 데이터의 노출을 함께 생각한다.",
      "kind": "learning",
      "topic": "boundaries",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "검토한 구성",
          "paragraphs": [
            "Redis tracing을 연결하면서 명령문 내용과 호출자 정보의 수집을 끈 구성을 확인했다. 관측 도구를 연결할 때 수집 범위도 함께 선택한 사례로 정리한다."
          ]
        },
        {
          "heading": "계속 확인할 질문",
          "paragraphs": [
            "운영 문제를 구분할 수 있는 신호는 유지하면서 사용자 입력과 민감한 키가 기록되지 않는지 확인하고 싶다. 무엇을 수집하지 않는지도 관측성 설계의 일부다."
          ]
        }
      ],
      "questions": [
        "이 필드는 문제를 구분하는 데 필요한가, 원문을 복제하고 있는가?"
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
      "summary": "API 변경은 명세·생성 결과·호출부가 같은 의미를 가리켜야 한다.",
      "kind": "solution",
      "topic": "boundaries",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "기록에 남은 접근",
          "paragraphs": [
            "공개 경력에는 OpenAPI Spec-First를 기준으로 반복 구현을 정리한 경험이 있다. 생성 코드를 기존 검증 흐름에 연결하는 것도 같은 접근의 일부다."
          ]
        },
        {
          "heading": "다음에도 확인할 기준",
          "paragraphs": [
            "생성된 결과만 고치면 다음 생성 때 의도가 사라질 수 있다. 명세를 바꾼 이유와 소비하는 코드의 버전을 함께 확인하는 기준으로 남겨 둔다."
          ]
        }
      ],
      "questions": [
        "이 변경의 정본은 명세인가, 직접 작성한 서비스 코드인가?"
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
      "summary": "가까운 폴더 이름보다 선언된 소유 관계를 확인한다.",
      "kind": "learning",
      "topic": "tools",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "확인한 검증 방식",
          "paragraphs": [
            "개발 도구의 탐색 구현과 테스트에는 멀티모듈 소유자를 찾되 독립 Git 저장소와 형제 모듈의 근거를 무분별하게 합치지 않는 검사가 있었다."
          ]
        },
        {
          "heading": "개인 도구로 가져갈 생각",
          "paragraphs": [
            "자동화가 편해질수록 잘못된 프로젝트 규칙을 적용하는 실수도 줄이고 싶다. 이름이 비슷한 폴더가 있다는 이유만으로 같은 맥락이라고 판단하지 않는 기준을 남긴다."
          ]
        }
      ],
      "questions": [
        "이 파일을 소유하는 저장소와 적용할 규칙을 설명할 수 있는가?"
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
      "summary": "도구가 준비되었다는 확인을 실제 구현의 성공으로 바꾸지 않는다.",
      "kind": "reflection",
      "topic": "tools",
      "basis": "reflection",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "검증 코드에서 출발한 생각",
          "paragraphs": [
            "준비 상태를 확인하는 진단과 실제 실행 결과를 구분하는 검사, 확인한 소스 상태를 결과 기록에 연결하는 검사가 있었다."
          ]
        },
        {
          "heading": "내가 남겨 둘 기준",
          "paragraphs": [
            "무엇을 실행했고 무엇은 아직 실행하지 않았는지 적고 싶다. 성공 표시 하나보다 실행한 명령, 확인한 범위, 남은 한계가 다음 작업에 더 도움이 된다."
          ]
        }
      ],
      "questions": [
        "이번 성공은 준비 검사인가, 실제 동작 검증인가?"
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
      "summary": "문서를 읽기 전에 소비하는 의존성의 버전을 확인한다.",
      "kind": "learning",
      "topic": "boundaries",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "확인한 구조",
          "paragraphs": [
            "여러 저장소가 공통 도구를 서로 다른 버전으로 고정하는 구조와, 실제 소비 버전을 확인하는 검증을 살펴봤다. 소스의 최신 상태를 그대로 현재 프로젝트의 동작으로 볼 수는 없다."
          ]
        },
        {
          "heading": "다시 확인할 순서",
          "paragraphs": [
            "소비하는 버전, 그 버전에 해당하는 소스, 현재 호출부를 연결해서 읽는다. 자동으로 최신 버전으로 바꾸는 것은 별도의 변경으로 다룬다."
          ]
        }
      ],
      "questions": [
        "이 설명은 지금 사용 중인 버전에서도 성립하는가?"
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
      "summary": "문단과 목록, 표의 구조를 고려해 HTML을 다룬다.",
      "kind": "learning",
      "topic": "tools",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "문서 도구에서 확인한 것",
          "paragraphs": [
            "HTML을 DOM으로 파싱하고 태그와 속성을 정리한 뒤 개행 규칙을 적용하는 구현을 살펴봤다. 태그를 단순히 삭제하는 작업에도 읽기 구조를 유지할 기준이 필요하다."
          ]
        },
        {
          "heading": "다음에 사용할 기준",
          "paragraphs": [
            "문단 경계, 목록 순서, 표의 셀 구분이 결과에서 읽히는지 확인하고 싶다. 허용 태그를 정하는 일과 결과를 브라우저에 안전하게 표시하는 일도 따로 검증한다."
          ]
        }
      ],
      "questions": [
        "변환 결과만 읽어도 원래의 목록과 표를 이해할 수 있는가?"
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
      "summary": "보기 좋은 출력과 원문 의미 보존을 함께 확인한다.",
      "kind": "question",
      "topic": "tools",
      "basis": "question",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "코드에서 생긴 질문",
          "paragraphs": [
            "문서 처리 코드에서 공백을 넓게 정리하는 부분을 확인했다. 모든 공백을 같은 방식으로 지워도 되는지 별도 사례로 확인할 필요가 있다."
          ]
        },
        {
          "heading": "확인해 보고 싶은 입력",
          "paragraphs": [
            "단어 사이 공백, 코드 블록의 들여쓰기, 표 안의 여러 문장처럼 공백 자체가 의미를 가진 입력을 비교해 보고 싶다. 아직 이 메모를 문제 해결 완료 기록으로 보지는 않는다."
          ]
        }
      ],
      "questions": [
        "영문 두 단어와 코드 들여쓰기가 변환 후에도 보존되는가?"
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
      "summary": "파싱의 정확성과 파일 접근의 안전성은 별개의 검증 대상이다.",
      "kind": "question",
      "topic": "tools",
      "basis": "question",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "남겨 둔 문제",
          "paragraphs": [
            "파일이나 폴더 경로를 입력받는 문서 도구를 검토하며, 어떤 위치와 크기까지 읽도록 허용할지 질문으로 남겼다. 실제 침해나 사고가 있었다는 뜻은 아니다."
          ]
        },
        {
          "heading": "확인할 항목",
          "paragraphs": [
            "허용 디렉터리, 심볼릭 링크, 큰 파일, 파싱 실패와 로그의 원문 노출을 검토하고 싶다. 도구가 로컬에서 동작하는지 외부 요청을 받는지에 따라 필요한 경계도 달라진다."
          ]
        }
      ],
      "questions": [
        "입력 경로가 의도한 작업 폴더 밖을 가리키면 어떻게 되는가?"
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
      "summary": "결과를 고르는 데이터와 마지막에 확인하는 데이터를 분리한다.",
      "kind": "learning",
      "topic": "data",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "개인 분석 도구에서 확인한 것",
          "paragraphs": [
            "시간순 이력을 사용하는 분석에서 과거 구간으로 후보를 고르고 뒤쪽 구간을 따로 평가하는 코드와 테스트를 확인했다. 미래 행이 예측 입력에 들어가지 않는지도 검사한다."
          ]
        },
        {
          "heading": "다른 작업에 이어질 기준",
          "paragraphs": [
            "성능이 좋아 보이는 결과를 발견했을 때, 그 결과를 보고 기준까지 바꾸지는 않았는지 확인하고 싶다. 평가 데이터로 방법을 조정했다면 새로운 검증이 필요하다는 질문을 남긴다."
          ]
        }
      ],
      "questions": [
        "평가 결과를 보고 고친 방법을 같은 데이터로 다시 증명하고 있지는 않은가?"
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
      "summary": "개선 근거가 없으면 단순한 기준을 유지하는 선택도 결과다.",
      "kind": "reflection",
      "topic": "data",
      "basis": "reflection",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "구현에서 출발한 생각",
          "paragraphs": [
            "개인 분석 도구에는 여러 후보를 비교하고 개선 조건을 충족하지 못하면 단순한 기준으로 돌아가는 선택이 있었다. 결과에도 실제 선택한 방식과 이유를 남긴다."
          ]
        },
        {
          "heading": "내가 계속 묻고 싶은 것",
          "paragraphs": [
            "복잡한 구현을 만들었다는 이유만으로 더 낫다고 말하고 싶지는 않다. 비교 지표가 실제 목적을 얼마나 설명하는지부터 확인하겠다. 이 기록은 추첨 결과의 예측 성공을 주장하지 않는다."
          ]
        }
      ],
      "questions": [
        "지표가 좋아진 것과 사용자의 실제 목적이 달성된 것은 같은가?"
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
      "summary": "재실행과 동시 실행에서도 최초 기록을 보존한다.",
      "kind": "solution",
      "topic": "everyday",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "개인 도구의 저장 방식",
          "paragraphs": [
            "회차별 기록을 완성된 임시 파일로 만든 뒤, 먼저 만들어진 결과를 덮어쓰지 않도록 저장하는 구현을 확인했다. 기존 기록은 회차와 입력 데이터의 지문을 비교해 다시 검증한다."
          ]
        },
        {
          "heading": "다음에 떠올릴 상황",
          "paragraphs": [
            "중복 요청이나 재실행에서도 같은 결과를 유지해야 하는 작업에 연결해 두고 싶다. 최초 결과를 보존하는 정책과 오류가 있는 원본을 수정하는 정책은 별도로 정해야 한다."
          ]
        }
      ],
      "questions": [
        "입력 데이터가 바뀌었을 때 기존 결과를 유지할지 다시 만들지 누가 결정하는가?"
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
      "summary": "링크가 있다는 사실과 지금 사용할 수 있다는 확인을 구별한다.",
      "kind": "learning",
      "topic": "everyday",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "목록 서비스에서 확인한 것",
          "paragraphs": [
            "개인 목록 서비스는 확인된 판매 정보와 참고 후보를 구분하고, 확인 시각이 오래되거나 검증되지 않은 링크는 검색 경로로 전환한다. 화면에도 정보의 상태를 구별해서 표시한다."
          ]
        },
        {
          "heading": "다른 기록에도 적용할 점",
          "paragraphs": [
            "확인 날짜만 현재로 바꿔 정보가 새로 검증된 것처럼 보이지 않게 하고 싶다. 기술 문서와 개인 기억도 무엇을 언제 확인했는지 함께 남기면 다시 읽을 때 판단하기 쉽다."
          ]
        }
      ],
      "questions": [
        "이 정보가 틀리거나 오래되었을 때 사용자가 안전하게 다음 행동을 할 수 있는가?"
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
      "summary": "브라우저에 남는 기록의 범위와 한계를 사용자에게 설명한다.",
      "kind": "learning",
      "topic": "everyday",
      "basis": "implementation",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "확인한 선택",
          "paragraphs": [
            "개인 목록 서비스는 찜과 준비 상태를 브라우저 저장소에 보관한다. 로그인 없이 사용할 수 있지만 다른 기기와 자동으로 동기화되는 구조는 아니다."
          ]
        },
        {
          "heading": "남겨 둘 질문",
          "paragraphs": [
            "사용자가 어디에 저장되는지 이해할 수 있어야 한다. 브라우저 데이터를 지우는 경우, 공용 기기를 사용하는 경우, 다른 기기로 옮기는 경우의 경험을 함께 살펴보고 싶다."
          ]
        }
      ],
      "questions": [
        "저장 위치를 모르는 사람도 데이터가 남는 범위를 이해할 수 있는가?"
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
      "summary": "공유 주소의 편리함과 포함된 데이터의 범위를 같이 생각한다.",
      "kind": "reflection",
      "topic": "everyday",
      "basis": "reflection",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "구현에서 확인한 구분",
          "paragraphs": [
            "개인 목록 서비스는 주소에 담긴 내용을 열람하고 자신의 브라우저에 사본으로 저장하는 흐름이다. 공동 편집이나 실시간 동기화와는 다른 사용 방식이다."
          ]
        },
        {
          "heading": "설계할 때 남겨 둘 기준",
          "paragraphs": [
            "공유 주소를 가진 사람이 무엇을 읽을 수 있는지 명확히 하고 싶다. 메모까지 주소에 담는다면 공유 전에 포함 내용을 확인하고, 사본의 수정이 원본에 반영되는 것처럼 보이지 않게 한다."
          ]
        }
      ],
      "questions": [
        "공유 버튼을 누르기 전에 어떤 내용이 전달되는지 볼 수 있는가?"
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
      "summary": "유실을 허용할 수 있는 신호와 다시 처리해야 하는 작업을 나눈다.",
      "kind": "question",
      "topic": "reliability",
      "basis": "question",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "도입 전에 확인할 사실",
          "paragraphs": [
            "Redis 공식 문서는 Pub/Sub를 at-most-once 전달로 설명한다. 구독자가 연결을 잃거나 처리하지 못한 메시지를 다시 보내는 기능은 제공하지 않는다."
          ]
        },
        {
          "heading": "내가 검토하고 싶은 조건",
          "paragraphs": [
            "일시적인 화면 갱신 신호와 완료 여부를 끝까지 추적해야 하는 작업을 같은 방식으로 보내도 되는지 묻고 싶다. 이 노트는 Pub/Sub를 실제 도입했다는 경험 기록이 아니다."
          ]
        }
      ],
      "questions": [
        "구독자가 잠시 끊겨도 괜찮은 메시지인가?",
        "재처리가 필요하다면 어떤 저장·확인 방식이 필요한가?"
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
      "summary": "모듈 분리와 독립 배포, 데이터 소유권을 같은 것으로 보지 않는다.",
      "kind": "question",
      "topic": "boundaries",
      "basis": "question",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "아직 열어 둔 질문",
          "paragraphs": [
            "모듈이 나뉘어 있다는 사실만으로 MSA를 도입했다고 적지는 않는다. 서비스마다 독립 배포와 데이터 소유권이 필요한 이유를 먼저 설명해 보고 싶다."
          ]
        },
        {
          "heading": "검토할 기준",
          "paragraphs": [
            "변경 빈도, 장애 격리, 팀의 운영 역량, 배포와 관측의 준비를 함께 본다. 경계를 나눈 뒤 늘어나는 통신과 정합성 문제도 선택의 비용으로 기록하겠다."
          ]
        }
      ],
      "questions": [
        "독립 배포가 실제로 필요한가?",
        "한 요청이 여러 저장소를 바꾸면 실패를 어떻게 다룰 것인가?"
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
      "summary": "DB 저장 성공 이후에도 후속 작업이 전달되지 않을 수 있는 구간을 검토한다.",
      "kind": "question",
      "topic": "reliability",
      "basis": "question",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "연결해서 생긴 질문",
          "paragraphs": [
            "DB 저장과 메시지 전송을 별도로 수행하면 한쪽만 성공하는 상황을 고려해야 한다. 커밋 후 실행 시점을 정한 다음에도 이 구간을 살펴볼 필요가 있다."
          ]
        },
        {
          "heading": "검토할 대안",
          "paragraphs": [
            "업무 변경과 전송할 의도를 같은 트랜잭션에 남기는 outbox는 검토할 수 있는 방법이다. 이후 전달의 중복과 소비자의 멱등성까지 함께 확인해야 한다. 이 기록은 현재 구현에 outbox가 있다고 주장하지 않는다."
          ]
        }
      ],
      "questions": [
        "저장 성공과 전송 실패를 재시작 후 구분할 기록이 있는가?"
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
      "summary": "잘 정리된 결론 때문에 당시의 마음이 사라지지 않게 한다.",
      "kind": "reflection",
      "topic": "principles",
      "basis": "profile",
      "recordedAt": "2026-10-06",
      "sections": [
        {
          "heading": "내가 남기고 싶은 기억",
          "paragraphs": [
            "어떤 일이 있었는지와 함께 당시 감정도 남기고 싶다고 이야기했다. 기술 문제의 정답만 보관하면 그때 왜 망설였는지, 무엇이 부담이었는지는 잊기 쉽다."
          ]
        },
        {
          "heading": "기록의 원칙",
          "paragraphs": [
            "당시 원문을 보존하고 나중의 생각을 덧붙이는 방식이 좋겠다. 코드에서 감정을 추측해 채우거나, 모든 기록을 성공담으로 다듬지는 않는다."
          ]
        }
      ],
      "questions": [
        "당시에 적은 내용과 지금 돌아보며 덧붙인 내용을 구별할 수 있는가?"
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
      "reason": "관측 가능한 동작이 문제를 찾고 고치는 데 도움이 된다.",
      "visibility": "public"
    },
    {
      "from": "external-memory",
      "to": "repeatable-work",
      "relation": "extends",
      "reason": "개인의 시행착오도 다시 사용할 수 있는 기준으로 남긴다.",
      "visibility": "public"
    },
    {
      "from": "feelings-and-hindsight",
      "to": "external-memory",
      "relation": "extends",
      "reason": "기억의 내용에 당시 마음과 이후 해석을 함께 보존한다.",
      "visibility": "public"
    },
    {
      "from": "async-request-boundary",
      "to": "operable-backend",
      "relation": "applies",
      "reason": "요청과 후속 작업의 완료 경계를 드러낸다.",
      "visibility": "public"
    },
    {
      "from": "dlq-recovery",
      "to": "async-request-boundary",
      "relation": "extends",
      "reason": "분리한 작업의 실패 이후 경로를 다룬다.",
      "visibility": "public"
    },
    {
      "from": "commit-before-side-effects",
      "to": "async-request-boundary",
      "relation": "extends",
      "reason": "작업을 전달하는 시점과 트랜잭션의 관계를 확인한다.",
      "visibility": "public"
    },
    {
      "from": "outbox-gap",
      "to": "commit-before-side-effects",
      "relation": "questions",
      "reason": "커밋 이후 프로세스 중단과 전달 누락을 추가로 검토한다.",
      "visibility": "public"
    },
    {
      "from": "outbox-gap",
      "to": "dlq-recovery",
      "relation": "extends",
      "reason": "전달 이전의 누락과 전달 이후의 실패를 구별한다.",
      "visibility": "public"
    },
    {
      "from": "pubsub-delivery",
      "to": "async-request-boundary",
      "relation": "questions",
      "reason": "알림 신호와 추적해야 할 작업에 같은 전달 방식을 쓸 수 있는지 묻는다.",
      "visibility": "public"
    },
    {
      "from": "pubsub-delivery",
      "to": "dlq-recovery",
      "relation": "questions",
      "reason": "재전달이 없는 방식에서 복구 요구를 만족할 수 있는지 확인한다.",
      "visibility": "public"
    },
    {
      "from": "cache-warmup-cost",
      "to": "observe-before-optimize",
      "relation": "applies",
      "reason": "캐시 준비 구간의 비용도 측정 대상으로 삼는다.",
      "visibility": "public"
    },
    {
      "from": "cache-readiness-is-not-use",
      "to": "cache-warmup-cost",
      "relation": "extends",
      "reason": "설정·예열·실제 조회 경로를 함께 추적한다.",
      "visibility": "public"
    },
    {
      "from": "cache-readiness-is-not-use",
      "to": "verification-is-not-a-label",
      "relation": "supports",
      "reason": "준비와 실제 효과를 분리해 확인한다.",
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
      "reason": "관측 신호를 확보하면서 수집할 데이터 범위를 제한한다.",
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
      "reason": "명세와 생성 결과의 기준을 반복 작업에 적용한다.",
      "visibility": "public"
    },
    {
      "from": "pinned-dependency-context",
      "to": "contract-before-generated-code",
      "relation": "extends",
      "reason": "명세와 소비 버전이 실제로 일치하는지 확인한다.",
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
      "reason": "자동화가 적용할 규칙의 소유 범위를 정한다.",
      "visibility": "public"
    },
    {
      "from": "verification-is-not-a-label",
      "to": "repeatable-work",
      "relation": "supports",
      "reason": "반복 실행의 결과를 실제 증거로 남긴다.",
      "visibility": "public"
    },
    {
      "from": "verification-is-not-a-label",
      "to": "observe-before-optimize",
      "relation": "supports",
      "reason": "관찰한 범위와 확인하지 못한 범위를 구별한다.",
      "visibility": "public"
    },
    {
      "from": "html-structure",
      "to": "whitespace-is-content",
      "relation": "questions",
      "reason": "태그 정리 이후에도 단어와 문서의 의미가 보존되는지 묻는다.",
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
      "reason": "대표 입력의 결과를 비교해 변환의 의미를 확인한다.",
      "visibility": "public"
    },
    {
      "from": "time-split-validation",
      "to": "observe-before-optimize",
      "relation": "applies",
      "reason": "평가 조건과 입력 시점의 경계를 관찰한다.",
      "visibility": "public"
    },
    {
      "from": "baseline-before-complexity",
      "to": "time-split-validation",
      "relation": "extends",
      "reason": "분리한 평가에서 단순한 기준보다 나아졌는지 확인한다.",
      "visibility": "public"
    },
    {
      "from": "baseline-before-complexity",
      "to": "operable-backend",
      "relation": "supports",
      "reason": "검증되지 않은 복잡성을 늘리지 않는 기준을 남긴다.",
      "visibility": "public"
    },
    {
      "from": "first-write-wins",
      "to": "dlq-recovery",
      "relation": "extends",
      "reason": "재실행에서 같은 결과를 유지해야 하는 문제를 연결한다.",
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
      "reason": "링크의 존재와 최근 확인 상태를 구분한다.",
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
      "reason": "내 브라우저 저장과 다른 사람에게 전달되는 사본을 구별한다.",
      "visibility": "public"
    },
    {
      "from": "shared-copy-is-not-sync",
      "to": "external-memory",
      "relation": "questions",
      "reason": "기억을 밖에 남길 때 누구에게 어떤 내용을 보여 줄지 묻는다.",
      "visibility": "public"
    },
    {
      "from": "msa-boundary",
      "to": "transaction-context",
      "relation": "questions",
      "reason": "서비스를 나눈 뒤 트랜잭션 범위를 다시 정의할 수 있는지 묻는다.",
      "visibility": "public"
    },
    {
      "from": "msa-boundary",
      "to": "observe-before-optimize",
      "relation": "questions",
      "reason": "나눈 서비스의 요청 흐름을 관측할 준비가 있는지 확인한다.",
      "visibility": "public"
    },
    {
      "from": "msa-boundary",
      "to": "baseline-before-complexity",
      "relation": "questions",
      "reason": "분리의 이점이 늘어나는 운영 비용을 설명하는지 묻는다.",
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
      "reason": "캐시의 빠른 조회와 값의 신선도를 함께 살펴본다.",
      "visibility": "public"
    },
    {
      "from": "parser-input-boundary",
      "to": "project-boundaries",
      "relation": "extends",
      "reason": "자동 도구가 읽고 적용할 수 있는 경계를 정한다.",
      "visibility": "public"
    }
  ]
} satisfies BrainCatalog;
