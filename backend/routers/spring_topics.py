import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from fsrs import Scheduler, Card, Rating, State

from database import get_db
from models import SpringTopic, SpringTopicCard

router = APIRouter(prefix="/spring-topics", tags=["spring-topics"])
scheduler = Scheduler()


# Spring 주제 초기 데이터 (시드용)
SEED_TOPICS = [
    # IoC/DI
    {
        "title": "IoC Container (제어의 역전)",
        "category": "ioc_di",
        "description": "객체의 생성과 생명주기를 컨테이너가 관리하는 패턴. 개발자가 new 키워드로 객체를 생성하는 대신, 컨테이너가 객체를 생성하고 주입한다.",
        "example_code": "@Component\npublic class UserService {\n    // 컨테이너가 의존성 주입\n    private final UserRepository userRepository;\n}",
        "notes": "IoC는 제어의 역전으로, 객체 생명주기 관리를 개발자 → 프레임워크로 넘기는 것",
        "difficulty": "basic"
    },
    {
        "title": "Dependency Injection (의존성 주입)",
        "category": "ioc_di",
        "description": "필요한 의존 객체를 외부에서 주입받는 디자인 패턴. 생성자 주입, 세터 주입, 필드 주입이 있다.",
        "example_code": "@Service\npublic class UserService {\n    private final UserRepository userRepository;\n    \n    // 생성자 주입 (권장)\n    public UserService(UserRepository userRepository) {\n        this.userRepository = userRepository;\n    }\n}",
        "notes": "생성자 주입 > 필드 주입 순으로 권장. @Autowired는 생략 가능",
        "difficulty": "basic"
    },
    {
        "title": "Bean 생명주기",
        "category": "ioc_di",
        "description": "Spring Bean의 생성 → 초기화 → 사용 → 소멸 과정. @PostConstruct, @PreDestroy로 관리.",
        "example_code": "@Component\npublic class DatabaseInitializer {\n    @PostConstruct\n    public void init() {\n        // 빈 생성 후 호출\n    }\n    \n    @PreDestroy\n    public void cleanup() {\n        // 빈 소멸 전 호출\n    }\n}",
        "notes": "싱글톤 스코프가 기본, 프로토타입/리퀘스트 등도 있음",
        "difficulty": "intermediate"
    },
    # AOP
    {
        "title": "AOP (관점 지향 프로그래밍)",
        "category": "aop",
        "description": "핵심 로직과 공통 관심사(로깅, 트랜잭션 등)를 분리하는 프로그래밍 패러다임.",
        "example_code": "@Aspect\n@Component\npublic class LoggingAspect {\n    @Before(\"execution(* com.example..*.*(..))\")\n    public void logBefore() {\n        System.out.println(\"메서드 실행 전\");\n    }\n}",
        "notes": "프록시 패턴으로 구현. 핵심 로직 깔끔하게 유지",
        "difficulty": "intermediate"
    },
    {
        "title": "@Around Advice",
        "category": "aop",
        "description": "메서드 실행 전후를 모두 처리. 가장 강력한 Advice.",
        "example_code": "@Around(\"@annotation(Logged)\")\npublic Object logAround(ProceedingJoinPoint pjp) throws Throwable {\n    long start = System.currentTimeMillis();\n    Object result = pjp.proceed(); // 실제 메서드 실행\n    long duration = System.currentTimeMillis() - start;\n    System.out.println(\"실행 시간: \" + duration);\n    return result;\n}",
        "notes": "pjp.proceed()로 실제 메서드 호출, 리턴 값 변경 가능",
        "difficulty": "intermediate"
    },
    # Spring MVC
    {
        "title": "DispatcherServlet",
        "category": "mvc",
        "description": "Spring MVC의 핵심 프론트 컨트롤러. 모든 HTTP 요청을 받아 적절한 핸들러로 라우팅.",
        "example_code": "/* web.xml 또는 자동 설정 */\n// DispatcherServlet이 모든 요청 받음\n// → HandlerMapping으로 컨트롤러 찾음\n// → Controller 실행\n// → ViewResolver로 뷰 반환",
        "notes": "하나만 있으면 됨. 스프링 부트는 자동 설정",
        "difficulty": "basic"
    },
    {
        "title": "@RequestMapping & HTTP 메서드 매핑",
        "category": "mvc",
        "description": "URL 경로와 HTTP 메서드를 핸들러 메서드에 매핑.",
        "example_code": "@RestController\n@RequestMapping(\"/api/users\")\npublic class UserController {\n    @GetMapping(\"/{id}\")\n    public User getUser(@PathVariable Long id) {\n        return userService.findById(id);\n    }\n    \n    @PostMapping\n    public User create(@RequestBody User user) {\n        return userService.save(user);\n    }\n}",
        "notes": "@GetMapping, @PostMapping 등은 @RequestMapping의 축약형",
        "difficulty": "basic"
    },
    {
        "title": "@RequestBody & @ResponseBody",
        "category": "mvc",
        "description": "HTTP 요청/응답 본문을 JSON으로 자동 변환.",
        "example_code": "@PostMapping(\"/users\")\n    public ResponseEntity<User> createUser(@RequestBody User user) {\n        User saved = userService.save(user);\n        return ResponseEntity.ok(saved);\n    }\n}",
        "notes": "@RestController는 @ResponseBody가 포함된 @Controller",
        "difficulty": "basic"
    },
    # Spring Boot
    {
        "title": "@SpringBootApplication & Auto Configuration",
        "category": "boot",
        "description": "메인 애너테이션. @Configuration + @ComponentScan + @EnableAutoConfiguration.",
        "example_code": "@SpringBootApplication\npublic class Application {\n    public static void main(String[] args) {\n        SpringApplication.run(Application.class, args);\n    }\n}",
        "notes": "자동 설정: 클래스패스의 jar 보고 설정 자동 생성. @ConditionalOn~로 제어",
        "difficulty": "basic"
    },
    {
        "title": "application.properties/yml 설정",
        "category": "boot",
        "description": "외부 설정 관리. 환경별로 프로필 분리 가능.",
        "example_code": "# application.yml\nspring:\n  datasource:\n    url: jdbc:mysql://localhost:3306/mydb\n    username: root\n  jpa:\n    hibernate:\n      ddl-auto: update\n---\nspring:\n  config:\n    activate:\n      on-profile: dev",
        "notes": "프로필: dev, prod 환경 분리. @ActiveProfiles로 테스트",
        "difficulty": "basic"
    },
    # Spring Data JPA
    {
        "title": "JpaRepository & 쿼리 메서드",
        "category": "jpa",
        "description": "JPA 리포지토리. 메서드 이름으로 쿼리 자동 생성.",
        "example_code": "public interface UserRepository extends JpaRepository<User, Long> {\n    // 메서드 이름으로 쿼리 생성\n    List<User> findByEmail(String email);\n    \n    Optional<User> findByUsernameAndActiveTrue(String username);\n    \n    @Query(\"SELECT u FROM User u WHERE u.age > :age\")\n    List<User> findAdults(@Param(\"age\") int age);\n}",
        "notes": "findByName, findByAge 등 이름 규칙 따르면 자동 생성",
        "difficulty": "basic"
    },
    {
        "title": "@Entity & 영속성 컨텍스트",
        "category": "jpa",
        "description": "DB 테이블과 매핑되는 엔티티 클래스. 영속성 컨텍스트가 1차 캐시로 동작.",
        "example_code": "@Entity\n@Table(name = \"users\")\npublic class User {\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n    \n    @Column(nullable = false, unique = true)\n    private String email;\n    \n    // getter, setter...\n}",
        "notes": "영속성 컨텍스트: 트랜잭션 내 엔티티 캐싱, 더티 체킹",
        "difficulty": "intermediate"
    },
    # Transaction
    {
        "title": "@Transactional",
        "category": "transaction",
        "description": "트랜잭션 관리. 예외 발생 시 자동 롤백.",
        "example_code": "@Service\npublic class OrderService {\n    @Transactional\n    public void createOrder(Order order) {\n        orderRepository.save(order);\n        inventoryService.decreaseStock(order);  // 예외 시 전체 롤백\n    }\n}",
        "notes": "체크 예외는 롤백 안 함. rollbackFor 설정 필요",
        "difficulty": "intermediate"
    },
    {
        "title": "트랜잭션 전파",
        "category": "transaction",
        "description": "기존 트랜잭션과 어떻게 합류할지 정의. REQUIRED, REQUIRES_NEW 등.",
        "example_code": "@Transactional(propagation = Propagation.REQUIRED)  // 기존 트랜잭션 합류, 없으면 생성\npublic void methodA() { methodB(); }\n\n@Transactional(propagation = Propagation.REQUIRES_NEW)  // 항상 새 트랜잭션\npublic void methodB() { /* ... */ }",
        "notes": "REQUIRED(기본값), REQUIRES_NEW, NESTED, NOT_SUPPORTED 등",
        "difficulty": "advanced"
    },
    # Security
    {
        "title": "Spring Security 기본",
        "category": "security",
        "description": "인증/인가 프레임워크. 필터 체인으로 보안 처리.",
        "example_code": "@Configuration\n@EnableWebSecurity\npublic class SecurityConfig {\n    @Bean\n    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n        http\n            .authorizeHttpRequests(auth -> auth\n                .requestMatchers(\"/public/**\").permitAll()\n                .anyRequest().authenticated()\n            )\n            .formLogin(withDefaults());\n        return http.build();\n    }\n}",
        "notes": "디폴트: 모든 요청 인증 필요. SecurityFilterChain으로 설정",
        "difficulty": "intermediate"
    },
    {
        "title": "JWT 인증",
        "category": "security",
        "description": "토큰 기반 인증. 헤더에 JWT 담아 전달.",
        "example_code": "@Component\npublic class JwtFilter extends OncePerRequestFilter {\n    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) {\n        String token = request.getHeader(\"Authorization\");\n        if (token != null && jwtUtil.validate(token)) {\n            Authentication auth = jwtUtil.getAuthentication(token);\n            SecurityContextHolder.getContext().setAuthentication(auth);\n        }\n        chain.doFilter(request, response);\n    }\n}",
        "notes": "OncePerRequestFilter: 요청당 한 번 실행. SecurityContext에 인증 저장",
        "difficulty": "advanced"
    },
    # REST API
    {
        "title": "RESTful API 설계",
        "category": "rest",
        "description": "HTTP 메서드와 리소스 중심 설계. ResponseEntity로 응답 제어.",
        "example_code": "@RestController\n@RequestMapping(\"/api/posts\")\npublic class PostController {\n    @GetMapping\n    public ResponseEntity<List<Post>> findAll() {\n        return ResponseEntity.ok(postService.findAll());\n    }\n    \n    @GetMapping(\"/{id}\")\n    public ResponseEntity<Post> findById(@PathVariable Long id) {\n        return ResponseEntity.of(postService.findById(id));\n    }\n}",
        "notes": "GET(조회), POST(생성), PUT(수정), DELETE(삭제) 명확히",
        "difficulty": "basic"
    },
    # Testing
    {
        "title": "@SpringBootTest 통합 테스트",
        "category": "testing",
        "description": "전체 애플리케이션 컨텍스트 로드. 통합 테스트용.",
        "example_code": "@SpringBootTest\n@AutoConfigureMockMvc\nclass UserControllerTest {\n    @Autowired\n    private MockMvc mockMvc;\n    \n    @Test\n    void getUsers() throws Exception {\n        mockMvc.perform(get(\"/api/users\"))\n            .andExpect(status().isOk())\n            .andExpect(jsonPath(\"$[0].name\").value(\"John\"));\n    }\n}",
        "notes": "모든 Bean 로드. 느림. @MockBean으로 모킹",
        "difficulty": "intermediate"
    },
    {
        "title": "@WebMvcTest 단위 테스트",
        "category": "testing",
        "description": "특정 컨트롤러만 테스트. 빠름.",
        "example_code": "@WebMvcTest(UserController.class)\nclass UserControllerUnitTest {\n    @Autowired\n    private MockMvc mockMvc;\n    \n    @MockBean\n    private UserService userService;  // 모킹\n    \n    @Test\n    void getUser() throws Exception {\n        when(userService.findById(1L)).thenReturn(new User(\"John\"));\n        mockMvc.perform(get(\"/api/users/1\"))\n            .andExpect(status().isOk());\n    }\n}",
        "notes": "슬라이스 테스트. 컨트롤러 레이어만 테스트",
        "difficulty": "intermediate"
    },
    # Validation
    {
        "title": "@Valid & Bean Validation",
        "category": "validation",
        "description": "입력 값 검증. @NotNull, @Size 등.",
        "example_code": "@PostMapping(\"/users\")\npublic ResponseEntity<User> create(@Valid @RequestBody UserRequest request) {\n    return ResponseEntity.ok(userService.create(request));\n}\n\npublic record UserRequest(\n    @NotBlank String name,\n    @Email String email,\n    @Min(18) int age\n) {}",
        "notes": "@Validated 또는 @Valid 필요. MethodArgumentNotValidException 발생",
        "difficulty": "basic"
    },
]


