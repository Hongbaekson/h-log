import type { BrainCatalog } from "./brain.ts";

// 기존 H-Log 공개 소개·Portfolio, 작성자가 밝힌 목적, 공개 기술 문서만 사용한다.
// 로컬 저장소 조사에서 작성한 검토본은 이 파일이나 런타임에서 가져오지 않는다.
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
      "from": "pubsub-delivery",
      "to": "async-request-boundary",
      "relation": "questions",
      "reason": "알림 신호와 추적해야 할 작업에 같은 전달 방식을 쓸 수 있는지 묻는다.",
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
      "from": "msa-boundary",
      "to": "observe-before-optimize",
      "relation": "questions",
      "reason": "나눈 서비스의 요청 흐름을 관측할 준비가 있는지 확인한다.",
      "visibility": "public"
    }
  ]
} satisfies BrainCatalog;
