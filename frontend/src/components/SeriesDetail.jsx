import React from 'react';
import ReactMarkdown from 'react-markdown'; 
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSeriesDetail } from '../hooks/useSeriesDetail';

// Viewer Components
import MediaPlayer from './MediaPlayer';
import PDFViewer from './PDFViewer';
import EpubViewer from './EpubViewer';

// Icons
import { 
    ArrowLeft, Tv, BookOpen, FileText, Film, File, 
    PlayCircle, Eye, Download, Trash2, Plus, GripVertical, X 
} from 'lucide-react';

export default function SeriesDetail({ entry, onBack }) {
    // 1. Initialize the Controller
    const {
        groups, assets, expandedGroupId, uploadingGroupId, uploadProgress, viewerContext,
        toggleGroup, handleCreateGroup, handleDeleteGroup, handleFileUpload, 
        handleDragEnd, handleDownload, handleDeleteAsset, handleView, closeViewer
    } = useSeriesDetail(entry.id);

    return (
        <div className="series-detail-container">
            {/* --- HERO SECTION --- */}
            <div className="series-hero">
                <button className="back-button-floating" onClick={onBack}>
                    <ArrowLeft size={20} /> Back
                </button>
                
                <div className="hero-content">
                    {/* FIXED IMAGE SOURCE: Now using the high-speed handler */}
                    <img 
                        src={`/images/${entry.id}?t=${Date.now()}`} 
                        className="hero-poster" 
                        alt={entry.title} 
                        onError={(e) => {
                            e.target.src = '/default-cover.png'; 
                            e.target.style.opacity = '0.5';
                        }} 
                    />
                    
                    <div className="hero-info">
                        <h1 className="hero-title">{entry.title}</h1>
                        
                        <div className="hero-meta-row">
                            <span className={`rank-badge rank-${entry.rank.charAt(0)}`}>
                                {entry.rank}
                            </span>
                            <span className="meta-pill">#{entry.number}</span>
                            {/* Dynamic Icon based on content type guess */}
                            <span className="meta-icon">
                                {groups.some(g => g.title.toLowerCase().includes('season')) ? <Tv size={16}/> : <BookOpen size={24}/>}
                            </span>
                        </div>
                        
                        <div className="hero-description markdown-content" style={{ textAlign: entry.textAlignment || 'left' }}>
                            <ReactMarkdown>{entry.description || "*No description provided.*"}</ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>

            <div className="content-separator">
                <h2>Media Collections</h2>
                <button className="add-collection-btn" onClick={handleCreateGroup}>
                    <Plus size={18} /> New Collection
                </button>
            </div>

            {/* --- COLLECTIONS & ASSETS --- */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="collections-grid">
                    {groups.length === 0 && (
                        <div className="empty-collections-state">
                            <p>No volumes or seasons added yet.</p>
                        </div>
                    )}

                    {groups.map(group => (
                        <div key={group.id} className={`collection-card ${expandedGroupId === group.id ? 'expanded' : ''}`}>
                            {/* GROUP HEADER */}
                            <div className="collection-header" onClick={() => toggleGroup(group.id)}>
                                <div className="collection-title-wrapper">
                                    <span className="collection-icon">
                                        {group.title.toLowerCase().includes('season') ? <Tv size={20} /> : <BookOpen size={20} />}
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
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* EXPANDED CONTENT (ASSET LIST) */}
                            {expandedGroupId === group.id && (
                                <Droppable droppableId={`group-${group.id}`} type={`group-${group.id}`}>
                                    {(provided) => (
                                        <div 
                                            className="assets-container"
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                        >
                                            {assets[group.id] && assets[group.id].map((asset, index) => (
                                                <Draggable key={asset.id} draggableId={String(asset.id)} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div 
                                                            className={`asset-track-row ${snapshot.isDragging ? 'dragging' : ''}`}
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            style={provided.draggableProps.style}
                                                        >
                                                            {/* DRAG HANDLE */}
                                                            <div 
                                                                className="track-drag-handle"
                                                                {...provided.dragHandleProps}
                                                                title="Reorder"
                                                            >
                                                                <GripVertical size={16} color="#ccc" />
                                                            </div>

                                                            {/* INDEX */}
                                                            <div className="track-index">{index + 1}</div>

                                                            {/* FILE ICON */}
                                                            <div className="track-icon">
                                                                {asset.mime_type.includes('pdf') ? <FileText size={18} color="#e74c3c"/> : 
                                                                 asset.mime_type.includes('video') ? <Film size={18} color="#3498db"/> : 
                                                                 <File size={18} color="#95a5a6"/>}
                                                            </div>

                                                            {/* INFO */}
                                                            <div className="track-info">
                                                                <div className="track-title">{asset.title || asset.filename}</div>
                                                                <div className="track-filename">{asset.filename}</div>
                                                            </div>
                                                            
                                                            {/* ACTIONS */}
                                                            <div className="track-actions">
                                                                {/* View/Play */}
                                                                {(asset.mime_type.startsWith('video/') || 
                                                                  asset.mime_type === 'application/pdf' || 
                                                                  asset.mime_type === 'application/epub+zip') && (
                                                                    <button 
                                                                        className="track-action-btn play" 
                                                                        onClick={() => handleView(asset, assets[group.id], index)}
                                                                        title={asset.mime_type.startsWith('video/') ? "Play" : "Read"}
                                                                    >
                                                                        {asset.mime_type.startsWith('video/') ? <PlayCircle size={18}/> : <Eye size={18}/>}
                                                                        <span>{asset.mime_type.startsWith('video/') ? "Play" : "View"}</span>
                                                                    </button>
                                                                )}

                                                                {/* Download */}
                                                                <button 
                                                                    className="track-action-btn download"
                                                                    onClick={() => handleDownload(asset)}
                                                                    title="Download"
                                                                >
                                                                    <Download size={18} />
                                                                </button>
                                                                
                                                                {/* Delete */}
                                                                <button 
                                                                    className="track-action-btn delete"
                                                                    onClick={() => handleDeleteAsset(asset.id, group.id)}
                                                                    title="Delete File"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}

                                            {/* --- THE NEW OS UPLOAD BUTTON --- */}
                                            {uploadingGroupId === group.id ? (
                                                <div className="asset-upload-row loading" style={{ display: 'flex', justifyContent: 'center', padding: '15px' }}>
                                                    <div className="upload-spinner" style={{ marginRight: '10px' }}></div>
                                                    <span className="upload-text">
                                                        {uploadProgress}
                                                    </span>
                                                </div>
                                            ) : (
                                                <button 
                                                    className="asset-upload-row" 
                                                    onClick={() => handleFileUpload(group.id)}
                                                    style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}
                                                >
                                                    <Plus size={20} style={{ marginRight: '8px' }} />
                                                    <span>Add File to {group.title} via OS</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            )}
                        </div>
                    ))}
                </div>
            </DragDropContext>

            {/* --- VIEWER MODALS --- */}
            {viewerContext?.type === 'video' && <MediaPlayer playlist={viewerContext.playlist} startIndex={viewerContext.startIndex} onClose={closeViewer} />}
            {viewerContext?.type === 'pdf' && <PDFViewer asset={viewerContext.asset} onClose={closeViewer} />}
            {viewerContext?.type === 'epub' && <EpubViewer asset={viewerContext.asset} onClose={closeViewer} />}
        </div>
    );
}