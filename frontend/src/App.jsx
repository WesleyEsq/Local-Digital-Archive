import React, { useState } from 'react';
import './App.css';
import EntryList from './components/EntryList';
import CompendiumView from './components/CompendiumView';
import LibraryGrid from './components/LibraryGrid';
import SeriesDetail from './components/SeriesDetail';

function App() {
    const [view, setView] = useState('list'); // 'list', 'about', 'library', 'series_detail'
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [selectedSeries, setSelectedSeries] = useState(null);

    const handleAddNew = () => {
        setView('list'); 
        setIsAddingNew(true); 
    };

    const handleSelectSeries = (entry) => {
        setSelectedSeries(entry);
        setView('series_detail');
    };

    return (
        <div id="App">
            <div className="top-header-bar">
                <h2>My GL Compendium</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setView('list')} style={{ opacity: view === 'list' ? 1 : 0.6 }}>List</button>
                    {/* --- ADDED THIS BUTTON --- */}
                    <button onClick={() => setView('library')} style={{ opacity: view === 'library' || view === 'series_detail' ? 1 : 0.6 }}>Library</button>
                    <button onClick={() => setView('about')} style={{ opacity: view === 'about' ? 1 : 0.6 }}>About</button>
                    <button onClick={handleAddNew}>+ Add Entry</button>
                </div>
            </div>

            <div className="content-wrapper">
                {view === 'about' && <CompendiumView />}
                
                {view === 'list' && (
                    <EntryList 
                        isAddingNew={isAddingNew}
                        onAddComplete={() => setIsAddingNew(false)}
                    />
                )}
                
                {view === 'library' && <LibraryGrid onSelectSeries={handleSelectSeries} />}
                
                {view === 'series_detail' && selectedSeries && (
                    <SeriesDetail 
                        entry={selectedSeries} 
                        onBack={() => setView('library')} 
                    />
                )}
            </div>
        </div>
    );
}

export default App;