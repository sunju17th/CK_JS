import User from '../models/User.js';
import jwt from 'jsonwebtoken';

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
        // Lấy dữ liệu từ body của request
        const { username, password, role, full_name } = req.body;

        // Kiểm tra username đã có trong database chưa
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Tạo user mới
        const user = await User.create({ username, password, role, full_name });

        // Nếu tạo thành công, trả dữ liệu user và token về cho client
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

        // Tìm user theo username
        const user = await User.findOne({ username });

        // Nếu user tồn tại và password khớp thì login thành công
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                username: user.username,
                role: user.role,
                full_name: user.full_name,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
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
            // Chỉ cập nhật nếu có dữ liệu mới gửi lên
            user.full_name = req.body.full_name || user.full_name;
            user.role = req.body.role || user.role;

            // Nếu có password mới thì cập nhật password
            if (req.body.password) {
                user.password = req.body.password;
            }

            // Lưu thay đổi vào database
            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                full_name: updatedUser.full_name,
                role: updatedUser.role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
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
