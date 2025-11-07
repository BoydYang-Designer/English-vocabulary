import whisper
import os
import torch
from tkinter import Tk, messagebox
from tkinter.filedialog import askopenfilenames

def format_timestamp(seconds: float) -> str:
    """
    將秒數（浮點數）轉換為 H:MM:SS.mmm 格式的字串。
    """
    assert seconds >= 0, "non-negative timestamp expected"
    milliseconds = round(seconds * 1000.0)

    hours = milliseconds // 3_600_000
    milliseconds %= 3_600_000
    minutes = milliseconds // 60_000
    milliseconds %= 60_000
    seconds_int = milliseconds // 1_000
    milliseconds_rem = milliseconds % 1_000

    return f"{hours:02}:{minutes:02}:{seconds_int:02}.{milliseconds_rem:03}"

# --- 步驟 1: 選擇多個 MP3 檔 ---
root = Tk()
root.withdraw() # 隱藏主視窗

file_paths = askopenfilenames(
    title="Select one or more MP3 files", 
    filetypes=[("MP3 files", "*.mp3")]
)

if not file_paths:
    print("No files selected. Exiting...")
    exit()

print(f"已選擇 {len(file_paths)} 個檔案。")

# --- 步驟 2: 選擇儲存格式 ---
# 跳出詢問框
save_plain = messagebox.askyesno(
    "儲存選項", 
    "您是否要儲存「純文字」版本？\n(例如: MyAudio.txt)"
)

save_timestamp = messagebox.askyesno(
    "儲存選項", 
    "您是否要儲存「時間戳記」版本？\n(例如: MyAudio Timestamp.txt)"
)

if not save_plain and not save_timestamp:
    print("您沒有選擇任何儲存格式。程式即將結束...")
    exit()

# --- 步驟 3: 載入模型與裝置 ---
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# 定義 Whisper 使用的取樣率 (16kHz)
WHISPER_SAMPLE_RATE = 16000

print("正在載入 'base' 模型...")
model = whisper.load_model("base", device=device)
print("模型載入完成。")

# --- 步驟 4: 遍歷並處理所有檔案 ---
for i, file_path in enumerate(file_paths):
    print(f"\n--- 正在處理檔案 {i + 1} / {len(file_paths)} ---")
    print(f"檔案: {file_path}")

    try:
        # --- 新增: 檢查 1 (檔案是否已存在) ---
        base_path = os.path.splitext(file_path)[0]
        files_to_check = []
        
        if save_plain:
            files_to_check.append(base_path + ".txt")
        if save_timestamp:
            files_to_check.append(base_path + " Timestamp.txt")
        
        # 檢查所有 *被要求的* 檔案是否都已存在
        all_exist = False
        if files_to_check: # 只有在使用者有要求儲存格式時才檢查
            all_exist = True # 假設都存在
            for f in files_to_check:
                if not os.path.exists(f):
                    all_exist = False # 發現有缺, 設為 False
                    break # 不用再檢查了

        if all_exist:
            print(f"  [跳過] 偵測到所有要求的輸出檔案均已存在。")
            continue # 處理下一個檔案

        # --- 新增: 檢查 2 (檔案長度) ---
        # 我們需要先載入音訊來檢查長度
        audio = whisper.load_audio(file_path)
        # 音訊陣列的長度 / 取樣率 = 秒數
        duration = audio.shape[0] / WHISPER_SAMPLE_RATE 
        
        if duration < 10:
            print(f"  [跳過] 檔案長度 ({duration:.2f} 秒) 小於 10 秒。")
            continue # 處理下一個檔案
        
        print(f"檔案長度: {duration:.2f} 秒。開始轉錄...")

        # --- 轉錄 (修改) ---
        # 使用已經載入的 'audio' 物件，避免重複載入
        result = model.transcribe(audio, language="en", verbose=False)
        print("轉錄完成。")
        
        # (base_path 已在上面定義過)

        # 根據選擇儲存檔案
        if save_plain:
            txt_path = base_path + ".txt"
            try:
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(result["text"])
                print(f"  [成功] 已儲存純文字檔: {txt_path}")
            except Exception as e:
                print(f"  [失敗] 儲存純文字檔失敗: {e}")

        if save_timestamp:
            timestamp_txt_path = base_path + " Timestamp.txt"
            try:
                with open(timestamp_txt_path, "w", encoding="utf-8") as ts_file:
                    for segment in result["segments"]:
                        start_time = format_timestamp(segment['start'])
                        end_time = format_timestamp(segment['end'])
                        text = segment['text'].strip()
                        ts_file.write(f"[{start_time} --> {end_time}] {text}\n")
                print(f"  [成功] 已儲存時間戳記檔: {timestamp_txt_path}")
            except Exception as e:
                print(f"  [失敗] 儲存時間戳記檔失敗: {e}")

    except Exception as e:
        print(f"[錯誤] 處理檔案 {file_path} 時發生錯誤: {e}")
        # 發生錯誤時繼續處理下一個檔案
        continue 

print("\n--- 所有檔案處理完畢 ---")