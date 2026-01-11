const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    professorId: { type: String, required: true }, // Clerk user ID
    title: { type: String, required: true },
    description: String,
    instructions: { type: String, required: true },
    dueDate: { type: Date, required: true },
    maxScore: { type: Number, default: 100 },
    status: { type: String, enum: ['open', 'hidden', 'deleted'], default: 'open' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
assignmentSchema.index({ courseId: 1, dueDate: 1 });
assignmentSchema.index({ professorId: 1 });

module.exports = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);

