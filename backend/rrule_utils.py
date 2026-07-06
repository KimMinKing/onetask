"""RRule (반복 일정) 유틸리티"""
from datetime import datetime, timezone
from typing import List, Optional
from dateutil.rrule import rrule, rrulestr, DAILY, WEEKLY, MONTHLY, YEARLY
from dateutil.relativedelta import relativedelta


class RecurrenceFrequency:
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


def generate_rrule(
    frequency: str,
    start_date: datetime,
    interval: int = 1,
    until: Optional[datetime] = None,
    count: Optional[int] = None,
) -> str:
    """RRule 문자열 생성

    Args:
        frequency: 반복 주기 (daily, weekly, monthly, yearly)
        start_date: 시작 날짜
        interval: 반복 간격 (기본 1)
        until: 종료 날짜 (선택)
        count: 반복 횟수 (선택, until보다 우선)

    Returns:
        RRule 문자열
    """
    freq_map = {
        RecurrenceFrequency.DAILY: DAILY,
        RecurrenceFrequency.WEEKLY: WEEKLY,
        RecurrenceFrequency.MONTHLY: MONTHLY,
        RecurrenceFrequency.YEARLY: YEARLY,
    }

    params = {
        "dtstart": start_date,
        "freq": freq_map[frequency],
        "interval": interval,
    }

    if count:
        params["count"] = count
    elif until:
        params["until"] = until

    return rrule(**params)._rrule


def parse_rrule(rrule_str: str, after: Optional[datetime] = None) -> List[datetime]:
    """RRule 문자열 파싱하여 날짜 목록 반환

    Args:
        rrule_str: RRule 문자열
        after: 이후 날짜만 반환 (기본: 현재)

    Returns:
        날짜 목록
    """
    if after is None:
        after = datetime.now(timezone.utc)

    rule = rrulestr(rrule_str)
    return list(rule.after(after))


def get_next_occurrence(
    rrule_str: str, from_date: Optional[datetime] = None
) -> Optional[datetime]:
    """다음 발생일 반환

    Args:
        rrule_str: RRule 문자열
        from_date: 기준 날짜 (기본: 현재)

    Returns:
        다음 발생일 또는 None
    """
    if from_date is None:
        from_date = datetime.now(timezone.utc)

    rule = rrulestr(rrule_str)
    next_occurrence = rule.after(from_date)

    return next_occurrence if next_occurrence else None


def expand_rrule_dates(
    rrule_str: str, start_date: datetime, end_date: datetime
) -> List[datetime]:
    """기간 내 모든 발생일 반환

    Args:
        rrule_str: RRule 문자열
        start_date: 시작 날짜
        end_date: 종료 날짜

    Returns:
        날짜 목록
    """
    rule = rrulestr(rrule_str)
    return list(rule.between(start_date, end_date))


def simplify_rrule(rrule_str: str) -> str:
    """RRule 문자열을 간단한 표현으로 변환 (UI용)

    Args:
        rrule_str: RRule 문자열

    Returns:
        간단한 표현 (예: "매일", "매주 화요일", "매월 1일")
    """
    rule = rrulestr(rrule_str)

    if rule._freq == DAILY:
        if rule._interval == 1:
            return "매일"
        return f"{rule._interval}일마다"

    if rule._freq == WEEKLY:
        days = ["월", "화", "수", "목", "금", "토", "일"]
        if rule._byweekday:
            day_names = ", ".join([days[d] for d in rule._byweekday])
            return f"매주 {day_names}요일"
        return f"매주 {days[rule._byweekday[0]]}요일" if rule._byweekday else "매주"

    if rule._freq == MONTHLY:
        if rule._interval == 1:
            return "매월"
        return f"{rule._interval}개월마다"

    if rule._freq == YEARLY:
        if rule._interval == 1:
            return "매년"
        return f"{rule._interval}년마다"

    return "반복"


def create_daily_rrule(start_date: datetime, days: Optional[int] = None) -> str:
    """매일 반복 RRule 생성"""
    return generate_rrule(RecurrenceFrequency.DAILY, start_date, count=days)


def create_weekly_rrule(
    start_date: datetime, weekdays: Optional[List[int]] = None
) -> str:
    """매주 반복 RRule 생성

    Args:
        start_date: 시작 날짜
        weekdays: 요일 리스트 (0=월, 6=일), None이면 시작일 요일
    """
    freq = RecurrenceFrequency.WEEKLY
    if weekdays:
        # rrule에 직접 byweekday 설정을 위해 문자열로 생성
        # 규칙: FREQ=WEEKLY;BYDAY=MO,TU,WE
        days_abbr = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
        byday = ",".join([days_abbr[d] for d in weekdays])
        return f"FREQ=WEEKLY;BYDAY={byday}"
    return generate_rrule(freq, start_date)


def create_monthly_rrule(
    start_date: datetime, day_of_month: Optional[int] = None
) -> str:
    """매월 반복 RRule 생성

    Args:
        start_date: 시작 날짜
        day_of_month: 매월 몇 일 (None이면 시작일)
    """
    freq = RecurrenceFrequency.MONTHLY
    if day_of_month:
        return f"FREQ=MONTHLY;BYMONTHDAY={day_of_month}"
    return generate_rrule(freq, start_date)
