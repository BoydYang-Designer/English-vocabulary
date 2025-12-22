import os
import tkinter as tk
from tkinter import filedialog, simpledialog, messagebox
from pydub import AudioSegment
from pydub.silence import split_on_silence, detect_silence

def select_mp3_files():
    """打開視窗選擇多個檔案"""
    root = tk.Tk()
    root.withdraw()
    return filedialog.askopenfilenames(
        title="請選擇一或多個 MP3 檔案",
        filetypes=[("MP3 檔案", "*.mp3"), ("所有檔案", "*.*")]
    )

def get_max_silence_duration(file_paths, threshold=-40):
    """預掃描：找出所有檔案中最長的一處空白是幾秒"""
    max_sec = 0
    print("正在掃描檔案中最長的空白處...")
    for path in file_paths:
        try:
            audio = AudioSegment.from_mp3(path)
            # 使用 500ms 作為基礎偵測單位
            silent_ranges = detect_silence(audio, min_silence_len=500, silence_thresh=threshold)
            for start, end in silent_ranges:
                sec = (end - start) / 1000.0
                if sec > max_sec:
                    max_sec = sec
        except Exception as e:
            print(f"掃描 {os.path.basename(path)} 失敗: {e}")
    return max_sec

def get_float_input(title, prompt, default_val):
    """
    自定義輸入函式：強制讀取字串並轉為浮點數，解決小數點輸入問題
    """
    while True:
        result = simpledialog.askstring(title, prompt, initialvalue=str(default_val))
        if result is None: return None # 使用者按取消
        try:
            # 將輸入內容轉換為數字（支援點與逗號，增加相容性）
            return float(result.replace(',', '.'))
        except ValueError:
            messagebox.showerror("錯誤", "請輸入有效的數字（例如：1.8 或 0.5）")

def trim_silence_process(input_path, output_path, threshold, min_len_ms, target_len_ms):
    """執行修剪：將大於 min_len_ms 的空白替換為 target_len_ms"""
    audio = AudioSegment.from_mp3(input_path)
    chunks = split_on_silence(
        audio,
        min_silence_len=min_len_ms,
        silence_thresh=threshold,
        keep_silence=200 # 保留前後各 0.2 秒緩衝，避免斷音感
    )

    if not chunks:
        return False

    pause = AudioSegment.silent(duration=target_len_ms)
    processed_audio = AudioSegment.empty()
    for i, chunk in enumerate(chunks):
        processed_audio += chunk
        if i < len(chunks) - 1:
            processed_audio += pause

    processed_audio.export(output_path, format="mp3")
    return True

if __name__ == "__main__":
    files = select_mp3_files()
    if not files:
        print("未選擇檔案。")
    else:
        SILENCE_THRESHOLD = -40
        max_gap = get_max_silence_duration(files, SILENCE_THRESHOLD)

        # 1. 詢問處理門檻 (改用自定義字串轉數字)
        limit_sec = get_float_input(
            "步驟 1/2：設定處理門檻", 
            f"目前檔案中最長的空白約為：{max_gap:.1f} 秒\n\n"
            "想要處理「大於幾秒」的空白處？\n(例如：1.8)", 
            2.0
        )

        if limit_sec is not None:
            # 2. 詢問目標長度
            target_sec = get_float_input(
                "步驟 2/2：設定縮減結果", 
                f"已選取：處理大於 {limit_sec} 秒的空白\n\n"
                "要將這些空白縮短為幾秒？\n(例如：0.5)", 
                0.5
            )

            if target_sec is not None:
                print(f"\n開始處理：大於 {limit_sec}s -> 縮短為 {target_sec}s")
                
                for index, path in enumerate(files, start=1):
                    base, ext = os.path.splitext(path)
                    old_p, temp_p = f"{base}_old{ext}", f"{base}_temp{ext}"
                    
                    print(f"[{index}/{len(files)}] 處理中: {os.path.basename(path)}")
                    
                    success = trim_silence_process(
                        path, temp_p, SILENCE_THRESHOLD, 
                        int(limit_sec * 1000), int(target_sec * 1000)
                    )
                    
                    if success:
                        if os.path.exists(old_p): os.remove(old_p)
                        os.rename(path, old_p)
                        os.rename(temp_p, path)
                        print("  v 完成")
                    else:
                        if os.path.exists(temp_p): os.remove(temp_p)
                        print("  x 無符合條件的空白，略過")

                messagebox.showinfo("完成", f"處理完畢！\n已將大於 {limit_sec} 秒的空白統一改為 {target_sec} 秒。")

    input("\n請按 Enter 結束程式...")