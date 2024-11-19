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
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import dotenv
from pydantic import BaseModel

# .env 파일 로드
dotenv.load_dotenv()

# Firebase 초기화
if not firebase_admin._apps:
    cred = credentials.Certificate('./mybot.json')
    initialize_app(cred)

db = firestore.client()

# FastAPI 앱 초기화
app = FastAPI()

# pytrends 초기화 및 트렌드 검색 함수 정의
def fetch_trending_keywords():
    pytrends = TrendReq(hl='ko', tz=540)
    trending_searches_df = pytrends.trending_searches(pn='south_korea')
    top_keywords = trending_searches_df[0].tolist()

    # 트렌드 목록 출력
    print("오늘의 대한민국 트렌드 키워드:")
    for i, keyword in enumerate(top_keywords, 1):
        print(f"{i}. {keyword}")

    # Firebase에서 페르소나 관심사 가져오기
    personas_ref = db.collection('personas')
    personas = personas_ref.stream()

    found_match = False
    for persona in personas:
        persona_data = persona.to_dict()
        persona_id = persona.id
        persona_name = persona_id.split('_')[-1]  # 언더바 뒤의 이름 추출
        interests = persona_data.get('interests', [])

        # 페르소나 관심사와 일치하는 키워드 찾기
        for interest in interests:
            if any(interest in keyword for keyword in top_keywords):
                found_match = True
                print(f"\n{persona_name}의 관심사와 일치하는 키워드 발견: {interest}")
                url = f"https://search.naver.com/search.naver?where=news&query={interest}"
                crawl_article(url, interest)

    if not found_match:
        print("관심사와 일치하는 실시간 검색어가 없습니다.")

# 기사 크롤링 함수
def crawl_article(url, keyword):
    # Chrome 옵션 설정
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)

    # Chrome WebDriver 설정
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    try:
        driver.get(url)
        WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.CLASS_NAME, "news_tit")))

        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')

        # 네이버 뉴스 기사 링크 하나 추출
        article = soup.find('a', class_='news_tit')
        if article:
            link = article['href']
            print(f"기사 링크: {link}")

            driver.get(link)
            WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            time.sleep(random.uniform(3, 7))

            article_page = driver.page_source
            article_soup = BeautifulSoup(article_page, 'html.parser')

            paragraphs = article_soup.find_all(['p', 'div', 'span'], class_=lambda x: x and ('content' in x or 'article' in x))
            content = "\n".join([para.get_text().strip() for para in paragraphs if para.get_text().strip()])

            image_tag = article_soup.find('img')
            image_url = image_tag['src'] if image_tag else None

        else:
            print("기사를 찾을 수 없습니다.")
            content = None
            image_url = None

    finally:
        driver.quit()

    if content:
        return summarize_and_create_feed(content, image_url)
    else:
        print("요약할 내용이 없습니다.")
        return None

# 기사 요약 및 페르소나 피드 생성 함수
def summarize_and_create_feed(content, image_url):
    try:
        model_name = "gogamza/kobart-summarization"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

        inputs = tokenizer([content], max_length=1024, return_tensors="pt", truncation=True)
        summary_ids = model.generate(inputs["input_ids"], max_length=150, min_length=50, length_penalty=2.0, num_beams=4, early_stopping=True)
        summarized_text = tokenizer.decode(summary_ids[0], skip_special_tokens=True)

        if not summarized_text:
            print("요약된 내용이 없습니다.")
            return None

        openai.api_key = os.getenv("OPENAI_API_KEY")
        if not openai.api_key:
            print("OpenAI API 키가 설정되지 않았습니다.")
            return None

        persona = "기쁨이"  # 예시로 특정 페르소나 지정, 필요 시 동적으로 변경 가능
        persona_feed = f"{persona}: {summarized_text}"
        return {"caption": summarized_text, "image": image_url, "nick": persona}

    except Exception as e:
        print(f"피드 작성 중 오류 발생: {e}")
        return None
    
# 요청 본문으로 받을 데이터의 스키마 정의
class GenerateFeedRequest(BaseModel):
    persona_id: str

# FastAPI 엔드포인트 정의
@app.post("/generate_feed")
async def generate_feed(request: GenerateFeedRequest):
    try:
        persona_id = request.persona_id
        print(persona_id)
        # 페르소나 데이터 가져오기
        persona_ref = db.collection('personas').document(persona_id)
        persona_data = persona_ref.get().to_dict()

        if not persona_data:
            # 해당 ID에 대한 페르소나 데이터를 찾을 수 없을 때 404 오류 반환
            raise HTTPException(status_code=404, detail="페르소나 정보를 찾을 수 없습니다.")

        # 관심사와 관련된 기사 크롤링 및 피드 작성
        interests = persona_data.get('interests', [])
        for interest in interests:
            # 각 관심사에 대해 네이버 뉴스 검색 결과 URL 생성
            url = f"https://search.naver.com/search.naver?where=news&query={interest}"
            
            # 해당 URL로 기사 크롤링 및 요약 후 결과 반환
            result = crawl_article(url, interest)
            
            # 결과가 존재하면 JSON 응답으로 반환 (첫 번째로 매칭된 관심사에 대해 바로 반환)
            if result:
                return JSONResponse(content=result, status_code=200)

        # 관심사와 일치하는 기사를 찾지 못한 경우 404 오류 반환
        raise HTTPException(status_code=404, detail="관심사와 일치하는 기사를 찾을 수 없습니다.")

    except Exception as e:
        # 예외 발생 시 오류 메시지 출력 및 500 오류 반환
        print(f"피드 생성 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="피드 생성 중 오류가 발생했습니다.")


# 스케줄러 설정 및 시작
scheduler = BackgroundScheduler()
scheduler.add_job(fetch_trending_keywords, 'cron', hour='0,12')  # 매일 0시, 12시에 실행
scheduler.start()

# 스크립트 종료 시 스케줄러 정리
atexit.register(lambda: scheduler.shutdown())

# FastAPI 서버 실행
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
