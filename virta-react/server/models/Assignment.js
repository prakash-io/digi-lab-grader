import mongoose from "mongoose";

const TestCaseSchema = new mongoose.Schema({
    input: { type: String, default: "" },
    expectedOutput: { type: String, default: "" },
    scale: { type: Number, default: 1 },
});

const AssignmentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        languages: {
            type: [String],
            default: ["python", "javascript", "java", "cpp", "c"],
        },
        timeLimit: {
            type: Number,
            default: 5000,
        },
        memoryLimit: {
            type: Number,
            default: 256,
        },
        ioSpec: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        constraints: {
            type: String,
            default: "",
        },
        publicTestCases: {
            type: [TestCaseSchema],
            default: [],
        },
        hiddenTestCases: {
            type: [TestCaseSchema],
            default: [],
        },
        teacherId: {
            // Intentionally String to simplify migration from old UUIDs
            type: String,
            required: true,
        },
        teacherName: {
            type: String,
            default: "Teacher",
        },
        dueDate: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Assignment", AssignmentSchema);
