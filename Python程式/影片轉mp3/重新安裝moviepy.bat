@echo off
chcp 65001 >nul
echo ============================================
echo   重新安裝 moviepy
echo ============================================
echo.
echo 正在解除安裝舊版 moviepy...
C:\Users\id02.GD-ROADMATE\AppData\Local\Programs\Python\Python313\python.exe -m pip uninstall moviepy -y

echo.
echo 正在安裝 moviepy...
C:\Users\id02.GD-ROADMATE\AppData\Local\Programs\Python\Python313\python.exe -m pip install moviepy

echo.
echo 正在測試 moviepy 是否可用...
C:\Users\id02.GD-ROADMATE\AppData\Local\Programs\Python\Python313\python.exe -c "from moviepy.editor import VideoFileClip; print('✅ moviepy 安裝成功!')"

echo.
echo ============================================
echo 完成！現在可以執行程式了
echo ============================================
echo.
pause