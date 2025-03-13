# Using Ngrok to Expose Your Application

To make your Horizeel application accessible from the internet, follow these steps:

## 1. Start your backend server
```
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 2. In a new terminal, start ngrok pointing to your backend port
```
ngrok http 8000
```

## 3. Copy the ngrok HTTPS URL provided (looks like https://something.ngrok.io)

## 4. Update your frontend .env file:
```
REACT_APP_API_URL=https://your-ngrok-url/api
```

## 5. Restart your React application
```
npm start
```

## Important Notes:
- Ngrok URLs change each time you restart ngrok unless you have a paid account
- This is for development/testing only and not suitable for production
- The free plan has limitations on connection time and bandwidth 