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

/**
 * @openapi
 * /api/exams:
 *   get:
 *     tags:
 *       - Exams
 *     summary: Get all exams available for the logged in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of exams
 *       401:
 *         description: Unauthorized
 */
router.route('/')
    .get(protect, getExams)
    .post(protect, authorize('teacher'), createExam);

/**
 * @openapi
 * /api/exams:
 *   post:
 *     tags:
 *       - Exams
 *     summary: Create a new exam
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               duration_minutes:
 *                 type: number
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               questions:
 *                 type: array
 *                 items:
 *                   type: string
 *               allowed_students:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Exam created
 *       400:
 *         description: Invalid request
 */

// ========== CHI TIẾT BÀI THI ==========
/**
 * @openapi
 * /api/exams/{id}:
 *   get:
 *     tags:
 *       - Exams
 *     summary: Get exam details by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam details
 *       404:
 *         description: Exam not found
 *   put:
 *     tags:
 *       - Exams
 *     summary: Update exam information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Exam ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               duration_minutes:
 *                 type: number
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               questions:
 *                 type: array
 *                 items:
 *                   type: string
 *               allowed_students:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Exam updated
 *       404:
 *         description: Exam not found
 *   delete:
 *     tags:
 *       - Exams
 *     summary: Delete an exam by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam removed
 *       404:
 *         description: Exam not found
 */
router.route('/:id')
    .get(protect, getExamById)
    .put(protect, authorize('teacher'), updateExam)
    .delete(protect, authorize('teacher'), deleteExam);

/**
 * @openapi
 * /api/exams/{id}/sessions:
 *   get:
 *     tags:
 *       - Exams
 *     summary: Get existing exam session for a student
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam session details
 *       404:
 *         description: Exam not found
 */
router.route('/:id/sessions').get(protect, getExamSessions);

/**
 * @openapi
 * /api/exams/{id}/join:
 *   post:
 *     tags:
 *       - Exams
 *     summary: Join an exam session as a student
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Joined exam session
 *       403:
 *         description: Forbidden or exam not available
 */
router.post('/:id/join', protect, authorize('student'), joinExam);

export default router;
