const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    professorId: { type: String, required: true }, // Clerk user ID
    semester: String,
    enrolledStudents: [{ type: String }], // Array of Clerk user IDs
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
courseSchema.index({ professorId: 1 });
courseSchema.index({ code: 1, semester: 1 });

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
