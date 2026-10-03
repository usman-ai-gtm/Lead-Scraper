@echo off
title USMAN AI GTM - Push to GitHub
echo ========================================================
echo       USMAN AI GTM - PUSH CODE TO GITHUB FOR CLOUD
echo ========================================================
echo.
echo All 100+ files and 24,000+ lines of production code are 
echo already committed locally.
echo.
echo To push to your repository:
echo https://github.com/usman-ai-gtm/Lead-Scraper.git
echo.
set /p GITHUB_TOKEN="Apna GitHub Personal Access Token (PAT) paste karein (ya press Enter agar browser login chahiye): "

if "%GITHUB_TOKEN%"=="" (
    echo.
    echo Pushing with standard Git credential manager...
    git push -u origin main
) else (
    echo.
    echo Pushing with your token...
    git push -u https://%GITHUB_TOKEN%@github.com/usman-ai-gtm/Lead-Scraper.git main
)

echo.
echo ========================================================
echo Done! Check the output above.
echo ========================================================
pause
