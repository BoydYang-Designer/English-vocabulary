import tkinter as tk
import time
from tkinter import messagebox

# 創建 Tkinter 主視窗
app = tk.Tk()
app.title("座標查詢工具")
app.geometry("300x150")

# 設定半透明效果 (0.8 代表 80% 透明度)
app.attributes("-alpha", 0.65)

# 記錄座標
coords = None

def on_click(event):
    """當滑鼠點擊時，記錄座標並倒數 3 秒後顯示"""
    global coords
    coords = (event.x_root, event.y_root)
    app.config(cursor="arrow")  # 恢復滑鼠樣式
    app.unbind("<Button-1>")  # 解除滑鼠監聽
    app.after(3000, show_coordinates)  # 3 秒後顯示座標

def start_coordinate_selection():
    """開始座標選取模式"""
    messagebox.showinfo("提示", "請點擊目標位置，3 秒後顯示座標")
    app.config(cursor="cross")  # 變更滑鼠為十字形
    app.bind("<Button-1>", on_click)  # 監聽滑鼠左鍵點擊

def show_coordinates():
    """顯示座標資訊"""
    global coords
    if coords:
        messagebox.showinfo("座標結果", f"X: {coords[0]}, Y: {coords[1]}")
        coords = None  # 重置座標

# 建立按鈕
query_button = tk.Button(app, text="查詢座標", command=start_coordinate_selection)
query_button.pack(pady=20)

app.mainloop()
