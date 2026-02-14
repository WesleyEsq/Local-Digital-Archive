import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ReactMarkdown from 'react-markdown';
import { ExportLibraryCSV, ImportLegacyCSV, SetCoverImage } from '../../wailsjs/go/main/App';
import { useEntryList } from '../hooks/useEntryList'; 
import TagSelectorModal from './TagSelectorModal';   
import { renderIcon } from '../utils/iconMap';       

// Icons
import { Plus, Search, FileDown, Upload, GripVertical, Pencil, Trash2, X, Check } from 'lucide-react';

export default function EntryList({ libraryId, isAddingNew, onAddComplete, refreshTrigger, onAddNew }) {
    const {
        entries, editingId, editForm, expandedRowId, searchQuery, 
        entryTags, tagModalTarget,
        setSearchQuery, setTagModalTarget,
        refreshEntries, handleSearchKeyDown, startEditing, cancelEditing, saveEdit, 
        handleDelete, handleDragEnd, handleRowClick, refreshTags,
        handleChange, handleAlignment
    } = useEntryList(isAddingNew, onAddComplete, refreshTrigger);

    // --- NATIVE OS UPLOAD HANDLER ---
    const handleUpdateCover = async (e, entryId) => {
        e.preventDefault();
        if (entryId === 'NEW' || !entryId) {
            return alert("Please save the text metadata first before uploading a cover.");
        }
        try {
            await SetCoverImage(entryId);
            refreshEntries(); // Force image cache refresh
        } catch (err) {
            console.error("Cover upload failed:", err);
        }
    };

    // 1. Tiny Tag Display (Renders inside the expanded view as requested)
    const renderTagList = (entryId) => {
        const tags = entryTags[entryId] || [];
        if (tags.length === 0) return (
            <div className="tag-row-display" style={{ marginBottom: '15px' }}>
                <button className="add-tag-tiny-btn" onClick={(e) => { e.stopPropagation(); setTagModalTarget(entryId); }}>+ Tag</button>
            </div>
        );

        const displayLimit = 5;
        const visibleTags = tags.slice(0, displayLimit);
        const remaining = tags.length - displayLimit;

        return (
            <div className="tag-row-display" style={{ marginBottom: '15px' }}>
                {visibleTags.map(tag => (
                    <span key={tag.id} className="mini-tag-pill" title={tag.description}>
                        {renderIcon(tag.icon, { size: 12, style: {marginRight: 4} })}
                        {tag.name}
                    </span>
                ))}
                {remaining > 0 && <span className="mini-tag-pill more">+{remaining}</span>}
                <button className="add-tag-tiny-btn" onClick={(e) => { e.stopPropagation(); setTagModalTarget(entryId); }}>+ Tag</button>
            </div>
        );
    };

    // 2. Edit Mode Row Inputs (Matches the 6-column layout)
    const renderEditInputs = () => (
        <>
            <td><input name="number" className="inline-input" value={editForm.number || ''} onChange={handleChange} style={{width: '50px'}}/></td>
            <td><input name="title" className="inline-input" value={editForm.title || ''} onChange={handleChange} autoFocus placeholder="Title" /></td>
            <td><input name="comment" className="inline-input" value={editForm.comment || ''} onChange={handleChange} placeholder="Comment" /></td>
            <td><input name="rank" className="inline-input" value={editForm.rank || ''} onChange={handleChange} style={{width: '60px'}}/></td>
           
            <td className="actions-cell">
                <button className="icon-action-btn save" onClick={(e) => { e.stopPropagation(); saveEdit(); }} title="Save">
                    <Check size={18} />
                </button>
                <button className="icon-action-btn cancel" onClick={(e) => { e.stopPropagation(); cancelEditing(); }} title="Cancel">
                    <X size={18} />
                </button>
            </td>
        </>
    );

    // 3. View Mode Row Text (Cleaned up: Alignment removed!)
    const renderViewText = (entry) => (
        <>
            <td className="rank-col" style={{textAlign: 'center'}}>{entry.number}</td>
            <td className="title-col" style={{ color: '#333', fontWeight: 'bold' }}>{entry.title}</td>
            <td className="comment-col" style={{ color: '#555', fontSize: '0.9em', maxWidth: '300px' }}>{entry.comment}</td>
            <td className="rank-text" style={{textAlign: 'center'}}>{entry.rank}</td>
            <td className="actions-cell">
                <button className="icon-action-btn edit" onClick={(e) => { e.stopPropagation(); startEditing(entry); }} title="Edit">
                    <Pencil size={18} />
                </button>
                <button className="icon-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }} title="Delete">
                    <Trash2 size={18} />
                </button>
            </td>
        </>
    );

    // 4. The Expanded Panel (Edit Mode)
    const renderEditDetailsPanel = () => (
        <div className="details-panel edit-mode">
            <div className="edit-image-section">
                <img 
                    src={`/images/${editForm.id}?t=${Date.now()}`} 
                    className="details-image" 
                    alt="Cover" 
                    onError={(e) => { e.target.src = '/default-cover.png'; }}
                />
                <button className="file-upload-btn" onClick={(e) => handleUpdateCover(e, editForm.id)}>
                    Change Cover (OS)
                </button>
            </div>
            <div className="edit-text-section">
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <label style={{fontWeight:'bold', color:'var(--ui-header)'}}>Description (Markdown)</label>
                    <div className="alignment-controls">
                        {['left', 'center', 'right', 'justify'].map(align => (
                            <button key={align} className={`align-btn ${editForm.textAlignment === align ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleAlignment(align); }}>
                                {align === 'justify' ? '≡' : align === 'left' ? '⇤' : align === 'right' ? '⇥' : '↔'}
                            </button>
                        ))}
                    </div>
                </div>

                <textarea name="description" value={editForm.description || ''} onChange={handleChange} rows="8" placeholder="Markdown supported..." style={{fontFamily: 'monospace'}}/>
                
            </div>
        </div>
    );

    return (
        <div className="main-content">
            <div className="entry-card" style={{ width: '100%' }}>
                
                {/* ACTION BAR */}
                <div className="list-action-bar">
                    <button className="action-rect-btn" onClick={onAddNew}>
                        <Plus size={18} />
                        <span>Add Entry</span>
                    </button>

                    <div className="search-bar-wrapper">
                        <input 
                            type="text" 
                            placeholder="Search titles or comments..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            onKeyDown={handleSearchKeyDown} 
                        />
                        <button className="search-icon-btn" onClick={refreshEntries} title="Search">
                            <Search size={18} />
                        </button>
                    </div>
                </div>

                {/* TABLE */}
                {(entries.length > 0 || isAddingNew) ? (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <table className="compendium-table">
                            <thead>
                                <tr>
                                    <th style={{width: '40px'}}></th>
                                    <th style={{width: '60px', textAlign: 'center'}}>#</th>
                                    <th>Title & Tags</th>
                                    <th style={{textAlign: 'center'}}>Comment</th>
                                    <th style={{width: '80px', textAlign: 'center'}}>Rank</th>
                                    {/* ALIGNMENT COLUMN REMOVED */}
                                    <th style={{width: '100px', textAlign: 'center'}}>Actions</th>
                                </tr>
                            </thead>
                            <Droppable droppableId="entries">
                                {(provided) => (
                                    <tbody {...provided.droppableProps} ref={provided.innerRef}>
                                        
                                        {/* ADD NEW ROW */}
                                        {isAddingNew && editingId === 'NEW' && (
                                            <>
                                                <tr className="editing-row"><td className="drag-handle-cell"><GripVertical size={16} /></td>{renderEditInputs()}</tr>
                                                {/* colSpan updated to 6 */}
                                                <tr className="details-row editing-details"><td colSpan="6">{renderEditDetailsPanel()}</td></tr>
                                            </>
                                        )}

                                        {/* LIST ROWS */}
                                        {entries.map((entry, index) => (
                                            <React.Fragment key={entry.id}>
                                                <Draggable draggableId={String(entry.id)} index={index} isDragDisabled={!!editingId || searchQuery !== ""}>
                                                    {(provided, snapshot) => (
                                                        <tr ref={provided.innerRef} {...provided.draggableProps} className={`${snapshot.isDragging ? 'dragging-row' : ''} ${editingId === entry.id ? 'editing-row' : ''}`} onClick={() => handleRowClick(entry.id)}>
                                                            <td className="drag-handle-cell" {...provided.dragHandleProps}>
                                                                {editingId !== entry.id && searchQuery === "" && (
                                                                    <div className="grip-icon"><GripVertical size={16} /></div>
                                                                )}
                                                            </td>
                                                            {editingId === entry.id ? renderEditInputs() : renderViewText(entry)}
                                                        </tr>
                                                    )}
                                                </Draggable>

                                                {/* EXPANDED DETAILS ROW (Edit Mode for existing items) */}
                                                {editingId === entry.id && entry.id !== 'NEW' && (
                                                    <tr className="details-row editing-details">
                                                        {/* colSpan updated to 6 */}
                                                        <td colSpan="6">{renderEditDetailsPanel()}</td>
                                                    </tr>
                                                )}
                                                
                                                {/* EXPANDED DETAILS ROW (View Mode) */}
                                                {expandedRowId === entry.id && !editingId && (
                                                    <tr className="expanded-details-row">
                                                        {/* colSpan updated to 6 */}
                                                        <td colSpan="6">
                                                            <div className="details-panel">
                                                                <img 
                                                                    src={`/images/${entry.id}`} 
                                                                    className="details-image" 
                                                                    alt="Cover"
                                                                    onError={(e) => { e.target.src = '/default-cover.png'; e.target.style.opacity = '0.5'; }}
                                                                />
                                                                <div className="details-text">
                                                                    {renderTagList(entry.id)}
                                                                    
                                                                    <h4 style={{ color: 'var(--ui-header)', marginTop: '5px' }}>Description</h4>
                                                                    <div className="markdown-content" style={{ textAlign: entry.textAlignment || 'justify' }}>
                                                                        <ReactMarkdown>{entry.description || "*No description provided.*"}</ReactMarkdown>
                                                                    </div>
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
                ) : (
                    <div className="empty-db-prompt">
                        {searchQuery ? <h3>No matches found.</h3> : <h3>Compendium is empty.</h3>}
                        {!searchQuery && (
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button 
                                    className="import-button" 
                                    onClick={() => {
                                        ImportLegacyCSV(libraryId).then(msg => {
                                            if (msg !== "Cancelled") refreshEntries();
                                        });
                                    }}
                                >
                                    <Upload size={18} style={{marginRight: '8px'}} /> Import CSV
                                </button>

                                <button 
                                    className="import-button" 
                                    style={{ background: 'transparent', color: 'var(--ui-header)', border: '2px solid var(--ui-header)' }}
                                    onClick={() => ExportLibraryCSV(libraryId).then(msg => { if(msg !== "Cancelled") alert(msg); })}
                                >
                                    <FileDown size={18} style={{marginRight: '8px'}} /> Export CSV Backup
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {tagModalTarget && (
                <TagSelectorModal 
                    entryId={tagModalTarget}
                    currentTags={entryTags[tagModalTarget] || []}
                    onClose={() => setTagModalTarget(null)}
                    onSave={() => refreshTags(tagModalTarget)}
                />
            )}
        </div>
    );
}