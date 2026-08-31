import ProductModel from "../models/product.model.js";
import mongoose from "mongoose";
import NodeCache from "node-cache";

const productCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Fields returned in list queries (not full details)
const LIST_FIELDS = 'name image imageThumbnail category subCategory unit stock price sellerPrice snapitMargin sellingPrice discount publish flashSale store_inventory';

// Secure images helper — ensures all image URLs use https
const secureImages = (images) => {
    if (!Array.isArray(images)) return images;
    return images.map(img =>
        typeof img === 'string' ? img.replace(/^http:\/\//i, 'https://') : img
    );
};

// Escape special characters to prevent ReDoS and RegEx injection attacks
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, 100).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// ── Helper: get seller's store name from the authed user ──────
// IMPORTANT: only trust the canonical store_name field. Falling back to
// storeName/shop_name/name silently matches products against a seller's
// personal name instead of their actual store — this previously caused
// a stray "Raghu" store to appear (personal name of an admin collaborator
// account matched against store_inventory.store_name by accident).
const getStoreName = (user) => user?.store_name || '';

export const createProductController = async (request, response) => {
    try {
        const {
            name, image, imageThumbnail, category, subCategory, unit,
            stock, price, sellerPrice, snapitMargin,
            discount, description, more_details
        } = request.body;

        if (!name || !image?.length || !category?.length || !subCategory?.length || !unit) {
            return response.status(400).json({ message: "Enter required fields", error: true, success: false });
        }

        // FIX: use the authenticated seller's store name, or allow ADMIN/SUPER_ADMIN fallback
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(request.user?.role);
        const storeName = getStoreName(request.user) || (isAdmin ? (request.body.store_name || "Snapit Main Store - Paliganj") : '');
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
        productCache.flushAll();
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

        const cacheKey = `prod_${page}_${limit}_${search || 'all'}`;
        const cached = productCache.get(cacheKey);
        if (cached) return response.json(cached);

        const query = search ? { $text: { $search: search } } : {};
        const skip  = (page - 1) * limit;
        const [data, totalCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('category subCategory').lean(),
            ProductModel.countDocuments(query)
        ]);

        const result = {
            message: "Product data", error: false, success: true,
            totalCount,
            totalNoPage: Math.ceil(totalCount / limit),
            data: data.map(prod => ({ ...prod, image: secureImages(prod.image) }))
        };
        productCache.set(cacheKey, result);
        return response.json(result);
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

        // FIX: SUPER_ADMIN and ADMIN can update any product, sellers can only update their own
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(request.user?.role);
        if (!isAdmin) {
            const storeName = getStoreName(request.user);
            const sellerId = request.user?._id?.toString();
            const product = await ProductModel.findById(_id).lean();
            if (!product) return response.status(404).json({ message: "Product not found", error: true, success: false });
            
            const ownsProduct = (product.store_inventory || []).some(s => 
                (storeName && s.store_name?.trim()?.toLowerCase() === storeName.trim()?.toLowerCase()) ||
                (sellerId && s.sellerId?.toString() === sellerId)
            ) || (product.sellerId && product.sellerId.toString() === sellerId)
              || (product.userId && product.userId.toString() === sellerId);

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

        const updateProduct = await ProductModel.findByIdAndUpdate(
            _id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).populate('category subCategory');
        productCache.flushAll();

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

        // FIX: SUPER_ADMIN and ADMIN can delete any product, sellers can only delete their own
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(request.user?.role);
        if (!isAdmin) {
            const storeName = getStoreName(request.user);
            const sellerId = request.user?._id?.toString();
            const product = await ProductModel.findById(_id).lean();
            if (!product) return response.status(404).json({ message: "Product not found", error: true, success: false });
            
            const ownsProduct = (product.store_inventory || []).some(s => 
                (storeName && s.store_name?.trim()?.toLowerCase() === storeName.trim()?.toLowerCase()) ||
                (sellerId && s.sellerId?.toString() === sellerId)
            ) || (product.sellerId && product.sellerId.toString() === sellerId)
              || (product.userId && product.userId.toString() === sellerId);

            if (!ownsProduct) return response.status(403).json({ message: "You can only delete your own products", error: true, success: false });
        }

        const deleteProduct = await ProductModel.deleteOne({ _id });
        productCache.flushAll();
        return response.json({ message: "Delete successfully", error: false, success: true, data: deleteProduct });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
};

const VOICE_STOPWORDS = new Set([
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    'kilo', 'kg', 'kgs', 'gm', 'gms', 'gram', 'grams', 'litre', 'liter', 'packet', 'pack', 'bottle', 'box',
    'mujhe', 'chahiye', 'dikhaye', 'dikhao', 'dijiye', 'lao', 'aur', 'ka', 'ki', 'ke', 'bhi', 'please', 'me',
    'एक', 'दो', 'तीन', 'चार', 'पांच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
    'किलो', 'केजी', 'ग्राम', 'लीटर', 'पैकेट', 'डिब्बा', 'बोतल',
    'मुझे', 'चाहिए', 'दिखाइए', 'दिखाओ', 'दीजिए', 'देना', 'लाओ', 'और', 'का', 'की', 'के', 'वाला', 'वाली', 'वाले', 'भी', 'कृपया'
]);

const HINDI_SYNONYM_DICT = {
    // Sugar
    'chini':      ['sugar', 'chini'],
    'cheeni':     ['sugar', 'chini'],
    'चीनी':       ['sugar', 'chini', 'cheeni'],
    'शक्कर':      ['sugar', 'chini'],
    // Milk & Dairy
    'doodh':      ['milk', 'doodh'],
    'dudh':       ['milk', 'doodh'],
    'दूध':        ['milk', 'doodh', 'amul'],
    'amul':       ['amul', 'milk', 'butter', 'cheese', 'paneer'],
    'अमूल':       ['amul', 'milk'],
    'अमुल':       ['amul', 'milk'],
    'dahi':       ['curd', 'dahi'],
    'दही':        ['curd', 'dahi'],
    'makhan':     ['butter', 'makhan'],
    'मक्खन':      ['butter', 'makhan'],
    'paneer':     ['paneer', 'cheese'],
    'पनीर':       ['paneer', 'cheese'],
    'ghee':       ['ghee'],
    'घी':         ['ghee'],
    // Oil
    'tel':        ['oil', 'mustard', 'refined', 'fortune'],
    'तेल':        ['oil', 'mustard', 'refined', 'fortune'],
    'sarson':     ['mustard', 'oil'],
    'सरसों':      ['mustard', 'oil'],
    'fortune':    ['fortune', 'oil'],
    'फॉर्च्यून':  ['fortune', 'oil'],
    // Grains, Atta, Rice & Pulses
    'atta':       ['atta', 'flour', 'aashirvaad', 'chakki'],
    'aata':       ['atta', 'flour'],
    'आटा':        ['atta', 'flour', 'aashirvaad', 'chakki'],
    'aashirvaad': ['aashirvaad', 'atta'],
    'आशीर्वाद':   ['aashirvaad', 'atta'],
    'chawal':     ['rice', 'chawal', 'basmati'],
    'चावल':       ['rice', 'chawal', 'basmati'],
    'dal':        ['dal', 'pulses', 'chana', 'moong', 'toor'],
    'दाल':        ['dal', 'pulses', 'chana', 'moong', 'toor'],
    'namak':      ['salt', 'namak', 'tata'],
    'नमक':        ['salt', 'namak', 'tata'],
    // Veggies
    'tamatar':    ['tomato', 'tamatar'],
    'टमाटर':      ['tomato', 'tamatar'],
    'aalu':       ['potato', 'aloo', 'aalu'],
    'aloo':       ['potato', 'aloo', 'aalu'],
    'आलू':        ['potato', 'aloo', 'aalu'],
    'pyaaz':      ['onion', 'pyaj', 'pyaaz'],
    'pyaj':       ['onion', 'pyaj', 'pyaaz'],
    'प्याज':      ['onion', 'pyaj', 'pyaaz'],
    'mirch':      ['chilli', 'mirch'],
    'मिर्च':      ['chilli', 'mirch'],
    'haldi':      ['turmeric', 'haldi'],
    'हल्दी':      ['turmeric', 'haldi'],
    // Eggs & Meat
    'anda':       ['egg', 'anda', 'eggs'],
    'ande':       ['egg', 'eggs', 'anda'],
    'अंडा':       ['egg', 'anda', 'eggs'],
    'अंडे':       ['egg', 'eggs', 'anda'],
    // Snacks, Tea & Drinks
    'chai':       ['tea', 'chai', 'patti', 'tata tea', 'red label'],
    'चाय':        ['tea', 'chai', 'patti'],
    'biscuit':    ['biscuit', 'cookie', 'rusk', 'parle', 'britannia', 'oreo'],
    'biskut':     ['biscuit', 'cookie'],
    'बिस्कुट':    ['biscuit', 'cookie', 'rusk', 'parle'],
    'बिस्किट':    ['biscuit', 'cookie'],
    'maggi':      ['maggi', 'noodles', 'nestle'],
    'मैगी':       ['maggi', 'noodles', 'nestle'],
    'chips':      ['chips', 'kurkure', 'lays', 'bingo'],
    'चिप्स':      ['chips', 'kurkure', 'lays'],
    'कुरकुरे':    ['kurkure', 'chips'],
    'cold drink': ['cold drink', 'coca cola', 'pepsi', 'sprite', 'thums up'],
    'कोल्ड ड्रिंक':['cold drink', 'coca cola', 'pepsi', 'sprite', 'thums up'],
    'sabun':      ['soap', 'sabun', 'dettol', 'lux', 'dove'],
    'साबुन':      ['soap', 'sabun', 'dettol', 'lux', 'dove'],
    'surf':       ['detergent', 'surf', 'surf excel', 'tide', 'ariel'],
    'सर्फ':       ['detergent', 'surf', 'surf excel', 'tide', 'ariel'],
};

export const searchProduct = async (request, response) => {
    try {
        let { search, page, limit } = request.body;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);

        let query = {};
        if (typeof search === 'string' && search.trim()) {
            const rawTokens = search.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').split(/\s+/).filter(Boolean);
            const filteredTokens = rawTokens.filter(t => !VOICE_STOPWORDS.has(t));
            const activeTokens = filteredTokens.length > 0 ? filteredTokens : rawTokens;

            const tokenQueries = activeTokens.map(token => {
                const synonyms = HINDI_SYNONYM_DICT[token] || [token];
                const tokenPatterns = synonyms.map(s => escapeRegex(s));
                const pattern = tokenPatterns.join('|');
                return {
                    $or: [
                        { name: { $regex: pattern, $options: "i" } },
                        { description: { $regex: pattern, $options: "i" } }
                    ]
                };
            });

            // Match all meaningful keywords ($and), or phrase regex as fallback
            query = {
                $or: [
                    { name: { $regex: escapeRegex(search.trim()), $options: "i" } },
                    { description: { $regex: escapeRegex(search.trim()), $options: "i" } },
                    ...(tokenQueries.length > 0 ? [{ $and: tokenQueries }] : [])
                ]
            };
        }
        const skip = (pageNum - 1) * limitNum;
        const [data, dataCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('category subCategory').lean(),
            ProductModel.countDocuments(query)
        ]);

        // Blinkit-style relevance ranking: Title/Brand match first, then description
        if (typeof search === 'string' && search.trim()) {
            const rawTokens = search.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').split(/\s+/).filter(Boolean);
            const filteredTokens = rawTokens.filter(t => !VOICE_STOPWORDS.has(t));
            const activeTokens = filteredTokens.length > 0 ? filteredTokens : rawTokens;

            data.sort((a, b) => {
                const aName = (a.name || '').toLowerCase();
                const bName = (b.name || '').toLowerCase();
                const matchA = activeTokens.some(t => {
                    const syns = HINDI_SYNONYM_DICT[t] || [t];
                    return syns.some(s => aName.includes(s.toLowerCase()));
                });
                const matchB = activeTokens.some(t => {
                    const syns = HINDI_SYNONYM_DICT[t] || [t];
                    return syns.some(s => bName.includes(s.toLowerCase()));
                });
                if (matchA && !matchB) return -1;
                if (!matchA && matchB) return 1;
                return 0;
            });
        }

        return response.json({
            message: "Product data", error: false, success: true,
            data: data.map(prod => ({ ...prod, image: secureImages(prod.image) })),
            totalCount: dataCount,
            totalPage: Math.ceil(dataCount / limitNum),
            page: pageNum,
            limit: limitNum
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

        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(request.user?.role);
        const storeName = getStoreName(request.user) || (isAdmin ? request.body.store_name : null);
        const sellerId = request.user?._id;

        const baseQuery = {};
        if (storeName) {
            baseQuery["$or"] = [
                { "store_inventory.store_name": { $regex: new RegExp(`^${escapeRegex(storeName)}$`, 'i') } },
                ...(sellerId ? [{ "store_inventory.sellerId": sellerId }, { sellerId }] : [])
            ];
        } else if (!isAdmin) {
            return response.status(400).json({ message: "Seller store name not found on account", error: true, success: false });
        }
        if (typeof search === 'string' && search.trim()) {
            const safeSearch = escapeRegex(search);
            baseQuery.$or = [
                { name:        { $regex: safeSearch, $options: "i" } },
                { description: { $regex: safeSearch, $options: "i" } }
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