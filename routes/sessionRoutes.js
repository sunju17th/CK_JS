import express from 'express';
import {
    getSessions,
    getSessionById,
    addLog,
    submitSession,
    deleteSession
} from '../controllers/sessionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @openapi
 * /api/sessions:
 *   get:
 *     tags:
 *       - Sessions
 *     summary: Get exam sessions for the logged in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of exam sessions
 *       401:
 *         description: Unauthorized
 */
router.route('/')
    .get(protect, getSessions);

/**
 * @openapi
 * /api/sessions/{sessionId}/logs:
 *   post:
 *     tags:
 *       - Sessions
 *     summary: Add a proctoring log for a session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event_type:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Log added
 *       403:
 *         description: Forbidden
 */
router.post('/:sessionId/logs', protect, authorize('student'), addLog);

/**
 * @openapi
 * /api/sessions/{sessionId}/submit:
 *   post:
 *     tags:
 *       - Sessions
 *     summary: Submit answers for a session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_id:
 *                       type: string
 *                     selected_option:
 *                       type: string
 *     responses:
 *       200:
 *         description: Session submitted
 *       400:
 *         description: Invalid answers or session status
 */
router.post('/:sessionId/submit', protect, authorize('student'), submitSession);

/**
 * @openapi
 * /api/sessions/{id}:
 *   get:
 *     tags:
 *       - Sessions
 *     summary: Get a session by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session detail
 *       404:
 *         description: Session not found
 *   delete:
 *     tags:
 *       - Sessions
 *     summary: Delete a session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session removed
 *       404:
 *         description: Session not found
 */
router.route('/:id')
    .get(protect, getSessionById)
    .delete(protect, authorize('teacher'), deleteSession);

export default router;
