# 라이브러리 임포트
import warnings
import urllib3
from urllib3.exceptions import InsecureRequestWarning

# SSL 경고 무시 설정
warnings.simplefilter('ignore', InsecureRequestWarning)
urllib3.disable_warnings(InsecureRequestWarning)

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
import random
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import openai
import os
from pytrends.request import TrendReq
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from firebase_admin import credentials, firestore, initialize_app
import firebase_admin
import dotenv
from fastapi import FastAPI, HTTPException
from threading import Thread
import uvicorn
from pydantic import BaseModel
import requests
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from google.cloud import storage
import uuid
import re  # 정규 표현식 모듈 임포트 추가
from fastapi.responses import JSONResponse

# FastAPI 앱 생성
app = FastAPI()

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 출처 허용 (필요에 따라 특정 출처로 제한 가능)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# .env 파일 로드
dotenv.load_dotenv()

# 환경 변수 설정
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "./mybot.json"

# Firebase 초기화
if not firebase_admin._apps:
    cred = credentials.Certificate('./mybot.json')
    initialize_app(cred)

db = firestore.client()

# Firebase Storage 클라이언트 초기화
storage_client = storage.Client()

# 전역 변수로 모델 로드
model_name = "gogamza/kobart-summarization"
TOKENIZER = AutoTokenizer.from_pretrained(model_name)
MODEL = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# pytrends 초기화 및 트렌드 검색 함수 정의
def fetch_trending_keywords(id, parentNick, userId):
    pytrends = TrendReq(hl='ko', tz=540)
    trending_searches_df = pytrends.trending_searches(pn='south_korea')
    top_keywords = trending_searches_df[0].tolist()

    # 트렌드 목록 출력
    print("실시간 검색어 키워드 리스트(1~20등) ▼")
    for i, keyword in enumerate(top_keywords, 1):
        print(f"{i}. {keyword}")

    # Firebase에서 페르소나 관심사 가져오기
    personas_ref = db.collection('personas')
    personas = personas_ref.stream()

    found_match = False

    for persona in personas:
        persona_data = persona.to_dict()
        persona_id = persona.id
        persona_name = persona_data.get('profile', {}).get('name', 'unknown')
        interests = persona_data.get('interests', [])

        # 페르소나 관심사와 일치하는 키워드 찾기
        matched_keywords = [keyword for keyword in top_keywords if any(interest in keyword for interest in interests)]

        if matched_keywords:
            found_match = True
            for keyword in matched_keywords:
                print(f"\n{persona_name}의 관심사와 일치하는 키워드 발견 : {keyword}")
                crawl_article(f"https://search.naver.com/search.naver?where=news&query={keyword}", keyword, persona_name, id, parentNick, userId, persona_id)

    return {"found_match": found_match, "message": "관심사와 일치하는 실시간 검색어가 없습니다."}

# 기사 크롤링 함수
def crawl_article(url, keyword, persona_name, id, parentNick, userId, persona_id):
    print(f"크롤링 시작: {url}")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--ignore-certificate-errors")
    chrome_options.add_argument("--window-size=1920x1080")
    chrome_options.add_argument("--log-level=3")  # 추가: 불필요한 로그 제거
    chrome_options.add_argument("--silent")  # 추가: 로그 최소화
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    try:
        # URL 접근 및 페이지 로드
        driver.get(url)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'a')))
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        keywords = keyword.split()

        # 1순위: 제목에 키워드가 포함된 기사 찾기
        articles = soup.find_all('a', class_='news_tit')
        primary_article = next((link for link in articles if any(kw in link.get_text() for kw in keywords)), None)

        if primary_article:
            # 1순위 기사 선택 시 링크 사용
            link = primary_article['href']
            print(f"1순위로 선택된 기사 링크: {link}")
        else:
            # 2순위: 본문에 키워드가 포함된 기사 찾기
            link = None
            for article in articles:
                article_url = article['href']
                driver.get(article_url)
                WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
                article_soup = BeautifulSoup(driver.page_source, 'html.parser')

                # 본문에서 키워드 찾기
                paragraphs = article_soup.find_all(['p', 'div', 'span'], class_=lambda x: x and ('content' in x or 'article' in x))
                content = "\n".join([para.get_text().strip() for para in paragraphs if para.get_text().strip()])
                
                if any(kw in content for kw in keywords):
                    link = article_url
                    print(f"2순위로 선택된 기사 링크: {link}")
                    break

        # 기사를 찾은 경우 본문과 이미지 추출
        if link:
            driver.get(link)
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'img')))
            article_soup = BeautifulSoup(driver.page_source, 'html.parser')

            # 본문 추출
            paragraphs = article_soup.find_all(['p', 'div', 'span'], class_=lambda x: x and ('content' in x or 'article' in x))
            content = "\n".join([para.get_text().strip() for para in paragraphs if para.get_text().strip()])

            if content:
                # 여러 줄바꿈을 하나로 줄이기
                content = "\n".join([line.strip() for line in content.splitlines() if line.strip() != ""])
                print("본문 추출 성공")
            else:
                print("본문 추출 실패")
                content = None

            # 이미지 URL 추출 (새로운 함수 사용)
            image_url = find_main_image(article_soup, link)
            if not image_url:
                print("메인 이미지를 찾을 수 없습니다.")
                image_url = "https://example.com/default-image.jpg"
            else:
                print(f"찾은 메인 이미지 URL: {image_url}")
            
            # 상대 경로 처리: 절대 경로로 변환
            if image_url:
                if image_url.startswith('//'):
                    image_url = 'https:' + image_url
                elif not image_url.startswith('http'):
                    base_url = url.split('/')[0:3]
                    base_url = '/'.join(base_url)
                    image_url = base_url + image_url if image_url.startswith('/') else base_url + '/' + image_url

            # 유효한 이미지 URL인지 확인
            if not image_url or not image_url.startswith('http'):
                image_url = "https://example.com/default-image.jpg"

            print(f"최종 이미지 URL: {image_url}")

            image_url = upload_image_to_storage(image_url, 'mirrorgram-20713.appspot.com', f'feeds/{generate_uuid()}.jpg')


        else:
            print("제목과 본문에 키워드 조건을 충족하는 기사를 찾을 수 없습니다.")
            content = None
            image_url = None

    except Exception as e:
        print(f"크롤링 중 오류 발생: {e}")
        content = None
        image_url = None

    finally:
        driver.quit()

    # 기사 요약 및 페르소나 피드 생성
    if content:
        # 여기서 새로운 UUID 생성
        new_id = generate_uuid()
        summarize_and_create_feed(content, image_url, persona_name, new_id, parentNick, userId, persona_id)
    else:
        print("요약할 내용이 없습니다.")


