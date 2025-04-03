require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Import path module

// --- App Setup ---
const app = express();
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000

// --- Middleware ---
app.use(cors()); // Allow requests from your frontend (running on a different port)
app.use(express.json()); // Parse incoming JSON requests

// --- Static File Serving ---
// Serve frontend files (HTML, CSS, JS) and assets from the root directory
app.use(express.static(path.join(__dirname, '.')));
// Serve assets specifically (ensures model loads)
app.use('/assets', express.static(path.join(__dirname, 'assets')));
// Serve videos
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// --- Database Connection ---
const dbUri = process.env.MONGODB_URI;

if (!dbUri || dbUri.includes('YOUR_USERNAME') || dbUri.includes('YOUR_PASSWORD')) {
    console.error("Error: MONGODB_URI not found or is still a placeholder in .env file.");
    console.error("Please update .env with your actual MongoDB Atlas connection string.");
    process.exit(1); // Stop the server if DB URI is missing or placeholder
}

mongoose.connect(dbUri)
    .then(() => console.log("MongoDB connected successfully!"))
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1); // Stop the server on connection error
    });

// --- Mongoose Schema and Model (Define how data looks in DB) ---
const entrySchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now, required: true },
    type: { type: String, enum: ['activity', 'weight'], required: true }, // Type must be one of these
    value: { type: mongoose.Schema.Types.Mixed, required: true }, // Can be string (activity) or number (weight)
    details: { // Optional parsed details for activities
        name: String,
        reps: Number
    }
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

const FitnessEntry = mongoose.model('FitnessEntry', entrySchema); // Create the model

// --- API Routes ---

// GET all entries (or filter later)
app.get('/api/entries', async (req, res) => {
    try {
        // Fetch entries sorted by timestamp descending (newest first)
        const entries = await FitnessEntry.find().sort({ timestamp: -1 });
        res.json(entries); // Send data back as JSON
    } catch (err) {
        console.error("Error fetching entries:", err);
        res.status(500).json({ message: "Error fetching data from database." });
    }
});

// POST a new entry (activity or weight)
app.post('/api/entries', async (req, res) => {
    console.log("Received data:", req.body); // Log received data for debugging
    const { type, value, details } = req.body;

    // Basic validation
    if (!type || !value) {
        return res.status(400).json({ message: "Missing required fields: type and value." });
    }
    if (!['activity', 'weight'].includes(type)) {
        return res.status(400).json({ message: "Invalid entry type." });
    }
    if (type === 'weight' && typeof value !== 'number') {
         // Attempt conversion if it's a string number
         const numValue = parseFloat(value);
         if (isNaN(numValue)) {
            return res.status(400).json({ message: "Weight value must be a number." });
         }
         req.body.value = numValue; // Use the converted number
    }
     if (type === 'activity' && typeof value !== 'string') {
         return res.status(400).json({ message: "Activity value must be a string." });
    }


    const newEntry = new FitnessEntry({
        timestamp: new Date(), // Use server time
        type: req.body.type, // Use potentially modified type/value
        value: req.body.value,
        details: type === 'activity' ? details : undefined // Only save details for activities
    });

    try {
        const savedEntry = await newEntry.save(); // Save to MongoDB
        console.log("Saved entry:", savedEntry);
        res.status(201).json(savedEntry); // Send back the saved entry with its ID
    } catch (err) {
        console.error("Error saving entry:", err);
        res.status(500).json({ message: "Error saving data to database." });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving frontend from: ${path.join(__dirname, '.')}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/...`);
});