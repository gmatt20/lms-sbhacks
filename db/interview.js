const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    detectionResultId: { type: mongoose.Schema.Types.ObjectId, ref: 'DetectionResult', required: true },
    
    // Interview data
    transcript: [{
        role: { type: String, enum: ['agent', 'user', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    
    // Interview questions and answers
    questions: [{
        question: { type: String, required: true },
        answer: { type: String },
        timestamp: { type: Date, default: Date.now }
    }],
    
    // Interview verdict (from Deepgram agent: LIKELY_CHEATED | UNCLEAR | LEGITIMATE)
    // Only stored if verdict is LIKELY_CHEATED or UNCLEAR (failed/unclear)
    verdict: {
        type: String,
        enum: ['LIKELY_CHEATED', 'UNCLEAR', 'LEGITIMATE'],
        required: true
    },
    
    // Verdict details from Deepgram agent
    verdictReason: String,
    confidenceScore: { type: Number, min: 0, max: 100 }, // Confidence in the verdict
    
    // Deepgram session information
    deepgramSessionId: String,
    interviewDuration: Number, // Duration in seconds
    
    // Interview metadata
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    
    // Review status (only stored if FAILED)
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Professor who reviewed
    reviewedAt: Date,
    reviewNotes: String,
    status: {
        type: String,
        enum: ['pending_review', 'reviewed', 'dismissed'],
        default: 'pending_review'
    }
});

// Index for efficient queries
interviewSchema.index({ submissionId: 1 });
interviewSchema.index({ studentId: 1, startedAt: -1 });
interviewSchema.index({ status: 1, startedAt: -1 });
interviewSchema.index({ reviewedBy: 1, status: 1 });

module.exports = mongoose.models.Interview || mongoose.model('Interview', interviewSchema);
