import yt_dlp
import tkinter as tk
from tkinter import filedialog
import os

def select_cookies_file():
    """打開檔案選擇視窗，讓使用者選擇 cookies.txt 檔案。"""
    # 隱藏主視窗
    root = tk.Tk()
    root.withdraw() 
    
    # 彈出檔案選擇對話框
    file_path = filedialog.askopenfilename(
        title="請選擇您的 YouTube Cookies (.txt) 檔案",
        filetypes=(("文字檔案", "*.txt"), ("所有檔案", "*.*"))
    )
    
    return file_path

def download_video_with_auth():
    """執行下載邏輯"""
    
    # 1. 提示使用者輸入網址
    video_url = input("請輸入您想下載影片的 YouTube 網址 (最高畫質): ")
    
    if not video_url:
        print("您沒有輸入網址。程式結束。")
        return

    # 2. 彈出視窗選擇 Cookies 檔案
    print("即將彈出視窗，請選擇您的 Cookies 檔案...")
    cookies_file = select_cookies_file()

    if not cookies_file:
        print("您取消了選擇 Cookies 檔案，無法處理年齡限制影片。程式結束。")
        return

    print(f"已選擇 Cookies 檔案: {cookies_file}")
    
    try:
        # yt-dlp 的設定選項
        ydl_opts = {
            # 傳入選定的 cookies 檔案路徑
            'cookiefile': cookies_file, 
            
            # 下載最高畫質的影片和音訊並合併成 mp4
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', 
            'merge_output_format': 'mp4',
            # 顯示下載進度
            'progress_hooks': [lambda d: print(f"下載進度: {d['_percent_str']} - {d['_speed_str']}") if d['status'] == 'downloading' else None]
        }

        print(f"\n正在使用 yt-dlp 處理網址: {video_url}")

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # 執行下載
            ydl.download([video_url])
        
        print("\n影片下載完成！")

    except Exception as e:
        # 為了更清楚地顯示 yt-dlp 產生的錯誤 (例如年齡限制錯誤)
        print(f'\n下載時發生錯誤: {e}')

# 執行主要功能
if __name__ == "__main__":
    download_video_with_auth()