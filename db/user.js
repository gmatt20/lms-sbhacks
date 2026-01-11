const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['professor', 'student'], required: true },
    school: String,
    createdAt: { type: Date, default: Date.now}
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);