@echo off
title USMAN AI GTM - Push to GitHub
cd /d "%~dp0"
echo ========================================================
echo       USMAN AI GTM - PUSHING CODE TO GITHUB
echo ========================================================
echo.
echo Agar browser popup khule, toh "Sign in with your browser" 
echo par click karke login authorize kar dein.
echo.
git push -u origin main
echo.
echo ========================================================
echo Agar upar "Everything up-to-date" ya commits push ho gaye
echo toh aapka code GitHub par chala gaya hai!
echo ========================================================
pause
