@echo off
chcp 65001 >nul
echo ============================================
echo   影片轉 MP3 工具 (ffmpeg 版本)
echo ============================================
echo.
echo 正在檢查 ffmpeg...
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ 找不到 ffmpeg！
    echo.
    echo 請先安裝 ffmpeg：
    echo 方法1：使用 winget 安裝（推薦）
    echo    winget install ffmpeg
    echo.
    echo 方法2：使用 Chocolatey 安裝
    echo    choco install ffmpeg
    echo.
    echo 方法3：手動下載
    echo    https://ffmpeg.org/download.html
    echo.
    pause
    exit /b 1
)

echo ✅ ffmpeg 已安裝
echo.
echo 正在啟動程式...
echo.

C:\Users\id02.GD-ROADMATE\AppData\Local\Programs\Python\Python313\python.exe FilmToMp3_ffmpeg版.py

echo.
echo 程式已結束，按任意鍵關閉視窗...
pause >nul