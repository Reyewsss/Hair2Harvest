import Sample from './sampleModel.js';

// Sample fetching to test the server
export async function sampleController(req, res) {
  try {
    const sample = await Sample.find()
    res.status(200).json(sample);
  } catch (error) {
    console.error('Error fetching sample data:', error);
    res.status(500).json({ message: 'Internal server Error', error: error.message });
}
}

// Sample creation to test the server and database in Postman
export async function createSample(req, res) {  
    try {
        const { title, description } = req.body;
        const newSample = new Sample({ title, description });
        await newSample.save();
        res.status(201).json({ message: 'Sample created successfully', sample: newSample });
    } catch (error) {
        console.error('Error creating sample:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
// -------------------------------