# Firebase Storage에 이미지 업로드 함수 정의
def upload_image_to_storage(image_url, bucket_name, destination_blob_name):
    try:
        # requests 세션 생성 및 헤더 설정
        session = requests.Session()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'ko,en;q=0.9,en-US;q=0.8',
            'Referer': 'https://www.google.com/'
        }
        
        # Firebase Storage 버킷 초기화
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(destination_blob_name)

        # 이미지 다운로드 시도 (기본 헤더)
        try:
            response = session.get(image_url, headers=headers, verify=False, timeout=10)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"첫 번째 시도 실패: {e}")
            
            # 다른 User-Agent로 재시도
            headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            try:
                response = session.get(image_url, headers=headers, verify=False, timeout=10)
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                print(f"두 번째 시도 실패: {e}")
                return "https://example.com/default-image.jpg"

        # Content-Type 확인 및 설정
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        if 'image' not in content_type:
            content_type = 'image/jpeg'  # 기본값으로 설정

        # 이미지 데이터가 유효한지 확인
        if len(response.content) < 100:  # 너무 작은 파일은 제외
            print("유효하지 않은 이미지 데이터")
            return "https://example.com/default-image.jpg"

        # Firebase Storage에 업로드
        blob.upload_from_string(
            response.content,
            content_type=content_type
        )

        # 업로드된 이미지에 공개 권한 부여
        blob.make_public()

        # 캐시 제어 설정
        blob.cache_control = 'public, max-age=3600'
        blob.patch()

        return blob.public_url

    except Exception as e:
        print(f"Firebase Storage에 이미지 업로드 중 오류 발생: {e}")
        
        # 상세한 에러 정보 출력
        if isinstance(e, requests.exceptions.RequestException):
            print(f"Request 에러 상세: {e.response.status_code if hasattr(e, 'response') else 'No status code'}")
            print(f"Request 에러 헤더: {e.response.headers if hasattr(e, 'response') else 'No headers'}")
        
        return "https://example.com/default-image.jpg"

# 기사 요약 및 페르소나 피드 생성 함수
def summarize_and_create_feed(content, image_url, persona_name, id, parentNick, userId, persona_id):
    try:
        # 기존 모델 로드 코드 제거
        global TOKENIZER, MODEL
        # 바로 요약 시작
        summarized_text = enhanced_summarize(content, MODEL, TOKENIZER)

        if not summarized_text:
            print("요약된 내용이 없습니다.")
            return

        # OpenAI API를 사용해 페르소나 성격 반영한 피드 작성
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            print("OpenAI API 키가 설정되지 않았습니다.")
            return

        persona_descriptions = {
            "joy": "항상 긍정적이고 낙관적인 시각으로 세상을 바라보며, 모든 일에서 좋은 점을 찾으려 노력합니다.",
            "anger": "불의에 대해 참지 못하고 쉽게 화를 내며, 직설적이고 공격적인 언어를 사용하곤 합니다.",
            "disgust": "모든 것에 대해 비판적이고 냉소적인 태도를 보이며, 날카로운 지적을 즐깁니다.",
            "sadness": "세상의 어두운 면을 자주 보며, 작은 일에도 쉽게 우울해지고 눈물을 흘리곤 합니다.",
            "fear": "학식이 높고 품행이 바르며, 도덕적 기준이 높아 모든 일을 윤리적 관점에서 판단합니다."
        }

        emoji_map = {
            "joy": "😊👍",
            "anger": "😡👊",
            "disgust": "😒🙄",
            "sadness": "😢💔",
            "fear": "🤮📚"
        }

        temperature_map = {
            "joy": 0.9,
            "anger": 0.8,
            "disgust": 0.7,
            "sadness": 0.6,
            "fear": 0.5
        }

        # 프로필의 페르소나 값을 가져오기
        persona_type = persona_id.split('_')[-1]  # ID에서 페르소나 타입 추출 (예: joy, anger 등)

        # 페르소나 프로필 이미지 가져오기
        persona_profile_image_url  = get_persona_profile_image(userId, persona_type)

        if persona_type not in persona_descriptions:
            print(f"알 수 없는 페르소나: {persona_type}")
            return

        selected_emoji = emoji_map.get(persona_type, "")
        selected_temperature = temperature_map.get(persona_type, 0.7)


        persona_prompt = (
            f"기사 요약: \n{summarized_text}\n\n"
            f"당신은 '{persona_type}'라는 캐릭터입니다. {persona_descriptions[persona_type]} "
            f"이런 성격의 {persona_type}가 위 기사를 읽고 글을 작성한다고 생각하고, "
            f"이모티콘({selected_emoji})을 포함해 300자 내외로 의견이 안 끊기게 작성해주세요. "
            f"불필요한 말은 하지 말고 핵심만 말해주세요."
        )

        response = openai.ChatCompletion.create(
            model="gpt-4o-mini", #gpt-3.5-turbo gpt-4o-mini
            messages=[
                {"role": "user", "content": persona_prompt}
            ],
            temperature=selected_temperature
        )

        # 현재 UTC 시간에 타임존 정보 추가 후 ISO 형식으로 변환
        created_at = datetime.now(timezone.utc).isoformat()

        if response and response.choices:
            persona_feed = response['choices'][0]['message']['content'].strip()
            print(f"\n{persona_name}의 피드:\n{persona_feed}")

            # Firestore에 피드 저장
            feed_data = {
                "id" : id,
                "caption": persona_feed,
                "image": image_url,
                "nick": f"{parentNick}의 {persona_name}",
                "userId": userId,
                "createdAt": created_at,  # ISO 형식의 문자열로 저장
                "likes": [],
                "comments": [],
                "subCommentId": [],
                "personaprofileImage": persona_profile_image_url,  # 페르소나 프로필 이미지 URL
            }
            print(f"\nFirestore에 저장할 피드 데이터: {feed_data}")
            
            # 피드 데이터 저장
            try:
                # Firestore에 데이터 추가
                feed_ref = db.collection("feeds").document(id)  # 지정한 id로 문서 생성
                feed_ref.set(feed_data)
                print(f"\n{persona_name}의 피드가 Firestore에 저장되었습니다. 문서 ID: {id}")

                # 저장된 문서의 ID 가져오기
                feed_ref = db.collection("feeds").document(id)
                feed = feed_ref.get()
                if feed.exists:
                    print("Firestore에 데이터가 저장되었습니다:", feed.to_dict())
                else:
                    print("Firestore에 데이터가 저장되지 않았습니다.")
            except Exception as e:
                print(f"Firestore에 피드를 저장하는 중 오류가 발생했습니다: {e}")

        else:
            print(f"\n{persona_name}의 피드: OpenAI API 응답에서 피드 내용을 찾을 수 없습니다.")
        
        if image_url:
            print(f"기사 이미지: {image_url}")

    except Exception as e:
        print(f"피드 작성 중 오류 발생: {e}")

