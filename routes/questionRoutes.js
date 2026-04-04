import express from 'express';
import {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion
} from '../controllers/questionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorize('teacher'), getQuestions)
    .post(protect, authorize('teacher'), createQuestion);

router.route('/:id')
    .get(protect, authorize('teacher'), getQuestionById)
    .put(protect, authorize('teacher'), updateQuestion)
    .delete(protect, authorize('teacher'), deleteQuestion);

export default router;
