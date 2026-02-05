import React, { useState, useEffect } from 'react';
import { SaveEntry } from '../../wailsjs/go/main/App';

const BLANK_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export default function EntryForm({ entryToEdit, nextNumber, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        id: 0, number: nextNumber, title: '', comment: '', rank: '', description: '',
        image: BLANK_IMAGE_BASE64, backup: null, backupName: ''
    });

    useEffect(() => {
        if (entryToEdit) {
            setFormData({ ...entryToEdit, image: entryToEdit.image || BLANK_IMAGE_BASE64, backup: null });
        }
    }, [entryToEdit]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    
    const handleImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setFormData({...formData, image: ev.target.result.split(',')[1]});
            reader.readAsDataURL(file);
        }
    };

    const handleBackup = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setFormData({...formData, backup: ev.target.result.split(',')[1], backupName: file.name});
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        if(!formData.title) return alert("Title required");
        SaveEntry(formData).then(() => onSave()).catch(err => alert(err));
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
            
            <label>Cover Image</label>
            <img src={`data:image/jpeg;base64,${formData.image}`} className="form-image-preview" />
            <input type="file" accept="image/*" onChange={handleImage} />
            
            <label>Backup File</label>
            <div className="backup-input-area">
                <span>{formData.backupName || "No file"}</span>
                <input type="file" onChange={handleBackup} />
            </div>

            <div className="sidebar-actions">
                <button onClick={handleSubmit}>Save</button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}