class ReviewRequest(BaseModel):
    knew: bool


def _card_from_db(tc: SpringTopicCard) -> Card:
    c = Card()
    if tc.reps == 0 or tc.state == 0:
        return c
    c.state = State(tc.state)
    c.step = tc.step or 0
    c.stability = tc.stability or 0.0
    c.difficulty = tc.difficulty or 0.0
    c.due = tc.due
    c.last_review = tc.last_review
    return c


def _sync_card_to_db(tc: SpringTopicCard, c: Card, lapses_delta: int = 0):
    tc.state = c.state.value
    tc.step = c.step
    tc.stability = c.stability
    tc.difficulty = c.difficulty
    tc.due = c.due
    tc.last_review = c.last_review
    tc.reps += 1
    tc.lapses += lapses_delta


def _topic_with_card(topic: SpringTopic, tc: Optional[SpringTopicCard]) -> dict:
    now = datetime.now(timezone.utc)
    due = tc.due if tc else now
    return {
        "id": topic.id,
        "title": topic.title,
        "category": topic.category,
        "description": topic.description,
        "example_code": topic.example_code,
        "notes": topic.notes,
        "difficulty": topic.difficulty,
        "state": tc.state if tc else 0,
        "reps": tc.reps if tc else 0,
        "lapses": tc.lapses if tc else 0,
        "due": due,
        "is_due": due <= now,
        "is_favorite": topic.is_favorite,
    }


