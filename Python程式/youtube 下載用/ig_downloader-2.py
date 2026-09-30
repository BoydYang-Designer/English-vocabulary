#!/usr/bin/env python3
"""
Instagram 影片下載工具
使用方式:
    直接執行程式，依提示輸入網址即可:
        python ig_downloader.py

    也仍支援用參數直接帶網址:
        python ig_downloader.py "https://www.instagram.com/reel/xxxxxxx/"

需求套件:
    pip install yt-dlp

注意事項:
    - 只能下載公開貼文，私人帳號需要登入 cookies 才能下載（見下方說明）。
    - 請尊重版權，僅下載供個人使用或已取得授權的內容。
"""

import sys
import os
import argparse

try:
    import yt_dlp
except ImportError:
    print("尚未安裝 yt-dlp，請先執行: pip install yt-dlp")
    sys.exit(1)


def download_ig_video(url: str, output_dir: str = "downloads", cookies_file: str = None):
    os.makedirs(output_dir, exist_ok=True)

    ydl_opts = {
        "outtmpl": os.path.join(output_dir, "%(title).80s_%(id)s.%(ext)s"),
        "format": "mp4/bestvideo+bestaudio/best",
        "merge_output_format": "mp4",
        "quiet": False,
        "no_warnings": False,
        # 輪播貼文(carousel)裡可能混有圖片，圖片項目沒有影片格式會出錯，
        # 設定 ignoreerrors 讓程式跳過該項目、繼續下載其餘的影片。
        "ignoreerrors": True,
    }

    # 若貼文是私人帳號或需要登入，可指定瀏覽器匯出的 cookies 檔案
    if cookies_file:
        ydl_opts["cookiefile"] = cookies_file

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            ydl.download([url])
            print(f"✅ 下載完成，檔案存放於: {os.path.abspath(output_dir)}")
        except Exception as e:
            print(f"❌ 下載失敗: {e}")


def main():
    parser = argparse.ArgumentParser(description="下載 Instagram 影片 / Reels")
    parser.add_argument("url", nargs="?", default=None, help="Instagram 貼文或 Reel 的網址（不填則會提示輸入）")
    parser.add_argument("-o", "--output", default="downloads", help="輸出資料夾（預設: downloads）")
    parser.add_argument("-c", "--cookies", default=None, help="cookies.txt 檔案路徑（下載私人貼文時需要）")
    args = parser.parse_args()

    url = args.url
    if not url:
        url = input("請輸入 Instagram 影片網址: ").strip()

    if not url:
        print("未輸入網址，程式結束。")
        sys.exit(1)

    download_ig_video(url, args.output, args.cookies)

    # 下載完成後詢問是否繼續下載下一個
    while True:
        again = input("\n是否要繼續下載下一個影片？(直接按 Enter 繼續 / 輸入 q 離開): ").strip()
        if again.lower() == "q":
            break
        next_url = input("請輸入 Instagram 影片網址: ").strip()
        if not next_url:
            continue
        download_ig_video(next_url, args.output, args.cookies)


if __name__ == "__main__":
    main()
