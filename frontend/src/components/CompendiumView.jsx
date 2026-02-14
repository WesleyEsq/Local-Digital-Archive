import React, { useState, useEffect } from 'react';
import { GetLibrary, UpdateLibrary, SetLibraryCover } from '../../wailsjs/go/main/App';

export default function CompendiumView({ libraryId }) {
    const [data, setData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (libraryId) refreshData();
    }, [libraryId]);

    const refreshData = () => {
        GetLibrary(libraryId).then(result => {
            setData(result);
            setFormData(result);
        }).catch(console.error);
    };

    const handleSave = () => {
        UpdateLibrary(formData).then(() => {
            refreshData();
            setIsEditing(false);
        }).catch(err => alert("Failed to save: " + err));
    };

    // Replaces the old FileReader with the native Wails OS dialog
    const handleUpdateCover = async () => {
        try {
            await SetLibraryCover(libraryId);
            // Add a timestamp to the state to force the <img> tag to bypass the browser cache
            setFormData(prev => ({ ...prev, _t: Date.now() })); 
        } catch (err) {
            console.error("Failed to update cover:", err);
        }
    };

    if (!data) return <div className="loading-state">Loading...</div>;

    return (
        <div className="about-container">
            <div className="about-card">
                <div className="about-image-section">
                    <img 
                        src={`/images/library/${libraryId}?t=${formData._t || Date.now()}`} 
                        alt={data.name} 
                        className="about-cover-image" 
                        onError={(e) => { e.target.src = '/default-cover.png'; }}
                    />
                </div>
                
                <div className="about-info-section">
                    <div className="about-header">
                        <div>
                            {/* Note: struct field is Name, not Title */}
                            <h1>{data.name}</h1>
                            <h3>by {data.author || "Unknown"}</h3>
                        </div>
                        <button className="edit-icon-btn" onClick={() => setIsEditing(true)} title="Edit Details">
                            ✎
                        </button>
                    </div>
                    <hr className="divider"/>
                    <p className="about-description" style={{ textAlign: 'justify' }}>
                        {data.description || "No description provided."}
                    </p>
                </div>
            </div>

            {/* --- PROFESSIONAL EDIT MODAL --- */}
            {isEditing && (
                <div className="modal-overlay">
                    <div className="modal-content pro-modal">
                        <div className="pro-modal-header">
                            <h2>Edit Compendium Details</h2>
                            <button className="close-x-btn" onClick={() => setIsEditing(false)}>×</button>
                        </div>
                        
                        <div className="pro-modal-body">
                            {/* LEFT COLUMN: IMAGE */}
                            <div className="pro-modal-image-col">
                                <label>Cover Art</label>
                                <div className="image-preview-wrapper">
                                    <img 
                                        src={`/images/library/${libraryId}?t=${formData._t || Date.now()}`} 
                                        alt="Preview" 
                                        onError={(e) => { e.target.src = '/default-cover.png'; }}
                                    />
                                    <div className="image-overlay-actions">
                                        {/* Swapped label/input for a direct Wails button */}
                                        <button className="upload-btn" onClick={handleUpdateCover} style={{cursor: 'pointer'}}>
                                            Change Image (OS)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: FORM */}
                            <div className="pro-modal-form-col">
                                <div className="form-group">
                                    <label>Library Name</label>
                                    <input 
                                        value={formData.name || ""} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        className="pro-input large"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Author / Curator</label>
                                    <input 
                                        value={formData.author || ""} 
                                        onChange={e => setFormData({...formData, author: e.target.value})} 
                                        className="pro-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea 
                                        value={formData.description || ""} 
                                        onChange={e => setFormData({...formData, description: e.target.value})} 
                                        className="pro-input"
                                        rows="8"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pro-modal-footer">
                            <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button className="save-btn" onClick={handleSave}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}