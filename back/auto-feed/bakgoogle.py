from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import openai
import os
import time
from langchain_community.document_loaders import WebBaseLoader
from langchain.chains.summarize import load_summarize_chain
from langchain_community.llms import OpenAI
from langchain.docstore.document import Document
import random

# 검색 대상 키워드 설정
keyword = "최동석"

# 크롤링할 대상 URL 설정 (키워드 포함)
url = f"https://news.google.com/search?q={keyword}&hl=ko&gl=KR&ceid=KR:ko"

# Chrome 옵션 설정
chrome_options = Options()
chrome_options.add_argument("--headless")  # 브라우저 창을 띄우지 않기 위한 옵션
chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
chrome_options.add_argument("--disable-blink-features=AutomationControlled")
chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
chrome_options.add_experimental_option('useAutomationExtension', False)

# Chrome WebDriver 설정
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

# URL 크롤링 및 추출
try:
    driver.get(url)
    WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "article")))

    # 랜덤한 지연 시간 추가
    time.sleep(random.uniform(3, 7))

    page_source = driver.execute_script("return document.body.innerHTML;")
    soup = BeautifulSoup(page_source, 'html.parser')

    articles = soup.find_all('article', class_='IFHyqb')
    urls = []
    if articles:
        for article in articles[:3]:  # 최대 3개의 기사만 추출
            link_element = article.find('a', class_='WwrzSb')
            if link_element:
                link = "https://news.google.com" + link_element['href'][1:]
                urls.append(link)
                print(f"기사 링크: {link}")
                
                # 각 URL 사이에 랜덤한 지연 시간 추가
                time.sleep(random.uniform(5, 10))  # 5~10초 사이의 랜덤한 시간 동안 대기
    else:
        print("기사를 찾을 수 없습니다.")
finally:
    driver.quit()

# OpenAI API 키 설정
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    openai.api_key = input("OpenAI API 키를 입력하세요: ")

# URL로부터 콘텐츠를 요약
if urls:
    try:
        # WebBaseLoader 사용하여 URL의 내용을 로드
        loaders = [WebBaseLoader(url) for url in urls]
        documents = []
        for loader in loaders:
            documents.extend(loader.load())

        # OpenAI LLM 설정 및 요약 실행
        llm = OpenAI(temperature=0.5)
        chain = load_summarize_chain(llm, chain_type="map_reduce")

        # 요약 요청을 한국어로 전달
        summary_prompt = "다음 기사의 내용을 종합하여 한국어로 요약해 주세요. 반드시 한국어로 답변해 주세요:\n\n"
        for doc in documents:
            summary_prompt += doc.page_content + "\n\n"

        # 요약 실행
        summary = chain.run([Document(page_content=summary_prompt)])
        
        # 요약 결과 출력
        print("요약된 뉴스 (한국어):")
        print(summary)
    
    except Exception as e:
        print(f"요약 생성 중 오류 발생: {e}")
else:
    print("요약할 URL이 없습니다.")
