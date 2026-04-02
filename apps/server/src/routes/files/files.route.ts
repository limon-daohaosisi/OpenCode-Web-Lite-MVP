import { Hono } from 'hono';
import * as handlers from './files.handler.js';

export const fileRoutes = new Hono()
  .get('/content', ...handlers.content)
  .get('/search', ...handlers.search);
