const courseSchema = new mongoose.Schema({
    professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true}
    name: { type: String, re}
})