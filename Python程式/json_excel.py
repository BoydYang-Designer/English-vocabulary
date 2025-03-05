import pandas as pd
import json

# 讀取 JSON 資料
def read_json(json_path):
    with open(json_path, 'r', encoding='utf-8') as file:
        return json.load(file)

# 轉換 JSON 資料為 Excel 格式
def convert_json_to_excel(json_data, output_file):
    rows = []
    # 瀏覽每個 "New Words" 條目
    for entry in json_data.get("New Words", []):
        level = entry.get("等級", "")
        category = entry.get("分類", "")
        word = entry.get("Words", "")
        
        # 將每個字根據需求產生三個版本
        words = [f"{word}-{i+1}" for i in range(3)]  # 生成 word-1, word-2, word-3
        
        # 收集資料
        for w in words:
            rows.append({
                "等級": level,
                "分類": category,
                "Words": w
            })
    
    # 建立 DataFrame 並寫入 Excel
    df = pd.DataFrame(rows)
    df.to_excel(output_file, index=False)

# 設定 JSON 檔案的路徑和輸出 Excel 檔案的路徑
json_file = r"C:\conver file\Z_total_words.json"
output_file = r"C:\conver file\output_words.xlsx"

# 讀取 JSON 資料並轉換為 Excel
json_data = read_json(json_file)
convert_json_to_excel(json_data, output_file)
