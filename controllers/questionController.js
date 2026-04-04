import Question from '../models/Question.js';

export const createQuestion = async (req, res) => {
    try {
        const question = await Question.create(req.body);
        res.status(201).json(question);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getQuestions = async (req, res) => {
    try {
        const pageSize = Number(req.query.limit) || 10;
        const page = Number(req.query.page) || 1;

        const count = await Question.countDocuments({});
        const questions = await Question.find({})
            .limit(pageSize)
            .skip(pageSize * (page - 1));
        
        res.json({ questions, page, pages: Math.ceil(count / pageSize), total: count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getQuestionById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (question) {
            res.json(question);
        } else {
            res.status(404).json({ message: 'Question not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (question) {
            question.content = req.body.content || question.content;
            question.options = req.body.options || question.options;
            question.correct_answer = req.body.correct_answer || question.correct_answer;
            question.points = req.body.points || question.points;

            const updatedQuestion = await question.save();
            res.json(updatedQuestion);
        } else {
            res.status(404).json({ message: 'Question not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (question) {
            await question.deleteOne();
            res.json({ message: 'Question removed' });
        } else {
            res.status(404).json({ message: 'Question not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
