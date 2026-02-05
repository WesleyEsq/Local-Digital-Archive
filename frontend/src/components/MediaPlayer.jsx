import React from 'react';

export default function MediaPlayer({ asset, onClose }) {
    // The URL matches the handler we created in Go: /stream/{id}
    const streamUrl = `/stream/${asset.id}`;

    return (
        <div className="modal-overlay" onClick={onClose}>
            {/* Stop propagation so clicking the video doesn't close the modal */}
            <div className="media-modal" onClick={(e) => e.stopPropagation()}>
                
                <div className="media-modal-header">
                    <h3>{asset.title}</h3>
                    <button className="close-x-btn" onClick={onClose}>×</button>
                </div>

                <div className="video-wrapper">
                    <video 
                        controls 
                        autoPlay 
                        width="100%" 
                        height="100%"
                        style={{ display: 'block' }}
                    >
                        <source src={streamUrl} type={asset.mime_type} />
                        Your browser does not support the video tag.
                    </video>
                </div>

            </div>
        </div>
    );
}