@router.get("/")
def get_topics(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(SpringTopic)
    if category:
        q = q.filter(SpringTopic.category == category)
    topics = q.order_by(SpringTopic.id).all()
    topic_ids = {t.id for t in topics}
    cards = {tc.topic_id: tc for tc in db.query(SpringTopicCard).filter(SpringTopicCard.topic_id.in_(topic_ids)).all()}
    return [_topic_with_card(t, cards.get(t.id)) for t in topics]


@router.get("/due")
def get_due_topics(category: Optional[str] = None, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    q = db.query(SpringTopic)
    if category:
        q = q.filter(SpringTopic.category == category)
    topics = q.all()
    topic_ids = {t.id for t in topics}
    cards = {tc.topic_id: tc for tc in db.query(SpringTopicCard).filter(SpringTopicCard.topic_id.in_(topic_ids)).all()}

    review_topics = []
    new_topics = []
    for t in topics:
        tc = cards.get(t.id)
        if tc is None or tc.reps == 0:
            new_topics.append(_topic_with_card(t, tc))
        elif tc.due <= now:
            review_topics.append(_topic_with_card(t, tc))

    review_topics.sort(key=lambda x: x["due"])
    random.shuffle(new_topics)
    return review_topics + new_topics


@router.get("/stats")
def get_stats(category: Optional[str] = None, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    q = db.query(SpringTopic)
    if category:
        q = q.filter(SpringTopic.category == category)
    topics = q.all()
    topic_ids = {t.id for t in topics}
    cards = db.query(SpringTopicCard).filter(SpringTopicCard.topic_id.in_(topic_ids)).all()
    reviewed_ids = {tc.topic_id for tc in cards}
    total = len(topics)
    reviewed = len(reviewed_ids)
    due = sum(1 for c in cards if c.due <= now) + (total - reviewed)
    today = sum(1 for c in cards if c.last_review and c.last_review >= today_start)
    return {"total": total, "reviewed": reviewed, "new": total - reviewed, "due": due, "today": today}


@router.get("/today")
def get_today_topics(category: Optional[str] = None, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    q = db.query(SpringTopic)
    if category:
        q = q.filter(SpringTopic.category == category)
    topics = q.all()
    topic_id_map = {t.id: t for t in topics}
    cards = [
        tc for tc in db.query(SpringTopicCard).filter(SpringTopicCard.topic_id.in_(topic_id_map.keys())).all()
        if tc.last_review and tc.last_review >= today_start
    ]
    return [_topic_with_card(topic_id_map[tc.topic_id], tc) for tc in cards]


@router.get("/daily")
def get_daily_topics(new_count: int = 5, db: Session = Depends(get_db)):
    """오늘의 Spring: 전 카테고리 복습 due 카드 + 신규 N개 랜덤"""
    now = datetime.now(timezone.utc)
    all_topics = {t.id: t for t in db.query(SpringTopic).all()}
    all_cards = {tc.topic_id: tc for tc in db.query(SpringTopicCard).all()}

    review_topics = []
    new_topics = []

    for topic in all_topics.values():
        tc = all_cards.get(topic.id)
        if tc and tc.reps > 0:
            if tc.due <= now:
                review_topics.append(_topic_with_card(topic, tc))
        else:
            new_topics.append(_topic_with_card(topic, tc))

    review_topics.sort(key=lambda x: x["due"])
    random.shuffle(new_topics)
    return review_topics + new_topics[:new_count]


@router.post("/{topic_id}/favorite")
def toggle_favorite(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(SpringTopic).filter(SpringTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    topic.is_favorite = not topic.is_favorite
    db.commit()
    return {"topic_id": topic_id, "is_favorite": topic.is_favorite}


@router.get("/favorites")
def get_favorites(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(SpringTopic).filter(SpringTopic.is_favorite == True)
    if category:
        q = q.filter(SpringTopic.category == category)
    topics = q.order_by(SpringTopic.id).all()
    topic_ids = {t.id for t in topics}
    cards = {tc.topic_id: tc for tc in db.query(SpringTopicCard).filter(SpringTopicCard.topic_id.in_(topic_ids)).all()}
    return [_topic_with_card(t, cards.get(t.id)) for t in topics]


@router.post("/{topic_id}/review")
def review_topic(topic_id: int, body: ReviewRequest, db: Session = Depends(get_db)):
    topic = db.query(SpringTopic).filter(SpringTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    tc = db.query(SpringTopicCard).filter(SpringTopicCard.topic_id == topic_id).first()
    if tc is None:
        tc = SpringTopicCard(topic_id=topic_id)
        db.add(tc)
        db.flush()

    rating = Rating.Good if body.knew else Rating.Again
    card = _card_from_db(tc)
    updated_card, _ = scheduler.review_card(card, rating)

    lapses_delta = 1 if not body.knew else 0
    _sync_card_to_db(tc, updated_card, lapses_delta)
    db.commit()

    return {
        "topic_id": topic_id,
        "knew": body.knew,
        "next_due": tc.due,
        "state": tc.state,
        "reps": tc.reps,
    }


@router.post("/seed")
def seed_topics(db: Session = Depends(get_db)):
    """Spring 주제 초기 데이터 시드"""
    existing = db.query(SpringTopic).count()
    if existing > 0:
        return {"message": f"이미 {existing}개 주제 존재, 시드 스킵"}

    for topic_data in SEED_TOPICS:
        topic = SpringTopic(**topic_data)
        db.add(topic)

    db.commit()
    return {"message": f"{len(SEED_TOPICS)}개 Spring 주제 시드 완료"}
