import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000,
});

export const getLearnerId = () => {
    if (typeof window !== 'undefined') return localStorage.getItem('learner_id');
    return null;
};

export const setLearnerId = (id) => {
    if (typeof window !== 'undefined') localStorage.setItem('learner_id', id);
};

export const getLearnerName = () => {
    if (typeof window !== 'undefined') return localStorage.getItem('learner_name') || 'Learner';
    return 'Learner';
};

export const setLearnerName = (name) => {
    if (typeof window !== 'undefined') localStorage.setItem('learner_name', name);
};

const handleResponse = async (request) => {
    try {
        const response = await request;
        return { data: response.data, error: null };
    } catch (error) {
        // Only log real API errors, not network/CORS failures (expected when backend not deployed)
        const msg = error.response?.data;
        const isNetworkIssue = error.code === 'ERR_NETWORK' || error.code === 'ERR_BAD_REQUEST'
            || !error.response || (typeof msg === 'object' && Object.keys(msg).length === 0);
        if (!isNetworkIssue) {
            console.error('API Error:', msg || error.message);
        }
        return {
            data: null,
            error: error.response?.data?.error || 'An unexpected error occurred.'
        };
    }
};

// Onboarding
export const registerUser = (userData) =>
    handleResponse(api.post('/auth/register', userData));

export const setGoal = (goalData) =>
    handleResponse(api.post('/onboarding/goal', goalData));

export const getAssessment = (learner_id) =>
    handleResponse(api.get(`/onboarding/assessment?learner_id=${learner_id}`));

export const submitAssessment = (data) =>
    handleResponse(api.post('/onboarding/assessment/answer', data));

// Dashboard
export const getDashboard = (learner_id) =>
    handleResponse(api.get(`/dashboard/${learner_id}`));

// Leitner
export const getDueConcepts = (learner_id) =>
    handleResponse(api.get(`/leitner/due?learner_id=${learner_id}`));

export const updateLeitnerBox = (data) =>
    handleResponse(api.post('/leitner/review', data));

// Constellation
export const getConstellation = (learner_id) =>
    handleResponse(api.get(`/constellation?learner_id=${learner_id}`));

// Episodes
export const getEpisode = (episode_id, learner_id, concept_id, is_revision = false, time_available = 30) => {
    const params = new URLSearchParams({
        is_revision: String(is_revision),
        time_available: String(time_available),
    });
    if (learner_id) params.set('learner_id', learner_id);
    if (concept_id) params.set('concept_id', concept_id || episode_id);
    return handleResponse(api.get(`/episodes/${episode_id}?${params.toString()}`));
};

export const postProgress = (episode_id, data) =>
    handleResponse(api.post(`/episodes/${episode_id}/progress`, data));

// Struggle & Mentor
export const signalStruggle = (data) =>
    handleResponse(api.post('/struggle/signal', data));

export const executeCode = (data) =>
    handleResponse(api.post('/code/execute', data));

export const getHint = (data) =>
    handleResponse(api.post('/mentor/hint', data));

// Bridge Sprint
export const generateSprint = (data) =>
    handleResponse(api.post('/bridge-sprint/generate', data));

// BKT
export const updateBKT = (data) =>
    handleResponse(api.post('/bkt/update', data));

// Video Generation (Nova Reel)
export const generateVideo = (data) =>
    handleResponse(api.post('/video/generate', data));

export const getVideoStatus = (invocation_arn) =>
    handleResponse(api.get(`/video/status?invocation_arn=${encodeURIComponent(invocation_arn)}`));

// Manim Animation Generation
export const generateManimVideo = (data) =>
    handleResponse(api.post('/video/generate', { ...data, type: 'manim' }));

export const getManimVideoStatus = (job_id) =>
    handleResponse(api.get(`/video/status?job_id=${encodeURIComponent(job_id)}`));

// D3 Visualizations
export const generateVisualizations = (data) =>
    handleResponse(api.post('/visualizations/generate', data));

// Notes from PDF/PPT upload
export const getUploadUrl = (file_name) =>
    handleResponse(api.get(`/notes/upload-url?file_name=${encodeURIComponent(file_name)}`));

export const generateNotesFromUpload = (data) =>
    handleResponse(api.post('/notes/generate', data));

// Presentation generation (slides + Polly audio per slide) — routed via /video/generate
export const generatePresentation = (data) =>
    handleResponse(api.post('/video/generate', { ...data, type: 'presentation' }));

// Audio narration (Polly)
export const generateAudio = (data) =>
    handleResponse(api.post('/audio/generate', data));