# UUID 생성 함수
def generate_uuid():
    return str(uuid.uuid4())

def chunk_text(text, max_chunk_size=1000):
    """
    긴 텍스트를 의미 있는 청크로 분할
    """
    # 문장 단위로 분리
    sentences = text.split('.')
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence = sentence.strip() + '.'
        sentence_length = len(sentence)
        
        if current_length + sentence_length > max_chunk_size:
            if current_chunk:
                chunks.append(' '.join(current_chunk))
            current_chunk = [sentence]
            current_length = sentence_length
        else:
            current_chunk.append(sentence)
            current_length += sentence_length
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def enhanced_summarize(content, model, tokenizer):
    """
    향상된 텍스트 요약 함수
    """
    try:
        # 텍스트를 청크로 분할
        chunks = chunk_text(content)
        summaries = []
        
        for chunk in chunks:
            # 각 청크에 대해 요약 수행
            inputs = tokenizer([chunk], max_length=1024, return_tensors="pt", truncation=True)
            
            # 요약 생성 파라미터 조정
            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=150,          # 최대 요약 길이
                min_length=50,           # 최소 요약 길이
                length_penalty=2.0,      # 길이 페널티 (높을수록 더 긴 요약 생성)
                num_beams=4,            # 빔 서치 크기
                early_stopping=True,     # 조기 종료
                no_repeat_ngram_size=2,  # 반복 구문 방지
                use_cache=True          # 캐시 사용으로 속도 향상
            )
            
            chunk_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            summaries.append(chunk_summary)
        
        # 전체 요약 통합
        if len(summaries) > 1:
            # 여러 청크의 요약을 하나로 통합
            final_summary = " ".join(summaries)
            
            # 통합된 요약에 대해 한 번 더 요약 수행
            inputs = tokenizer([final_summary], max_length=1024, return_tensors="pt", truncation=True)
            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=200,
                min_length=100,
                length_penalty=2.0,
                num_beams=4,
                early_stopping=True,
                no_repeat_ngram_size=2
            )
            final_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        else:
            final_summary = summaries[0]
        
        return final_summary
    
    except Exception as e:
        print(f"요약 중 오류 발생: {e}")
        return content[:500] + "..."  # 오류 발생 시 앞부분만 반환

# Firebase에서 페르소나 프로필 이미지 가져오는 함수
def get_persona_profile_image(user_id, persona_type):
    try:
        # Firebase users 컬렉션에서 user_id에 해당하는 문서 가져오기
        user_ref = db.collection("users").document(user_id)
        user_data = user_ref.get().to_dict()

        # users 컬렉션의 persona 필드에서 해당 페르소나 타입의 이미지 URL 가져오기
        persona_profile_image = user_data.get("persona", {}).get(persona_type)
        
        if persona_profile_image:
            print(f"{persona_type} 페르소나 프로필 이미지 URL: {persona_profile_image}")
            return persona_profile_image
        else:
            print(f"{persona_type} 페르소나 프로필 이미지가 없습니다.")
            return "https://example.com/default-persona-image.jpg"  # 기본 프로필 이미지 URL 설정
    except Exception as e:
        print(f"Firebase에서 페르소나 프로필 이미지 가져오기 중 오류 발생: {e}")
        return "https://example.com/default-persona-image.jpg"

# 스케줄러 설정 및 시작
# def start_scheduler():
#     scheduler = BackgroundScheduler()
#     scheduler.add_job(fetch_trending_keywords, 'cron', hour='0,12')  # 매일 0시, 12시에 실행
#     scheduler.start()
#     atexit.register(lambda: scheduler.shutdown())

# FastAPI 서버 실행 스레드
def run_server():
    uvicorn.run(app, host="0.0.0.0", port=8000)

