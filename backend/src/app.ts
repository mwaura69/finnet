import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { authRouter, requireAuth } from './auth.js';
import { config } from './config.js';
import { db } from './db/database.js';
import { ApiError } from './errors.js';
import { portfolioSchema, transactionSchema } from './validation.js';
import { PortfolioService } from './services/portfolio.service.js';
import { DemoPortfolioService } from './demo/demo.service.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({contentSecurityPolicy:false})); // Swagger needs inline scripts. Angular static hosting supplies its own CSP.
  app.use(cors({origin:config.origin,methods:['GET','POST','PUT','DELETE'],allowedHeaders:['Content-Type','Authorization']}));
  app.use(express.json({limit:'32kb'}));
  app.get('/health',(_req,res)=>res.json({status:'ok',mode:config.demo?'demo':'scaffold'}));
  const spec=JSON.parse(readFileSync(new URL('../openapi.json',import.meta.url),'utf8'));
  app.get('/api/openapi.json',(_req,res)=>res.json(spec));
  app.use('/api/docs',swaggerUi.serve,swaggerUi.setup(spec,{customSiteTitle:'FinTrack API documentation'}));
  app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:50,standardHeaders:'draft-8',legacyHeaders:false,handler:(_req,res)=>res.status(429).json({error:{code:'RATE_LIMITED',message:'Too many sign-in attempts. Try again in 15 minutes.'}})}),authRouter);
  app.use('/api',requireAuth);
  const service = config.demo ? new DemoPortfolioService(db) : new PortfolioService();
  app.get('/api/portfolios',(req,res)=>res.json({data:service.list(req.userId)}));
  app.post('/api/portfolios',(req,res)=>res.status(201).json({data:service.create(req.userId,portfolioSchema.parse(req.body))}));
  app.get('/api/portfolios/:id',(req,res)=>res.json({data:service.get(req.userId,req.params.id)}));
  app.put('/api/portfolios/:id',(req,res)=>res.json({data:service.update(req.userId,req.params.id,portfolioSchema.parse(req.body))}));
  app.delete('/api/portfolios/:id',(req,res)=>{service.remove(req.userId,req.params.id);res.sendStatus(204);});
  app.get('/api/portfolios/:id/transactions',(req,res)=>res.json({data:service.transactions(req.userId,req.params.id)}));
  app.post('/api/portfolios/:id/transactions',(req,res)=>res.status(201).json({data:service.addTransaction(req.userId,req.params.id,transactionSchema.parse(req.body))}));
  app.delete('/api/transactions/:id',(req,res)=>{service.removeTransaction(req.userId,req.params.id);res.sendStatus(204);});
  app.get('/api/portfolios/:id/summary',(req,res)=>res.json({data:service.summary(req.userId,req.params.id)}));
  app.use((_req,_res,next)=>next(new ApiError(404,'NOT_FOUND','Endpoint not found.')));
  app.use((err: unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    const requestId=randomUUID();
    if (err instanceof ZodError) {res.status(422).json({error:{code:'VALIDATION_ERROR',message:'Check the highlighted fields.',details:err.issues.map(i=>({field:i.path.join('.'),message:i.message})),requestId}});return;}
    if (err instanceof ApiError) {res.status(err.status).json({error:{code:err.code,message:err.message,requestId}});return;}
    if (err instanceof SyntaxError && 'body' in err) {res.status(400).json({error:{code:'INVALID_JSON',message:'Request body must be valid JSON.',requestId}});return;}
    console.error('Unhandled API error',requestId,err);
    res.status(500).json({error:{code:'INTERNAL_ERROR',message:'Something went wrong. Please try again.',requestId}});
  });
  return app;
}
