import os
import tkinter as tk
from tkinter import filedialog
# --- 修正這裡：將 'pub' 改為 'pydub' ---
from pydub import AudioSegment
from pydub.silence import split_on_silence

def select_mp3_file():
    """
    打開一個檔案選擇視窗，讓使用者選擇 MP3 檔案。
    """
    root = tk.Tk()
    root.withdraw()
    
    file_path = filedialog.askopenfilename(
        title="請選擇一個 MP3 檔案",
        filetypes=[("MP3 檔案", "*.mp3"), ("所有檔案", "*.*")]
    )
    return file_path

def trim_silence_from_mp3(
    input_path: str,
    output_path: str,
    silence_threshold_db: int = -40,
    min_silence_duration_ms: int = 1000,
    final_pause_ms: int = 800,
    keep_silence_at_ends: int = 200
):
    """
    從 MP3 檔案中修剪掉過長的靜音片段。(此函式功能不變)
    """
    if not os.path.exists(input_path):
        print(f"錯誤：找不到輸入檔案 {input_path}")
        return False # 返回 False 表示失敗

    print(f"正在載入檔案：{input_path}...")
    audio = AudioSegment.from_mp3(input_path)

    print("正在偵測靜音片段...")
    chunks = split_on_silence(
        audio,
        min_silence_len=min_silence_duration_ms,
        silence_thresh=silence_threshold_db,
        keep_silence=keep_silence_at_ends
    )

    if not chunks:
        print("未偵測到任何可分割的非靜音片段。檔案可能完全是靜音或沒有足夠長的靜音段落。")
        return False # 返回 False

    print(f"偵測到 {len(chunks)} 個非靜音片段，正在重組...")
    pause_between_chunks = AudioSegment.silent(duration=final_pause_ms)
    processed_audio = AudioSegment.empty()
    for i, chunk in enumerate(chunks):
        processed_audio += chunk
        if i < len(chunks) - 1:
            processed_audio += pause_between_chunks

    print(f"正在匯出暫存檔案至：{output_path}...")
    processed_audio.export(output_path, format="mp3")
    print("處理完成！")
    return True # 返回 True 表示成功


# --- 主程式執行區 ---
if __name__ == "__main__":
    # 1. 彈出視窗讓使用者選擇檔案
    input_file = select_mp3_file()

    # 2. 檢查使用者是否選擇了檔案
    if not input_file:
        print("未選擇任何檔案，程式結束。")
    else:
        # 3. 產生各種需要的路徑與檔名
        base, ext = os.path.splitext(input_file)
        old_file_path = f"{base}_old{ext}"
        temp_output_path = f"{base}_temp{ext}"
        
        # 4. (可選) 調整參數
        SILENCE_THRESHOLD = -40
        MIN_SILENCE_LEN = 1000
        FINAL_PAUSE = 500

        # 5. 執行處理函式，並將結果存到暫存檔
        success = trim_silence_from_mp3(
            input_path=input_file,
            output_path=temp_output_path, # 先輸出到暫存檔
            silence_threshold_db=SILENCE_THRESHOLD,
            min_silence_duration_ms=MIN_SILENCE_LEN,
            final_pause_ms=FINAL_PAUSE
        )
        
        # 6. 如果處理成功，才開始重新命名檔案
        if success:
            try:
                print("\n處理成功，正在重新命名檔案...")
                
                # 步驟 A: 將原始檔案更名為備份檔 (加上 _old)
                print(f"  -> 備份原始檔案為: {os.path.basename(old_file_path)}")
                os.rename(input_file, old_file_path)
                
                # 步驟 B: 將暫存檔更名為原始檔名
                print(f"  -> 將新檔案命名為: {os.path.basename(input_file)}")
                os.rename(temp_output_path, input_file)
                
                print("\n檔案更名完成！")
                print(f"新的檔案已儲存為: {os.path.abspath(input_file)}")
                print(f"原始檔案已備份為: {os.path.abspath(old_file_path)}")

            except OSError as e:
                print(f"\n錯誤：重新命名檔案時發生錯誤: {e}")
                print("請檢查檔案是否被其他程式使用中。")
                print(f"您的原始檔案可能已更名為 {os.path.basename(old_file_path)}")
                print(f"處理後的新檔案仍保留為 {os.path.basename(temp_output_path)}")
        else:
            # 如果處理失敗，刪除可能產生的暫存檔
            if os.path.exists(temp_output_path):
                os.remove(temp_output_path)
            print("\n處理失敗，未對您的檔案做任何變更。")

    # 讓使用者看到 console 的結果，避免視窗直接關閉
    input("\n請按 Enter 鍵結束程式...")