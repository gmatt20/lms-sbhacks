const mongoose = require('mongoose');

const modifiedAssignmentSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, unique: true },
    modifiedInstructions: { type: String, required: true }, // Instructions with hidden traps/modifications (text)
    modifiedPdfUrl: { type: String }, // URL/path to PDF generated from modified instructions (generated after modifications)
    modifiedPdfHash: { type: String }, // Hash of modified PDF for verification
    // Store the modifications made (hidden markers/traps)
    modifications: [{
        originalText: { type: String, required: true }, // What appears visually in original instructions (e.g., "6 apples")
        modifiedText: { type: String, required: true }, // What appears when pasted to AI (e.g., "11 apples")
        position: {
            startIndex: Number, // Character position in text
            endIndex: Number,
            page: Number // PDF page if applicable
        },
        modificationType: { type: String, enum: ['number', 'word', 'phrase', 'character'], default: 'number' }
    }],
    totalModifications: { type: Number, required: true, default: 0 }, // Total count of modifications/traps
    // Gemini API integration
    geminiApiStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    geminiApiResponse: mongoose.Schema.Types.Mixed, // Store Gemini API response for reference
    pdfGenerationStatus: {
        type: String,
        enum: ['pending', 'generating', 'completed', 'failed'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ModifiedAssignment || mongoose.model('ModifiedAssignment', modifiedAssignmentSchema);
