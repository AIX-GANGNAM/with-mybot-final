FROM python:3.10-slim

WORKDIR /code

# 필수 패키지 설치
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir -r /code/requirements.txt

# 앱 코드 복사
COPY ./app /code/app

# 환경 변수 설정
ENV HUGGING_FACE_TOKEN=${HUGGING_FACE_TOKEN}

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]