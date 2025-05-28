import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/Layout';
import Practice from '../pages/Practice';
import DialoguePlayer from '../pages/DialoguePlayer';
import Dialogues from '../pages/Dialogues';
import DialogueStartPage from '../pages/DialogueStartPage';
import NotFound from '../pages/NotFound';

const router = createBrowserRouter([
  // Start pages with path parameters
  {
    path: '/dialogue-start/:courseId/:moduleId/:dialogueId',
    element: <DialogueStartPage />,
  },
  // Legacy route for backward compatibility
  {
    path: '/dialogue-start/:categoryId/:dialogueId',
    element: <DialogueStartPage />,
  },
  
  // Main layout with nested routes
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Practice />,
      },
      
      // Dialogues routes with multi-level structure
      {
        path: 'dialogues',
        children: [
          {
            index: true,
            element: <Dialogues />,
          },
          {
            path: 'course/:courseId',
            element: <Dialogues />,
          },
          {
            path: 'course/:courseId/module/:moduleId',
            element: <Dialogues />,
          },
          // Legacy route for backward compatibility
          {
            path: ':categoryId',
            element: <Dialogues />,
          }
        ]
      },
      
      // Practice routes with multi-level structure
      {
        path: 'practice/:courseId/:moduleId/:dialogueId',
        element: <DialoguePlayer />,
      },
      // Legacy route for backward compatibility
      {
        path: 'practice/:categoryId/:dialogueId',
        element: <DialoguePlayer />,
      },
      
      
      // Catch-all for 404
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;