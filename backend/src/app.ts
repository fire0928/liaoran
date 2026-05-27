import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { initDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/users';
import { memberRouter } from './routes/members';
import { assessRouter } from './routes/assessments';
import { chatRouter } from './routes/chat';
import { treeholeRouter } from './routes/treehole';
import { pointsRouter } from './routes/points';
import { dashboardRouter } from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API路由
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/members', memberRouter);
app.use('/api/v1/assessments', assessRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/treehole', treeholeRouter);
app.use('/api/v1/points', pointsRouter);
app.use('/api/v1/admin', dashboardRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.0' });
});

// 错误处理
app.use(errorHandler);

// 初始化数据库并启动服务
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`\n🧠 了然心理API服务已启动`);
    console.log(`📍 地址: http://localhost:${PORT}`);
    console.log(`📋 健康检查: http://localhost:${PORT}/api/health\n`);
  });
}

start().catch(console.error);

export default app;