# 자동 엔드포인트 추가[전체 실행]
@app.post("/feedAutomatic")
async def feedAutomatic(feed_data: dict):
    try:
        id = feed_data.get("id")
        parentNick = feed_data.get("parentNick")
        userId = feed_data.get("userId")

        result = fetch_trending_keywords(id, parentNick, userId)
        
        # 매치되는 키워드가 없을 때 메시지를 반환
        if not result["found_match"]:
            return JSONResponse(status_code=200, content={"message": result["message"]})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 실시간 검색어 목록을 반환하는 엔드포인트
@app.get("/trendingKeywords")
async def get_trending_keywords():
    try:
        # pytrends 초기화 및 실시간 검색어 가져오기
        pytrends = TrendReq(hl='ko', tz=540)
        trending_searches_df = pytrends.trending_searches(pn='south_korea')
        top_keywords = trending_searches_df[0].tolist()
        print("실시간 검색어 :", top_keywords)  # 리스트 타입으로 출력

        # 검색어 목록 반환
        return {"trending_keywords": top_keywords}

    except Exception as e:
        print(f"실시간 검색어 가져오기 실패: {e}")
        raise HTTPException(status_code=500, detail=f"실시간 검색어를 가져오는 중 오류 발생: {e}")


# 사용자가 선택한 키워드로 요약된 피드를 자동 생성하여 Firebase에 저장하는 엔드포인트
@app.post("/generateFeed")
async def generate_feed(request: dict):
    keyword = request.get("keyword")
    persona_type = request.get("persona_type")
    parentNick = request.get("parentNick")
    userId = request.get("userId")
    title = request.get("title")

    print(f"키워드: {keyword}, 페르소나 타입: {persona_type}, parentNick: {parentNick}, userId: {userId}, title: {title}")

    # 요청 검증
    if not keyword or not persona_type or not parentNick or not userId:
        raise HTTPException(status_code=400, detail="키워드, 페르소나 타입, parentNick, userId를 모두 입력하세요.")

    try:
        # 유니크 ID 생성 및 페르소나 이름 설정
        id = generate_uuid()
        persona_name = title if title else f"{persona_type.capitalize()}"
        
        print(f"페르소나 이름: {persona_name}")
        # 기사 크롤링 및 요약 생성 후 Firebase에 저장
        article_url = f"https://search.naver.com/search.naver?where=news&query={keyword}"
        crawl_article(article_url, keyword, persona_name, id, parentNick, userId, persona_type)

        return {"message": f"'{keyword}' 키워드에 대한 '{persona_type}' 페르소나로 피드가 자동 생성되어 저장되었습니다."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def find_main_image(soup, article_url):
    """
    뉴스 기사의 메인 이미지를 찾는 향상된 함수 - 일반적인 패턴 위주로 검색
    """
    try:
        def normalize_url(src, article_url):
            if not src:
                return None
            from urllib.parse import urljoin
            # 프로토콜 상대 URL 처리
            if src.startswith('//'):
                return 'https:' + src
            # 절대 URL인 경우
            if src.startswith(('http://', 'https://')):
                return src
            # 상대 URL을 절대 URL로 변환
            return urljoin(article_url, src)

        # 제외할 이미지 패턴
        exclude_patterns = [
            'logo', 'banner', 'ad', 'icon', 'button', 'share', 
            'reporter', 'profile', 'thumbnail', 'small', 'nav',
            'footer', 'header'
        ]

        def is_news_image(img):
            """뉴스 이미지인지 확인하는 함수"""
            src = img.get('src', '')
            alt = img.get('alt', '').lower()
            class_name = ' '.join(img.get('class', [])).lower() if img.get('class') else ''
            
            # 제외 패턴 체크
            if any(pattern in src.lower() or pattern in alt or pattern in class_name 
                  for pattern in exclude_patterns):
                return False

            # 일반적인 뉴스 이미지 특성 체크
            is_news_photo = (
                'photo' in src.lower() or
                'image' in src.lower() or
                'news' in src.lower() or
                '.jpg' in src.lower() or
                '.png' in src.lower() or
                'pictures' in src.lower()
            )

            # 이미지 크기나 품질 관련 속성 체크
            width = img.get('width', '0')
            height = img.get('height', '0')
            if width.isdigit() and height.isdigit():
                size_ok = int(width) >= 200 and int(height) >= 200
            else:
                size_ok = True  # 크기 정보가 없으면 일단 통과

            return is_news_photo and size_ok

        # 1. 메인 이미지 찾기 (일반적인 속성/위치 기반)
        main_candidates = []
        for img in soup.find_all('img'):
            if not img.get('src'):
                continue

            score = 0
            src = img.get('src', '')
            alt = img.get('alt', '').lower()
            
            # 점수 부여 기준
            if is_news_image(img):
                score += 5
            if 'main' in str(img) or 'article' in str(img):
                score += 3
            if len(alt) > 10:  # 의미 있는 alt 텍스트
                score += 2
            if img.parent and ('article' in str(img.parent) or 'content' in str(img.parent)):
                score += 2
            if 'data-adbro-processed' in img.attrs:  # 뉴스 사이트 특화 속성
                score += 1

            main_candidates.append((img, score))

        # 점수순으로 정렬
        main_candidates.sort(key=lambda x: x[1], reverse=True)

        # 가장 높은 점수의 이미지 선택
        if main_candidates:
            best_img = main_candidates[0][0]
            src = best_img.get('src')
            if src:
                return normalize_url(src, article_url)

        return None

    except Exception as e:
        print(f"이미지 검색 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return None


# 메인 함수에서 스케줄러 시작 및 서버 실행
if __name__ == "__main__":
    print("실시간 검색어 가져오기 시작!")
    server_thread = Thread(target=run_server)
    server_thread.start()


#----------------------

# 라이브러리 임포트
import warnings
import urllib3
from urllib3.exceptions import InsecureRequestWarning

# SSL 경고 무시 설정
warnings.simplefilter('ignore', InsecureRequestWarning)
urllib3.disable_warnings(InsecureRequestWarning)

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
import random
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import openai
import os
from pytrends.request import TrendReq
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from firebase_admin import credentials, firestore, initialize_app
import firebase_admin
import dotenv
from fastapi import FastAPI, HTTPException
from threading import Thread
import uvicorn
from pydantic import BaseModel
import requests
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from google.cloud import storage
import uuid
import re  # 정규 표현식 모듈 임포트 추가
from fastapi.responses import JSONResponse

# FastAPI 앱 생성
app = FastAPI()

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 출처 허용 (필요에 따라 특정 출처로 제한 가능)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# .env 파일 로드
dotenv.load_dotenv()

# 환경 변수 설정
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = "./mybot.json"

# Firebase 초기화
if not firebase_admin._apps:
    cred = credentials.Certificate('./mybot.json')
    initialize_app(cred)

db = firestore.client()

# Firebase Storage 클라이언트 초기화
storage_client = storage.Client()

# 전역 변수로 모델 로드
model_name = "gogamza/kobart-summarization"
TOKENIZER = AutoTokenizer.from_pretrained(model_name)
MODEL = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# pytrends 초기화 및 트렌드 검색 함수 정의
def fetch_trending_keywords(id, parentNick, userId):
    pytrends = TrendReq(hl='ko', tz=540)
    trending_searches_df = pytrends.trending_searches(pn='south_korea')
    top_keywords = trending_searches_df[0].tolist()

    # 트렌드 목록 출력
    print("실시간 검색어 키워드 리스트(1~20등) ▼")
    for i, keyword in enumerate(top_keywords, 1):
        print(f"{i}. {keyword}")

    # Firebase에서 페르소나 관심사 가져오기
    personas_ref = db.collection('personas')
    personas = personas_ref.stream()

    found_match = False

    for persona in personas:
        persona_data = persona.to_dict()
        persona_id = persona.id
        persona_name = persona_data.get('profile', {}).get('name', 'unknown')
        interests = persona_data.get('interests', [])

        # 페르소나 관심사와 일치하는 키워드 찾기
        matched_keywords = [keyword for keyword in top_keywords if any(interest in keyword for interest in interests)]

        if matched_keywords:
            found_match = True
            for keyword in matched_keywords:
                print(f"\n{persona_name}의 관심사와 일치하는 키워드 발견 : {keyword}")
                crawl_article(f"https://search.naver.com/search.naver?where=news&query={keyword}", keyword, persona_name, id, parentNick, userId, persona_id)

    return {"found_match": found_match, "message": "관심사와 일치하는 실시간 검색어가 없습니다."}

# 기사 크롤링 함수
def crawl_article(url, keyword, persona_name, id, parentNick, userId, persona_id):
    print(f"크롤링 시작: {url}")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--ignore-certificate-errors")
    chrome_options.add_argument("--window-size=1920x1080")
    chrome_options.add_argument("--log-level=3")  # 추가: 불필요한 로그 제거
    chrome_options.add_argument("--silent")  # 추가: 로그 최소화
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    try:
        # URL 접근 및 페이지 로드
        driver.get(url)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'a')))
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        keywords = keyword.split()

        # 1순위: 제목에 키워드가 포함된 기사 찾기
        articles = soup.find_all('a', class_='news_tit')
        primary_article = next((link for link in articles if any(kw in link.get_text() for kw in keywords)), None)

        if primary_article:
            # 1순위 기사 선택 시 링크 사용
            link = primary_article['href']
            print(f"1순위로 선택된 기사 링크: {link}")
        else:
            # 2순위: 본문에 키워드가 포함된 기사 찾기
            link = None
            for article in articles:
                article_url = article['href']
                driver.get(article_url)
                WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
                article_soup = BeautifulSoup(driver.page_source, 'html.parser')

                # 본문에서 키워드 찾기
                paragraphs = article_soup.find_all(['p', 'div', 'span'], class_=lambda x: x and ('content' in x or 'article' in x))
                content = "\n".join([para.get_text().strip() for para in paragraphs if para.get_text().strip()])
                
                if any(kw in content for kw in keywords):
                    link = article_url
                    print(f"2순위로 선택된 기사 링크: {link}")
                    break

        # 기사를 찾은 경우 본문과 이미지 추출
        if link:
            driver.get(link)
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'img')))
            article_soup = BeautifulSoup(driver.page_source, 'html.parser')

            # 본문 추출
            paragraphs = article_soup.find_all(['p', 'div', 'span'], class_=lambda x: x and ('content' in x or 'article' in x))
            content = "\n".join([para.get_text().strip() for para in paragraphs if para.get_text().strip()])

            if content:
                # 여러 줄바꿈을 하나로 줄이기
                content = "\n".join([line.strip() for line in content.splitlines() if line.strip() != ""])
                print("본문 추출 성공")
            else:
                print("본문 추출 실패")
                content = None

            # 이미지 URL 추출 (새로운 함수 사용)
            image_url = find_main_image(article_soup, link)
            if not image_url:
                print("메인 이미지를 찾을 수 없습니다.")
                image_url = "https://example.com/default-image.jpg"
            else:
                print(f"찾은 메인 이미지 URL: {image_url}")
            
            # 상대 경로 처리: 절대 경로로 변환
            if image_url:
                if image_url.startswith('//'):
                    image_url = 'https:' + image_url
                elif not image_url.startswith('http'):
                    base_url = url.split('/')[0:3]
                    base_url = '/'.join(base_url)
                    image_url = base_url + image_url if image_url.startswith('/') else base_url + '/' + image_url

            # 유효한 이미지 URL인지 확인
            if not image_url or not image_url.startswith('http'):
                image_url = "https://example.com/default-image.jpg"

            print(f"최종 이미지 URL: {image_url}")

            image_url = upload_image_to_storage(image_url, 'mirrorgram-20713.appspot.com', f'feeds/{generate_uuid()}.jpg')


        else:
            print("제목과 본문에 키워드 조건을 충족하는 기사를 찾을 수 없습니다.")
            content = None
            image_url = None

    except Exception as e:
        print(f"크롤링 중 오류 발생: {e}")
        content = None
        image_url = None

    finally:
        driver.quit()

    # 기사 요약 및 페르소나 피드 생성
    if content:
        # 여기서 새로운 UUID 생성
        new_id = generate_uuid()
        summarize_and_create_feed(content, image_url, persona_name, new_id, parentNick, userId, persona_id)
    else:
        print("요약할 내용이 없습니다.")


