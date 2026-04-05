import Question from '../models/Question.js';

// @desc    Create a new question
// @route   POST /api/questions
// @access  Private/Teacher
export const createQuestion = async (req, res) => {
    try {
        const questionData = {
            content: req.body.content,
            options: req.body.options,
            correct_answer: req.body.correct_answer,
            points: req.body.points,
        };

        const newQuestion = await Question.create(questionData);
        return res.status(201).json(newQuestion);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// @desc    Get all questions
// @route   GET /api/questions
// @access  Private/Teacher
export const getQuestions = async (req, res) => {
    try {
        const questions = await Question.find({});
        return res.json(questions);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Get a single question by ID
// @route   GET /api/questions/:id
// @access  Private/Teacher
export const getQuestionById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        return res.json(question);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Update a question
// @route   PUT /api/questions/:id
// @access  Private/Teacher
export const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const { content, options, correct_answer, points } = req.body;

        if (content !== undefined) {
            question.content = content;
        }
        if (options !== undefined) {
            question.options = options;
        }
        if (correct_answer !== undefined) {
            question.correct_answer = correct_answer;
        }
        if (points !== undefined) {
            question.points = points;
        }

        const updatedQuestion = await question.save();
        return res.json(updatedQuestion);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Private/Teacher
export const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        await question.deleteOne();
        return res.json({ message: 'Question removed' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
