import { createBrowserRouter, RouteObject, Navigate } from 'react-router-dom'
import { AuthLayout } from './layouts/AuthLayout'
import { ChatLayout } from './layouts/ChatLayout'
import { ConversationView } from '@/views/conversation'
import Login from './views/LoginView'
import Register from './views/RegisterView'
import { RequireAuth } from './components/RequireAuth'

const routes: RouteObject[] = [
    {
        path: '/',
        element: <Navigate to='/chat' replace />,
    },
    {
        path: 'auth',
        element: <AuthLayout />,
        children: [
            {
                path: 'login',
                element: <Login />,
            },
            {
                path: 'register',
                element: <Register />,
            },
        ],
    },
    {
        path: 'chat',
        element: (
            <RequireAuth>
                <ChatLayout />
            </RequireAuth>
        ),
        children: [
            {
                index: true,
                element: (
                    <div className='flex flex-col items-center justify-center h-full text-gray-400 '>
                        <h2 className='text-xl font-medium text-white mb-2'>Welcome!</h2>
                        <p>Select a chat from the sidebar to start messaging.</p>
                    </div>
                ),
            },
            {
                path: ':conversation_id',
                element: <ConversationView />,
            },
        ],
    },
]

export const router = createBrowserRouter(routes)
