import express from 'express';
import {
    createExam,
    getExams,
    getExamById,
    updateExam,
    deleteExam,
    joinExam,
    getExamSessions
} from '../controllers/examController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// ========== DANH SÁCH BÀI THI ==========
// GET  /api/exams          - Lấy tất cả bài thi (yêu cầu đăng nhập)
// POST /api/exams          - Tạo bài thi mới (chỉ giáo viên)
router.route('/')
    .get(protect, getExams)
    .post(protect, authorize('teacher'), createExam);

// ========== CHI TIẾT BÀI THI ==========
// GET    /api/exams/:id    - Lấy chi tiết 1 bài thi (yêu cầu đăng nhập)
// PUT    /api/exams/:id    - Cập nhật bài thi (chỉ giáo viên)
// DELETE /api/exams/:id    - Xoá bài thi (chỉ giáo viên)
router.route('/:id')
    .get(protect, getExamById)
    .put(protect, authorize('teacher'), updateExam)
    .delete(protect, authorize('teacher'), deleteExam);

router.route('/:id/sessions').get(protect,getExamSessions);

// ========== SINH VIÊN THAM GIA BÀI THI ==========
// POST /api/exams/:id/join - Sinh viên tham gia bài thi (chỉ sinh viên)
router.post('/:id/join', protect, authorize('student'), joinExam);

export default router;
