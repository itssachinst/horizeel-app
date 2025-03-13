# Router Port Forwarding Guide

Follow these steps to set up port forwarding on your router:

## Step 1: Access Your Router's Admin Panel

1. Open a web browser on a device connected to your network
2. Enter your router's IP address in the address bar
   - Common router addresses: `192.168.1.1`, `192.168.0.1`, or `192.168.29.1`
   - Your router's IP is likely: `192.168.29.1` (based on your network configuration)

## Step 2: Log in to Your Router

1. Enter your router's admin username and password
   - If you've never changed these, check the router's documentation
   - Common defaults: admin/admin, admin/password, or blank/admin

## Step 3: Find Port Forwarding Section

Depending on your router brand, look for:
- "Port Forwarding"
- "Virtual Servers"
- "NAT/Gaming"
- "Applications & Gaming"
- "Advanced" → "Port Forwarding"

## Step 4: Create Port Forwarding Rules

Create two separate rules:

### Rule 1: Backend API
- External/Start Port: `8000`
- Internal/End Port: `8000`
- Protocol: `TCP` (or `TCP/UDP` if that's the only option)
- Internal IP Address: `192.168.29.199` (your computer's IP)
- Enabled/Active: `Yes` or checked

### Rule 2: Frontend Web App
- External/Start Port: `3000`
- Internal/End Port: `3000`
- Protocol: `TCP` (or `TCP/UDP` if that's the only option)
- Internal IP Address: `192.168.29.199` (your computer's IP)
- Enabled/Active: `Yes` or checked

## Step 5: Save Settings & Restart Router (if required)

Some routers require you to:
1. Click "Save" or "Apply" to save your changes
2. Restart the router for changes to take effect

## Step 6: Test Your Configuration

1. Start your backend and frontend servers
2. From a device NOT on your network (like a mobile phone with Wi-Fi turned off)
3. Visit: `http://49.37.248.244:3000`

## Router-Specific Instructions

### TP-Link Routers
1. Click "Advanced" → "NAT Forwarding" → "Virtual Servers"
2. Click "Add" and enter port details

### Netgear Routers
1. Click "Advanced" → "Advanced Setup" → "Port Forwarding / Port Triggering"
2. Select "Port Forwarding" and click "Add Custom Service"

### Linksys Routers
1. Click "Security" → "Apps and Gaming" → "Single Port Forwarding"
2. Enter the application name and port details

### D-Link Routers
1. Click "Advanced" → "Port Forwarding"
2. Enter name and port details

## Troubleshooting

If you can't access your app externally:

1. **Check Services**: Make sure both backend and frontend are running
2. **Verify Firewall Rules**: Ensure Windows Firewall allows the ports
3. **Double-Check Router Settings**: Verify port forwarding is set up correctly
4. **ISP Blocking**: Some ISPs block incoming connections. Consider using a VPN with port forwarding capabilities
5. **Dynamic IP**: If your public IP changes frequently, consider using a dynamic DNS service like No-IP or DuckDNS

## Important Security Note

When you open ports on your router, you're creating potential security vulnerabilities. Therefore:

- Only keep port forwarding active when you need it
- Make sure your computer has up-to-date security patches
- Consider implementing authentication for your app
- Never expose admin interfaces or databases directly 