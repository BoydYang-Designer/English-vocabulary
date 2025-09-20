import pandas as pd
import json

def find_missing_values(excel_path, json_output_path):
    """
    找出 Excel 文件中存在缺失值的欄位，並將結果記錄到 JSON 文件中。
    
    :param excel_path: Excel 文件的路徑
    :param json_output_path: 輸出 JSON 文件的路徑
    """
    # 讀取 Excel 文件
    df = pd.read_excel(excel_path)
    
    # 檢查每個欄位的缺失值數量
    missing_values = df.isna().sum()
    
    # 過濾出存在缺失值的欄位
    missing_columns = missing_values[missing_values > 0].to_dict()
    
    # 構建 JSON 數據
    if missing_columns:
        missing_data = {
            "問題欄位": [
                {"欄位名稱": column, "缺失值數量": int(count)}
                for column, count in missing_columns.items()
            ]
        }
    else:
        missing_data = {"訊息": "所有欄位均無缺失值"}
    
    # 將結果寫入 JSON 文件
    with open(json_output_path, 'w', encoding='utf-8') as json_file:
        json.dump(missing_data, json_file, ensure_ascii=False, indent=4)
    
    # 輸出簡單訊息到控制台
    if missing_columns:
        print("檢測到缺失值，詳細結果已保存至 JSON 文件。")
    else:
        print("無缺失值，詳細結果已保存至 JSON 文件。")
    print(f"JSON 文件路徑：{json_output_path}")

# 使用示例
excel_path = 'sentence.xlsx'  # Excel 文件路徑
json_output_path = 'missing_values_summary.json'  # 輸出 JSON 文件路徑
find_missing_values(excel_path, json_output_path)