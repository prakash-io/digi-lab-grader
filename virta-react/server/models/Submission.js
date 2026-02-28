import mongoose from "mongoose";

const SubmissionSchema = new mongoose.Schema(
    {
        assignmentId: {
            type: String,
            required: true,
        },
        studentId: {
            type: String,
            required: true,
        },
        studentName: {
            type: String,
            default: "Student",
        },
        code: {
            type: String,
            required: true,
        },
        language: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "processing", "graded", "error"],
            default: "pending",
        },
        results: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        error: {
            type: String,
            default: null,
        },
        runtime: {
            type: Number,
            default: 0,
        },
        grade: {
            type: Number,
            default: 0,
        },
        graded: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Submission", SubmissionSchema);
