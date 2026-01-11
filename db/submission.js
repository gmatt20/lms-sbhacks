const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: String, required: true }, // Clerk user ID
    teacherId: { type: String, required: true }, // Clerk user ID of course professor
    submittedFileUrl: String,
    submittedText: String,
    submittedAt: { type: Date, default: Date.now },
    
    // Integrity checking results
    suspicionScore: Number, // e.g., 3/5 indicators found
    indicatorsFound: [{
        type: { type: String },
        evidence: String,
        location: String
    }],
    
    // Follow-up interview
    needsInterview: { type: Boolean, default: false },
    interviewCompleted: { type: Boolean, default: false },
    interviewTranscript: String,
    interviewRecordingUrl: String,
    
    // Grading
    status: { 
        type: String, 
        enum: ['submitted', 'analyzing', 'flagged', 'cleared', 'graded'], 
        default: 'submitted' 
    },
    score: Number,
    feedback: String,
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
submissionSchema.index({ assignmentId: 1, studentId: 1 });
submissionSchema.index({ studentId: 1, submittedAt: -1 });
submissionSchema.index({ teacherId: 1, needsInterview: 1 });

module.exports = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);

