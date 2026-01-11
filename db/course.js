const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    code: { type: String, required: true }, // e.g., "CS101"
    description: String,
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Enrolled students
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);