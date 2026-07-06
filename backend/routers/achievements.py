from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List
from datetime import datetime, timezone

from database import get_db, engine, Base
from models import Achievement, User, UserAchievement, Task, WordCard
from auth_utils import get_current_user

router = APIRouter(prefix="/achievements", tags=["achievements"])


# 업적 초기 데이터
SEED_ACHIEVEMENTS = [
    # 스트릭 업적
    {
        "code": "streak_7",
        "title": "일주 연속",
        "description": "7일 연속 학습 완료",
        "category": "streak",
        "icon": "🔥",
        "requirement_value": 7,
    },
    {
        "code": "streak_30",
        "title": "한 달 연속",
        "description": "30일 연속 학습 완료",
        "category": "streak",
        "icon": "🔥🔥",
        "requirement_value": 30,
    },
    {
        "code": "streak_100",
        "title": "백일 동안",
        "description": "100일 연속 학습 완료",
        "category": "streak",
        "icon": "🔥🔥🔥",
        "requirement_value": 100,
    },
    # 습득 업적
    {
        "code": "mastery_100",
        "title": "첫 100단어",
        "description": "100개 단어 완전 습득",
        "category": "mastery",
        "icon": "📚",
        "requirement_value": 100,
    },
    {
        "code": "mastery_500",
        "title": "500단어 마스터",
        "description": "500개 단어 완전 습득",
        "category": "mastery",
        "icon": "📚📚",
        "requirement_value": 500,
    },
    {
        "code": "mastery_1000",
        "title": "천 단어 달성",
        "description": "1000개 단어 완전 습득",
        "category": "mastery",
        "icon": "📚📚📚",
        "requirement_value": 1000,
    },
    # 복습 업적
    {
        "code": "reviews_1000",
        "title": "천 번 복습",
        "description": "총 1000번 복습 완료",
        "category": "consistency",
        "icon": "🔄",
        "requirement_value": 1000,
    },
    {
        "code": "reviews_5000",
        "title": "오천 번 복습",
        "description": "총 5000번 복습 완료",
        "category": "consistency",
        "icon": "🔄🔄",
        "requirement_value": 5000,
    },
    {
        "code": "reviews_10000",
        "title": "만 번 도전",
        "description": "총 10000번 복습 완료",
        "category": "consistency",
        "icon": "🔄🔄🔄",
        "requirement_value": 10000,
    },
]


def seed_achievements(db: Session):
    """업적 초기 데이터 생성"""
    existing = db.query(Achievement).count()
    if existing == 0:
        for achievement_data in SEED_ACHIEVEMENTS:
            achievement = Achievement(**achievement_data)
            db.add(achievement)
        db.commit()
        print(f"[achievements] {len(SEED_ACHIEVEMENTS)}개 업적 시드 완료")
    else:
        print(f"[achievements] 이미 {existing}개 업적 존재, 시드 스킵")


@router.post("/seed")
def seed(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """수동 업적 시드 (마스터 전용)"""
    if not user.is_master:
        return {"error": "권한 없음"}
    seed_achievements(db)
    return {"ok": True}


@router.get("/")
def list_achievements(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """업적 목록 및 해금 상태"""
    achievements = db.query(Achievement).order_by(Achievement.category, Achievement.requirement_value).all()

    # 유저가 해금한 업적 ID 목록
    unlocked_ids = db.query(UserAchievement.achievement_id).filter(
        UserAchievement.user_id == user.id
    ).all()
    unlocked_set = {aid for (aid,) in unlocked_ids}

    result = []
    for a in achievements:
        result.append({
            "id": a.id,
            "code": a.code,
            "title": a.title,
            "description": a.description,
            "category": a.category,
            "icon": a.icon,
            "requirement_value": a.requirement_value,
            "unlocked": a.id in unlocked_set,
        })
    return result


@router.post("/check")
def check_achievements(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """업적 달성 여부 체크 및 자동 해금"""
    # 유저 통계 계산
    # 1. Streak: 연속 일수 계산
    today = datetime.now(timezone.utc).date()
    streak = 0
    check_date = today

    while True:
        day_start = datetime.combine(check_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end = datetime.combine(check_date, datetime.max.time()).replace(tzinfo=timezone.utc)

        # 그 날 완료한 작업이 있는지 확인
        completed_count = db.query(func.count(Task.id)).filter(
            Task.user_id == user.id,
            Task.status == "done",
            Task.done_at >= day_start,
            Task.done_at <= day_end
        ).scalar()

        if completed_count > 0:
            streak += 1
            check_date = check_date.replace(day=check_date.day - 1)
        else:
            break

    # 2. Mastery: 습득한 단어 수
    mastery_count = db.query(func.count(WordCard.id)).filter(
        WordCard.user_id == user.id,
        WordCard.state == 2  # Review 상태 = 습득 완료
    ).scalar() or 0

    # 3. Consistency: 총 복습 횟수
    reviews_count = db.query(func.sum(WordCard.reps)).filter(
        WordCard.user_id == user.id
    ).scalar() or 0

    # 업적 체크 및 해금
    achievements = db.query(Achievement).all()
    new_unlocks = []

    for achievement in achievements:
        # 이미 해금했으면 스킵
        existing = db.query(UserAchievement).filter(
            UserAchievement.user_id == user.id,
            UserAchievement.achievement_id == achievement.id
        ).first()
        if existing:
            continue

        unlocked = False
        if achievement.category == "streak" and streak >= achievement.requirement_value:
            unlocked = True
        elif achievement.category == "mastery" and mastery_count >= achievement.requirement_value:
            unlocked = True
        elif achievement.category == "consistency" and reviews_count >= achievement.requirement_value:
            unlocked = True

        if unlocked:
            new_achievement = UserAchievement(
                user_id=user.id,
                achievement_id=achievement.id
            )
            db.add(new_achievement)
            new_unlocks.append(achievement)

    if new_unlocks:
        db.commit()

    return {
        "streak": streak,
        "mastery": mastery_count,
        "reviews": reviews_count,
        "new_unlocks": len(new_unlocks),
    }


@router.get("/stats")
def get_user_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """유저 통계 (업적 달성 현황)"""
    total = db.query(Achievement).count()
    unlocked = db.query(UserAchievement).filter(UserAchievement.user_id == user.id).count()

    # 카테고리별 통계
    category_stats = []
    for category in ["streak", "mastery", "consistency"]:
        cat_total = db.query(Achievement).filter(Achievement.category == category).count()
        cat_unlocked = db.query(func.count(UserAchievement.id)).join(
            Achievement, UserAchievement.achievement_id == Achievement.id
        ).filter(
            UserAchievement.user_id == user.id,
            Achievement.category == category
        ).scalar() or 0
        category_stats.append({
            "category": category,
            "total": cat_total,
            "unlocked": cat_unlocked,
        })

    return {
        "total": total,
        "unlocked": unlocked,
        "completion_rate": unlocked / total if total > 0 else 0,
        "by_category": category_stats,
    }


# 앱 시작 시 자동 시드
def seed_on_startup():
    Base.metadata.create_all(bind=engine)
    from database import SessionLocal
    db = SessionLocal()
    try:
        seed_achievements(db)
    finally:
        db.close()
