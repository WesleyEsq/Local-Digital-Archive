import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown'; // Import Markdown renderer
import { 
    GetMediaGroups, GetMediaAssets, SaveMediaGroup, SaveMediaAsset, DeleteMediaGroup, DeleteMediaAsset 
} from '../../wailsjs/go/main/App';

export default function SeriesDetail({ entry, onBack }) {
    const [groups, setGroups] = useState([]);
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [assets, setAssets] = useState({}); 

    useEffect(() => {
        loadGroups();
    }, [entry.id]);

    const loadGroups = () => {
        GetMediaGroups(entry.id).then(res => setGroups(res || []));
    };

    const toggleGroup = (groupId) => {
        if (expandedGroupId === groupId) {
            setExpandedGroupId(null);
        } else {
            setExpandedGroupId(groupId);
            loadAssets(groupId);
        }
    };

    const loadAssets = (groupId) => {
        GetMediaAssets(groupId).then(res => {
            setAssets(prev => ({ ...prev, [groupId]: res || [] }));
        });
    };

    const handleCreateGroup = () => {
        const title = prompt("New Collection Title (e.g., 'Season 1', 'Volume 1'):");
        if (!title) return;
        const sortOrder = groups.length + 1;
        SaveMediaGroup({ entry_id: entry.id, title, category: 'volume', sort_order: sortOrder })
            .then(loadGroups);
    };

    const handleDeleteGroup = (id) => {
        if (confirm("Delete this collection and all its files?")) {
            DeleteMediaGroup(id).then(loadGroups);
        }
    };

    const handleFileUpload = (e, groupId) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result.split(',')[1];
            const assetPayload = {
                group_id: groupId,
                title: file.name.replace(/\.[^/.]+$/, ""), // Auto-strip extension for cleaner titles
                filename: file.name,
                mime_type: file.type,
                sort_order: (assets[groupId] || []).length + 1
            };
            SaveMediaAsset(assetPayload, base64).then(() => loadAssets(groupId));
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteAsset = (assetId, groupId) => {
        if (confirm("Delete this file?")) {
            DeleteMediaAsset(assetId).then(() => loadAssets(groupId));
        }
    };

    return (
        <div className="series-detail-container">
            {/* --- HERO SECTION --- */}
            <div className="series-hero">
                <button className="back-button-floating" onClick={onBack}>← Back</button>
                
                <div className="hero-content">
                    <img 
                        src={`data:image/jpeg;base64,${entry.image}`} 
                        className="hero-poster" 
                        alt="Poster"
                    />
                    <div className="hero-info">
                        <h1 className="hero-title">{entry.title}</h1>
                        
                        <div className="hero-meta-row">
                            <span className={`rank-badge rank-${entry.rank.charAt(0)}`}>Rank {entry.rank}</span>
                            <span className="meta-pill">Ordered as #{entry.number}</span>
                            {/* You could add more tags here later like "Completed", "Ongoing" */}
                        </div>

                        {/* Markdown Description with Alignment */}
                        <div 
                            className="hero-description markdown-content" 
                            style={{ textAlign: entry.textAlignment || 'left' }}
                        >
                            <ReactMarkdown>{entry.description || "*No description provided.*"}</ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>

            <div className="content-separator">
                <h2>Media Collections</h2>
                <button className="add-collection-btn" onClick={handleCreateGroup}>+ New Collection</button>
            </div>

            {/* --- COLLECTIONS LIST --- */}
            <div className="collections-grid">
                {groups.length === 0 && (
                    <div className="empty-collections-state">
                        <p>No volumes or seasons added yet.</p>
                    </div>
                )}

                {groups.map(group => (
                    <div key={group.id} className={`collection-card ${expandedGroupId === group.id ? 'expanded' : ''}`}>
                        <div className="collection-header" onClick={() => toggleGroup(group.id)}>
                            <div className="collection-title-wrapper">
                                <span className="collection-icon">
                                    {group.title.toLowerCase().includes('season') ? '📺' : '📖'}
                                </span>
                                <h3>{group.title}</h3>
                            </div>
                            <div className="collection-controls">
                                <span className="item-count">
                                    {expandedGroupId === group.id && assets[group.id] ? `${assets[group.id].length} items` : 'Expand'}
                                </span>
                                <button 
                                    className="delete-collection-btn"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                    title="Delete Collection"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {expandedGroupId === group.id && (
                            <div className="assets-container">
                                {assets[group.id] && assets[group.id].map((asset, index) => (
                                    <div key={asset.id} className="asset-track-row">
                                        <div className="track-index">{index + 1}</div>
                                        <div className="track-icon">
                                            {asset.mime_type.includes('pdf') ? '📄' : asset.mime_type.includes('video') ? '🎬' : '📁'}
                                        </div>
                                        <div className="track-info">
                                            <div className="track-title">{asset.title}</div>
                                            <div className="track-filename">{asset.filename}</div>
                                        </div>
                                        <div className="track-actions">
                                            <button className="track-action-btn download">Download</button>
                                            <button 
                                                className="track-action-btn delete"
                                                onClick={() => handleDeleteAsset(asset.id, group.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Upload Row */}
                                <label className="asset-upload-row">
                                    <div className="upload-icon">+</div>
                                    <span>Add File to {group.title}</span>
                                    <input type="file" onChange={(e) => handleFileUpload(e, group.id)} hidden />
                                </label>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}