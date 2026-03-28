declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` middleware after validating JWT. */
      auth?: {
        userId: string;
        email: string;
      };
    }
  }
}

export {};
