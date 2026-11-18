import express from 'express';
import { sampleController, createSample } from '../sample/sampleController.js';

const router = express();

// Sample routes to test the server
router.get('/', sampleController);
router.post('/', createSample); 
// -------------------------------

export default router;