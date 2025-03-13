# Horizeel App - External Access Setup Guide

This guide provides step-by-step instructions to make your Horizeel app accessible from the internet using port forwarding.

## Prerequisites

- Windows 10/11 computer
- Administrative access to your router
- Horizeel app backend and frontend
- Node.js installed

## Step 1: Configure Your Application

The application has already been configured with your public IP address (`49.37.248.244`) in the `.env` file:

```
REACT_APP_API_URL=http://localhost:8000/api
```

## Step 2: Configure Windows Firewall

1. Run PowerShell as Administrator
2. Navigate to your Horizeel app directory
3. Run the firewall setup script:

```
cd C:\mobileapp\myapp\horizeel-app
.\firewall-setup.bat
```

This script creates the necessary Windows Firewall rules to allow incoming connections on ports 8000 (backend) and 3000 (frontend).

## Step 3: Set Up Port Forwarding on Your Router

See the detailed instructions in [router-port-forwarding.md](./router-port-forwarding.md).

In summary:
1. Access your router admin panel (typically at http://192.168.29.1)
2. Find the port forwarding section
3. Create two port forwarding rules:
   - External port 8000 → Internal IP 192.168.29.199 port 8000 (Backend)
   - External port 3000 → Internal IP 192.168.29.199 port 3000 (Frontend)
4. Save changes and restart your router if required

## Step 4: Run Your Horizeel App

1. Start the backend server:
```
cd C:\mobileapp\myapp\horizeel-app
node start-backend.js
```

2. In a new terminal window, start the frontend server:
```
cd C:\mobileapp\myapp\horizeel-app
npm start
```

## Step 5: Test External Access

Run the test script to verify your app is accessible from the internet:

```
cd C:\mobileapp\myapp\horizeel-app
node test-external-access.js
```

This script will:
- Confirm your current public IP address
- Test if your backend API is reachable
- Test if your frontend is reachable
- Provide troubleshooting guidance if there are issues

## Accessing Your App

Once everything is set up, you can access your Horizeel app from any device with internet access:

- Frontend: http://49.37.248.244:3000
- Backend API: http://49.37.248.244:8000/api

## Important Security Notes

1. **Dynamic IP Address**: Most residential internet connections have dynamic IP addresses that change periodically. If your app becomes inaccessible, your IP address may have changed. Run `node find-public-ip.js` to get your current IP and update the `.env` file.

2. **Security Risks**: Opening ports on your router creates potential security vulnerabilities. Only keep port forwarding active when needed.

3. **ISP Restrictions**: Some Internet Service Providers block incoming connections on standard ports. If you can't access your app externally, contact your ISP or consider using a VPN with port forwarding capabilities.

## Troubleshooting

If you encounter issues, check the following:

1. Make sure both backend and frontend servers are running
2. Verify Windows Firewall rules are correctly set up
3. Confirm router port forwarding is properly configured
4. Ensure your `.env` file has the correct public IP address
5. Try accessing the app from a device not connected to your local network

For more detailed troubleshooting, refer to the [router-port-forwarding.md](./router-port-forwarding.md) document.

## Advanced: Setting Up a Dynamic DNS

If your public IP changes frequently, consider setting up a Dynamic DNS service like No-IP or DuckDNS to create a permanent domain name that points to your changing IP address. 