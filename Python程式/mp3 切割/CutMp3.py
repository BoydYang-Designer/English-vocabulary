import os
import tkinter as tk
from tkinter import filedialog, simpledialog, messagebox
from pydub import AudioSegment
from pydub.silence import detect_silence

def split_mp3():
    # 1. 初始化 Tkinter 並隱藏主視窗
    root = tk.Tk()
    root.withdraw()

    # 2. 選擇 MP3 檔案
    file_path = filedialog.askopenfilename(
        title="請選擇要切割的 MP3 檔案",
        filetypes=[("MP3 files", "*.mp3")]
    )
    
    if not file_path:
        return

    print(f"正在載入檔案: {file_path} ...")
    # 載入音訊
    audio = AudioSegment.from_file(file_path)
    
    # 3. 顯示總時數 (毫秒轉分鐘)
    total_ms = len(audio)
    total_mins = total_ms / 1000 / 60
    
    # 4. 詢問要切成幾份
    num_segments = simpledialog.askinteger(
        "切割設定", 
        f"該檔案總長度為: {total_mins:.2f} 分鐘\n請輸入要切成幾份:",
        minvalue=2, maxvalue=100
    )
    
    if not num_segments:
        return

    # 計算理想的平均切割長度 (ms)
    target_length = total_ms / num_segments
    
    print(f"偵測靜音點中，請稍候...")
    # 5. 偵測靜音 (threshold 可以根據需求調整，-40dBFS 為常見標準，持續 500ms 以上視為靜音)
    # 這會回傳所有靜音區段的 [開始時間, 結束時間]
    silences = detect_silence(audio, min_silence_len=500, silence_thresh=-40)
    
    # 尋找切割點
    split_points = [0] # 起點
    
    for i in range(1, num_segments):
        ideal_split_time = i * target_length
        
        # 在理想切割點附近尋找最合適的靜音區間
        # 我們找離 ideal_split_time 最近的一個靜音區間的中間點
        best_split = ideal_split_time
        if silences:
            # 找出與 ideal_split_time 距離最近的靜音段
            closest_silence = min(silences, key=lambda x: abs((x[0] + x[1])/2 - ideal_split_time))
            # 取靜音段的中間點作為切割點
            best_split = (closest_silence[0] + closest_silence[1]) / 2
            
        split_points.append(best_split)
    
    split_points.append(total_ms) # 終點

    # 6. 開始切割並匯出
    base_name = os.path.splitext(file_path)[0]
    print("開始導出檔案...")
    
    for i in range(num_segments):
        start_time = split_points[i]
        end_time = split_points[i+1]
        
        chunk = audio[start_time:end_time]
        output_filename = f"{base_name}-{i+1}.mp3"
        
        chunk.export(output_filename, format="mp3")
        print(f"已完成: {output_filename}")

    messagebox.showinfo("完成", f"檔案已成功切割為 {num_segments} 份！")

if __name__ == "__main__":
    try:
        split_mp3()
    except Exception as e:
        messagebox.showerror("錯誤", f"發生錯誤: {e}")