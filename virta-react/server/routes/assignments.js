import express from "express";
import Assignment from "../models/Assignment.js";
import { requireAuth, requireTeacher } from "../middleware/auth.js";
import { assignmentSchema } from "../utils/validation.js";

const router = express.Router();

// Create assignment (Teacher only)
router.post("/", requireAuth, requireTeacher, async (req, res) => {
  try {
    const validationResult = assignmentSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    const assignment = await Assignment.create({
      title: data.title,
      description: data.description,
      languages: data.languages,
      timeLimit: data.timeLimit,
      memoryLimit: data.memoryLimit,
      ioSpec: data.ioSpec || {},
      constraints: data.constraints || "",
      publicTestCases: data.publicTestCases,
      hiddenTestCases: data.hiddenTestCases || [],
      teacherId: req.user._id.toString(), // Securely pulled from Auth token, not body
      teacherName: req.user.username,
      dueDate: data.dueDate || null,
    });

    const io = req.app.locals.io;
    if (io) {
      const studentAssignment = { ...assignment.toObject(), hiddenTestCases: [] };
      io.to("all-students").emit("new-assignment", studentAssignment);
    }

    res.status(201).json({ success: true, assignment });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get all assignments
router.get("/", requireAuth, async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 }).lean();

    // If student, remove hidden test cases
    const filteredAssignments = assignments.map((assignment) => {
      if (req.user.userType === "student") {
        assignment.hiddenTestCases = [];
      }
      return assignment;
    });

    res.json({ success: true, assignments: filteredAssignments });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get assignment by ID
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).lean();

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    if (req.user.userType === "student") {
      assignment.hiddenTestCases = [];
    }

    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get assignments by teacher
router.get("/teacher/:teacherId", requireAuth, requireTeacher, async (req, res) => {
  try {
    // A teacher can only view their own assignments to fix IDOR
    if (req.user._id.toString() !== req.params.teacherId) {
      return res.status(403).json({ success: false, message: "Cannot view other teacher's assignments" });
    }

    const assignments = await Assignment.find({ teacherId: req.params.teacherId }).sort({ createdAt: -1 });
    res.json({ success: true, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Update assignment
router.put("/:id", requireAuth, requireTeacher, async (req, res) => {
  try {
    const validationResult = assignmentSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ success: false, errors: validationResult.error.errors });
    }

    // Ensure they own the assignment
    const existing = await Assignment.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Not found" });

    if (existing.teacherId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to edit this assignment" });
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { ...validationResult.data, teacherId: req.user._id.toString() },
      { new: true }
    );

    const io = req.app.locals.io;
    if (io) {
      const studentAssignment = { ...updatedAssignment.toObject(), hiddenTestCases: [] };
      io.to("all-students").emit("assignment-updated", studentAssignment);
    }

    res.json({ success: true, assignment: updatedAssignment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
