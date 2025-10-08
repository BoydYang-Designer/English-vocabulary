import whisper
import os
import json  # 匯入 json 模組
from tkinter import Tk
from tkinter.filedialog import askopenfilename, asksaveasfilename # 匯入儲存檔案的對話框功能

# --- 主程式開始 ---

# 步驟 1: 隱藏主 Tkinter 視窗
Tk().withdraw() 

# 步驟 2: 跳出視窗，讓使用者選擇要處理的 MP3 檔案
mp3_path = askopenfilename(
    title="Select an MP3 file to transcribe", 
    filetypes=[("MP3 files", "*.mp3")]
)

# 如果使用者沒有選擇檔案就關閉視窗，則結束程式
if not mp3_path:
    print("No MP3 file selected. Exiting...")
    exit()

# 步驟 3: 跳出第二個視窗，讓使用者選擇 JSON 檔案的儲存位置
# - 我們先準備好建議的檔名
base_name = os.path.splitext(os.path.basename(mp3_path))[0]
suggested_filename = f"{base_name}.json"

# - 顯示儲存對話框
json_path = asksaveasfilename(
    title="Save timestamp JSON file as...",
    initialfile=suggested_filename, # 提供建議檔名
    defaultextension=".json",
    filetypes=[("JSON files", "*.json")]
)

# 如果使用者沒有選擇儲存位置就關閉視窗，則結束程式
if not json_path:
    print("No save location selected. Exiting...")
    exit()

# --- 如果檔案都選擇完畢，才開始執行耗時的轉錄 ---

# 選擇運行裝置
import torch
device = "cuda" if torch.cuda.is_available() else "cpu"
print("-" * 30)
print(f"Using device: {device}")
print(f"Input MP3: {mp3_path}")

# 載入模型 (small 或 medium 模型在單詞時間戳記上更準確)
print("Loading Whisper model (small)...")
model = whisper.load_model("small", device=device)

# 執行轉錄 (word_timestamps=True 是獲取單詞時間戳記的關鍵)
print("Starting transcription... This may take a while.")
result = model.transcribe(mp3_path, language="en", verbose=False, word_timestamps=True) 

# 步驟 4: 將包含完整時間戳記的結果寫入使用者指定的 JSON 檔案
try:
    with open(json_path, "w", encoding="utf-8") as f:
        # json.dump() 可以將 Python 字典轉換並寫入 json 檔案
        # ensure_ascii=False 確保特殊字元能正確寫入
        # indent=2 讓 JSON 檔案有縮排，方便閱讀
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("-" * 30)
    print("✅ Transcription completed successfully!")
    print(f"Timestamp JSON file saved to: {json_path}")

except Exception as e:
    print("-" * 30)
    print(f"❌ An error occurred while saving the file: {e}")