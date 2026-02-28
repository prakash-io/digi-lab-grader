import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { submissionSchema } from "../utils/validation.js";
import { submissionQueue, setJobStatus, isQueueReady } from "../utils/jobQueue.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import { runCodeInSandbox, compareOutputs } from "../utils/sandbox.js";
import {
  analyzeComplexity,
  calculateCorrectnessScore,
  calculateEfficiencyScore,
  calculateCodeQualityScore,
  calculateTotalScore,
} from "../utils/scoring.js";
import { createOrUpdateGrade, updateUserScoreForAssignment } from "../utils/dataStorage.js";

// Fallback function to process submission synchronously (when Redis is not available)
async function processSubmissionSynchronously(submissionDoc, data) {
  try {
    submissionDoc.status = "processing";
    await submissionDoc.save();

    // Fetch assignment
    const assignment = await Assignment.findById(data.assignmentId).lean();
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Run public test cases
    const publicTestResults = [];
    const publicTestCases = assignment.publicTestCases || [];

    for (let i = 0; i < publicTestCases.length; i++) {
      const testCase = publicTestCases[i];
      const result = await runCodeInSandbox({
        code: data.code,
        language: data.language,
        input: testCase.input,
        timeLimit: assignment.timeLimit,
        memoryLimit: assignment.memoryLimit,
      });

      const passed = result.success && compareOutputs(result.stdout, testCase.expectedOutput);

      publicTestResults.push({
        testCaseIndex: i,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.stdout,
        passed,
        executionTime: result.executionTime,
        stderr: result.stderr,
        exitCode: result.exitCode,
        scale: testCase.scale || 1,
      });
    }

    // Run hidden test cases
    const hiddenTestResults = [];
    const hiddenTestCases = assignment.hiddenTestCases || [];

    for (let i = 0; i < hiddenTestCases.length; i++) {
      const testCase = hiddenTestCases[i];
      const result = await runCodeInSandbox({
        code: data.code,
        language: data.language,
        input: testCase.input,
        timeLimit: assignment.timeLimit,
        memoryLimit: assignment.memoryLimit,
      });

      const passed = result.success && compareOutputs(result.stdout, testCase.expectedOutput);

      hiddenTestResults.push({
        testCaseIndex: i,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.stdout,
        passed,
        executionTime: result.executionTime,
        stderr: result.stderr,
        exitCode: result.exitCode,
        scale: testCase.scale || 1,
      });
    }

    // Analyze complexity
    const allTestResults = [...publicTestResults, ...hiddenTestResults];
    const complexity = analyzeComplexity(allTestResults);

    // Calculate scores
    const correctnessScore = calculateCorrectnessScore(publicTestResults, hiddenTestResults);
    const efficiencyScore = calculateEfficiencyScore(complexity, allTestResults, null);
    const codeQuality = calculateCodeQualityScore(data.code, data.language);
    const totalScore = calculateTotalScore(correctnessScore, efficiencyScore.score, codeQuality.score);

    // Prepare results
    const results = {
      publicTestResults,
      hiddenTestResults,
      complexity,
      scores: {
        correctness: correctnessScore,
        efficiency: efficiencyScore,
        codeQuality: codeQuality.score,
        total: totalScore,
      },
      feedback: {
        correctness: `Passed ${publicTestResults.filter((r) => r.passed).length}/${publicTestResults.length} public tests and ${hiddenTestResults.filter((r) => r.passed).length}/${hiddenTestResults.length} hidden tests`,
        efficiency: `Complexity: ${complexity}. Efficiency score based on algorithm analysis.`,
        codeQuality: codeQuality.feedback.join("; "),
      },
      status: "completed",
      gradedAt: new Date().toISOString(),
    };

    // Calculate average runtime
    const avgRuntime = allTestResults.length > 0
      ? allTestResults.reduce((sum, r) => sum + (r.executionTime || 0), 0) / allTestResults.length
      : 0;

    // Update submission with results
    const gradeScore = totalScore * 10; // Convert to 0-100 scale

    submissionDoc.status = "graded";
    submissionDoc.results = results;
    submissionDoc.runtime = avgRuntime;
    submissionDoc.graded = true;
    submissionDoc.grade = gradeScore;
    await submissionDoc.save();

    // Create or update grade (Leaving legacy func here, ideally it goes to Mongo too)
    createOrUpdateGrade({
      assignmentId: data.assignmentId,
      submissionId: submissionDoc._id.toString(),
      studentId: data.studentId,
      grade: gradeScore,
      runtime: avgRuntime,
      teacherId: assignment.teacherId,
      feedback: JSON.stringify(results.feedback),
    });

    // Update user score in leaderboard (replace old score if exists)
    updateUserScoreForAssignment(data.studentId, data.assignmentId, gradeScore);
  } catch (error) {
    console.error("Synchronous processing error:", error);
    submissionDoc.status = "error";
    submissionDoc.error = error.message;
    submissionDoc.graded = false;
    await submissionDoc.save();
    throw error;
  }
}

