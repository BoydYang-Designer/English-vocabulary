import tkinter as tk
from tkinter import filedialog, messagebox
import subprocess
import os

def convert_videos_to_mp3():
    # 1. 建立隱藏的 Tkinter 主視窗
    root = tk.Tk()
    root.withdraw()

    # 2. 彈出檔案選擇對話框，允許複選影片檔案
    file_paths = filedialog.askopenfilenames(
        title="請選擇要轉換的影片檔案 (可複選)",
        filetypes=[("Video files", "*.mp4 *.mov *.mkv *.avi *.flv *.wmv"), ("All files", "*.*")]
    )

    if not file_paths:
        print("未選擇任何檔案，程式結束。")
        return

    success_count = 0
    error_count = 0

    # 3. 遍歷選中的檔案進行轉換
    for video_path in file_paths:
        try:
            # 取得檔案目錄與檔名（不含副檔名）
            file_dir = os.path.dirname(video_path)
            file_name = os.path.splitext(os.path.basename(video_path))[0]
            output_path = os.path.join(file_dir, f"{file_name}.mp3")

            print(f"正在轉換: {video_path}...")

            # 使用 ffmpeg 進行轉換
            command = [
                'ffmpeg',
                '-i', video_path,
                '-vn',  # 不處理視訊
                '-acodec', 'libmp3lame',  # 使用 MP3 編碼
                '-q:a', '2',  # 音質設定 (0-9，數字越小品質越好)
                '-y',  # 覆蓋已存在的檔案
                output_path
            ]
            
            # 執行轉換（隱藏命令列視窗）
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            
            if result.returncode == 0:
                print(f"✅ 轉換成功: {output_path}")
                success_count += 1
            else:
                print(f"❌ 轉換失敗: {video_path}")
                print(f"錯誤訊息: {result.stderr}")
                error_count += 1
            
        except FileNotFoundError:
            print("❌ 錯誤：找不到 ffmpeg！")
            print("請先安裝 ffmpeg: https://ffmpeg.org/download.html")
            messagebox.showerror("錯誤", "找不到 ffmpeg！\n請先安裝 ffmpeg 才能使用此功能。")
            return
        except Exception as e:
            print(f"轉換 {video_path} 時發生錯誤: {str(e)}")
            error_count += 1

    # 4. 完成後彈出提示
    messagebox.showinfo("完成", f"轉換作業結束！\n成功：{success_count}\n失敗：{error_count}")
    print(f"\n✅ 任務完成！成功轉換 {success_count} 個檔案。")

if __name__ == "__main__":
    convert_videos_to_mp3()