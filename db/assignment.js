const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    originalPdfUrl: { type: String, required: true }, // URL/path to original PDF file
    originalPdfHash: { type: String }, // Hash of original PDF for verification
    dueDate: { type: Date, required: true },
    maxScore: { type: Number, default: 100 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