# Firebase Storage에 이미지 업로드 함수 정의
def upload_image_to_storage(image_url, bucket_name, destination_blob_name):
    try:
        # requests 세션 생성 및 헤더 설정
        session = requests.Session()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'ko,en;q=0.9,en-US;q=0.8',
            'Referer': 'https://www.google.com/'
        }
        
        # Firebase Storage 버킷 초기화
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(destination_blob_name)

        # 이미지 다운로드 시도 (기본 헤더)
        try:
            response = session.get(image_url, headers=headers, verify=False, timeout=10)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"첫 번째 시도 실패: {e}")
            
            # 다른 User-Agent로 재시도
            headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            try:
                response = session.get(image_url, headers=headers, verify=False, timeout=10)
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                print(f"두 번째 시도 실패: {e}")
                return "https://example.com/default-image.jpg"

        # Content-Type 확인 및 설정
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        if 'image' not in content_type:
            content_type = 'image/jpeg'  # 기본값으로 설정

        # 이미지 데이터가 유효한지 확인
        if len(response.content) < 100:  # 너무 작은 파일은 제외
            print("유효하지 않은 이미지 데이터")
            return "https://example.com/default-image.jpg"

        # Firebase Storage에 업로드
        blob.upload_from_string(
            response.content,
            content_type=content_type
        )

        # 업로드된 이미지에 공개 권한 부여
        blob.make_public()

        # 캐시 제어 설정
        blob.cache_control = 'public, max-age=3600'
        blob.patch()

        return blob.public_url

    except Exception as e:
        print(f"Firebase Storage에 이미지 업로드 중 오류 발생: {e}")
        
        # 상세한 에러 정보 출력
        if isinstance(e, requests.exceptions.RequestException):
            print(f"Request 에러 상세: {e.response.status_code if hasattr(e, 'response') else 'No status code'}")
            print(f"Request 에러 헤더: {e.response.headers if hasattr(e, 'response') else 'No headers'}")
        
        return "https://example.com/default-image.jpg"

