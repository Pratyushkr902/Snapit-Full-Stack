import CartProductModel from "../models/cartproduct.model.js";
import UserModel from "../models/user.model.js";
import ProductModel from "../models/product.model.js";
export const addToCartItemController = async(request,response)=>{
    try {
        const  userId = request.userId
        const { productId } = request.body
        
        if(!productId){
            return response.status(402).json({
                message : "Provide productId",
                error : true,
                success : false
            })
        }

        // ADDED: server-side stock/publish validation
        const product = await ProductModel.findById(productId).select("stock publish").lean()
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
            productId : productId
        })
        if(checkItemCart){
            return response.status(400).json({
                message : "Item already in cart"
            })
        }
        const cartItem = new CartProductModel({
            quantity : 1,
            userId : userId,
            productId : productId
        })
        const save = await cartItem.save()
        const updateCartUser = await UserModel.updateOne({ _id : userId},{
            $push : { 
                shopping_cart : productId
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
        const cartItem =  await CartProductModel.find({
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
        const { _id,qty } = request.body
        if(!_id || qty === undefined || qty === null){
            return response.status(400).json({
                message : "provide _id, qty"
            })
        }

        // fetch current quantity so we know the direction of the change
        const cartItemDoc = await CartProductModel.findOne({ _id, userId }).select("productId quantity").lean()
        if(!cartItemDoc){
            return response.status(404).json({
                message : "Cart item not found",
                error : true,
                success : false
            })
        }
        const isIncreasing = qty > cartItemDoc.quantity

        const product = await ProductModel.findById(cartItemDoc.productId).select("stock publish").lean()

        // Only block on out-of-stock/unpublished if the user is INCREASING qty.
        // Decreasing (or removing) an out-of-stock item must always be allowed.
        if(isIncreasing && (!product || !product.publish || !product.stock || product.stock <= 0)){
            return response.status(400).json({
                message : "Product is out of stock",
                error : true,
                success : false
            })
        }
        if(isIncreasing && qty > product.stock){
            return response.status(400).json({
                message : `Only ${product.stock} left in stock`,
                error : true,
                success : false
            })
        }

        const updateCartitem = await CartProductModel.updateOne({
            _id : _id,
            userId : userId
        },{
            quantity : qty
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
      const userId = request.userId // middleware
      const { _id } = request.body 
      
      if(!_id){
        return response.status(400).json({
            message : "Provide _id",
            error : true,
            success : false
        })
      }
      const deleteCartItem  = await CartProductModel.deleteOne({_id : _id, userId : userId })
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