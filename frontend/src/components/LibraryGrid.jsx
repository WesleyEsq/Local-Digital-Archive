import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GetEntries } from '../../wailsjs/go/main/App';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';

// ADDED libraryId prop here
export default function LibraryGrid({ libraryId, onSelectSeries }) {
    const [allEntries, setAllEntries] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("number");
    
    // 1. FIX SCROLLING: We need a ref specifically for the DOM element
    const scrollerRef = useRef(null);

    // 2. FIX ANIMATION: Keep track of images that have already loaded once
    const loadedCache = useRef(new Set());

    // --- Fetch & Sort Logic ---
    useEffect(() => {
        // NOW PASSING THE INTEGER ID INSTEAD OF AN EMPTY STRING
        if (libraryId) {
            GetEntries(libraryId)
                .then(res => setAllEntries(res || []))
                .catch(err => console.error("Error fetching entries:", err));
        }
    }, [libraryId]);

    const filteredEntries = useMemo(() => {
        let result = allEntries;
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            result = result.filter(e => 
                (e.title && e.title.toLowerCase().includes(lowerQ)) || 
                (e.comment && e.comment.toLowerCase().includes(lowerQ))
            );
        }
        switch (sortBy) {
            case 'rank': result = [...result].sort((a, b) => (a.rank || "").localeCompare(b.rank || "")); break;
            case 'title': result = [...result].sort((a, b) => (a.title || "").localeCompare(b.title || "")); break;
            default: result = [...result].sort((a, b) => Number(a.number) - Number(b.number));
        }
        return result;
    }, [allEntries, searchQuery, sortBy]);

    // --- CARD COMPONENT ---
    const Card = ({ entry }) => {
        // Check if this image was loaded previously
        const seenBefore = loadedCache.current.has(entry.id);
        const [isLoaded, setIsLoaded] = useState(seenBefore);

        return (
            <div className="library-card" onClick={() => onSelectSeries(entry)}>
                <div className="library-card-image-wrapper">
                    <div className="card-accent-bar"></div>
                    <img 
                        src={`/images/${entry.id}`} 
                        alt={entry.title} 
                        loading="lazy"
                        // Apply 'instant' class if seen before to skip animation
                        className={`library-cover-img ${isLoaded ? 'loaded' : ''} ${seenBefore ? 'instant' : ''}`}
                        onLoad={(e) => {
                            // Mark as seen in the global cache
                            loadedCache.current.add(entry.id);
                            setIsLoaded(true);
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none'; 
                            e.target.parentNode.classList.add('broken');
                        }}
                    />
                    <div className="library-card-overlay">
                        <span className={`rank-badge rank-${entry.rank ? entry.rank.charAt(0) : 'U'}`}>{entry.rank}</span>
                    </div>
                </div>
                <div className="library-card-title">{entry.title}</div>
            </div>
        );
    };

    // --- CAROUSEL SCROLL HANDLER ---
    const scrollCarousel = (direction) => {
        if (scrollerRef.current) {
            // Now we are calling scrollBy on the actual DIV, so it works perfectly
            scrollerRef.current.scrollBy({ 
                left: direction === 'left' ? -800 : 800, 
                behavior: 'smooth' 
            });
        }
    };

    const isSearching = searchQuery.length > 0;

    return (
        <div className="library-wrapper">
            <div className="library-header-box">
                <div className="library-toolbar">
                    <div className="search-input-wrapper">
                        <input 
                            type="text" 
                            placeholder="Search Library..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                        <button className="search-circle-btn"><Search size={18} /></button>
                    </div>

                    <div className="sort-controls">
                        <label>Sort by:</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="number">Default</option>
                            <option value="rank">Rank</option>
                            <option value="title">Title</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="library-content-area">
                {isSearching ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <h3 className="section-title" style={{ paddingLeft: '30px', marginTop: '10px' }}>
                            Search Results ({filteredEntries.length})
                        </h3>
                        
                        <VirtuosoGrid
                            style={{ height: '100%' }}
                            className="custom-scrollbar"
                            data={filteredEntries}
                            totalCount={filteredEntries.length}
                            components={{
                                List: React.forwardRef(({ style, children, ...props }, ref) => (
                                    <div
                                        ref={ref}
                                        {...props}
                                        className="virtuoso-grid-list"
                                        style={{
                                            ...style,
                                        }}
                                    >
                                        {children}
                                    </div>
                                ))
                            }}
                            itemContent={(index, entry) => (
                                <div style={{ height: '320px', width: '100%' }}>
                                    <Card entry={entry} />
                                </div>
                            )}
                        />
                    </div>
                ) : (
                    <div className="category-row">
                        <h3 className="section-title">All Library Entries <span className="count-badge">{filteredEntries.length}</span></h3>
                        
                        <div className="carousel-wrapper" style={{ height: 380, position: 'relative' }}>
                            <button className="carousel-btn left" onClick={() => scrollCarousel('left')}>
                                <ChevronLeft size={32} />
                            </button>

                            <Virtuoso
                                horizontalDirection
                                data={filteredEntries}
                                style={{ height: '100%' }}
                                scrollerRef={(ref) => scrollerRef.current = ref}
                                itemContent={(_, entry) => (
                                    <div style={{ width: 240, height: '100%', padding: '10px' }}>
                                        <div style={{ height: 320 }}>
                                            <Card entry={entry} />
                                        </div>
                                    </div>
                                )}
                            />

                            <button className="carousel-btn right" onClick={() => scrollCarousel('right')}>
                                <ChevronRight size={32} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}