# 기사 요약 및 페르소나 피드 생성 함수
def summarize_and_create_feed(content, image_url, persona_name, id, parentNick, userId, persona_id):
    try:
        # 기존 모델 로드 코드 제거
        global TOKENIZER, MODEL
        # 바로 요약 시작
        summarized_text = enhanced_summarize(content, MODEL, TOKENIZER)

        if not summarized_text:
            print("요약된 내용이 없습니다.")
            return

        # OpenAI API를 사용해 페르소나 성격 반영한 피드 작성
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            print("OpenAI API 키가 설정되지 않았습니다.")
            return

        persona_descriptions = {
            "joy": "항상 긍정적이고 낙관적인 시각으로 세상을 바라보며, 모든 일에서 좋은 점을 찾으려 노력합니다.",
            "anger": "불의에 대해 참지 못하고 쉽게 화를 내며, 직설적이고 공격적인 언어를 사용하곤 합니다.",
            "disgust": "모든 것에 대해 비판적이고 냉소적인 태도를 보이며, 날카로운 지적을 즐깁니다.",
            "sadness": "세상의 어두운 면을 자주 보며, 작은 일에도 쉽게 우울해지고 눈물을 흘리곤 합니다.",
            "fear": "학식이 높고 품행이 바르며, 도덕적 기준이 높아 모든 일을 윤리적 관점에서 판단합니다."
        }

        emoji_map = {
            "joy": "😊👍",
            "anger": "😡👊",
            "disgust": "😒🙄",
            "sadness": "😢💔",
            "fear": "🤮📚"
        }

        temperature_map = {
            "joy": 0.9,
            "anger": 0.8,
            "disgust": 0.7,
            "sadness": 0.6,
            "fear": 0.5
        }

        # 프로필의 페르소나 값을 가져오기
        persona_type = persona_id.split('_')[-1]  # ID에서 페르소나 타입 추출 (예: joy, anger 등)

        # 페르소나 프로필 이미지 가져오기
        persona_profile_image_url  = get_persona_profile_image(userId, persona_type)

        if persona_type not in persona_descriptions:
            print(f"알 수 없는 페르소나: {persona_type}")
            return

        selected_emoji = emoji_map.get(persona_type, "")
        selected_temperature = temperature_map.get(persona_type, 0.7)


        persona_prompt = (
            f"기사 요약: \n{summarized_text}\n\n"
            f"당신은 '{persona_type}'라는 캐릭터입니다. {persona_descriptions[persona_type]} "
            f"이런 성격의 {persona_type}가 위 기사를 읽고 글을 작성한다고 생각하고, "
            f"이모티콘({selected_emoji})을 포함해 300자 내외로 의견이 안 끊기게 작성해주세요. "
            f"불필요한 말은 하지 말고 핵심만 말해주세요."
        )

        response = openai.ChatCompletion.create(
            model="gpt-4o-mini", #gpt-3.5-turbo gpt-4o-mini
            messages=[
                {"role": "user", "content": persona_prompt}
            ],
            temperature=selected_temperature
        )

        # 현재 UTC 시간에 타임존 정보 추가 후 ISO 형식으로 변환
        created_at = datetime.now(timezone.utc).isoformat()

        if response and response.choices:
            persona_feed = response['choices'][0]['message']['content'].strip()
            print(f"\n{persona_name}의 피드:\n{persona_feed}")

            # Firestore에 피드 저장
            feed_data = {
                "id" : id,
                "caption": persona_feed,
                "image": image_url,
                "nick": f"{parentNick}의 {persona_name}",
                "userId": userId,
                "createdAt": created_at,  # ISO 형식의 문자열로 저장
                "likes": [],
                "comments": [],
                "subCommentId": [],
                "personaprofileImage": persona_profile_image_url,  # 페르소나 프로필 이미지 URL
            }
            print(f"\nFirestore에 저장할 피드 데이터: {feed_data}")
            
            # 피드 데이터 저장
            try:
                # Firestore에 데이터 추가
                feed_ref = db.collection("feeds").document(id)  # 지정한 id로 문서 생성
                feed_ref.set(feed_data)
                print(f"\n{persona_name}의 피드가 Firestore에 저장되었습니다. 문서 ID: {id}")

                # 저장된 문서의 ID 가져오기
                feed_ref = db.collection("feeds").document(id)
                feed = feed_ref.get()
                if feed.exists:
                    print("Firestore에 데이터가 저장되었습니다:", feed.to_dict())
                else:
                    print("Firestore에 데이터가 저장되지 않았습니다.")
            except Exception as e:
                print(f"Firestore에 피드를 저장하는 중 오류가 발생했습니다: {e}")

        else:
            print(f"\n{persona_name}의 피드: OpenAI API 응답에서 피드 내용을 찾을 수 없습니다.")
        
        if image_url:
            print(f"기사 이미지: {image_url}")

    except Exception as e:
        print(f"피드 작성 중 오류 발생: {e}")

