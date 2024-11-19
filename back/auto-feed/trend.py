from pytrends.request import TrendReq

# pytrends 초기화 및 트렌드 검색
pytrends = TrendReq(hl='ko', tz=540)
kw_list = [""]
pytrends.build_payload(kw_list, geo='KR', timeframe='now 1-d')
trending_searches_df = pytrends.trending_searches(pn='south_korea')
top_keywords = trending_searches_df[0].tolist()

# 트렌드 목록 출력
print("오늘의 대한민국 트렌드 키워드:")
for i, keyword in enumerate(top_keywords, 1):
    print(f"{i}. {keyword}") #i index고 keyword는 검색 결과 키워드