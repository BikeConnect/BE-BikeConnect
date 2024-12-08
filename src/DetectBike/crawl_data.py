import logging
import os

from icrawler.builtin import GoogleImageCrawler, BingImageCrawler

root = "./data"
bikes = os.listdir(root)
dates = [((2018, 1, 1), (2019, 6, 30)),
         ((2019, 6, 30), (2020, 6, 30)),
         ((2020, 6, 30), (2021, 12, 31)),
         ((2022, 1, 1), (2024, 5, 5))]
bing_dates = ['pastday', 'pastweek', 'pastmonth', 'pastyear']

for i, bike in enumerate(bikes):
    if i == 2:
        google_crawler = GoogleImageCrawler(
            log_level=logging.CRITICAL,
            feeder_threads=1,
            parser_threads=1,
            downloader_threads=4,
            storage={'root_dir': 'data/' + bike})
        file_idx_offset = 0
        for date in dates:
            print(date)
            filters = dict(
                date=date)
            google_crawler.crawl(keyword=bike, filters=filters, max_num=200, file_idx_offset='auto')
            print("Current Bike: ", bike)