# UUID 생성 함수
def generate_uuid():
    return str(uuid.uuid4())

def chunk_text(text, max_chunk_size=1000):
    """
    긴 텍스트를 의미 있는 청크로 분할
    """
    # 문장 단위로 분리
    sentences = text.split('.')
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence = sentence.strip() + '.'
        sentence_length = len(sentence)
        
        if current_length + sentence_length > max_chunk_size:
            if current_chunk:
                chunks.append(' '.join(current_chunk))
            current_chunk = [sentence]
            current_length = sentence_length
        else:
            current_chunk.append(sentence)
            current_length += sentence_length
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def enhanced_summarize(content, model, tokenizer):
    """
    향상된 텍스트 요약 함수
    """
    try:
        # 텍스트를 청크로 분할
        chunks = chunk_text(content)
        summaries = []
        
        for chunk in chunks:
            # 각 청크에 대해 요약 수행
            inputs = tokenizer([chunk], max_length=1024, return_tensors="pt", truncation=True)
            
            # 요약 생성 파라미터 조정
            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=150,          # 최대 요약 길이
                min_length=50,           # 최소 요약 길이
                length_penalty=2.0,      # 길이 페널티 (높을수록 더 긴 요약 생성)
                num_beams=4,            # 빔 서치 크기
                early_stopping=True,     # 조기 종료
                no_repeat_ngram_size=2,  # 반복 구문 방지
                use_cache=True          # 캐시 사용으로 속도 향상
            )
            
            chunk_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            summaries.append(chunk_summary)
        
        # 전체 요약 통합
        if len(summaries) > 1:
            # 여러 청크의 요약을 하나로 통합
            final_summary = " ".join(summaries)
            
            # 통합된 요약에 대해 한 번 더 요약 수행
            inputs = tokenizer([final_summary], max_length=1024, return_tensors="pt", truncation=True)
            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=200,
                min_length=100,
                length_penalty=2.0,
                num_beams=4,
                early_stopping=True,
                no_repeat_ngram_size=2
            )
            final_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        else:
            final_summary = summaries[0]
        
        return final_summary
    
    except Exception as e:
        print(f"요약 중 오류 발생: {e}")
        return content[:500] + "..."  # 오류 발생 시 앞부분만 반환

# Firebase에서 페르소나 프로필 이미지 가져오는 함수
def get_persona_profile_image(user_id, persona_type):
    try:
        # Firebase users 컬렉션에서 user_id에 해당하는 문서 가져오기
        user_ref = db.collection("users").document(user_id)
        user_data = user_ref.get().to_dict()

        # users 컬렉션의 persona 필드에서 해당 페르소나 타입의 이미지 URL 가져오기
        persona_profile_image = user_data.get("persona", {}).get(persona_type)
        
        if persona_profile_image:
            print(f"{persona_type} 페르소나 프로필 이미지 URL: {persona_profile_image}")
            return persona_profile_image
        else:
            print(f"{persona_type} 페르소나 프로필 이미지가 없습니다.")
            return "https://example.com/default-persona-image.jpg"  # 기본 프로필 이미지 URL 설정
    except Exception as e:
        print(f"Firebase에서 페르소나 프로필 이미지 가져오기 중 오류 발생: {e}")
        return "https://example.com/default-persona-image.jpg"

# 스케줄러 설정 및 시작
# def start_scheduler():
#     scheduler = BackgroundScheduler()
#     scheduler.add_job(fetch_trending_keywords, 'cron', hour='0,12')  # 매일 0시, 12시에 실행
#     scheduler.start()
#     atexit.register(lambda: scheduler.shutdown())

# FastAPI 서버 실행 스레드
def run_server():
    uvicorn.run(app, host="0.0.0.0", port=8000)

# 자동 엔드포인트 추가[전체 실행]
@app.post("/feedAutomatic")
async def feedAutomatic(feed_data: dict):
    try:
        id = feed_data.get("id")
        parentNick = feed_data.get("parentNick")
        userId = feed_data.get("userId")

        result = fetch_trending_keywords(id, parentNick, userId)
        
        # 매치되는 키워드가 없을 때 메시지를 반환
        if not result["found_match"]:
            return JSONResponse(status_code=200, content={"message": result["message"]})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 실시간 검색어 목록을 반환하는 엔드포인트
