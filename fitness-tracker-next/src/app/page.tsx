"use client";

import { useState, useEffect } from 'react'; // Import useEffect
import Image from "next/image";

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WeightChart from '@/components/WeightChart';
import Avatar from '@/components/Avatar'; // Import the Avatar component

// Define an interface for the entry data structure
interface FitnessEntry {
  _id: string; // Added by MongoDB
  timestamp: string | number; // Can be string from JSON or number after conversion
  type: 'activity' | 'weight';
  value: string | number;
  details?: {
    name: string;
    reps: number;
  };
  createdAt?: string; // Added by Mongoose timestamps
  updatedAt?: string; // Added by Mongoose timestamps
}

// Helper to parse activity string like "Pushups - 40"
function parseActivity(value: string): { name: string; reps: number } | null {
    if (typeof value !== 'string') return null;
    const parts = value.split('-');
    if (parts.length < 2) return null;
    const name = parts[0].trim().toLowerCase();
    const reps = parseInt(parts[1].trim(), 10);
    if (isNaN(reps)) return null;
    return { name, reps };
}


export default function Home() {
  // State for input fields
  const [activityLog, setActivityLog] = useState('');
  const [weightLog, setWeightLog] = useState('');
  // State for fetched entries
  const [entries, setEntries] = useState<FitnessEntry[]>([]);
  // State for loading indicator
  const [isLoading, setIsLoading] = useState(true);
  // State for error messages
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/entries'); // Use relative path
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: FitnessEntry[] = await response.json();
        // Convert timestamps for easier use later if needed
        setEntries(data.map(item => ({ ...item, timestamp: new Date(item.timestamp).getTime() })));
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(`Failed to load entries: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means run once on mount

  // Function to post data
  const postData = async (entryData: Omit<FitnessEntry, '_id' | 'timestamp' | 'createdAt' | 'updatedAt'>) => {
      setError(null); // Clear previous errors
      try {
        const response = await fetch('/api/entries', { // Use relative path
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entryData),
        });
        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const savedEntry: FitnessEntry = await response.json();
        console.log('Data saved successfully:', savedEntry);
        // Add the new entry to the beginning of the list
        setEntries(prevEntries => [
            { ...savedEntry, timestamp: new Date(savedEntry.timestamp).getTime() },
             ...prevEntries
        ]);
        return true; // Indicate success
    } catch (err: any) {
        console.error("Error saving data:", err);
        setError(`Failed to save entry: ${err.message}`);
        return false; // Indicate failure
    }
  };


  // Handlers for button clicks
  const handleLogActivity = async () => {
    if (!activityLog.trim()) {
        setError("Please enter an activity.");
        return;
    }
    const details = parseActivity(activityLog);
    if (!details) {
        setError("Invalid activity format. Use 'Name - Reps' (e.g., Pushups - 40).");
        return;
    }

    const success = await postData({
        type: 'activity',
        value: activityLog,
        details: details
    });
    if (success) {
        setActivityLog(''); // Clear input only on success
        setError(null); // Clear error on success
    }
  };

  const handleLogWeight = async () => {
     if (!weightLog.trim()) {
        setError("Please enter a weight.");
        return;
    }
    const weight = parseFloat(weightLog);
     if (isNaN(weight)) {
        setError("Please enter a valid number for weight.");
        return;
    }

    const success = await postData({
        type: 'weight',
        value: weight // Send the parsed number
    });
    if (success) {
        // setWeightLog(''); // Optionally clear input
        setError(null); // Clear error on success
    }
  };

  // Filter today's activities for display
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysActivities = entries.filter(entry =>
      entry.type === 'activity' &&
      Number(entry.timestamp) >= todayStart.getTime()
  );

  // Find the most recent weight entry
  const latestWeightEntry = entries
      .filter(entry => entry.type === 'weight')
      .filter(entry => entry.type === 'weight')
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))[0]; // Sort descending by timestamp and take the first one

  // Filter weight entries for the chart
  const weightEntriesForChart = entries
      .filter(entry => entry.type === 'weight')
      .map(entry => ({ timestamp: entry.timestamp, value: Number(entry.value) })); // Ensure value is number


  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl md:text-5xl font-bold font-heading text-center mb-8 md:mb-12 text-primary-foreground">
        Fitness Breathing Tracker
      </h1>

      {/* Display Loading / Error State */}
       {isLoading && <p className="text-center text-muted-foreground">Loading data...</p>}
       {error && <p className="text-center text-destructive mb-4">{error}</p>}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
          {/* Goals/Log Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-semibold border-b border-primary pb-2">Today's Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="activity-log">Log Activity:</Label>
                  <div className="flex gap-2">
                    <Input
                      id="activity-log"
                      placeholder="e.g., Pushups - 40"
                      value={activityLog}
                      onChange={(e) => setActivityLog(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogActivity()} // Optional: Log on Enter
                     />
                    <Button onClick={handleLogActivity}>Log Activity</Button>
                  </div>
                </div>
                 {/* Activity list */}
                 <div className="pt-4 space-y-2">
                    <h3 className="text-lg font-medium text-muted-foreground">Logged Today:</h3>
                    {todaysActivities.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                            {todaysActivities.map(entry => (
                                <li key={entry._id}>{entry.value}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No activities logged yet today.</p>
                    )}
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-semibold border-b border-primary pb-2">Monthly Stats</CardTitle>
              {/* TODO: Add month select */}
            </CardHeader>
            <CardContent>
              {/* TODO: Stats display */}
              <p className="text-muted-foreground">Stats section...</p>
              {/* Weight Chart */}
              <div className="h-64 mt-4 rounded">
                 <WeightChart data={weightEntriesForChart} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6 md:gap-8">
          {/* Avatar Card */}
          <Card>
             <CardHeader>
               <CardTitle className="text-2xl font-semibold border-b border-primary pb-2">Avatar</CardTitle>
             </CardHeader>
             <CardContent className="p-0"> {/* Remove padding if canvas handles it */}
                <div className="h-80 rounded aspect-square relative"> {/* Maintain aspect ratio */}
                   {/* Render the Avatar component */}
                   <Avatar />
                </div>
             </CardContent>
          </Card>

          {/* Current Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-semibold border-b border-primary pb-2">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                  <Label htmlFor="weight-log">Log Weight (kg):</Label>
                  <div className="flex gap-2">
                    <Input
                      id="weight-log"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 90.5"
                      value={weightLog}
                      onChange={(e) => setWeightLog(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogWeight()} // Optional: Log on Enter
                    />
                    <Button onClick={handleLogWeight}>Log Weight</Button>
                  </div>
               </div>
               {/* Current weight display */}
               <div className="pt-4">
                 <h3 className="text-lg font-medium text-muted-foreground">Current Weight:</h3>
                 <p className="text-xl font-semibold">
                   {latestWeightEntry ? `${Number(latestWeightEntry.value).toFixed(1)} kg` : 'N/A'}
                 </p>
               </div>
               {/* TODO: PRs display */}
               <div className="pt-4">
                 <h3 className="text-lg font-medium text-muted-foreground">Personal Records:</h3>
                 <p className="text-sm text-muted-foreground">PRs section coming soon...</p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
       {/* Background video remains commented out for now */}
    </div>
  );
}
