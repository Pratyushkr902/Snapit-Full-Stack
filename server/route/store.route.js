import { Router } from 'express';
import auth from '../middleware/auth.js';
import StoreModel from '../models/store.model.js';

const storeRouter = Router();

// 1. Add a new Mart (Admin only)
storeRouter.post("/add", auth, async (req, res) => {
    try {
        const { name, address, lat, lng } = req.body;
        
        const newStore = new StoreModel({
            name,
            address,
            location: {
                type: "Point",
                coordinates: [Number(lng), Number(lat)] // [Longitude, Latitude]
            }
        });

        await newStore.save();
        res.json({ message: "New Mart added successfully", success: true });
    } catch (error) {
        res.status(500).json({ message: error.message, error: true });
    }
});

// 2. Find nearest Marts
storeRouter.post("/nearest", async (req, res) => {
    try {
        const { lat, lng } = req.body;
        
        const nearestStores = await StoreModel.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [Number(lng), Number(lat)]
                    },
                    $maxDistance: 10000 // 10km radius
                }
            }
        }).limit(5);

        res.json({ data: nearestStores, success: true });
    } catch (error) {
        res.status(500).json({ message: error.message, error: true });
    }
});

export default storeRouter;