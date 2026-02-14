import { useState, useEffect } from 'react';
import { 
    GetEntries, UpdateOrder, DeleteEntry, SaveEntry, 
    GetTagsForEntry 
} from '../../wailsjs/go/main/App';

export function useEntryList(isAddingNew, onAddComplete, refreshTrigger) {
    // --- STATE ---
    const [entries, setEntries] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Edit Mode State
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    
    // View Mode State
    const [expandedRowId, setExpandedRowId] = useState(null);
    
    // Tag State
    const [entryTags, setEntryTags] = useState({}); 
    const [tagModalTarget, setTagModalTarget] = useState(null);

    // --- EFFECTS ---
    useEffect(() => { refreshEntries(); }, [refreshTrigger]);

    useEffect(() => {
        if (isAddingNew) {
            const nextNum = entries.length > 0 ? String(entries.length + 1) : "1";
            startEditing({ 
                id: 'NEW', number: nextNum, title: '', comment: '', rank: '', description: '',
            });
        }
    }, [isAddingNew, entries.length]);

    // --- ACTIONS ---
    const refreshEntries = () => {
        // NOTE: For the prototype, we assume Library ID 1. 
        // Later, we'll pass the active libraryId from App.jsx
        GetEntries(1).then(res => setEntries(res || [])).catch(console.error);
    };

    const handleSearchKeyDown = (e, localSearch) => {
        if (e.key === 'Enter') setSearchQuery(localSearch);
    };

    const startEditing = (entry) => {
        setEditingId(entry.id);
        // Note: No more Base64 image payload in the edit form!
        setEditForm({ ...entry });
        setExpandedRowId(null); 
    };

    const cancelEditing = () => {
        setEditingId(null);
        if (isAddingNew && onAddComplete) onAddComplete();
    };

    const saveEdit = () => {
        // Backend now handles images separately. We just save the text data.
        SaveEntry(editForm).then(() => {
            setEditingId(null);
            if (isAddingNew && onAddComplete) onAddComplete();
            refreshEntries();
        }).catch(err => alert("Failed to save: " + err));
    };

    const handleDelete = (id) => {
        if (confirm("Delete this entry?")) {
            DeleteEntry(id).then(refreshEntries).catch(err => alert("Error: " + err));
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const reordered = Array.from(entries);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);

        const updated = reordered.map((e, index) => ({ ...e, number: String(index + 1) }));
        setEntries(updated);
        UpdateOrder(updated).catch(() => refreshEntries());
    };

    const handleRowClick = async (id) => {
        if (editingId) return;
        const isExpanding = expandedRowId !== id;
        setExpandedRowId(isExpanding ? id : null);
        
        if (isExpanding) {
            // We ONLY fetch tags now. The image is handled automatically by the browser!
            GetTagsForEntry(id).then(tags => {
                setEntryTags(prev => ({ ...prev, [id]: tags || [] }));
            });
        }
    };

    const refreshTags = (entryId) => {
        GetTagsForEntry(entryId).then(tags => {
            setEntryTags(prev => ({ ...prev, [entryId]: tags || [] }));
        });
    };

    const handleChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });
    const handleAlignment = (alignment) => setEditForm({ ...editForm, textAlignment: alignment });

    return {
        entries, editingId, editForm, expandedRowId, searchQuery, 
        entryTags, tagModalTarget,
        setSearchQuery, setTagModalTarget,
        refreshEntries, handleSearchKeyDown, startEditing, cancelEditing, saveEdit, 
        handleDelete, handleDragEnd, handleRowClick, refreshTags,
        handleChange, handleAlignment
    };
}