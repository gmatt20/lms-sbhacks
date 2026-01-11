const mongoose = require('mongoose');

const modifiedAssignmentSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, unique: true },
    modifiedPdfUrl: { type: String, required: true }, // URL/path to modified PDF file
    modifiedPdfHash: { type: String }, // Hash of modified PDF for verification
    // Store the modifications made (hidden markers)
    modifications: [{
        originalText: { type: String, required: true }, // What appears visually (e.g., "6 apples")
        modifiedText: { type: String, required: true }, // What appears when pasted to AI (e.g., "11 apples")
        position: {
            page: { type: Number, required: true },
            x: Number, // X coordinate if needed
            y: Number  // Y coordinate if needed
        },
        modificationType: { type: String, enum: ['number', 'word', 'phrase', 'character'], default: 'number' }
    }],
    totalModifications: { type: Number, required: true, default: 0 }, // Total count of modifications
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ModifiedAssignment || mongoose.model('ModifiedAssignment', modifiedAssignmentSchema);
