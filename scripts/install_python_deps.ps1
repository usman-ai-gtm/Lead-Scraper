$pythonExe = "C:\Users\admin\AppData\Local\Programs\Python\Python311\python.exe"
$backendReqs = "d:\DATA D\LUXURY DASHBOARD\backend\requirements.txt"
$rootReqs = "d:\DATA D\LUXURY DASHBOARD\requirements.txt"

Write-Host "Upgrading pip, setuptools, wheel..."
& $pythonExe -m pip install --upgrade pip setuptools wheel

Write-Host "`nInstalling backend/requirements.txt..."
& $pythonExe -m pip install -r $backendReqs

Write-Host "`nInstalling root requirements.txt..."
& $pythonExe -m pip install -r $rootReqs

# Additional helpful packages
& $pythonExe -m pip install pytest httpx email-validator python-dotenv google-api-python-client google-auth-oauthlib google-auth-httplib2

Write-Host "`nInstalled packages verification:"
& $pythonExe -m pip list
