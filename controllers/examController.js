import Exam from '../models/Exam.js';
import ExamSession from '../models/ExamSession.js';

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private/Teacher
export const createExam = async (req, res) => {
    try {
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

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private
export const getExams = async (req, res) => {
    try {
        let exams;
        if (req.user.role === 'teacher') {
            exams = await Exam.find({ teacher_id: req.user._id }).populate('questions', '-correct_answer');
        } else if (req.user.role === 'student') {
            exams = await Exam.find({ allowed_students: req.user._id }).populate('questions', '-correct_answer');
        } else {
            return res.status(403).json({ message: 'Invalid user role' });
        }
        res.json(exams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }   
};

// @desc    Get exam by ID
// @route   GET /api/exams/:id
// @access  Private
export const getExamById = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id)
            .populate('questions', '-correct_answer') // Ẩn đáp án đúng cho bảo mật
            .populate('allowed_students', 'full_name username email');

        if (exam) {
            res.json(exam);
        } else {
            res.status(404).json({ message: 'Exam not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private/Teacher
export const updateExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (exam) {
            // Kiểm tra quyền chỉ chủ phòng mới sửa được
            if (exam.teacher_id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this exam' });
            }

            exam.title = req.body.title || exam.title;
            exam.duration_minutes = req.body.duration_minutes || exam.duration_minutes;
            exam.start_time = req.body.start_time || exam.start_time;
            exam.end_time = req.body.end_time || exam.end_time;
            exam.questions = req.body.questions || exam.questions;
            exam.allowed_students = req.body.allowed_students || exam.allowed_students;

            const updatedExam = await exam.save();
            res.json(updatedExam);
        } else {
            res.status(404).json({ message: 'Exam not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private/Teacher
export const deleteExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (exam) {
            if (exam.teacher_id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to delete this exam' });
            }
            await exam.deleteOne();
            res.json({ message: 'Exam removed' });
        } else {
            res.status(404).json({ message: 'Exam not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Sinh viên tham gia kỳ thi
// @route   POST /api/exams/:id/join
// @access  Private/Student
export const joinExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // Kiểm tra xem sinh viên có thuộc danh sách allowed_students không
        if (!exam.allowed_students.includes(req.user._id)) {
            return res.status(403).json({ message: 'Bạn không có quyền tham gia kỳ thi này.' });
        }

        // Kiểm tra thời gian
        const now = new Date();
        if (now < exam.start_time || now > exam.end_time) {
            return res.status(403).json({ message: 'Kỳ thi hiện chưa bắt đầu hoặc đã kết thúc.' });
        }

        // Kiểm tra xem student đã tham gia kỳ thi này chưa, nếu rồi lấy session tiếp tục thi
        let session = await ExamSession.findOne({ exam_id: exam._id, student_id: req.user._id });
        if (!session) {
            session = await ExamSession.create({
                exam_id: exam._id,
                student_id: req.user._id,
                start_time: now,
                status: 'ongoing'
            });
        }
        res.status(200).json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
