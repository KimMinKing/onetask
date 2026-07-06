export interface SpringChallengeQuiz {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export const SPRING_CHALLENGE: Record<number, SpringChallengeQuiz[]> = {
  1: [
    {
      question: "@Component가 없는 클래스는 Spring이 어떻게 처리하나요?",
      options: ["에러 발생", "무시하고 스캔하지 않음", "자동으로 @Component 추가", "경고만 출력"],
      answer: 1,
      explanation: "Spring은 @Component, @Service, @Repository 등이 있는 클래스만 Bean으로 등록해요.",
    },
    {
      question: "@Autowired가 생성자 주입에 없어도 되는 이유는?",
      options: ["생성자는 하나만 가능해서", "Spring 4.3+부터 단일 생성자는 자동 주입", "@RequiredArgsConstructor가 대신 처리", "필드 주입이 기본이라서"],
      answer: 1,
      explanation: "Spring 4.3부터 생성자가 하나뿐이면 @Autowired 없이도 자동으로 주입해요.",
    },
    {
      question: "싱글톤 Bean의 @PostConstruct는 언제 몇 번 호출되나요?",
      options: ["애플리케이션 시작 시 1번", "매 요청 시마다", "Bean 생성 시마다 1번", "절대 호출 안 됨"],
      answer: 0,
      explanation: "싱글톤 Bean은 애플리케이션 시작 시 1번만 생성되고, @PostConstruct도 그때 1번 호출돼요.",
    },
    {
      question: "@Qualifier(\"primary\")가 있을 때 해당 이름의 Bean이 없으면?",
      options: ["기본 Bean 사용", "NoSuchBeanDefinitionException 발생", "null 주입", "빈 문자열 Bean 생성"],
      answer: 1,
      explanation: "@Qualifier로 지정한 Bean을 찾을 수 없으면 예외가 발생해요.",
    },
    {
      question: "prototype 스코프 Bean을 싱글톤 Bean에 주입하면?",
      options: ["매번 새로운 prototype Bean 생성", "싱글톤 Bean 생성 시 1번만 생성", "주입 불가능 에러", "매 요청 시마다 새로 생성"],
      answer: 1,
      explanation: "싱글톤 Bean은 1번만 생성되므로, 그 안에 주입된 prototype도 1번만 생성돼요. @Resolve 필요.",
    },
  ],
  2: [
    {
      question: "@Lazy는 언제 Bean을 생성하나요?",
      options: ["애플리케이션 시작 시", "실제 주입/사용 시점", "트랜잭션 시작 시", "애플리케이션 종료 시"],
      answer: 1,
      explanation: "@Lazy는 실제로 필요할 때까지 Bean 생성을 지연시켜요.",
    },
    {
      question: "A → B → A 순환 의존성을 해결하는 방법이 아닌 것은?",
      options: ["@Lazy 사용", "필드 주입으로 변경", "@PostConstruct에서 주입", "Setter 주입"],
      answer: 2,
      explanation: "@PostConstruct는 이미 Bean 생성 완료 후라 늦어요. @Lazy, 필드/세터 주입으로 해결해요.",
    },
    {
      question: "@Primary가 여러 개 있으면?",
      options: ["첫 번째 선택", "NoUniqueBeanDefinitionException 발생", "모두 주입", "랜덤 선택"],
      answer: 1,
      explanation: "@Primary가 여러 개이면 여전히 모호해서 예외가 발생해요.",
    },
    {
      question: "@RequiredArgsConstructor는 어떤 필드로 생성자를 만드나요?",
      options: ["모든 필드", "@Autowired 필드만", "final 필드", "static 필드"],
      answer: 2,
      explanation: "final 필드를 매개변수로 하는 생성자를 자동 생성해요.",
    },
    {
      question: "생성자 주입 vs 필드 주입: 테스트 가능성이 더 좋은 것은?",
      options: ["필드 주입", "생성자 주입", "둘 다 같음", "세터 주입"],
      answer: 1,
      explanation: "생성자 주입은 테스트 시 new UserService(mockRepo)로 쉽게 모의 객체 주입 가능해요.",
    },
  ],
  3: [
    {
      question: "@Pointcut(\"execution(* com.example.service.*.*(..))\")은 무엇을 매칭하나요?",
      options: ["모든 메서드", "service 패키지의 모든 메서드", "service 패키지의 첫 번째 메서드만", "controller만"],
      answer: 1,
      explanation: "com.example.service 패키지 하위의 모든 클래스의 모든 메서드를 매칭해요.",
    },
    {
      question: "pjp.proceed()를 호출하지 않으면?",
      options: ["실제 메서드 실행 안 됨", "자동으로 실행됨", "예외 발생", "무한 루프"],
      answer: 0,
      explanation: "pjp.proceed()로 실제 타겟 메서드를 실행해요. 호출하지 않으면 실행 안 돼요.",
    },
    {
      question: "@AfterReturning은 언제 실행되나요?",
      options: ["메서드 실행 전", "메서드 정상 반환 후", "메서드 예외 발생 시", "애플리케이션 종료 시"],
      answer: 1,
      explanation: "메서드가 정상적으로 반환된 후에 실행돼요.",
    },
    {
      question: "Spring AOP의 기본 프록시 구현은?",
      options: ["정적 프록시만", "JDK Dynamic Proxy 또는 CGLIB", "CGLIB만", "프록시 없이 직접 호출"],
      answer: 1,
      explanation: "인터페이스 있으면 JDK Proxy, 없으면 CGLIB로 프록시 생성해요.",
    },
    {
      question: "AOP로 트랜잭션을 구현하는 어노테이션은?",
      options: ["@AOP", "@Transactional", "@Transaction", "@Tx"],
      answer: 1,
      explanation: "@Transactional이 AOP로 트랜잭션을 자동으로 관리해요.",
    },
  ],
  4: [
    {
      question: "@GetMapping(\"/users/{id}\")에서 id에 \"abc\"가 오면?",
      options: ["자동 변환", "MethodArgumentTypeMismatchException 발생", "null 처리", "빈 문자열 처리"],
      answer: 1,
      explanation: "타입 변환 실패 시 예외가 발생해요.",
    },
    {
      question: "@RequestBody와 @RequestParam의 차이는?",
      options: ["둘 다 같음", "@RequestBody는 HTTP 본문, @RequestParam은 쿼리 파라미터", "@RequestBody는 URL, @RequestParam은 본문", "순서만 다름"],
      answer: 1,
      explanation: "@RequestBody는 JSON 본문을 객체로 매핑, @RequestParam은 URL 쿼리 파라미터를 매핑해요.",
    },
    {
      question: "ResponseEntity.status(HttpStatus.CREATED).body(user)의 상태 코드는?",
      options: ["200", "201", "204", "400"],
      answer: 1,
      explanation: "HttpStatus.CREATED는 201 Created 응답이에요.",
    },
    {
      question: "@RestController = @Controller + 무엇?",
      options: ["@RequestBody", "@Component", "@Service", "@Repository"],
      answer: 0,
      explanation: "@RestController는 @Controller + @ResponseBody의 조합이에요.",
    },
    {
      question: "@PathVariable이 필수가 아닌 경우 처리하는 방법은?",
      options: ["@PathVariable(required=false)", "@PathVariable(optional=true)", "필수 항상", "@PathVariable(nullable=true)"],
      answer: 0,
      explanation: "required=false로 선택적 파라미터로 만들 수 있어요.",
    },
  ],
  5: [
    {
      question: "spring-boot-starter-web은 어떤 의존성을 포함하나요?",
      options: ["Spring MVC만", "Spring MVC + Tomcat + Jackson", "Spring MVC + JPA", "Spring MVC + Security"],
      answer: 1,
      explanation: "web starter는 MVC, 내장 Tomcat, JSON 처리(Jackson)를 포함해요.",
    },
    {
      question: "Profile을 선택하는 JVM 옵션은?",
      options: ["--profile=dev", "-Dspring.profiles.active=dev", "-Pdev", "--env=dev"],
      answer: 1,
      explanation: "-Dspring.profiles.active=dev로 Profile을 설정해요.",
    },
    {
      question: "@ConditionalOnProperty(name=\"feature.enabled\", havingValue=\"true\")는?",
      options: ["Property가 false일 때 생성", "Property가 true일 때만 Bean 생성", "항상 생성", "Property 없으면 생성"],
      answer: 1,
      explanation: "feature.enabled=true일 때만 조건 충족해서 Bean 생성돼요.",
    },
    {
      question: "application-{profile}.yml의 우선순위가 더 높은 것은?",
      options: ["application-default.yml", "application-{profile}.yml", "둘 다 같음", "나중에 로드되는 것"],
      answer: 1,
      explanation: "Profile-specific 설정이 기본 설정보다 우선순위가 높아요.",
    },
    {
      question: "Spring Boot의 내장 서버를 변경하려면?",
      options: ["application.yml의 server.type", "의존성에서 Tomcat 제외 + Jetty 추가", "@ServerType 어노테이션", "불가능"],
      answer: 1,
      explanation: "Tomcat 의존성을 제외하고 Jetty 또는 Undertow를 추가하면 돼요.",
    },
  ],
  6: [
    {
      question: "findByEmailAndUsername(String email, String username)는 어떤 WHERE 절을 생성하나요?",
      options: ["WHERE email OR username", "WHERE email AND username", "WHERE email = username", "ORDER BY email, username"],
      answer: 1,
      explanation: "And로 연결하면 AND 조건으로 WHERE 절 생성",
    },
    {
      question: "@Entity가 없는 클래스를 Repository로 조회하면?",
      options: ["자동으로 @Entity 추가", "MappingException 발생", "정상 작동", "경고만 출력"],
      answer: 1,
      explanation: "@Entity가 없으면 JPA Entity로 인식하지 못해 예외 발생",
    },
    {
      question: "영속성 컨텍스트의 1차 캐시는 어떤 스코프를 가지나요?",
      options: ["애플리케이션 전체", "트랜잭션 내", "요청 내", "세션 내"],
      answer: 1,
      explanation: "영속성 컨텍스트는 트랜잭션 범위 내에서 유효해요.",
    },
    {
      question: "@Transactional이 없을 때 발생하지 않는 것은?",
      options: ["영속성 컨텍스트 활성화", "더티 체킹", "자동 커밋", "트랜잭션 시작"],
      answer: 2,
      explanation: "트랜잭션이 없으면 영속성 컨텍스트도 활성화되지 않아요.",
    },
    {
      question: "쿼리 메서드 findByCreatedAtAfter(LocalDateTime date)는?",
      options: ["createdAt < date", "createdAt <= date", "createdAt > date", "createdAt >= date"],
      answer: 2,
      explanation: "After는 > 조건이에요.",
    },
  ],
  7: [
    {
      question: "REQUIRED 전파에서 메인 트랜잭션 없이 호출하면?",
      options: ["에러 발생", "새 트랜잭션 생성", "트랜잭션 없이 실행", "대기"],
      answer: 1,
      explanation: "REQUIRED는 기존 트랜잭션 합류, 없으면 새로 생성해요.",
    },
    {
      question: "REQUIRES_NEW에서 내부 트랜잭션 롤백 시 메인 트랜잭션은?",
      options: ["함께 롤백", "커밋됨", "영향 없음", "일시 정지"],
      answer: 2,
      explanation: "REQUIRES_NEW는 완전히 독립적인 트랜잭션이라 서로 영향을 주지 않아요.",
    },
    {
      question: "READ_COMMITTED 격리 레벨에서 발생 가능한 것은?",
      options: ["더티 리드", "반복 불가능 읽기", "팬텀 리드", "모두 방지"],
      answer: 1,
      explanation: "READ_COMMITTED는 더티 리드만 방지, 반복 불가능 읽기는 가능해요.",
    },
    {
      question: "@Transactional(rollbackFor = {IOException.class})는?",
      options: ["모든 예외 롤백", "IOException만 롤백", "RuntimeException만 롤백", "롤백 안 함"],
      answer: 1,
      explanation: "rollbackFor로 체크 예외도 롤백 대상으로 지정해요.",
    },
    {
      question: "트랜잭션 전파가 PROPAGATION_NEVER인 메서드를 트랜잭션 내에서 호출하면?",
      options: ["새 트랜잭션 생성", "IllegalTransactionStateException 발생", "기존 트랜잭션 합류", "트랜잭션 없이 실행"],
      answer: 1,
      explanation: "NEVER는 트랜잭션이 있으면 예외를 발생시켜요.",
    },
  ],
  8: [
    {
      question: "JWT 토큰의 일반적인 헤더 형식은?",
      options: ["Token: xxx", "Authorization: Bearer xxx", "Auth: xxx", "Cookie: token=xxx"],
      answer: 1,
      explanation: "Authorization: Bearer {token} 형식이 표준이에요.",
    },
    {
      question: "SecurityContextHolder.getContext().getAuthentication()의 기본값은?",
      options: ["null", "익명 Authentication", "빈 문자열", "AnonymousAuthentication"],
      answer: 1,
      explanation: "인증 전에는 익명 사용자 Authentication이 저장돼요.",
    },
    {
      question: "BCryptPasswordEncoder.encode(\"password\")를 여러 번 호출하면?",
      options: ["같은 해시", "매번 다른 해시", "두 번째부터 에러", "null 반환"],
      answer: 1,
      explanation: "BCrypt는 매번 다른 salt를 사용해서 해시가 달라져요.",
    },
    {
      question: "hasRole(\"ADMIN\")은 어떤 권한을 체크하나요?",
      options: ["ADMIN", "ROLE_ADMIN", "ADMIN\"", "\"ADMIN\""],
      answer: 1,
      explanation: "hasRole은 자동으로 ROLE_ 접두사를 붙여요.",
    },
    {
      question: "JWT 토큰의 만료를 확인하는 방법은?",
      options: ["토큰 길이", "exp 클레임과 현재 시간 비교", "iss 클레임", "토큰 서명"],
      answer: 1,
      explanation: "exp 클레임(만료 시간)과 현재 시간을 비교해서 만료 여부를 확인해요.",
    },
  ],
  9: [
    {
      question: "@WebMvcTest는 어떤 레이어를 테스트하나요?",
      options: ["Controller만", "Service만", "Repository만", "전체"],
      answer: 0,
      explanation: "@WebMvcTest는 컨트롤러 레이어만 테스트하는 슬라이스 테스트예요.",
    },
    {
      question: "@MockBean은 실제 Bean을 어떻게 처리하나요?",
      options: ["실제 Bean 그대로 사용", "모의 객체로 교체", "추가만 함", "삭제"],
      answer: 1,
      explanation: "@MockBean은 해당 타입의 실제 Bean을 Mockito 모의 객체로 교체해요.",
    },
    {
      question: "TestContainers의 장점은?",
      options: ["빠름", "실제 Docker 환경으로 통합 테스트", "설정 불필요", "메모리 절약"],
      answer: 1,
      explanation: "실제 Docker 컨테이너로 테스트해서 H2 대신 실제 DB로 테스트 가능해요.",
    },
    {
      question: "@SpringBootTest의 기본 동작은?",
      options: ["Controller만 로드", "전체 애플리케이션 컨텍스트 로드", "테스트만 로드", "설정만 로드"],
      answer: 1,
      explanation: "@SpringBootTest는 전체 애플리케이션 컨텍스트를 로드해서 통합 테스트를 해요.",
    },
    {
      question: "MockMvc.perform()의 기본 반환 타입은?",
      options: ["ResponseEntity", "ResultActions", "String", "MockHttpServletResponse"],
      answer: 1,
      explanation: "MockMvc.perform()은 ResultActions를 반환해서 체이닝으로 검증을 할 수 있어요.",
    },
  ],
  10: [
    {
      question: "3계층 아키텍처의 올바른 순서는?",
      options: ["Controller → Repository → Service", "Controller → Service → Repository", "Service → Controller → Repository", "Repository → Service → Controller"],
      answer: 1,
      explanation: "요청은 Controller → Service → Repository로 흘러요.",
    },
    {
      question: "DTO의 주요 목적은?",
      options: ["DB 저장", "레이어 간 데이터 전송", "UI 렌더링", "로그 출력"],
      answer: 1,
      explanation: "DTO(Data Transfer Object)는 레이어 간 데이터 전송을 위해 사용해요.",
    },
    {
      question: "@ControllerAdvice로 전역 예외를 처리할 때 사용하는 어노테이션은?",
      options: ["@ExceptionHandler", "@Catch", "@TryCatch", "@GlobalException"],
      answer: 0,
      explanation: "@ExceptionHandler(예외클래스.class)로 특정 예외를 처리해요.",
    },
    {
      question: "Service 레이어의 주요 책임은?",
      options: ["HTTP 처리", "비즈니스 로직 & 트랜잭션", "DB 쿼리", "정적 파일 제공"],
      answer: 1,
      explanation: "Service는 핵심 비즈니스 로직과 트랜잭션 관리를 담당해요.",
    },
    {
      question: "REST API 설계 시 POST /api/products와 POST /api/products/{id}의 차이는?",
      options: ["둘 다 생성", "첫 번째는 생성, 두 번째는 수정", "둘 다 수정", "순서만 다름"],
      answer: 1,
      explanation: "POST /resources는 생성, POST /resources/{id}는 해당 ID 리소스의 특정 작업(상태 변경 등)을 의미해요.",
    },
  ],
};
