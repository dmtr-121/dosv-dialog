import React from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import Header from './layout/Header';

export default function Layout() {
  // Only show header on the main page (root route)
  const isMainPage = !!useMatch('/');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show header on the main page */}
      {isMainPage && <Header />}
      
      <main className={isMainPage ? 'pt-14' : ''}>
        <Outlet />
      </main>
    </div>
  );
}