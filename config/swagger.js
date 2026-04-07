import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CK_JS Exam API',
            version: '1.0.0',
            description: 'API documentation for the CK_JS exam management system.',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        username: { type: 'string' },
                        full_name: { type: 'string' },
                        role: { type: 'string' },
                        token: { type: 'string' },
                    },
                },
                Question: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        content: { type: 'string' },
                        options: { type: 'array', items: { type: 'string' } },
                        correct_answer: { type: 'string' },
                        points: { type: 'number' },
                    },
                },
                Exam: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        title: { type: 'string' },
                        duration_minutes: { type: 'number' },
                        start_time: { type: 'string', format: 'date-time' },
                        end_time: { type: 'string', format: 'date-time' },
                        questions: { type: 'array', items: { type: 'string' } },
                        allowed_students: { type: 'array', items: { type: 'string' } },
                        teacher_id: { type: 'string' },
                    },
                },
                ExamSession: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        exam_id: { type: 'string' },
                        student_id: { type: 'string' },
                        status: { type: 'string' },
                        start_time: { type: 'string', format: 'date-time' },
                        submit_time: { type: 'string', format: 'date-time' },
                        total_score: { type: 'number' },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
