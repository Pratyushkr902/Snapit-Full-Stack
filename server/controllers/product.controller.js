import ProductModel from "../models/product.model.js";
import mongoose from "mongoose";

// Fields returned in list queries (not full details)
const LIST_FIELDS = 'name image imageThumbnail category subCategory unit stock price sellerPrice snapitMargin sellingPrice discount publish flashSale store_inventory';

// Secure images helper — ensures all image URLs use https
const secureImages = (images) => {
    if (!Array.isArray(images)) return images;
    return images.map(img =>
        typeof img === 'string' ? img.replace(/^http:\/\//i, 'https://') : img
    );
};

// ── Helper: get seller's store name from the authed user ──────
// Supports whatever field name you store it under on UserModel
const getStoreName = (user) =>
    user?.store_name || user?.storeName || user?.shop_name || user?.name || '';

export const createProductController = async (request, response) => {
    try {
        const {
            name, image, category, subCategory, unit,
            stock, price, sellerPrice, snapitMargin,
            discount, description, more_details
        } = request.body;

        if (!name || !image?.length || !category?.length || !subCategory?.length || !unit) {
            return response.status(400).json({ message: "Enter required fields", error: true, success: false });
        }

        // FIX: use the authenticated seller's store name, not a hardcoded string
        const storeName = getStoreName(request.user);
        if (!storeName) {
            return response.status(400).json({ message: "Seller store name not found on account", error: true, success: false });
        }

        const resolvedSellerPrice  = Number(sellerPrice ?? price ?? 0);
        const resolvedMargin       = Number(snapitMargin ?? 0);
        const resolvedSellingPrice = resolvedSellerPrice + resolvedMargin;

        const product = new ProductModel({
            name,
            image: secureImages(image),
            // Optional — only present if the upload step generated one.
            // Missing on older/manual creates, which is fine: it just
            // stays an empty array and the frontend falls back to `image`.
            imageThumbnail: secureImages(imageThumbnail) || [],
            category,
            subCategory,
            unit,
            stock: Number(stock) || 0,
            sellerPrice:  resolvedSellerPrice,
            snapitMargin: resolvedMargin,
            sellingPrice: resolvedSellingPrice,
            price:        resolvedSellingPrice,
            discount,
            description,
            more_details,
            publish: true,
            store_inventory: [{
                store_name:  storeName,   // FIX: was hardcoded "Snapit Main Store - Paliganj"
                sellerId:    request.user._id,   // FIX: was never set — broke seller dashboard + earnings aggregation
                stock:       Number(stock) || 0,
                isAvailable: true
            }]
        });

        const saveProduct = await product.save();
        return response.json({
            message: "Product Created Successfully",
            data: saveProduct,
            error: false,
            success: true
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getProductController = async (request, response) => {
    try {
        let { page, limit, search } = request.body;
        if (!page)  page  = 1;
        if (!limit) limit = 100;
        const query = search ? { $text: { $search: search } } : {};
        const skip  = (page - 1) * limit;
        const [data, totalCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('category subCategory').lean(),
            ProductModel.countDocuments(query)
        ]);
        return response.json({
            message: "Product data", error: false, success: true,
            totalCount,
            totalNoPage: Math.ceil(totalCount / limit),
            data: data.map(prod => ({ ...prod, image: secureImages(prod.image) }))
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getProductByCategory = async (request, response) => {
    try {
        const { id } = request.body;
        if (!id) return response.status(400).json({ message: "provide category id", error: true, success: false });
        if (!mongoose.Types.ObjectId.isValid(id)) return response.status(400).json({ message: "Invalid Category ID", error: true, success: false });

        const product = await ProductModel.find({
            category: { $in: [id, new mongoose.Types.ObjectId(id)] }
        }).select(LIST_FIELDS).lean();

        return response.json({
            message: "category product list", error: false, success: true,
            data: product.map(prod => ({ ...prod, image: secureImages(prod.image) }))
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getProductsByCategories = async (request, response) => {
    try {
        const { categoryIds, limit: perCategoryLimit = 0 } = request.body;
        if (!Array.isArray(categoryIds) || categoryIds.length === 0)
            return response.status(400).json({ message: "Provide an array of categoryIds", error: true, success: false });
        const invalidId = categoryIds.find(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidId) return response.status(400).json({ message: `Invalid category ID: ${invalidId}`, error: true, success: false });

        const products = await ProductModel.find({
            category: { $in: categoryIds }
        }).select(LIST_FIELDS).lean();

        const grouped = {};
        for (const categoryId of categoryIds) grouped[categoryId] = [];

        for (const prod of products) {
            const securedProd = { ...prod, image: secureImages(prod.image) };
            for (const catId of prod.category) {
                const key = catId.toString();
                if (key in grouped) {
                    if (perCategoryLimit === 0 || grouped[key].length < perCategoryLimit) {
                        grouped[key].push(securedProd);
                    }
                }
            }
        }

        return response.json({ message: "Products grouped by category", data: grouped, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getProductByCategoryAndSubCategory = async (request, response) => {
    try {
        let { categoryId, subCategoryId, page, limit } = request.body;
        if (!categoryId) return response.status(400).json({ message: "Provide categoryId", error: true, success: false });
        if (!mongoose.Types.ObjectId.isValid(categoryId)) return response.status(400).json({ message: "Invalid Category ID format", error: true, success: false });
        if (!page)  page  = 1;
        if (!limit) limit = 100;

        const skip = (page - 1) * limit;
        const hasValidSubCategory = subCategoryId && subCategoryId !== "all" && mongoose.Types.ObjectId.isValid(subCategoryId);

        let query = { category: { $in: [categoryId, new mongoose.Types.ObjectId(categoryId)] } };
        if (hasValidSubCategory) query.subCategory = { $in: [subCategoryId, new mongoose.Types.ObjectId(subCategoryId)] };

        let [data, dataCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('category subCategory').lean(),
            ProductModel.countDocuments(query)
        ]);

        if (dataCount === 0 && hasValidSubCategory) {
            const fallbackQuery = { category: { $in: [categoryId, new mongoose.Types.ObjectId(categoryId)] } };
            const results = await Promise.all([
                ProductModel.find(fallbackQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('category subCategory').lean(),
                ProductModel.countDocuments(fallbackQuery)
            ]);
            data      = results[0];
            dataCount = results[1];
        }

        return response.json({
            message: "Product list", success: true, error: false,
            data: data.map(prod => ({ ...prod, image: secureImages(prod.image) })),
            totalCount: dataCount, page, limit
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const getProductDetails = async (request, response) => {
    try {
        const { productId } = request.body;
        if (!productId || !mongoose.Types.ObjectId.isValid(productId))
            return response.status(400).json({ message: "Invalid Product ID", error: true, success: false });
        const product = await ProductModel.findOne({ _id: productId }).populate('category').populate('subCategory');
        if (!product) return response.status(404).json({ message: "Product not found", error: true, success: false });
        return response.json({
            message: "product details", error: false, success: true,
            data: { ...product._doc, image: secureImages(product.image) }
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const updateProductDetails = async (request, response) => {
    try {
        const { _id, ...updateFields } = request.body;
        if (!_id || !mongoose.Types.ObjectId.isValid(_id))
            return response.status(400).json({ message: "provide valid product _id", error: true, success: false });

        // FIX: sellers can only update their own products
        const isAdmin = request.user?.role === 'ADMIN';
        if (!isAdmin) {
            const storeName = getStoreName(request.user);
            const product = await ProductModel.findById(_id).lean();
            if (!product) return response.status(404).json({ message: "Product not found", error: true, success: false });
            const ownsProduct = (product.store_inventory || []).some(s => s.store_name === storeName);
            if (!ownsProduct) return response.status(403).json({ message: "You can only update your own products", error: true, success: false });
        }

        if (updateFields.image) updateFields.image = secureImages(updateFields.image);
        if (updateFields.imageThumbnail) updateFields.imageThumbnail = secureImages(updateFields.imageThumbnail);

        if (updateFields.sellerPrice != null || updateFields.snapitMargin != null) {
            const existing = await ProductModel.findById(_id).lean();
            const sellerPrice  = Number(updateFields.sellerPrice  ?? existing?.sellerPrice  ?? 0);
            const snapitMargin = Number(updateFields.snapitMargin ?? existing?.snapitMargin ?? 0);
            updateFields.sellerPrice  = sellerPrice;
            updateFields.snapitMargin = snapitMargin;
            updateFields.sellingPrice = sellerPrice + snapitMargin;
            updateFields.price        = sellerPrice + snapitMargin;
        }

        const updateProduct = await ProductModel.findOneAndUpdate(
            { _id },
            { $set: updateFields },
            { new: true, runValidators: true }
        ).populate('category subCategory');

        return response.json({ message: "updated successfully", data: updateProduct, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const deleteProductDetails = async (request, response) => {
    try {
        const { _id } = request.body;
        if (!_id || !mongoose.Types.ObjectId.isValid(_id))
            return response.status(400).json({ message: "provide valid _id", error: true, success: false });

        // FIX: sellers can only delete their own products
        const isAdmin = request.user?.role === 'ADMIN';
        if (!isAdmin) {
            const storeName = getStoreName(request.user);
            const product = await ProductModel.findById(_id).lean();
            if (!product) return response.status(404).json({ message: "Product not found", error: true, success: false });
            const ownsProduct = (product.store_inventory || []).some(s => s.store_name === storeName);
            if (!ownsProduct) return response.status(403).json({ message: "You can only delete your own products", error: true, success: false });
        }

        const deleteProduct = await ProductModel.deleteOne({ _id });
        return response.json({ message: "Delete successfully", error: false, success: true, data: deleteProduct });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const searchProduct = async (request, response) => {
    try {
        let { search, page, limit } = request.body;
        if (!page)  page  = 1;
        if (!limit) limit = 100;
        const query = search
            ? { $or: [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }] }
            : {};
        const skip = (page - 1) * limit;
        const [data, dataCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('category subCategory').lean(),
            ProductModel.countDocuments(query)
        ]);
        return response.json({
            message: "Product data", error: false, success: true,
            data: data.map(prod => ({ ...prod, image: secureImages(prod.image) })),
            totalCount: dataCount,
            totalPage: Math.ceil(dataCount / limit),
            page, limit
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export async function getFrequentlyBought(req, res) {
    try {
        const { productId } = req.query;
        if (!productId || !mongoose.Types.ObjectId.isValid(productId))
            return res.status(400).json({ success: false, message: 'Valid Product ID required' });
        const product = await ProductModel.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        const suggestions = await ProductModel.find({
            category: { $in: product.category },
            _id: { $ne: productId }
        }).select(LIST_FIELDS).limit(5).lean();
        return res.json({ success: true, data: suggestions.map(prod => ({ ...prod, image: secureImages(prod.image) })) });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export const updateProductEmails = async (req, res) => {
    try {
        const result = await ProductModel.updateMany(
            { description: { $regex: "info@blinkit.com", $options: "i" } },
            [{ $set: { description: { $replaceOne: { input: "$description", find: "info@blinkit.com", replacement: "info@snapit.com" } } } }]
        );
        return res.json({ message: `Successfully updated ${result.modifiedCount} products.`, success: true, error: false });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

export const recalculateMRP = async (req, res) => {
    try {
        const products = await ProductModel.find({ sellerPrice: { $ne: null } });
        let updated = 0;
        for (const p of products) {
            const newSellingPrice = Number(p.sellerPrice) + Number(p.snapitMargin || 0);
            if (p.sellingPrice !== newSellingPrice || p.price !== newSellingPrice) {
                p.sellingPrice = newSellingPrice;
                p.price        = newSellingPrice;
                await p.save();
                updated++;
            }
        }
        return res.json({ success: true, message: `MRP recalculated for ${updated} products`, updated });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getPricingBreakdown = async (req, res) => {
    try {
        const products = await ProductModel.find({ sellerPrice: { $ne: null } })
            .select('name sellerPrice snapitMargin sellingPrice price stock publish')
            .lean();
        const totalSnapitMargin = products.reduce((acc, p) => acc + (Number(p.snapitMargin) || 0), 0);
        const totalSellerPayout = products.reduce((acc, p) => acc + (Number(p.sellerPrice)  || 0), 0);
        return res.json({
            success: true, data: products,
            summary: { totalProducts: products.length, totalSnapitMarginPerSale: totalSnapitMargin, totalSellerPayoutPerSale: totalSellerPayout }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const republishAllProducts = async (req, res) => {
    try {
        const result = await ProductModel.updateMany({ publish: false }, { $set: { publish: true } });
        return res.json({ success: true, message: `Re-published ${result.modifiedCount} products that were hidden.`, modifiedCount: result.modifiedCount });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getVariantsByGroup = async (req, res) => {
    try {
        const { variantGroup } = req.body;
        if (!variantGroup) return res.json({ success: true, data: [] });
        const variants = await ProductModel.find({ variantGroup, publish: true })
            .select('_id name unit price discount image variantGroup');
        return res.json({ success: true, data: variants });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getSellerProductsController = async (request, response) => {
    try {
        let { page, limit, search } = request.body;
        if (!page)  page  = 1;
        if (!limit) limit = 100;
        const skip = (page - 1) * limit;

        // FIX: get store_name from the authenticated user, not req.body
        //      (req.body store_name was never sent by the frontend)
        const storeName = getStoreName(request.user);
        if (!storeName) {
            return response.status(400).json({ message: "Seller store name not found on account", error: true, success: false });
        }

        const baseQuery = { "store_inventory.store_name": storeName };
        if (search) {
            baseQuery.$or = [
                { name:        { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }

        const [data, totalCount] = await Promise.all([
            ProductModel.find(baseQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('category subCategory').lean(),
            ProductModel.countDocuments(baseQuery)
        ]);

        return response.json({
            message: "Seller product data", error: false, success: true,
            totalCount, totalNoPage: Math.ceil(totalCount / limit),
            data: data.map(prod => ({ ...prod, image: secureImages(prod.image) }))
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};