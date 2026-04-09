import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

// Load biến môi trường
dotenv.config();

// Khởi tạo Express
const app = express();

// Middleware
app.use(express.json()); // Hỗ trợ JSON body
app.use(cors()); // Cấu hình CORS

// Kết nối MongoDB
connectDB();

// Health Check Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Import các Routes
import userRoutes from './routes/userRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import examRoutes from './routes/examRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';

// Nạp các Routes vào application
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/sessions', sessionRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
