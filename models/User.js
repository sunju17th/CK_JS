import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Vui lòng nhập tên đăng nhập'],
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Vui lòng nhập mật khẩu'],
    },
    role: {
        type: String,
        enum: ['student', 'teacher'],
        default: 'student',
    },
    full_name: {
        type: String,
        required: [true, 'Vui lòng nhập họ và tên'],
    }
}, { timestamps: true });

// Middleware băm mật khẩu trước khi lưu
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Phương thức để kiểm tra mật khẩu (dùng cho controller đăng nhập)
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
