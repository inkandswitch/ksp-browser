@echo off

set LOG=C:\Users\pvh\Desktop\log.txt

time /t >> %LOG%

node.exe "%~dp0native-messaging-host.js" %* 2>> %LOG%

echo %errorlevel% >> %LOG%
