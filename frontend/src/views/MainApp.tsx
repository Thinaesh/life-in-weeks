import { useAppStore } from '../store/useAppStore';
import AppHeader from '../components/layout/AppHeader';
import LifeBar from '../components/layout/LifeBar';

// Views
import GridView from './GridView';
import StatsView from './StatsView';
import ChaptersView from './ChaptersView';
import MilestonesView from './MilestonesView';
import GoalsView from './GoalsView';
import SettingsView from './SettingsView';
import JournalDrawer from '../components/layout/JournalDrawer';

export default function MainApp() {
  const { currentView } = useAppStore();

  return (
    <div className="app" id="app">
      <AppHeader />
      <LifeBar />
      
      <main className="main-content">
        <div className={`section ${currentView !== 'grid' && currentView !== 'weeks' ? 'hidden' : ''}`}>
          <GridView />
        </div>
        
        <div className={`section ${currentView !== 'stats' ? 'hidden' : ''}`}>
          <StatsView />
        </div>
        
        <div className={`section ${currentView !== 'chapters' ? 'hidden' : ''}`}>
          <ChaptersView />
        </div>
        
        <div className={`section ${currentView !== 'milestones' ? 'hidden' : ''}`}>
          <MilestonesView />
        </div>
        
        <div className={`section ${currentView !== 'goals' ? 'hidden' : ''}`}>
          <GoalsView />
        </div>
        
        <div className={`section ${currentView !== 'settings' ? 'hidden' : ''}`}>
          <SettingsView />
        </div>
      </main>

      <JournalDrawer />
    </div>
  );
}
