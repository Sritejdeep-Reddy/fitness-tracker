import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// --- Database Connection (Simplified for API Route) ---
// Ideally, manage connection state better in a real app (e.g., in a separate lib file)
let isConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (isConnected) {
    console.log('=> using existing database connection');
    return;
  }

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
  }

  try {
    console.log('=> using new database connection');
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error('Database connection failed');
  }
}

// --- Mongoose Schema and Model ---
// Check if model already exists to prevent OverwriteModelError in dev hot-reloading
const entrySchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now, required: true },
    type: { type: String, enum: ['activity', 'weight'], required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    details: {
        name: String,
        reps: Number
    }
}, { timestamps: true });

const FitnessEntry = mongoose.models.FitnessEntry || mongoose.model('FitnessEntry', entrySchema);

// --- API Handlers ---

// GET /api/entries
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const entries = await FitnessEntry.find().sort({ timestamp: -1 }); // Newest first
    return NextResponse.json(entries);
  } catch (error: any) {
    console.error("[GET /api/entries] Error:", error);
    return NextResponse.json({ message: `Error fetching entries: ${error.message}` }, { status: 500 });
  }
}

// POST /api/entries
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    console.log("[POST /api/entries] Received data:", body);

    const { type, value } = body; // Destructure required fields

    // Basic Validation
    if (!type || value === undefined || value === null) {
        return NextResponse.json({ message: "Missing required fields: type and value." }, { status: 400 });
    }
     if (!['activity', 'weight'].includes(type)) {
        return NextResponse.json({ message: "Invalid entry type." }, { status: 400 });
    }
     // Ensure weight is stored as a number
     let finalValue = value;
     if (type === 'weight') {
         const numValue = parseFloat(value);
         if (isNaN(numValue)) {
             return NextResponse.json({ message: "Weight value must be a valid number." }, { status: 400 });
         }
         finalValue = numValue;
     } else if (type === 'activity' && typeof value !== 'string') {
         return NextResponse.json({ message: "Activity value must be a string." }, { status: 400 });
     }


    // Create new entry object
    const newEntryData: any = {
        timestamp: new Date(),
        type,
        value: finalValue,
    };

    // Add details only if it's an activity and details are provided
    if (type === 'activity' && body.details) {
        newEntryData.details = body.details;
    }

    const newEntry = new FitnessEntry(newEntryData);
    const savedEntry = await newEntry.save();
    console.log("[POST /api/entries] Saved entry:", savedEntry);

    return NextResponse.json(savedEntry, { status: 201 });

  } catch (error: any) {
    console.error("[POST /api/entries] Error:", error);
     // Handle potential JSON parsing errors
     if (error instanceof SyntaxError) {
         return NextResponse.json({ message: "Invalid JSON in request body." }, { status: 400 });
     }
    return NextResponse.json({ message: `Error saving entry: ${error.message}` }, { status: 500 });
  }
}