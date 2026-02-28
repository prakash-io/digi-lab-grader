import { api } from "./apiClient";

// Assignments
export const assignmentService = {
  async createAssignment(assignmentData) {
    try {
      const response = await api.post("/api/assignments", assignmentData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to create assignment");
      }
      throw error;
    }
  },

  async getAssignments() {
    try {
      const response = await api.get("/api/assignments");
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get assignments");
      }
      throw error;
    }
  },

  async getAssignment(id) {
    try {
      const response = await api.get(`/api/assignments/${id}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get assignment");
      }
      throw error;
    }
  },

  async getAssignmentsByTeacher(teacherId) {
    try {
      const response = await api.get(`/api/assignments/teacher/${teacherId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get teacher assignments");
      }
      throw error;
    }
  },

  async updateAssignment(id, assignmentData) {
    try {
      const response = await api.put(`/api/assignments/${id}`, assignmentData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to update assignment");
      }
      throw error;
    }
  },
};

// Submissions
export const submissionService = {
  async createSubmission(submissionData) {
    try {
      const response = await api.post("/api/submissions", submissionData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || error.response.data.error || "Failed to create submission");
      }
      throw new Error("Network error: Could not connect to server.");
    }
  },

  async getSubmission(id) {
    try {
      const response = await api.get(`/api/submissions/${id}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || error.response.data.error || "Failed to get submission");
      }
      throw new Error("Network error: Could not connect to server.");
    }
  },

  async getSubmissionsByAssignment(assignmentId) {
    try {
      const response = await api.get(`/api/submissions/assignment/${assignmentId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get submissions");
      }
      throw error;
    }
  },

  async getSubmissionsByStudent(studentId) {
    try {
      const response = await api.get(`/api/submissions/student/${studentId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get student submissions");
      }
      throw error;
    }
  },

  async updateSubmission(id, updates) {
    try {
      const response = await api.put(`/api/submissions/${id}`, updates);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to update submission");
      }
      throw error;
    }
  },
};

// Announcements
export const announcementService = {
  async createAnnouncement(announcementData) {
    try {
      const response = await api.post("/api/announcements", announcementData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to create announcement");
      }
      throw error;
    }
  },

  async getAnnouncements() {
    try {
      const response = await api.get("/api/announcements");
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get announcements");
      }
      throw error;
    }
  },
};

// Notifications
export const notificationService = {
  async getNotifications(userId) {
    try {
      const response = await api.get(`/api/notifications/user/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get notifications");
      }
      throw error;
    }
  },

  async markAsRead(notificationId) {
    try {
      const response = await api.put(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to mark notification as read");
      }
      throw error;
    }
  },

  async markAllAsRead(userId) {
    try {
      const response = await api.put(`/api/notifications/user/${userId}/read-all`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to mark all notifications as read");
      }
      throw error;
    }
  },
};

// Run Public Tests
export const runPublicService = {
  async runPublicTests(assignmentId, code, language) {
    try {
      const response = await api.post("/api/run-public", { assignmentId, code, language });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to run public tests");
      }
      throw error;
    }
  },
};

// Grades
export const gradeService = {
  async createOrUpdateGrade(gradeData) {
    try {
      const response = await api.post("/api/grades", gradeData);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to save grade");
      }
      throw error;
    }
  },

  async getGradesByAssignment(assignmentId) {
    try {
      const response = await api.get(`/api/grades/assignment/${assignmentId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get grades");
      }
      throw error;
    }
  },

  async getGradesByStudent(studentId) {
    try {
      const response = await api.get(`/api/grades/student/${studentId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get student grades");
      }
      throw error;
    }
  },
};

// Leaderboard
export const leaderboardService = {
  async getLeaderboard() {
    try {
      const response = await api.get("/api/leaderboard");
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || "Failed to get leaderboard");
      }
      throw new Error("Network error: Could not connect to server.");
    }
  },
};
