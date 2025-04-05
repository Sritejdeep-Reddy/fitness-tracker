"use client"; // This component needs client-side hooks and browser APIs

import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js'; // Import Chart object and registerables

// Register necessary Chart.js components (controllers, elements, scales, plugins)
Chart.register(...registerables);

interface WeightEntry {
    timestamp: number | string; // Expecting timestamp in milliseconds or parsable string
    value: number;
}

interface WeightChartProps {
    data: WeightEntry[]; // Array of { timestamp, value } objects
}

const WeightChart: React.FC<WeightChartProps> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null); // To hold the chart instance

    useEffect(() => {
        if (!canvasRef.current || data.length === 0) return; // Exit if no canvas or no data

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return; // Exit if context cannot be obtained

        // Prepare chart data
        // Sort data chronologically just in case
        const sortedData = [...data].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

        const labels = sortedData.map(entry =>
            new Date(entry.timestamp).toLocaleDateString('en-CA') // YYYY-MM-DD format
        );
        const dataPoints = sortedData.map(entry => entry.value);

        // Destroy previous chart instance if it exists
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        // Create new chart instance
        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weight (kg)',
                    data: dataPoints,
                    borderColor: 'hsl(var(--primary))', // Use theme color variable
                    backgroundColor: 'hsla(var(--primary) / 0.2)', // Use theme color with opacity
                    tension: 0.1,
                    fill: true, // Optional: fill area under line
                    pointBackgroundColor: 'hsl(var(--primary))',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false, // Weight doesn't usually start at 0
                        ticks: { color: 'hsl(var(--muted-foreground))' }, // Use theme color
                        grid: { color: 'hsl(var(--border))' } // Use theme color
                    },
                    x: {
                        ticks: { color: 'hsl(var(--muted-foreground))' }, // Use theme color
                        grid: { color: 'hsl(var(--border))' } // Use theme color
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: 'hsl(var(--foreground))' } // Use theme color
                    }
                }
            }
        });

        // Cleanup function to destroy chart on component unmount
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };

    }, [data]); // Re-run effect when data changes

    return (
        <div className="h-full w-full">
            {data.length > 0 ? (
                <canvas ref={canvasRef}></canvas>
            ) : (
                <div className="h-full flex items-center justify-center">
                     <p className="text-muted-foreground text-sm">No weight data to display.</p>
                </div>
            )}
        </div>
    );
};

export default WeightChart;