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
// @access  Private (Teacher owner or Allowed Student)
export const getExamById = async (req, res) => {
    try {
        // 1. Tìm bài thi trước để lấy thông tin về chủ sở hữu và danh sách sinh viên
        const exam = await Exam.findById(req.params.id);

        if (!exam) {
            return res.status(404).json({ message: 'Không tìm thấy bài thi' });
        }

        // 2. KIỂM TRA QUYỀN TRUY CẬP
        const isTeacherOwner = req.user.role === 'teacher' && exam.teacher_id.toString() === req.user._id.toString();
        
        // Kiểm tra xem ID sinh viên có trong mảng allowed_students không
        const isAllowedStudent = req.user.role === 'student' && exam.allowed_students.includes(req.user._id);

        if (!isTeacherOwner && !isAllowedStudent) {
            return res.status(403).json({ message: 'Bạn không có quyền truy cập vào bài thi này' });
        }

        // 3. PHÂN TÁCH DỮ LIỆU TRẢ VỀ (Tối ưu cho từng đối tượng)
        let finalExam;

        if (isTeacherOwner) {
            // Nếu là giáo viên tạo đề: Cho phép xem toàn bộ, bao gồm cả đáp án đúng để họ kiểm tra đề
            finalExam = await Exam.findById(req.params.id)
                .populate('questions') 
                .populate('allowed_students', 'full_name username role');
        } else {
            // Nếu là sinh viên: Bắt buộc ẩn trường 'correct_answer'
            finalExam = await Exam.findById(req.params.id)
                .populate('questions', '-correct_answer')
                .populate('allowed_students', 'full_name username role');
        }

        res.json(finalExam);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update exam information
// @route   PUT /api/exams/:id
// @access  Private/Teacher (Chỉ giáo viên tạo kỳ thi mới được sửa)
export const updateExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (!exam) {
            return res.status(404).json({ message: 'Không tìm thấy bài thi' });
        }

        // Chỉ giáo viên tạo kỳ thi mới được sửa
        if (exam.teacher_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền sửa bài thi này' });
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
// @desc    Student joins an exam session
// @route   POST /api/exams/:id/join
export const joinExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Không tìm thấy bài thi' });

        const isAllowedStudent = exam.allowed_students.some((studentId) => studentId.toString() === req.user._id.toString());
        if (!isAllowedStudent) return res.status(403).json({ message: 'Bạn không có quyền tham gia kỳ thi này.' });

        const now = new Date();
        if (now < exam.start_time || now > exam.end_time) {
            return res.status(403).json({ message: 'Kỳ thi hiện chưa bắt đầu hoặc đã kết thúc.' });
        }

        let session = await ExamSession.findOne({ exam_id: exam._id, student_id: req.user._id });
        
        if (!session) {
            // LẦN ĐẦU VÀO THI
            session = await ExamSession.create({
                exam_id: exam._id,
                student_id: req.user._id,
                start_time: now,
                status: 'ongoing',
                violation_count: 0 // Khởi tạo số vi phạm
            });
            return res.status(200).json(session);
        } else {
            // TRƯỜNG HỢP VÀO LẠI (RESUME)
            // 1. Chặn ngay nếu bài đã nộp, bị hủy hoặc bị khóa
            if (session.status === 'submitted' || session.status === 'abandoned' || session.status === 'locked') {
                return res.status(403).json({ message: `Không thể vào thi. Trạng thái bài thi: ${session.status}` });
            }

            // 2. Ghi nhận vi phạm kết nối lại
            session.proctoring_logs.push({
                event_type: 'reconnected', // Đảm bảo đúng tên event trong enum của Model
                description: 'Kết nối lại sau khi bị gián đoạn/tải lại trang',
                timestamp: now
            });
            
            // 3. Tăng số đếm vi phạm
            session.violation_count += 1;

            // 4. KIỂM TRA KHÓA BÀI TỰ ĐỘNG
            if (session.violation_count >= exam.max_violations) {
                session.status = 'locked';
                session.submit_time = now;
                await session.save();
                
                return res.status(403).json({ 
                    message: 'BÀI THI BỊ KHÓA: Bạn đã vượt quá số lần vi phạm cho phép (Bao gồm cả việc tải lại trang/mất kết nối)!',
                    session: session // Trả về để frontend biết bài đã bị locked
                });
            }

            // 5. Nếu chưa vượt quá giới hạn thì lưu log và cho thi tiếp
            await session.save();
            return res.status(200).json(session);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};