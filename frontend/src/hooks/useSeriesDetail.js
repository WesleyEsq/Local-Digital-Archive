import { useState, useEffect } from 'react';
import { 
    GetGroupSets, GetFiles, CreateGroupSet, DeleteGroupSet, 
    DeleteFile, ExportMediaAsset, UpdateFileOrder, ImportFile 
} from '../../wailsjs/go/main/App';

export function useSeriesDetail(entryId) {
    const [groups, setGroups] = useState([]);
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [assets, setAssets] = useState({}); 
    const [uploadingGroupId, setUploadingGroupId] = useState(null);
    const [uploadProgress, setUploadProgress] = useState("");
    
    // Unified Viewer Context (Video, PDF, Epub)
    const [viewerContext, setViewerContext] = useState(null);

    useEffect(() => {
        if (entryId) loadGroups();
    }, [entryId]);

    const loadGroups = () => {
        GetGroupSets(entryId).then(res => setGroups(res || []));
    };

    const loadAssets = (groupId) => {
        GetFiles(groupId).then(res => {
            setAssets(prev => ({ ...prev, [groupId]: res || [] }));
        });
    };

    const toggleGroup = (groupId) => {
        if (expandedGroupId === groupId) {
            setExpandedGroupId(null);
        } else {
            setExpandedGroupId(groupId);
            // Lazy load assets only when the group is expanded
            if (!assets[groupId]) {
                loadAssets(groupId);
            }
        }
    };

    const handleCreateGroup = () => {
        const title = prompt("Enter new collection name (e.g., 'Season 1', 'Volume 1'):");
        if (title) {
            // "collection" is a generic category string
            CreateGroupSet(entryId, title, "collection")
                .then(() => loadGroups())
                .catch(err => alert("Error creating collection: " + err));
        }
    };

    const handleDeleteGroup = (groupId) => {
        if (confirm("Delete this entire collection and ALL its files? This cannot be undone.")) {
            DeleteGroupSet(groupId)
                .then(() => {
                    loadGroups();
                    setExpandedGroupId(null);
                })
                .catch(err => alert("Error deleting collection: " + err));
        }
    };

    // --- THE NEW NATIVE UPLOAD HANDLER ---
    const handleFileUpload = async (groupId) => {
        setUploadingGroupId(groupId);
        setUploadProgress("Waiting for OS File Picker...");
        
        try {
            // Wails pauses React here, opens the native OS dialog, 
            // and handles the heavy SQLite transaction securely in Go.
            await ImportFile(groupId); 
            loadAssets(groupId); // Refresh the UI list when done
        } catch (err) {
            alert("Upload failed: " + err);
        } finally {
            setUploadingGroupId(null);
            setUploadProgress("");
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const groupId = parseInt(result.source.droppableId.split('-')[1]);
        const groupAssets = Array.from(assets[groupId]);
        const [moved] = groupAssets.splice(result.source.index, 1);
        groupAssets.splice(result.destination.index, 0, moved);

        // Update sorting numbers
        const updatedAssets = groupAssets.map((asset, index) => ({
            ...asset,
            sort_order: index + 1
        }));

        setAssets(prev => ({ ...prev, [groupId]: updatedAssets }));
        UpdateFileOrder(updatedAssets).catch(() => loadAssets(groupId));
    };

    const handleDownload = (asset) => {
        // Triggers the native OS Save dialog via Go
        ExportMediaAsset(asset.id, asset.filename)
            .then(() => alert("Download Complete!"))
            .catch((err) => alert("Error: " + err));
    };

    const handleDeleteAsset = (assetId, groupId) => {
        if (confirm(`Delete this file?`)) {
            DeleteFile(assetId).then(() => loadAssets(groupId));
        }
    };

    // Unified Viewer Logic
    const handleView = (asset, groupAssets, index) => {
        const mime = asset.mime_type;
        if (mime.startsWith('video/')) {
            setViewerContext({ type: 'video', playlist: groupAssets, startIndex: index });
        } else if (mime === 'application/pdf') {
            setViewerContext({ type: 'pdf', asset: asset });
        } else if (mime === 'application/epub+zip') {
            setViewerContext({ type: 'epub', asset: asset });
        } else {
            alert("No viewer available for this file type.");
        }
    };

    const closeViewer = () => setViewerContext(null);

    return {
        groups, assets, expandedGroupId, uploadingGroupId, uploadProgress, viewerContext,
        toggleGroup, handleCreateGroup, handleDeleteGroup, handleFileUpload, 
        handleDragEnd, handleDownload, handleDeleteAsset, handleView, closeViewer
    };
}