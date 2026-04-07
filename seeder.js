import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs'; // 1. Bổ sung thư viện bcryptjs
import User from './models/User.js';
import Question from './models/Question.js';
import Exam from './models/Exam.js';
import ExamSession from './models/ExamSession.js';

// Cấu hình biến môi trường (để lấy chuỗi kết nối DB)
dotenv.config();

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/online_proctoring')
    .then(() => console.log('Đã kết nối MongoDB để Seeding'))
    .catch(err => console.log(err));

const importData = async () => {
    try {
        // 1. Dọn dẹp Database cũ
        await ExamSession.deleteMany();
        await Exam.deleteMany();
        await Question.deleteMany();
        await User.deleteMany();

        console.log('🧹 Đã xóa sạch dữ liệu cũ...');

        // 2. TẠO USERS (2 Giáo viên, 8 Sinh viên)
        // TỰ TAY BĂM MẬT KHẨU TRƯỚC KHI TẠO
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const usersData = [];
        for (let i = 1; i <= 2; i++) {
            usersData.push({ 
                username: `teacher${i}`, 
                password: hashedPassword, // Sử dụng mật khẩu đã băm
                role: 'teacher', 
                full_name: `Giảng viên ${i}` 
            });
        }
        for (let i = 1; i <= 8; i++) {
            usersData.push({ 
                username: `student${i}`, 
                password: hashedPassword, // Sử dụng mật khẩu đã băm
                role: 'student', 
                full_name: `Sinh viên ${i}` 
            });
        }
        
        // Lưu vào DB (Lúc này mật khẩu đã được mã hóa an toàn)
        const createdUsers = await User.insertMany(usersData);
        const teachers = createdUsers.filter(u => u.role === 'teacher');
        const students = createdUsers.filter(u => u.role === 'student');

        // 3. TẠO 20 CÂU HỎI JS
        const questionsData = [];
        for (let i = 1; i <= 20; i++) {
            questionsData.push({
                content: `Câu hỏi JavaScript số ${i}: Kết quả của biểu thức này là gì?`,
                options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
                correct_answer: 'Đáp án A', 
                points: 1
            });
        }
        const createdQuestions = await Question.insertMany(questionsData);

        // 4. TẠO 2 BÀI THI
        const now = new Date();
        const examsData = [
            {
                title: 'Thi Giữa Kỳ JavaScript',
                duration_minutes: 60,
                start_time: new Date(now.getTime() - 2 * 60 * 60 * 1000), 
                end_time: new Date(now.getTime() - 1 * 60 * 60 * 1000), 
                teacher_id: teachers[0]._id,
                questions: createdQuestions.slice(0, 10).map(q => q._id), 
                allowed_students: students.slice(0, 4).map(s => s._id) 
            },
            {
                title: 'Thi Cuối Kỳ JavaScript (Đang diễn ra)',
                duration_minutes: 90,
                start_time: new Date(now.getTime() - 30 * 60 * 1000), 
                end_time: new Date(now.getTime() + 60 * 60 * 1000), 
                teacher_id: teachers[1]._id,
                questions: createdQuestions.slice(10, 20).map(q => q._id), 
                allowed_students: students.map(s => s._id) 
            }
        ];
        const createdExams = await Exam.insertMany(examsData);
        const activeExam = createdExams[1]; 

        // 5. TẠO 6 PHIÊN THI (SESSION)
        const examQuestions = createdQuestions.slice(10, 20); 
        
        const perfectAnswers = examQuestions.map(q => ({ question_id: q._id, selected_option: 'Đáp án A', is_correct: true }));
        const badAnswers = examQuestions.map(q => ({ question_id: q._id, selected_option: 'Đáp án B', is_correct: false }));
        const halfAnswers = perfectAnswers.slice(0, 5); 

        const sessionsData = [
            {
                exam_id: activeExam._id, student_id: students[0]._id,
                status: 'submitted', start_time: new Date(now.getTime() - 25 * 60 * 1000), submit_time: now,
                total_score: 10, answers: perfectAnswers, proctoring_logs: []
            },
            {
                exam_id: activeExam._id, student_id: students[1]._id,
                status: 'submitted', start_time: new Date(now.getTime() - 20 * 60 * 1000), submit_time: now,
                total_score: 2, answers: badAnswers, 
                proctoring_logs: [
                    { event_type: 'window_blur', description: 'Rời chuột khỏi bài thi', timestamp: new Date() },
                    { event_type: 'reconnect', description: 'Kết nối lại sau mất kết nối', timestamp: new Date() }
                ]
            },
            {
                exam_id: activeExam._id, student_id: students[2]._id,
                status: 'ongoing', start_time: new Date(now.getTime() - 10 * 60 * 1000),
                total_score: 0, answers: halfAnswers, proctoring_logs: []
            },
            {
                exam_id: activeExam._id, student_id: students[3]._id,
                status: 'ongoing', start_time: new Date(now.getTime() - 15 * 60 * 1000),
                total_score: 0, answers: halfAnswers, 
                proctoring_logs: [
                    { event_type: 'tab_switch', description: 'Chuyển tab lần 1', timestamp: new Date(now.getTime() - 5*60000) },
                    { event_type: 'tab_switch', description: 'Chuyển tab lần 2', timestamp: new Date(now.getTime() - 2*60000) }
                ]
            },
            {
                exam_id: activeExam._id, student_id: students[4]._id,
                status: 'abandoned', start_time: new Date(now.getTime() - 29 * 60 * 1000),
                total_score: 0, answers: [], proctoring_logs: []
            },
            {
                exam_id: activeExam._id, student_id: students[5]._id,
                status: 'submitted', start_time: new Date(now.getTime() - 28 * 60 * 1000), submit_time: now,
                total_score: 8, answers: perfectAnswers.slice(0, 8), 
                proctoring_logs: [
                    { event_type: 'window_blur', description: 'Rời chuột khỏi bài thi', timestamp: new Date() }
                ]
            }
        ];

        await ExamSession.insertMany(sessionsData);

        console.log('✅ Đã nạp thành công:');
        console.log('- 10 Users (2 Teachers, 8 Students. Mật khẩu đã mã hóa: password123)');
        console.log('- 20 Câu hỏi');
        console.log('- 2 Bài thi (1 đã đóng, 1 đang mở)');
        console.log('- 6 Phiên thi với nhiều kịch bản log giám sát');
        process.exit();

    } catch (error) {
        console.error('❌ Lỗi khi import data:', error);
        process.exit(1);
    }
};

importData();