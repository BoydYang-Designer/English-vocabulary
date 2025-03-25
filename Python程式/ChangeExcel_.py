import pandas as pd
import tkinter as tk
from tkinter import filedialog
import os
import json
from datetime import datetime

def update_excel_file():
    # 創建隱藏的 Tkinter 窗口並選擇檔案
    root = tk.Tk()
    root.withdraw()  # 隱藏主窗口
    
    # 打開檔案選擇對話框，讓用戶選擇 Excel 檔案
    file_path = filedialog.askopenfilename(
        title="請選擇要更新的 Excel 檔案",
        filetypes=[("Excel files", "*.xlsx *.xls")]
    )
    
    if not file_path:
        print("未選擇檔案，程式結束。")
        return
    
    try:
        # 讀取 Excel 檔案，保留所有欄位
        df = pd.read_excel(file_path)
        
        # 檢查是否包含 "Words" 欄位
        if "Words" not in df.columns:
            print("錯誤：Excel 檔案中沒有 'Words' 欄位！")
            return
        
        # 儲存更新紀錄
        update_log = []
        
        # 複製 "Words" 欄位的原始值
        original_words = df['Words'].astype(str).copy()
        
        # 自訂函數：只對兩個以上單字的內容進行變更
        def replace_spaces(text):
            words = text.split()
            if len(words) > 1:  # 如果多於一個單字
                return "-".join(words)
            return text  # 單一單字保持不變
        
        # 更新 "Words" 欄位
        df['Words'] = df['Words'].astype(str).apply(replace_spaces)
        
        # 比較原始值和新值，記錄變更
        for idx, (old, new) in enumerate(zip(original_words, df['Words'])):
            if old != new:
                update_log.append({
                    "row": idx + 2,  # Excel 從第2行開始（考慮標題行）
                    "original": old,
                    "updated": new
                })
        
        # 獲取原始檔案路徑和名稱
        file_dir = os.path.dirname(file_path)
        file_name = os.path.basename(file_path)
        
        # 儲存更新後的 Excel 檔案（覆蓋原始檔案）
        output_path = os.path.join(file_dir, file_name)
        df.to_excel(output_path, index=False)
        
        # 儲存 JSON 紀錄檔
        if update_log:  # 只有在有變更時才生成紀錄檔
            log_file_name = f"update_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            log_path = os.path.join(file_dir, log_file_name)
            with open(log_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "file": file_name,
                    "timestamp": datetime.now().isoformat(),
                    "updates": update_log
                }, f, ensure_ascii=False, indent=4)
            print(f"更新紀錄已儲存至：{log_path}")
        
        print(f"檔案已成功更新並儲存至：{output_path}")
        
    except Exception as e:
        print(f"發生錯誤：{str(e)}")

if __name__ == "__main__":
    update_excel_file()