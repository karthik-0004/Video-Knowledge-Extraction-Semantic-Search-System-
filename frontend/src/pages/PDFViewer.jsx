import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Button } from '../components/Button';
import { videoAPI } from '../services/api';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import './PDFViewer.css';

export const PDFViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pdf, setPdf] = useState(null);
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            videoAPI.getVideo(id),
            videoAPI.getPDF(id)
        ])
            .then(([videoRes, pdfRes]) => {
                setVideo(videoRes.data);
                setPdf(pdfRes.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    const handleDownload = () => {
        if (pdf?.file) {
            const link = document.createElement('a');
            link.href = `http://localhost:8000${pdf.file}`;
            link.download = video?.title || 'document.pdf';
            link.click();
        }
    };

    const handleOpenNewTab = () => {
        if (pdf?.file) {
            window.open(`http://localhost:8000${pdf.file}`, '_blank');
        }
    };

    return (
        <AppLayout>
            <div className="pdf-viewer-page">
                <div className="pdf-header">
                    <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={20} />
                        Back
                    </Button>
                    <h2>{video?.title || 'PDF Viewer'}</h2>
                    <div className="pdf-actions">
                        <Button variant="secondary" onClick={handleOpenNewTab}>
                            <ExternalLink size={20} />
                            Open in New Tab
                        </Button>
                        <Button onClick={handleDownload}>
                            <Download size={20} />
                            Download PDF
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">Loading PDF...</div>
                ) : pdf ? (
                    <div className="pdf-container">
                        <iframe
                            src={`http://localhost:8000${pdf.file}#toolbar=1&navpanes=0&scrollbar=1`}
                            title="PDF Viewer"
                            className="pdf-frame"
                        />
                    </div>
                ) : (
                    <div className="error-state">
                        PDF not found or still generating. Please try again later.
                    </div>
                )}
            </div>
        </AppLayout>
    );
};
