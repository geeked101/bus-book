const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-book';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
    }
};

// --- Models ---

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const BusSchema = new mongoose.Schema({
    bus_number: String,
    bus_type: String,
    total_seats: Number,
    route: {
        from: String,
        to: String,
        departure_time: String,
        arrival_time: String,
        price: Number,
    }
});

const Bus = mongoose.models.Bus || mongoose.model('Bus', BusSchema);

const BookingSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
    seat_number: String,
    travel_date: String,
    booking_date: { type: Date, default: Date.now },
    status: { type: String, default: 'confirmed' },
    passenger: {
        name: String,
        age: String,
        gender: String,
    }
});

const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

// --- Middleware ---

const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- Routes ---

app.get('/api/health', async (req, res) => {
    await connectDB();
    res.json({ status: 'ok', message: 'Server is running', timestamp: new Date() });
});

// Auth
app.post('/api/auth/register', async (req, res) => {
    await connectDB();
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    await connectDB();
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Buses
app.get('/api/buses', async (req, res) => {
    await connectDB();
    try {
        const buses = await Bus.find();
        res.json(buses.map(bus => ({
            id: bus._id,
            bus_number: bus.bus_number,
            bus_type: bus.bus_type,
            total_seats: bus.total_seats,
            route: bus.route
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/buses/:id', async (req, res) => {
    await connectDB();
    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) return res.status(404).json({ error: 'Bus not found' });
        res.json({
            id: bus._id,
            bus_number: bus.bus_number,
            bus_type: bus.bus_type,
            total_seats: bus.total_seats,
            route: bus.route
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/buses/:id/seats', async (req, res) => {
    await connectDB();
    try {
        const { date } = req.query;
        const bus = await Bus.findById(req.params.id);
        if (!bus) return res.status(404).json({ error: 'Bus not found' });

        const bookings = await Booking.find({ bus_id: bus._id, travel_date: date });
        const bookedSeats = bookings.map(b => b.seat_number);

        const seats = [];
        for (let i = 1; i <= bus.total_seats; i++) {
            const seatNum = i.toString().padStart(2, '0');
            seats.push({
                seat_number: seatNum,
                is_available: !bookedSeats.includes(seatNum)
            });
        }

        res.json({ travel_date: date, seats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bookings
app.post('/api/bookings', auth, async (req, res) => {
    await connectDB();
    try {
        const { bus_id, seat_number, travel_date, passenger } = req.body;

        // Check if already booked
        const existing = await Booking.findOne({ bus_id, seat_number, travel_date });
        if (existing) return res.status(400).json({ error: 'Seat already booked' });

        const booking = new Booking({
            user_id: req.user.sub,
            bus_id,
            seat_number,
            travel_date,
            passenger
        });
        await booking.save();
        res.status(201).json(booking);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/bookings/user', auth, async (req, res) => {
    await connectDB();
    try {
        const bookings = await Booking.find({ user_id: req.user.sub }).populate('bus_id');
        const detailed = bookings.map(b => ({
            id: b._id,
            busId: b.bus_id?._id,
            busName: b.bus_id?.bus_number || 'Unknown',
            busType: b.bus_id?.bus_type || 'Unknown',
            from: b.bus_id?.route?.from || 'Unknown',
            to: b.bus_id?.route?.to || 'Unknown',
            departure: b.bus_id?.route?.departure_time || 'Unknown',
            arrival: b.bus_id?.route?.arrival_time || 'Unknown',
            totalPrice: b.bus_id?.route?.price || 0,
            seats: [b.seat_number],
            status: b.status,
            date: b.travel_date,
            bookingDate: b.booking_date,
            bookingId: b._id.toString().toUpperCase(),
            passengers: b.passenger ? [b.passenger] : [{ name: 'User', seatNumber: b.seat_number }]
        }));
        res.json(detailed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/bookings/:id', auth, async (req, res) => {
    await connectDB();
    try {
        const booking = await Booking.findOneAndDelete({ _id: req.params.id, user_id: req.user.sub });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        res.json({ success: true, message: 'Booking cancelled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Seed Route (Internal Use)
app.get('/api/seed', async (req, res) => {
    await connectDB();
    try {
        const count = await Bus.countDocuments();
        if (count > 0 && req.query.force !== 'true') return res.json({ message: 'Already seeded' });

        if (req.query.force === 'true') await Bus.deleteMany({});

        const sampleBuses = [
            { bus_number: "Easy Coach - KCH 123A", bus_type: "Standard", total_seats: 44, route: { from: "Nairobi", to: "Kisumu", departure_time: "08:15 AM", arrival_time: "04:30 PM", price: 1450 } },
            { bus_number: "Mash East Africa - KDA 456B", bus_type: "VIP Oxygen", total_seats: 36, route: { from: "Nairobi", to: "Mombasa", departure_time: "10:00 PM", arrival_time: "06:00 AM", price: 2200 } },
            { bus_number: "Tahmeed - KDB 789C", bus_type: "Luxury Coach", total_seats: 32, route: { from: "Mombasa", to: "Nairobi", departure_time: "09:00 AM", arrival_time: "05:00 PM", price: 1600 } },
            { bus_number: "Dreamline - KDC 012D", bus_type: "Executive", total_seats: 40, route: { from: "Nairobi", to: "Eldoret", departure_time: "07:30 AM", arrival_time: "01:30 PM", price: 1300 } },
            { bus_number: "Guardian Angel - KDD 345E", bus_type: "Standard", total_seats: 52, route: { from: "Nairobi", to: "Busia", departure_time: "09:00 PM", arrival_time: "05:00 AM", price: 1500 } },
            { bus_number: "Modern Coast - KDE 678F", bus_type: "VIP", total_seats: 28, route: { from: "Nairobi", to: "Mombasa", departure_time: "08:00 AM", arrival_time: "04:30 PM", price: 2500 } },
            { bus_number: "Super Metro - KDF 901G", bus_type: "Semi-Luxury", total_seats: 48, route: { from: "Nairobi", to: "Nakuru", departure_time: "06:00 AM", arrival_time: "09:00 AM", price: 800 } },
            { bus_number: "Transline Galaxy - KDG 234H", bus_type: "Standard", total_seats: 14, route: { from: "Nairobi", to: "Kisii", departure_time: "10:00 AM", arrival_time: "04:00 PM", price: 1200 } }
        ];

        await Bus.insertMany(sampleBuses);
        res.json({ message: 'Seeding successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;
