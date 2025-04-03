import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// Chart.js is loaded globally via importmap in index.html

// --- Constants ---
const API_BASE_URL = 'http://localhost:3000/api'; // Adjust port if your server uses a different one

// --- DOM Elements ---
const activityInput = document.getElementById('activity');
const logActivityBtn = document.getElementById('log-activity-btn');
const weightInput = document.getElementById('weight');
const logWeightBtn = document.getElementById('log-weight-btn');
const todaysActivityList = document.getElementById('todays-activity-list');
const currentWeightDisplay = document.getElementById('current-weight-display');
const avatarContainer = document.getElementById('avatar-container');
const monthSelect = document.getElementById('month-select');
const statsPushups = document.getElementById('stats-pushups');
const statsSquats = document.getElementById('stats-squats');
const prPushup = document.getElementById('pr-pushup');
const prSquat = document.getElementById('pr-squat');
const weightChartContainer = document.getElementById('weight-chart-container');

// --- Global State ---
let fitnessData = []; // Holds data fetched from the backend

// --- Three.js Setup ---
let scene, camera, renderer, loadedModel, controls, clock;
const loader = new GLTFLoader();

function initThreeJS() {
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    const containerRect = avatarContainer.getBoundingClientRect();
    const aspect = containerRect.width / containerRect.height;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(0, 1.5, 3);
    camera.lookAt(0, 1, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRect.width, containerRect.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    avatarContainer.innerHTML = '';
    avatarContainer.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    loader.load('assets/person.glb', (gltf) => {
        loadedModel = gltf.scene;
        loadedModel.scale.set(1, 1, 1);
        loadedModel.position.set(0, 0, 0);
        loadedModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        scene.add(loadedModel);
        console.log('Model loaded!');
        updateAvatarStatus(); // Update status based on initially loaded data
    }, undefined, (error) => {
        console.error('An error happened loading the model:', error);
        avatarContainer.innerHTML = '<p style="color: red;">Error loading 3D model.</p>';
    });

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2;

    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function onWindowResize() {
    const containerRect = avatarContainer.getBoundingClientRect();
    if (containerRect.width > 0 && containerRect.height > 0) {
        camera.aspect = containerRect.width / containerRect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(containerRect.width, containerRect.height);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// --- Data Logic ---

async function fetchData() {
    try {
        const response = await fetch(`${API_BASE_URL}/entries`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Convert timestamp strings back to numbers (milliseconds) for easier handling
        fitnessData = data.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp).getTime()
        }));
        // Data from backend is already sorted newest first, reverse for chronological processing if needed
        // fitnessData.sort((a, b) => a.timestamp - b.timestamp); // Or keep newest first if preferred
        console.log("Data fetched successfully:", fitnessData);
        populateMonthSelect();
        updateAllDisplays();
    } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to load data from the server. Please ensure the backend server is running.");
        // Optionally display an error message on the page
    }
}

