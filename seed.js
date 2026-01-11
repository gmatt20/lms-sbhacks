const mongoose = require("mongoose");

// IMPORT MODELS
const User = require("./db/user");
const Course = require("./db/course");
const Assignment = require("./db/assignment");
const ModifiedAssignment = require("./db/modifiedAssignment");
const Submission = require("./db/submission");
const DetectionResult = require("./db/detectionResult");
const Interview = require("./db/interview");

// CONNECT TO MONGODB
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://admin:JfxU7wYYrQEaAkXR@lms.atwxuvd.mongodb.net/?appName=lmsn";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data (in order to respect foreign key dependencies)
    await Promise.all([
      Interview.deleteMany({}),
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

    // Create detection result (score > 70% triggers interview)
    const detectionResult = await DetectionResult.create({
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
      aiDetectionScore: 100, // 100% matches modified (high AI likelihood) - triggers interview
      threshold: 70,
      thresholdExceeded: true,
      isFlagged: true,
      flagReason: "Score exceeded threshold - high likelihood of AI-generated content",
      confidenceLevel: "high"
    });

    // Create interview (only stored if student fails - verdict is LIKELY_CHEATED or UNCLEAR)
    // In this example, student failed the interview
    await Interview.create({
      submissionId: submission._id,
      assignmentId: assignment._id,
      studentId: student._id,
      detectionResultId: detectionResult._id,
      transcript: [
        {
          role: "agent",
          content: "I want to check you understand your assignment. Can you tell me, in your own words, what you wrote?",
          timestamp: new Date()
        },
        {
          role: "user",
          content: "I wrote about artificial intelligence and its impacts.",
          timestamp: new Date()
        },
        {
          role: "agent",
          content: "What was the main point you were trying to make?",
          timestamp: new Date()
        },
        {
          role: "user",
          content: "Um, I'm not really sure...",
          timestamp: new Date()
        }
      ],
      questions: [
        {
          question: "Can you summarize what you wrote in your own words?",
          answer: "I wrote about artificial intelligence and its impacts.",
          timestamp: new Date()
        },
        {
          question: "What was the main point you were trying to make?",
          answer: "Um, I'm not really sure...",
          timestamp: new Date()
        }
      ],
      verdict: "LIKELY_CHEATED", // Student failed interview - stored in database
      verdictReason: "Student was unable to explain main concepts from their submission",
      confidenceScore: 85,
      startedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      completedAt: new Date(),
      interviewDuration: 600, // 10 minutes in seconds
      status: "pending_review" // Waiting for professor review
    });

    console.log("🌱 Database seeded successfully!");
    console.log(`   - Created 2 users (1 professor, 1 student)`);
    console.log(`   - Created 1 course`);
    console.log(`   - Created 1 assignment`);
    console.log(`   - Created 1 modified assignment`);
    console.log(`   - Created 1 submission`);
    console.log(`   - Created 1 detection result (score: 100% - triggers interview)`);
    console.log(`   - Created 1 interview (verdict: LIKELY_CHEATED - stored for review)`);
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seed();
