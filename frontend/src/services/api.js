import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const videoAPI = {
    // Get all videos
    getVideos: () => api.get('/videos/'),

    // Get single video
    getVideo: (id) => api.get(`/videos/${id}/`),

    // Upload video
    uploadVideo: (file, onUploadProgress) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);

        return api.post('/videos/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress,
        });
    },

    // Get video status
    getVideoStatus: (id) => api.get(`/videos/${id}/status/`),

    // Query video
    queryVideo: (id, question) => api.post(`/videos/${id}/query/`, { question }),

    // Get PDF
    getPDF: (id) => api.get(`/videos/${id}/pdf/`),

    // Delete video
    deleteVideo: (id) => api.delete(`/videos/${id}/`),

    // Daily tracking endpoints
    getVideosByDate: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.days) queryParams.append('days', params.days);
        return api.get(`/videos/by_date/?${queryParams.toString()}`);
    },

    getDailyStats: (days = 30) => api.get(`/videos/daily_stats/?days=${days}`),

    getVideosForDate: (date) => api.get(`/videos/date_range/?date=${date}`),
};

export const profileAPI = {
    getStats: () => api.get('/profile/stats/'),
};

export default api;
