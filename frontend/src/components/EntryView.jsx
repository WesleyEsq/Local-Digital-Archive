import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GetEntries, UpdateOrder, DeleteEntry, GetEntryImage, DownloadBackup} from '../../wailsjs/go/main/App';

const BLANK_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export default function EntryList({ onEdit, refreshTrigger }) {
    const [entries, setEntries] = useState([]);
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [loadingImage, setLoadingImage] = useState(false);

    useEffect(() => {
        refreshEntries();
    }, [refreshTrigger]); // Refreshes when parent tells it to

    const refreshEntries = () => {
        GetEntries().then(res => setEntries(res || [])).catch(console.error);
    };

    const loadEntryImage = async (id) => {
        setLoadingImage(true);
        try {
            const img = await GetEntryImage(id);
            if (img) {
                setEntries(prev => prev.map(e => e.id === id ? { ...e, image: img } : e));
            }
        } finally {
            setLoadingImage(false);
        }
    };

    const handleRowClick = (id) => {
        const isExpanding = expandedRowId !== id;
        setExpandedRowId(isExpanding ? id : null);
        if (isExpanding) {
            const entry = entries.find(e => e.id === id);
            if (entry && !entry.image) loadEntryImage(id);
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(entries);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        const updated = items.map((item, idx) => ({ ...item, number: String(idx + 1) }));
        setEntries(updated);
        UpdateOrder(updated).catch(err => { alert(err); refreshEntries(); });
    };

    const handleDelete = (id) => {
        if (window.confirm("Delete this entry?")) {
            DeleteEntry(id).then(refreshEntries);
        }
    };
    

    if (entries.length === 0) {
         return (
            <div className="main-content">
                <div className="empty-db-prompt">
                    <h3>Compendium is empty.</h3>
                </div>
            </div>
         )
    }

    return (
        <div className="main-content">
            <DragDropContext onDragEnd={handleDragEnd}>
                <table className="compendium-table">
                    <thead>
                        <tr>
                            <th className="drag-handle-header"></th>
                            <th>#</th>
                            <th>Title</th>
                            <th>Comment</th>
                            <th>Rank</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <Droppable droppableId="entries">
                        {(provided) => (
                            <tbody {...provided.droppableProps} ref={provided.innerRef}>
                                {entries.map((entry, index) => (
                                    <React.Fragment key={entry.id}>
                                        <Draggable draggableId={String(entry.id)} index={index}>
                                            {(provided, snapshot) => (
                                                <tr
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={snapshot.isDragging ? 'dragging-row' : ''}
                                                    onClick={() => handleRowClick(entry.id)}
                                                >
                                                    <td className="drag-handle-cell" {...provided.dragHandleProps}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 6v12h-4v-12h4zm-6 0v12h-4v-12h4zm10 0v12h-4v-12h4z" /></svg>
                                                    </td>
                                                    <td>{entry.number}</td>
                                                    <td>{entry.title}</td>
                                                    <td>{entry.comment}</td>
                                                    <td>{entry.rank}</td>
                                                    <td className="actions-cell">
                                                        <button onClick={(e) => { e.stopPropagation(); onEdit(entry); }}>Edit</button>
                                                        <button className="delete-button" onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}>Delete</button>
                                                    </td>
                                                </tr>
                                            )}
                                        </Draggable>
                                        {expandedRowId === entry.id && (
                                            <tr className="details-row">
                                                <td colSpan="6">
                                                    <div className="details-panel">
                                                        <img src={`data:image/jpeg;base64,${entry.image || BLANK_IMAGE_BASE64}`} className="details-image" />
                                                        <div className="details-text">
                                                            <h4>Description</h4>
                                                            <p>{entry.description}</p>
                                                            {entry.backupName && (
                                                                <button className="download-button" onClick={() => DownloadBackup(entry.id)}>
                                                                    Download {entry.backupName}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
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
        </div>
    );
}