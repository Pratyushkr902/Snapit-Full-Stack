import CartProductModel from "../models/cartproduct.model.js";
import UserModel from "../models/user.model.js";
import ProductModel from "../models/product.model.js";
import mongoose from "mongoose";

export const addToCartItemController = async(request,response)=>{
    try {
        const userId = request.userId
        const { productId } = request.body
        
        if(!productId || typeof productId !== 'string' || !mongoose.Types.ObjectId.isValid(productId.trim())){
            return response.status(400).json({
                message : "Please provide a valid productId",
                error : true,
                success : false
            })
        }

        const validProductId = productId.trim()

        // Server-side stock & publish validation
        const product = await ProductModel.findById(validProductId).select("stock publish").lean()
        if(!product || !product.publish){
            return response.status(404).json({
                message : "Product not available",
                error : true,
                success : false
            })
        }
        if(!product.stock || product.stock <= 0){
            return response.status(400).json({
                message : "Product is out of stock",
                error : true,
                success : false
            })
        }

        const checkItemCart = await CartProductModel.findOne({
            userId : userId,
            productId : validProductId
        })
        if(checkItemCart){
            return response.status(400).json({
                message : "Item already in cart"
            })
        }
        const cartItem = new CartProductModel({
            quantity : 1,
            userId : userId,
            productId : validProductId
        })
        const save = await cartItem.save()
        await UserModel.updateOne({ _id : userId},{
            $push : { 
                shopping_cart : validProductId
            }
        })
        return response.json({
            data : save,
            message : "Item add successfully",
            error : false,
            success : true
        })
        
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const getCartItemController = async(request,response)=>{
    try {
        const userId = request.userId
        const cartItem = await CartProductModel.find({
            userId : userId
        }).populate('productId')
        return response.json({
            data : cartItem,
            error : false,
            success : true
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const updateCartItemQtyController = async(request,response)=>{
    try {
        const userId = request.userId 
        const { _id, qty } = request.body

        if(!_id || qty === undefined || qty === null || typeof _id !== 'string' || !mongoose.Types.ObjectId.isValid(_id.trim())){
            return response.status(400).json({
                message : "Valid cart item _id and qty are required",
                error: true,
                success: false
            })
        }

        const validId = _id.trim()
        const parsedQty = Number(qty)

        if(isNaN(parsedQty)){
            return response.status(400).json({
                message : "Qty must be a valid number",
                error: true,
                success: false
            })
        }

        // If qty is zero or negative, cleanly remove the item from cart
        if(parsedQty <= 0){
            await CartProductModel.deleteOne({ _id: validId, userId })
            return response.json({
                message : "Item removed from cart",
                success : true,
                error : false
            })
        }

        // Cap max quantity per item to 50
        const finalQty = Math.min(Math.floor(parsedQty), 50)

        // fetch current quantity so we know the direction of the change
        const cartItemDoc = await CartProductModel.findOne({ _id: validId, userId }).select("productId quantity").lean()
        if(!cartItemDoc){
            return response.status(404).json({
                message : "Cart item not found",
                error : true,
                success : false
            })
        }
        const isIncreasing = finalQty > cartItemDoc.quantity

        const product = await ProductModel.findById(cartItemDoc.productId).select("stock publish").lean()

        // Only block on out-of-stock/unpublished if the user is INCREASING qty.
        if(isIncreasing && (!product || !product.publish || !product.stock || product.stock <= 0)){
            return response.status(400).json({
                message : "Product is out of stock",
                error : true,
                success : false
            })
        }
        if(isIncreasing && finalQty > product.stock){
            return response.status(400).json({
                message : `Only ${product.stock} left in stock`,
                error : true,
                success : false
            })
        }

        const updateCartitem = await CartProductModel.updateOne({
            _id : validId,
            userId : userId
        },{
            quantity : finalQty
        })
        return response.json({
            message : "Update cart",
            success : true,
            error : false, 
            data : updateCartitem
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const deleteCartItemQtyController = async(request,response)=>{
    try {
      const userId = request.userId
      const { _id } = request.body 
      
      if(!_id || typeof _id !== 'string' || !mongoose.Types.ObjectId.isValid(_id.trim())){
        return response.status(400).json({
            message : "Valid _id is required",
            error : true,
            success : false
        })
      }
      const deleteCartItem = await CartProductModel.deleteOne({ _id: _id.trim(), userId: userId })
      return response.json({
        message : "Item remove",
        error : false,
        success : true,
        data : deleteCartItem
      })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}