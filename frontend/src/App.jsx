import React, { useState } from 'react';
import './App.css';

// --- Components ---
import EntryList from './components/EntryList';
import CompendiumView from './components/CompendiumView';
import LibraryGrid from './components/LibraryGrid';
import SeriesDetail from './components/SeriesDetail';
import SettingsModal from './components/settings/SettingsModal';

// --- Icons ---
import { 
    List, 
    Grid, 
    Info, 
    PlusCircle, 
    Settings, 
    BookOpen 
} from 'lucide-react';

function App() {
    // Moved inside the component!
    const [activeLibraryId, setActiveLibraryId] = useState(1); 
    
    const [view, setView] = useState('list'); 
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [showSettings, setShowSettings] = useState(false);

    const handleAddNew = () => {
        setView('list'); 
        setIsAddingNew(true); 
    };

    const handleSelectSeries = (entry) => {
        setSelectedSeries(entry);
        setView('series_detail');
    };

    // Helper to determine active state
    const isActive = (v) => view === v && !isAddingNew;

    return (
        <div id="App">
            {/* --- LEFT SIDEBAR --- */}
            <nav className="app-sidebar">
                <div className="sidebar-logo">
                    <BookOpen size={28} />
                    <span>Compendium</span>
                </div>

                <div className="sidebar-nav">
                    <button 
                        className={`nav-item ${isActive('list') ? 'active' : ''}`} 
                        onClick={() => { setView('list'); setIsAddingNew(false); }}
                    >
                        <List size={20} /> List View
                    </button>
                    
                    <button 
                        className={`nav-item ${isActive('library') || view === 'series_detail' ? 'active' : ''}`} 
                        onClick={() => setView('library')}
                    >
                        <Grid size={20} /> Library
                    </button>
                    
                    <button 
                        className={`nav-item ${isActive('about') ? 'active' : ''}`} 
                        onClick={() => setView('about')}
                    >
                        <Info size={20} /> About
                    </button>

                    <button className="nav-item add-btn" onClick={handleAddNew}>
                        <PlusCircle size={20} /> Add Entry
                    </button>
                </div>

                {/* Settings at the bottom */}
                <button 
                    className="nav-item" 
                    onClick={() => setShowSettings(true)}
                    style={{ marginTop: 'auto' }}
                >
                    <Settings size={20} /> Configuration
                </button>
            </nav>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="content-wrapper">
                {/* Passed libraryId to the views so they know which data to load */}
                {view === 'about' && <CompendiumView libraryId={activeLibraryId} />}
                
                {view === 'list' && (
                    <EntryList 
                        libraryId={activeLibraryId}
                        isAddingNew={isAddingNew}
                        onAddComplete={() => setIsAddingNew(false)}
                        onAddNew={() => setIsAddingNew(true)} 
                    />
                )}
                
                {view === 'library' && (
                    <LibraryGrid 
                        libraryId={activeLibraryId} 
                        onSelectSeries={handleSelectSeries} 
                    />
                )}
                
                {view === 'series_detail' && selectedSeries && (
                    <SeriesDetail 
                        entry={selectedSeries} 
                        onBack={() => setView('library')} 
                    />
                )}
            </main>

            {/* --- MODALS --- */}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
}

export default App;