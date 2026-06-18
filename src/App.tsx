import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import LoginScreen from './components/LoginScreen.js';
import HostDashboard from './components/HostDashboard.js';
import BookerDashboard from './components/BookerDashboard.js';
import DevDashboard from './components/DevDashboard.js';
import InteractiveBg from './components/InteractiveBg.js';
import { UserInfo } from './types.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState<(UserInfo & { isAdminDev?: boolean }) | null>(null);
  
  // Dev backdoor view controller (can toggle 'dev', 'host', or 'booker')
  const [activeDevView, setActiveDevView] = useState<'dev' | 'host' | 'booker'>('dev');

  // Theme support ('light' | 'dark'), default is 'light'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const cached = localStorage.getItem('sync_theme_mode');
    if (cached === 'dark' || cached === 'light') {
      return cached;
    }
    return 'light'; // Keep light theme on by default
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('sync_theme_mode', nextTheme);
  };

  // Check persistent login on app mount
  useEffect(() => {
    const cached = localStorage.getItem('sync_user_ctx');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setCurrentUser(parsed);
        // Automatically open the root backdoor if logged in as Admin dev
        if (parsed.isAdminDev || parsed.username === 'Admin') {
          setActiveDevView('dev');
        }
      } catch (err) {
        localStorage.removeItem('sync_user_ctx');
      }
    }
  }, []);

  const handleLoginSuccess = (user: UserInfo & { isAdminDev?: boolean }) => {
    setCurrentUser(user);
    localStorage.setItem('sync_user_ctx', JSON.stringify(user));
    if (user.isAdminDev || user.username === 'Admin') {
      setActiveDevView('dev');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sync_user_ctx');
  };

  return (
    <div id="app-root" className={`min-h-screen ${theme}-theme bg-bg-main text-text-main flex flex-col font-sans relative transition-colors duration-300 selection:bg-accent-main selection:text-accent-text`}>
      <InteractiveBg theme={theme} />
      
      {/* COZY FLOATING THEME TOGGLER FOR ALL PAGES */}
      <div className="fixed top-4 right-4 z-50 flex items-center">
        <motion.button
          id="global-theme-toggle"
          onClick={toggleTheme}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-custom bg-bg-card/75 backdrop-blur-md shadow-md text-xs font-sans font-semibold text-text-main hover:text-accent-main hover:border-accent-main/30 hover:shadow-lg transition-all cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'Cozy Dark' : 'Organic Light'} Theme`}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-accent-bronze" />
              <span className="hidden sm:inline text-[11px]">Dark Theme</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-yellow-500 animate-[spin_8s_linear_infinite]" />
              <span className="hidden sm:inline text-[11px]">Light Theme</span>
            </>
          )}
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {!currentUser ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-grow flex flex-col"
          >
            {/* RENDER DYNAMIC SHIELD BADGE ADMIN BACKDOOR IF APPLICABLE */}
            {currentUser.isAdminDev && (
              <DevDashboard
                currentUser={currentUser}
                activeView={activeDevView}
                setActiveView={setActiveDevView}
                onRefreshData={() => {
                  // Admin triggered data reload
                }}
              />
            )}

            {/* RENDER MASTER CONTENT SCREEN ACCORDING TO SESSION */}
            <div className="flex-grow">
              {currentUser.isAdminDev ? (
                // Developer backdoor view toggle tree
                <div>
                  {activeDevView === 'dev' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="p-8 text-center"
                    >
                      <h2 className="text-xl font-mono font-bold text-gray-800">SYNC-SCHEDULE HANGOUTS DEV TERMINAL</h2>
                      <p className="text-sm text-gray-500 mt-2 max-w-lg mx-auto">
                        Inside this console, inspect registered user credentials and live logs. Use the yellow toggle bar above to switch to Host or Booker UI live mockups!
                      </p>
                    </motion.div>
                  )}
                  {activeDevView === 'host' && (
                    <HostDashboard currentUser={currentUser} onLogout={handleLogout} isAdminDevOverride={true} />
                  )}
                  {activeDevView === 'booker' && (
                    <BookerDashboard currentUser={{ id: 'admin-dev-01', username: 'Sarah', role: 'booker' }} onLogout={handleLogout} />
                  )}
                </div>
              ) : currentUser.role === 'host' ? (
                // Standard Host
                <HostDashboard currentUser={currentUser} onLogout={handleLogout} />
              ) : (
                // Standard Booker
                <BookerDashboard currentUser={currentUser} onLogout={handleLogout} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
