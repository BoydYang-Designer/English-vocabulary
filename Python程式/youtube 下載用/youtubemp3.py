import yt_dlp

# 1. 提示使用者輸入網址
video_url = input("請輸入您想下載音訊的 YouTube 網址: ")

if video_url:
    try:
        # ydl_opts 是 yt-dlp 的設定選項
        ydl_opts = {
            'format': 'bestaudio/best', # 選擇最佳音訊
            # 'outtmpl': '%(title)s.%(ext)s', # 設定輸出檔名 (可選)
        }

        print(f"正在使用 yt-dlp 處理網址: {video_url}")

        # 建立 yt_dlp 物件並傳入設定
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # 執行下載
            ydl.download([video_url])
        
        print("音訊下載完成！")

    except Exception as e:
        print(f'下載時發生錯誤: {e}')
else:
    print("您沒有輸入網址。")