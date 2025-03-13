@echo off
echo Configuring Windows Firewall for Horizeel App...
echo Please run this file as Administrator (right-click, Run as Administrator)
echo.

echo Creating rule for Backend API (Port 8000)
netsh advfirewall firewall add rule name="Horizeel Backend" dir=in action=allow protocol=TCP localport=8000

echo Creating rule for Frontend (Port 3000)
netsh advfirewall firewall add rule name="Horizeel Frontend" dir=in action=allow protocol=TCP localport=3000

echo.
echo Firewall rules created successfully!
echo.
echo IMPORTANT: Make sure to also configure port forwarding on your router:
echo 1. External port 8000 -> Internal IP 192.168.29.199, port 8000
echo 2. External port 3000 -> Internal IP 192.168.29.199, port 3000
echo.
pause 