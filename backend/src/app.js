import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// TODO: app.use('/api/v1', routes);
// TODO: app.use(errorHandler);

export default app;
