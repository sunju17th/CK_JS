import Exam from '../models/Exam.js';
import ExamSession from '../models/ExamSession.js';

// Controller xử lý các kỳ thi và phiên thi
// - Giáo viên tạo, cập nhật, xóa kỳ thi
// - Sinh viên xem và tham gia kỳ thi

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private/Teacher
export const createExam = async (req, res) => {
    try {
        // Lấy dữ liệu kỳ thi từ body và gán teacher_id từ user đã đăng nhập
        const exam = new Exam({
            ...req.body,
            teacher_id: req.user._id,
        });

        const createdExam = await exam.save();
        res.status(201).json(createdExam);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all exams for the current user
// @route   GET /api/exams
// @access  Private
export const getExams = async (req, res) => {
    try {
        let exams;

        // Nếu là giáo viên, chỉ lấy các kỳ thi do giáo viên đó tạo
        if (req.user.role === 'teacher') {
            exams = await Exam.find({ teacher_id: req.user._id })
                .populate('questions', '-correct_answer'); // Lấy câu hỏi nhưng ẩn đáp án đúng
        }
        // Nếu là sinh viên, chỉ lấy các kỳ thi mà sinh viên đó được phép tham gia
        else if (req.user.role === 'student') {
            exams = await Exam.find({ allowed_students: req.user._id })
                .populate('questions', '-correct_answer'); // Lấy câu hỏi nhưng ẩn đáp án đúng
        } else {
            return res.status(403).json({ message: 'Vai trò người dùng không hợp lệ' });
        }

        res.json(exams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get exam details by ID
// @route   GET /api/exams/:id
// @access  Private
export const getExamById = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id)
            .populate('questions', '-correct_answer') // Ẩn đáp án đúng để bảo mật
            .populate('allowed_students', 'full_name username role');

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        res.json(exam);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update exam information
// @route   PUT /api/exams/:id
// @access  Private/Teacher
export const updateExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // Chỉ giáo viên tạo kỳ thi mới được sửa
        if (exam.teacher_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this exam' });
        }

        // Cập nhật các trường chỉ khi nhận được giá trị mới từ client
        exam.title = req.body.title || exam.title;
        exam.duration_minutes = req.body.duration_minutes || exam.duration_minutes;
        exam.start_time = req.body.start_time || exam.start_time;
        exam.end_time = req.body.end_time || exam.end_time;
        exam.questions = req.body.questions || exam.questions;
        exam.allowed_students = req.body.allowed_students || exam.allowed_students;

        const updatedExam = await exam.save();
        res.json(updatedExam);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an exam by ID
// @route   DELETE /api/exams/:id
// @access  Private/Teacher
export const deleteExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        if (exam.teacher_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this exam' });
        }

        await exam.deleteOne();
        res.json({ message: 'Exam removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Student joins an exam session
// @route   POST /api/exams/:id/join
// @access  Private/Student
export const joinExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // Kiểm tra xem sinh viên có nằm trong danh sách được phép tham gia
        const isAllowedStudent = exam.allowed_students.some((studentId) => studentId.toString() === req.user._id.toString());
        if (!isAllowedStudent) {
            return res.status(403).json({ message: 'Bạn không có quyền tham gia kỳ thi này.' });
        }

        // Kiểm tra xem kỳ thi có đang diễn ra hay không
        const now = new Date();
        if (now < exam.start_time || now > exam.end_time) {
            return res.status(403).json({ message: 'Kỳ thi hiện chưa bắt đầu hoặc đã kết thúc.' });
        }

        // Tìm xem sinh viên đã có session thi chưa
        // Nếu chưa có, tạo mới. Nếu có rồi thì trả về session cũ để tiếp tục.
        let session = await ExamSession.findOne({ exam_id: exam._id, student_id: req.user._id });
        if (!session) {
            session = await ExamSession.create({
                exam_id: exam._id,
                student_id: req.user._id,
                start_time: now,
                status: 'ongoing',
            });
        }

        res.status(200).json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
