import os
import json
from datetime import datetime
import tkinter as tk
from tkinter import filedialog

def rename_mp3_files():
    # 創建隱藏的 Tkinter 窗口並選擇資料夾
    root = tk.Tk()
    root.withdraw()  # 隱藏主窗口
    
    # 讓用戶選擇資料夾
    folder_path = filedialog.askdirectory(
        title="請選擇包含 MP3 檔案的資料夾"
    )
    
    if not folder_path:
        print("未選擇資料夾，程式結束。")
        return
    
    # 儲存更新紀錄
    update_log = []
    
    try:
        # 遍歷資料夾內的所有檔案
        for filename in os.listdir(folder_path):
            # 只處理 .mp3 檔案
            if filename.lower().endswith('.mp3'):
                old_name = filename
                old_path = os.path.join(folder_path, old_name)
                
                # 分割檔案名稱（不含副檔名）和副檔名
                name, ext = os.path.splitext(old_name)
                
                # 如果名稱中沒有空格，則不變更
                if ' ' not in name:
                    continue
                
                # 將所有空格替換為連字符號
                new_name = name.replace(" ", "-") + ext
                new_path = os.path.join(folder_path, new_name)
                
                # 如果新名稱與舊名稱相同，則跳過
                if new_name == old_name:
                    continue
                
                # 執行檔案重新命名
                os.rename(old_path, new_path)
                
                # 記錄變更
                update_log.append({
                    "original": old_name,
                    "updated": new_name
                })
                print(f"已重新命名：{old_name} -> {new_name}")
        
        # 如果有變更，生成 JSON 紀錄檔
        if update_log:
            log_file_name = f"mp3_rename_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            log_path = os.path.join(folder_path, log_file_name)
            with open(log_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "folder": folder_path,
                    "timestamp": datetime.now().isoformat(),
                    "updates": update_log
                }, f, ensure_ascii=False, indent=4)
            print(f"更新紀錄已儲存至：{log_path}")
        
        if not update_log:
            print("沒有符合條件的 MP3 檔案需要重新命名。")
        else:
            print(f"完成！共重新命名 {len(update_log)} 個檔案。")
    
    except Exception as e:
        print(f"發生錯誤：{str(e)}")

if __name__ == "__main__":
    rename_mp3_files()