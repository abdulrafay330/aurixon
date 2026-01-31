import { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

/**
 * MainLayout Component
 * Wraps all pages with consistent header, sidebar (auth only), and footer
 */
const MainLayout = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-midnight-navy via-gray-900 to-midnight-navy">
      {/* Header - always at top */}
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} showMenuButton={isAuthenticated} />
      
      {/* Sidebar for authenticated users */}
      {isAuthenticated && <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />}
      
      {/* Main content area - shifts right when sidebar is present on desktop */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${
        isAuthenticated ? 'lg:ml-64' : ''
      }`}>
        <main className="flex-1 pt-16">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
