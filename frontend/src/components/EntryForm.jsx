import React, { useState, useEffect } from 'react';
import { SaveEntry, SetCoverImage } from '../../wailsjs/go/main/App';

export default function EntryForm({ entryToEdit, nextNumber, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        id: 0, 
        number: nextNumber, 
        title: '', 
        comment: '', 
        rank: '', 
        description: ''
    });

    useEffect(() => {
        if (entryToEdit) {
            const { image, backup, backupName, ...cleanData } = entryToEdit;
            setFormData(cleanData);
        }
    }, [entryToEdit]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleUpdateCover = async () => {
        if (formData.id) {
            try {
                await SetCoverImage(formData.id);
                // Trigger a re-render of the image by adding a timestamp query
                setFormData({ ...formData, _t: Date.now() }); 
            } catch (err) {
                console.error("Failed to update cover:", err);
            }
        }
    };

    const handleSubmit = () => {
        if (!formData.title) return alert("Title required");
        
        // Pass only the lightweight text data to Go
        SaveEntry(formData)
            .then(() => onSave())
            .catch(err => alert("Error saving entry: " + err));
    };

    return (
        <div className="sidebar-form">
            <h2>{entryToEdit ? `Edit #${formData.number}` : "Add New Entry"}</h2>
            
            <label>Number</label>
            <input type="number" name="number" value={formData.number} onChange={handleChange} />
            
            <label>Title</label>
            <input name="title" value={formData.title} onChange={handleChange} />
            
            <label>Comment</label>
            <textarea name="comment" value={formData.comment} onChange={handleChange} />
            
            <label>Rank</label>
            <input name="rank" value={formData.rank} onChange={handleChange} />
            
            <label>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="4"/>
            
            <div className="form-media-section">
                <label>Cover Image</label>
                {formData.id ? (
                    <div className="cover-edit-area">
                        <img 
                            src={`/images/${formData.id}?t=${formData._t || Date.now()}`} 
                            className="form-image-preview" 
                            alt="Cover preview"
                            onError={(e) => { e.target.src = '/default-cover.png'; }}
                        />
                        <button type="button" className="upload-btn" onClick={handleUpdateCover}>
                            Upload New Cover via OS
                        </button>
                    </div>
                ) : (
                    <div className="placeholder-note">
                        <em>Save this entry first to upload a cover image.</em>
                    </div>
                )}
            </div>

            <div className="form-media-section">
                <label>Media & Backups</label>
                <div className="placeholder-note">
                    <em>Use the Series Detail view to add media files and backups.</em>
                </div>
            </div>

            <div className="sidebar-actions">
                <button onClick={handleSubmit}>Save</button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}