async function postData(entryData) {
     try {
        const response = await fetch(`${API_BASE_URL}/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entryData),
        });
        if (!response.ok) {
             const errorData = await response.json(); // Get error details from server
             throw new Error(`HTTP error! status: ${response.status} - ${errorData.message}`);
        }
        const savedEntry = await response.json();
        console.log('Data saved successfully:', savedEntry);
        // Add the new entry to our local state and refresh displays
        fitnessData.unshift({ // Add to beginning assuming backend returns newest first
             ...savedEntry,
             timestamp: new Date(savedEntry.timestamp).getTime()
        });
        // Re-sort if necessary or just update displays
        updateAllDisplays();
        updateAvatarStatus(); // Update avatar based on new activity
        return true; // Indicate success
    } catch (error) {
        console.error("Error saving data:", error);
        alert(`Failed to save data: ${error.message}`);
        return false; // Indicate failure
    }
}


// Helper to parse activity string like "Pushups - 40"
function parseActivity(value) {
    if (typeof value !== 'string') return null;
    const parts = value.split('-');
    if (parts.length < 2) return null;
    const name = parts[0].trim().toLowerCase();
    const reps = parseInt(parts[1].trim(), 10);
    if (isNaN(reps)) return null;
    return { name, reps };
}

// --- Event Listeners ---
logActivityBtn.addEventListener('click', async () => {
    const activityText = activityInput.value.trim();
    if (activityText) {
        const details = parseActivity(activityText);
        const success = await postData({
            type: 'activity',
            value: activityText,
            details: details // Send parsed details if successful
        });
        if (success) {
            activityInput.value = ''; // Clear input only on success
        }
    } else {
        alert('Please enter an activity (e.g., Pushups - 40).');
    }
});

logWeightBtn.addEventListener('click', async () => {
    const weightValue = weightInput.value;
    if (weightValue) {
        const weight = parseFloat(weightValue);
        if (!isNaN(weight)) {
             const success = await postData({
                type: 'weight',
                value: weight
            });
             if (success) {
                 // Optionally clear input: weightInput.value = '';
             }
        } else {
             alert('Please enter a valid number for weight.');
        }
    } else {
        alert('Please enter your weight.');
    }
});

monthSelect.addEventListener('change', () => {
    updateAllDisplays(); // Re-calculate stats and chart for the selected month using existing data
});


// --- Display Updates (Mostly unchanged, operate on global fitnessData) ---

function updateAllDisplays() {
    // Ensure fitnessData is sorted chronologically if needed by calculations
    fitnessData.sort((a, b) => a.timestamp - b.timestamp);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysActivities = fitnessData.filter(item =>
        item.type === 'activity' &&
        item.timestamp >= today.getTime() &&
        item.timestamp < tomorrow.getTime()
    );
    updateTodaysList(todaysActivities);

    const latestWeightEntry = [...fitnessData].reverse().find(item => item.type === 'weight');
    currentWeightDisplay.textContent = latestWeightEntry ? Number(latestWeightEntry.value).toFixed(1) : '--';


    const [selectedYear, selectedMonth] = monthSelect.value === 'current'
        ? [new Date().getFullYear(), new Date().getMonth()]
        : monthSelect.value.split('-').map(Number);

    calculateAndDisplayStats(selectedMonth, selectedYear);
    calculateAndDisplayPRs();
    renderWeightChart(selectedMonth, selectedYear);
    updateAvatarStatus(); // Ensure avatar status reflects current data state
}

function updateTodaysList(activities) {
    todaysActivityList.innerHTML = '';
    if (activities.length === 0) {
        todaysActivityList.innerHTML = '<li>No activities logged yet today.</li>';
    } else {
        activities.forEach(activity => {
            const li = document.createElement('li');
            li.textContent = activity.value;
            todaysActivityList.appendChild(li);
        });
    }
}

function populateMonthSelect() {
    const months = {};
    fitnessData.forEach(item => {
        const date = new Date(item.timestamp);
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}`;
        months[key] = true;
    });

    const sortedKeys = Object.keys(months).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number);
        const [yearB, monthB] = b.split('-').map(Number);
        if (yearB !== yearA) return yearB - yearA;
        return monthB - monthA;
    });

    const currentSelection = monthSelect.value;
    monthSelect.innerHTML = '<option value="current">This Month</option>';

    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

    sortedKeys.forEach(key => {
        const [year, month] = key.split('-').map(Number);
        const option = document.createElement('option');
        option.value = key;
        option.textContent = monthFormatter.format(new Date(year, month));
        monthSelect.appendChild(option);
    });

     if (monthSelect.querySelector(`option[value="${currentSelection}"]`)) {
        monthSelect.value = currentSelection;
    } else {
         monthSelect.value = "current";
     }
}


