FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 패키지 설치
COPY requirements.txt requirements.lock ./
RUN pip install --no-cache-dir --require-hashes -r requirements.lock && pip check

# 소스 복사
COPY . .

# 이미지 저장 디렉토리
RUN mkdir -p test_output

EXPOSE 8000

CMD ["sh", "-c", "python migrate.py && exec uvicorn main:app --host 0.0.0.0 --port 8000"]
