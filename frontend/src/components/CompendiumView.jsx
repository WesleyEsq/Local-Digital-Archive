import React, { useState, useEffect } from 'react';
import { GetCompendiumData, UpdateCompendiumData } from '../../wailsjs/go/main/App';

const BLANK_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export default function CompendiumView() {
    const [data, setData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        GetCompendiumData().then(result => {
            setData(result);
            setFormData(result);
        });
    };

    const handleSave = () => {
        UpdateCompendiumData(formData).then(() => {
            refreshData();
            setIsEditing(false);
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setFormData({ ...formData, image: ev.target.result.split(',')[1] });
        };
        reader.readAsDataURL(file);
    };

    if (!data) return <div className="loading-state">Loading...</div>;

    return (
        <div className="about-container">
            <div className="about-card">
                <div className="about-image-section">
                    <img 
                        src={`data:image/jpeg;base64,${data.image || BLANK_IMAGE_BASE64}`} 
                        alt={data.title} 
                        className="about-cover-image" 
                    />
                </div>
                
                <div className="about-info-section">
                    <div className="about-header">
                        <div>
                            <h1>{data.title}</h1>
                            <h3>by {data.author}</h3>
                        </div>
                        <button className="edit-icon-btn" onClick={() => setIsEditing(true)} title="Edit Details">
                            ✎
                        </button>
                    </div>
                    <hr className="divider"/>
                    <p className="about-description" style={{ textAlign: 'justify' }}>
                        {data.description}
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
                                    <img src={`data:image/jpeg;base64,${formData.image}`} alt="Preview" />
                                    <div className="image-overlay-actions">
                                        <label className="upload-btn">
                                            Change Image
                                            <input type="file" onChange={handleImageChange} hidden />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: FORM */}
                            <div className="pro-modal-form-col">
                                <div className="form-group">
                                    <label>Title</label>
                                    <input 
                                        value={formData.title} 
                                        onChange={e => setFormData({...formData, title: e.target.value})} 
                                        className="pro-input large"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Author / Circle</label>
                                    <input 
                                        value={formData.author} 
                                        onChange={e => setFormData({...formData, author: e.target.value})} 
                                        className="pro-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea 
                                        value={formData.description} 
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