const router = express.Router();

// Create submission (Student) - Enqueue for grading
router.post("/", requireAuth, async (req, res) => {
  try {
    // Validate request
    const validationResult = submissionSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    // Verify assignment exists and language is allowed
    const assignment = await Assignment.findById(data.assignmentId).lean();
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    let allowedLanguages = assignment.languages;
    if (!allowedLanguages || !Array.isArray(allowedLanguages)) {
      allowedLanguages = ["python"];
    }

    if (!allowedLanguages.includes(data.language)) {
      return res.status(400).json({
        success: false,
        message: `Language ${data.language} is not allowed for this assignment. Allowed languages: ${allowedLanguages.join(", ")}`,
      });
    }

    // Force studentId to be the authenticated user to prevent IDOR spoofing
    const submission = await Submission.create({
      assignmentId: data.assignmentId,
      studentId: req.user._id.toString(),
      studentName: req.user.username,
      code: data.code,
      language: data.language,
      status: "pending",
    });

    // Update submission status to processing
    submission.status = "processing";
    await submission.save();

    // Enqueue job for grading
    try {
      if (submissionQueue && typeof submissionQueue.add === "function" && isQueueReady()) {
        try {
          const job = await submissionQueue.add("grade-submission", {
            submissionId: submission._id.toString(),
            assignmentId: data.assignmentId,
            code: data.code,
            language: data.language,
            studentId: req.user._id.toString(),
          }, {
            jobId: submission._id.toString(),
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          });

          setJobStatus(submission._id.toString(), { status: "processing", jobId: job.id });
        } catch (queueError) {
          if (queueError.message && queueError.message.includes("Connection is closed")) {
            console.error("Redis connection closed. Processing submission synchronously as fallback.");
            await processSubmissionSynchronously(submission, data);
          } else {
            throw queueError;
          }
        }
      } else {
        console.warn("Redis queue not available. Processing submission synchronously as fallback.");
        await processSubmissionSynchronously(submission, data);
      }
    } catch (queueError) {
      console.error("Error adding job to queue:", queueError);
      try {
        await processSubmissionSynchronously(submission, data);
      } catch (syncError) {
        submission.status = "error";
        submission.error = syncError.message || "Failed to process submission. Please try again.";
        await submission.save();
      }
    }

    // Get updated submission status
    const updatedSubmission = await Submission.findById(submission._id).lean();

    res.status(201).json({
      success: true,
      message: updatedSubmission?.status === "graded"
        ? "Submission created and graded successfully"
        : "Submission created and queued for grading",
      submission: {
        id: updatedSubmission._id.toString(),
        status: updatedSubmission?.status || "pending",
        submittedAt: updatedSubmission.createdAt,
        results: updatedSubmission?.results || null,
      },
    });
  } catch (error) {
    console.error("Create submission error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get submissions by assignment
router.get("/assignment/:assignmentId", requireAuth, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Quick authorization check: If student, they can only see THEIR submissions
    let filter = { assignmentId };
    if (req.user.userType === "student") {
      filter.studentId = req.user._id.toString();
    } // Instructors can see all logic

    const submissions = await Submission.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, submissions });
  } catch (error) {
    console.error("Get submissions error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get submissions by student
router.get("/student/:studentId", requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // IDOR Check: Students can only query their own ID
    if (req.user.userType === "student" && req.user._id.toString() !== studentId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const submissions = await Submission.find({ studentId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, submissions });
  } catch (error) {
    console.error("Get student submissions error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get submission by ID
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findById(id).lean();

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    // IDOR Check
    if (req.user.userType === "student" && req.user._id.toString() !== submission.studentId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let jobStatus = "unknown";
    let progress = 0;

    if (submissionQueue && typeof submissionQueue.getJob === "function") {
      try {
        const job = await submissionQueue.getJob(id);
        if (job) {
          const state = await job.getState();
          jobStatus = state;
          progress = job.progress || 0;
        }
      } catch (queueError) {
        console.warn("Error getting job status:", queueError.message);
      }
    }

    const response = {
      id: submission._id.toString(),
      status: submission.status || jobStatus,
      submittedAt: submission.createdAt,
      progress,
    };

    if (submission.status === "graded" && submission.results) {
      response.results = submission.results;
      if (req.user.userType === "student" && response.results.hiddenTestResults) {
        response.results.hiddenTestResults = response.results.hiddenTestResults.map((test) => ({
          passed: test.passed,
          executionTime: test.executionTime,
        }));
      }
    }

    if (submission.status === "error" || submission.error) {
      response.error = submission.error;
    }

    res.json({ success: true, submission: response });
  } catch (error) {
    console.error("Get submission error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
