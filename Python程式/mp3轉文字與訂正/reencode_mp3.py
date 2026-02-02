#!/usr/bin/env python3
"""
MP3 重新編碼工具 (GUI 多選 + 直接覆蓋原檔版)
功能：
1. 將 MP3 轉為 CBR/Mono/44.1kHz 以優化手機定位
2. 支援批次多選
3. 直接覆蓋原始檔案 (使用暫存檔機制確保安全)
"""

import subprocess
import sys
import os
import shutil
import tkinter as tk
from tkinter import filedialog
import re

def check_ffmpeg():
    """檢查系統是否有 ffmpeg"""
    try:
        subprocess.run(['ffmpeg', '-version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except FileNotFoundError:
        return False

def reencode_mp3_overwrite(input_file, bitrate='128k'):
    """
    重新編碼並覆蓋原始檔案
    策略：輸出到暫存檔 -> 成功後覆蓋原檔
    """
    # 建立暫存檔名
    temp_output = input_file + ".temp.mp3"
    
    print(f"🔄 正在轉檔: {os.path.basename(input_file)}...")
    
    cmd = [
        'ffmpeg',
        '-i', input_file,
        '-codec:a', 'libmp3lame',
        '-b:a', bitrate,           # 恆定位元率
        '-ar', '44100',            # 採樣率 44.1kHz
        '-ac', '1',                # 單聲道
        '-write_xing', '0',        # 移除 Xing header
        '-id3v2_version', '3',     # ID3v2.3
        '-y',                      # 允許覆蓋(雖然是覆蓋暫存檔)
        '-loglevel', 'error',      # 減少輸出訊息
        temp_output
    ]
    
    try:
        # 執行轉檔
        subprocess.run(cmd, check=True)
        
        # 轉檔成功，進行覆蓋操作
        # Windows/Linux 跨平台安全覆蓋: replace 會自動處理刪除舊檔
        os.replace(temp_output, input_file)
        
        print(f"✅ 成功覆蓋原始檔案: {os.path.basename(input_file)}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ 轉檔失敗: {e}")
        # 如果失敗，嘗試清理暫存檔
        if os.path.exists(temp_output):
            os.remove(temp_output)
        return False
    except OSError as e:
        print(f"❌ 檔案取代失敗 (可能檔案被佔用): {e}")
        if os.path.exists(temp_output):
            os.remove(temp_output)
        return False

def adjust_timestamp_overwrite(timestamp_file, time_offset):
    """
    調整 Timestamp 並覆蓋原始檔案
    """
    print(f"📝 更新 Timestamp: {os.path.basename(timestamp_file)} (偏移 {time_offset}秒)")
    
    temp_ts_file = timestamp_file + ".temp.txt"
    
    try:
        with open(timestamp_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        adjusted_lines = []
        for line in lines:
            if '-->' in line:
                match = re.match(r'\[(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\](.*)', line)
                if match:
                    start_str, end_str, text = match.groups()
                    
                    def time_to_sec(t_str):
                        h, m, s = t_str.split(':')
                        s, ms = s.split('.')
                        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000
                    
                    def sec_to_time(sec):
                        h = int(sec // 3600)
                        m = int((sec % 3600) // 60)
                        s = sec % 60
                        return f"{h:02d}:{m:02d}:{s:06.3f}"
                    
                    start_sec = max(0, time_to_sec(start_str) + time_offset)
                    end_sec = max(0, time_to_sec(end_str) + time_offset)
                    
                    adjusted_lines.append(f"[{sec_to_time(start_sec)} --> {sec_to_time(end_sec)}]{text}\n")
                else:
                    adjusted_lines.append(line)
            else:
                adjusted_lines.append(line)
        
        # 寫入暫存檔
        with open(temp_ts_file, 'w', encoding='utf-8') as f:
            f.writelines(adjusted_lines)
            
        # 覆蓋原檔
        os.replace(temp_ts_file, timestamp_file)
        print("✅ Timestamp 已更新並覆蓋")
        
    except Exception as e:
        print(f"❌ Timestamp 處理失敗: {e}")
        if os.path.exists(temp_ts_file):
            os.remove(temp_ts_file)

def main():
    print("=" * 60)
    print("MP3 批次優化工具 (直接覆蓋原檔模式)")
    print("⚠️  警告: 此操作會直接修改您選擇的原始檔案！")
    print("=" * 60)

    if not check_ffmpeg():
        print("❌ 錯誤: 未偵測到 ffmpeg！")
        input("按 Enter 鍵退出...")
        sys.exit(1)

    # 隱藏主視窗
    root = tk.Tk()
    root.withdraw()

    print("📂 請選擇 MP3 檔案 (可多選)...")
    file_paths = filedialog.askopenfilenames(
        title="選擇要優化(並覆蓋)的 MP3 檔案",
        filetypes=[("MP3 Audio", "*.mp3")]
    )

    if not file_paths:
        print("⚠️ 未選擇任何檔案。")
        return

    print(f"共選擇了 {len(file_paths)} 個檔案。")
    print("-" * 60)

    # Timestamp 設定詢問
    ask_offset = False
    global_offset = 0.0
    
    # 檢查是否有 Timestamp
    has_any_timestamp = any(os.path.exists(f.replace('.mp3', '_Timestamp.txt')) for f in file_paths)
    
    if has_any_timestamp:
        ans = input("❓ 是否需要對 Timestamp 進行時間偏移調整? (y/N): ").strip().lower()
        if ans == 'y':
            ask_offset = True
            try:
                global_offset = float(input("   請輸入偏移秒數 (正數延後/負數提前): "))
            except ValueError:
                print("   輸入無效，將不進行偏移。")
                ask_offset = False

    print("-" * 60)

    success_count = 0
    
    for input_file in file_paths:
        try:
            # 1. 轉檔並覆蓋 MP3
            if reencode_mp3_overwrite(input_file, '128k'):
                success_count += 1
            
            # 2. 處理 Timestamp (僅在需要偏移時才修改並覆蓋)
            timestamp_file = input_file.replace('.mp3', '_Timestamp.txt')
            
            if os.path.exists(timestamp_file):
                if ask_offset and global_offset != 0:
                    adjust_timestamp_overwrite(timestamp_file, global_offset)
                else:
                    print(f"   (Timestamp 保持原樣)")
            
            print("-" * 60)
            
        except Exception as e:
            print(f"❌ 處理 {os.path.basename(input_file)} 時發生未預期錯誤: {e}")
            print("-" * 60)

    print(f"🎉 處理完成！成功覆蓋: {success_count}/{len(file_paths)}")
    input("按 Enter 鍵退出...")

if __name__ == '__main__':
    main()