import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Hàm tạo token JWT dùng để xác thực (authentication)
// khi người dùng đăng ký hoặc đăng nhập thành công.
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // token có hiệu lực 30 ngày
    });
};

// @desc    Đăng ký người dùng mới
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { username, password, role, full_name } = req.body;
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // TỰ TAY MÃ HÓA MẬT KHẨU TRƯỚC KHI TẠO USER
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Lưu user với mật khẩu đã mã hóa (hashedPassword)
        const user = await User.create({ 
            username, 
            password: hashedPassword, 
            role, 
            full_name 
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                role: user.role,
                full_name: user.full_name,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Đăng nhập và trả về token
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 1. Tìm user trong database
        const user = await User.findOne({ username });

        // 2. Nếu tìm thấy user, tiến hành so sánh mật khẩu bằng bcrypt
        if (user) {
            // bcrypt.compare(mật_khẩu_gửi_lên, mật_khẩu_đã_băm_trong_db)
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // Đăng nhập thành công
                res.json({
                    _id: user._id,
                    username: user.username,
                    role: user.role,
                    full_name: user.full_name,
                    token: generateToken(user._id),
                });
            } else {
                // Mật khẩu sai
                res.status(401).json({ message: 'Sai mật khẩu!' });
            }
        } else {
            // Không tìm thấy user
            res.status(401).json({ message: 'Tài khoản không tồn tại!' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Lấy danh sách tất cả người dùng
// @route   GET /api/users
// @access  Private/Teacher
export const getUsers = async (req, res) => {
    try {
        // Lấy tất cả user và bỏ trường password
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Lấy thông tin user theo ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res) => {
    try {
        // req.params.id là ID trong URL
        const user = await User.findById(req.params.id).select('-password');

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cập nhật thông tin user
// @route   PUT /api/users/:id
// @access  Private
export const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            // Kiểm tra: Nếu là sinh viên VÀ ID đang muốn sửa KHÔNG PHẢI ID của chính mình -> Báo lỗi ngay
            if (req.user.role === 'student' && req.user._id.toString() !== user._id.toString()) {
                return res.status(403).json({ message: 'Lỗi bảo mật: Bạn không có quyền sửa thông tin của người khác!' });
            }

            // 2. Cập nhật thông tin cơ bản
            user.full_name = req.body.full_name || user.full_name;
            
            // Chỉ giáo viên (teacher) mới có quyền đổi 'role' của tài khoản
            if (req.user.role === 'teacher' && req.body.role) {
                user.role = req.body.role;
            }

            // 4. Đổi mật khẩu 
            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(req.body.password, salt);
            }

            const updatedUser = await user.save();
            
            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                full_name: updatedUser.full_name,
                role: updatedUser.role,
            });
        } else {
            res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Xóa user theo ID
// @route   DELETE /api/users/:id
// @access  Private/Teacher
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            await user.deleteOne();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
