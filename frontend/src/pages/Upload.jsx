import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { ProcessingScreen } from '../components/ProcessingScreen';
import { videoAPI } from '../services/api';
import { Upload as UploadIcon, X } from 'lucide-react';
import './Upload.css';

export const Upload = () => {
    const navigate = useNavigate();
    const [uploadQueue, setUploadQueue] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState('uploaded');

    // Poll for status updates for processing items
    useEffect(() => {
        const processingItem = uploadQueue.find(item => item.status === 'processing');

        if (processingItem && processingItem.videoId) {
            setIsProcessing(true);
            const interval = setInterval(async () => {
                try {
                    const response = await videoAPI.getVideoStatus(processingItem.videoId);
                    const { status, processing_stage } = response.data;

                    if (processing_stage) {
                        setProcessingStage(processing_stage);
                    }

                    if (status === 'completed') {
                        clearInterval(interval);
                        navigate('/dashboard');
                    } else if (status === 'failed') {
                        clearInterval(interval);
                        setIsProcessing(false);
                        setUploadQueue(prev => prev.map(i =>
                            i.id === processingItem.id
                                ? { ...i, status: 'failed', message: 'Processing failed' }
                                : i
                        ));
                    }
                } catch (error) {
                    console.error('Error polling status:', error);
                }
            }, 2000); // Check every 2 seconds

            return () => clearInterval(interval);
        }
    }, [uploadQueue, navigate]);

    const onDrop = (acceptedFiles) => {
        acceptedFiles.forEach(file => {
            const item = {
                id: Date.now() + Math.random(),
                file,
                progress: 0,
                status: 'uploading',
                message: 'Uploading...'
            };

            setUploadQueue(prev => [...prev, item]);

            videoAPI.uploadVideo(file, (progressEvent) => {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadQueue(prev => prev.map(i =>
                    i.id === item.id ? { ...i, progress } : i
                ));
            })
                .then(res => {
                    // Update validation: backend response should contain video ID
                    const videoId = res.data.id;
                    setUploadQueue(prev => prev.map(i =>
                        i.id === item.id
                            ? { ...i, status: 'processing', message: 'Processing...', progress: 100, videoId }
                            : i
                    ));
                })
                .catch(err => {
                    setUploadQueue(prev => prev.map(i =>
                        i.id === item.id
                            ? { ...i, status: 'failed', message: err.message }
                            : i
                    ));
                });
        });
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm']
        },
        disabled: isProcessing // Disable dropzone while processing
    });

    const removeItem = (id) => {
        setUploadQueue(prev => prev.filter(i => i.id !== id));
    };

    return (
        <AppLayout>
            {isProcessing && (
                <ProcessingScreen
                    videos={[
                        '/assets/first.mp4',
                        '/assets/second.mp4'
                    ]}
                    processingStage={processingStage}
                />
            )}

            <div className="upload-page">
                <h1>Upload Video</h1>

                <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                    <input {...getInputProps()} />
                    <UploadIcon size={48} color="var(--primary)" />
                    <p className="dropzone-text">
                        {isDragActive ? 'Drop video here...' : 'Drag & drop video here or click to browse'}
                    </p>
                    <p className="dropzone-hint">Supported: MP4, MOV, AVI, MKV, WEBM</p>
                </div>

                {uploadQueue.length > 0 && (
                    <div className="upload-queue">
                        <h2>Upload Queue</h2>
                        {uploadQueue.map(item => (
                            <Card key={item.id} className="upload-item">
                                <div className="upload-item-content">
                                    <div className="upload-info">
                                        <div className="upload-filename">{item.file.name}</div>
                                        {item.status === 'uploading' && (
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: `${item.progress}%` }}></div>
                                            </div>
                                        )}
                                        <div className="upload-status">
                                            <Badge variant={
                                                item.status === 'failed' ? 'error' :
                                                    item.status === 'processing' ? 'warning' : 'info'
                                            }>
                                                {item.message}
                                            </Badge>
                                        </div>
                                    </div>
                                    <button
                                        className="remove-btn"
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
};
