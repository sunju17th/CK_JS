import ExamSession from '../models/ExamSession.js';
import Question from '../models/Question.js';

// Controller xử lý các phiên thi (exam sessions)
// Bao gồm: lấy danh sách, chi tiết, thêm log gian lận, nộp bài, xóa phiên

// @desc    Lấy danh sách các phiên thi
// @route   GET /api/sessions
// @access  Private
export const getSessions = async (req, res) => {
    try {
        // Thiết lập phân trang: số lượng mỗi trang và trang hiện tại
        const pageSize = Number(req.query.limit) || 10;
        const page = Number(req.query.page) || 1;

        // Xây dựng query: nếu là sinh viên, chỉ lấy phiên thi của mình
        let query = {};
        if (req.user.role === 'student') {
            query.student_id = req.user._id;
        }

        // Đếm tổng số phiên thi phù hợp
        const count = await ExamSession.countDocuments(query);
        // Lấy danh sách phiên thi với populate thông tin đề thi
        const sessions = await ExamSession.find(query)
            .populate('exam_id', 'title')  // Chỉ lấy tiêu đề đề thi
            .limit(pageSize)
            .skip(pageSize * (page - 1));  // Bỏ qua các trang trước

        // Trả về kết quả với thông tin phân trang
        res.json({ sessions, page, pages: Math.ceil(count / pageSize), total: count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Lấy chi tiết phiên thi theo ID
// @route   GET /api/sessions/:id
// @access  Private
export const getSessionById = async (req, res) => {
    try {
        // Tìm phiên thi và populate thông tin đề thi và sinh viên
        const session = await ExamSession.findById(req.params.id)
            .populate('exam_id')  // Lấy toàn bộ thông tin đề thi
            .populate('student_id', 'full_name username role');  // Lấy thông tin cơ bản của sinh viên
        
        // Kiểm tra tồn tại phiên thi
        if (!session) return res.status(404).json({ message: 'Session not found' });
        
        // Kiểm tra quyền: sinh viên chỉ xem được phiên thi của chính mình
        if (req.user.role === 'student' && session.student_id._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Không có quyền xem phiên thi này' });
        }
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Ghi nhận log gian lận (proctoring log)
// @route   POST /api/sessions/:sessionId/logs
// @access  Private/Student
export const addLog = async (req, res) => {
    try {
        // Tìm phiên thi
        const session = await ExamSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        
        // Kiểm tra quyền: chỉ sinh viên sở hữu phiên thi mới được thêm log
        if (session.student_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Lấy dữ liệu từ request body
        const { event_type, description } = req.body;
        
        // Cập nhật phiên thi: thêm log vào mảng và tăng số lần vi phạm
        await ExamSession.updateOne(
            { _id: session._id },
            { 
                $push: { proctoring_logs: { event_type, description, timestamp: Date.now() } },  // Thêm log mới
                $inc: { violation_count: 1 }  // Tăng số vi phạm
            }
        );

        res.status(200).json({ message: 'Proctoring Log added' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Nộp bài thi và tự động chấm điểm
// @route   POST /api/sessions/:sessionId/submit
// @access  Private/Student
export const submitSession = async (req, res) => {
    try {
        // Tìm phiên thi
        const session = await ExamSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // Xác thực quyền: chỉ sinh viên sở hữu phiên thi mới được nộp
        if (session.student_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Chặn nộp bài nhiều lần: chỉ cho phép nộp nếu trạng thái là 'ongoing'
        if (session.status !== 'ongoing') {
            return res.status(400).json({ message: 'Bài thi này đã được nộp hoặc bị hủy' });
        }

        // Lấy dữ liệu bài làm từ frontend: mảng các câu trả lời
        const { answers } = req.body; // Dữ liệu FE gửi: [{ question_id, selected_option }]
        
        // Kiểm tra dữ liệu hợp lệ
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: 'Dữ liệu bài làm không hợp lệ' });
        }

        // QUY TRÌNH CHẤM ĐIỂM TỐI ƯU HÓA:
        // 1. TỐI ƯU HÓA: Lấy toàn bộ mảng ID các câu hỏi mà sinh viên vừa làm
        const questionIds = answers.map(ans => ans.question_id);

        // 2. QUERY MỘT LẦN: Lấy toàn bộ thông tin câu hỏi từ database bằng toán tử $in
        // Bất kể đề thi có 50 hay 100 câu, MongoDB cũng chỉ tốn đúng 1 nhịp xử lý
        const questionsList = await Question.find({ _id: { $in: questionIds } });

        // 3. TẠO TỪ ĐIỂN (Map): Để tra cứu câu hỏi cực nhanh với độ phức tạp O(1)
        const questionMap = new Map();
        questionsList.forEach(q => {
            questionMap.set(q._id.toString(), q);
        });

        // Khởi tạo biến để tính điểm
        let total_score = 0;
        let processedAnswers = [];

        // 4. DUYỆT VÀ CHẤM ĐIỂM trên RAM, không đụng tới Database nữa
        for (let answer of answers) {
            // Lấy dữ liệu câu hỏi từ Map thay vì gọi await Question.findById()
            const question = questionMap.get(answer.question_id.toString());
            
            if (question) {
                // So sánh đáp án chọn với đáp án đúng
                const is_correct = question.correct_answer === answer.selected_option;
                if (is_correct) {
                    total_score += question.points;  // Cộng điểm nếu đúng
                }

                // Lưu kết quả chấm cho câu hỏi này
                processedAnswers.push({
                    question_id: answer.question_id,
                    selected_option: answer.selected_option,
                    is_correct
                });
            }
        }

        // 5. Cập nhật và lưu Session với kết quả chấm điểm
        session.answers = processedAnswers;  // Lưu các câu trả lời đã xử lý
        session.total_score = total_score;   // Lưu tổng điểm
        session.status = 'submitted';        // Đánh dấu đã nộp
        session.submit_time = Date.now();    // Thời gian nộp

        // Lưu phiên thi đã cập nhật
        const updatedSession = await session.save();
        res.status(200).json(updatedSession);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Xóa phiên thi
// @route   DELETE /api/sessions/:id
// @access  Private/Teacher
export const deleteSession = async (req, res) => {
    try {
        // Tìm phiên thi cần xóa
        const session = await ExamSession.findById(req.params.id);
        if (session) {
            // Xóa phiên thi
            await session.deleteOne();
            res.json({ message: 'Session removed' });
        } else {
            // Nếu không tìm thấy phiên thi
            res.status(404).json({ message: 'Session not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