function calculateAndDisplayStats(month, year) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const monthlyActivities = fitnessData.filter(item =>
        item.type === 'activity' &&
        item.timestamp >= startDate.getTime() &&
        item.timestamp < endDate.getTime() &&
        item.details // Only include successfully parsed activities
    );

    let totalPushups = 0;
    let totalSquats = 0;

    monthlyActivities.forEach(item => {
        if (item.details.name === 'pushups') {
            totalPushups += item.details.reps;
        } else if (item.details.name === 'squats') {
            totalSquats += item.details.reps;
        }
    });

    statsPushups.textContent = totalPushups;
    statsSquats.textContent = totalSquats;
}

function calculateAndDisplayPRs() {
    let maxPushup = 0;
    let maxSquat = 0;

    fitnessData.forEach(item => {
        if (item.type === 'activity' && item.details) {
            if (item.details.name === 'pushups' && item.details.reps > maxPushup) {
                maxPushup = item.details.reps;
            } else if (item.details.name === 'squats' && item.details.reps > maxSquat) {
                maxSquat = item.details.reps;
            }
        }
    });

    prPushup.textContent = maxPushup > 0 ? maxPushup : '--';
    prSquat.textContent = maxSquat > 0 ? maxSquat : '--';
}


// --- Chart Logic (Unchanged, uses global fitnessData) ---
let weightChart = null;

function renderWeightChart(month, year) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const monthlyWeightData = fitnessData.filter(item =>
        item.type === 'weight' &&
        item.timestamp >= startDate.getTime() &&
        item.timestamp < endDate.getTime()
    );

    if (monthlyWeightData.length === 0) {
        weightChartContainer.innerHTML = '<p>No weight data for this month.</p>';
        if (weightChart) {
            weightChart.destroy();
            weightChart = null;
        }
        return;
    }

    const weeklyData = {};
    monthlyWeightData.forEach(item => {
        const date = new Date(item.timestamp);
        const yearNum = date.getFullYear();
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
        const weekKey = `${yearNum}-W${weekNo}`;

        const firstDayOfWeek = new Date(date);
        firstDayOfWeek.setDate(date.getDate() - (date.getDay() || 7) + 1);
        firstDayOfWeek.setHours(0,0,0,0);

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { sum: 0, count: 0, lastValue: 0, weekStartDate: firstDayOfWeek };
        }
        // Ensure value is a number before adding
        const weightVal = Number(item.value);
        if (!isNaN(weightVal)) {
            weeklyData[weekKey].sum += weightVal;
            weeklyData[weekKey].count++;
            weeklyData[weekKey].lastValue = weightVal;
            weeklyData[weekKey].weekStartDate = firstDayOfWeek;
        }
    });

    const labels = [];
    const dataPoints = [];
    const sortedWeeks = Object.keys(weeklyData).sort((a, b) => {
         const [yearA, weekA] = a.split('-W').map(Number);
         const [yearB, weekB] = b.split('-W').map(Number);
         if(yearA !== yearB) return yearA - yearB;
         return weekA - weekB;
    });

    sortedWeeks.forEach(weekKey => {
        const weekInfo = weeklyData[weekKey];
        if (weekInfo.count > 0) { // Only add weeks with valid data
             labels.push(weekInfo.weekStartDate.toLocaleDateString('en-CA'));
             dataPoints.push(weekInfo.lastValue); // Using last value
        }
    });

    let canvas = weightChartContainer.querySelector('canvas');
    if (!canvas) {
        weightChartContainer.innerHTML = '';
        canvas = document.createElement('canvas');
        weightChartContainer.appendChild(canvas);
    }
    if (weightChart) {
        weightChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight (kg)',
                data: dataPoints,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: false } }
        }
    });
}


// --- Avatar Logic (Unchanged, uses global fitnessData) ---
function updateAvatarStatus() {
    if (!loadedModel) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const hasActivityToday = fitnessData.some(item =>
        item.type === 'activity' &&
        item.timestamp >= today.getTime() &&
        item.timestamp < tomorrow.getTime()
    );

    if (hasActivityToday) {
        console.log("Avatar should be happy!");
    } else {
        console.log("Avatar is unhappy.");
    }
}

// --- Initial Load ---
initThreeJS();
fetchData(); // Fetch initial data from backend instead of localStorage