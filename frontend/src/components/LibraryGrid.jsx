import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GetEntries, GetEntryImage } from '../../wailsjs/go/main/App';

const BLANK_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// The Magic Number: 7 items x 2 rows = 14 items per page
const ITEMS_PER_PAGE = 14;

export default function LibraryGrid({ onSelectSeries }) {
    const [allEntries, setAllEntries] = useState([]);
    const [currentPage, setCurrentPage] = useState(0); // 0-indexed page
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("number");

    const cardsRef = useRef(new Map());
    const observerRef = useRef(null);

    // 1. Fetch Metadata
    useEffect(() => {
        GetEntries("").then(res => setAllEntries(res || []));
    }, []);

    // 2. Filter & Sort Logic
    const filteredEntries = useMemo(() => {
        let result = allEntries;

        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            result = result.filter(e => 
                e.title.toLowerCase().includes(lowerQ) || 
                e.comment.toLowerCase().includes(lowerQ)
            );
        }

        if (sortBy === 'rank') {
            result = [...result].sort((a, b) => a.rank.localeCompare(b.rank));
        } else {
            result = [...result].sort((a, b) => Number(a.number) - Number(b.number));
        }
        return result;
    }, [allEntries, searchQuery, sortBy]);

    // 3. Pagination Logic
    const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
    
    // Safety check: if we filter and the current page is out of bounds, reset to 0
    useEffect(() => {
        if (currentPage >= totalPages && totalPages > 0) {
            setCurrentPage(0);
        }
    }, [totalPages, currentPage]);

    const currentSlice = filteredEntries.slice(
        currentPage * ITEMS_PER_PAGE, 
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    // 4. Lazy Load Images (Re-run whenever the slice changes)
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver((entriesObs) => {
            entriesObs.forEach(entryObs => {
                if (entryObs.isIntersecting) {
                    const id = parseInt(entryObs.target.getAttribute('data-id'));
                    loadCardImage(id);
                    observerRef.current.unobserve(entryObs.target);
                }
            });
        }, { root: null, rootMargin: '50px', threshold: 0.1 });

        currentSlice.forEach(entry => {
            const cardNode = cardsRef.current.get(entry.id);
            if (cardNode && !entry.imageLoaded) {
                observerRef.current.observe(cardNode);
            }
        });
    }, [currentSlice]);

    const loadCardImage = (id) => {
        GetEntryImage(id).then(img => {
            if (img) {
                setAllEntries(prev => prev.map(e => 
                    e.id === id ? { ...e, image: img, imageLoaded: true } : e
                ));
            }
        });
    };

    // Navigation Handlers
    const nextPage = () => {
        if (currentPage < totalPages - 1) setCurrentPage(p => p + 1);
    };

    const prevPage = () => {
        if (currentPage > 0) setCurrentPage(p => p - 1);
    };

    return (
        <div className="library-wrapper">
            {/* --- Header Toolbar --- */}
            <div className="library-toolbar">
                <div className="search-input-wrapper">
                    <input 
                        type="text" 
                        placeholder="Search Library..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                    <button>🔍</button>
                </div>

                <div className="sort-controls">
                    <label>Sort by:</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="number">Default</option>
                        <option value="rank">Rank</option>
                    </select>
                </div>
            </div>

            {/* --- The Shelf Area --- */}
            <div className="shelf-container">
                {/* Left Navigation Button */}
                <button 
                    className={`nav-arrow left ${currentPage === 0 ? 'disabled' : ''}`} 
                    onClick={prevPage}
                    disabled={currentPage === 0}
                >
                    ‹
                </button>

                {/* The Grid */}
                <div className="library-grid-7col">
                    {currentSlice.map(entry => (
                        <div 
                            key={entry.id} 
                            className="library-card"
                            onClick={() => onSelectSeries(entry)}
                            data-id={entry.id}
                            ref={node => {
                                if (node) cardsRef.current.set(entry.id, node);
                                else cardsRef.current.delete(entry.id);
                            }}
                        >
                            <div className="library-card-image-wrapper">
                                {entry.imageLoaded ? (
                                    <img 
                                        src={`data:image/jpeg;base64,${entry.image}`} 
                                        alt={entry.title} 
                                        className="fade-in"
                                    />
                                ) : (
                                    <div className="loading-placeholder">●</div>
                                )}
                                <div className="library-card-overlay">
                                    <span className={`rank-badge rank-${entry.rank.charAt(0)}`}>{entry.rank}</span>
                                </div>
                            </div>
                            <div className="library-card-title">{entry.title}</div>
                        </div>
                    ))}
                    
                    {/* Empty Slots Filler (keeps layout stable if less than 14 items) */}
                    {[...Array(ITEMS_PER_PAGE - currentSlice.length)].map((_, i) => (
                        <div key={`empty-${i}`} className="library-card placeholder"></div>
                    ))}
                </div>

                {/* Right Navigation Button */}
                <button 
                    className={`nav-arrow right ${currentPage >= totalPages - 1 ? 'disabled' : ''}`} 
                    onClick={nextPage}
                    disabled={currentPage >= totalPages - 1}
                >
                    ›
                </button>
            </div>

            {/* Page Indicator */}
            <div className="page-indicator">
                Page {currentPage + 1} of {totalPages || 1}
            </div>
        </div>
    );
}