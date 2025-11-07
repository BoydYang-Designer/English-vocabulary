import yt_dlp

# 1. 提示使用者輸入網址
video_url = input("請輸入您想下載影片的 YouTube 網址 (最高畫質): ")

if video_url:
    try:
        # ydl_opts 是 yt-dlp 的設定選項
        ydl_opts = {
            # 選擇最佳的影片和音訊格式，並將它們合併 (預設行為)
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', 
            # 確保下載後的檔案是 mp4 格式，yt-dlp 會自動處理合併
            'merge_output_format': 'mp4',
            # 顯示下載進度
            'progress_hooks': [lambda d: print(f"下載進度: {d['_percent_str']} - {d['_speed_str']}") if d['status'] == 'downloading' else None]
        }

        print(f"正在使用 yt-dlp 處理網址: {video_url}")

        # 建立 yt_dlp 物件並傳入設定
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # 執行下載
            # ydl-dlp 會先分別下載影片和音訊，然後將其合併成一個 mp4 檔案
            ydl.download([video_url])
        
        print("影片下載完成！")

    except Exception as e:
        print(f'下載時發生錯誤: {e}')
else:
    print("您沒有輸入網址。")