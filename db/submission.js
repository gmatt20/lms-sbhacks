const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    modifiedAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ModifiedAssignment', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submittedFileUrl: { type: String, required: true }, // URL/path to student's submitted file
    submittedFileHash: { type: String }, // Hash of submitted file
    submittedText: { type: String }, // Extracted text from submission for analysis
    submittedAt: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['submitted', 'analyzing', 'analyzed', 'flagged'], 
        default: 'submitted' 
    },
    score: Number,
    feedback: String
});

// Index for efficient queries
submissionSchema.index({ assignmentId: 1, studentId: 1 });
submissionSchema.index({ studentId: 1, submittedAt: -1 });

module.exports = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
