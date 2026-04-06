import express from 'express';
import {
    registerUser,
    loginUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// ========== XÁC THỰC NGƯỜI DÙNG ==========
// POST /api/users/register - Đăng ký tài khoản mới (không cần đăng nhập)
// POST /api/users/login    - Đăng nhập (không cần đăng nhập)
router.post('/register', registerUser);
router.post('/login', loginUser);

// ========== DANH SÁCH NGƯỜI DÙNG ==========
// GET /api/users - Lấy danh sách tất cả user (chỉ giáo viên có quyền xem)
router.route('/')
    .get(protect, authorize('teacher'), getUsers);

// ========== CHI TIẾT NGƯỜI DÙNG ==========
// GET    /api/users/:id - Lấy thông tin 1 user (yêu cầu đăng nhập)
// PUT    /api/users/:id - Cập nhật thông tin user (yêu cầu đăng nhập)
// DELETE /api/users/:id - Xoá user (chỉ giáo viên)
router.route('/:id')
    .get(protect, getUserById)
    .put(protect, updateUser)
    .delete(protect, authorize('teacher'), deleteUser);

export default router;
