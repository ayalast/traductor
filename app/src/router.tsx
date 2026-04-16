import { createBrowserRouter } from 'react-router-dom'

import App from './App'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { ChatPage } from './pages/ChatPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <ChatPage />,
      },
    ],
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
])
