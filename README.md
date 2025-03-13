# Horizeel App

A short-form video sharing platform with social features, similar to TikTok and Instagram Reels.

## Features

### User Authentication
- User registration and login
- JWT-based authentication
- Protected routes
- User profiles

### Video Management
- Upload videos
- Browse videos in a vertical reel format
- Like and dislike videos
- Save videos to watch later
- Delete your own videos
- Video statistics (views, likes)

### Profile Features
- View and edit profile information
- See your uploaded videos
- Manage your saved videos
- Delete your uploaded content

### UI/UX
- Modern, responsive design
- Dark mode optimized
- Interactive video controls
- Mobile-friendly interface

## Getting Started

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- FastAPI backend server running

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Environment Variables
Create a `.env` file in the root directory with:
```
REACT_APP_API_URL=http://localhost:8000/api
```

## Backend API

The backend API provides endpoints for:

### Videos
- `GET /api/videos` - Get all videos
- `GET /api/videos/{video_id}` - Get a specific video
- `POST /api/videos` - Upload a new video
- `DELETE /api/videos/{video_id}` - Delete a video (owner only)
- `POST /api/videos/{video_id}/like` - Like a video
- `POST /api/videos/{video_id}/dislike` - Dislike a video
- `POST /api/videos/{video_id}/view` - Increment view count
- `POST /api/videos/{video_id}/save` - Save a video
- `DELETE /api/videos/{video_id}/save` - Unsave a video
- `GET /api/videos/saved` - Get all saved videos
- `GET /api/videos/{video_id}/saved` - Check if a video is saved

### Users
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Log in a user
- `GET /api/users/me` - Get current user info
- `POST /api/users/logout` - Log out

## New Features

### Video Deletion
Users can now delete their own uploaded videos:
- Delete button appears on videos you own in the VideoPlayer
- Videos can also be deleted from the Profile page
- Confirmation dialog prevents accidental deletion
- API checks ownership before allowing deletion

### Saved Videos
Users can save videos to watch later:
- Save/unsave button in the video player
- Dedicated "Saved Videos" tab in the Profile page
- API endpoints for managing saved videos
- Visual indicators for saved status

## Project Structure
- `src/components` - React components
- `src/pages` - Page components
- `src/contexts` - React context providers
- `src/api.js` - API integration
- `backend/` - FastAPI backend server
  - `app/models.py` - Database models
  - `app/crud.py` - CRUD operations
  - `app/routes/` - API routes
  - `app/schemas.py` - Pydantic schemas

## License
This project is licensed under the MIT License.

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
