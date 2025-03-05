import pandas as pd
import json
import tkinter as tk
from tkinter import filedialog, messagebox
import os

def clean_data(record):
    """ 移除空白欄位（例如 NaN 或 None） """
    return {key: value for key, value in record.items() if pd.notna(value) and value != ""}

def convert_excel_to_json():
    # 開啟文件選擇對話框
    file_path = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx;*.xls")])
    
    if not file_path:
        return  # 如果使用者沒選擇檔案，直接返回

    try:
        # 讀取 Excel 檔案（加上 engine="openpyxl" 以避免讀取失敗）
        df = pd.read_excel(file_path, engine="openpyxl")

        # 轉換 DataFrame 每一列，並移除空欄位
        filtered_data = [clean_data(row) for _, row in df.iterrows()]

        # 轉換成 JSON，並包裝在 "New Words" 鍵內
        json_data = {"New Words": filtered_data}

        # 設定輸出 JSON 檔案名稱（與 Excel 檔案相同但副檔名為 .json）
        json_filename = os.path.splitext(file_path)[0] + ".json"

        # 儲存 JSON 檔案（確保使用 UTF-8 避免亂碼）
        with open(json_filename, "w", encoding="utf-8") as json_file:
            json.dump(json_data, json_file, indent=4, ensure_ascii=False)

        # 顯示成功訊息
        messagebox.showinfo("成功", f"轉換完成！\nJSON 檔案已儲存為：{json_filename}")

    except Exception as e:
        messagebox.showerror("錯誤", f"轉換失敗！\n{str(e)}")

# 創建 GUI 介面
if __name__ == "__main__":
    root = tk.Tk()
    root.withdraw()  # 隱藏主視窗
    convert_excel_to_json()
