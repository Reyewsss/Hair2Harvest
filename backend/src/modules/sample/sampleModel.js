import mongoose from 'mongoose';

// Sample model schema to test the database connection
const sampleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {    
  type: String,
    required: true,
  },  
}, 
{ timestamps: true });

const Sample = mongoose.model('Sample', sampleSchema);

export default Sample;
// -------------------------------