@app.get("/trendingKeywords")
async def get_trending_keywords():
    try:
        # pytrends 초기화 및 실시간 검색어 가져오기
        pytrends = TrendReq(hl='ko', tz=540)
        trending_searches_df = pytrends.trending_searches(pn='south_korea')
        top_keywords = trending_searches_df[0].tolist()
        print("실시간 검색어 :", top_keywords)  # 리스트 타입으로 출력

        # 검색어 목록 반환
        return {"trending_keywords": top_keywords}

    except Exception as e:
        print(f"실시간 검색어 가져오기 실패: {e}")
        raise HTTPException(status_code=500, detail=f"실시간 검색어를 가져오는 중 오류 발생: {e}")


# 사용자가 선택한 키워드로 요약된 피드를 자동 생성하여 Firebase에 저장하는 엔드포인트
@app.post("/generateFeed")
async def generate_feed(request: dict):
    keyword = request.get("keyword")
    persona_type = request.get("persona_type")
    parentNick = request.get("parentNick")
    userId = request.get("userId")
    title = request.get("title")

    print(f"키워드: {keyword}, 페르소나 타입: {persona_type}, parentNick: {parentNick}, userId: {userId}, title: {title}")

    # 요청 검증
    if not keyword or not persona_type or not parentNick or not userId:
        raise HTTPException(status_code=400, detail="키워드, 페르소나 타입, parentNick, userId를 모두 입력하세요.")

    try:
        # 유니크 ID 생성 및 페르소나 이름 설정
        id = generate_uuid()
        persona_name = title if title else f"{persona_type.capitalize()}"
        
        print(f"페르소나 이름: {persona_name}")
        # 기사 크롤링 및 요약 생성 후 Firebase에 저장
        article_url = f"https://search.naver.com/search.naver?where=news&query={keyword}"
        crawl_article(article_url, keyword, persona_name, id, parentNick, userId, persona_type)

        return {"message": f"'{keyword}' 키워드에 대한 '{persona_type}' 페르소나로 피드가 자동 생성되어 저장되었습니다."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def find_main_image(soup, article_url):
    """
    뉴스 기사의 메인 이미지를 찾는 향상된 함수 - 일반적인 패턴 위주로 검색
    """
    try:
        def normalize_url(src, article_url):
            if not src:
                return None
            from urllib.parse import urljoin
            # 프로토콜 상대 URL 처리
            if src.startswith('//'):
                return 'https:' + src
            # 절대 URL인 경우
            if src.startswith(('http://', 'https://')):
                return src
            # 상대 URL을 절대 URL로 변환
            return urljoin(article_url, src)

        # 제외할 이미지 패턴
        exclude_patterns = [
            'logo', 'banner', 'ad', 'icon', 'button', 'share', 
            'reporter', 'profile', 'thumbnail', 'small', 'nav',
            'footer', 'header'
        ]

        def is_news_image(img):
            """뉴스 이미지인지 확인하는 함수"""
            src = img.get('src', '')
            alt = img.get('alt', '').lower()
            class_name = ' '.join(img.get('class', [])).lower() if img.get('class') else ''
            
            # 제외 패턴 체크
            if any(pattern in src.lower() or pattern in alt or pattern in class_name 
                  for pattern in exclude_patterns):
                return False

            # 일반적인 뉴스 이미지 특성 체크
            is_news_photo = (
                'photo' in src.lower() or
                'image' in src.lower() or
                'news' in src.lower() or
                '.jpg' in src.lower() or
                '.png' in src.lower() or
                'pictures' in src.lower()
            )

            # 이미지 크기나 품질 관련 속성 체크
            width = img.get('width', '0')
            height = img.get('height', '0')
            if width.isdigit() and height.isdigit():
                size_ok = int(width) >= 200 and int(height) >= 200
            else:
                size_ok = True  # 크기 정보가 없으면 일단 통과

            return is_news_photo and size_ok

        # 1. 메인 이미지 찾기 (일반적인 속성/위치 기반)
        main_candidates = []
        for img in soup.find_all('img'):
            if not img.get('src'):
                continue

            score = 0
            src = img.get('src', '')
            alt = img.get('alt', '').lower()
            
            # 점수 부여 기준
            if is_news_image(img):
                score += 5
            if 'main' in str(img) or 'article' in str(img):
                score += 3
            if len(alt) > 10:  # 의미 있는 alt 텍스트
                score += 2
            if img.parent and ('article' in str(img.parent) or 'content' in str(img.parent)):
                score += 2
            if 'data-adbro-processed' in img.attrs:  # 뉴스 사이트 특화 속성
                score += 1

            main_candidates.append((img, score))

        # 점수순으로 정렬
        main_candidates.sort(key=lambda x: x[1], reverse=True)

        # 가장 높은 점수의 이미지 선택
        if main_candidates:
            best_img = main_candidates[0][0]
            src = best_img.get('src')
            if src:
                return normalize_url(src, article_url)

        return None

    except Exception as e:
        print(f"이미지 검색 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return None


# 메인 함수에서 스케줄러 시작 및 서버 실행
if __name__ == "__main__":
    print("실시간 검색어 가져오기 시작!")
    server_thread = Thread(target=run_server)
    server_thread.start()


#----------
# Firebase에서 persona 정보 가져오기
        # user_ref = db.collection("users").document(userId)
        # user_doc = user_ref.get()
        
        # if user_doc.exists:
        #     user_data = user_doc.to_dict()
        #     personas = user_data.get('persona', [])
        #     matching_persona = next(
        #         (p for p in personas if p.get('Name', '').lower() == persona_id.lower()),
        #         None
        #     )
            
        #     if matching_persona:
        #         persona_profile_image_url = matching_persona.get('IMG', 'https://example.com/default-persona-image.jpg')
        #     else:
        #         persona_profile_image_url = 'https://example.com/default-persona-image.jpg'
        # else:
        #     persona_profile_image_url = 'https://example.com/default-persona-image.jpg'