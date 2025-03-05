import time
import pyautogui
import tkinter as tk
from tkinter import messagebox

def click_chatgpt_input():
    """點擊 ChatGPT 輸入框"""
    input_x, input_y = 1320, 525  # 你的 ChatGPT 輸入框座標
    pyautogui.click(input_x, input_y)
    time.sleep(0.5)

def ask_chatgpt(word):
    """傳送單字到 ChatGPT"""
    click_chatgpt_input()
    pyautogui.write(f"請提供 '{word}' 的英文解釋", interval=0.05)
    pyautogui.press("enter")

def get_response():
    """取得 ChatGPT 回應"""
    time.sleep(10)  # 等待 ChatGPT 回應
    pyautogui.hotkey("ctrl", "a")  # 選取全部文字
    pyautogui.hotkey("ctrl", "c")  # 複製到剪貼簿
    time.sleep(1)
    return app.clipboard_get()  # 取得剪貼簿內容

def search_word():
    """執行查詢"""
    word = entry.get()
    if word:
        ask_chatgpt(word)
        time.sleep(10)  # 等待 ChatGPT 回應
        response = get_response()
        messagebox.showinfo("查詢結果", response)
    else:
        messagebox.showwarning("錯誤", "請輸入單字！")

# 建立 Tkinter 介面
app = tk.Tk()
app.title("ChatGPT 單字查詢")
app.geometry("300x150")
app.attributes('-alpha', 0.9)  # 設定視窗透明度 90%

label = tk.Label(app, text="輸入單字:")
label.pack()

entry = tk.Entry(app)
entry.pack()

search_button = tk.Button(app, text="查詢", command=search_word)
search_button.pack()

app.mainloop()
