$GitExe = "D:\Git\cmd\git.exe"

Write-Host "Initializing git repository..."
& $GitExe init

Write-Host "Adding files..."
& $GitExe add .

Write-Host "Committing..."
& $GitExe commit -m "Premium SaaS AI Platform - UI/UX Refactor"

Write-Host "Setting main branch..."
& $GitExe branch -M main

Write-Host "Adding remote..."
# Remove origin if it exists to avoid errors
& $GitExe remote remove origin 2>$null
& $GitExe remote add origin "https://github.com/usman-ai-gtm/Lead-Scraper.git"

Write-Host "Pushing to GitHub..."
# This might pop up a credential manager for the user to sign in
& $GitExe push -u origin main
