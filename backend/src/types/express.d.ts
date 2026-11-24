declare global {
  namespace Express {
    interface Request {
      userId: string;
      sessionId: string;
      requestId: string;
    }
  }
}
export {};
