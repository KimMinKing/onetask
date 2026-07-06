export interface SpringExample {
  problem: string;
  hint?: string;
  solution: string;
}

export interface SpringQuiz {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface SpringStep {
  id: number;
  title: string;
  subtitle: string;
  emoji: string;
  concepts: string[];
  explanation: string;
  aiConnection: string;
  examples: SpringExample[];
  quiz: SpringQuiz[];
}

export const SPRING_CURRICULUM: SpringStep[] = [
  {
    id: 1,
    title: "Spring 첫걸음",
    subtitle: "IoC Container, Bean 생명주기",
    emoji: "🌱",
    concepts: ["IoC", "DI", "@Component", "@Autowired", "Bean"],
    explanation: `Spring은 자바 애플리케이션 개발을 위한 필수 프레임워크예요. 핵심은 제어의 역전(IoC)이에요.

**IoC Container란?**
객체의 생성과 생명주기를 개발자가 아닌 Spring Container가 관리해요.

// 개발자가 직접 생성 (기존 방식)
UserService service = new UserService();

// Spring에 위탁 (IoC)
@Component
public class UserService {
    // Spring이 자동으로 생성하고 관리
}

**Bean 생명주기**
1. Spring이 @Component 클래스를 스캔
2. ApplicationContext가 Bean 생성
3. @PostConstruct 메서드 실행
4. 애플리케이션 사용
5. @PreDestroy 메서드 실행
6. Bean 소멸

**의존성 주입 (DI)**
필요한 객체를 외부에서 주입받아요.

@Service
public class OrderService {
    private final UserRepository userRepository;

    // 생성자 주입 (권장)
    public OrderService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}`,
    aiConnection: "Spring Boot는 AI 서비스 API 개발에 널리 쓰여요. 모델 추론 엔드포인트를 Spring으로 구축하고 Kubernetes에 배포하는 것이 업계 표준이에요.",
    examples: [
      {
        problem: "@Component로 UserService를 정의하고, OrderService에 생성자 주입으로 주입하세요.",
        hint: "public class OrderService { private final UserService userService; public OrderService(UserService userService) { ... } }",
        solution: `@Component\npublic class UserService {\n    public void createUser() {\n        System.out.println(\"User created\");\n    }\n}\n\n@Service\npublic class OrderService {\n    private final UserService userService;\n\n    public OrderService(UserService userService) {\n        this.userService = userService;\n    }\n}`,
      },
      {
        problem: "@PostConstruct로 초기화 메서드를 만들어 애플리케이션 시작 시 메시지를 출력하세요.",
        solution: `@Component\npublic class DatabaseInitializer {\n    @PostConstruct\n    public void init() {\n        System.out.println(\"Database initialized\");\n    }\n}`,
      },
      {
        problem: "@Scope(\"prototype\")으로 빈 스코프를 변경하고, 매번 새로운 인스턴스가 생성됨을 확인하세요.",
        solution: `@Component\n@Scope(\"prototype\")\npublic class PrototypeBean {\n    public PrototypeBean() {\n        System.out.println(\"New instance created: \" + this.hashCode());\n    }\n}\n\n// 호출할 때마다 새 인스턴스 생성`,
      },
    ],
    quiz: [
      {
        question: "IoC Container의 주된 역할은?",
        options: ["데이터베이스 연결", "객체 생명주기 관리", "HTTP 요청 처리", "로그 출력"],
        answer: 1,
        explanation: "IoC Container는 객체 생성, 의존성 주입, 생명주기 관리를 담당해요.",
      },
      {
        question: "의존성 주입 방식 중 가장 권장되는 것은?",
        options: ["필드 주입", "세터 주입", "생성자 주입", "메서드 주입"],
        answer: 2,
        explanation: "생성자 주입은 필수 의존성을 명확히 하고 테스트하기 쉬워요.",
      },
      {
        question: "@PostConstruct는 언제 실행되나요?",
        options: ["애플리케이션 시작 전", "Bean 생성 후", "애플리케이션 종료 시", "매 요청 시"],
        answer: 1,
        explanation: "@PostConstruct는 Bean 생성 직후, 초기화 단계에서 실행돼요.",
      },
      {
        question: "Spring Bean의 기본 스코프는?",
        options: ["prototype", "request", "singleton", "session"],
        answer: 2,
        explanation: "기본 스코프는 singleton으로, 하나의 Bean 인스턴스만 생성돼요.",
      },
    ],
  },
  {
    id: 2,
    title: "의존성 주입 심화",
    subtitle: "@Qualifier, @Primary, 생성자 주입 패턴",
    emoji: "💉",
    concepts: ["@Qualifier", "@Primary", "생성자 주입", "Lombok", "순환 의존성"],
    explanation: `실전에서 자주 마주하는 DI 패턴과 문제 해결법을 알아봐요.

**@Qualifier: 같은 타입의 Bean 구분**
@Repository(\"mysqlRepo\")
public class MySqlUserRepository implements UserRepository {}

@Repository(\"mongoRepo\")
public class MongoUserRepository implements UserRepository {}

@Service
public class UserService {
    private final UserRepository userRepository;

    // @Qualifier로 구체 Bean 지정
    public UserService(@Qualifier(\"mysqlRepo\") UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}

**@Primary: 기본 Bean 지정**
@Primary
@Repository
public class MySqlUserRepository implements UserRepository {}

@Repository
public class MongoUserRepository implements UserRepository {}

// @Qualifier 없이도 MySqlUserRepository 주입

**Lombok으로 생성자 주입 간소화**
@Service
@RequiredArgsConstructor  // Lombok: final 필드로 생성자 자동 생성
public class OrderService {
    private final UserService userService;
    private final ProductService productService;
}

**순환 의존성 문제**
// A → B → A (순환 참조)
@Service
public class ServiceA {
    private final ServiceB serviceB;
    public ServiceA(ServiceB serviceB) { this.serviceB = serviceB; }
}

@Service
public class ServiceB {
    private final ServiceA serviceA;
    public ServiceB(ServiceA serviceA) { this.serviceA = serviceA; }
}

// 해결: @Lazy 사용
@Service
public class ServiceB {
    private final ServiceA serviceA;
    public ServiceB(@Lazy ServiceA serviceA) { this.serviceA = serviceA; }
}`,
    aiConnection: "대규모 AI 시스템에서도 모듈 간 의존성 명확화는 필수예요. 추론 서비스, 모델 로더, 전처리기 등을 DI로 조립해요.",
    examples: [
      {
        problem: "PaymentService가 결제 방식(CreditCard, KakaoPay)에 따라 다른 구현체를 주입받도록 @Qualifier를 사용하세요.",
        solution: `public interface PaymentProcessor { void pay(int amount); }\n\n@Component(\"card\")\npublic class CreditCardProcessor implements PaymentProcessor {\n    public void pay(int amount) { System.out.println(\"Card paid: \" + amount); }\n}\n\n@Component(\"kakao\")\npublic class KakaoPayProcessor implements PaymentProcessor {\n    public void pay(int amount) { System.out.println(\"Kakao paid: \" + amount); }\n}\n\n@Service\npublic class PaymentService {\n    private final PaymentProcessor processor;\n    public PaymentService(@Qualifier(\"kakao\") PaymentProcessor processor) {\n        this.processor = processor;\n    }\n    public void process(int amount) { processor.pay(amount); }\n}`,
      },
      {
        problem: "@Primary로 기본 구현체를 지정하고, 특정 구현체를 사용할 때만 @Qualifier를 적용하세요.",
        solution: `@Primary\n@Component\npublic class DefaultCache implements Cache { /* ... */ }\n\n@Component(\"redis\")\npublic class RedisCache implements Cache { /* ... */ }\n\n@Service\npublic class ProductService {\n    // @Qualifier 없으면 DefaultCache 주입\n    private final Cache cache;\n    public ProductService(Cache cache) { this.cache = cache; }\n}`,
      },
      {
        problem: "Lombok의 @RequiredArgsConstructor로 생성자 주입 코드를 간소화하세요.",
        solution: `@Service\n@RequiredArgsConstructor  // final 필드로 생성자 자동 생성\npublic class OrderService {\n    private final UserService userService;\n    private final EmailService emailService;\n    \n    // 생성자 없이도 주입 가능!\n    public void createOrder() {\n        userService.createUser();\n        emailService.sendEmail();\n    }\n}`,
      },
    ],
    quiz: [
      {
        question: "@Qualifier의 용도는?",
        options: ["Bean 생성 속도 향상", "같은 타입의 다중 Bean 구분", "순환 의존성 해결", "데이터 검증"],
        answer: 1,
        explanation: "@Qualifier는 같은 인터페이스를 구현한 여러 Bean 중 특정 Bean을 선택할 때 사용해요.",
      },
      {
        question: "@Primary가 없을 때, 같은 타입의 Bean이 여러 개이면?",
        options: ["첫 번째 Bean 주입", "NoUniqueBeanDefinitionException 발생", "모두 주입", "랜덤 선택"],
        answer: 1,
        explanation: "주입할 Bean을 결정할 수 없어 예외가 발생해요.",
      },
      {
        question: "@RequiredArgsConstructor는 무엇을 하나요?",
        options: ["모든 필드로 생성자", "final 필드로 생성자", "@Autowired 필드 주입", "기본 생성자"],
        answer: 1,
        explanation: "final 필드를 매개변수로 하는 생성자를 Lombok이 자동 생성해요.",
      },
      {
        question: "순환 의존성 해결하는 어노테이션은?",
        options: ["@Circular", "@Lazy", "@Async", "@Qualifier"],
        answer: 1,
        explanation: "@Lazy로 지연 로딩하면 순환 의존성을 피할 수 있어요.",
      },
    ],
  },
  {
    id: 3,
    title: "AOP (관점 지향 프로그래밍)",
    subtitle: "공통 관심사 분리, @Aspect",
    emoji: "🎯",
    concepts: ["AOP", "Advice", "Pointcut", "JoinPoint", "@Around", "프록시 패턴"],
    explanation: `AOP는 핵심 로직과 공통 기능(로깅, 트랜잭션, 보안)을 분리해요.

**AOP 기본 개념**
- **Aspect**: 공통 기능을 모듈화한 것
- **JoinPoint**: Aspect를 적용할 지점 (메서드 실행 등)
- **Pointcut**: JoinPoint 중 실제 Aspect를 적용할 곳
- **Advice**: Pointcut에서 실행할 로직

**@Aspect로 로깅 구현**
@Aspect
@Component
public class LoggingAspect {
    // com.example 패키지의 모든 메서드 실행 전후
    @Around(\"execution(* com.example..*.*(..))\")
    public Object logAround(ProceedingJoinPoint pjp) throws Throwable {
        String method = pjp.getSignature().getName();
        System.out.println(\"[BEFORE] \" + method + \" 실행\");

        long start = System.currentTimeMillis();
        Object result = pjp.proceed();  // 실제 메서드 실행
        long duration = System.currentTimeMillis() - start;

        System.out.println(\"[AFTER] \" + method + \" 완료 (\" + duration + \"ms)\");
        return result;
    }
}

**트랜잭션 AOP**
@Service
public class OrderService {
    @Transactional  // AOP로 자동 적용됨
    public void createOrder(Order order) {
        orderRepository.save(order);
        inventoryService.decreaseStock(order);
        // 예외 시 자동 롤백 (AOP가 처리)
    }
}

**AOP 작동 원리**
Spring AOP는 프록시 패턴으로 구현돼요.

// 실제: Spring이 생성한 프록시 객체
OrderService proxy = new OrderServiceProxy(new OrderService());
proxy.createOrder(order);  // → 프록시가 트랜잭션/로깅 처리 후 실제 객체 호출`,
    aiConnection: "AI 추론 서비스에서 AOP로 요청 로깅, 성능 측정, 에러 추적을 자동화해요. 모델 호출 메서드에 @Around로 실행 시간을 측정해요.",
    examples: [
      {
        problem: "@Aspect로 모든 Service 메서드의 실행 시간을 측정하고 로그를 남기세요.",
        solution: `@Aspect\n@Component\npublic class PerformanceAspect {\n    @Around(\"execution(* com.example.service..*.*(..))\")\n    public Object measureTime(ProceedingJoinPoint pjp) throws Throwable {\n        String method = pjp.getSignature().toShortString();\n        long start = System.currentTimeMillis();\n        \n        Object result = pjp.proceed();\n        \n        long duration = System.currentTimeMillis() - start;\n        System.out.println(\"[PERF] \" + method + \" took \" + duration + \"ms\");\n        return result;\n    }\n}`,
      },
      {
        problem: "@Before Advice로 관리자 권한을 체크하고, 없으면 예외를 발생시키세요.",
        solution: `@Aspect\n@Component\npublic class SecurityAspect {\n    @Before(\"@annotation(AdminOnly)\")\n    public void checkAdmin(JoinPoint jp) {\n        Authentication auth = SecurityContextHolder.getContext().getAuthentication();\n        if (auth == null || !auth.getAuthorities().contains(\"ADMIN\")) {\n            throw new AccessDeniedException(\"관리자만 접근 가능\");\n        }\n    }\n}\n\n// 사용\n@AdminOnly\npublic void deleteUser(Long id) { /* ... */ }`,
      },
      {
        problem: "@AfterReturning으로 메서드 반환 값을 로그에 남기세요.",
        solution: `@Aspect\n@Component\npublic class LoggingAspect {\n    @AfterReturning(pointcut = \"execution(* com.example.service..*.*(..))\", returning = \"result\")\n    public void logAfterReturning(JoinPoint jp, Object result) {\n        String method = jp.getSignature().getName();\n        System.out.println(\"[RETURN] \" + method + \" = \" + result);\n    }\n}`,
      },
    ],
    quiz: [
      {
        question: "AOP의 주요 목적은?",
        options: ["코드 실행 속도 향상", "공통 기능 분리", "데이터베이스 연결", "메모리 절약"],
        answer: 1,
        explanation: "AOP는 로깅, 트랜잭션, 보안 등 공통 기능을 비즈니스 로직과 분리해요.",
      },
      {
        question: "@Around Advice는 언제 실행되나요?",
        options: ["메서드 실행 전만", "메서드 실행 후만", "메서드 실행 전후", "애플리케이션 종료 시"],
        answer: 2,
        explanation: "@Around는 메서드 실행 전후를 모두 제어할 수 있어요.",
      },
      {
        question: "pjp.proceed()의 역할은?",
        options: ["메서드 종료", "실제 메서드 실행", "예외 발생", "로그 출력"],
        answer: 1,
        explanation: "pjp.proceed()로 실제 타겟 메서드를 실행해요.",
      },
      {
        question: "Spring AOP는 어떤 패턴으로 구현되나요?",
        options: ["싱글톤", "팩토리", "프록시", "빌더"],
        answer: 2,
        explanation: "Spring AOP는 동적 프록시(JDK Proxy 또는 CGLIB)로 구현돼요.",
      },
    ],
  },
  {
    id: 4,
    title: "Spring MVC",
    subtitle: "REST API, @RestController, 요청 매핑",
    emoji: "🌐",
    concepts: ["@RestController", "@RequestMapping", "HTTP 메서드", "@PathVariable", "@RequestBody"],
    explanation: `Spring MVC는 HTTP 요청을 처리하고 응답을 반환해요.

**@RestController 기본**
@RestController  // @ResponseBody + @Controller
@RequestMapping(\"/api/users\")
public class UserController {

    @GetMapping
    public List<User> getAllUsers() {
        return userService.findAll();  // JSON으로 자동 변환
    }

    @GetMapping(\"/{id}\")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    public User create(@RequestBody User user) {
        return userService.save(user);
    }

    @PutMapping(\"/{id}\")
    public User update(@PathVariable Long id, @RequestBody User user) {
        return userService.update(id, user);
    }

    @DeleteMapping(\"/{id}\")
    public void delete(@PathVariable Long id) {
        userService.delete(id);
    }
}

**요청 데이터 바인딩**
// 쿼리 파라미터
@GetMapping(\"/search\")
public List<User> search(
    @RequestParam String name,
    @RequestParam(defaultValue = \"0\") int minAge
) {
    return userService.search(name, minAge);
}

// 요청: GET /api/users/search?name=John&minAge=20

**ResponseEntity로 응답 제어**
@PostMapping
public ResponseEntity<User> create(@RequestBody @Valid UserRequest request) {
    User saved = userService.save(request);
    return ResponseEntity
        .status(HttpStatus.CREATED)
        .header(\"Location\", \"/api/users/\" + saved.getId())
        .body(saved);
}

**예외 처리**
@ExceptionHandler(UserNotFoundException.class)
public ResponseEntity<ErrorResponse> handleNotFound(UserNotFoundException ex) {
    return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(new ErrorResponse(ex.getMessage()));
}`,
    aiConnection: "AI 모델 추론 API는 Spring MVC로 구축해요. /api/predict 엔드포인트로 JSON 입력을 받아 예측 결과를 반환해요.",
    examples: [
      {
        problem: "ProductController를 만들고 GET /api/products/{id}로 상품을 조회하세요.",
        solution: `@RestController\n@RequestMapping(\"/api/products\")\npublic class ProductController {\n    private final ProductService productService;\n    \n    public ProductController(ProductService productService) {\n        this.productService = productService;\n    }\n    \n    @GetMapping(\"/{id}\")\n    public ResponseEntity<Product> getProduct(@PathVariable Long id) {\n        return productService.findById(id)\n            .map(ResponseEntity::ok)\n            .orElse(ResponseEntity.notFound().build());\n    }\n}`,
      },
      {
        problem: "@PostMapping로 회원가입 엔드포인트를 만들고, 이메일 중복 시 409를 반환하세요.",
        solution: `@PostMapping(\"/signup\")\npublic ResponseEntity<?> signup(@RequestBody @Valid SignupRequest request) {\n    if (userService.existsByEmail(request.getEmail())) {\n        return ResponseEntity.status(HttpStatus.CONFLICT).body(\"이미 존재하는 이메일\");\n    }\n    User user = userService.signup(request);\n    return ResponseEntity.status(HttpStatus.CREATED).body(user);\n}`,
      },
      {
        problem: "@RequestParam으로 정렬 옵션(name, date)을 받고, 정렬된 결과를 반환하세요.",
        solution: `@GetMapping\npublic List<Post> getPosts(\n    @RequestParam(defaultValue = \"date\") String sort\n) {\n    if (\"name\".equals(sort)) {\n        return postService.findAllOrderByName();\n    }\n    return postService.findAllOrderByDate();\n}`,
      },
    ],
    quiz: [
      {
        question: "@RestController와 @Controller의 차이는?",
        options: ["없음", "@RestController는 모든 메서드에 @ResponseBody 포함", "@Controller는 JSON만 반환", "URL 매핑 방식"],
        answer: 1,
        explanation: "@RestController는 모든 메서드의 반환값을 HTTP 응답 본문으로 변환해요.",
      },
      {
        question: "@PathVariable은 어디서 값을 가져오나요?",
        options: ["요청 본문", "URL 경로", "쿼리 파라미터", "헤더"],
        answer: 1,
        explanation: "@PathVariable은 URL 경로에서 값을 추출해요.",
      },
      {
        question: "GET /api/users?name=John에서 name을 얻으려면?",
        options: ["@PathVariable", "@RequestParam", "@RequestBody", "@RequestHeader"],
        answer: 1,
        explanation: "쿼리 파라미터는 @RequestParam으로 가져와요.",
      },
      {
        question: "ResponseEntity의 주요 용도는?",
        options: ["DB 조회", "응답 상태 코드/헤더 제어", "요청 검증", "예외 처리"],
        answer: 1,
        explanation: "ResponseEntity로 HTTP 상태 코드, 헤더, 본문을 모두 제어할 수 있어요.",
      },
    ],
  },
  {
    id: 5,
    title: "Spring Boot",
    subtitle: "자동 설정, application.yml, 내장 서버",
    emoji: "🚀",
    concepts: ["@SpringBootApplication", "Auto Configuration", "Embedded Tomcat", "application.yml", "Profile"],
    explanation: `Spring Boot는 설정 복잡도를 크게 줄여줘요.

**@SpringBootApplication**
@SpringBootApplication  // 3가지 어노테이션 결합
// 1. @Configuration: 설정 클래스
// 2. @ComponentScan: 컴포넌트 자동 스캔
// 3. @EnableAutoConfiguration: 자동 설정
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

**자동 설정 (Auto Configuration)**
// spring-boot-autoconfigure.jar에 포함된 설정
// 클래스패스의 라이브러리를 보고 자동으로 Bean 구성

// spring-boot-starter-web 있으면:
// - 내장 Tomcat 자동 설정
// - Spring MVC 자동 설정
// - Jackson(JSON) 자동 설정

// spring-boot-starter-data-jpa 있으면:
// - DataSource 자동 설정
// - EntityManagerFactory 자동 설정
// - TransactionManager 자동 설정

**application.yml 설정**
# application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: password123
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

server:
  port: 8080

**Profile별 설정 분리**
# application-dev.yml (개발 환경)
spring:
  datasource:
    url: jdbc:h2:mem:devdb

# application-prod.yml (운영 환경)
spring:
  datasource:
    url: jdbc:mysql://prod-db:3306/mydb

# 실행 시 프로필 선택
// java -jar app.jar --spring.profiles.active=prod`,
    aiConnection: "AI 서비스도 Spring Boot로 개발해요. 개발 환경에서는 로컬 DB, 운영에서는 PostgreSQL을 Profile로 분리해요.",
    examples: [
      {
        problem: "dev, prod Profile을 만들고 각각 다른 DB 포트를 설정하세요.",
        solution: "# application-dev.yml\nserver:\n  port: 8081\n\nspring:\n  datasource:\n    url: jdbc:h2:mem:devdb\n\n# application-prod.yml\nserver:\n  port: 8080\n\nspring:\n  datasource:\n    url: jdbc:mysql://prod:3306/mydb",
      },
      {
        problem: "@ConditionalOnProperty로 설정 값에 따라 Bean을 조건부로 생성하세요.",
        solution: `@Configuration\npublic class CacheConfig {\n    @Bean\n    @ConditionalOnProperty(name = \"cache.enabled\", havingValue = \"true\")\n    public CacheManager cacheManager() {\n        return new ConcurrentMapCacheManager(\"products\");\n    }\n}\n\n// application.yml에 cache.enabled: true 있으면 생성`,
      },
      {
        problem: "내장 Tomcat 대신 Jetty로 변경하는 의존성 설정을 작성하세요.",
        solution: "// build.gradle\nconfigurations {\n    compileOnly {\n        extendsFrom annotationProcessor\n    }\n}\n\ndependencies {\n    implementation \"org.springframework.boot:spring-boot-starter-web\"\n    implementation \"org.springframework.boot:spring-boot-starter-jetty\"  // Jetty 추가\n    compileOnly \"org.projectlombok:lombok\"\n}\n\n// Tomcat 제외\nc configurations.all {\n    exclude group: \"org.springframework.boot\", module: \"spring-boot-starter-tomcat\"\n}",
      },
    ],
    quiz: [
      {
        question: "@SpringBootApplication이 포함하지 않은 것은?",
        options: ["@Configuration", "@ComponentScan", "@EnableAutoConfiguration", "@Entity"],
        answer: 3,
        explanation: "@Entity는 JPA 어노테이션으로 @SpringBootApplication과 무관해요.",
      },
      {
        question: "자동 설정을 비활성화하려면?",
        options: ["@DisableAutoConfig", "@EnableAutoConfiguration(false)", "@SpringBootApplication(exclude)", "@NoAutoConfig"],
        answer: 2,
        explanation: "@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)로 특정 자동 설정을 제외해요.",
      },
      {
        question: "Profile을 선택하는 방법은?",
        options: ["@Profile(\"dev\")", "--spring.profiles.active=dev", "application-dev.yaml", "모두 가능"],
        answer: 3,
        explanation: "@Profile, 실행 인자, 파일명 등 다양한 방법으로 Profile을 설정해요.",
      },
      {
        question: "Spring Boot의 기본 포트는?",
        options: ["80", "443", "8080", "3000"],
        answer: 2,
        explanation: "기본 포트는 8080이고, server.port로 변경 가능해요.",
      },
    ],
  },
  {
    id: 6,
    title: "Spring Data JPA",
    subtitle: "Entity, Repository, 쿼리 메서드",
    emoji: "💾",
    concepts: ["@Entity", "JpaRepository", "쿼리 메서드", "@Query", "영속성 컨텍스트"],
    explanation: `Spring Data JPA로 데이터베이스 작업을 쉽게 처리해요.

**Entity 정의**
@Entity
@Table(name = \"users\")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String username;

    @Column(name = \"created_at\")
    private LocalDateTime createdAt;

    // getter, setter...
}

**Repository 인터페이스**
public interface UserRepository extends JpaRepository<User, Long> {
    // 메서드 이름으로 쿼리 자동 생성
    Optional<User> findByEmail(String email);
    List<User> findByUsernameContaining(String keyword);
    List<User> findByCreatedAtAfter(LocalDateTime date);

    // @Query로 JPQL 작성
    @Query(\"SELECT u FROM User u WHERE u.email LIKE %:keyword%\")
    List<User> searchByEmail(@Param(\"keyword\") String keyword);

    // Native SQL
    @Query(value = \"SELECT * FROM users LIMIT 1\", nativeQuery = true)
    User findAny();
}

**영속성 컨텍스트**
@Service
public class UserService {
    @Transactional
    public void updateUser(Long id, String newEmail) {
        User user = userRepository.findById(id).orElseThrow();
        // user는 영속 상태
        user.setEmail(newEmail);
        // 트랜잭션 커밋 시 자동 UPDATE (더티 체킹)
    }
}

// 영속성: 1차 캐시 + 더티 체킹으로 DB 동기화 자동화`,
    aiConnection: "대규모 AI 데이터셋도 JPA로 관리해요. 학습 기록, 모델 메타데이터, 추론 결과를 DB에 저장하고 조회해요.",
    examples: [
      {
        problem: "Product Entity와 JpaRepository를 만들고, 이름으로 검색하는 메서드를 추가하세요.",
        solution: `@Entity\n@Table(name = \"products\")\npublic class Product {\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n    \n    private String name;\n    private int price;\n    \n    // getter, setter...\n}\n\npublic interface ProductRepository extends JpaRepository<Product, Long> {\n    List<Product> findByNameContaining(String keyword);\n    List<Product> findByPriceBetween(int min, int max);\n}`,
      },
      {
        problem: "@Query로 JPQL을 작성하고, 특정 기간 이후 가입한 사용자를 조회하세요.",
        solution: `@Repository\npublic interface UserRepository extends JpaRepository<User, Long> {\n    @Query(\"SELECT u FROM User u WHERE u.createdAt >= :startDate\")\n    List<User> findRecentUsers(@Param(\"startDate\") LocalDateTime startDate);\n    \n    @Query(\"SELECT u FROM User u WHERE u.email LIKE %:domain%\")\n    List<User> findByEmailDomain(@Param(\"domain\") String domain);\n}`,
      },
      {
        problem: "CascadeType.PERSIST로 User와 Order의 연관관계를 설정하고 저장하세요.",
        solution: `@Entity\npublic class User {\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n    \n    @OneToMany(mappedBy = \"user\", cascade = CascadeType.PERSIST)\n    private List<Order> orders = new ArrayList<>();\n}\n\n@Entity\npublic class Order {\n    @ManyToOne\n    @JoinColumn(name = \"user_id\")\n    private User user;\n}\n\n// User 저장 시 Order도 자동 저장\nUser user = new User();\nOrder order = new Order();\norder.setUser(user);\nuser.getOrders().add(order);\nuserRepository.save(user);  // Order도 자동 저장`,
      },
    ],
    quiz: [
      {
        question: "JpaRepository가 제공하지 않는 메서드는?",
        options: ["findAll()", "save()", "deleteById()", "executeUpdate()"],
        answer: 3,
        explanation: "executeUpdate()는 EntityManager의 메서드로 Repository에서 기본 제공하지 않아요.",
      },
      {
        question: "findByUsernameAndActive(String username, boolean active)는 어떤 쿼리를 생성하나요?",
        options: ["SELECT * FROM users", "WHERE username = ? AND active = ?", "WHERE username = ? OR active = ?", "ORDER BY username"],
        answer: 1,
        explanation: "And로 연결하면 AND 조건으로 WHERE 절 생성",
      },
      {
        question: "영속성 컨텍스트의 1차 캐시 기능은?",
        options: ["다른 DB 연결", "동일 Entity 조회 시 DB 접근 없이 반환", "SQL 캐싱", "인덱싱"],
        answer: 1,
        explanation: "영속성 컨텍스트는 트랜잭션 내 같은 Entity를 두 번 조회 시 DB 접근 없이 캐시에서 반환해요.",
      },
      {
        question: "@Transactional이 없으면 영속성 컨텍스트는?",
        options: ["항상 활성화", "비활성화", "메서드 종료 시 커밋", "DB 자동 연결"],
        answer: 1,
        explanation: "영속성 컨텍스트는 트랜잭션 범위 내에서만 활성화돼요.",
      },
    ],
  },
  {
    id: 7,
    title: "트랜잭션 관리",
    subtitle: "@Transactional, 전파, 격리",
    emoji: "🔄",
    concepts: ["@Transactional", "ACID", "전파 레벨", "격리 레벨", "롤백"],
    explanation: `트랜잭션으로 데이터 일관성을 보장해요.

**@Transactional 기본**
@Service
public class OrderService {
    @Transactional  // 메서드 시작 시 트랜잭션 시작, 종료 시 커밋
    public void createOrder(Order order) {
        orderRepository.save(order);
        inventoryService.decreaseStock(order);
        paymentService.processPayment(order);
        // 예외 시 자동 롤백
    }
}

**전파 (Propagation)**
// REQUIRED (기본값): 기존 트랜잭션 합류, 없으면 생성
@Transactional(propagation = Propagation.REQUIRED)
public void methodA() {
    methodB();  // 같은 트랜잭션
}

// REQUIRES_NEW: 항상 새 트랜잭션 생성
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void methodB() {
    // methodA의 트랜잭션과 별개로 새 트랜잭션
}

// NESTED: 중첩 트랜잭션 (Savepoint)
@Transactional(propagation = Propagation.NESTED)
public void methodC() {
    // 메인 트랜잭션의 일부로 rollback 가능
}

**격리 (Isolation)**
@Transactional(isolation = Isolation.READ_COMMITTED)
// 기본 READ_COMMITTED

// 레벨 종류:
// - DEFAULT: DB 기본값
// - READ_UNCOMMITTED: 커밋되지 않은 데이터도 읽기 (더티 리드)
// - READ_COMMITTED: 커밋된 데이터만 읽기
// - REPEATABLE_READ: 반복 읽기 보장
// - SERIALIZABLE: 가장 높은 격리, 성능 저하

**롤백 규칙**
// 체크 예외(RuntimeException 아님)는 롤백 안 됨
@Transactional
public void method() throws IOException {
    // IOException 발생해도 커밋됨
}

// rollbackFor로 명시
@Transactional(rollbackFor = {IOException.class})
public void method() throws IOException {
    // IOException 발생 시 롤백
}`,
    aiConnection: "AI 모델 학습 기록, 추청 결과 저장 등 여러 테이블을 업데이트할 때 트랜잭션이 필수예요. 부분 성공/실패를 방지해요.",
    examples: [
      {
        problem: "계좌 이체를 @Transactional로 구현하고, 잔액 부족 시 예외를 발생시켜 롤백하세요.",
        solution: `@Service\n@RequiredArgsConstructor\npublic class AccountService {\n    private final AccountRepository accountRepository;\n    \n    @Transactional\n    public void transfer(Long fromId, Long toId, int amount) {\n        Account from = accountRepository.findById(fromId).orElseThrow();\n        Account to = accountRepository.findById(toId).orElseThrow();\n        \n        if (from.getBalance() < amount) {\n            throw new InsufficientBalanceException(\"잔액 부족\");\n        }\n        \n        from.withdraw(amount);\n        to.deposit(amount);\n        \n        accountRepository.save(from);\n        accountRepository.save(to);\n    }\n}`,
      },
      {
        problem: "로그는 항상 저장되도록 REQUIRES_NEW로 분리된 트랜잭션을 만드세요.",
        solution: `@Service\n@RequiredArgsConstructor\npublic class AuditService {\n    private final AuditLogRepository auditLogRepository;\n    \n    @Transactional(propagation = Propagation.REQUIRES_NEW)\n    public void logAction(String action, String user) {\n        AuditLog log = new AuditLog(action, user, LocalDateTime.now());\n        auditLogRepository.save(log);\n    }\n}\n\n// 메인 트랜잭션 롤백 시에도 로그는 저장됨\n@Transactional\npublic void riskyOperation() {\n    try {\n        // 위험한 작업\n    } finally {\n        auditService.logAction(\"riskyOperation\", \"user1\");  // 항상 저장\n    }\n}`,
      },
      {
        problem: "@TransactionalEventListener로 트랜잭션 커밋 후 이메일을 발송하세요.",
        solution: `@Component\npublic class EmailListener {\n    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMPLETION)\n    public void handleOrderCompleted(OrderCompletedEvent event) {\n        emailService.sendOrderConfirmation(event.getEmail(), event.getOrderId());\n    }\n}\n\n@Service\npublic class OrderService {\n    private final ApplicationEventPublisher eventPublisher;\n    \n    @Transactional\n    public void completeOrder(Order order) {\n        // ... 주문 처리 ...\n        eventPublisher.publishEvent(new OrderCompletedEvent(order));\n    }\n}`,
      },
    ],
    quiz: [
      {
        question: "@Transactional의 기본 전파 레벨은?",
        options: ["REQUIRED", "REQUIRES_NEW", "MANDATORY", "SUPPORTS"],
        answer: 0,
        explanation: "기본값은 REQUIRED로, 기존 트랜잭션 합류 또는 새로 생성해요.",
      },
      {
        question: "RuntimeException이 아닌 체크 예외 발생 시?",
        options: ["자동 롤백", "자동 커밋", "예외 발생", "무시"],
        answer: 1,
        explanation: "체크 예외는 롤백 대상이 아니라 자동 커밋돼요. rollbackFor로 변경 가능",
      },
      {
        question: "READ_UNCOMMITTED 격리 레벨의 문제는?",
        options: ["더티 리드", "반복 불가능 읽기", "팬텀 리드", "모두 해당"],
        answer: 3,
        explanation: "커밋되지 않은 데이터를 읽을 수 있어 모든 문제가 발생 가능해요.",
      },
      {
        question: "REQUIRES_NEW 전파는?",
        options: ["기존 트랜잭션 합류", "항상 새 트랜잭션", "트랜잭션 없이 실행", "예외 발생"],
        answer: 1,
        explanation: "REQUIRES_NEW는 항상 새로운 트랜잭션을 생성해요.",
      },
    ],
  },
  {
    id: 8,
    title: "Spring Security",
    subtitle: "인증/인가, JWT, Security Filter Chain",
    emoji: "🔐",
    concepts: ["SecurityFilterChain", "인증", "인가", "JWT", "PasswordEncoder"],
    explanation: `Spring Security로 애플리케이션 보안을 구현해요.

**Security Filter Chain 구성**
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // REST API라 비활성화
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(\"/api/public/**\").permitAll()
                .requestMatchers(\"/api/admin/**\").hasRole(\"ADMIN\")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

**JWT 인증 필터**
@Component
public class JwtFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain chain) throws ServletException, IOException {
        String token = request.getHeader(\"Authorization\");

        if (token != null && token.startsWith(\"Bearer \")) {
            token = token.substring(7);

            if (jwtUtil.validate(token)) {
                String username = jwtUtil.getUsername(token);
                Authentication auth = new UsernamePasswordAuthenticationToken(
                    username, null, jwtUtil.getAuthorities(token)
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        chain.doFilter(request, response);
    }
}

**UserDetailsService 구현**
@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException(\"User not found\"));

        return new CustomUserDetails(user);
    }
}`,
    aiConnection: "AI 추론 서비스도 API 보안이 필요해요. JWT 토큰으로 인증하고, 관리자만 모델 재학습을 호출할 수 있게 해요.",
    examples: [
      {
        problem: "로그인 엔드포인트를 만들고 JWT 토큰을 반환하세요.",
        solution: `@RestController\n@RequiredArgsConstructor\npublic class AuthController {\n    private final AuthenticationManager authenticationManager;\n    private final JwtUtil jwtUtil;\n    \n    @PostMapping(\"/api/login\")\n    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {\n        Authentication auth = authenticationManager.authenticate(\n            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())\n        );\n        \n        String token = jwtUtil.generateToken(auth.getName());\n        return ResponseEntity.ok(new LoginResponse(token));\n    }\n}`,
      },
      {
        problem: "관리자 권한(Role.ADMIN)만 접근 가능한 엔드포인트를 만드세요.",
        solution: `@RestController\n@RequestMapping(\"/api/admin\")\npublic class AdminController {\n    @PreAuthorize(\"hasRole('ADMIN')\")  // 또는 SecurityConfig에서 hasRole(\"ADMIN\")\n    @PostMapping(\"/models/retrain\")\n    public ResponseEntity<String> retrainModel() {\n        modelService.retrain();\n        return ResponseEntity.ok(\"모델 재학습 시작\");\n    }\n}\n\n// SecurityConfig에서\n.requestMatchers(\"/api/admin/**\").hasRole(\"ADMIN\")`,
      },
      {
        problem: "BCryptPasswordEncoder로 비밀번호 암호화하고 검증하는 UserService를 만드세요.",
        solution: `@Service\n@RequiredArgsConstructor\npublic class UserService {\n    private final UserRepository userRepository;\n    private final PasswordEncoder passwordEncoder;\n    \n    public void signup(String username, String password) {\n        if (userRepository.existsByUsername(username)) {\n            throw new DuplicateUserException(\"이미 존재하는 사용자\");\n        }\n        \n        String encodedPassword = passwordEncoder.encode(password);\n        User user = new User(username, encodedPassword, Role.USER);\n        userRepository.save(user);\n    }\n    \n    public boolean verifyPassword(String rawPassword, String encodedPassword) {\n        return passwordEncoder.matches(rawPassword, encodedPassword);\n    }\n}`,
      },
    ],
    quiz: [
      {
        question: "SecurityFilterChain의 역할은?",
        options: ["DB 연결", "HTTP 보안 규칙 정의", "로그 출력", "이메일 발송"],
        answer: 1,
        explanation: "SecurityFilterChain으로 인증/인가 규칙, CSRF, 세션 관리 등을 설정해요.",
      },
      {
        question: "JWT 토큰은 어디에 포함해서 전송하나요?",
        options: ["요청 본문", "Authorization 헤더", "URL 파라미터", "Cookie"],
        answer: 1,
        explanation: "Authorization: Bearer {token} 형식으로 헤더에 포함해요.",
      },
      {
        question: "BCryptPasswordEncoder의 특징은?",
        options: ["단방향 암호화(해시)", "양방향 암호화", "복호화 가능", "MD5 사용"],
        answer: 0,
        explanation: "BCrypt는 단방향 해시로, 복호화 불가능하고 matches()로 검증해요.",
      },
      {
        question: "hasRole(\"ADMIN\")은 어떤 권한을 체크하나요?",
        options: ["ROLE_ADMIN", "ADMIN", "ROLE_ADMIN\"", "admin"],
        answer: 0,
        explanation: "hasRole은 자동으로 ROLE_ 접두사를 붙여 ROLE_ADMIN을 체크해요.",
      },
    ],
  },
  {
    id: 9,
    title: "테스트",
    subtitle: "@SpringBootTest, @MockBean, TestContainers",
    emoji: "🧪",
    concepts: ["@SpringBootTest", "@WebMvcTest", "@MockBean", "TestContainers", "Given-When-Then"],
    explanation: `테스트로 코드 품질과 안정성을 확보해요.

**@SpringBootTest (통합 테스트)**
@SpringBootTest
@AutoConfigureMockMvc
class UserControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    void getUsers() throws Exception {
        mockMvc.perform(get(\"/api/users\"))
            .andExpect(status().isOk())
            .andExpect(jsonPath(\"$[0].username\").value(\"john\"));
    }
}

**@WebMvcTest (단위 테스트)**
@WebMvcTest(UserController.class)
class UserControllerUnitTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean  // 모의 객체
    private UserService userService;

    @Test
    void getUser() throws Exception {
        when(userService.findById(1L))
            .thenReturn(Optional.of(new User(\"john\")));

        mockMvc.perform(get(\"/api/users/1\"))
            .andExpect(status().isOk())
            .andExpect(jsonPath(\"$.username\").value(\"john\"));
    }
}

**TestContainers (통합 테스트 with 실제 DB)**
@Testcontainers
@SpringBootTest
class UserRepositoryTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(\"postgres:16\")
        .withDatabaseName(\"testdb\")
        .withUsername(\"test\")
        .withPassword(\"test\");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add(\"spring.datasource.url\", postgres::getJdbcUrl);
        registry.add(\"spring.datasource.username\", postgres::getUsername);
        registry.add(\"spring.datasource.password\", postgres::getPassword);
    }

    @Test
    void saveUser() {
        User user = new User(\"john\", \"john@example.com\");
        User saved = userRepository.save(user);
        assertThat(saved.getId()).isNotNull();
    }
}`,
    aiConnection: "AI 모델 통합 테스트도 TestContainers로 실제 DB 환경을 구성해요. 학습 데이터 저장, 추론 결과 검증을 테스트해요.",
    examples: [
      {
        problem: "@WebMvcTest로 ProductController를 테스트하고, 목 서비스를 사용하세요.",
        solution: "@WebMvcTest(ProductController.class)\nclass ProductControllerTest {\n    @Autowired\n    private MockMvc mockMvc;\n    \n    @MockBean\n    private ProductService productService;\n    \n    @Test\n    void getProduct() throws Exception {\n        Product mockProduct = new Product(1L, \"Laptop\", 1500);\n        when(productService.findById(1L)).thenReturn(Optional.of(mockProduct));\n        \n        mockMvc.perform(get(\"/api/products/1\"))\n            .andExpect(status().isOk())\n            .andExpect(jsonPath(\"$.name\").value(\"Laptop\"))\n            .andExpect(jsonPath(\"$.price\").value(1500));\n    }\n}",
      },
      {
        problem: "Given-When-Then 패턴으로 주문 생성 테스트를 작성하세요.",
        solution: "@SpringBootTest\nclass OrderServiceTest {\n    @Autowired\n    private OrderService orderService;\n    \n    @Autowired\n    private ProductRepository productRepository;\n    \n    @Test\n    void createOrder() {\n        // Given\n        Product product = new Product(\"Phone\", 800);\n        productRepository.save(product);\n        OrderRequest request = new OrderRequest(product.getId(), 2);\n        \n        // When\n        Order order = orderService.createOrder(request);\n        \n        // Then\n        assertThat(order.getId()).isNotNull();\n        assertThat(order.getTotalPrice()).isEqualTo(1600);\n    }\n}",
      },
      {
        problem: "@MockBean으로 예외 상황을 테스트하세요 (상품 없음 시 404).",
        solution: "@WebMvcTest(ProductController.class)\nclass ProductControllerExceptionTest {\n    @Autowired\n    private MockMvc mockMvc;\n    \n    @MockBean\n    private ProductService productService;\n    \n    @Test\n    void getProductNotFound() throws Exception {\n        when(productService.findById(999L))\n            .thenReturn(Optional.empty());\n        \n        mockMvc.perform(get(\"/api/products/999\"))\n            .andExpect(status().isNotFound());\n    }\n}",
      },
    ],
    quiz: [
      {
        question: "@SpringBootTest와 @WebMvcTest의 차이는?",
        options: ["없음", "@WebMvcTest는 컨트롤러만 로드", "@SpringBootTest가 더 빠름", "@WebMvcTest가 DB 연결"],
        answer: 1,
        explanation: "@WebMvcTest는 슬라이스 테스트로 컨트롤러 레이어만 테스트해요.",
      },
      {
        question: "@MockBean의 용도는?",
        options: ["실제 Bean 등록", "모의 객체로 교체", "DB 연결", "로그 출력"],
        answer: 1,
        explanation: "@MockBean은 실제 Bean을 모의 객체로 교체해서 테스트를 격리해요.",
      },
      {
        question: "TestContainers의 주요 장점은?",
        options: ["메모리 절약", "실제 Docker 컨테이너로 테스트", "테스트 속도 향상", "코드 간소화"],
        answer: 1,
        explanation: "TestContainers는 테스트 시 실제 Docker 컨테이너(DB, Redis 등)를 실행해요.",
      },
      {
        question: "Given-When-Then 패턴의 순서는?",
        options: ["실행-검증-준비", "준비-실행-검증", "검증-준비-실행", "준비-검증-실행"],
        answer: 1,
        explanation: "Given(준비) → When(실행) → Then(검증) 순서로 테스트를 작성해요.",
      },
    ],
  },
  {
    id: 10,
    title: "실전 Spring 프로젝트",
    subtitle: "AI 추론 API 서비스 구축",
    emoji: "🎓",
    concepts: ["REST API", "Service Layer", "Repository", "DTO", "예외 처리", "테스트"],
    explanation: `배운 내용을 종합하여 실전 프로젝트를 만들어봐요.

**프로젝트 구조**
src/main/java/com/example/aiapi
├── AiApiApplication.java
├── controller/
│   └── PredictionController.java
├── service/
│   └── PredictionService.java
├── repository/
│   └── PredictionLogRepository.java
├── domain/
│   ├── PredictionLog.java
│   └── PredictionRequest.java
└── config/
    └── SecurityConfig.java

**PredictionController**
@RestController
@RequestMapping(\"/api/predictions\")
@RequiredArgsConstructor
public class PredictionController {
    private final PredictionService predictionService;

    @PostMapping
    public ResponseEntity<PredictionResponse> predict(@RequestBody @Valid PredictionRequest request) {
        PredictionResponse response = predictionService.predict(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping(\"/history/{userId}\")
    public ResponseEntity<List<PredictionLog>> getHistory(@PathVariable Long userId) {
        return ResponseEntity.ok(predictionService.getUserHistory(userId));
    }
}

**PredictionService**
@Service
@RequiredArgsConstructor
public class PredictionService {
    private final PredictionLogRepository logRepository;
    private final ModelClient modelClient;  // AI 모델 클라이언트

    @Transactional
    public PredictionResponse predict(PredictionRequest request) {
        // 1. 모델 추론
        ModelOutput output = modelClient.predict(request);

        // 2. 결과 저장
        PredictionLog log = new PredictionLog(request, output);
        logRepository.save(log);

        // 3. 응답 반환
        return new PredictionResponse(output);
    }

    public List<PredictionLog> getUserHistory(Long userId) {
        return logRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}

**전체 아키텍처**
Client → Controller → Service → Repository → Database
                     ↓
                  ModelClient (AI 추론)
                     ↓
                  PredictionLog 저장`,
    aiConnection: "이것이 실제 AI 서비스의 백엔드 아키텍처예요. Spring Boot로 REST API를 구축하고, 모델과 통합해요.",
    examples: [
      {
        problem: "회원가입부터 예측까지의 전체 흐름을 구현하세요.",
        solution: "// 1. 회원가입\n@PostMapping(\"/signup\")\npublic ResponseEntity<User> signup(@RequestBody @Valid SignupRequest request) {\n    User user = userService.signup(request);\n    return ResponseEntity.status(HttpStatus.CREATED).body(user);\n}\n\n// 2. 로그인 (JWT 반환)\n@PostMapping(\"/login\")\npublic ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {\n    String token = userService.login(request);\n    return ResponseEntity.ok(new LoginResponse(token));\n}\n\n// 3. 예측 (인증 필요)\n@PostMapping(\"/predict\")\npublic ResponseEntity<PredictionResponse> predict(\n    @RequestBody @Valid PredictionRequest request,\n    @AuthenticationPrincipal User user\n) {\n    PredictionResponse response = predictionService.predict(request, user.getId());\n    return ResponseEntity.ok(response);\n}",
      },
      {
        problem: "예외 처리를 @ControllerAdvice로 중앙화하세요.",
        solution: "@RestControllerAdvice\npublic class GlobalExceptionHandler {\n    @ExceptionHandler(UserNotFoundException.class)\n    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {\n        return ResponseEntity.status(HttpStatus.NOT_FOUND)\n            .body(new ErrorResponse(ex.getMessage()));\n    }\n    \n    @ExceptionHandler(MethodArgumentNotValidException.class)\n    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {\n        String message = ex.getBindingResult().getAllErrors().stream()\n            .map(DefaultMessageSourceResolvable::getDefaultMessage)\n            .collect(Collectors.joining(\", \"));\n        return ResponseEntity.badRequest().body(new ErrorResponse(message));\n    }\n}",
      },
      {
        problem: "전체 예측 프로세스를 테스트하세요 (@SpringBootTest).",
        solution: "@SpringBootTest\nclass PredictionIntegrationTest {\n    @Autowired\n    private PredictionController predictionController;\n    \n    @MockBean\n    private ModelClient modelClient;\n    \n    @Test\n    void fullPredictionFlow() {\n        // Given\n        PredictionRequest request = new PredictionRequest(\"test text\");\n        when(modelClient.predict(any())).thenReturn(new ModelOutput(\"positive\", 0.95));\n        \n        // When\n        ResponseEntity<PredictionResponse> response = predictionController.predict(request);\n        \n        // Then\n        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);\n        assertThat(response.getBody().getSentiment()).isEqualTo(\"positive\");\n    }\n}",
      },
    ],
    quiz: [
      {
        question: "Controller의 역할은?",
        options: ["비즈니스 로직", "HTTP 요청/응답 처리", "DB 접근", "모델 추론"],
        answer: 1,
        explanation: "Controller는 HTTP 요청을 받고 응답을 반환하는 계층이에요.",
      },
      {
        question: "Service의 역할은?",
        options: ["HTTP 처리", "비즈니스 로직 & 트랜잭션", "뷰 렌더링", "정적 파일 제공"],
        answer: 1,
        explanation: "Service는 핵심 비즈니스 로직을 처리하고 트랜잭션을 관리해요.",
      },
      {
        question: "@ControllerAdvice의 용도는?",
        options: ["컨트롤러 생성", "전역 예외 처리", "DB 연결", "요청 로깅"],
        answer: 1,
        explanation: "@ControllerAdvice로 전역 예외를 한 곳에서 처리해요.",
      },
      {
        question: "3계층 아키텍처의 순서는?",
        options: ["DB → Service → Controller", "Controller → Service → Repository", "Repository → Controller → Service", "Service → Controller → Repository"],
        answer: 1,
        explanation: "요청은 Controller → Service → Repository로 흐르고, 응답은 그 반대로 흘러요.",
      },
    ],
  },
];
