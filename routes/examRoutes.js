import express from 'express';
import {
    createExam,
    getExams,
    getExamById,
    updateExam,
    deleteExam,
    joinExam
} from '../controllers/examController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getExams)
    .post(protect, authorize('teacher'), createExam);

router.post('/:id/join', protect, authorize('student'), joinExam);

router.route('/:id')
    .get(protect, getExamById)
    .put(protect, authorize('teacher'), updateExam)
    .delete(protect, authorize('teacher'), deleteExam);

export default router;
