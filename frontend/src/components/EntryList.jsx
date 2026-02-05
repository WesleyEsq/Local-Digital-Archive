import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ReactMarkdown from 'react-markdown';
import { GetEntries, UpdateOrder, DeleteEntry, SaveEntry, GetEntryImage, DownloadBackup, ImportLegacyCSV } from '../../wailsjs/go/main/App';

const BLANK_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export default function EntryList({ isAddingNew, onAddComplete, refreshTrigger }) {
    const [entries, setEntries] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => { refreshEntries(); }, [refreshTrigger]);

    useEffect(() => {
        if (isAddingNew) {
            const nextNum = entries.length > 0 ? String(entries.length + 1) : "1";
            startEditing({ 
                id: 'NEW', number: nextNum, title: '', comment: '', rank: '', 
                description: '', image: BLANK_IMAGE_BASE64, textAlignment: 'center' 
            });
        }
    }, [isAddingNew]);

    const refreshEntries = () => {
        GetEntries(searchQuery).then(res => setEntries(res || [])).catch(console.error);
    };

    const handleSearchKeyDown = (e) => { if (e.key === 'Enter') refreshEntries(); };

    // --- Editors & Handlers ---
    const startEditing = async (entry) => {
        let fullEntry = { ...entry };
        if (entry.id !== 'NEW' && (!entry.image || entry.image === BLANK_IMAGE_BASE64)) {
            const img = await GetEntryImage(entry.id);
            if (img) fullEntry.image = img;
        }
        if (!fullEntry.textAlignment) fullEntry.textAlignment = 'center';

        setEditingId(entry.id);
        setEditForm(fullEntry);
        setExpandedRowId(entry.id);
    };

    const cancelEditing = () => {
        setEditingId(null); setEditForm({});
        if (isAddingNew) onAddComplete();
    };

    const saveEdit = () => {
        const payload = { ...editForm, id: editForm.id === 'NEW' ? 0 : editForm.id };
        SaveEntry(payload).then(() => {
            refreshEntries(); setEditingId(null);
            if (isAddingNew) onAddComplete();
        }).catch(err => alert(err));
    };

    const handleChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });
    const handleAlignment = (align) => setEditForm({ ...editForm, textAlignment: align });

    const handleImageFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setEditForm({ ...editForm, image: ev.target.result.split(',')[1] });
        reader.readAsDataURL(file);
    };

    const handleBackupFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setEditForm({ ...editForm, backup: ev.target.result.split(',')[1], backupName: file.name });
        reader.readAsDataURL(file);
    };

    const handleDelete = (id) => { if (window.confirm("Delete this entry?")) DeleteEntry(id).then(refreshEntries); };

    const handleDragEnd = (result) => {
        if (!result.destination || editingId || searchQuery !== "") return;
        const items = Array.from(entries);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        const updated = items.map((item, idx) => ({ ...item, number: String(idx + 1) }));
        setEntries(updated);
        UpdateOrder(updated).catch(alert);
    };

    const handleRowClick = async (id) => {
        if (editingId) return;
        const isExpanding = expandedRowId !== id;
        setExpandedRowId(isExpanding ? id : null);
        if (isExpanding) {
            const entry = entries.find(e => e.id === id);
            if (entry && (!entry.image || entry.image === BLANK_IMAGE_BASE64)) {
                const img = await GetEntryImage(id);
                if (img) setEntries(prev => prev.map(e => e.id === id ? { ...e, image: img } : e));
            }
        }
    };

    // --- Render Helpers ---
    // THE KEY FIX: Returning inputs (td > input) instead of divs
    const renderEditInputs = () => (
        <>
            <td><input name="number" className="inline-input" value={editForm.number} onChange={handleChange} style={{width: '50px'}}/></td>
            <td><input name="title" className="inline-input" value={editForm.title} onChange={handleChange} autoFocus /></td>
            <td><input name="comment" className="inline-input" value={editForm.comment} onChange={handleChange} /></td>
            <td><input name="rank" className="inline-input" value={editForm.rank} onChange={handleChange} style={{width: '60px'}}/></td>
            <td className="actions-cell">
                <button className="save-btn" onClick={(e) => { e.stopPropagation(); saveEdit(); }}>Save</button>
                <button className="cancel-btn" onClick={(e) => { e.stopPropagation(); cancelEditing(); }}>Cancel</button>
            </td>
        </>
    );

    const renderViewText = (entry) => (
        <>
            <td>{entry.number}</td>
            <td>{entry.title}</td>
            <td>{entry.comment}</td>
            <td>{entry.rank}</td>
            <td className="actions-cell">
                <button onClick={(e) => { e.stopPropagation(); startEditing(entry); }}>Edit</button>
                <button className="delete-button" onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}>Delete</button>
            </td>
        </>
    );

    // The expanded panel in edit mode (textarea + uploads)
    const renderEditDetailsPanel = () => (
        <div className="details-panel edit-mode">
            <div className="edit-image-section">
                <img src={`data:image/jpeg;base64,${editForm.image || BLANK_IMAGE_BASE64}`} className="details-image" alt="Cover" />
                <label className="file-upload-btn">
                    Change Cover
                    <input type="file" accept="image/*" onChange={handleImageFile} hidden />
                </label>
            </div>
            <div className="edit-text-section">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <label style={{fontWeight:'bold', color:'var(--ui-header)'}}>Description (Markdown)</label>
                    <div className="alignment-controls">
                        {['left', 'center', 'right', 'justify'].map(align => (
                            <button key={align} className={`align-btn ${editForm.textAlignment === align ? 'active' : ''}`} onClick={() => handleAlignment(align)}>
                                {align === 'justify' ? '≡' : align === 'left' ? '⇤' : align === 'right' ? '⇥' : '↔'}
                            </button>
                        ))}
                    </div>
                </div>
                <textarea name="description" value={editForm.description} onChange={handleChange} rows="8" placeholder="Markdown supported..." style={{fontFamily: 'monospace'}}/>
                <div className="edit-backup-section">
                    <label style={{fontWeight:'bold', color:'var(--ui-header)'}}>Backup File: </label>
                    <span className="file-name">{editForm.backupName || "None"}</span>
                    <label className="file-upload-btn small">
                        Upload File
                        <input type="file" onChange={handleBackupFile} hidden />
                    </label>
                </div>
            </div>
        </div>
    );

    return (
        <div className="main-content">
            <div className="search-container">
                <div className="search-input-wrapper">
                    <input type="text" placeholder="Search titles or comments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown} />
                    <button onClick={refreshEntries} title="Search">🔍</button>
                </div>
            </div>

            {(entries.length > 0 || isAddingNew) ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                    <table className="compendium-table">
                        <thead>
                            <tr>
                                <th style={{width: '40px'}}></th>
                                <th style={{width: '60px'}}>#</th>
                                <th>Title</th>
                                <th>Comment</th>
                                <th style={{width: '80px'}}>Rank</th>
                                <th style={{width: '140px'}}>Actions</th>
                            </tr>
                        </thead>
                        <Droppable droppableId="entries">
                            {(provided) => (
                                <tbody {...provided.droppableProps} ref={provided.innerRef}>
                                    {isAddingNew && editingId === 'NEW' && (
                                        <>
                                            <tr className="editing-row"><td className="drag-handle-cell">✨</td>{renderEditInputs()}</tr>
                                            <tr className="details-row editing-details"><td colSpan="6">{renderEditDetailsPanel()}</td></tr>
                                        </>
                                    )}
                                    {entries.map((entry, index) => (
                                        <React.Fragment key={entry.id}>
                                            <Draggable draggableId={String(entry.id)} index={index} isDragDisabled={!!editingId || searchQuery !== ""}>
                                                {(provided, snapshot) => (
                                                    <tr ref={provided.innerRef} {...provided.draggableProps} className={`${snapshot.isDragging ? 'dragging-row' : ''} ${editingId === entry.id ? 'editing-row' : ''}`} onClick={() => handleRowClick(entry.id)}>
                                                        <td className="drag-handle-cell" {...provided.dragHandleProps}>
                                                            {editingId !== entry.id && searchQuery === "" && (
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 6v12h-4v-12h4zm-6 0v12h-4v-12h4zm10 0v12h-4v-12h4z" /></svg>
                                                            )}
                                                        </td>
                                                        {editingId === entry.id ? renderEditInputs() : renderViewText(entry)}
                                                    </tr>
                                                )}
                                            </Draggable>
                                            {expandedRowId === entry.id && (
                                                <tr className="details-row">
                                                    <td colSpan="6">
                                                        {editingId === entry.id ? renderEditDetailsPanel() : (
                                                            <div className="details-panel">
                                                                <img src={`data:image/jpeg;base64,${entry.image || BLANK_IMAGE_BASE64}`} className="details-image" />
                                                                <div className="details-text">
                                                                    <div className="markdown-content" style={{ textAlign: entry.textAlignment || 'center' }}>
                                                                        <ReactMarkdown>{entry.description || "No description."}</ReactMarkdown>
                                                                    </div>
                                                                    {entry.backupName && <button className="download-button" onClick={() => DownloadBackup(entry.id)}>Download {entry.backupName}</button>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {provided.placeholder}
                                </tbody>
                            )}
                        </Droppable>
                    </table>
                </DragDropContext>
            ) : (
                <div className="empty-db-prompt">
                    {searchQuery ? <h3>No matches found.</h3> : <h3>Compendium is empty.</h3>}
                    {!searchQuery && <button className="import-button" onClick={ImportLegacyCSV}>Import CSV</button>}
                </div>
            )}
        </div>
    );
}