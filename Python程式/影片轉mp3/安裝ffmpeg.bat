@echo off
chcp 65001 >nul
echo ============================================
echo   自動安裝 ffmpeg
echo ============================================
echo.
echo 正在使用 winget 安裝 ffmpeg...
echo （如果系統沒有 winget，請手動安裝）
echo.

winget install --id=Gyan.FFmpeg -e

echo.
echo ============================================
echo 安裝完成！
echo ============================================
echo.
echo 請關閉此視窗後，執行「執行影片轉MP3_ffmpeg版.bat」
echo.
pause