const mongoose = require('mongoose');

const detectionResultSchema = new mongoose.Schema({
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, unique: true },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    modifiedAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ModifiedAssignment', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Detection analysis results
    detectedModifications: [{
        expectedOriginal: { type: String, required: true }, // What should be in original (e.g., "6 apples")
        expectedModified: { type: String, required: true }, // What should be in modified (e.g., "11 apples")
        foundInSubmission: { type: String, required: true }, // What was found in student submission
        matchType: { 
            type: String, 
            enum: ['original', 'modified', 'neither', 'partial'], 
            required: true 
        },
        confidence: { type: Number, min: 0, max: 100 }, // Confidence score (0-100)
        position: {
            page: Number,
            location: String // Description of where it was found
        }
    }],
    
    // Summary statistics
    totalModificationsChecked: { type: Number, required: true, default: 0 },
    matchesOriginal: { type: Number, default: 0 }, // Count of matches to original PDF
    matchesModified: { type: Number, default: 0 }, // Count of matches to modified PDF (AI-generated indicator)
    matchesNeither: { type: Number, default: 0 }, // Count of matches to neither
    
    // AI detection score
    aiDetectionScore: { 
        type: Number, 
        min: 0, 
        max: 100,
        required: true,
        default: 0
    }, // Percentage indicating likelihood of AI-generated content
    // Higher score = more likely AI-generated (more matches to modified instructions/PDF)
    
    // Threshold and flagging
    threshold: { type: Number, default: 70, min: 0, max: 100 }, // Score threshold for flagging (default 70%)
    thresholdExceeded: { type: Boolean, default: false }, // Whether score exceeded threshold
    isFlagged: { type: Boolean, default: false }, // Flagged if aiDetectionScore >= threshold
    flagReason: String,
    confidenceLevel: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'low' 
    },
    
    // Metadata
    analyzedAt: { type: Date, default: Date.now },
    analysisMethod: { type: String, default: 'text_comparison' }, // Method used for analysis
    rawAnalysisData: mongoose.Schema.Types.Mixed // Store raw analysis data for debugging
});

// Index for efficient queries
detectionResultSchema.index({ submissionId: 1 });
detectionResultSchema.index({ studentId: 1, analyzedAt: -1 });
detectionResultSchema.index({ isFlagged: 1, aiDetectionScore: -1 });

module.exports = mongoose.models.DetectionResult || mongoose.model('DetectionResult', detectionResultSchema);
