import ExamSession from '../models/ExamSession.js';
import Question from '../models/Question.js';

// @desc    Get all exam sessions
// @route   GET /api/sessions
// @access  Private
export const getSessions = async (req, res) => {
    try {
        const pageSize = Number(req.query.limit) || 10;
        const page = Number(req.query.page) || 1;

        let query = {};
        if (req.user.role === 'student') {
            query.student_id = req.user._id;
        }

        const count = await ExamSession.countDocuments(query);
        const sessions = await ExamSession.find(query)
            .populate('exam_id', 'title')
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ sessions, page, pages: Math.ceil(count / pageSize), total: count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get session by ID
// @route   GET /api/sessions/:id
// @access  Private
export const getSessionById = async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.id)
            .populate('exam_id')
            .populate('student_id', 'full_name username role');
        
        if (!session) return res.status(404).json({ message: 'Session not found' });
        
        if (req.user.role === 'student' && session.student_id._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to simply view this session' });
        }
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Ghi nhận log gian lận
// @route   POST /api/sessions/:sessionId/logs
// @access  Private/Student
export const addLog = async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        
        if (session.student_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { event_type, description } = req.body;
        // Sử dụng MongoDB $push và tăng số lần vi phạm
        await ExamSession.updateOne(
            { _id: session._id },
            { 
                $push: { proctoring_logs: { event_type, description, timestamp: Date.now() } },
                $inc: { violation_count: 1 }
            }
        );

        res.status(200).json({ message: 'Proctoring Log added' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Nộp bài thi, chấm điểm tự động
// @route   POST /api/sessions/:sessionId/submit
// @access  Private/Student
export const submitSession = async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // Xác thực quyền của sinh viên
        if (session.student_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Chặn nộp bài nhiều lần
        if (session.status !== 'ongoing') {
            return res.status(400).json({ message: 'Bài thi này đã được nộp hoặc bị hủy' });
        }

        const { answers } = req.body; // Dữ liệu FE gửi: [{ question_id, selected_option }]
        
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: 'Dữ liệu bài làm không hợp lệ' });
        }

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

        let total_score = 0;
        let processedAnswers = [];

        // 4. DUYỆT VÀ CHẤM ĐIỂM trên RAM, không đụng tới Database nữa
        for (let answer of answers) {
            // Lấy dữ liệu câu hỏi từ Map thay vì gọi await Question.findById()
            const question = questionMap.get(answer.question_id.toString());
            
            if (question) {
                const is_correct = question.correct_answer === answer.selected_option;
                if (is_correct) {
                    total_score += question.points;
                }

                processedAnswers.push({
                    question_id: answer.question_id,
                    selected_option: answer.selected_option,
                    is_correct
                });
            }
        }

        // 5. Cập nhật và lưu Session
        session.answers = processedAnswers;
        session.total_score = total_score;
        session.status = 'submitted';
        session.submit_time = Date.now();

        const updatedSession = await session.save();
        res.status(200).json(updatedSession);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete session
// @route   DELETE /api/sessions/:id
// @access  Private/Teacher
export const deleteSession = async (req, res) => {
    try {
        const session = await ExamSession.findById(req.params.id);
        if (session) {
            await session.deleteOne();
            res.json({ message: 'Session removed' });
        } else {
            res.status(404).json({ message: 'Session not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
