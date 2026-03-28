import { useEffect, useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { useAuthStore } from './store/useAuthStore';
import { useAppStore } from './store/useAppStore';

// We'll create these views next
import AuthView from './views/AuthView';
import MainApp from './views/MainApp';
import OnboardingModal from './components/layout/OnboardingModal';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { fetchInitialData, profile } = useAppStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    async function init() {
      const isAuth = await checkAuth();
      if (isAuth) {
        await fetchInitialData();
      } else {
        setLocation('/login');
      }
      setIsInitializing(false);
    }
    init();
  }, []);

  // Listen to profile changes to route to onboarding instead of main app
  const needsOnboarding = isAuthenticated && !isInitializing && !profile;

  if (isInitializing) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }}></div>
      </div>
    );
  }

  return (
    <>
      <Switch>
        <Route path="/login" component={AuthView} />
        <Route path="/" component={MainApp} />
        {/* Redirect anything else to root */}
        <Route path="/:rest*">
          {() => {
            setLocation('/');
            return null;
          }}
        </Route>
      </Switch>

      {needsOnboarding && <OnboardingModal />}
      
      {/* Target for our imperative toast rendering if we want to extract it, or keep it in DOM manually */}
      <div id="toast-container"></div>
    </>
  );
}
