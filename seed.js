const mongoose = require("mongoose");

// IMPORT MODELS
const User = require("./db/user");
const Course = require("./db/course");
const Assignment = require("./db/assignment");
const ModifiedAssignment = require("./db/modifiedAssignment");
const Submission = require("./db/submission");
const DetectionResult = require("./db/detectionResult");

// CONNECT TO MONGODB
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://admin:JfxU7wYYrQEaAkXR@lms.atwxuvd.mongodb.net/?appName=lmsn";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await Promise.all([
      DetectionResult.deleteMany({}),
      Submission.deleteMany({}),
      ModifiedAssignment.deleteMany({}),
      Assignment.deleteMany({}),
      Course.deleteMany({}),
      User.deleteMany({})
    ]);

    // Create users
    const teacher = await User.create({
      name: "Test Teacher",
      email: "teacher@test.com",
      password: "hashedpassword123",
      role: "professor",
      school: "Test University"
    });

    const student = await User.create({
      name: "Test Student",
      email: "student@test.com",
      password: "hashedpassword123",
      role: "student",
      school: "Test University"
    });

    // Create course
    const course = await Course.create({
      professorId: teacher._id,
      name: "Introduction to Computer Science",
      code: "CS101",
      description: "An introductory course to computer science",
      students: [student._id]
    });

    // Create assignment
    const assignment = await Assignment.create({
      courseId: course._id,
      professorId: teacher._id,
      title: "AI Detection Test Assignment",
      description: "Test assignment for AI content detection",
      instructions: "Write a 500-word essay about artificial intelligence. Discuss its impact on society, benefits, and potential challenges. Make sure to include specific examples and cite your sources.",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      maxScore: 100,
      isPublished: true
    });

    // Create modified assignment with hidden traps
    const modifiedAssignment = await ModifiedAssignment.create({
      assignmentId: assignment._id,
      modifiedInstructions: "Write a 500-word essay about artificial intelligence. Discuss its impact on society, benefits, and potential challenges. Make sure to include specific examples and cite your sources.",
      modifiedPdfUrl: "https://example.com/modified-assignment.pdf",
      modifications: [
        {
          originalText: "500-word",
          modifiedText: "750-word",
          position: { startIndex: 6, endIndex: 14, page: 1 },
          modificationType: "number"
        },
        {
          originalText: "artificial intelligence",
          modifiedText: "machine learning",
          position: { startIndex: 46, endIndex: 68, page: 1 },
          modificationType: "phrase"
        }
      ],
      totalModifications: 2,
      geminiApiStatus: "completed",
      pdfGenerationStatus: "completed"
    });

    // Create submission
    const submission = await Submission.create({
      assignmentId: assignment._id,
      modifiedAssignmentId: modifiedAssignment._id,
      studentId: student._id,
      submittedFileUrl: "https://example.com/student-submission.pdf",
      submittedText: "Artificial intelligence is a rapidly evolving field...",
      status: "submitted"
    });

    // Create detection result
    await DetectionResult.create({
      submissionId: submission._id,
      assignmentId: assignment._id,
      modifiedAssignmentId: modifiedAssignment._id,
      studentId: student._id,
      detectedModifications: [
        {
          expectedOriginal: "500-word",
          expectedModified: "750-word",
          foundInSubmission: "750-word",
          matchType: "modified",
          confidence: 95,
          position: { page: 1, location: "First paragraph" }
        },
        {
          expectedOriginal: "artificial intelligence",
          expectedModified: "machine learning",
          foundInSubmission: "machine learning",
          matchType: "modified",
          confidence: 98,
          position: { page: 1, location: "Introduction" }
        }
      ],
      totalModificationsChecked: 2,
      matchesOriginal: 0,
      matchesModified: 2,
      matchesNeither: 0,
      aiDetectionScore: 100, // 100% matches modified (high AI likelihood)
      threshold: 70,
      thresholdExceeded: true,
      isFlagged: true,
      flagReason: "Score exceeded threshold - high likelihood of AI-generated content",
      confidenceLevel: "high"
    });

    console.log("🌱 Database seeded successfully!");
    console.log(`   - Created 2 users (1 professor, 1 student)`);
    console.log(`   - Created 1 course`);
    console.log(`   - Created 1 assignment`);
    console.log(`   - Created 1 modified assignment`);
    console.log(`   - Created 1 submission`);
    console.log(`   - Created 1 detection result`);
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seed();
